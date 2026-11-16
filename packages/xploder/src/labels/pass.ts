import { VIEW, type ProjectLayout } from '../layout';
import {
  compactColumn,
  compactColumnAtRest,
  compactColumnTextScale,
  type CompactColumnLayer,
} from '../lettering/column';
import { layerLetteringModel } from '../lettering/layers';
import { LETTERING_LOOK } from '../lettering/look';
import { letteringModel } from '../lettering/model';
import { textWidth } from '../lettering/place';
import { scrollExtent } from '../interaction/scroll';
import { calloutMode } from '../overlay/columns';
import { overlayBaseModel, type OverlayLabel, type OverlayModel } from '../overlay/model';
import { partShortText } from '../overlay/parts';
import type { OverlayFrame, Vec2 } from '../overlay/project';
import { faceLetteringAllOrNone } from '../react/lettering/faceNames';
import type { ViewerProject } from '../react/useTeardownViewer';

import type {
  LabelItem,
  LabelKind,
  LabelPassInput,
  LabelPassResult,
  LabelPriority,
  LabelQuad,
  LetteringPassResult,
} from './types';

let passCounter = 0;

function componentNames(project: ViewerProject): ReadonlyMap<string, string> {
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

  if (!Number.isFinite(top) || !Number.isFinite(bottom)) return Number.POSITIVE_INFINITY;

  return scrollExtent(top, bottom, height, VIEW.fitMargin * height);
}

