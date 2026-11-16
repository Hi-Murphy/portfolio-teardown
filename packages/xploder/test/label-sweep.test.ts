import { describe, expect, test } from 'vitest';

import { parseProject, parseTechRegistry, type Project } from '../src/index';
import { scrollExtent } from '../src/interaction/scroll';
import { fitZoom, layoutProject, VIEW, type ProjectLayout } from '../src/layout';
import { compactColumnTextScale } from '../src/lettering/column';
import { LETTERING_LOOK } from '../src/lettering/look';
import { textWidth } from '../src/lettering/place';
import { labelPass } from '../src/labels/pass';
import { quadsIntersect, sweepPairs, type SweepPair } from '../src/labels/sweep';
import type { LabelItem, LabelKind, LabelPassInput, LabelQuad } from '../src/labels/types';
import { topFaceQuad, type FaceQuad } from '../src/lettering/faces';
import { resolveViewerLayoutOptions } from '../src/look/product';
import { look } from '../src/look/tokens';
import type { OverlayLabel, OverlayModel } from '../src/overlay/model';
import { overlayFrame, projectPoint, type OverlayFrame, type Vec2 } from '../src/overlay/project';
import { projectAJson, projectBJson, projectCJson, techRegistryJson } from './fixtures';
import { oracleLettering, oracleOverlay } from './oracles/labels-s15';
// @ts-expect-error The pure Node sweep script intentionally ships without a TypeScript declaration.
import { quadsIntersect as scriptQuadsIntersect } from '../../../.specify/features/label-system/label-sweep.mjs';

