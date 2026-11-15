import ReactThreeTestRenderer from '@react-three/test-renderer';
import { act } from 'react';
import type { OrthographicCamera } from 'three';
import { describe, expect, test } from 'vitest';

import { INITIAL_RIG, type RigState } from '../src/engine/camera';
import { layoutProject, type ProjectLayout } from '../src/layout';
import { motion } from '../src/motion';
import { parseProject, parseTechRegistry } from '../src/index';
import type { OverlayEvent } from '../src/react/scene/OverlayProjector';
import { Scene, type SceneProps } from '../src/react/scene/Scene';
import { blueprint } from '../src/theme';
import { createFakeClock, projectAJson, techRegistryJson, type FakeClock } from './fixtures';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const registry = parseTechRegistry(techRegistryJson);
const projectA = parseProject(projectAJson, { registry });
const layoutA = layoutProject(projectA);
const VIEWPORT = { width: 390, height: 844 } as const;
const FRAME_SECONDS = 1 / 60;
const PAUSE_AT_SECONDS = 0.2;
const PAUSE_ADVANCE_SECONDS = 3;
const HELD_FRAMES = 10;
const SCROLL_OFFSET = 120;
type TestRenderer = Awaited<ReturnType<typeof ReactThreeTestRenderer.create>>;

interface StampedEvent {
  readonly event: OverlayEvent;
  readonly emittedAt: number;
}

function sceneProps(overrides: Partial<SceneProps> = {}): SceneProps {
  return {
    layout: layoutA,
    palette: blueprint.light,
    tokens: motion,
    target: 'imploded',
    rig: INITIAL_RIG,
    slug: projectA.meta.slug,
    ...overrides,
  };
}

function renderScene(overrides: Partial<SceneProps> = {}): Promise<TestRenderer> {
  return ReactThreeTestRenderer.create(<Scene {...sceneProps(overrides)} />, {
    orthographic: true,
    width: VIEWPORT.width,
    height: VIEWPORT.height,
  });
}

async function advanceClockFrame(
  renderer: TestRenderer,
  clock: FakeClock,
  seconds = FRAME_SECONDS,
): Promise<void> {
  await act(async () => {
    clock.advance(seconds);
    await renderer.advanceFrames(1, seconds);
  });
}

async function advanceClockTo(
  renderer: TestRenderer,
  clock: FakeClock,
  seconds: number,
): Promise<void> {
  while (clock.now() < seconds) {
    const before = clock.now();

    await advanceClockFrame(renderer, clock, Math.min(FRAME_SECONDS, seconds - clock.now()));

    if (clock.now() === before) break;
  }
}

function largestExplodeDelay(layout: ProjectLayout): number {
  let largest = 0;

  layout.layers.forEach((_, layerIndex) => {
    largest = Math.max(largest, layerIndex * motion.staggers.explodeLayer);
  });
  layout.components.forEach((component) => {
    const delay =
      component.layerIndex * motion.staggers.explodeLayer +
      component.slot * motion.staggers.explodeComponent;

    largest = Math.max(largest, delay);
  });

  return largest;
}

function explodeEnd(layout: ProjectLayout): number {
  return motion.durations.explode + largestExplodeDelay(layout);
}

function cameraOf(renderer: TestRenderer): OrthographicCamera {
  return renderer.scene.fiber.root.getState().camera as OrthographicCamera;
}

