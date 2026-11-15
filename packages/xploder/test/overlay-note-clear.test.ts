import { describe, expect, test, vi } from 'vitest';

import { azimuthOf, ZOOM_BOUNDS } from '../src/engine/camera';
import { parseProject, parseTechRegistry, type Project } from '../src/index';
import { offsetFor, scrollExtent } from '../src/interaction/scroll';
import { fitZoom, layoutProject, VIEW, type ProjectLayout } from '../src/layout';
import { layerLetteringModel } from '../src/lettering/layers';
import { resolveViewerLayoutOptions } from '../src/look/product';
import { look } from '../src/look/tokens';
import { calloutMode } from '../src/overlay/columns';
import {
  overlayBaseModel,
  overlayLabels,
  tagsModel,
  type OverlayViewport,
} from '../src/overlay/model';
import { placeLabels, type PlacementLabel, type PlacementResult } from '../src/overlay/place';
import { overlayFrame, type OverlayFrame, type Vec2 } from '../src/overlay/project';
import { projectAJson, projectBJson, projectCJson, techRegistryJson } from './fixtures';

const SWEEP_TIMEOUT_MS = 180_000;
const WIDTHS = [390, 768, 1088, 1440] as const;
const HEIGHTS = [720, 900] as const;
const TURNS = [0, 1, 2, 3] as const;
const SCROLL_FRACTIONS = [0, 0.25, 0.5, 0.75, 1] as const;
const CONTENT_ROOT = new URL('../../../.specify/content/', import.meta.url);
const registry = parseTechRegistry(techRegistryJson);

interface PlacementCall {
  readonly labels: readonly PlacementLabel[];
  readonly result: PlacementResult;
}

const { placementCalls } = vi.hoisted(() => ({
  placementCalls: [] as PlacementCall[],
}));

const nodeFileSystem = (
  globalThis as typeof globalThis & {
    readonly process: {
      getBuiltinModule(id: 'node:fs'): {
        readFileSync(path: URL, encoding: 'utf8'): string;
      };
    };
  }
).process.getBuiltinModule('node:fs');

vi.mock('../src/overlay/place', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../src/overlay/place')>();

  return {
    ...actual,
    placeLabels: (...args: Parameters<typeof actual.placeLabels>) => {
      const result = actual.placeLabels(...args);

      placementCalls.push({ labels: args[0], result });
      return result;
    },
  };
});

interface JsonObject {
  [key: string]: unknown;
}

interface OffendingCell {
  readonly context: string;
  readonly note: readonly Vec2[];
  readonly layerId: string;
  readonly layerQuad: readonly Vec2[];
}

function isJsonObject(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null;
}

// The production content uses tech ids beyond the package fixture registry. Layout does not
// read component tech metadata, so remove those arrays from a clone before parsing.
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

const fixtureProjects = [
  ['fixture-a', parseProject(projectAJson, { registry })],
  ['fixture-b', parseProject(projectBJson, { registry })],
  ['fixture-c', parseProject(projectCJson, { registry })],
] as const satisfies readonly (readonly [string, Project])[];

const realProjects = ['websocket-inspector', 'jev-toolkit'].map(
  (stem): readonly [string, Project] => {
    const project = readRealProject(stem);

    return [`real:${project.meta.slug}`, project];
  },
);

const PROJECTS = [...fixtureProjects, ...realProjects] as const satisfies readonly (readonly [
  string,
  Project,
])[];

function engineZoomSteps(): number[] {
  const steps: number[] = [];
  let zoom: number = ZOOM_BOUNDS.min;

  while (zoom < ZOOM_BOUNDS.max) {
    steps.push(zoom);
    zoom = Math.min(ZOOM_BOUNDS.max, zoom * ZOOM_BOUNDS.step);
  }

  steps.push(ZOOM_BOUNDS.max);
  return steps;
}

const ZOOM_FACTORS = engineZoomSteps();

function viewFor(
  viewport: OverlayViewport,
  layout: ProjectLayout,
  zoomFactor: number,
  azimuth: number,
) {
  // CameraRig sets the orthographic camera zoom to fitZoom(bounds) * rig.zoomFactor. The pure
  // overlayFrame projection uses the same product as its pixel-per-world scale.
  return {
    ...viewport,
    azimuth,
    zoom: fitZoom(layout.bounds.exploded, viewport) * zoomFactor,
  };
}

function shiftPoint(point: Vec2, offsetY: number): Vec2 {
  return [point[0], point[1] + offsetY];
}

