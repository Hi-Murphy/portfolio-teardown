import { describe, expect, test } from 'vitest';

import { parseProject, parseTechRegistry } from '../src/index';
import { pick, rayBoxDistance, type Ray } from '../src/interaction/pick';
import {
  layoutProject,
  VIEW,
  type Box,
  type ProjectLayout,
  type SlabPlacement,
  type Vec3,
} from '../src/layout/index';
import { projectAJson, projectBJson, techRegistryJson } from './fixtures';

const registry = parseTechRegistry(techRegistryJson);
const projectA = parseProject(projectAJson, { registry });
const projectB = parseProject(projectBJson, { registry });
const PROJECTS = [
  ['fixture A', projectA],
  ['fixture B', projectB],
] as const;
const AZIMUTHS = Array.from({ length: 4 }, (_, index) => VIEW.baseAzimuth + index * VIEW.snap);
const ZERO = [0, 0, 0] as const;
const UNIT = [1, 1, 1] as const;
const AXIS_BOX_SIZE = [2, 2, 2] as const;
const CAMERA_DISTANCE_MULTIPLIER = 4;
const GRID_STEP = 0.05;
const MARCH_STEP = 0.005;
const REFERENCE_EPSILON = 1e-9;

interface ReferenceBox extends Box {
  readonly componentIndex: number | null;
}

function add(left: Vec3, right: Vec3): Vec3 {
  return [left[0] + right[0], left[1] + right[1], left[2] + right[2]];
}

function scale(value: Vec3, factor: number): Vec3 {
  return [value[0] * factor, value[1] * factor, value[2] * factor];
}

function dot(left: Vec3, right: Vec3): number {
  return left[0] * right[0] + left[1] * right[1] + left[2] * right[2];
}

function cameraPosition(azimuth: number, distance: number): Vec3 {
  const radius = distance * Math.cos(VIEW.elevation);

  return [
    radius * Math.sin(azimuth),
    distance * Math.sin(VIEW.elevation),
    radius * Math.cos(azimuth),
  ];
}

function cameraRayThrough(center: Vec3, azimuth: number): Ray {
  const distance = 4;
  const position = cameraPosition(azimuth, distance);

  return {
    origin: add(center, position),
    direction: scale(position, -1 / distance),
  };
}

function centerAt(placement: SlabPlacement, progress: number): Vec3 {
  return [
    placement.imploded[0] + (placement.exploded[0] - placement.imploded[0]) * progress,
    placement.imploded[1] + (placement.exploded[1] - placement.imploded[1]) * progress,
    placement.imploded[2] + (placement.exploded[2] - placement.imploded[2]) * progress,
  ];
}

function cameraDistance(bounds: Box): number {
  const width = bounds.max[0] - bounds.min[0];
  const height = bounds.max[1] - bounds.min[1];
  const depth = bounds.max[2] - bounds.min[2];

  return CAMERA_DISTANCE_MULTIPLIER * (Math.hypot(width, height, depth) / 2);
}

function cameraBasis(azimuth: number): { right: Vec3; up: Vec3; toward: Vec3 } {
  const sinAzimuth = Math.sin(azimuth);
  const cosAzimuth = Math.cos(azimuth);
  const sinElevation = Math.sin(VIEW.elevation);
  const cosElevation = Math.cos(VIEW.elevation);

  return {
    right: [cosAzimuth, 0, -sinAzimuth],
    up: [-sinElevation * sinAzimuth, cosElevation, -sinElevation * cosAzimuth],
    toward: [-cosElevation * sinAzimuth, -sinElevation, -cosElevation * cosAzimuth],
  };
}