const TEST_TIMEOUT_MS = 180_000;
const FIXTURE_CANVASES = [
  { page: '390x844', width: 356, height: 504.390625 },
  { page: '768x1024', width: 702, height: 612.390625 },
  { page: '1440x900', width: 1150, height: 538 },
] as const;
const PROJECT_CANVASES = [
  { page: '390x844', width: 348, height: 588.796875 },
  { page: '768x1024', width: 702, height: 702 },
  { page: '1440x900', width: 1086, height: 628 },
] as const;
const HERO_CANVASES = [
  { page: '390x844', width: 350, height: 256 },
  { page: '768x1024', width: 480, height: 336 },
  { page: '1440x900', width: 907.203125, height: 702 },
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

const CORPUS = [
  ...(['fixture-a', 'fixture-b', 'fixture-c'] as const).map((name) => ({
    name,
    project: PROJECTS.find(([candidate]) => candidate === name)?.[1],
    canvases: FIXTURE_CANVASES,
  })),
  ...(['websocket-inspector', 'jev-toolkit'] as const).map((name) => ({
    name,
    project: PROJECTS.find(([candidate]) => candidate === name)?.[1],
    canvases: PROJECT_CANVASES,
  })),
  {
    name: 'websocket-inspector',
    project: PROJECTS.find(([candidate]) => candidate === 'websocket-inspector')?.[1],
    canvases: HERO_CANVASES,
  },
] as const;

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

  for (const { name: projectName, project, canvases } of CORPUS) {
    if (project === undefined) throw new Error(`Missing project ${projectName}`);
    const layout = layoutProject(project, resolveViewerLayoutOptions());

    for (const canvas of canvases) {
      const viewport = { width: canvas.width, height: canvas.height };

      for (const zoomFactor of ZOOM_FACTORS) {
        for (const turn of TURNS) {
          const azimuth = VIEW.baseAzimuth + turn * VIEW.snap;
          const target = 'exploded';
          const view = {
            azimuth,
            zoom: fitZoom(layout.bounds[target], viewport) * zoomFactor,
            width: viewport.width,
            height: viewport.height,
          };
          const extent = frameExtent(overlayFrame(layout, 1, view), viewport.height);
          const offsets = extent <= 0 ? [0] : [0, Math.round(extent / 2), extent];

          for (const offsetY of offsets) {
            const name = `${projectName} page ${canvas.page} canvas ${viewport.width}x${viewport.height} z${zoomFactor} t${turn} exploded o${offsetY}`;

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
                extentPx: extent,
              }),
            );
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

function axisQuad(x: number, y: number, w: number, h: number): LabelQuad {
  return box(x, y, x + w, y + h);
}

function overlayKind(label: OverlayLabel, mode: OverlayModel['calloutMode']): LabelKind | null {
  if (mode === 'columns') {
    if (label.key === 'dimension:stack') return 'column-rail';
    if (label.key === 'dimension:footprint') return 'column-footprint';
    if (label.kind === 'layer') return 'column-layer';
    if (label.kind === 'part') return 'column-part';
    return null;
  }

  if (label.kind === 'layer') return 'callout-layer';
  if (label.kind === 'part' || label.kind === 'tag') return 'tag';
  if (label.kind === 'dimension') return 'dimension';

  return null;
}

function priority(kind: LabelKind): LabelItem['priority'] {
  if (kind === 'titleblock') return 0;
  if (kind.startsWith('column-')) return 1;
  if (kind === 'plate') return 2;
  if (kind === 'face') return 3;
  if (kind === 'compact-row') return 4;
  if (kind === 'mark') return 5;

  return 6;
}

function stageALabels(input: LabelPassInput): readonly LabelItem[] {
  const overlay = oracleOverlay(input);
  const lettering = oracleLettering(input);
  const labels: LabelItem[] = [];

  if (overlay.titleBlock !== null) {
    labels.push({
      key: 'titleblock',
      kind: 'titleblock',
      quad: axisQuad(
        overlay.titleBlock.x,
        overlay.titleBlock.y,
        overlay.titleBlock.w,
        overlay.titleBlock.h,
      ),
      priority: 0,
      visible: overlay.shown,
      source: 'overlay',
    });
  }

  for (const label of overlay.labels) {
    const kind = overlayKind(label, overlay.calloutMode);
    if (kind === null) continue;
    const plateHidesLayer =
      label.key.startsWith('layer:') &&
      lettering?.layersShown === true &&
      lettering.layerLabels.some(
        (candidate) => candidate.kind === 'face' && `layer:${candidate.id}` === label.key,
      );
    const tagHidesPart = label.key.startsWith('part:') && overlay.calloutMode === 'tags';

    labels.push({
      key: label.key,
      kind,
      quad: axisQuad(label.x, label.y, label.w, label.h),
      priority: priority(kind),
      visible: !plateHidesLayer && !tagHidesPart,
      source: 'overlay',
    });
  }

  if (lettering === null) return labels;

  const visible = input.target === 'exploded';

  for (const item of lettering.items) {
    labels.push({
      key: `part:${item.id}`,
      kind: item.lettering.kind,
      quad:
        item.lettering.kind === 'face'
          ? item.lettering.screen
          : [
              [item.lettering.matrix[4], item.lettering.matrix[5]],
              [
                item.lettering.matrix[4] + item.lettering.box.w * item.lettering.matrix[0],
                item.lettering.matrix[5] + item.lettering.box.w * item.lettering.matrix[1],
              ],
              [
                item.lettering.matrix[4] +
                  item.lettering.box.w * item.lettering.matrix[0] +
                  item.lettering.box.h * item.lettering.matrix[2],
                item.lettering.matrix[5] +
                  item.lettering.box.w * item.lettering.matrix[1] +
                  item.lettering.box.h * item.lettering.matrix[3],
              ],
              [
                item.lettering.matrix[4] + item.lettering.box.h * item.lettering.matrix[2],
                item.lettering.matrix[5] + item.lettering.box.h * item.lettering.matrix[3],
              ],
            ],
      priority: priority(item.lettering.kind),
      visible,
      source: 'lettering',
    });
  }

  for (const label of lettering.layerLabels) {
    if (label.kind !== 'face') continue;
    labels.push({
      key: `layer:${label.id}`,
      kind: 'plate',
      quad: label.screen,
      priority: 2,
      visible,
      source: 'lettering',
    });
  }

  if (lettering.column !== null) {
    for (const row of lettering.column.rows) {
      const rowWidth = Math.max(
        0,
        input.viewport.width - LETTERING_LOOK.columnInsetPx - lettering.column.x,
      );
      const maxTextWidth = Math.max(
        ...row.lines.map((line) => textWidth(line, LETTERING_LOOK.compactColumnPx, LETTERING_LOOK)),
      );
      const scale = compactColumnTextScale(row.lines, rowWidth, LETTERING_LOOK);

      labels.push({
        key: `part:${row.id}`,
        kind: 'compact-row',
        quad: axisQuad(lettering.column.x, row.y, Math.min(rowWidth, maxTextWidth) * scale, row.h),
        priority: 4,
        visible,
        source: 'lettering',
      });
    }
  }

  return labels;
}

interface Census {
  readonly cases: readonly ParityCase[];
  readonly labels: ReadonlyMap<string, readonly LabelItem[]>;
  readonly pairs: ReadonlyMap<string, readonly SweepPair[]>;
  readonly casesWithPairs: number;
  readonly pairCount: number;
  readonly pairKinds: ReadonlyMap<string, number>;
  readonly guarded: number;
  readonly guardedByCase: ReadonlyMap<string, number>;
}

function census(
  cases: readonly ParityCase[],
  run: (input: LabelPassInput, name: string) => { labels: readonly LabelItem[]; guarded: number },
): Census {
  const pairKindsCount = new Map<string, number>();
  const pairsByCase = new Map<string, readonly SweepPair[]>();
  const labelsByCase = new Map<string, readonly LabelItem[]>();
  const guardedByCase = new Map<string, number>();
  let casesWithPairs = 0;
  let pairCount = 0;
  let guarded = 0;

  for (const parityCase of cases) {
    const result = run(parityCase.input, parityCase.name);
    const labels = result.labels;
    const pairs = sweepPairs(labels);
    labelsByCase.set(parityCase.name, labels);
    pairsByCase.set(parityCase.name, pairs);
    guardedByCase.set(parityCase.name, result.guarded);
    guarded += result.guarded;
    if (pairs.length > 0) casesWithPairs += 1;
    pairCount += pairs.length;

    for (const pair of pairs) {
      const kind = pairKinds(labels, pair).join(' × ');
      pairKindsCount.set(kind, (pairKindsCount.get(kind) ?? 0) + 1);
    }
  }

  return {
    cases,
    labels: labelsByCase,
    pairs: pairsByCase,
    casesWithPairs,
    pairCount,
    pairKinds: pairKindsCount,
    guarded,
    guardedByCase,
  };
}

const CASES = matrixCases();
const STAGE_A_CENSUS = census(CASES, (input) => ({ labels: stageALabels(input), guarded: 0 }));
const GATED_RESULTS = new Map<string, ReturnType<typeof labelPass>>();
const GATED_CENSUS = census(CASES, (input, name) => {
  const result = labelPass(input);
  GATED_RESULTS.set(name, result);
  return {
    labels: result.labels,
    guarded: (result as typeof result & { guarded?: number }).guarded ?? -1,
  };
});

function caseNamed(name: string): ParityCase {
  const parityCase = CASES.find((candidate) => candidate.name === name);
  if (parityCase === undefined) throw new Error(`Missing corpus case ${name}`);
  return parityCase;
}

function labelKindAt(labels: readonly LabelItem[], key: string, quad: LabelQuad): LabelKind {
  const label = labels.find(
    (candidate) => candidate.visible && candidate.key === key && candidate.quad === quad,
  );
  if (label === undefined) throw new Error(`Missing label ${key}`);
  return label.kind;
}

function pairKinds(labels: readonly LabelItem[], pair: SweepPair): readonly LabelKind[] {
  return [
    labelKindAt(labels, pair.a.key, pair.a.quad),
    labelKindAt(labels, pair.b.key, pair.b.quad),
  ];
}

function describeValue(value: unknown): string {
  if (typeof value === 'number') {
    if (Object.is(value, -0)) return '-0';
    if (Number.isNaN(value)) return 'NaN';
    return String(value);
  }
  if (typeof value === 'string') return JSON.stringify(value);
  if (typeof value === 'undefined') return 'undefined';
  if (value === null) return 'null';
  if (Array.isArray(value)) return `array(${value.length})`;
  if (typeof value === 'object') return Object.prototype.toString.call(value);
  return String(value);
}

function compareValues(
  actual: unknown,
  expected: unknown,
  path: string,
  differences: string[],
): void {
  if (typeof actual === 'number' || typeof expected === 'number') {
    if (
      typeof actual !== 'number' ||
      typeof expected !== 'number' ||
      !Object.is(actual, expected)
    ) {
      differences.push(`${path}: ${describeValue(actual)} !== ${describeValue(expected)}`);
    }
    return;
  }

  if (
    actual === null ||
    expected === null ||
    typeof actual !== 'object' ||
    typeof expected !== 'object'
  ) {
    if (!Object.is(actual, expected)) {
      differences.push(`${path}: ${describeValue(actual)} !== ${describeValue(expected)}`);
    }
    return;
  }

  if (Array.isArray(actual) || Array.isArray(expected)) {
    if (!Array.isArray(actual) || !Array.isArray(expected)) {
      differences.push(`${path}: ${describeValue(actual)} !== ${describeValue(expected)}`);
      return;
    }
    if (actual.length !== expected.length) {
      differences.push(`${path}.length: ${actual.length} !== ${expected.length}`);
    }
    const actualKeys = Object.keys(actual).sort();
    const expectedKeys = Object.keys(expected).sort();
    if (actualKeys.join('\u0000') !== expectedKeys.join('\u0000')) {
      differences.push(`${path} keys: [${actualKeys.join(',')}] !== [${expectedKeys.join(',')}]`);
    }
    for (let index = 0; index < Math.min(actual.length, expected.length); index += 1) {
      compareValues(actual[index], expected[index], `${path}[${index}]`, differences);
    }
    return;
  }

  if (Object.getPrototypeOf(actual) !== Object.getPrototypeOf(expected)) {
    differences.push(`${path}: prototype differs`);
    return;
  }
  const actualRecord = actual as Readonly<Record<string, unknown>>;
  const expectedRecord = expected as Readonly<Record<string, unknown>>;
  const keys = [...new Set([...Object.keys(actualRecord), ...Object.keys(expectedRecord)])].sort();
  for (const key of keys) {
    const childPath = `${path}.${key}`;
    if (!Object.hasOwn(actualRecord, key)) {
      differences.push(`${childPath}: <missing> !== ${describeValue(expectedRecord[key])}`);
    } else if (!Object.hasOwn(expectedRecord, key)) {
      differences.push(`${childPath}: ${describeValue(actualRecord[key])} !== <missing>`);
    } else {
      compareValues(actualRecord[key], expectedRecord[key], childPath, differences);
    }
  }
}

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
        `model census (Stage A): ${STAGE_A_CENSUS.cases.length} cases, ${STAGE_A_CENSUS.casesWithPairs} with intersections, ${STAGE_A_CENSUS.pairCount} pairs`,
      );
      for (const [kind, count] of [...STAGE_A_CENSUS.pairKinds].sort(
        (left, right) => right[1] - left[1],
      )) {
        console.log(`model census (Stage A) pair kind: ${kind} = ${count}`);
      }
      console.log(
        `model census (gated): ${GATED_CENSUS.cases.length} cases, ${GATED_CENSUS.casesWithPairs} with intersections, ${GATED_CENSUS.pairCount} pairs, guarded ${GATED_CENSUS.guarded}`,
      );
      expect(STAGE_A_CENSUS.cases.length).toBeGreaterThan(0);
      expect(STAGE_A_CENSUS.pairCount).toBeGreaterThan(0);

      for (const turn of [1, 3]) {
        const name = `fixture-c page 390x844 canvas 356x504.390625 z1 t${turn} exploded o0`;
        const labels = STAGE_A_CENSUS.labels.get(name);
        const pairs = STAGE_A_CENSUS.pairs.get(name);
        if (labels === undefined || pairs === undefined) throw new Error(`Missing ${name}`);
        expect(
          pairs.some((pair) => {
            const kinds = pairKinds(labels, pair);
            return kinds.includes('mark') && kinds.includes('face');
          }),
          name,
        ).toBe(true);
      }

      const heroName = 'websocket-inspector page 768x1024 canvas 480x336 z1 t0 exploded o0';
      const heroPairs = STAGE_A_CENSUS.pairs.get(heroName);
      if (heroPairs === undefined) throw new Error(`Missing ${heroName}`);
      expect(
        heroPairs.some(
          (pair) =>
            [pair.a.key, pair.b.key].sort().join('|') === 'dimension:footprint|part:stream-adapter',
        ),
        heroName,
      ).toBe(true);
    },
    TEST_TIMEOUT_MS,
  );

  test(
    'AC1 model sweep: 0 intersections and 0 guarded',
    () => {
      expect(GATED_CENSUS.pairCount).toBe(0);
      expect(GATED_CENSUS.casesWithPairs).toBe(0);
      expect(GATED_CENSUS.guarded).toBe(0);
      expect([...GATED_CENSUS.guardedByCase].filter(([, guarded]) => guarded !== 0)).toEqual([]);
    },
    TEST_TIMEOUT_MS,
  );

  test(
    'AC2 by construction: no Stage A pair is bit-identical to S15',
    () => {
      const differences: string[] = [];

      for (const parityCase of CASES) {
        if ((STAGE_A_CENSUS.pairs.get(parityCase.name) ?? []).length > 0) continue;
        const result = GATED_RESULTS.get(parityCase.name);
        if (result === undefined) throw new Error(`Missing gated result ${parityCase.name}`);
        compareValues(result.overlay, oracleOverlay(parityCase.input), 'overlay', differences);
        compareValues(
          result.lettering,
          oracleLettering(parityCase.input),
          'lettering',
          differences,
        );
      }

      expect(differences.slice(0, 50)).toEqual([]);
    },
    TEST_TIMEOUT_MS,
  );

  test(
    'seeded obstacle-blind overlay label is resolved by the gate',
    () => {
      const parityCase =
        CASES.find((candidate) => {
          const labels = STAGE_A_CENSUS.labels.get(candidate.name) ?? [];
          return (
            (STAGE_A_CENSUS.pairs.get(candidate.name) ?? []).length === 0 &&
            labels.some((label) => label.visible && label.kind === 'mark')
          );
        }) ?? caseNamed('fixture-a page 390x844 canvas 356x504.390625 z1 t0 exploded o0');
      const base = labelPass(parityCase.input);
      const mark = base.labels.find((label) => label.visible && label.kind === 'mark');
      if (mark === undefined) throw new Error('visible mark missing');
      const xs = mark.quad.map(([x]) => x);
      const ys = mark.quad.map(([, y]) => y);
      const left = Math.min(...xs);
      const top = Math.min(...ys);
      const right = Math.max(...xs);
      const bottom = Math.max(...ys);
      const seed: OverlayLabel = {
        key: 'seed:overlay',
        kind: 'tag',
        layerIndex: null,
        x: left + 1,
        y: top + 1,
        w: Math.max(1, right - left - 2),
        h: Math.max(1, bottom - top - 2),
        text: 'SEED',
        opacity: 1,
      };
      const seedLabel: LabelItem = {
        key: seed.key,
        kind: 'tag',
        quad: axisQuad(seed.x, seed.y, seed.w, seed.h),
        priority: 6,
        visible: true,
        source: 'overlay',
      };

      expect(sweepPairs([...base.labels, seedLabel])).not.toEqual([]);

      const seededInput = { ...parityCase.input, extraLabels: [seed] };
      const result = labelPass(seededInput);
      const guarded = (result as typeof result & { guarded?: number }).guarded;

      expect(sweepPairs(result.labels)).toEqual([]);
      expect(result.labels.some((label) => label.visible && label.key === seed.key)).toBe(false);
      expect(result.overlay.hidden).toBeGreaterThan(base.overlay.hidden);
      expect(guarded).toBe(0);
    },
    TEST_TIMEOUT_MS,
  );
});