// OverlayProjector adds offsetY to every settled frame point. Both rendered layers then apply
// translateY(-offsetY), so this content-space frame is also what PartLettering receives.
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

  return Number.isFinite(top) && Number.isFinite(bottom)
    ? scrollExtent(top, bottom, height, VIEW.fitMargin * height)
    : 0;
}

function projection(points: readonly Vec2[], axis: Vec2): readonly [number, number] {
  let minimum = Infinity;
  let maximum = -Infinity;

  for (const point of points) {
    const value = point[0] * axis[0] + point[1] * axis[1];

    minimum = Math.min(minimum, value);
    maximum = Math.max(maximum, value);
  }

  return [minimum, maximum];
}

// Separating-axis test for two convex polygons. A projection overlap only at an edge is clear.
function polygonsIntersect(left: readonly Vec2[], right: readonly Vec2[]): boolean {
  for (const polygon of [left, right]) {
    for (let index = 0; index < polygon.length; index += 1) {
      const from = polygon[index];
      const to = polygon[(index + 1) % polygon.length];

      if (from === undefined || to === undefined) continue;

      const axis: Vec2 = [-(to[1] - from[1]), to[0] - from[0]];

      if (axis[0] === 0 && axis[1] === 0) continue;

      const [leftMinimum, leftMaximum] = projection(left, axis);
      const [rightMinimum, rightMaximum] = projection(right, axis);

      if (leftMaximum <= rightMinimum || rightMaximum <= leftMinimum) return false;
    }
  }

  return true;
}

function rectanglePolygon(x: number, y: number, width: number, height: number): readonly Vec2[] {
  return [
    [x, y],
    [x + width, y],
    [x + width, y + height],
    [x, y + height],
  ];
}

// Verbatim pre-fix tagsModel placement inputs: only component hulls are obstacles, layer labels
// see every hull, and each tag excludes only its own component hull.
function tagsPlacementsBefore(
  frame: OverlayFrame,
  layout: ProjectLayout,
  project: Project,
  viewport: OverlayViewport,
): PlacementResult {
  const labels = overlayLabels(frame, layout, project, viewport, 'exploded').map(
    (label): PlacementLabel => {
      if (label.kind !== 'part') return label;

      const componentIndex = frame.components.findIndex(
        (component) => `part:${component.id}` === label.key,
      );

      return {
        ...label,
        kind: 'tag',
        text: label.shortText ?? label.text,
        excludeObstacles: [componentIndex],
      };
    },
  );

  return placeLabels(
    labels,
    frame.components.map((component) => component.hull),
    viewport,
    look,
  );
}

function formatNumber(value: number): string {
  return value.toFixed(3).replace(/\.?0+$/, '');
}

function formatPoints(points: readonly Vec2[]): string {
  return JSON.stringify(points.map((point) => point.map((value) => Number(value.toFixed(3)))));
}

