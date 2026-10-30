import { describe, expect, test } from 'vitest';

import { parseProject, parseTechRegistry } from '../src/index';
import {
  fitZoom,
  LAYOUT_DEFAULTS,
  layoutProject,
  VIEW,
  type Box,
  type LayoutInput,
  type ProjectLayout,
  type SlabPlacement,
} from '../src/layout/index';
import { projectAJson, projectBJson, techRegistryJson } from './fixtures';

const registry = parseTechRegistry(techRegistryJson);
const projectA = parseProject(projectAJson, { registry });
const projectB = parseProject(projectBJson, { registry });
const EPSILON = 1e-9;
const VIEWPORT = { width: 390, height: 844 };

function syntheticProject(layerCount: number, componentCount: number): LayoutInput {
  return {
    layers: Array.from({ length: layerCount }, (_, layerIndex) => ({
      id: `layer-${layerIndex}`,
      components: Array.from({ length: componentCount }, (_, componentIndex) => ({
        id: `component-${layerIndex}-${componentIndex}`,
      })),
    })),
  };
}

function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === 'object' && !Object.isFrozen(value)) {
    for (const key of Reflect.ownKeys(value)) deepFreeze(Reflect.get(value, key));
    Object.freeze(value);
  }

  return value;
}

function expectDeepFrozen(value: unknown): void {
  if (value === null || typeof value !== 'object') return;

  expect(Object.isFrozen(value)).toBe(true);
  for (const key of Reflect.ownKeys(value)) expectDeepFrozen(Reflect.get(value, key));
}

