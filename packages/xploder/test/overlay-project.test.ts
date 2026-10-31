import { describe, expect, test } from 'vitest';

import { parseProject, parseTechRegistry } from '../src/index';
import {
  fitZoom,
  layoutProject,
  VIEW,
  type ComponentSlab,
  type SlabPlacement,
  type Vec3,
} from '../src/layout';
import { overlayFrame, projectPoint, type Vec2 } from '../src/overlay/project';
import { projectAJson, techRegistryJson } from './fixtures';

const registry = parseTechRegistry(techRegistryJson);
const projectA = parseProject(projectAJson, { registry });
const layout = layoutProject(projectA);
const VIEWPORT = { width: 390, height: 844 };
const VIEW_SPEC = {
  azimuth: VIEW.baseAzimuth,
  zoom: fitZoom(layout.bounds.exploded, VIEWPORT),
  ...VIEWPORT,
};
const EPSILON = 1e-9;

function centerAt(placement: SlabPlacement, progress: number): Vec3 {
  return [
    placement.imploded[0] + (placement.exploded[0] - placement.imploded[0]) * progress,
    placement.imploded[1] + (placement.exploded[1] - placement.imploded[1]) * progress,
    placement.imploded[2] + (placement.exploded[2] - placement.imploded[2]) * progress,
  ];
}

function projectedCorners(component: ComponentSlab, progress: number): readonly Vec2[] {
  const center = centerAt(component, progress);
  const halfWidth = component.size[0] / 2;
  const halfHeight = component.size[1] / 2;
  const halfDepth = component.size[2] / 2;
  const corners: Vec2[] = [];

  for (const x of [center[0] - halfWidth, center[0] + halfWidth]) {
    for (const y of [center[1] - halfHeight, center[1] + halfHeight]) {
      for (const z of [center[2] - halfDepth, center[2] + halfDepth]) {
        corners.push(projectPoint([x, y, z], VIEW_SPEC));
      }
    }
  }

  return corners;
}

function cross(origin: Vec2, left: Vec2, right: Vec2): number {
  return (
    (left[0] - origin[0]) * (right[1] - origin[1]) - (left[1] - origin[1]) * (right[0] - origin[0])
  );
}

function expectConvex(points: readonly Vec2[]): void {
  expect(points.length).toBeGreaterThanOrEqual(3);

  let direction = 0;

  for (let index = 0; index < points.length; index += 1) {
    const origin = points[index];
    const left = points[(index + 1) % points.length];
    const right = points[(index + 2) % points.length];

    if (origin === undefined || left === undefined || right === undefined) {
      throw new Error('Convex hull indexing failed');
    }

    const turn = cross(origin, left, right);

    if (Math.abs(turn) <= EPSILON) continue;
    const nextDirection = Math.sign(turn);

    expect(direction === 0 || nextDirection === direction).toBe(true);
    direction = nextDirection;
  }
}

function pointInPolygon(point: Vec2, polygon: readonly Vec2[]): boolean {
  let hasPositive = false;
  let hasNegative = false;

  for (let index = 0; index < polygon.length; index += 1) {
    const left = polygon[index];
    const right = polygon[(index + 1) % polygon.length];

    if (left === undefined || right === undefined) return false;

    const turn = cross(left, right, point);

    if (turn > EPSILON) hasPositive = true;
    if (turn < -EPSILON) hasNegative = true;
  }

  return !(hasPositive && hasNegative);
}