function projectedBounds(
  bounds: Box,
  azimuth: number,
): { minU: number; maxU: number; minV: number; maxV: number } {
  const basis = cameraBasis(azimuth);
  let minU = Infinity;
  let maxU = -Infinity;
  let minV = Infinity;
  let maxV = -Infinity;

  for (const x of [bounds.min[0], bounds.max[0]]) {
    for (const y of [bounds.min[1], bounds.max[1]]) {
      for (const z of [bounds.min[2], bounds.max[2]]) {
        const point = [x, y, z] as const;
        const u = dot(point, basis.right);
        const v = dot(point, basis.up);

        minU = Math.min(minU, u);
        maxU = Math.max(maxU, u);
        minV = Math.min(minV, v);
        maxV = Math.max(maxV, v);
      }
    }
  }

  return { minU, maxU, minV, maxV };
}

function* gridRays(bounds: Box, azimuth: number): Generator<Ray> {
  const basis = cameraBasis(azimuth);
  const projected = projectedBounds(bounds, azimuth);
  const uSpan = projected.maxU - projected.minU;
  const vSpan = projected.maxV - projected.minV;
  const uCount = Math.max(1, Math.ceil(uSpan / GRID_STEP));
  const vCount = Math.max(1, Math.ceil(vSpan / GRID_STEP));
  const camera = cameraPosition(azimuth, cameraDistance(bounds));

  // Cell-centre rays keep the grid within the projected bounds and spacing at or below GRID_STEP.
  for (let uIndex = 0; uIndex < uCount; uIndex += 1) {
    const u = projected.minU + (uSpan * (uIndex + 0.5)) / uCount;

    for (let vIndex = 0; vIndex < vCount; vIndex += 1) {
      const v = projected.minV + (vSpan * (vIndex + 0.5)) / vCount;

      yield {
        origin: add(add(camera, scale(basis.right, u)), scale(basis.up, v)),
        direction: basis.toward,
      };
    }
  }
}

function placementBox(placement: SlabPlacement, progress: number): Box {
  const center = centerAt(placement, progress);

  return {
    min: [
      center[0] - placement.size[0] / 2,
      center[1] - placement.size[1] / 2,
      center[2] - placement.size[2] / 2,
    ],
    max: [
      center[0] + placement.size[0] / 2,
      center[1] + placement.size[1] / 2,
      center[2] + placement.size[2] / 2,
    ],
  };
}

function referenceBoxes(layout: ProjectLayout, progress: number): readonly ReferenceBox[] {
  return [
    ...layout.layers.map((layer) => ({
      ...placementBox(layer, progress),
      componentIndex: null,
    })),
    ...layout.components.map((component, index) => ({
      ...placementBox(component, progress),
      componentIndex: index,
    })),
  ];
}

function containsPoint(box: Box, point: Vec3): boolean {
  return (
    point[0] >= box.min[0] - REFERENCE_EPSILON &&
    point[0] <= box.max[0] + REFERENCE_EPSILON &&
    point[1] >= box.min[1] - REFERENCE_EPSILON &&
    point[1] <= box.max[1] + REFERENCE_EPSILON &&
    point[2] >= box.min[2] - REFERENCE_EPSILON &&
    point[2] <= box.max[2] + REFERENCE_EPSILON
  );
}

function marchPick(ray: Ray, bounds: Box, boxes: readonly ReferenceBox[]): number | null {
  let minT = Infinity;
  let maxT = -Infinity;

  for (const x of [bounds.min[0], bounds.max[0]]) {
    for (const y of [bounds.min[1], bounds.max[1]]) {
      for (const z of [bounds.min[2], bounds.max[2]]) {
        const t = dot([x - ray.origin[0], y - ray.origin[1], z - ray.origin[2]], ray.direction);

        minT = Math.min(minT, t);
        maxT = Math.max(maxT, t);
      }
    }
  }

  const start = Math.max(0, minT - MARCH_STEP);
  const end = maxT + MARCH_STEP;
  const samples: number[] = [];

  for (let t = start; t <= end; t += MARCH_STEP) samples.push(t);

  // Slab faces close the sub-step gap for rays that clip a box edge.
  for (const box of boxes) {
    for (const axis of [0, 1, 2] as const) {
      const direction = ray.direction[axis];
      if (direction === 0) continue;

      for (const face of [box.min[axis], box.max[axis]]) {
        const t = (face - ray.origin[axis]) / direction;

        if (t >= start && t <= end) samples.push(t);
      }
    }
  }

  samples.sort((left, right) => left - right);

  for (const t of samples) {
    const point = add(ray.origin, scale(ray.direction, t));
    const hit = boxes.find((box) => containsPoint(box, point));

    if (hit) return hit.componentIndex;
  }

  return null;
}

