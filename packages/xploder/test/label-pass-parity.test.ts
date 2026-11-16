import { describe, expect, test } from 'vitest';

import { parseProject, parseTechRegistry, type Project } from '../src/index';
import { scrollExtent } from '../src/interaction/scroll';
import { fitZoom, layoutProject, VIEW, type ProjectLayout } from '../src/layout';
import { topFaceQuad, type FaceQuad } from '../src/lettering/faces';
import { resolveViewerLayoutOptions } from '../src/look/product';
import { look } from '../src/look/tokens';
import { overlayFrame, projectPoint, type OverlayFrame, type Vec2 } from '../src/overlay/project';
import { labelPass } from '../src/labels/pass';
import type { LabelPassInput } from '../src/labels/types';
import { projectAJson, projectBJson, projectCJson, techRegistryJson } from './fixtures';
import { oracleLettering, oracleOverlay } from './oracles/labels-s15';

const RANDOM_CASES = 600;
const RANDOM_SEED = 0x5117e1a;
const TEST_TIMEOUT_MS = 180_000;
const MAX_REPORTED_DIFFERENCES = 200;
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

function mulberry32(seed: number): () => number {
  let value = seed >>> 0;

  return () => {
    value = (value + 0x6d2b79f5) | 0;
    let mixed = Math.imul(value ^ (value >>> 15), value | 1);
    mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61);
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4_294_967_296;
  };
}

function randomInt(random: () => number, limit: number): number {
  return Math.floor(random() * limit);
}

function randomBetween(random: () => number, min: number, max: number): number {
  return min + random() * (max - min);
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
  faces,
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
  readonly faces: 'present' | 'null';
}): ParityCase {
  const progress = target === 'imploded' ? 0 : 1;
  const view = {
    azimuth,
    zoom: fitZoom(layout.bounds[target], viewport) * zoomFactor,
    width: viewport.width,
    height: viewport.height,
  };
  const frame = shiftFrame(overlayFrame(layout, progress, view), offsetY);
  const facesValue = faces === 'null' ? null : faceQuads(layout, progress, view, offsetY);

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
                  faces: 'present',
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

function randomCases(): readonly ParityCase[] {
  const random = mulberry32(RANDOM_SEED);
  const layouts = PROJECTS.map(([name, project]) => ({
    name,
    project,
    layout: layoutProject(project, resolveViewerLayoutOptions()),
  }));
  const cases: ParityCase[] = [];

  for (let index = 0; index < RANDOM_CASES; index += 1) {
    const selected = layouts[randomInt(random, layouts.length)];

    if (selected === undefined) throw new Error('Missing random project');

    const viewport = {
      width: 240 + randomInt(random, 1_261),
      height: 220 + randomInt(random, 901),
    };
    const zoomFactor = randomBetween(random, 1, 3);
    const azimuth =
      random() < 0.5
        ? VIEW.baseAzimuth + randomInt(random, 4) * VIEW.snap
        : randomBetween(random, -Math.PI, Math.PI);
    const target = random() < 0.5 ? 'imploded' : 'exploded';
    const progress = target === 'imploded' ? 0 : 1;
    const view = {
      azimuth,
      zoom: fitZoom(selected.layout.bounds[target], viewport) * zoomFactor,
      width: viewport.width,
      height: viewport.height,
    };
    const baseFrame = overlayFrame(selected.layout, progress, view);
    const extent = frameExtent(baseFrame, viewport.height);
    const offsetY = randomBetween(random, 0, Math.max(0, Number.isFinite(extent) ? extent : 0));
    const extentPx = random() < 0.5 ? null : random() < 0.5 ? 0 : extent;

    cases.push(
      inputFor({
        name: `random-${index} ${selected.name} ${viewport.width}x${viewport.height} ${target}`,
        project: selected.project,
        layout: selected.layout,
        viewport,
        zoomFactor,
        azimuth,
        target,
        offsetY,
        extentPx,
        faces: random() < 0.05 ? 'null' : 'present',
      }),
    );
  }

  return cases;
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

    for (let index = 0; index < Math.max(actual.length, expected.length); index += 1) {
      if (index >= actual.length || index >= expected.length) continue;
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
  const actualKeys = Object.keys(actualRecord).sort();
  const expectedKeys = Object.keys(expectedRecord).sort();

  if (actualKeys.join('\u0000') !== expectedKeys.join('\u0000')) {
    differences.push(`${path} keys: [${actualKeys.join(',')}] !== [${expectedKeys.join(',')}]`);
  }

  const keys = [...new Set([...actualKeys, ...expectedKeys])].sort();

  for (const key of keys) {
    const childPath = `${path}.${key}`;

    if (!Object.hasOwn(actualRecord, key)) {
      differences.push(`${childPath}: <missing> !== ${describeValue(expectedRecord[key])}`);
      continue;
    }
    if (!Object.hasOwn(expectedRecord, key)) {
      differences.push(`${childPath}: ${describeValue(actualRecord[key])} !== <missing>`);
      continue;
    }

    compareValues(actualRecord[key], expectedRecord[key], childPath, differences);
  }
}

describe('labelPass parity', () => {
  test(
    'matches the frozen S15 overlay and lettering compositions exactly',
    () => {
      const cases = [...matrixCases(), ...randomCases()];
      const differences: string[] = [];
      let differenceCount = 0;
      let previousPass = 0;

      for (const parityCase of cases) {
        const result = labelPass(parityCase.input);
        const caseDifferences: string[] = [];

        if (previousPass === 0) {
          expect(result.pass, parityCase.name).toBeGreaterThan(0);
        } else {
          expect(result.pass, parityCase.name).toBe(previousPass + 1);
        }
        previousPass = result.pass;
        expect(result.target, parityCase.name).toBe(parityCase.input.target);

        compareValues(result.overlay, oracleOverlay(parityCase.input), 'overlay', caseDifferences);
        compareValues(
          result.lettering,
          oracleLettering(parityCase.input),
          'lettering',
          caseDifferences,
        );

        differenceCount += caseDifferences.length;

        for (const difference of caseDifferences) {
          if (differences.length >= MAX_REPORTED_DIFFERENCES) break;
          differences.push(`${parityCase.name} ${difference}`);
        }

        if (
          parityCase.input.target === 'exploded' &&
          parityCase.input.layout.components.length > 0
        ) {
          expect(result.labels.length, parityCase.name).toBeGreaterThan(0);
        }
      }

      for (const difference of differences) console.log(`PARITY ${difference}`);
      console.log(`cases: ${cases.length}, differing values: ${differenceCount}`);
      expect(differenceCount).toBe(0);
    },
    TEST_TIMEOUT_MS,
  );
});
