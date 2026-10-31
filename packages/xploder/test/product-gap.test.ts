import { describe, expect, test } from 'vitest';

import { parseProject, parseTechRegistry } from '../src/index';
import { pick, rayBoxDistance, type Ray } from '../src/interaction/pick';
import {
  VIEW,
  LAYOUT_DEFAULTS,
  layoutProject,
  type ComponentSlab,
  type LayoutInput,
  type ProjectLayout,
  type Vec3,
} from '../src/layout';
import { resolveViewerLayoutOptions, VIEWER_LAYOUT_DEFAULTS } from '../src/look/product';
import { projectAJson, projectCJson, techRegistryJson } from './fixtures';

const GRID_STEP = 0.02;
const MIN_VISIBLE = 0.5;
const AZIMUTHS = [45, 135, 225, 315] as const;
const registry = parseTechRegistry(techRegistryJson);
const PROJECTS = [
  ['A', parseProject(projectAJson, { registry })],
  ['C', parseProject(projectCJson, { registry })],
] as const satisfies readonly (readonly [string, LayoutInput])[];

interface ProjectionBasis {
  readonly right: Vec3;
  readonly up: Vec3;
  readonly toCamera: Vec3;
}

interface ProjectedExtent {
  readonly minU: number;
  readonly maxU: number;
  readonly minV: number;
  readonly maxV: number;
}

