import { describe, expect, test } from 'vitest';

import { parseProject, parseTechRegistry, type Project } from '../src/index';
import { scrollExtent } from '../src/interaction/scroll';
import { fitZoom, layoutProject, VIEW, type ProjectLayout } from '../src/layout';
import { faceBasis, topFaceQuad, type FaceQuad } from '../src/lettering/faces';
import { LETTERING_LOOK } from '../src/lettering/look';
import { letteringModel } from '../src/lettering/model';
import { letterPart, type Lettering } from '../src/lettering/place';
import { resolveViewerLayoutOptions } from '../src/look/product';
import { partShortText } from '../src/overlay/parts';
import { overlayFrame, projectPoint, type OverlayFrame, type Vec2 } from '../src/overlay/project';
import { projectAJson, projectBJson, projectCJson, techRegistryJson } from './fixtures';

const DENSE_SWEEP_TIMEOUT_MS = 180_000;
const registry = parseTechRegistry(techRegistryJson);
const PROJECTS = [
  ['A', parseProject(projectAJson, { registry })],
  ['B', parseProject(projectBJson, { registry })],
  ['C', parseProject(projectCJson, { registry })],
] as const satisfies readonly (readonly [string, Project])[];
const CANVASES = [
  { width: 328, height: 444 },
  { width: 358, height: 506 },
  { width: 768, height: 614 },
  { width: 1216, height: 480 },
] as const;
const AZIMUTHS = [0, 1, 2, 3].map((index) => VIEW.baseAzimuth + index * VIEW.snap);
const ZOOM_FACTORS = [1, 1.5625, 3] as const;

interface Histogram {
  faceName: number;
  faceNumber: number;
  mark: number;
}

function emptyHistogram(): Histogram {
  return { faceName: 0, faceNumber: 0, mark: 0 };
}

function printHistogram(fixture: string, histogram: Histogram): void {
  console.log(
    `lettering histogram ${fixture}: face+name=${histogram.faceName} face number-only=${histogram.faceNumber} mark=${histogram.mark}`,
  );
}

function viewFor(
  canvas: (typeof CANVASES)[number],
  zoomFactor: number,
  azimuth: number,
  layout: ProjectLayout,
) {
  return {
    ...canvas,
    azimuth,
    zoom: fitZoom(layout.bounds.exploded, canvas) * zoomFactor,
  };
}

function drawingExtent(frame: OverlayFrame, canvas: (typeof CANVASES)[number]): number {
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

  return scrollExtent(top, bottom, canvas.height, VIEW.fitMargin * canvas.height);
}

function shiftPoint(point: Vec2, offsetY: number): Vec2 {
  return [point[0], point[1] - offsetY];
}

function shiftedFrame(frame: OverlayFrame, offsetY: number): OverlayFrame {
  return {
    layers: frame.layers.map((layer) => ({
      ...layer,
      corners: [
        shiftPoint(layer.corners[0], offsetY),
        shiftPoint(layer.corners[1], offsetY),
        shiftPoint(layer.corners[2], offsetY),
        shiftPoint(layer.corners[3], offsetY),
      ],
    })),
    components: frame.components.map((component) => ({
      ...component,
      anchor: shiftPoint(component.anchor, offsetY),
      hull: component.hull.map((point) => shiftPoint(point, offsetY)),
    })),
  };
}

function namesFor(project: Project): ReadonlyMap<string, string> {
  const names = new Map<string, string>();

  for (const layer of project.layers) {
    for (const component of layer.components) {
      if (component.name !== undefined) names.set(component.id, component.name);
    }
  }

  return names;
}

function signedArea(polygon: readonly Vec2[]): number {
  let sum = 0;

  for (let index = 0; index < polygon.length; index += 1) {
    const from = polygon[index];
    const to = polygon[(index + 1) % polygon.length];

    if (from !== undefined && to !== undefined) sum += from[0] * to[1] - to[0] * from[1];
  }

  return sum / 2;
}

