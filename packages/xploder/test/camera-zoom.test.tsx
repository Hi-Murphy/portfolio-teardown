import ReactThreeTestRenderer from '@react-three/test-renderer';
import type { OrthographicCamera } from 'three';
import { describe, expect, test } from 'vitest';

import {
  cameraReducer,
  createZoomTween,
  INITIAL_RIG,
  ZOOM_BOUNDS,
  type RigState,
} from '../src/engine/camera';
import { layoutProject } from '../src/layout';
import { motion, resolveMotion, type MotionTokens } from '../src/motion';
import { parseProject, parseTechRegistry } from '../src/index';
import { CameraRig } from '../src/react/scene/CameraRig';
import { useTeardownViewer, type TeardownViewerHandle } from '../src/react/useTeardownViewer';
import { projectAJson, techRegistryJson } from './fixtures';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const registry = parseTechRegistry(techRegistryJson);
const projectA = parseProject(projectAJson, { registry });
const layoutA = layoutProject(projectA);
type TestRenderer = Awaited<ReturnType<typeof ReactThreeTestRenderer.create>>;

function cameraZoom(renderer: TestRenderer): number {
  return (renderer.scene.fiber.root.getState().camera as OrthographicCamera).zoom;
}

function renderRig(rig: RigState, tokens: MotionTokens, now: () => number): Promise<TestRenderer> {
  return ReactThreeTestRenderer.create(
    <CameraRig layout={layoutA} tokens={tokens} rig={rig} now={now} />,
    { orthographic: true },
  );
}

function installMotionWindow(): () => void {
  const media = {
    matches: false,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  } as unknown as MediaQueryList;
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'window');

  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: { matchMedia: () => media },
  });

  return () => {
    if (previous === undefined) Reflect.deleteProperty(globalThis, 'window');
    else Object.defineProperty(globalThis, 'window', previous);
  };
}

interface ViewerProbeProps {
  readonly smoothZoom?: boolean;
  readonly capture: (viewer: TeardownViewerHandle) => void;
}

function ViewerProbe({ smoothZoom, capture }: ViewerProbeProps) {
  capture(useTeardownViewer({ now: () => 0, smoothZoom }));
  return null;
}

describe('createZoomTween', () => {
  test('progresses from the current zoom to its target over the implode duration', () => {
    const tween = createZoomTween(motion);
    const start = 0;
    const duration = motion.durations.implode;
    const target = ZOOM_BOUNDS.step;

    tween.setTarget(ZOOM_BOUNDS.min, start);
    tween.setTarget(target, start);

    let previous: number = ZOOM_BOUNDS.min;

    for (let index = 0; index <= 100; index += 1) {
      const sample = tween.sample(start + (duration * index) / 100);

      expect(sample.zoomFactor).toBeGreaterThanOrEqual(previous);
      expect(sample.zoomFactor).toBeLessThanOrEqual(target);
      previous = sample.zoomFactor;

      if (index === 50) {
        expect(sample.zoomFactor).toBeGreaterThan(ZOOM_BOUNDS.min);
        expect(sample.zoomFactor).toBeLessThan(target);
      }
      if (index === 100) expect(sample).toEqual({ zoomFactor: target, settled: true });
    }
  });

  test('retargets from the displayed zoom without a jump', () => {
    const tween = createZoomTween(motion);
    const duration = motion.durations.implode;
    const retargetAt = duration * 0.4;

    tween.setTarget(ZOOM_BOUNDS.min, 0);
    tween.setTarget(ZOOM_BOUNDS.step, 0);

    const beforeRetarget = tween.sample(retargetAt);
    tween.setTarget(ZOOM_BOUNDS.step ** 2, retargetAt);
    const afterRetarget = tween.sample(retargetAt);

    expect(afterRetarget.zoomFactor).toBe(beforeRetarget.zoomFactor);
    expect(tween.sample(retargetAt + duration)).toEqual({
      zoomFactor: ZOOM_BOUNDS.step ** 2,
      settled: true,
    });
  });

  test('cuts to the target when durations resolve to zero', () => {
    const tween = createZoomTween(resolveMotion(true));

    tween.setTarget(ZOOM_BOUNDS.min, 0);
    tween.setTarget(ZOOM_BOUNDS.step, 0);

    expect(tween.sample(0)).toEqual({ zoomFactor: ZOOM_BOUNDS.step, settled: true });
  });
});