describe('overlay projection', () => {
  test('maps the world origin to the viewport centre', () => {
    expect(projectPoint([0, 0, 0], VIEW_SPEC)).toEqual([VIEWPORT.width / 2, VIEWPORT.height / 2]);
  });

  test('uses the S4 camera basis for every world axis', () => {
    const sinAzimuth = Math.sin(VIEW_SPEC.azimuth);
    const cosAzimuth = Math.cos(VIEW_SPEC.azimuth);
    const sinElevation = Math.sin(VIEW.elevation);
    const cosElevation = Math.cos(VIEW.elevation);
    const centreX = VIEWPORT.width / 2;
    const centreY = VIEWPORT.height / 2;
    const cases = [
      [[1, 0, 0], cosAzimuth, -sinElevation * sinAzimuth],
      [[0, 1, 0], 0, cosElevation],
      [[0, 0, 1], -sinAzimuth, -sinElevation * cosAzimuth],
    ] as const satisfies readonly (readonly [Vec3, number, number])[];

    for (const [point, right, up] of cases) {
      const projected = projectPoint(point, VIEW_SPEC);

      expect(projected[0]).toBeCloseTo(centreX + VIEW_SPEC.zoom * right, 10);
      expect(projected[1]).toBeCloseTo(centreY - VIEW_SPEC.zoom * up, 10);
    }
  });

  test('projects a known corner value by hand', () => {
    const view = { azimuth: 0, zoom: 2, width: 100, height: 80 };
    const sinElevation = Math.sin(VIEW.elevation);
    const cosElevation = Math.cos(VIEW.elevation);
    const projected = projectPoint([1, 2, 3], view);
    const firstLayer = layout.layers[0];

    if (firstLayer === undefined) throw new Error('Missing first layer');

    const frame = overlayFrame(layout, 0, view);
    const corner = frame.layers[0]?.corners[0];

    if (corner === undefined) throw new Error('Missing first layer corner');

    expect(projected[0]).toBeCloseTo(52, 10);
    expect(projected[1]).toBeCloseTo(40 - 4 * cosElevation + 6 * sinElevation, 10);
    expect(corner[0]).toBeCloseTo(50 - view.zoom * (firstLayer.size[0] / 2), 10);
    expect(corner[1]).toBeCloseTo(
      40 -
        view.zoom * cosElevation * (firstLayer.imploded[1] + firstLayer.size[1] / 2) -
        view.zoom * sinElevation * (firstLayer.size[2] / 2),
      10,
    );
  });

  test('builds a convex hull that contains every projected component corner', () => {
    const progress = 0.35;
    const frame = overlayFrame(layout, progress, VIEW_SPEC);

    expect(frame.layers).toHaveLength(layout.layers.length);
    expect(frame.components).toHaveLength(layout.components.length);

    frame.components.forEach((componentFrame, index) => {
      const component = layout.components[index];
      if (component === undefined) throw new Error('Missing component placement');

      const centre = centerAt(component, progress);
      const anchor: Vec3 = [centre[0], centre[1] + component.size[1] / 2, centre[2]];
      const expectedAnchor = projectPoint(anchor, VIEW_SPEC);

      expect(componentFrame.anchor[0]).toBeCloseTo(expectedAnchor[0], 10);
      expect(componentFrame.anchor[1]).toBeCloseTo(expectedAnchor[1], 10);
      expectConvex(componentFrame.hull);

      for (const corner of projectedCorners(component, progress)) {
        expect(pointInPolygon(corner, componentFrame.hull)).toBe(true);
      }
    });
  });

  test('keeps content-space y independent of a scroll offset', () => {
    const offsetView = { ...VIEW_SPEC, offsetY: 240 };
    const point: Vec3 = [0.4, -0.2, 0.8];

    expect(projectPoint(point, offsetView)).toStrictEqual(projectPoint(point, VIEW_SPEC));
    expect(overlayFrame(layout, 1, offsetView)).toStrictEqual(overlayFrame(layout, 1, VIEW_SPEC));
  });

  test('accepts the timeline progress array in layer-then-component order', () => {
    const progress = new Float32Array(layout.layers.length + layout.components.length);

    progress.fill(0, 0, layout.layers.length);
    progress.fill(1, layout.layers.length);

    const frame = overlayFrame(layout, progress, VIEW_SPEC);

    expect(frame.layers).toStrictEqual(overlayFrame(layout, 0, VIEW_SPEC).layers);
    expect(frame.components).toStrictEqual(overlayFrame(layout, 1, VIEW_SPEC).components);
  });
});