function visibilityLines(): string[] {
  const lines = [
    '',
    `Exploded visibility table (grid rays per component, step ${GRID_STEP} world units)`,
  ];

  for (const [name, project] of PROJECTS) {
    const layout = layoutProject(project);
    const progress = progressFor(layout, 1);

    lines.push('', `${name}:`);

    for (const azimuth of AZIMUTHS) {
      const counts = layout.components.map(() => 0);

      for (const ray of gridRays(layout.bounds.exploded, azimuth)) {
        const hit = pick(ray, layout, progress);

        if (hit !== null) counts[hit] = (counts[hit] ?? 0) + 1;
      }

      lines.push(`  azimuth ${azimuth.toFixed(6)}:`);
      layout.components.forEach((component, index) => {
        lines.push(`    ${component.id}: ${counts[index] ?? 0}`);
      });
    }
  }

  return lines;
}

function progressFor(layout: ProjectLayout, value: number): Float32Array {
  return new Float32Array(layout.layers.length + layout.components.length).fill(value);
}

function emptyProjectLayout(
  components: ProjectLayout['components'],
  layers: ProjectLayout['layers'] = [],
): ProjectLayout {
  return {
    version: 1,
    footprint: { cols: 0, rows: 0, width: 0, depth: 0 },
    layers,
    components,
    bounds: { imploded: { min: ZERO, max: ZERO }, exploded: { min: ZERO, max: ZERO } },
  };
}

describe('rayBoxDistance', () => {
  test.each([
    ['x', [-5, 0, 0], [1, 0, 0], 4],
    ['y', [0, -5, 0], [0, 1, 0], 4],
    ['z', [0, 0, -5], [0, 0, 1], 4],
  ] as const)('hits from the %s axis', (_axis, origin, direction, expected) => {
    expect(rayBoxDistance({ origin, direction }, ZERO, AXIS_BOX_SIZE)).toBe(expected);
  });

  test('misses a box outside the ray lane', () => {
    expect(rayBoxDistance({ origin: [-5, 2, 0], direction: [1, 0, 0] }, ZERO, UNIT)).toBeNull();
  });

  test('returns zero when the ray origin is inside the box', () => {
    expect(rayBoxDistance({ origin: [0.25, -0.25, 0.5], direction: [1, 1, 1] }, ZERO, UNIT)).toBe(
      0,
    );
  });

  test('returns null when the ray points away from the box', () => {
    expect(rayBoxDistance({ origin: [3, 0, 0], direction: [1, 0, 0] }, ZERO, UNIT)).toBeNull();
  });

  test('returns null for a parallel ray outside a slab', () => {
    expect(rayBoxDistance({ origin: [-5, 2, 0], direction: [0, 0, 1] }, ZERO, UNIT)).toBeNull();
  });
});

