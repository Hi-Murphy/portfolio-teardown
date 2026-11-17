import { test } from 'vitest';

import { parseProject, parseTechRegistry, type Project } from '../../../packages/xploder/src/index';
import { scrollExtent } from '../../../packages/xploder/src/interaction/scroll';
import {
  fitZoom,
  layoutProject,
  VIEW,
  type ProjectLayout,
} from '../../../packages/xploder/src/layout';
import { topFaceQuad, type FaceQuad } from '../../../packages/xploder/src/lettering/faces';
import { labelPass } from '../../../packages/xploder/src/labels/pass';
import type { LabelPassInput } from '../../../packages/xploder/src/labels/types';
import { resolveViewerLayoutOptions } from '../../../packages/xploder/src/look/product';
import { look } from '../../../packages/xploder/src/look/tokens';
import {
  overlayFrame,
  projectPoint,
  type OverlayFrame,
  type Vec2,
} from '../../../packages/xploder/src/overlay/project';
import {
  projectAJson,
  projectBJson,
  projectCJson,
  techRegistryJson,
} from '../../../packages/xploder/test/fixtures';
import {
  oracleLettering,
  oracleOverlay,
} from '../../../packages/xploder/test/oracles/labels-s15';

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
const ROUNDS = 5;
const TEST_TIMEOUT_MS = 300_000;
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

interface BenchCase {
  readonly name: string;
  readonly input: LabelPassInput;
}

interface Sample {
  readonly oldMs: number;
  readonly newMs: number;
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
}): BenchCase {
  const progress = target === 'imploded' ? 0 : 1;
  const view = {
    azimuth,
    zoom: fitZoom(layout.bounds[target], viewport) * zoomFactor,
    width: viewport.width,
    height: viewport.height,
  };
  const frame = shiftFrame(overlayFrame(layout, progress, view), offsetY);
  const faces = faceQuads(layout, progress, view, offsetY);

  return {
    name,
    input: {
      frame,
      faces,
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

function matrixCases(): readonly BenchCase[] {
  const cases: BenchCase[] = [];

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

function median(values: readonly number[]): number {
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[middle - 1]! + sorted[middle]!) / 2
    : sorted[middle]!;
}

function p95(values: readonly number[]): number {
  const sorted = [...values].sort((left, right) => left - right);
  return sorted[Math.max(0, Math.ceil(sorted.length * 0.95) - 1)]!;
}

function timeOld(input: LabelPassInput): number {
  const start = performance.now();
  const overlay = oracleOverlay(input);
  const lettering = oracleLettering(input);
  const end = performance.now();
  sink = overlay.labels.length + (lettering?.items.length ?? 0);
  return end - start;
}

function timeNew(input: LabelPassInput): number {
  const start = performance.now();
  const result = labelPass(input);
  const end = performance.now();
  sink = result.labels.length;
  return end - start;
}

let sink = 0;

test(
  'bench old two-consumer calls vs labelPass',
  () => {
    const cases = matrixCases();
    const samples = cases.map(() => [] as Sample[]);

    console.log(`bench cases: ${cases.length}`);
    console.log(`bench rounds: ${ROUNDS} (after 1 warm-up; A/B interleaved per case)`);

    let sinkWarmup = 0;
    for (const benchCase of cases) {
      sinkWarmup += timeOld(benchCase.input);
      sinkWarmup += timeNew(benchCase.input);
    }
    if (!Number.isFinite(sinkWarmup) || sinkWarmup < 0) throw new Error('warm-up failed');

    const roundTotals = Array.from({ length: ROUNDS }, () => ({ oldMs: 0, newMs: 0 }));

    for (let round = 0; round < ROUNDS; round += 1) {
      for (const [index, benchCase] of cases.entries()) {
        const oldMs = timeOld(benchCase.input);
        const newMs = timeNew(benchCase.input);
        samples[index]!.push({ oldMs, newMs });
        roundTotals[round]!.oldMs += oldMs;
        roundTotals[round]!.newMs += newMs;
      }
    }

    for (const [index, totals] of roundTotals.entries()) {
      console.log(
        `round ${index + 1}: old ${totals.oldMs.toFixed(3)} ms | new ${totals.newMs.toFixed(3)} ms`,
      );
    }

    console.log('\n| case | old median | old p95 | old max | new median | new p95 | new max | new/old |');
    console.log('|---|---:|---:|---:|---:|---:|---:|---:|');

    const caseRatios: number[] = [];

    for (const [index, benchCase] of cases.entries()) {
      const caseSamples = samples[index]!;
      const oldValues = caseSamples.map((sample) => sample.oldMs);
      const newValues = caseSamples.map((sample) => sample.newMs);
      const oldMedian = median(oldValues);
      const newMedian = median(newValues);
      const ratio = oldMedian === 0 ? Number.POSITIVE_INFINITY : newMedian / oldMedian;
      if (Number.isFinite(ratio)) caseRatios.push(ratio);

      console.log(
        `| ${benchCase.name} | ${oldMedian.toFixed(3)} | ${p95(oldValues).toFixed(3)} | ${Math.max(...oldValues).toFixed(3)} | ${newMedian.toFixed(3)} | ${p95(newValues).toFixed(3)} | ${Math.max(...newValues).toFixed(3)} | ${Number.isFinite(ratio) ? ratio.toFixed(3) : 'n/a'} |`,
      );
    }

    const oldRoundMedians = median(roundTotals.map((round) => round.oldMs));
    const newRoundMedians = median(roundTotals.map((round) => round.newMs));
    const totalMedianRatio = newRoundMedians / oldRoundMedians;
    const caseMedianRatio = median(caseRatios);

    console.log(
      `aggregate: old round median ${oldRoundMedians.toFixed(3)} ms | new round median ${newRoundMedians.toFixed(3)} ms | new/old ${totalMedianRatio.toFixed(3)}`,
    );
    console.log(`aggregate case median ratio: ${caseMedianRatio.toFixed(3)}`);
    console.log(`sink: ${sink + sinkWarmup}`);
    console.log(`bench: new/old median ratio ${caseMedianRatio.toFixed(3)}`);
  },
  TEST_TIMEOUT_MS,
);
