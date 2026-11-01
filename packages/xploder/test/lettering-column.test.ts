import { describe, expect, test } from 'vitest';

import { parseProject, parseTechRegistry, type Project } from '../src/index';
import { scrollExtent } from '../src/interaction/scroll';
import { fitZoom, layoutProject, VIEW, type ProjectLayout } from '../src/layout';
import {
  compactColumn,
  compactColumnAtRest,
  compactColumnTextScale,
} from '../src/lettering/column';
import { LETTERING_LOOK } from '../src/lettering/look';
import { layerLetteringModel } from '../src/lettering/layers';
import { convexPolygonsIntersect, textWidth } from '../src/lettering/place';
import { resolveViewerLayoutOptions } from '../src/look/product';
import { layerText, partShortText } from '../src/overlay/parts';
import { overlayFrame, type OverlayFrame } from '../src/overlay/project';
import { projectAJson, projectBJson, projectCJson, techRegistryJson } from './fixtures';

const registry = parseTechRegistry(techRegistryJson);
const PROJECTS = [
  ['A', parseProject(projectAJson, { registry })],
  ['B', parseProject(projectBJson, { registry })],
  ['C', parseProject(projectCJson, { registry })],
] as const satisfies readonly (readonly [string, Project])[];
const CANVASES = [
  { width: 328, height: 444 },
  { width: 358, height: 506 },
] as const;
const AZIMUTHS = [0, 1, 2, 3].map((index) => VIEW.baseAzimuth + index * VIEW.snap);

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

function namesFor(project: Project): ReadonlyMap<string, string> {
  const names = new Map<string, string>();

  for (const layer of project.layers) {
    for (const component of layer.components) {
      names.set(component.id, component.name ?? component.id);
    }
  }

  return names;
}

function drawingMaxX(frame: OverlayFrame): number {
  let max = -Infinity;

  for (const layer of frame.layers) {
    for (const corner of layer.corners) max = Math.max(max, corner[0]);
  }

  for (const component of frame.components) {
    for (const point of component.hull) max = Math.max(max, point[0]);
  }

  return max;
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

  return scrollExtent(top, bottom, height, VIEW.fitMargin * height);
}

