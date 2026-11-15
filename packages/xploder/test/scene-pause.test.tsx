import ReactThreeTestRenderer from '@react-three/test-renderer';
import { act } from 'react';
import { InstancedMesh, Matrix4, type OrthographicCamera } from 'three';
import { afterAll, afterEach, beforeAll, describe, expect, test, vi } from 'vitest';

import { INITIAL_RIG, ZOOM_BOUNDS, type RigState } from '../src/engine/camera';
import { layoutProject, type ProjectLayout } from '../src/layout';
import { motion } from '../src/motion';
import { parseProject, parseTechRegistry } from '../src/index';
import type { EmphasisState } from '../src/react/scene/Emphasis';
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
const EXPLODE_PAUSE_SECONDS = 0.2;
const PAUSE_ADVANCE_SECONDS = 0.5;
const HELD_ADVANCE_SECONDS = 3;
const HELD_FRAMES = 10;
type TestRenderer = Awaited<ReturnType<typeof ReactThreeTestRenderer.create>>;

interface Pose {
  readonly progress: string;
  readonly matrix: string;
  readonly zoom: number;
  readonly instance: string | null;
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

async function renderHeldFrames(renderer: TestRenderer): Promise<void> {
  for (let frame = 0; frame < HELD_FRAMES; frame += 1) {
    await act(async () => {
      await renderer.advanceFrames(1, FRAME_SECONDS);
    });
  }
}

async function holdPaused(renderer: TestRenderer, clock: FakeClock): Promise<void> {
  clock.advance(PAUSE_ADVANCE_SECONDS);
  await renderHeldFrames(renderer);
  clock.advance(HELD_ADVANCE_SECONDS);
  await renderHeldFrames(renderer);
}

async function pauseFromDemand(renderer: TestRenderer, clock: FakeClock): Promise<void> {
  const store = renderer.scene.fiber.root;

  await act(async () => {
    store.getState().setFrameloop('demand');
    clock.pause();
  });
}

function cameraOf(renderer: TestRenderer): OrthographicCamera {
  return renderer.scene.fiber.root.getState().camera as OrthographicCamera;
}

function cameraAzimuth(camera: OrthographicCamera): number {
  return Math.atan2(camera.position.x, camera.position.z);
}

function instancedMeshes(renderer: TestRenderer): InstancedMesh[] {
  return renderer.scene
    .findAll((node) => node.instance instanceof InstancedMesh)
    .map((node) => node.instance as InstancedMesh);
}

function meshWithCount(renderer: TestRenderer, count: number): InstancedMesh {
  const mesh = instancedMeshes(renderer).find((candidate) => candidate.count === count);

  if (mesh === undefined) throw new Error(`Missing InstancedMesh with count ${count}`);
  return mesh;
}

function instanceMatrix(mesh: InstancedMesh, index: number): readonly number[] {
  const matrix = new Matrix4();

  mesh.getMatrixAt(index, matrix);
  return matrix.elements.slice();
}

function float32Bits(values: Float32Array): string {
  const words = new Uint32Array(values.buffer, values.byteOffset, values.length);

  return Array.from(words).join(',');
}

function numberBits(values: readonly number[]): string {
  const copy = new Float64Array(values.length);

  copy.set(values);
  return Array.from(new Uint32Array(copy.buffer)).join(',');
}

function poseOf(
  renderer: TestRenderer,
  progressRef: { current: Float32Array | null },
  highlightId?: string,
): Pose {
  const progress = progressRef.current;
  const camera = cameraOf(renderer);
  const components =
    highlightId === undefined ? null : meshWithCount(renderer, layoutA.components.length);
  const index =
    highlightId === undefined
      ? -1
      : layoutA.components.findIndex((component) => component.id === highlightId);

  if (progress === null) throw new Error('Slabs did not publish explode progress');
  if (highlightId !== undefined && (components === null || index < 0)) {
    throw new Error(`Missing highlighted instance ${highlightId}`);
  }

  camera.updateMatrixWorld(true);

  return {
    progress: float32Bits(progress),
    matrix: numberBits(camera.matrixWorld.elements),
    zoom: camera.zoom,
    instance: components === null ? null : numberBits(instanceMatrix(components, index)),
  };
}

function expectFrozen(actual: Pose, held: Pose): void {
  expect(actual.progress).toBe(held.progress);
  expect(actual.matrix).toBe(held.matrix);
  expect(actual.zoom).toBe(held.zoom);
  expect(actual.instance).toBe(held.instance);
}

function settledCount(events: readonly OverlayEvent[]): number {
  return events.filter((event) => event.kind === 'settled').length;
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

afterEach(() => {
  vi.restoreAllMocks();
});

beforeAll(() => {
  vi.stubGlobal('requestAnimationFrame', () => 0);
});

afterAll(() => {
  vi.unstubAllGlobals();
});

describe('ClockGate', () => {
  test('freezes explode progress while paused', async () => {
    const clock = createFakeClock();
    const progressRef = { current: null as Float32Array | null };
    const events: OverlayEvent[] = [];
    const renderer = await renderScene({
      clock,
      progressRef,
      onOverlay: (event) => events.push(event),
    });

    try {
      await renderer.update(
        <Scene
          {...sceneProps({
            clock,
            target: 'exploded',
            progressRef,
            onOverlay: (event) => events.push(event),
          })}
        />,
      );
      await advanceClockTo(renderer, clock, EXPLODE_PAUSE_SECONDS);
      const held = poseOf(renderer, progressRef);
      const heldSettled = settledCount(events);

      expect(progressRef.current?.some((value) => value > 0 && value < 1)).toBe(true);

      await pauseFromDemand(renderer, clock);
      expect(renderer.scene.fiber.root.getState().frameloop).toBe('never');

      await holdPaused(renderer, clock);

      expectFrozen(poseOf(renderer, progressRef), held);
      expect(settledCount(events)).toBe(heldSettled);
    } finally {
      await renderer.unmount();
    }
  });

  test('freezes a turn while paused', async () => {
    const clock = createFakeClock();
    const progressRef = { current: null as Float32Array | null };
    const renderer = await renderScene({ clock, progressRef });

    try {
      const turned: RigState = { ...INITIAL_RIG, step: 1, turns: 1 };

      await renderer.update(<Scene {...sceneProps({ clock, rig: turned, progressRef })} />);
      await advanceClockTo(renderer, clock, motion.durations.implode / 2);

      const held = poseOf(renderer, progressRef);

      await pauseFromDemand(renderer, clock);
      expect(renderer.scene.fiber.root.getState().frameloop).toBe('never');

      await holdPaused(renderer, clock);

      expectFrozen(poseOf(renderer, progressRef), held);
    } finally {
      await renderer.unmount();
    }
  });

  test('freezes smooth zoom while paused', async () => {
    const clock = createFakeClock();
    const progressRef = { current: null as Float32Array | null };
    const smooth: RigState = { ...INITIAL_RIG, smoothZoom: true };
    const renderer = await renderScene({ clock, rig: smooth, progressRef });

    try {
      const camera = cameraOf(renderer);
      const fitted = camera.zoom;
      const zoomed: RigState = { ...smooth, zoomFactor: ZOOM_BOUNDS.step };

      await renderer.update(<Scene {...sceneProps({ clock, rig: zoomed, progressRef })} />);
      await advanceClockTo(renderer, clock, motion.durations.implode / 2);

      expect(camera.zoom).toBeGreaterThan(fitted);
      expect(camera.zoom).toBeLessThan(fitted * ZOOM_BOUNDS.step);

      const held = poseOf(renderer, progressRef);

      await pauseFromDemand(renderer, clock);
      expect(renderer.scene.fiber.root.getState().frameloop).toBe('never');

      await holdPaused(renderer, clock);

      expectFrozen(poseOf(renderer, progressRef), held);
    } finally {
      await renderer.unmount();
    }
  });

  test('freezes highlight lift while paused', async () => {
    const clock = createFakeClock();
    const progressRef = { current: null as Float32Array | null };
    const highlight = 'tide-view-model';
    const state: EmphasisState = {
      highlight,
      focusLayerId: null,
      focusSuspended: false,
      tourComponentId: null,
    };
    const renderer = await renderScene({ clock, emphasis: state, progressRef });

    try {
      await advanceClockTo(renderer, clock, motion.durations.hoverSettle / 2);

      const held = poseOf(renderer, progressRef, highlight);

      await pauseFromDemand(renderer, clock);
      expect(renderer.scene.fiber.root.getState().frameloop).toBe('never');

      await holdPaused(renderer, clock);

      expectFrozen(poseOf(renderer, progressRef, highlight), held);
    } finally {
      await renderer.unmount();
    }
  });

  test('repaints the frozen pose exactly once when a paused canvas resizes', async () => {
    const clock = createFakeClock();
    const progressRef = { current: null as Float32Array | null };
    const renderer = await renderScene({ clock, progressRef });

    try {
      const turned: RigState = { ...INITIAL_RIG, step: 1, turns: 1 };

      await renderer.update(<Scene {...sceneProps({ clock, rig: turned, progressRef })} />);
      await advanceClockTo(renderer, clock, motion.durations.implode / 2);

      const heldProgress = progressRef.current?.slice();
      const heldAzimuth = cameraAzimuth(cameraOf(renderer));

      await act(async () => {
        clock.pause();
      });

      const store = renderer.scene.fiber.root;
      const renderSpy = vi.spyOn(store.getState().gl, 'render');

      await act(async () => {
        store.getState().setSize(VIEWPORT.width + 80, VIEWPORT.height + 40);
      });

      expect(renderSpy).toHaveBeenCalledTimes(1);
      expect(progressRef.current).toEqual(heldProgress);
      expect(cameraAzimuth(cameraOf(renderer))).toBe(heldAzimuth);
    } finally {
      await renderer.unmount();
    }
  });

  test('resumes the tween from the frozen sample and settles once', async () => {
    const clock = createFakeClock();
    const progressRef = { current: null as Float32Array | null };
    const events: OverlayEvent[] = [];
    const renderer = await renderScene({
      clock,
      progressRef,
      onOverlay: (event) => events.push(event),
    });

    try {
      await renderer.update(
        <Scene
          {...sceneProps({
            clock,
            target: 'exploded',
            progressRef,
            onOverlay: (event) => events.push(event),
          })}
        />,
      );
      await advanceClockTo(renderer, clock, EXPLODE_PAUSE_SECONDS);

      const held = poseOf(renderer, progressRef);
      const prePauseFrameloop = renderer.scene.fiber.root.getState().frameloop;
      const pausedAt = clock.now();

      await act(async () => {
        clock.pause();
      });
      expect(renderer.scene.fiber.root.getState().frameloop).toBe('never');

      clock.advance(PAUSE_ADVANCE_SECONDS);
      const resumedEventStart = events.length;

      await act(async () => {
        clock.resume();
      });
      expect(renderer.scene.fiber.root.getState().frameloop).toBe(prePauseFrameloop);
      expect(clock.now()).toBe(pausedAt);

      await advanceClockFrame(renderer, clock, 0);
      expectFrozen(poseOf(renderer, progressRef), held);

      const end = explodeEnd(layoutA);

      await advanceClockTo(renderer, clock, end + FRAME_SECONDS);
      await advanceClockFrame(renderer, clock);

      const settled = events
        .slice(resumedEventStart)
        .filter(
          (event): event is Extract<OverlayEvent, { kind: 'settled' }> => event.kind === 'settled',
        );

      expect(settled).toHaveLength(1);
      expect(settled[0]?.at).toBeGreaterThanOrEqual(end);
    } finally {
      await renderer.unmount();
    }
  });
});
