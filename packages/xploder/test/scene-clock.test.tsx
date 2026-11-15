import ReactThreeTestRenderer from '@react-three/test-renderer';
import { act } from 'react';
import { InstancedMesh, Matrix4, Quaternion, Vector3, type OrthographicCamera } from 'three';
import { describe, expect, test } from 'vitest';

import { INITIAL_RIG, ZOOM_BOUNDS, type RigState } from '../src/engine/camera';
import { liftWorld } from '../src/interaction/emphasis';
import { fitZoom, layoutProject, VIEW, type ProjectLayout } from '../src/layout';
import { motion } from '../src/motion';
import { parseProject, parseTechRegistry } from '../src/index';
import type { EmphasisState } from '../src/react/scene/Emphasis';
import { Scene, type SceneProps } from '../src/react/scene/Scene';
import { blueprint } from '../src/theme';
import { createFakeClock, projectAJson, techRegistryJson, type FakeClock } from './fixtures';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const registry = parseTechRegistry(techRegistryJson);
const projectA = parseProject(projectAJson, { registry });
const layoutA = layoutProject(projectA);
const VIEWPORT = { width: 390, height: 844 } as const;
const FRAME_SECONDS = 1 / 60;
const HELD_FRAMES = 10;
type TestRenderer = Awaited<ReturnType<typeof ReactThreeTestRenderer.create>>;

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
    await advanceClockFrame(renderer, clock, Math.min(FRAME_SECONDS, seconds - clock.now()));
  }
}

async function holdFrames(renderer: TestRenderer): Promise<void> {
  for (let frame = 0; frame < HELD_FRAMES; frame += 1) {
    await act(async () => {
      await renderer.advanceFrames(1, FRAME_SECONDS);
    });
  }
}

