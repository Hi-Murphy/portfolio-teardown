import { VIEW, type ProjectLayout } from '../layout';
import {
  compactColumn,
  compactColumnAtRest,
  compactColumnTextScale,
  type CompactColumnLayer,
} from '../lettering/column';
import { layerLetteringModel, type LayerLetteringInput } from '../lettering/layers';
import { LETTERING_LOOK } from '../lettering/look';
import { letteringModel, type LetteringModelComponent } from '../lettering/model';
import { letterPartAvoiding, textWidth } from '../lettering/place';
import { scrollExtent } from '../interaction/scroll';
import { calloutMode } from '../overlay/columns';
import { overlayBaseModel, type OverlayBaseModelInput, type OverlayModel } from '../overlay/model';
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
import { quadsIntersect } from './sweep';

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

const PRIORITY: Readonly<Record<LabelKind, LabelPriority>> = {
  titleblock: 0,
  'column-layer': 1,
  'column-part': 1,
  'column-rail': 1,
  'column-footprint': 1,
  plate: 2,
  face: 3,
  'compact-row': 4,
  mark: 5,
  'callout-layer': 6,
  'callout-part': 6,
  dimension: 6,
  tag: 6,
};

function item(
  key: string,
  kind: LabelKind,
  quad: LabelQuad,
  visible: boolean,
  source: LabelItem['source'],
): LabelItem {
  return { key, kind, quad, priority: PRIORITY[kind], visible, source };
}

function box(label: {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}): LabelQuad {
  return axisQuad(label.x, label.y, label.w, label.h);
}

/** Every label the two layers would paint, in content space, with its RFC §3.1 priority. */
export function labelItems(
  input: LabelPassInput,
  overlay: OverlayModel,
  lettering: LetteringPassResult | null,
): LabelItem[] {
  const output: LabelItem[] = [];
  const columns = overlay.calloutMode === 'columns';
  const shown = input.target === 'exploded';

  if (overlay.titleBlock) {
    output.push(
      item('titleblock', 'titleblock', box(overlay.titleBlock), overlay.shown, 'overlay'),
    );
  }

  for (const label of overlay.labels) {
    const kind: LabelKind = columns
      ? label.key === 'dimension:stack'
        ? 'column-rail'
        : label.key === 'dimension:footprint'
          ? 'column-footprint'
          : label.kind === 'layer'
            ? 'column-layer'
            : 'column-part'
      : label.kind === 'layer'
        ? 'callout-layer'
        : label.kind === 'dimension'
          ? 'dimension'
          : 'tag';
    // C7: a layer callout is CSS-hidden where its plate name is painted; C5: tags are never painted.
    const plateHidesLayer =
      label.kind === 'layer' &&
      lettering?.layersShown === true &&
      lettering.layerLabels.some(
        (plate) => plate.kind === 'face' && `layer:${plate.id}` === label.key,
      );

    output.push(item(label.key, kind, box(label), !plateHidesLayer && kind !== 'tag', 'overlay'));
  }

  if (lettering === null) return output;

  for (const { id, lettering: placed } of lettering.items) {
    output.push(
      placed.kind === 'face'
        ? item(`part:${id}`, 'face', placed.screen, shown, 'lettering')
        : item(
            `part:${id}`,
            'mark',
            matrixQuad(placed.matrix, placed.box.w, placed.box.h),
            shown,
            'lettering',
          ),
    );
  }

  for (const plate of lettering.layerLabels) {
    if (plate.kind === 'face') {
      output.push(item(`layer:${plate.id}`, 'plate', plate.screen, shown, 'lettering'));
    }
  }

  const column = lettering.column;

  if (column !== null) {
    const rowWidth = Math.max(0, input.viewport.width - LETTERING_LOOK.columnInsetPx - column.x);

    for (const row of column.rows) {
      const width = Math.max(
        ...row.lines.map((line) => textWidth(line, LETTERING_LOOK.compactColumnPx, LETTERING_LOOK)),
      );
      const scale = compactColumnTextScale(row.lines, rowWidth, LETTERING_LOOK);

      output.push(
        item(
          `part:${row.id}`,
          'compact-row',
          axisQuad(column.x, row.y, Math.min(rowWidth, width) * scale, row.h),
          shown,
          'lettering',
        ),
      );
    }
  }

  return output;
}

function hits(quad: LabelQuad, others: readonly LabelQuad[]): boolean {
  return others.some((other) => quadsIntersect(quad, other));
}

