import { describe, expect, test } from 'vitest';

import { parseProject, parseTechRegistry, type Project } from '../src/index';
import { fitZoom, layoutProject, VIEW } from '../src/layout';
import { resolveViewerLayoutOptions } from '../src/look/product';
import { look } from '../src/look/tokens';
import { footprintDimension } from '../src/overlay/dimension';
import { overlayLabels } from '../src/overlay/model';
import { placeLabels, type LabelKind, type PlacementLabel } from '../src/overlay/place';
import { convexHull, overlayFrame, type Vec2 } from '../src/overlay/project';
import { projectAJson, projectBJson, projectCJson, techRegistryJson } from './fixtures';
import { placeLabels as oraclePlaceLabels } from './oracles/place-s11.7';

const SEED = 0x5117e1a;
const RANDOM_LAYOUTS = 2_000;
const TEST_TIMEOUT_MS = 180_000;
const TIMING_ROUNDS = 5;
const VIEWPORTS = [
  { width: 412, height: 823 },
  { width: 1350, height: 940 },
] as const;
const KINDS = ['layer', 'part', 'tag', 'dimension'] as const satisfies readonly LabelKind[];
const registry = parseTechRegistry(techRegistryJson);
const nodeFileSystem = (
  globalThis as typeof globalThis & {
    readonly process: {
      getBuiltinModule(id: 'node:fs'): {
        readFileSync(path: URL, encoding: 'utf8'): string;
      };
    };
  }
).process.getBuiltinModule('node:fs');
const heroJson: unknown = JSON.parse(
  nodeFileSystem.readFileSync(
    new URL('../../../.specify/content/websocket-inspector.json', import.meta.url),
    'utf8',
  ),
);
const PROJECTS = [
  ['project-a', parseProject(projectAJson, { registry })],
  ['project-b', parseProject(projectBJson, { registry })],
  ['project-c-lockerbay', parseProject(projectCJson, { registry })],
  ['hero', parseProject(heroJson, { registry })],
] as const satisfies readonly (readonly [string, Project])[];

