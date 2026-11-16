import { describe, expect, test } from 'vitest';

import { parseProject, parseTechRegistry, type Project } from '../src/index';
import { scrollExtent } from '../src/interaction/scroll';
import { fitZoom, layoutProject, VIEW, type ProjectLayout } from '../src/layout';
import { labelPass } from '../src/labels/pass';
import { quadsIntersect, sweepPairs, type SweepPair } from '../src/labels/sweep';
import type { LabelItem, LabelPassInput, LabelQuad } from '../src/labels/types';
import { topFaceQuad, type FaceQuad } from '../src/lettering/faces';
import { resolveViewerLayoutOptions } from '../src/look/product';
import { look } from '../src/look/tokens';
import { overlayFrame, projectPoint, type OverlayFrame, type Vec2 } from '../src/overlay/project';
import { projectAJson, projectBJson, projectCJson, techRegistryJson } from './fixtures';
// @ts-expect-error The pure Node sweep script intentionally ships without a TypeScript declaration.
import { quadsIntersect as scriptQuadsIntersect } from '../../../.specify/features/label-system/label-sweep.mjs';

const TEST_TIMEOUT_MS = 180_000;
const VIEWPORTS = [
  { width: 390, height: 844 },
  { width: 768, height: 1024 },
  { width: 1440, height: 900 },
] as const;
const ZOOM_FACTORS = [1, 1.25, 1.5625, 1.953125, 2.44140625, 3] as const;
const TURNS = [0, 1, 2, 3] as const;
const CONTENT_ROOT = new URL('../../../.specify/content/', import.meta.url);
const nodeFileSystem = (
  globalThis as typeof globalThis & {
    readonly process: {
      getBuiltinModule(id: 'node:fs'): {
        readFileSync(path: URL, encoding: 'utf8'): string;
      };
    };
  }
).process.getBuiltinModule('node:fs');

interface JsonObject {
  [key: string]: unknown;
}

function isJsonObject(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null;
}

function withoutComponentTechs(value: unknown): unknown {
  const clone: unknown = structuredClone(value);

  if (!isJsonObject(clone) || !Array.isArray(clone.layers)) return clone;

  for (const layer of clone.layers) {
    if (!isJsonObject(layer) || !Array.isArray(layer.components)) continue;

    for (const component of layer.components) {
      if (!isJsonObject(component)) continue;

      delete component.tech;
      delete component.techs;
    }
  }

  return clone;
}

function readRealProject(stem: string): Project {
  const json: unknown = JSON.parse(
    nodeFileSystem.readFileSync(new URL(`${stem}.json`, CONTENT_ROOT), 'utf8'),
  );

  return parseProject(withoutComponentTechs(json));
}

const registry = parseTechRegistry(techRegistryJson);

const PROJECTS = [
  ['fixture-a', parseProject(projectAJson, { registry })],
  ['fixture-b', parseProject(projectBJson, { registry })],
  ['fixture-c', parseProject(projectCJson, { registry })],
  ['websocket-inspector', readRealProject('websocket-inspector')],
  ['jev-toolkit', readRealProject('jev-toolkit')],
] as const satisfies readonly (readonly [string, Project])[];

interface ParityCase {
  readonly name: string;
  readonly input: LabelPassInput;
}

function shiftPoint(point: Vec2, offsetY: number): Vec2 {
  return [point[0], point[1] + offsetY];
}

function shiftFrame(frame: OverlayFrame, offsetY: number): OverlayFrame {
  return {
    layers: frame.layers.map((layer) => ({
      ...layer,
      corners: layer.corners.map((corner) => shiftPoint(corner, offsetY)) as [
        Vec2,
        Vec2,
        Vec2,
        Vec2,
      ],
    })),
    components: frame.components.map((component) => ({
      ...component,
      anchor: shiftPoint(component.anchor, offsetY),
      hull: component.hull.map((point) => shiftPoint(point, offsetY)),
    })),
  };
}

function frameExtent(frame: OverlayFrame, height: number): number {
  let top = Infinity;
  let bottom = -Infinity;

  for (const layer of frame.layers) {
    for (const point of layer.corners) {
      top = Math.min(top, point[1]);
      bottom = Math.max(bottom, point[1]);
    }
  }

  for (const component of frame.components) {
    for (const point of component.hull) {
      top = Math.min(top, point[1]);
      bottom = Math.max(bottom, point[1]);
    }
  }

  if (!Number.isFinite(top) || !Number.isFinite(bottom)) return Number.POSITIVE_INFINITY;

  return scrollExtent(top, bottom, height, VIEW.fitMargin * height);
}

function faceQuads(
  layout: ProjectLayout,
  progress: number,
  view: {
    readonly azimuth: number;
    readonly zoom: number;
    readonly width: number;
    readonly height: number;
  },
  offsetY: number,
): readonly FaceQuad[] {
  return layout.components.map((component) =>
    topFaceQuad(component, progress, (point) => shiftPoint(projectPoint(point, view), offsetY)),
  );
}

