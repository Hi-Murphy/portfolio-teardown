import ReactThreeTestRenderer from '@react-three/test-renderer';
import { Vector3, type OrthographicCamera } from 'three';
import { describe, expect, test } from 'vitest';

import { INITIAL_RIG, type RigState } from '../src/engine/camera';
import { fitZoom, layoutProject, VIEW, type ProjectLayout } from '../src/layout';
import { motion } from '../src/motion';
import { overlayFrame, type OverlayFrame, type Vec2 } from '../src/overlay/project';
import { parseProject, parseTechRegistry } from '../src/index';
import {
  createOverlayProjectionBuffers,
  projectOverlayFrameBuffer,
  type OverlayEvent,
} from '../src/react/scene/OverlayProjector';
import { Scene, type SceneProps } from '../src/react/scene/Scene';
import { blueprint } from '../src/theme';
import { projectAJson, techRegistryJson } from './fixtures';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const registry = parseTechRegistry(techRegistryJson);
const projectA = parseProject(projectAJson, { registry });
const layoutA = layoutProject(projectA);
const VIEWPORT = { width: 390, height: 844 } as const;
const FRAME_TOLERANCE = 0.5;
type TestRenderer = Awaited<ReturnType<typeof ReactThreeTestRenderer.create>>;
type Target = 'imploded' | 'exploded';

function progressFor(layout: ProjectLayout, value: number): Float32Array {
  return new Float32Array(layout.layers.length + layout.components.length).fill(value);
}

