import { describe, expect, test } from 'vitest';

import { parseProject, parseTechRegistry, type Project } from '../src/index';
import { fitZoom, layoutProject, VIEW, type ProjectLayout } from '../src/layout';
import { topFaceQuad, type FaceQuad } from '../src/lettering/faces';
import { layerLetteringModel, type LayerLetteringInput } from '../src/lettering/layers';
import { LETTERING_LOOK } from '../src/lettering/look';
import {
  convexPolygonsIntersect,
  letterPart,
  letterPartAvoiding,
  lineHeight,
  textWidth,
} from '../src/lettering/place';
import { resolveViewerLayoutOptions } from '../src/look/product';
import { partShortText } from '../src/overlay/parts';
import { overlayFrame, projectPoint, type Vec2 } from '../src/overlay/project';
import { projectAJson, projectBJson, projectCJson, techRegistryJson } from './fixtures';

const TEST_TIMEOUT_MS = 180_000;
const VIEWPORTS = [
  { width: 390, height: 844 },
  { width: 768, height: 1024 },
  { width: 1440, height: 900 },
] as const;
const ZOOM_FACTORS = [1, 1.953125, 3] as const;
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

function namesFor(project: Project): ReadonlyMap<string, string> {
  const names = new Map<string, string>();

  for (const layer of project.layers) {
    for (const component of layer.components) {
      if (component.name !== undefined) names.set(component.id, component.name);
    }
  }

  return names;
}

function box(left: number, top: number, right: number, bottom: number): FaceQuad {
  return [
    [left, top],
    [right, top],
    [right, bottom],
    [left, bottom],
  ];
}

function markScreen(mark: {
  readonly x: number;
  readonly y: number;
  readonly box: { readonly w: number; readonly h: number };
}): FaceQuad {
  return box(mark.x, mark.y, mark.x + mark.box.w, mark.y + mark.box.h);
}

function corpus(input: {
  readonly project: Project;
  readonly layout: ProjectLayout;
  readonly canvas: (typeof VIEWPORTS)[number];
  readonly zoomFactor: number;
  readonly turn: number;
}) {
  const view = {
    ...input.canvas,
    azimuth: VIEW.baseAzimuth + input.turn * VIEW.snap,
    zoom: fitZoom(input.layout.bounds.exploded, input.canvas) * input.zoomFactor,
  };
  const frame = overlayFrame(input.layout, 1, view);
  const modelComponents = frame.components.map((componentFrame) => {
    const component = input.layout.components.find(
      (candidate) => candidate.id === componentFrame.id,
    );

    if (component === undefined) throw new Error(`Missing ${componentFrame.id}`);

    return {
      id: componentFrame.id,
      layerIndex: componentFrame.layerIndex,
      slot: component.slot,
      quad: topFaceQuad(component, 1, (point) => projectPoint(point, view)),
      hull: componentFrame.hull,
    };
  });

  return { frame, modelComponents };
}