describe('dimension note clearance', () => {
  test(
    'never intersects a rendered plate layer name across the engine sweep',
    () => {
      let cellCount = 0;
      let noteCellCount = 0;
      let layerQuadCount = 0;
      const offendingCells = new Map<string, OffendingCell>();

      for (const [name, project] of PROJECTS) {
        // TeardownViewer resolves the product layout before passing it to the camera, overlay
        // and lettering components.
        const layout = layoutProject(project, resolveViewerLayoutOptions());

        for (const width of WIDTHS) {
          for (const height of HEIGHTS) {
            const viewport = { width, height };

            for (const zoomFactor of ZOOM_FACTORS) {
              for (const turns of TURNS) {
                const azimuth = azimuthOf(turns);
                const view = viewFor(viewport, layout, zoomFactor, azimuth);
                const baseFrame = overlayFrame(layout, 1, view);
                const extent = frameExtent(baseFrame, height);
                const offsets = [
                  ...new Set(
                    SCROLL_FRACTIONS.map((fraction) => offsetFor(extent * fraction, extent)),
                  ),
                ];

                for (const offsetY of offsets) {
                  cellCount += 1;
                  const frame = shiftFrame(baseFrame, offsetY);
                  const model = overlayBaseModel({
                    frame,
                    layout,
                    project,
                    viewport,
                    offsetY,
                    target: 'exploded',
                    look,
                  });
                  const note = model.labels.find((label) => label.key === 'dimension:stack');

                  if (note === undefined) continue;

                  noteCellCount += 1;
                  const mode = calloutMode(frame, layout, project, viewport, look);
                  const layersShown = mode === 'tags' || extent > 1e-9;

                  if (!layersShown) continue;

                  const layerLabels = layerLetteringModel({
                    layers: frame.layers.map((layer) => ({
                      id: layer.id,
                      index: layer.index,
                      name: project.layers[layer.index]?.name ?? layer.id,
                      corners: layer.corners,
                    })),
                    components: frame.components.map((component) => ({
                      layerIndex: component.layerIndex,
                      hull: component.hull.map((point): Vec2 => [point[0], point[1]]),
                    })),
                    canvasWidth: viewport.width,
                  });

                  // PartLettering renders only face lettering. Its group is translated by
                  // -offsetY, while the model's label y remains in content space.
                  const notePolygon = rectanglePolygon(note.x, note.y - offsetY, note.w, note.h);
                  const faceQuads = layerLabels.flatMap((layerLabel) =>
                    layerLabel.kind === 'face'
                      ? [
                          {
                            id: layerLabel.id,
                            quad: layerLabel.screen.map((point): Vec2 => [
                              point[0],
                              point[1] - offsetY,
                            ]),
                          },
                        ]
                      : [],
                  );

                  if (
                    width === 1440 &&
                    height === 900 &&
                    zoomFactor === 1.953125 &&
                    turns === 0 &&
                    offsetY === 0
                  ) {
                    const hits = faceQuads.filter((face) =>
                      polygonsIntersect(notePolygon, face.quad),
                    );

                    console.log(
                      `baseline-cell ${name} note=${formatPoints(notePolygon)} hits=${hits.length}`,
                    );
                  }

                  for (const face of faceQuads) {
                    layerQuadCount += 1;

                    if (!polygonsIntersect(notePolygon, face.quad)) continue;

                    const context = `${name} ${width}x${height} zoom=${formatNumber(zoomFactor)} turns=${turns} offsetY=${formatNumber(offsetY)}`;

                    offendingCells.set(`${context} ${face.id}`, {
                      context,
                      note: notePolygon,
                      layerId: face.id,
                      layerQuad: face.quad,
                    });
                  }
                }
              }
            }
          }
        }
      }

      const firstOffense = offendingCells.values().next().value as OffendingCell | undefined;
      const detail =
        firstOffense === undefined
          ? ''
          : `; first ${firstOffense.context} note=${formatPoints(firstOffense.note)} layer=${firstOffense.layerId}${formatPoints(firstOffense.layerQuad)}`;
      const summary = `cells=${cellCount} noteCells=${noteCellCount} layerQuads=${layerQuadCount} offendingCells=${offendingCells.size}${detail}`;

      console.log(summary);
      expect(offendingCells.size, summary).toBe(0);
    },
    SWEEP_TIMEOUT_MS,
  );
});

describe('tags placement equivalence', () => {
  test(
    'keeps every non-dimension placement deep-equal before and after the note fix',
    () => {
      let cellCount = 0;

      for (const [name, project] of PROJECTS) {
        const layout = layoutProject(project, resolveViewerLayoutOptions());

        for (const width of WIDTHS) {
          for (const height of HEIGHTS) {
            const viewport = { width, height };

            for (const zoomFactor of ZOOM_FACTORS) {
              for (const turns of TURNS) {
                const azimuth = azimuthOf(turns);
                const view = viewFor(viewport, layout, zoomFactor, azimuth);
                const baseFrame = overlayFrame(layout, 1, view);
                const extent = frameExtent(baseFrame, height);
                const offsets = [
                  ...new Set(
                    SCROLL_FRACTIONS.map((fraction) => offsetFor(extent * fraction, extent)),
                  ),
                ];

                for (const offsetY of offsets) {
                  cellCount += 1;
                  const frame = shiftFrame(baseFrame, offsetY);
                  const viewportFrame = shiftFrame(frame, -offsetY);
                  const before = tagsPlacementsBefore(
                    viewportFrame,
                    layout,
                    project,
                    viewport,
                  ).placements.filter((placement) => placement.kind !== 'dimension');

                  placementCalls.length = 0;
                  tagsModel(viewportFrame, layout, project, viewport, offsetY, look);
                  const captured = placementCalls[0];

                  if (captured === undefined) {
                    throw new Error(
                      `Missing tags placement call for ${name} ${width}x${height} zoom=${formatNumber(zoomFactor)} turns=${turns}`,
                    );
                  }

                  const after = captured.result.placements.filter(
                    (placement) => placement.kind !== 'dimension',
                  );
                  const context = `${name} ${width}x${height} zoom=${formatNumber(zoomFactor)} turns=${turns} offsetY=${formatNumber(offsetY)}`;

                  expect(after, context).toStrictEqual(before);
                }
              }
            }
          }
        }
      }

      const summary = `equivalence cells=${cellCount} comparedCells=${cellCount}`;

      console.log(summary);
      expect(cellCount, summary).toBeGreaterThan(0);
    },
    SWEEP_TIMEOUT_MS,
  );
});