function pointInsideConvex(point: Vec2, polygon: readonly Vec2[], tolerance = 0.5): boolean {
  const area = signedArea(polygon);

  if (Math.abs(area) < Number.EPSILON) return false;

  const direction = area > 0 ? 1 : -1;

  for (let index = 0; index < polygon.length; index += 1) {
    const from = polygon[index];
    const to = polygon[(index + 1) % polygon.length];

    if (from === undefined || to === undefined) return false;

    const edgeX = to[0] - from[0];
    const edgeY = to[1] - from[1];
    const length = Math.hypot(edgeX, edgeY);

    if (length === 0) continue;

    const distance =
      (direction * (edgeX * (point[1] - from[1]) - edgeY * (point[0] - from[0]))) / length;

    if (distance < -tolerance) return false;
  }

  return true;
}

function projectedRange(points: readonly Vec2[], axis: Vec2): readonly [number, number] {
  let min = Infinity;
  let max = -Infinity;

  for (const point of points) {
    const value = point[0] * axis[0] + point[1] * axis[1];
    min = Math.min(min, value);
    max = Math.max(max, value);
  }

  return [min, max];
}

function polygonsIntersect(left: readonly Vec2[], right: readonly Vec2[]): boolean {
  for (const polygon of [left, right]) {
    for (let index = 0; index < polygon.length; index += 1) {
      const from = polygon[index];
      const to = polygon[(index + 1) % polygon.length];

      if (from === undefined || to === undefined) continue;

      const axis: Vec2 = [-(to[1] - from[1]), to[0] - from[0]];

      if (axis[0] === 0 && axis[1] === 0) continue;

      const [leftMin, leftMax] = projectedRange(left, axis);
      const [rightMin, rightMax] = projectedRange(right, axis);

      if (leftMax <= rightMin || rightMax <= leftMin) return false;
    }
  }

  return true;
}

function occludersFor(
  component: { readonly layerIndex: number; readonly hull: readonly Vec2[] },
  components: readonly { readonly layerIndex: number; readonly hull: readonly Vec2[] }[],
  layers: readonly { readonly index: number; readonly corners: readonly Vec2[] }[],
): readonly (readonly Vec2[])[] {
  return [
    ...components
      .filter((other) => other.layerIndex < component.layerIndex)
      .map((other) => other.hull),
    ...layers.filter((layer) => layer.index < component.layerIndex).map((layer) => layer.corners),
  ];
}

function countLettering(histogram: Histogram, lettering: Lettering): void {
  if (lettering.kind === 'mark') {
    histogram.mark += 1;
  } else if (lettering.namePx === null) {
    histogram.faceNumber += 1;
  } else {
    histogram.faceName += 1;
  }
}

describe('part lettering matrix', () => {
  test.each(PROJECTS)(
    'labels every %s fixture component at every view and scroll offset',
    (fixture, project) => {
      const layout = layoutProject(project, resolveViewerLayoutOptions());
      const names = namesFor(project);
      const histogram = emptyHistogram();

      for (const canvas of CANVASES) {
        for (const azimuth of AZIMUTHS) {
          for (const zoomFactor of ZOOM_FACTORS) {
            const view = viewFor(canvas, zoomFactor, azimuth, layout);
            const unshiftedFrame = overlayFrame(layout, 1, view);
            const extent = drawingExtent(unshiftedFrame, canvas);

            for (const offsetY of [-extent / 2, 0, extent / 2]) {
              const frame = shiftedFrame(unshiftedFrame, offsetY);
              const project = (point: readonly [number, number, number]): Vec2 =>
                shiftPoint(projectPoint(point, view), offsetY);
              const modelComponents = frame.components.map((componentFrame) => {
                const component = layout.components.find(
                  (candidate) => candidate.id === componentFrame.id,
                );

                if (component === undefined) throw new Error(`Missing ${componentFrame.id}`);

                return {
                  id: componentFrame.id,
                  layerIndex: componentFrame.layerIndex,
                  slot: component.slot,
                  quad: topFaceQuad(component, 1, project),
                  hull: componentFrame.hull,
                };
              });
              const modelLayers = frame.layers.map((layer) => ({
                index: layer.index,
                corners: layer.corners,
              }));
              const lettering = letteringModel({
                layout,
                components: modelComponents,
                layers: modelLayers,
                names,
              });
              const byId = new Map(lettering.map((item) => [item.id, item]));

              expect(lettering).toHaveLength(frame.components.length);

              for (const componentFrame of frame.components) {
                const modelComponent = modelComponents.find(
                  (candidate) => candidate.id === componentFrame.id,
                );
                const item = byId.get(componentFrame.id);
                const label = `${fixture} ${canvas.width}x${canvas.height} a${azimuth} z${zoomFactor} scroll${offsetY} ${componentFrame.id}`;

                expect(modelComponent, label).toBeDefined();
                expect(item, `${label} missing lettering`).toBeDefined();

                if (modelComponent === undefined || item === undefined) continue;

                expect(item.layerIndex, label).toBe(componentFrame.layerIndex);
                expect(item.number, label).toBe(
                  partShortText(componentFrame.layerIndex, modelComponent.slot),
                );
                expect(item.lettering.numberPx, label).toBeGreaterThanOrEqual(
                  LETTERING_LOOK.numberMinPx,
                );
                countLettering(histogram, item.lettering);

                if (item.lettering.kind === 'mark') continue;

                const basis = faceBasis(modelComponent.quad);
                const determinant = basis.u[0] * basis.v[1] - basis.u[1] * basis.v[0];

                expect(determinant, `${label} mirrored`).toBeGreaterThan(0);

                for (const corner of item.lettering.screen) {
                  expect(
                    pointInsideConvex(corner, modelComponent.quad),
                    `${label} lettering outside face`,
                  ).toBe(true);
                }

                const occluders = occludersFor(componentFrame, frame.components, modelLayers);

                for (const occluder of occluders) {
                  expect(
                    polygonsIntersect(item.lettering.screen, occluder),
                    `${label} lettering overlaps an upper layer`,
                  ).toBe(false);
                }
              }
            }
          }
        }
      }

      printHistogram(fixture, histogram);
      expect(histogram.faceName + histogram.faceNumber + histogram.mark).toBeGreaterThan(0);
    },
    DENSE_SWEEP_TIMEOUT_MS,
  );
});