describe('CameraRig zoom', () => {
  test('keeps the default instant path and state shape unchanged', async () => {
    const seconds = 0;
    const now = () => seconds;
    const renderer = await renderRig(INITIAL_RIG, motion, now);

    try {
      const fitted = cameraZoom(renderer);
      const zoomed = cameraReducer(INITIAL_RIG, { type: 'zoomIn' });

      expect(INITIAL_RIG).toEqual({ step: 0, turns: 0, zoomFactor: ZOOM_BOUNDS.min });
      expect(zoomed).toEqual({ step: 0, turns: 0, zoomFactor: ZOOM_BOUNDS.step });

      await renderer.update(<CameraRig layout={layoutA} tokens={motion} rig={zoomed} now={now} />);

      expect(cameraZoom(renderer)).toBeCloseTo(fitted * ZOOM_BOUNDS.step, 9);
    } finally {
      await renderer.unmount();
    }
  });

  test('tweens only when smoothZoom is opted in', async () => {
    let seconds = 0;
    const now = () => seconds;
    const initial: RigState = { ...INITIAL_RIG, smoothZoom: true };
    const renderer = await renderRig(initial, motion, now);

    try {
      const fitted = cameraZoom(renderer);
      const target: RigState = { ...initial, zoomFactor: ZOOM_BOUNDS.step };

      await renderer.update(<CameraRig layout={layoutA} tokens={motion} rig={target} now={now} />);
      expect(cameraZoom(renderer)).toBeCloseTo(fitted, 9);

      seconds = motion.durations.implode / 2;
      await renderer.advanceFrames(1, 0.1);

      const midpoint = cameraZoom(renderer);

      expect(midpoint).toBeGreaterThan(fitted);
      expect(midpoint).toBeLessThan(fitted * ZOOM_BOUNDS.step);

      seconds = motion.durations.implode;
      await renderer.advanceFrames(1, 0.1);

      expect(cameraZoom(renderer)).toBeCloseTo(fitted * ZOOM_BOUNDS.step, 9);
    } finally {
      await renderer.unmount();
    }
  });

  test('cuts immediately under reduced motion even when opted in', async () => {
    const seconds = 0;
    const now = () => seconds;
    const tokens = resolveMotion(true);
    const initial: RigState = { ...INITIAL_RIG, smoothZoom: true };
    const renderer = await renderRig(initial, tokens, now);

    try {
      const fitted = cameraZoom(renderer);
      const target: RigState = { ...initial, zoomFactor: ZOOM_BOUNDS.step };

      await renderer.update(<CameraRig layout={layoutA} tokens={tokens} rig={target} now={now} />);

      expect(cameraZoom(renderer)).toBeCloseTo(fitted * ZOOM_BOUNDS.step, 9);
    } finally {
      await renderer.unmount();
    }
  });
});

describe('useTeardownViewer smoothZoom', () => {
  test('adds the opt-in to the camera state only when requested', async () => {
    const restoreWindow = installMotionWindow();
    let viewer: TeardownViewerHandle | null = null;
    const capture = (next: TeardownViewerHandle) => {
      viewer = next;
    };
    const current = (): TeardownViewerHandle => {
      if (viewer === null) throw new Error('viewer handle was not captured');
      return viewer;
    };
    const renderer = await ReactThreeTestRenderer.create(<ViewerProbe capture={capture} />);

    try {
      expect(current().rig).toEqual(INITIAL_RIG);
      expect('smoothZoom' in current().rig).toBe(false);
    } finally {
      await renderer.unmount();
    }

    const smoothRenderer = await ReactThreeTestRenderer.create(
      <ViewerProbe smoothZoom capture={capture} />,
    );

    try {
      expect(current().rig).toEqual({ ...INITIAL_RIG, smoothZoom: true });
    } finally {
      await smoothRenderer.unmount();
      restoreWindow();
    }
  });
});