export function labelPass(input: LabelPassInput): LabelPassResult {
  const baseInput: OverlayBaseModelInput = {
    frame: input.frame,
    layout: input.layout,
    project: input.project,
    viewport: input.viewport,
    offsetY: input.offsetY,
    target: input.target,
    look: input.look,
  };
  let overlay = overlayBaseModel(baseInput);
  let lettering: LetteringPassResult | null = null;
  let components: readonly LetteringModelComponent[] = [];
  let layerInput: LayerLetteringInput | null = null;

  if (input.faces) {
    const names = componentNames(input.project);
    components = input.layout.components.map((component, index) => {
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
        : calloutMode(input.frame, input.layout, input.project, input.viewport, input.look);
    const column =
      mode === 'tags' && compactColumnAtRest({ offsetY: input.offsetY, extentPx })
        ? compactColumn({
            canvas: input.viewport,
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
    layerInput = {
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
    };
    const layerLabels = layersShown ? layerLetteringModel(layerInput) : [];

    lettering = { items, column, layerLabels, layersShown };
  }

  // RFC §3.3: each family keeps its S15 output unless it overlaps a higher-priority label.
  let labels = labelItems(input, overlay, lettering);
  const quads = (keep: (label: LabelItem) => boolean): LabelQuad[] =>
    labels.filter((label) => label.visible && keep(label)).map((label) => label.quad);

  if (lettering !== null && layerInput !== null && input.target === 'exploded') {
    // P2: plate names avoid the columns and each other.
    const columnQuads = quads((label) => label.priority === 1);
    const plates = quads((label) => label.kind === 'plate');

    if (plates.some((plate, index) => hits(plate, [...columnQuads, ...plates.slice(0, index)]))) {
      lettering = {
        ...lettering,
        layerLabels: layerLetteringModel({ ...layerInput, obstacles: columnQuads }),
      };
      labels = labelItems(input, overlay, lettering);
    }

    // P5: a mark that overlaps a higher-priority label or an earlier mark is re-placed or hidden.
    const taken = quads((label) => label.priority < 5);
    let moved = false;
    const items = lettering.items.flatMap((entry, index) => {
      const placed = entry.lettering;

      if (placed.kind === 'face') return [entry];

      const quad = matrixQuad(placed.matrix, placed.box.w, placed.box.h);

      if (!hits(quad, taken)) {
        taken.push(quad);
        return [entry];
      }

      const component = components[index]!;
      const occluders = [
        ...components.filter((other) => other.layerIndex < component.layerIndex),
        ...input.frame.layers.filter((layer) => layer.index < component.layerIndex),
      ].map((other) => ('hull' in other ? other.hull : other.corners));
      const replaced = letterPartAvoiding({
        quad: component.quad,
        number: entry.number,
        name: null,
        occluders,
        obstacles: taken,
      });

      moved = true;
      if (replaced === null) return [];
      taken.push(
        replaced.kind === 'face'
          ? replaced.screen
          : matrixQuad(replaced.matrix, replaced.box.w, replaced.box.h),
      );

      return [{ ...entry, lettering: replaced }];
    });

    if (moved) {
      lettering = { ...lettering, items };
      labels = labelItems(input, overlay, lettering);
    }
  }

  // P6: S6 callouts and dimension notes avoid every visible plate name, face, row and mark.
  const lower = quads((label) => label.priority > 1 && label.priority < 6);

  if (labels.some((label) => label.visible && label.priority === 6 && hits(label.quad, lower))) {
    overlay = overlayBaseModel({ ...baseInput, extraObstacles: lower });
    labels = labelItems(input, overlay, lettering);
  }

  // Guarantee: whatever still overlaps a higher-priority label is hidden and counted.
  const accepted: LabelQuad[] = [];
  const gone = new Set<string>();

  for (const label of labels
    .filter((candidate) => candidate.visible)
    .sort((left, right) => left.priority - right.priority)) {
    if (hits(label.quad, accepted)) {
      gone.add(`${label.source === 'overlay' ? 'overlay' : label.kind}|${label.key}`);
    } else {
      accepted.push(label.quad);
    }
  }

  if (gone.size > 0) {
    const kept = (kind: string, key: string): boolean => !gone.has(`${kind}|${key}`);
    const labelsKept = overlay.labels.filter((label) => kept('overlay', label.key));

    overlay = {
      ...overlay,
      labels: labelsKept,
      hidden: overlay.hidden + overlay.labels.length - labelsKept.length,
    };

    if (lettering !== null) {
      lettering = {
        ...lettering,
        items: lettering.items.filter(
          ({ id }) => kept('face', `part:${id}`) && kept('mark', `part:${id}`),
        ),
        layerLabels: lettering.layerLabels.filter((plate) => kept('plate', `layer:${plate.id}`)),
        column:
          lettering.column === null
            ? null
            : {
                ...lettering.column,
                rows: lettering.column.rows.filter((row) => kept('compact-row', `part:${row.id}`)),
              },
      };
    }

    labels = labelItems(input, overlay, lettering);
  }

  passCounter += 1;

  return {
    overlay,
    lettering,
    labels,
    guarded: gone.size,
    pass: passCounter,
    target: input.target,
  };
}