interface GridRay {
  readonly u: number;
  readonly v: number;
  readonly ray: Ray;
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

function cameraBasis(azimuth: number): ProjectionBasis {
  const sinAzimuth = Math.sin(azimuth);
  const cosAzimuth = Math.cos(azimuth);
  const sinElevation = Math.sin(VIEW.elevation);
  const cosElevation = Math.cos(VIEW.elevation);

  return {
    right: [cosAzimuth, 0, -sinAzimuth],
    up: [-sinElevation * sinAzimuth, cosElevation, -sinElevation * cosAzimuth],
    toCamera: [cosElevation * sinAzimuth, sinElevation, cosElevation * cosAzimuth],
  };
}

function placementExtent(component: ComponentSlab, basis: ProjectionBasis): ProjectedExtent {
  let minU = Infinity;
  let maxU = -Infinity;
  let minV = Infinity;
  let maxV = -Infinity;

  for (const x of [
    component.exploded[0] - component.size[0] / 2,
    component.exploded[0] + component.size[0] / 2,
  ]) {
    for (const y of [
      component.exploded[1] - component.size[1] / 2,
      component.exploded[1] + component.size[1] / 2,
    ]) {
      for (const z of [
        component.exploded[2] - component.size[2] / 2,
        component.exploded[2] + component.size[2] / 2,
      ]) {
        const point: Vec3 = [x, y, z];
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

function componentExtent(layout: ProjectLayout, basis: ProjectionBasis): ProjectedExtent {
  return layout.components.reduce<ProjectedExtent>(
    (extent, component) => {
      const componentBounds = placementExtent(component, basis);

      return {
        minU: Math.min(extent.minU, componentBounds.minU),
        maxU: Math.max(extent.maxU, componentBounds.maxU),
        minV: Math.min(extent.minV, componentBounds.minV),
        maxV: Math.max(extent.maxV, componentBounds.maxV),
      };
    },
    { minU: Infinity, maxU: -Infinity, minV: Infinity, maxV: -Infinity },
  );
}

function gridRays(layout: ProjectLayout, basis: ProjectionBasis): readonly GridRay[] {
  const extent = componentExtent(layout, basis);
  const uSpan = extent.maxU - extent.minU;
  const vSpan = extent.maxV - extent.minV;
  const uCount = Math.max(1, Math.ceil(uSpan / GRID_STEP));
  const vCount = Math.max(1, Math.ceil(vSpan / GRID_STEP));
  const bounds = layout.bounds.exploded;
  const radius = Math.hypot(
    bounds.max[0] - bounds.min[0],
    bounds.max[1] - bounds.min[1],
    bounds.max[2] - bounds.min[2],
  );
  const camera = scale(basis.toCamera, 2 * radius);
  const direction: Vec3 = [-basis.toCamera[0], -basis.toCamera[1], -basis.toCamera[2]];
  const rays: GridRay[] = [];

  // Cell-centre rays cover the projected component extent with spacing at or below GRID_STEP.
  for (let uIndex = 0; uIndex < uCount; uIndex += 1) {
    const u = extent.minU + (uSpan * (uIndex + 0.5)) / uCount;

    for (let vIndex = 0; vIndex < vCount; vIndex += 1) {
      const v = extent.minV + (vSpan * (vIndex + 0.5)) / vCount;

      rays.push({
        u,
        v,
        ray: {
          origin: add(add(camera, scale(basis.right, u)), scale(basis.up, v)),
          direction,
        },
      });
    }
  }

  return rays;
}

function progressFor(layout: ProjectLayout): Float32Array {
  return new Float32Array(layout.layers.length + layout.components.length).fill(1);
}

function measure(
  layout: ProjectLayout,
  rays: readonly GridRay[],
  basis: ProjectionBasis,
): { readonly visible: readonly number[]; readonly full: readonly number[] } {
  const progress = progressFor(layout);
  const visible = layout.components.map(() => 0);
  const full = layout.components.map(() => 0);
  const extents = layout.components.map((component) => placementExtent(component, basis));

  for (const gridRay of rays) {
    const hit = pick(gridRay.ray, layout, progress);

    if (hit !== null) visible[hit] = (visible[hit] ?? 0) + 1;

    layout.components.forEach((component, index) => {
      const extent = extents[index];
      if (
        !extent ||
        gridRay.u < extent.minU ||
        gridRay.u > extent.maxU ||
        gridRay.v < extent.minV ||
        gridRay.v > extent.maxV
      ) {
        return;
      }

      if (rayBoxDistance(gridRay.ray, component.exploded, component.size) !== null) {
        full[index] = (full[index] ?? 0) + 1;
      }
    });
  }

  return { visible, full };
}

describe('product layout defaults', () => {
  test('uses an exploded gap of 2 without changing the layout primitive', () => {
    expect(VIEWER_LAYOUT_DEFAULTS.explodedGap).toBe(2);
    expect(resolveViewerLayoutOptions()).toStrictEqual({ explodedGap: 2 });
    expect(resolveViewerLayoutOptions({ explodedGap: 1.1 })).toStrictEqual({ explodedGap: 1.1 });
    expect(LAYOUT_DEFAULTS.explodedGap).toBe(1.1);
  });
});

describe('product gap occlusion', () => {
  test.each(PROJECTS)(
    'fixture %s keeps every component at least half visible',
    (name, project) => {
      const layout = layoutProject(project, resolveViewerLayoutOptions());

      for (const azimuthDegrees of AZIMUTHS) {
        const basis = cameraBasis((azimuthDegrees * Math.PI) / 180);
        const rays = gridRays(layout, basis);
        const { visible, full } = measure(layout, rays, basis);
        const fractions = layout.components.map((component, index) => ({
          component,
          fraction: (visible[index] ?? 0) / (full[index] ?? 0),
        }));

        if (azimuthDegrees === 45) {
          console.log(
            `Fixture ${name} at 45 degrees: ${fractions
              .map(({ component, fraction }) => `${component.id} ${(fraction * 100).toFixed(0)}%`)
              .join(' · ')}`,
          );
        }

        const worst = fractions.reduce((minimum, item) =>
          item.fraction < minimum.fraction ? item : minimum,
        );
        console.log(
          `Fixture ${name} at ${azimuthDegrees} degrees: minimum ${(worst.fraction * 100).toFixed(0)}% (${worst.component.id})`,
        );

        fractions.forEach(({ component, fraction }) => {
          expect(Number.isFinite(fraction), `Fixture ${name} ${component.id} was not sampled`).toBe(
            true,
          );
          expect(
            fraction,
            `Fixture ${name} ${component.id} at ${azimuthDegrees} degrees`,
          ).toBeGreaterThanOrEqual(MIN_VISIBLE);
        });
      }
    },
    60_000,
  );
});