describe('letterPartAvoiding', () => {
  test(
    'is identical to letterPart without obstacles and strictly hides blocked marks',
    () => {
      let cases = 0;
      let faces = 0;
      let clearMarks = 0;
      let blockedMarks = 0;

      for (const [projectName, project] of PROJECTS) {
        const layout = layoutProject(project, resolveViewerLayoutOptions());
        const names = namesFor(project);

        for (const canvas of VIEWPORTS) {
          for (const zoomFactor of ZOOM_FACTORS) {
            for (const turn of TURNS) {
              const { frame, modelComponents } = corpus({
                project,
                layout,
                canvas,
                zoomFactor,
                turn,
              });
              const layers = frame.layers.map((layer) => ({
                index: layer.index,
                corners: layer.corners,
              }));

              for (const component of modelComponents) {
                const occluders = [
                  ...modelComponents
                    .filter((other) => other.layerIndex < component.layerIndex)
                    .map((other) => other.hull),
                  ...layers
                    .filter((layer) => layer.index < component.layerIndex)
                    .map((layer) => layer.corners),
                ];
                const input = {
                  quad: component.quad,
                  number: partShortText(component.layerIndex, component.slot),
                  name: names.get(component.id) ?? null,
                  occluders,
                };
                const expected = letterPart(input);
                const actual = letterPartAvoiding({ ...input, obstacles: [] });
                const context = `${projectName} ${canvas.width}x${canvas.height} z${zoomFactor} t${turn} ${component.id}`;

                cases += 1;

                if (expected.kind === 'face') {
                  faces += 1;
                  expect(actual, context).toStrictEqual(expected);
                  continue;
                }

                const screen = markScreen(expected);
                const blocked = occluders.some((occluder) =>
                  convexPolygonsIntersect(screen, occluder),
                );

                if (blocked) {
                  blockedMarks += 1;
                  expect(actual, context).toBeNull();
                } else {
                  clearMarks += 1;
                  expect(actual, context).toStrictEqual(expected);
                }
              }
            }
          }
        }
      }

      console.log(
        `obstacle corpus: cases=${cases} faces=${faces} clear-marks=${clearMarks} blocked-marks=${blockedMarks}`,
      );
      expect(faces).toBeGreaterThan(0);
    },
    TEST_TIMEOUT_MS,
  );

  test('preserves a clear mark and hides a colliding fallback', () => {
    const quad = box(0, 0, 24, 24);
    const number = '1.1';
    const anchor: Vec2 = [24, 24];
    const w = textWidth(number, LETTERING_LOOK.numberMinPx, LETTERING_LOOK);
    const h = lineHeight(LETTERING_LOOK.numberMinPx, LETTERING_LOOK);
    const offset = LETTERING_LOOK.markOffsetPx;
    const faceCover = box(-1, -1, 25, 25);
    const markCovers = (
      [
        [anchor[0] - offset - w, anchor[1] + offset],
        [anchor[0] + offset, anchor[1] + offset],
        [anchor[0] - offset - w, anchor[1] - h / 2],
        [anchor[0] + offset, anchor[1] - h / 2],
      ] as const
    ).map(([x, y]) => box(x, y, x + w, y + h));
    const clearInput = { quad, number, name: 'Parser', occluders: [faceCover] };
    const clear = letterPart(clearInput);

    expect(clear.kind).toBe('mark');
    if (clear.kind !== 'mark') return;

    expect(convexPolygonsIntersect(markScreen(clear), faceCover)).toBe(false);
    expect(letterPartAvoiding({ ...clearInput, obstacles: [] })).toStrictEqual(clear);

    const blockedInput = { ...clearInput, occluders: [faceCover, ...markCovers] };
    expect(letterPart(blockedInput).kind).toBe('mark');
    expect(letterPartAvoiding({ ...blockedInput, obstacles: [] })).toBeNull();
  });

  test('moves face lettering away from its chosen grid spot', () => {
    const quad = box(0, 0, 220, 100);
    const input = { quad, number: '1.1', name: 'Parser', occluders: [] };
    const chosen = letterPart(input);

    expect(chosen.kind).toBe('face');
    if (chosen.kind !== 'face') return;

    const obstacle = chosen.screen;
    const moved = letterPartAvoiding({ ...input, obstacles: [obstacle] });

    expect(moved).not.toStrictEqual(chosen);
    expect(moved?.kind).toBe('face');
    if (moved?.kind !== 'face') return;

    expect(convexPolygonsIntersect(moved.screen, obstacle)).toBe(false);
  });

  test('returns null when every mark candidate is blocked', () => {
    const quad = box(0, 0, 24, 24);
    const number = '1.1';
    const anchor: Vec2 = [24, 24];
    const w = textWidth(number, LETTERING_LOOK.numberMinPx, LETTERING_LOOK);
    const h = lineHeight(LETTERING_LOOK.numberMinPx, LETTERING_LOOK);
    const offset = LETTERING_LOOK.markOffsetPx;
    const obstacles = [
      box(-1, -1, 25, 25),
      ...(
        [
          [anchor[0] - offset - w, anchor[1] + offset],
          [anchor[0] + offset, anchor[1] + offset],
          [anchor[0] - offset - w, anchor[1] - h / 2],
          [anchor[0] + offset, anchor[1] - h / 2],
        ] as const
      ).map(([x, y]) => box(x, y, x + w, y + h)),
    ];

    expect(letterPart({ quad, number, name: 'Parser', occluders: obstacles }).kind).toBe('mark');
    expect(
      letterPartAvoiding({ quad, number, name: 'Parser', occluders: [], obstacles }),
    ).toBeNull();
  });
});

describe('layerLetteringModel obstacles', () => {
  test('makes an overlapping later plate name avoid the earlier name', () => {
    const layers = [
      { id: 'first', index: 0, name: 'Alpha', corners: box(0, 0, 180, 60) },
      { id: 'second', index: 1, name: 'Beta', corners: box(20, 10, 200, 70) },
    ] satisfies LayerLetteringInput['layers'];
    const input: LayerLetteringInput = { layers, components: [] };
    const before = layerLetteringModel(input);
    const after = layerLetteringModel({ ...input, obstacles: [] });
    const beforeFirst = before[0];
    const beforeSecond = before[1];
    const first = after[0];
    const second = after[1];

    expect(beforeFirst?.kind).toBe('face');
    expect(beforeSecond?.kind).toBe('face');
    expect(first?.kind).toBe('face');
    if (beforeFirst?.kind !== 'face' || beforeSecond?.kind !== 'face' || first?.kind !== 'face') {
      return;
    }

    expect(convexPolygonsIntersect(beforeFirst.screen, beforeSecond.screen)).toBe(true);
    expect(
      second?.kind === 'plain' ||
        (second?.kind === 'face' && !convexPolygonsIntersect(first.screen, second.screen)),
    ).toBe(true);
  });

  test('matches the absent-obstacles output over the project corpus', () => {
    let cases = 0;

    for (const [projectName, project] of PROJECTS) {
      const layout = layoutProject(project, resolveViewerLayoutOptions());

      for (const canvas of VIEWPORTS) {
        for (const zoomFactor of ZOOM_FACTORS) {
          for (const turn of TURNS) {
            const view = {
              ...canvas,
              azimuth: VIEW.baseAzimuth + turn * VIEW.snap,
              zoom: fitZoom(layout.bounds.exploded, canvas) * zoomFactor,
            };
            const frame = overlayFrame(layout, 1, view);
            const input: LayerLetteringInput = {
              layers: frame.layers.map((layer) => ({
                id: layer.id,
                index: layer.index,
                name: project.layers[layer.index]?.name ?? layer.id,
                corners: layer.corners,
              })),
              components: frame.components.map((component) => ({
                layerIndex: component.layerIndex,
                hull: component.hull,
              })),
              canvasWidth: canvas.width,
            };
            const context = `${projectName} ${canvas.width}x${canvas.height} z${zoomFactor} t${turn}`;

            expect(layerLetteringModel({ ...input, obstacles: undefined }), context).toStrictEqual(
              layerLetteringModel(input),
            );
            cases += 1;
          }
        }
      }
    }

    console.log(`layer obstacle corpus: cases=${cases} differences=0`);
    expect(cases).toBeGreaterThan(0);
  });
});