describe('compact phone part column', () => {
  test.each(PROJECTS)(
    'fits every %s component label at zoom 1 on both phone canvases',
    (fixture, project) => {
      const layout = layoutProject(project, resolveViewerLayoutOptions());
      const names = namesFor(project);
      let wrappedRows = 0;
      let twoLineRows = 0;

      for (const canvas of CANVASES) {
        for (const azimuth of AZIMUTHS) {
          const view = viewFor(canvas, 1, azimuth, layout);
          const frame = overlayFrame(layout, 1, view);
          const maxX = drawingMaxX(frame);
          const layers = frame.layers.map((layer) => ({
            index: layer.index,
            corners: layer.corners,
            partLabels: layout.components
              .filter((component) => component.layerIndex === layer.index)
              .sort((left, right) => left.slot - right.slot)
              .map((component) => ({
                id: component.id,
                number: partShortText(layer.index, component.slot),
                name: names.get(component.id) ?? component.id,
              })),
          }));
          const column = compactColumn({
            canvas,
            layers,
            drawingMaxX: maxX,
            look: LETTERING_LOOK,
          });
          const context = `${fixture} ${canvas.width}x${canvas.height} azimuth=${azimuth}`;

          expect(column, context).not.toBeNull();

          if (column === null) continue;

          expect(column.rows, context).toHaveLength(frame.components.length);
          expect(column.x, context).toBeGreaterThan(maxX);

          const availableWidth = canvas.width - LETTERING_LOOK.columnInsetPx - column.x;

          for (const row of column.rows) {
            const rowContext = `${context} ${row.id}`;
            const widths = row.lines.map((line) =>
              textWidth(line, LETTERING_LOOK.compactColumnPx, LETTERING_LOOK),
            );
            const oneLine = `${row.number} ${names.get(row.id) ?? row.id}`;
            const scale = compactColumnTextScale(row.lines, availableWidth, LETTERING_LOOK);

            expect(row.lines.length, rowContext).toBeGreaterThan(0);
            expect(row.lines.length, rowContext).toBeLessThanOrEqual(LETTERING_LOOK.columnMaxLines);
            expect(row.y, rowContext).toBeGreaterThanOrEqual(LETTERING_LOOK.columnInsetPx);
            expect(row.y + row.h, rowContext).toBeLessThanOrEqual(
              canvas.height - LETTERING_LOOK.columnInsetPx,
            );
            expect(column.x + Math.max(...widths) * scale, rowContext).toBeLessThanOrEqual(
              canvas.width - LETTERING_LOOK.columnInsetPx,
            );
            expect(scale, rowContext).toBeGreaterThan(0);

            if (
              textWidth(oneLine, LETTERING_LOOK.compactColumnPx, LETTERING_LOOK) > availableWidth
            ) {
              wrappedRows += 1;
            }

            if (row.lines.length === 2) twoLineRows += 1;
          }

          for (let index = 0; index < column.rows.length; index += 1) {
            const row = column.rows[index];

            if (row === undefined) continue;

            for (let otherIndex = index + 1; otherIndex < column.rows.length; otherIndex += 1) {
              const other = column.rows[otherIndex];

              if (other === undefined) continue;

              expect(
                row.y + row.h <= other.y || other.y + other.h <= row.y,
                `${context} ${row.id} overlaps ${other.id}`,
              ).toBe(true);
            }
          }
        }
      }

      console.log(`compact-column ${fixture}: wrapped=${wrappedRows} two-line=${twoLineRows}`);
      expect(wrappedRows, `${fixture} uses wrapping`).toBeGreaterThan(0);
      expect(twoLineRows, `${fixture} uses two lines`).toBeGreaterThan(0);
    },
  );

  test('is hidden by the offset/extent rule at the first zoom notch', () => {
    const project = PROJECTS[0]?.[1];
    const canvas = CANVASES[1];

    if (project === undefined || canvas === undefined) throw new Error('Missing fixture A');

    const layout = layoutProject(project, resolveViewerLayoutOptions());
    const restFrame = overlayFrame(layout, 1, viewFor(canvas, 1, VIEW.baseAzimuth, layout));
    const zoomedFrame = overlayFrame(layout, 1, viewFor(canvas, 1.5625, VIEW.baseAzimuth, layout));
    const restExtent = frameExtent(restFrame, canvas.height);
    const zoomedExtent = frameExtent(zoomedFrame, canvas.height);

    expect(restExtent).toBe(0);
    expect(zoomedExtent).toBeGreaterThan(0);
    expect(compactColumnAtRest({ offsetY: 0, extentPx: restExtent })).toBe(true);
    expect(compactColumnAtRest({ offsetY: 0, extentPx: zoomedExtent })).toBe(false);
    expect(compactColumnAtRest({ offsetY: -zoomedExtent / 2, extentPx: zoomedExtent })).toBe(false);
  });
});

describe('zoomed layer lettering', () => {
  test.each(PROJECTS)('labels every %s layer without touching upper hulls', (fixture, project) => {
    const layout = layoutProject(project, resolveViewerLayoutOptions());
    let faceLabels = 0;
    let plainLabels = 0;

    for (const canvas of CANVASES) {
      for (const azimuth of AZIMUTHS) {
        const frame = overlayFrame(layout, 1, viewFor(canvas, 1.5625, azimuth, layout));
        const labels = layerLetteringModel({
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
        });
        const context = `${fixture} ${canvas.width}x${canvas.height} azimuth=${azimuth}`;

        expect(labels, context).toHaveLength(frame.layers.length);

        for (const label of labels) {
          const layer = project.layers[label.layerIndex];

          if (layer === undefined) throw new Error(`Missing layer ${label.layerIndex}`);

          expect(label.text, context).toBe(
            layerText(label.layerIndex, layer.name ?? layer.id).toUpperCase(),
          );

          if (label.kind === 'plain') {
            plainLabels += 1;
            continue;
          }

          faceLabels += 1;

          for (const point of label.screen) {
            expect(point[0], `${context} ${label.id} on screen`).toBeGreaterThanOrEqual(0);
            expect(point[0], `${context} ${label.id} on screen`).toBeLessThanOrEqual(canvas.width);
          }

          for (const component of frame.components) {
            if (component.layerIndex > label.layerIndex) continue;

            expect(
              convexPolygonsIntersect(label.screen, component.hull),
              `${context} ${label.id} touches ${component.id}`,
            ).toBe(false);
          }
        }
      }
    }

    console.log(`layer-lettering ${fixture}: face=${faceLabels} plain=${plainLabels}`);
    expect(faceLabels + plainLabels).toBeGreaterThan(0);
  });
});