function inputFor({
  name,
  project,
  layout,
  viewport,
  zoomFactor,
  azimuth,
  target,
  offsetY,
  extentPx,
}: {
  readonly name: string;
  readonly project: Project;
  readonly layout: ProjectLayout;
  readonly viewport: { readonly width: number; readonly height: number };
  readonly zoomFactor: number;
  readonly azimuth: number;
  readonly target: 'imploded' | 'exploded';
  readonly offsetY: number;
  readonly extentPx: number | null;
}): ParityCase {
  const progress = target === 'imploded' ? 0 : 1;
  const view = {
    azimuth,
    zoom: fitZoom(layout.bounds[target], viewport) * zoomFactor,
    width: viewport.width,
    height: viewport.height,
  };
  const frame = shiftFrame(overlayFrame(layout, progress, view), offsetY);
  const facesValue = faceQuads(layout, progress, view, offsetY);

  return {
    name,
    input: {
      frame,
      faces: facesValue,
      viewport,
      offsetY,
      extentPx,
      zoomFactor,
      target,
      layout,
      project,
      look,
    },
  };
}

function matrixCases(): readonly ParityCase[] {
  const cases: ParityCase[] = [];
  let caseIndex = 0;

  for (const [projectName, project] of PROJECTS) {
    const layout = layoutProject(project, resolveViewerLayoutOptions());

    for (const viewport of VIEWPORTS) {
      for (const zoomFactor of ZOOM_FACTORS) {
        for (const turn of TURNS) {
          const azimuth = VIEW.baseAzimuth + turn * VIEW.snap;

          for (const target of ['imploded', 'exploded'] as const) {
            const progress = target === 'imploded' ? 0 : 1;
            const view = {
              azimuth,
              zoom: fitZoom(layout.bounds[target], viewport) * zoomFactor,
              width: viewport.width,
              height: viewport.height,
            };
            const extent = frameExtent(overlayFrame(layout, progress, view), viewport.height);
            const offsets = extent <= 0 ? [0] : [0, Math.round(extent / 2), extent];

            for (const offsetY of offsets) {
              const extentPx = caseIndex % 2 === 0 ? null : extent;
              const name = `${projectName} ${viewport.width}x${viewport.height} z${zoomFactor} t${turn} ${target} o${offsetY}`;

              cases.push(
                inputFor({
                  name,
                  project,
                  layout,
                  viewport,
                  zoomFactor,
                  azimuth,
                  target,
                  offsetY,
                  extentPx,
                }),
              );
              caseIndex += 1;
            }
          }
        }
      }
    }
  }

  return cases;
}

function box(left: number, top: number, right: number, bottom: number): LabelQuad {
  return [
    [left, top],
    [right, top],
    [right, bottom],
    [left, bottom],
  ];
}

function translateQuad(quad: LabelQuad, dx: number, dy: number): LabelQuad {
  return quad.map(([x, y]) => [x + dx, y + dy]) as unknown as LabelQuad;
}

function pairKey(pair: SweepPair): string {
  return [pair.a.key, pair.b.key].sort().join('|');
}

function mulberry32(seed: number): () => number {
  let value = seed >>> 0;

  return () => {
    value = (value + 0x6d2b79f5) | 0;
    let mixed = Math.imul(value ^ (value >>> 15), value | 1);
    mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61);
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4_294_967_296;
  };
}

function randomQuad(random: () => number): LabelQuad {
  const centerX = random() * 2_000 - 1_000;
  const centerY = random() * 2_000 - 1_000;
  if (random() < 0.02) return box(centerX, centerY, centerX, centerY);

  const width = 0.01 + random() * 200;
  const height = 0.01 + random() * 200;
  const angle = random() * Math.PI * 2;
  const edgeX = Math.cos(angle) * width;
  const edgeY = Math.sin(angle) * width;
  const sideX = -Math.sin(angle) * height;
  const sideY = Math.cos(angle) * height;
  const originX = centerX - (edgeX + sideX) / 2;
  const originY = centerY - (edgeY + sideY) / 2;

  return [
    [originX, originY],
    [originX + edgeX, originY + edgeY],
    [originX + edgeX + sideX, originY + edgeY + sideY],
    [originX + sideX, originY + sideY],
  ];
}

function modelCensus() {
  const cases = matrixCases();
  const pairKinds = new Map<string, number>();
  let casesWithPairs = 0;
  let pairCount = 0;

  for (const parityCase of cases) {
    const labels = labelPass(parityCase.input).labels;
    const kinds = new Map(labels.map((label) => [label.key, label.kind]));
    const pairs = sweepPairs(labels);
    if (pairs.length > 0) casesWithPairs += 1;
    pairCount += pairs.length;

    for (const pair of pairs) {
      const kind = `${kinds.get(pair.a.key) ?? 'unknown'} × ${kinds.get(pair.b.key) ?? 'unknown'}`;
      pairKinds.set(kind, (pairKinds.get(kind) ?? 0) + 1);
    }
  }

  return { cases: cases.length, casesWithPairs, pairCount, pairKinds };
}