describe('overlay engine clock', () => {
  test('stamps every emitted event with the clock time of its frame', async () => {
    const clock = createFakeClock();
    const events: StampedEvent[] = [];
    const onOverlay = (event: OverlayEvent): void => {
      events.push({ event, emittedAt: clock.now() });
    };
    const renderer = await renderScene({ clock, onOverlay });

    try {
      await advanceClockFrame(renderer, clock);

      const first = events[0];

      if (first === undefined) throw new Error('OverlayProjector did not emit its first event');
      expect(first.event.kind).toBe('settled');
      expect(first.event.at).toBe(first.emittedAt);

      const turned: RigState = { ...INITIAL_RIG, step: 1, turns: 1 };
      const turnStart = clock.now();

      await renderer.update(<Scene {...sceneProps({ clock, rig: turned, onOverlay })} />);
      await advanceClockTo(renderer, clock, turnStart + motion.durations.implode / 2);

      const moving = events.find(({ event }) => event.kind === 'moving');

      if (moving === undefined) throw new Error('OverlayProjector did not emit moving');
      expect(moving.event.at).toBe(moving.emittedAt);

      await advanceClockTo(renderer, clock, turnStart + motion.durations.implode);
      await advanceClockFrame(renderer, clock);

      const settled = events.filter(({ event }) => event.kind === 'settled').at(-1);

      if (settled === undefined) throw new Error('OverlayProjector did not settle after the turn');
      expect(settled.event.at).toBe(settled.emittedAt);
      expect(settled.emittedAt).toBeGreaterThanOrEqual(turnStart + motion.durations.implode);
      expect(events.map(({ event }) => event.kind)).toEqual(['settled', 'moving', 'settled']);
    } finally {
      await renderer.unmount();
    }
  });

  test('emits nothing while paused, then resumes moving and settles once after the tween', async () => {
    const clock = createFakeClock();
    const events: StampedEvent[] = [];
    const onOverlay = (event: OverlayEvent): void => {
      events.push({ event, emittedAt: clock.now() });
    };
    const progressRef = { current: null as Float32Array | null };
    const renderer = await renderScene({ clock, onOverlay, progressRef });

    try {
      await advanceClockFrame(renderer, clock, 0);
      await renderer.update(
        <Scene {...sceneProps({ clock, target: 'exploded', onOverlay, progressRef })} />,
      );

      clock.advance(PAUSE_AT_SECONDS);
      clock.pause();

      const beforePause = events.length;

      for (let frame = 0; frame < HELD_FRAMES; frame += 1) {
        await advanceClockFrame(renderer, clock, PAUSE_ADVANCE_SECONDS);
      }

      expect(events.length).toBe(beforePause);

      const end = explodeEnd(layoutA);

      clock.resume();
      expect(clock.now()).toBeCloseTo(PAUSE_AT_SECONDS, 9);

      await advanceClockTo(renderer, clock, end + FRAME_SECONDS);
      await advanceClockFrame(renderer, clock);

      const resumed = events.slice(beforePause);
      const settled = resumed.filter(({ event }) => event.kind === 'settled');

      expect(resumed.map(({ event }) => event.kind)).toEqual(['moving', 'settled']);
      expect(settled).toHaveLength(1);
      expect(settled[0]?.emittedAt).toBeGreaterThanOrEqual(end);
      expect(settled[0]?.event.at).toBe(settled[0]?.emittedAt);
    } finally {
      await renderer.unmount();
    }
  });

  test('still reports a view-offset change while paused', async () => {
    const clock = createFakeClock();
    const events: OverlayEvent[] = [];
    const offsets: number[] = [];
    const renderer = await renderScene({
      clock,
      onOverlay: (event) => events.push(event),
      onOverlayScroll: (offsetY) => offsets.push(offsetY),
    });

    try {
      await advanceClockFrame(renderer, clock);
      clock.pause();

      const beforePause = events.length;
      const camera = cameraOf(renderer);

      camera.setViewOffset(
        VIEWPORT.width,
        VIEWPORT.height,
        0,
        SCROLL_OFFSET,
        VIEWPORT.width,
        VIEWPORT.height,
      );
      camera.updateProjectionMatrix();

      await advanceClockFrame(renderer, clock, PAUSE_ADVANCE_SECONDS);

      expect(offsets).toEqual([SCROLL_OFFSET]);
      expect(events.length).toBe(beforePause);
    } finally {
      await renderer.unmount();
    }
  });
});