describe('pick', () => {
  test.each(PROJECTS)('%s: top-layer component centre rays pick themselves', (name, project) => {
    const layout = layoutProject(project);

    for (const state of ['imploded', 'exploded'] as const) {
      const progress = progressFor(layout, state === 'imploded' ? 0 : 1);

      for (const azimuth of AZIMUTHS) {
        layout.components.forEach((component, index) => {
          if (component.layerIndex !== 0) return;

          const ray = cameraRayThrough(centerAt(component, state === 'imploded' ? 0 : 1), azimuth);

          expect(
            pick(ray, layout, progress),
            `${name}, ${state}, ${component.id}, ${azimuth}`,
          ).toBe(index);
        });
      }
    }
  });

  test.each(PROJECTS)(
    '%s imploded: lower layers are occluded and never pick themselves',
    (name, project) => {
      const layout = layoutProject(project);
      const progress = progressFor(layout, 0);

      for (const azimuth of AZIMUTHS) {
        layout.components.forEach((component, index) => {
          const hit = pick(cameraRayThrough(centerAt(component, 0), azimuth), layout, progress);

          if (component.layerIndex === 0) {
            expect(hit, `${name}, ${component.id}, ${azimuth}`).toBe(index);
          } else {
            expect(hit, `${name}, ${component.id}, ${azimuth}`).not.toBe(index);

            if (hit !== null) {
              expect(
                layout.components[hit]?.layerIndex,
                `${name}, ${component.id}, ${azimuth}`,
              ).toBe(0);
            }
          }
        });
      }
    },
  );

  test('matches an independent marching reference for both states and all azimuths', () => {
    let mismatch: string | null = null;

    for (const [name, project] of PROJECTS) {
      const layout = layoutProject(project);

      for (const state of ['imploded', 'exploded'] as const) {
        const progressValue = state === 'imploded' ? 0 : 1;
        const progress = progressFor(layout, progressValue);
        const bounds = layout.bounds[state];
        const boxes = referenceBoxes(layout, progressValue);

        for (const azimuth of AZIMUTHS) {
          for (const ray of gridRays(bounds, azimuth)) {
            const expected = marchPick(ray, bounds, boxes);
            const actual = pick(ray, layout, progress);

            if (actual !== expected && mismatch === null) {
              mismatch = `${name}, ${state}, ${azimuth}, origin (${ray.origin.join(', ')}): picked ${actual}, marching reference picked ${expected}`;
            }
          }
        }
      }
    }

    expect(mismatch).toBeNull();
  }, 120_000);

  test('prints the exploded visibility table for evidence', () => {
    console.log(visibilityLines().join('\n'));
  }, 60_000);

  test('returns the nearest component when two lie along the same ray', () => {
    const layout = emptyProjectLayout([
      {
        id: 'far',
        layerId: 'only',
        layerIndex: 0,
        slot: 0,
        cell: [0, 0],
        size: UNIT,
        imploded: [0, 0, -6],
        exploded: [0, 0, -6],
      },
      {
        id: 'near',
        layerId: 'only',
        layerIndex: 0,
        slot: 1,
        cell: [1, 0],
        size: UNIT,
        imploded: [0, 0, 0],
        exploded: [0, 0, 0],
      },
    ]);

    expect(
      pick({ origin: [0, 0, 10], direction: [0, 0, -1] }, layout, new Float32Array([0, 0])),
    ).toBe(1);
  });

  test('returns null when the nearest hit is only a layer slab', () => {
    const layout = emptyProjectLayout(
      [],
      [
        {
          id: 'only',
          index: 0,
          size: [4, 1, 4],
          imploded: [0, 0, 0],
          exploded: [0, 0, 0],
        },
      ],
    );

    expect(
      pick({ origin: [0, 0, 10], direction: [0, 0, -1] }, layout, new Float32Array([0])),
    ).toBeNull();
  });

  test('uses lerped component centres during the explode timeline', () => {
    const layout = emptyProjectLayout([
      {
        id: 'moving',
        layerId: 'only',
        layerIndex: 0,
        slot: 0,
        cell: [0, 0],
        size: UNIT,
        imploded: [0, 0, 0],
        exploded: [4, 0, 0],
      },
    ]);
    const progress = new Float32Array([0.5]);

    expect(pick({ origin: [2, 0, 10], direction: [0, 0, -1] }, layout, progress)).toBe(0);
    expect(pick({ origin: [0, 0, 10], direction: [0, 0, -1] }, layout, progress)).toBeNull();
  });
});