function placementBox(placement: SlabPlacement, state: 'imploded' | 'exploded'): Box {
  const center = placement[state];

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

function overlaps(a: Box, b: Box): boolean {
  return (
    Math.min(a.max[0], b.max[0]) - Math.max(a.min[0], b.min[0]) > EPSILON &&
    Math.min(a.max[1], b.max[1]) - Math.max(a.min[1], b.min[1]) > EPSILON &&
    Math.min(a.max[2], b.max[2]) - Math.max(a.min[2], b.min[2]) > EPSILON
  );
}

function projectedHalfExtents(bounds: Box, azimuth: number): { u: number; v: number } {
  const sinAzimuth = Math.sin(azimuth);
  const cosAzimuth = Math.cos(azimuth);
  const sinElevation = Math.sin(VIEW.elevation);
  const cosElevation = Math.cos(VIEW.elevation);
  const right = [cosAzimuth, 0, -sinAzimuth] as const;
  const up = [-sinElevation * sinAzimuth, cosElevation, -sinElevation * cosAzimuth] as const;
  let u = 0;
  let v = 0;

  for (const x of [bounds.min[0], bounds.max[0]]) {
    for (const y of [bounds.min[1], bounds.max[1]]) {
      for (const z of [bounds.min[2], bounds.max[2]]) {
        u = Math.max(u, Math.abs(x * right[0] + y * right[1] + z * right[2]));
        v = Math.max(v, Math.abs(x * up[0] + y * up[1] + z * up[2]));
      }
    }
  }

  return { u, v };
}

function fitsAtZoom(bounds: Box, viewport: { width: number; height: number }, zoom: number) {
  const halfWidth = (viewport.width * (1 - 2 * VIEW.fitMargin)) / 2;
  const halfHeight = (viewport.height * (1 - 2 * VIEW.fitMargin)) / 2;

  return Array.from({ length: 4 }, (_, step) => {
    const { u, v } = projectedHalfExtents(bounds, VIEW.baseAzimuth + step * VIEW.snap);
    return u * zoom <= halfWidth + EPSILON && v * zoom <= halfHeight + EPSILON;
  });
}

describe('layoutProject', () => {
  test('is deterministic for repeated calls and a structured clone', () => {
    const layout = layoutProject(projectA);

    expect(layoutProject(projectA)).toStrictEqual(layout);
    expect(layoutProject(structuredClone(projectA))).toStrictEqual(layout);
  });

  test('matches the fixture A golden layout', () => {
    expect(layoutProject(projectA)).toMatchSnapshot();
  });

  test('matches the fixture B golden layout', () => {
    expect(layoutProject(projectB)).toMatchSnapshot();
  });

  test('ignores names, descriptions, techs, flows, and story', () => {
    const expected = layoutProject(projectA);
    const changed = structuredClone(projectA);
    const firstLayer = changed.layers[0];
    const firstComponent = firstLayer?.components[0];
    const firstFlow = changed.flows[0];

    if (!firstLayer || !firstComponent || !firstFlow) throw new Error('Fixture shape changed');

    changed.meta.name = 'A different name';
    changed.meta.summary = 'A different summary';
    changed.story.headline = 'A different headline';
    changed.story.problem = 'A different problem';
    firstLayer.name = 'A different layer';
    firstLayer.description = 'A different layer description';
    firstComponent.name = 'A different component';
    firstComponent.description = 'A different component description';
    firstComponent.techs.push('not-in-the-registry');
    firstFlow.label = 'A different flow';
    firstFlow.description = 'A different flow description';

    expect(layoutProject(changed)).toStrictEqual(expected);
  });

  test('accepts a deep-frozen project and returns a deep-frozen layout', () => {
    const frozen = deepFreeze(structuredClone(projectA));
    const layout = layoutProject(frozen);

    expectDeepFrozen(layout);
  });

  test('sweeps layer and component counts within the placement contract', () => {
    for (let layerCount = 1; layerCount <= 12; layerCount += 1) {
      for (let componentCount = 0; componentCount <= 16; componentCount += 1) {
        const label = `${layerCount} layers x ${componentCount} components`;
        const layout = layoutProject(syntheticProject(layerCount, componentCount));

        for (const state of ['imploded', 'exploded'] as const) {
          const bounds = layout.bounds[state];

          expect(
            Math.abs(bounds.min[1] + bounds.max[1]),
            `${label} ${state} centered`,
          ).toBeLessThan(EPSILON);

          const layerBoxes = layout.layers.map((layer) => placementBox(layer, state));
          const componentBoxes = layout.components.map((component) =>
            placementBox(component, state),
          );
          const allBoxes = [...layerBoxes, ...componentBoxes];

          for (let left = 0; left < allBoxes.length; left += 1) {
            for (let right = left + 1; right < allBoxes.length; right += 1) {
              const first = allBoxes[left];
              const second = allBoxes[right];
              if (first && second && overlaps(first, second)) {
                throw new Error(`${label} ${state} slabs overlap at ${left}/${right}`);
              }
            }
          }
        }

        for (let layerIndex = 0; layerIndex < layout.layers.length; layerIndex += 1) {
          const layer = layout.layers[layerIndex];
          if (!layer) continue;

          const inLayer = layout.components.filter(
            (component) => component.layerIndex === layerIndex,
          );
          const slabBox = placementBox(layer, 'imploded');

          for (let left = 0; left < inLayer.length; left += 1) {
            const first = inLayer[left];
            const firstBox = first ? placementBox(first, 'imploded') : undefined;
            if (!first || !firstBox) continue;

            expect(firstBox.min[0], `${label} component ${first.id} x min`).toBeGreaterThanOrEqual(
              slabBox.min[0] - EPSILON,
            );
            expect(firstBox.max[0], `${label} component ${first.id} x max`).toBeLessThanOrEqual(
              slabBox.max[0] + EPSILON,
            );
            expect(firstBox.min[2], `${label} component ${first.id} z min`).toBeGreaterThanOrEqual(
              slabBox.min[2] - EPSILON,
            );
            expect(firstBox.max[2], `${label} component ${first.id} z max`).toBeLessThanOrEqual(
              slabBox.max[2] + EPSILON,
            );

            for (let right = left + 1; right < inLayer.length; right += 1) {
              const second = inLayer[right];
              if (second && overlaps(firstBox, placementBox(second, 'imploded'))) {
                throw new Error(`${label} components ${first.id}/${second.id} overlap`);
              }
            }
          }
        }

        for (let layerIndex = 0; layerIndex + 1 < layout.layers.length; layerIndex += 1) {
          const current = layout.layers[layerIndex];
          const next = layout.layers[layerIndex + 1];
          if (!current || !next) continue;

          const implodedPitch = current.imploded[1] - next.imploded[1];
          const explodedPitch = current.exploded[1] - next.exploded[1];

          expect(explodedPitch, `${label} exploded pitch`).toBeGreaterThan(implodedPitch);
          expect(implodedPitch, `${label} imploded pitch`).toBeCloseTo(
            LAYOUT_DEFAULTS.slabThickness + LAYOUT_DEFAULTS.componentThickness,
            12,
          );
          expect(explodedPitch, `${label} exploded pitch value`).toBeCloseTo(
            LAYOUT_DEFAULTS.slabThickness +
              LAYOUT_DEFAULTS.componentThickness +
              LAYOUT_DEFAULTS.explodedGap,
            12,
          );
        }

        for (const state of ['imploded', 'exploded'] as const) {
          const topLayer = layout.layers[0];
          const highest = Math.max(...layout.layers.map((layer) => layer[state][1]));
          expect(topLayer?.[state][1], `${label} ${state} layer 0 is top`).toBe(highest);
        }
      }
    }
  });

  test('derives the shared footprint from the busiest layer', () => {
    expect(layoutProject(syntheticProject(1, 12)).footprint).toMatchObject({ cols: 4, rows: 3 });
    expect(layoutProject(syntheticProject(1, 13)).footprint).toMatchObject({ cols: 4, rows: 4 });
  });
});

describe('fitZoom', () => {
  test.each([
    ['fixture A', () => layoutProject(projectA).bounds.exploded],
    ['fixture B', () => layoutProject(projectB).bounds.exploded],
    ['12 x 16 sweep case', () => layoutProject(syntheticProject(12, 16)).bounds.exploded],
  ] as const)('fits %s at all azimuths and is tight', (_name, boundsFor) => {
    const bounds = boundsFor();
    const zoom = fitZoom(bounds, VIEWPORT);

    expect(zoom).toBeGreaterThan(0);
    expect(fitsAtZoom(bounds, VIEWPORT, zoom).every(Boolean)).toBe(true);
    expect(fitsAtZoom(bounds, VIEWPORT, zoom * 1.01).some((fits) => !fits)).toBe(true);
  });
});

function assertSlotOrder(layout: ProjectLayout, expected: readonly string[]): void {
  expect(layout.layers.map((layer) => layer.id)).toEqual(expected);
}

test('fixture A layer order is top to bottom in data order', () => {
  assertSlotOrder(layoutProject(projectA), ['ui', 'state', 'data', 'platform']);
});