function columnLayers(
  frame: OverlayFrame,
  layout: ProjectLayout,
  names: ReadonlyMap<string, string>,
): readonly CompactColumnLayer[] {
  return frame.layers.map((layer) => ({
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
}

function arrayPoint(point: Vec2): Vec2 {
  return [point[0], point[1]];
}

function axisQuad(x: number, y: number, w: number, h: number): LabelQuad {
  return [
    [x, y],
    [x + w, y],
    [x + w, y + h],
    [x, y + h],
  ];
}

function matrixQuad(
  matrix: readonly [number, number, number, number, number, number],
  w: number,
  h: number,
): LabelQuad {
  const [a, b, c, d, e, f] = matrix;

  return [
    [e, f],
    [e + w * a, f + w * b],
    [e + w * a + h * c, f + w * b + h * d],
    [e + h * c, f + h * d],
  ];
}

function overlayKind(label: OverlayLabel, mode: 'columns' | 'tags' | null): LabelKind | null {
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

function priority(kind: LabelKind): LabelPriority {
  switch (kind) {
    case 'titleblock':
      return 0;
    case 'column-layer':
    case 'column-part':
    case 'column-rail':
    case 'column-footprint':
      return 1;
    case 'plate':
      return 2;
    case 'face':
      return 3;
    case 'compact-row':
      return 4;
    case 'mark':
      return 5;
    case 'callout-layer':
    case 'callout-part':
    case 'dimension':
    case 'tag':
      return 6;
  }
}

function overlayLabels(
  overlay: OverlayModel,
  mode: OverlayModel['calloutMode'],
  lettering: LetteringPassResult | null,
  output: LabelItem[],
): void {
  for (const label of overlay.labels) {
    const kind = overlayKind(label, mode);

    if (kind === null) continue;

    const plateHidesLayer =
      label.key.startsWith('layer:') &&
      lettering?.layersShown === true &&
      lettering.layerLabels.some(
        (candidate) => candidate.kind === 'face' && `layer:${candidate.id}` === label.key,
      );
    const tagHidesPart = label.key.startsWith('part:') && mode === 'tags';

    output.push({
      key: label.key,
      kind,
      quad: axisQuad(label.x, label.y, label.w, label.h),
      priority: priority(kind),
      visible: !plateHidesLayer && !tagHidesPart,
      source: 'overlay',
    });
  }
}

function letteringLabels(
  input: LabelPassInput,
  lettering: LetteringPassResult,
  output: LabelItem[],
): void {
  const visible = input.target === 'exploded';

  for (const item of lettering.items) {
    if (item.lettering.kind === 'face') {
      output.push({
        key: `part:${item.id}`,
        kind: 'face',
        quad: item.lettering.screen,
        priority: 3,
        visible,
        source: 'lettering',
      });
    } else {
      output.push({
        key: `part:${item.id}`,
        kind: 'mark',
        quad: matrixQuad(item.lettering.matrix, item.lettering.box.w, item.lettering.box.h),
        priority: 5,
        visible,
        source: 'lettering',
      });
    }
  }

  for (const label of lettering.layerLabels) {
    if (label.kind !== 'face') continue;

    output.push({
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

      output.push({
        key: `part:${row.id}`,
        kind: 'compact-row',
        quad: axisQuad(lettering.column.x, row.y, Math.min(rowWidth, maxTextWidth) * scale, row.h),
        priority: 4,
        visible,
        source: 'lettering',
      });
    }
  }
}

export function labelPass(input: LabelPassInput): LabelPassResult {
  const overlay = overlayBaseModel({
    frame: input.frame,
    layout: input.layout,
    project: input.project,
    viewport: { width: input.viewport.width, height: input.viewport.height },
    offsetY: input.offsetY,
    target: input.target,
    look: input.look,
  });
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

  let lettering: LetteringPassResult | null = null;

  if (input.faces !== null) {
    const names = componentNames(input.project);
    const components = input.layout.components.map((component, index) => {
      const frameComponent = input.frame.components[index];
      const face = input.faces?.[index];

      if (frameComponent === undefined) {
        throw new Error(`Missing overlay component ${component.id}`);
      }
      if (face === undefined) {
        throw new Error(`Missing face quad ${component.id}`);
      }

      return {
        id: component.id,
        layerIndex: component.layerIndex,
        slot: component.slot,
        quad: face,
        hull: frameComponent.hull,
      };
    });
    const columnLayersValue = columnLayers(input.frame, input.layout, names);
    const maxX = drawingMaxX(input.frame);
    const extentPx = input.extentPx ?? frameExtent(input.frame, input.viewport.height);
    const mode =
      input.offsetY === 0 && overlay.calloutMode !== null
        ? overlay.calloutMode
        : calloutMode(
            input.frame,
            input.layout,
            input.project,
            { width: input.viewport.width, height: input.viewport.height },
            input.look,
          );
    const column =
      mode === 'tags' && compactColumnAtRest({ offsetY: input.offsetY, extentPx })
        ? compactColumn({
            canvas: { width: input.viewport.width, height: input.viewport.height },
            layers: columnLayersValue,
            drawingMaxX: maxX,
            look: LETTERING_LOOK,
          })
        : null;
    const items = faceLetteringAllOrNone({
      zoomFactor: input.zoomFactor,
      columnActive: column !== null,
      names,
      build: (faceNames) =>
        letteringModel({
          layout: input.layout,
          components,
          layers: input.frame.layers,
          names: faceNames,
        }),
    });
    const layersShown = mode === 'tags' || extentPx > 1e-9;
    const layerLabels = layersShown
      ? layerLetteringModel({
          layers: input.frame.layers.map((layer) => ({
            id: layer.id,
            index: layer.index,
            name: input.project.layers[layer.index]?.name ?? layer.id,
            corners: layer.corners,
          })),
          components: input.frame.components.map((component) => ({
            layerIndex: component.layerIndex,
            hull: component.hull.map(arrayPoint),
          })),
          canvasWidth: input.viewport.width,
        })
      : [];

    lettering = { items, column, layerLabels, layersShown };
  }

  overlayLabels(overlay, overlay.calloutMode, lettering, labels);
  if (lettering !== null) letteringLabels(input, lettering, labels);

  passCounter += 1;

  return {
    overlay,
    lettering,
    labels,
    pass: passCounter,
    target: input.target,
  };
}