interface PlacementCase {
  readonly name: string;
  readonly labels: readonly PlacementLabel[];
  readonly obstacles: readonly (readonly Vec2[])[];
  readonly viewport: { readonly width: number; readonly height: number };
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

function randomPoint(
  random: () => number,
  viewport: { readonly width: number; readonly height: number },
): Vec2 {
  return [
    randomBetween(random, -viewport.width * 0.15, viewport.width * 1.15),
    randomBetween(random, -viewport.height * 0.15, viewport.height * 1.15),
  ];
}

function randomHull(
  random: () => number,
  viewport: { readonly width: number; readonly height: number },
): readonly Vec2[] {
  const count = 3 + randomInt(random, 6);
  const centerX = randomBetween(random, 0, viewport.width);
  const centerY = randomBetween(random, 0, viewport.height);
  const radiusX = randomBetween(random, 8, viewport.width * 0.22);
  const radiusY = randomBetween(random, 8, viewport.height * 0.22);
  const points: Vec2[] = [];

  for (let index = 0; index < count; index += 1) {
    const angle = (index / count) * Math.PI * 2;

    points.push([centerX + Math.cos(angle) * radiusX, centerY + Math.sin(angle) * radiusY]);
  }

  const hull = convexHull(points);

  if (hull.length >= 3) return hull;

  return [
    [centerX - radiusX, centerY - radiusY],
    [centerX + radiusX, centerY - radiusY],
    [centerX, centerY + radiusY],
  ];
}

function randomLabel(
  random: () => number,
  viewport: { readonly width: number; readonly height: number },
  index: number,
  obstacleCount: number,
): PlacementLabel {
  const kind = KINDS[index % KINDS.length] ?? 'layer';
  const anchor =
    random() < 0.04
      ? ([random() < 0.5 ? -1 : viewport.width + 1, randomInt(random, viewport.height)] as const)
      : randomPoint(random, viewport);
  const anchors =
    random() < 0.35
      ? Array.from({ length: 1 + randomInt(random, 4) }, () => randomPoint(random, viewport))
      : undefined;
  const shortText =
    kind === 'part' && random() < 0.65 ? `${index}.${randomInt(random, 10)}` : undefined;
  const excludeObstacles = Array.from(
    { length: obstacleCount },
    (_, obstacleIndex) => obstacleIndex,
  ).filter(() => random() < 0.12);

  return {
    key: `random:${index}:${kind}`,
    kind,
    anchor,
    ...(anchors === undefined ? {} : { anchors }),
    text: `${index} ${kind} ${'label'.repeat(1 + randomInt(random, 5))}`,
    ...(shortText === undefined ? {} : { shortText }),
    ...(kind === 'layer' || kind === 'part' || kind === 'tag'
      ? { layerIndex: randomInt(random, 6) }
      : {}),
    ...(kind === 'part' || kind === 'tag' ? { slot: randomInt(random, 6) } : {}),
    ...(excludeObstacles.length === 0 ? {} : { excludeObstacles }),
  };
}

function randomCase(random: () => number, caseIndex: number): PlacementCase {
  const viewport = {
    width: 240 + randomInt(random, 1_260),
    height: 220 + randomInt(random, 900),
  };
  const obstacleCount = 1 + randomInt(random, 24);
  const labelCount = 4 + randomInt(random, 27);
  const obstacles = Array.from({ length: obstacleCount }, () => randomHull(random, viewport));
  const labels = Array.from({ length: labelCount }, (_, index) =>
    randomLabel(random, viewport, index, obstacleCount),
  );

  return { name: `random-${caseIndex}`, labels, obstacles, viewport };
}

function fixtureCases(): PlacementCase[] {
  const cases: PlacementCase[] = [];

  for (const [name, project] of PROJECTS) {
    const layout = layoutProject(project, resolveViewerLayoutOptions());

    for (const viewport of VIEWPORTS) {
      const zoom = fitZoom(layout.bounds.exploded, viewport);

      for (const [state, progress] of [
        ['imploded', 0],
        ['exploded', 1],
      ] as const) {
        const frame = overlayFrame(layout, progress, {
          azimuth: VIEW.baseAzimuth,
          zoom,
          ...viewport,
        });
        const obstacles = frame.components.map((component) => component.hull);

        cases.push({
          name: `${name} ${viewport.width}x${viewport.height} ${state}`,
          labels: overlayLabels(frame, layout, project, viewport, state),
          obstacles,
          viewport,
        });

        if (viewport.width >= look.annotation.wideMinPx) {
          const footprint = footprintDimension(frame, layout.footprint);

          cases.push({
            name: `${name} ${viewport.width}x${viewport.height} ${state} footprint`,
            labels: [
              {
                key: 'dimension:footprint',
                kind: 'dimension',
                anchor: footprint.labelAnchor,
                text: footprint.text,
              },
            ],
            obstacles,
            viewport,
          });
        }
      }
    }
  }

  return cases;
}

function edgeCases(): PlacementCase[] {
  const zeroLengthEdges: PlacementCase = {
    name: 'edge zero-length-edges',
    labels: [
      { key: 'part:zero', kind: 'part', anchor: [150, 110], text: '1.1 Zero', shortText: '1.1' },
      { key: 'tag:zero', kind: 'tag', anchor: [80, 170], text: '2.4' },
    ],
    obstacles: [
      [
        [40, 40],
        [210, 40],
        [210, 40],
        [210, 180],
        [120, 180],
        [120, 180],
        [40, 180],
      ],
    ],
    viewport: { width: 300, height: 240 },
  };
  const collinear: PlacementCase = {
    name: 'edge collinear-points',
    labels: [
      { key: 'layer:collinear', kind: 'layer', anchor: [90, 70], text: '1 Collinear' },
      { key: 'dimension:collinear', kind: 'dimension', anchor: [230, 160], text: '3 layers' },
    ],
    obstacles: [
      [
        [50, 50],
        [110, 50],
        [170, 50],
        [170, 130],
        [170, 130],
      ],
    ],
    viewport: { width: 320, height: 220 },
  };
  const inset: PlacementCase = {
    name: 'edge viewport-inset',
    labels: [
      { key: 'layer:top-left', kind: 'layer', anchor: [4, 4], text: '1 Edge' },
      { key: 'tag:bottom-right', kind: 'tag', anchor: [196, 196], text: '2.1' },
      {
        key: 'part:centre',
        kind: 'part',
        anchor: [100, 100],
        text: '1.2 Centre',
        shortText: '1.2',
      },
    ],
    obstacles: [],
    viewport: { width: 200, height: 200 },
  };
  const offscreen: PlacementCase = {
    name: 'edge offscreen-anchor',
    labels: [
      {
        key: 'dimension:offscreen',
        kind: 'dimension',
        anchor: [-1, 100],
        anchors: [[200, 100]],
        text: '4 layers',
      },
      { key: 'tag:visible', kind: 'tag', anchor: [100, 100], text: '1.4' },
    ],
    obstacles: [],
    viewport: { width: 240, height: 200 },
  };
  const completeSearch: PlacementCase = {
    name: 'edge complete-search-recovery',
    labels: [
      {
        key: 'layer:0',
        kind: 'layer',
        anchor: [160, 145],
        anchors: [[240, 60]],
        text: '0 label xxxxx',
        layerIndex: 0,
      },
      {
        key: 'dimension:1',
        kind: 'dimension',
        anchor: [174, 88],
        text: '1 label xx',
        excludeObstacles: [0],
      },
      {
        key: 'tag:2',
        kind: 'tag',
        anchor: [191, 119],
        text: '2 label xxxxxxx',
        layerIndex: 2,
        slot: 1,
      },
      {
        key: 'layer:3',
        kind: 'layer',
        anchor: [249, 1],
        anchors: [[90, 64]],
        text: '3 label xxxx',
        layerIndex: 2,
      },
      {
        key: 'dimension:4',
        kind: 'dimension',
        anchor: [132, 161],
        text: '4 label xxxxxxxxxxxxxxxxx',
      },
    ],
    obstacles: [
      [
        [125, 127],
        [193, 127],
        [193, 195],
        [125, 195],
      ],
    ],
    viewport: { width: 266, height: 208 },
  };
  const nodeLimit: PlacementCase = {
    name: 'edge search-node-limit',
    labels: [
      ...Array.from({ length: 4 }, (_, index): PlacementLabel => ({
        key: `layer:limit:${index}`,
        kind: 'layer',
        anchor: [90 + index * 60, 100],
        text: `${index + 1} Layer`,
        layerIndex: index,
      })),
      {
        key: 'dimension:impossible',
        kind: 'dimension',
        anchor: [200, 200],
        text: 'X'.repeat(1_000),
      },
    ],
    obstacles: [],
    viewport: { width: 400, height: 400 },
  };

  return [zeroLengthEdges, collinear, inset, offscreen, completeSearch, nodeLimit];
}

function median(values: readonly number[]): number {
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);