describe('face basis', () => {
  test.each(AZIMUTHS)('points right without mirroring at azimuth %s', (azimuth) => {
    const project = PROJECTS[0]?.[1];

    if (project === undefined) throw new Error('Missing fixture A');

    const layout = layoutProject(project, resolveViewerLayoutOptions());
    const component = layout.components[0];

    if (component === undefined) throw new Error('Missing component');

    const view = { azimuth, zoom: 1, width: 768, height: 614 };
    const quad = topFaceQuad(component, 1, (point) => projectPoint(point, view));
    const basis = faceBasis(quad);
    const determinant = basis.u[0] * basis.v[1] - basis.u[1] * basis.v[0];

    expect(basis.u[0]).toBeGreaterThan(0);
    expect(determinant).toBeGreaterThan(0);
  });
});

describe('letterPart', () => {
  const square: FaceQuad = [
    [0, 0],
    [120, 0],
    [120, 120],
    [0, 120],
  ];
  const tiny: FaceQuad = [
    [0, 0],
    [24, 0],
    [24, 24],
    [0, 24],
  ];

  test('puts the number and name on a face when both fit', () => {
    const lettering = letterPart({ quad: square, number: '1.1', name: 'Parser', occluders: [] });

    expect(lettering.kind).toBe('face');

    if (lettering.kind !== 'face') return;

    expect(lettering.numberPx).toBe(LETTERING_LOOK.numberMaxPx);
    expect(lettering.namePx).toBeGreaterThanOrEqual(LETTERING_LOOK.nameMinPx);
    expect(lettering.box.w).toBeGreaterThan(0);
    expect(lettering.box.h).toBeGreaterThan(0);
  });

  test('drops the name before the number on a tiny face', () => {
    const lettering = letterPart({ quad: tiny, number: '1.1', name: 'Parser', occluders: [] });

    expect(lettering.kind).toBe('face');

    if (lettering.kind !== 'face') return;

    expect(lettering.namePx).toBeNull();
    expect(lettering.numberPx).toBeGreaterThanOrEqual(LETTERING_LOOK.numberMinPx);
  });

  test('marks the front corner when every face position is occluded', () => {
    const occluder: readonly Vec2[] = [
      [-10, -10],
      [130, -10],
      [130, 130],
      [-10, 130],
    ];
    const lettering = letterPart({
      quad: square,
      number: '1.1',
      name: 'Parser',
      occluders: [occluder],
    });

    expect(lettering.kind).toBe('mark');

    if (lettering.kind !== 'mark') return;

    expect(lettering.numberPx).toBe(LETTERING_LOOK.numberMinPx);
    expect(lettering.anchor[1]).toBe(120);
  });
});