function cameraOf(renderer: TestRenderer): OrthographicCamera {
  return renderer.scene.fiber.root.getState().camera as OrthographicCamera;
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

function instanceLift(mesh: InstancedMesh, index: number, baseY: number): number {
  const matrix = new Matrix4();
  const position = new Vector3();
  const quaternion = new Quaternion();
  const scale = new Vector3();

  mesh.getMatrixAt(index, matrix);
  matrix.decompose(position, quaternion, scale);
  return position.y - baseY;
}

function instanceMatrix(mesh: InstancedMesh, index: number): readonly number[] {
  const matrix = new Matrix4();

  mesh.getMatrixAt(index, matrix);
  return matrix.elements.slice();
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

function progressRef(): { current: Float32Array | null } {
  return { current: null };
}

function currentProgress(ref: { current: Float32Array | null }): Float32Array {
  if (ref.current === null) throw new Error('Slabs did not publish explode progress');
  return ref.current;
}

describe('engine clock: explode', () => {
  test('samples explode progress only from the injected clock', async () => {
    const clock = createFakeClock();
    const ref = progressRef();
    const settled: Array<'imploded' | 'exploded'> = [];
    const onSettled = (state: 'imploded' | 'exploded'): void => {
      settled.push(state);
    };
    const renderer = await renderScene({ clock, progressRef: ref, onSettled });

    try {
      const end = explodeEnd(layoutA);
      const exploded = (): number => settled.filter((state) => state === 'exploded').length;

      await renderer.update(
        <Scene {...sceneProps({ clock, target: 'exploded', progressRef: ref, onSettled })} />,
      );

      const progress = currentProgress(ref);

      expect(Array.from(progress)).toEqual(
        Array.from({ length: layoutA.layers.length + layoutA.components.length }, () => 0),
      );

      await advanceClockTo(renderer, clock, end / 2);

      for (const value of progress) {
        expect(value).toBeGreaterThan(0);
        expect(value).toBeLessThan(1);
      }

      const held = progress.slice();

      await holdFrames(renderer);
      expect(progress).toEqual(held);
      expect(exploded()).toBe(0);

      await advanceClockTo(renderer, clock, end - FRAME_SECONDS);
      expect(Array.from(progress).every((value) => value === 1)).toBe(false);
      expect(exploded()).toBe(0);

      await advanceClockTo(renderer, clock, end);
      expect(clock.now()).toBeGreaterThanOrEqual(end);

      for (const value of progress) expect(value).toBe(1);
      expect(exploded()).toBe(1);
    } finally {
      await renderer.unmount();
    }
  });
});

describe('engine clock: camera', () => {
  test('samples rotation and camera matrices only from the injected clock', async () => {
    const clock = createFakeClock();
    const renderer = await renderScene({ clock });

    try {
      const camera = cameraOf(renderer);
      const start = camera.position.clone();
      const turned: RigState = { ...INITIAL_RIG, step: 1, turns: 1 };

      await renderer.update(<Scene {...sceneProps({ clock, rig: turned })} />);
      await advanceClockTo(renderer, clock, motion.durations.implode / 2);

      const middle = camera.position.clone();
      const targetRenderer = await renderScene({ clock, rig: turned });

      try {
        const target = cameraOf(targetRenderer).position.clone();

        expect(middle.equals(start)).toBe(false);
        expect(middle.equals(target)).toBe(false);

        camera.updateMatrixWorld();
        const heldMatrix = camera.matrixWorld.elements.slice();

        for (let frame = 0; frame < HELD_FRAMES; frame += 1) {
          await act(async () => {
            await renderer.advanceFrames(1, FRAME_SECONDS);
          });
          camera.updateMatrixWorld();
          expect(camera.matrixWorld.elements).toEqual(heldMatrix);
        }

        await advanceClockTo(renderer, clock, motion.durations.implode);
        expect(camera.position.toArray()).toEqual(target.toArray());
      } finally {
        await targetRenderer.unmount();
      }
    } finally {
      await renderer.unmount();
    }
  });

  test('samples smooth zoom only from the injected clock', async () => {
    const clock = createFakeClock();
    const smooth: RigState = { ...INITIAL_RIG, smoothZoom: true };
    const renderer = await renderScene({ clock, rig: smooth });

    try {
      const camera = cameraOf(renderer);
      const fitted = camera.zoom;
      const zoomed: RigState = { ...smooth, zoomFactor: ZOOM_BOUNDS.step };

      await renderer.update(<Scene {...sceneProps({ clock, rig: zoomed })} />);
      expect(camera.zoom).toBe(fitted);

      await advanceClockTo(renderer, clock, motion.durations.implode / 2);
      expect(camera.zoom).toBeGreaterThan(fitted);
      expect(camera.zoom).toBeLessThan(fitted * ZOOM_BOUNDS.step);

      await advanceClockTo(renderer, clock, motion.durations.implode);
      const expected = fitZoom(layoutA.bounds.exploded, VIEWPORT) * ZOOM_BOUNDS.step;

      expect(camera.zoom).toBe(expected);

      for (let frame = 0; frame < HELD_FRAMES; frame += 1) {
        await act(async () => {
          await renderer.advanceFrames(1, FRAME_SECONDS);
        });
        expect(camera.zoom).toBe(expected);
      }
    } finally {
      await renderer.unmount();
    }
  });
});

describe('engine clock: emphasis', () => {
  test('samples lift and instance matrices only from the injected clock', async () => {
    const clock = createFakeClock();
    const state: EmphasisState = {
      highlight: 'tide-view-model',
      focusLayerId: null,
      focusSuspended: false,
      tourComponentId: null,
    };
    const renderer = await renderScene({ clock, emphasis: state });

    try {
      const components = meshWithCount(renderer, layoutA.components.length);
      const index = layoutA.components.findIndex((component) => component.id === state.highlight);
      const placement = layoutA.components[index];
      const camera = cameraOf(renderer);

      expect(index).toBeGreaterThanOrEqual(0);
      if (placement === undefined) throw new Error('Missing highlighted placement');

      const expectedLift = liftWorld(motion.distances.hoverLift, camera.zoom, VIEW.elevation);

      await advanceClockTo(renderer, clock, motion.durations.hoverSettle / 2);

      const middleLift = instanceLift(components, index, placement.imploded[1]);

      expect(middleLift).toBeGreaterThan(0);
      expect(middleLift).toBeLessThan(expectedLift);

      await advanceClockTo(renderer, clock, motion.durations.hoverSettle);
      expect(instanceLift(components, index, placement.imploded[1])).toBeCloseTo(expectedLift, 7);

      const heldMatrix = instanceMatrix(components, index);

      for (let frame = 0; frame < HELD_FRAMES; frame += 1) {
        await act(async () => {
          await renderer.advanceFrames(1, FRAME_SECONDS);
        });
        expect(instanceMatrix(components, index)).toEqual(heldMatrix);
      }
    } finally {
      await renderer.unmount();
    }
  });
});