function sceneProps(overrides: Partial<SceneProps> = {}): SceneProps {
  return {
    layout: layoutA,
    palette: blueprint.light,
    tokens: motion,
    target: 'imploded',
    rig: INITIAL_RIG,
    now: () => 0,
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

function settledEvents(
  events: readonly OverlayEvent[],
): Extract<OverlayEvent, { kind: 'settled' }>[] {
  return events.filter(
    (event): event is Extract<OverlayEvent, { kind: 'settled' }> => event.kind === 'settled',
  );
}

function expectPointClose(actual: Vec2, expected: Vec2, message: string): void {
  expect(Math.abs(actual[0] - expected[0]), `${message} x`).toBeLessThanOrEqual(FRAME_TOLERANCE);
  expect(Math.abs(actual[1] - expected[1]), `${message} y`).toBeLessThanOrEqual(FRAME_TOLERANCE);
}

function pointIsClose(actual: Vec2, expected: Vec2): boolean {
  return (
    Math.abs(actual[0] - expected[0]) <= FRAME_TOLERANCE &&
    Math.abs(actual[1] - expected[1]) <= FRAME_TOLERANCE
  );
}

function expectHullClose(
  actual: readonly Vec2[],
  expected: readonly Vec2[],
  message: string,
): void {
  expect(actual).toHaveLength(expected.length);

  for (let offset = 0; offset < actual.length; offset += 1) {
    const first = actual[offset];
    const expectedFirst = expected[0];

    if (first === undefined || expectedFirst === undefined || !pointIsClose(first, expectedFirst)) {
      continue;
    }

    const matches = expected.every((expectedPoint, index) => {
      const actualPoint = actual[(offset + index) % actual.length];

      return actualPoint !== undefined && pointIsClose(actualPoint, expectedPoint);
    });

    if (matches) return;
  }

  throw new Error(`${message} hull does not match cyclically`);
}

function expectFrameClose(actual: OverlayFrame, expected: OverlayFrame): void {
  expect(actual.layers).toHaveLength(expected.layers.length);
  expect(actual.components).toHaveLength(expected.components.length);

  actual.layers.forEach((layer, index) => {
    const expectedLayer = expected.layers[index];

    if (expectedLayer === undefined) throw new Error('Missing expected layer frame');

    expect(layer.id).toBe(expectedLayer.id);
    expect(layer.index).toBe(expectedLayer.index);

    layer.corners.forEach((corner, cornerIndex) => {
      const expectedCorner = expectedLayer.corners[cornerIndex];

      if (expectedCorner === undefined) throw new Error('Missing expected layer corner');
      expectPointClose(corner, expectedCorner, `${layer.id} corner ${cornerIndex}`);
    });
  });

  actual.components.forEach((component, index) => {
    const expectedComponent = expected.components[index];

    if (expectedComponent === undefined) throw new Error('Missing expected component frame');

    expect(component.id).toBe(expectedComponent.id);
    expect(component.layerId).toBe(expectedComponent.layerId);
    expect(component.layerIndex).toBe(expectedComponent.layerIndex);
    expect(component.slot).toBe(expectedComponent.slot);
    expectPointClose(component.anchor, expectedComponent.anchor, `${component.id} anchor`);
    expectHullClose(component.hull, expectedComponent.hull, component.id);
  });
}

describe('OverlayProjector', () => {
  test.each(
    [0, 1, 2, 3].flatMap((turns) =>
      (['imploded', 'exploded'] as const).map((target) => [turns, target] as const),
    ),
  )('matches the pure twin at azimuth %i while %s', async (turns, target: Target) => {
    const events: OverlayEvent[] = [];
    const progressRef = { current: null as Float32Array | null };
    const rig: RigState = {
      ...INITIAL_RIG,
      step: turns as RigState['step'],
      turns,
    };
    const renderer = await renderScene({
      target,
      rig,
      progressRef,
      onOverlay: (event) => events.push(event),
    });

    try {
      await renderer.advanceFrames(1, 0.1);

      const progress = progressRef.current;
      const settled = settledEvents(events).at(-1);
      const camera = renderer.scene.fiber.root.getState().camera as OrthographicCamera;

      if (progress === null) throw new Error('Slabs did not publish explode progress');
      if (settled === undefined) throw new Error('OverlayProjector did not settle');

      expect(camera.zoom).toBeCloseTo(fitZoom(layoutA.bounds.exploded, VIEWPORT), 9);
      expect(settled.width).toBe(VIEWPORT.width);
      expect(settled.height).toBe(VIEWPORT.height);
      expect(settled.offsetY).toBe(0);

      const expected = overlayFrame(layoutA, progress, {
        azimuth: VIEW.baseAzimuth + turns * VIEW.snap,
        zoom: camera.zoom,
        width: VIEWPORT.width,
        height: VIEWPORT.height,
      });

      expectFrameClose(settled.frame, expected);
    } finally {
      await renderer.unmount();
    }
  });

  test('emits moving once and then exactly one settled after a turn', async () => {
    let seconds = 0;
    const events: OverlayEvent[] = [];
    const now = () => seconds;
    const onOverlay = (event: OverlayEvent): void => {
      events.push(event);
    };
    const element = (rig: RigState) => <Scene {...sceneProps({ now, rig, onOverlay })} />;
    const renderer = await ReactThreeTestRenderer.create(element(INITIAL_RIG), {
      orthographic: true,
      width: VIEWPORT.width,
      height: VIEWPORT.height,
    });

    try {
      await renderer.advanceFrames(1, 0.1);
      expect(events.map((event) => event.kind)).toEqual(['settled']);

      const turned: RigState = { ...INITIAL_RIG, step: 1, turns: 1 };
      await renderer.update(element(turned));

      seconds = motion.durations.implode / 2;
      await renderer.advanceFrames(1, 0.1);
      expect(events.map((event) => event.kind)).toEqual(['settled', 'moving']);

      seconds = motion.durations.implode;
      await renderer.advanceFrames(1, 0.1);
      expect(events.map((event) => event.kind)).toEqual(['settled', 'moving']);

      await renderer.advanceFrames(1, 0.1);
      expect(events.map((event) => event.kind)).toEqual(['settled', 'moving', 'settled']);
    } finally {
      await renderer.unmount();
    }
  });

  test('reports a view-offset change without emitting moving', async () => {
    const events: OverlayEvent[] = [];
    const scrollOffsets: number[] = [];
    const renderer = await renderScene({
      onOverlay: (event) => events.push(event),
      onOverlayScroll: (offsetY) => scrollOffsets.push(offsetY),
    });

    try {
      await renderer.advanceFrames(1, 0.1);
      expect(events.map((event) => event.kind)).toEqual(['settled']);
      expect(scrollOffsets).toEqual([]);

      const camera = renderer.scene.fiber.root.getState().camera as OrthographicCamera;

      camera.setViewOffset(
        VIEWPORT.width,
        VIEWPORT.height,
        0,
        120,
        VIEWPORT.width,
        VIEWPORT.height,
      );
      camera.updateProjectionMatrix();
      await renderer.advanceFrames(1, 0.1);

      expect(scrollOffsets).toEqual([120]);
      expect(events.map((event) => event.kind)).toEqual(['settled']);
    } finally {
      await renderer.unmount();
    }
  });

  test('keeps a settled frame in content space under a view offset', async () => {
    const events: OverlayEvent[] = [];
    const progressRef = { current: null as Float32Array | null };
    const renderer = await renderScene({
      target: 'exploded',
      progressRef,
      onOverlay: (event) => events.push(event),
    });

    try {
      await renderer.advanceFrames(1, 0.1);

      const camera = renderer.scene.fiber.root.getState().camera as OrthographicCamera;

      camera.setViewOffset(
        VIEWPORT.width,
        VIEWPORT.height,
        0,
        160,
        VIEWPORT.width,
        VIEWPORT.height,
      );
      camera.zoom *= 1.2;
      camera.updateProjectionMatrix();

      await renderer.advanceFrames(1, 0.1);
      await renderer.advanceFrames(1, 0.1);

      const progress = progressRef.current;
      const settled = settledEvents(events).at(-1);

      if (progress === null) throw new Error('Slabs did not publish explode progress');
      if (settled === undefined) throw new Error('OverlayProjector did not settle');

      expect(settled.offsetY).toBe(160);
      expectFrameClose(
        settled.frame,
        overlayFrame(layoutA, progress, {
          azimuth: VIEW.baseAzimuth,
          zoom: camera.zoom,
          width: VIEWPORT.width,
          height: VIEWPORT.height,
        }),
      );
    } finally {
      await renderer.unmount();
    }
  });

  test('reuses projection buffers across frames after warm-up', async () => {
    const renderer = await renderScene();

    try {
      const camera = renderer.scene.fiber.root.getState().camera as OrthographicCamera;
      const buffers = createOverlayProjectionBuffers(layoutA);
      const vector = new Vector3();
      const progress = progressFor(layoutA, 1);
      const layer = buffers.layers[0];
      const component = buffers.components[0];

      if (layer === undefined || component === undefined) {
        throw new Error('Missing projection buffers');
      }

      const layerCorners = layer.corners;
      const componentPoints = component.points;
      const componentHull = component.hull;
      const componentAnchor = component.anchor;

      camera.updateMatrixWorld(true);
      projectOverlayFrameBuffer(
        buffers,
        layoutA,
        camera,
        progress,
        VIEWPORT.width,
        VIEWPORT.height,
        0,
        vector,
      );

      for (let frame = 0; frame < 120; frame += 1) {
        projectOverlayFrameBuffer(
          buffers,
          layoutA,
          camera,
          progress,
          VIEWPORT.width,
          VIEWPORT.height,
          0,
          vector,
        );
      }

      expect(layer.corners).toBe(layerCorners);
      expect(component.points).toBe(componentPoints);
      expect(component.hull).toBe(componentHull);
      expect(component.anchor).toBe(componentAnchor);
      expect(component.hullCount).toBeGreaterThanOrEqual(3);
      expect(component.hullCount).toBeLessThanOrEqual(componentHull.length);
    } finally {
      await renderer.unmount();
    }
  });
});
