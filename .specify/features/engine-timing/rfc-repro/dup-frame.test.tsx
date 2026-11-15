// RFC repro (S15 Stage 1, not part of the suite): a duplicate frame mid-explode settles the overlay.
import ReactThreeTestRenderer from '@react-three/test-renderer';
import { describe, expect, test } from 'vitest';

import { INITIAL_RIG } from '../src/engine/camera';
import { layoutProject } from '../src/layout';
import { motion } from '../src/motion';
import { parseProject, parseTechRegistry } from '../src/index';
import type { OverlayEvent } from '../src/react/scene/OverlayProjector';
import { Scene, type SceneProps } from '../src/react/scene/Scene';
import { blueprint } from '../src/theme';
import { projectAJson, techRegistryJson } from './fixtures';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const registry = parseTechRegistry(techRegistryJson);
const projectA = parseProject(projectAJson, { registry });
const layoutA = layoutProject(projectA);

describe('RFC repro: duplicate frame mid-explode', () => {
  test('logs overlay events across a held clock mid-tween', async () => {
    let seconds = 0;
    const events: string[] = [];
    const progressRef = { current: null as Float32Array | null };
    const props = (target: 'imploded' | 'exploded'): SceneProps => ({
      layout: layoutA,
      palette: blueprint.light,
      tokens: motion,
      target,
      rig: INITIAL_RIG,
      now: () => seconds,
      slug: projectA.meta.slug,
      progressRef,
      onOverlay: (event: OverlayEvent) => events.push(`${event.kind}@${seconds.toFixed(3)}`),
    });
    const renderer = await ReactThreeTestRenderer.create(<Scene {...props('imploded')} />, {
      orthographic: true,
      width: 390,
      height: 844,
    });
    const settledMidTween = (): number =>
      events.filter((e) => e.startsWith('settled@') && Number(e.split('@')[1]) > 0 && Number(e.split('@')[1]) < 1).length;

    try {
      await renderer.advanceFrames(1, 0.1);
      await renderer.update(<Scene {...props('exploded')} />);
      for (const t of [0.1, 0.2, 0.2, 0.2, 0.3]) {
        seconds = t;
        await renderer.advanceFrames(1, 0.1);
        const p = progressRef.current;
        events.push(`frame t=${t} progress[0..2]=${p ? Array.from(p.slice(0, 3)).map((v) => v.toFixed(4)).join(',') : 'null'}`);
      }
      console.log(['explode duration (s)=' + motion.durations.explode, ...events].join('\n'));
      expect(settledMidTween()).toBeGreaterThan(0);
    } finally {
      await renderer.unmount();
    }
  });
});