  return sorted[middle] ?? 0;
}

function fixtureMedians(cases: readonly PlacementCase[]): {
  readonly oldMs: number;
  readonly newMs: number;
} {
  const oldSamples: number[] = [];
  const newSamples: number[] = [];

  for (let round = 0; round < TIMING_ROUNDS; round += 1) {
    let started = performance.now();

    for (const testCase of cases) {
      oraclePlaceLabels(testCase.labels, testCase.obstacles, testCase.viewport, look);
    }

    oldSamples.push(performance.now() - started);
    started = performance.now();

    for (const testCase of cases) {
      placeLabels(testCase.labels, testCase.obstacles, testCase.viewport, look);
    }

    newSamples.push(performance.now() - started);
  }

  return { oldMs: median(oldSamples), newMs: median(newSamples) };
}

function countMismatch(testCase: PlacementCase, mismatches: string[]): void {
  const actual = placeLabels(testCase.labels, testCase.obstacles, testCase.viewport, look);
  const expected = oraclePlaceLabels(testCase.labels, testCase.obstacles, testCase.viewport, look);

  expect(
    actual.placements.length + actual.hidden.length + actual.offscreen.length,
    testCase.name,
  ).toBe(testCase.labels.length);

  try {
    expect(actual, testCase.name).toStrictEqual(expected);
  } catch (error) {
    if (mismatches.length < 5) {
      mismatches.push(
        `${testCase.name}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}

describe('placement search equivalence', () => {
  test(
    'matches the S11.7 oracle on fixtures, seeded layouts and edge cases',
    () => {
      const random = mulberry32(SEED);
      const fixtures = fixtureCases();
      const randomCases = Array.from({ length: RANDOM_LAYOUTS }, (_, index) =>
        randomCase(random, index),
      );
      const edges = edgeCases();
      const cases = [...fixtures, ...randomCases, ...edges];
      const mismatches: string[] = [];

      for (const testCase of cases) countMismatch(testCase, mismatches);

      const completeSearch = edges.find(
        (testCase) => testCase.name === 'edge complete-search-recovery',
      );
      const nodeLimit = edges.find((testCase) => testCase.name === 'edge search-node-limit');

      if (completeSearch === undefined || nodeLimit === undefined) {
        throw new Error('Missing placement edge cases');
      }

      expect(
        oraclePlaceLabels(
          completeSearch.labels,
          completeSearch.obstacles,
          completeSearch.viewport,
          look,
        ).hidden,
      ).toStrictEqual([]);
      expect(
        oraclePlaceLabels(nodeLimit.labels, nodeLimit.obstacles, nodeLimit.viewport, look).hidden,
      ).toStrictEqual(['dimension:impossible']);

      const timing = fixtureMedians(fixtures);

      console.log(
        `seed=${SEED} cases=${cases.length} random=${RANDOM_LAYOUTS} fixtures=${fixtures.length} mismatches=${mismatches.length}`,
      );
      console.log(
        `median fixture-set old=${timing.oldMs.toFixed(3)} ms new=${timing.newMs.toFixed(3)} ms`,
      );

      expect(mismatches, mismatches.join('\n')).toStrictEqual([]);
    },
    TEST_TIMEOUT_MS,
  );
});