const MODEL_CENSUS = modelCensus();

describe('label sweep', () => {
  test('quadsIntersect predicate table', () => {
    const original = box(0, 0, 10, 10);

    expect(quadsIntersect(original, box(5, 5, 15, 15))).toBe(true);
    expect(quadsIntersect(original, box(10, 0, 20, 10))).toBe(false);
    expect(quadsIntersect(original, box(10 - 1 / 64, 0, 20, 10))).toBe(false);
    expect(quadsIntersect(original, box(10 - 1 / 32, 0, 20, 10))).toBe(true);
    expect(quadsIntersect(original, box(2, 2, 8, 8))).toBe(true);
    expect(
      quadsIntersect(original, [
        [4, 5],
        [5, 4],
        [6, 5],
        [5, 6],
      ]),
    ).toBe(true);
    expect(
      quadsIntersect(original, [
        [20, 25],
        [21, 24],
        [22, 25],
        [21, 26],
      ]),
    ).toBe(false);
    expect(quadsIntersect(original, box(5, 5, 5, 5))).toBe(false);
  });

  test('label-sweep.mjs predicate agrees on 10,000 random quad pairs', () => {
    const random = mulberry32(0x5117e1a);
    const mismatches: number[] = [];

    for (let index = 0; index < 10_000; index += 1) {
      const a = randomQuad(random);
      const b = randomQuad(random);
      if (scriptQuadsIntersect(a, b) !== quadsIntersect(a, b)) mismatches.push(index);
    }

    expect(mismatches).toEqual([]);
  });

  test('seeded unit control reports the shifted copy and not the touching copy', () => {
    const fixtureA = PROJECTS.find(([name]) => name === 'fixture-a')?.[1];
    if (fixtureA === undefined) throw new Error('fixture-a missing');
    const layout = layoutProject(fixtureA, resolveViewerLayoutOptions());
    const parityCase = inputFor({
      name: 'fixture-a 1440x900 z3 t0 exploded o0',
      project: fixtureA,
      layout,
      viewport: { width: 1440, height: 900 },
      zoomFactor: 3,
      azimuth: VIEW.baseAzimuth,
      target: 'exploded',
      offsetY: 0,
      extentPx: null,
    });
    const labels = labelPass(parityCase.input).labels;
    const before = sweepPairs(labels);
    const firstVisible = labels.find((label) => label.visible);
    if (firstVisible === undefined) throw new Error('first visible label missing');

    const seeded: LabelItem = {
      ...firstVisible,
      key: 'seed:copy',
      quad: translateQuad(firstVisible.quad, 1, 1),
    };
    const after = sweepPairs([...labels, seeded]);
    const seedPairs = after.filter(
      (pair) => pair.a.key === 'seed:copy' || pair.b.key === 'seed:copy',
    );
    const nonSeedPairs = after.filter(
      (pair) => pair.a.key !== 'seed:copy' && pair.b.key !== 'seed:copy',
    );

    expect(seedPairs.length).toBeGreaterThan(0);
    expect(after.length).toBeGreaterThanOrEqual(before.length + 1);
    expect(nonSeedPairs.map(pairKey).sort()).toEqual(before.map(pairKey).sort());

    const [first, second] = firstVisible.quad;
    if (first === undefined || second === undefined) throw new Error('label quad missing');
    const touching: LabelItem = {
      ...firstVisible,
      key: 'seed:touching',
      quad: translateQuad(firstVisible.quad, second[0] - first[0], second[1] - first[1]),
    };
    const touchingPairs = sweepPairs([...labels, touching]);
    const touchingSeedPairs = touchingPairs.filter(
      (pair) => pair.a.key === 'seed:touching' || pair.b.key === 'seed:touching',
    );

    expect(touchingSeedPairs).toEqual([]);
    expect(touchingPairs).toHaveLength(before.length);
  });

  test(
    'model census',
    () => {
      console.log(
        `model census: ${MODEL_CENSUS.cases} cases, ${MODEL_CENSUS.casesWithPairs} with intersections, ${MODEL_CENSUS.pairCount} pairs`,
      );
      for (const [kind, count] of [...MODEL_CENSUS.pairKinds].sort(
        (left, right) => right[1] - left[1],
      )) {
        console.log(`model census pair kind: ${kind} = ${count}`);
      }
      if (MODEL_CENSUS.pairKinds.size === 0) console.log('model census pair kinds: none');
      expect(MODEL_CENSUS.cases).toBeGreaterThan(0);
    },
    TEST_TIMEOUT_MS,
  );

  test(
    'AC1 model sweep: 0 intersections',
    () => {
      expect(MODEL_CENSUS.pairCount).toBe(0);
    },
    TEST_TIMEOUT_MS,
  );
});
