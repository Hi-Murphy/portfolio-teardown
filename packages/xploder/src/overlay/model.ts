import type { Phase } from '../engine/explode';
import type { ProjectLayout } from '../layout';
import { look, type LookTokens } from '../look/tokens';
import type { MotionTokens } from '../motion';
import { emphasis } from '../motion/emphasis';
import type { PaletteRole } from '../theme';

import { footprintDimension, stackDimension, type DimensionSegment } from './dimension';
import { layerText, partShortText, partText } from './parts';
import { placeLabels, type LabelKind, type PlacementLabel } from './place';
import type { OverlayFrame, Vec2 } from './project';
import { traceTiming } from './timing';
import { placeTitleBlock, titleBlockBox, titleBlockLines } from './titleBlock';
import { traceRoute, type TraceHop } from './trace';

export type OverlayState = 'imploded' | 'exploded';
export type OverlayTourStatus = 'idle' | 'playing' | 'paused' | 'ended';

export function overlayVisible({
  moving,
  settledTarget,
  target,
  phase,
}: {
  readonly moving: boolean;
  readonly settledTarget: 'imploded' | 'exploded' | null;
  readonly target: 'imploded' | 'exploded';
  readonly phase: Phase | null;
}): boolean {
  return !moving && settledTarget !== null && settledTarget === target && phase === target;
}

export interface OverlayProject {
  readonly meta: {
    readonly slug: string;
    readonly name?: string;
  };
  readonly layers: readonly {
    readonly id: string;
    readonly name?: string;
    readonly components: readonly {
      readonly id: string;
      readonly name?: string;
    }[];
  }[];
}

export interface OverlayViewport {
  readonly width: number;
  readonly height: number;
}

export interface OverlayFocus {
  readonly layerId: string | null;
  readonly suspended: boolean;
}

export interface OverlayLabel {
  readonly key: string;
  readonly kind: LabelKind;
  readonly layerIndex: number | null;
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
  readonly text: string;
  readonly srText?: string;
  readonly opacity: number;
}

export type OverlayStrokeKind =
  | 'stack-rail'
  | 'stack-tick'
  | 'stack-extension'
  | 'footprint-line'
  | 'footprint-tick'
  | 'footprint-extension'
  | 'leader';

export interface OverlayStroke {
  readonly key: string;
  readonly kind: OverlayStrokeKind;
  readonly points: readonly [Vec2, Vec2];
  readonly role: PaletteRole;
  readonly opacity: number;
}

export interface OverlayTitleBlockRow {
  readonly layerIndex: number;
  readonly text: string;
  readonly opacity: number;
}

export interface OverlayTitleBlock {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
  readonly title: string;
  readonly meta: string;
  readonly rows: readonly OverlayTitleBlockRow[];
}

export interface OverlayModel {
  readonly labels: readonly OverlayLabel[];
  readonly strokes: readonly OverlayStroke[];
  readonly titleBlock: OverlayTitleBlock | null;
  readonly hidden: number;
  readonly shown: boolean;
}

export interface OverlayModelInput {
  readonly frame: OverlayFrame;
  readonly layout: ProjectLayout;
  readonly project: OverlayProject;
  readonly viewport: OverlayViewport;
  readonly offsetY: number;
  readonly target: OverlayState;
  readonly tour: { readonly status: OverlayTourStatus };
  readonly focus: OverlayFocus;
  readonly look: LookTokens;
}

export interface TraceFlow {
  readonly path: readonly string[];
}

export interface TraceDraw {
  readonly ms: number;
  readonly delayMs: number;
}

export interface TraceModel {
  readonly vertices: readonly string[];
  readonly points: readonly Vec2[];
  readonly hops: readonly TraceHop[];
  readonly pads: readonly Vec2[];
  readonly current: Vec2 | null;
  readonly dot: boolean;
  readonly draw: TraceDraw | null;
  readonly dotPeriodMs: number;
}

export interface TraceModelInput {
  readonly frame: OverlayFrame;
  readonly flow: TraceFlow | undefined;
  readonly step: number;
  readonly status: OverlayTourStatus;
  readonly offsetY: number;
  readonly tokens: MotionTokens;
  readonly look: LookTokens;
}

interface LabelMeta {
  readonly layerIndex: number | null;
  readonly srText?: string;
}

const EMPTY_TRACE: TraceModel = {
  vertices: [],
  points: [],
  hops: [],
  pads: [],
  current: null,
  dot: false,
  draw: null,
  dotPeriodMs: 0,
};

function leftmost(corners: readonly Vec2[]): Vec2 {
  let result = corners[0];

  if (result === undefined) throw new Error('A layer needs projected corners.');

  for (const corner of corners) {
    if (corner[0] < result[0] || (corner[0] === result[0] && corner[1] < result[1])) {
      result = corner;
    }
  }

  return result;
}

export function overlayLabels(
  frame: OverlayFrame,
  layout: ProjectLayout,
  project: OverlayProject,
  viewport: { readonly width: number },
  state: OverlayState,
): readonly PlacementLabel[] {
  if (state === 'imploded') return [];

  const labels: PlacementLabel[] = [];

  frame.layers.forEach((layerFrame, layerIndex) => {
    const layer = project.layers[layerIndex];

    if (layer === undefined) throw new Error('Missing fixture layer.');

    labels.push({
      key: `layer:${layer.id}`,
      kind: 'layer',
      anchor: leftmost(layerFrame.corners),
      text: layerText(layerIndex, layer.name ?? layer.id),
      layerIndex,
    });
  });

  if (state === 'exploded') {
    const wide = viewport.width >= look.annotation.wideMinPx;

    frame.components.forEach((componentFrame) => {
      const component = project.layers[componentFrame.layerIndex]?.components[componentFrame.slot];

      if (component === undefined) throw new Error('Missing fixture component.');

      labels.push({
        key: `part:${component.id}`,
        kind: 'part',
        anchor: componentFrame.anchor,
        text: wide
          ? partText(componentFrame.layerIndex, componentFrame.slot, component.name ?? component.id)
          : partShortText(componentFrame.layerIndex, componentFrame.slot),
        shortText: partShortText(componentFrame.layerIndex, componentFrame.slot),
        layerIndex: componentFrame.layerIndex,
        slot: componentFrame.slot,
      });
    });
  }

  const stack = stackDimension(frame);
  const footprint = footprintDimension(frame, layout.footprint);

  labels.push(
    {
      key: 'dimension:stack',
      kind: 'dimension',
      anchor: stack.labelAnchor,
      text: stack.text,
    },
    {
      key: 'dimension:footprint',
      kind: 'dimension',
      anchor: footprint.labelAnchor,
      text: footprint.text,
    },
  );

  return labels;
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

function stroke(
  key: string,
  kind: OverlayStrokeKind,
  segment: DimensionSegment,
  role: PaletteRole,
  opacity: number,
  offsetY: number,
): OverlayStroke {
  return {
    key,
    kind,
    points: [shiftPoint(segment.from, offsetY), shiftPoint(segment.to, offsetY)],
    role,
    opacity,
  };
}

export function overlayModel({
  frame,
  layout,
  project,
  viewport,
  offsetY,
  target,
  tour,
  focus,
  look,
}: OverlayModelInput): OverlayModel {
  if (tour.status !== 'idle') {
    return { labels: [], strokes: [], titleBlock: null, hidden: 0, shown: false };
  }

  const viewportFrame = shiftFrame(frame, -offsetY);
  const focusActive = focus.layerId !== null && !focus.suspended;
  const opacityForLayer = (layerIndex: number | null): number => {
    if (!focusActive || layerIndex === null) return 1;

    return project.layers[layerIndex]?.id === focus.layerId ? 1 : emphasis.dim.level;
  };

  if (target === 'imploded') {
    const lines = titleBlockLines(project, layout);
    const placement = placeTitleBlock(titleBlockBox(lines, look), viewportFrame, viewport, look);

    if (placement === null) {
      return { labels: [], strokes: [], titleBlock: null, hidden: 0, shown: false };
    }

    return {
      labels: [],
      strokes: [],
      titleBlock: {
        x: placement.x,
        y: placement.y + offsetY,
        w: placement.w,
        h: placement.h,
        title: lines.title,
        meta: lines.meta,
        rows: lines.rows.map((text, layerIndex) => ({
          layerIndex,
          text,
          opacity: opacityForLayer(layerIndex),
        })),
      },
      hidden: 0,
      shown: true,
    };
  }

  const labels = overlayLabels(viewportFrame, layout, project, viewport, target);
  const wide = viewport.width >= look.annotation.wideMinPx;
  const meta = new Map<string, LabelMeta>();

  for (const label of labels) {
    if (label.kind !== 'part' || label.layerIndex === undefined || label.slot === undefined) {
      meta.set(label.key, { layerIndex: label.layerIndex ?? null });
      continue;
    }

    const component = project.layers[label.layerIndex]?.components[label.slot];

    meta.set(label.key, {
      layerIndex: label.layerIndex,
      srText: wide ? undefined : (component?.name ?? component?.id),
    });
  }

  const result = placeLabels(
    labels,
    viewportFrame.components.map((component) => component.hull),
    viewport,
    look,
  );
  const renderLabels = result.placements.map((placement): OverlayLabel => {
    const labelMeta = meta.get(placement.key);

    if (labelMeta === undefined) throw new Error('Missing placed label metadata.');

    return {
      key: placement.key,
      kind: placement.kind,
      layerIndex: labelMeta.layerIndex,
      x: placement.x,
      y: placement.y + offsetY,
      w: placement.w,
      h: placement.h,
      text: placement.text,
      ...(labelMeta.srText === undefined ? {} : { srText: labelMeta.srText }),
      opacity: opacityForLayer(labelMeta.layerIndex),
    };
  });
  const stack = stackDimension(viewportFrame);
  const footprint = footprintDimension(viewportFrame, layout.footprint);
  const strokes: OverlayStroke[] = [
    stroke('stack:rail', 'stack-rail', stack.rail, look.annotation.dimensionRole, 1, offsetY),
    ...stack.ticks.map((tick, index) =>
      stroke(`stack:tick:${index}`, 'stack-tick', tick, look.annotation.dimensionRole, 1, offsetY),
    ),
    ...stack.extensionLines.map((line, index) =>
      stroke(
        `stack:extension:${index}`,
        'stack-extension',
        line,
        look.annotation.dimensionRole,
        1,
        offsetY,
      ),
    ),
    stroke(
      'footprint:line',
      'footprint-line',
      footprint.line,
      look.annotation.dimensionRole,
      1,
      offsetY,
    ),
    ...footprint.ticks.map((tick, index) =>
      stroke(
        `footprint:tick:${index}`,
        'footprint-tick',
        tick,
        look.annotation.dimensionRole,
        1,
        offsetY,
      ),
    ),
    ...footprint.extensionLines.map((line, index) =>
      stroke(
        `footprint:extension:${index}`,
        'footprint-extension',
        line,
        look.annotation.dimensionRole,
        1,
        offsetY,
      ),
    ),
  ];

  for (const placement of result.placements) {
    if (placement.leader === null) continue;

    const labelMeta = meta.get(placement.key);

    if (labelMeta === undefined) throw new Error('Missing placed label metadata.');

    strokes.push(
      stroke(
        `leader:${placement.key}`,
        'leader',
        placement.leader,
        look.annotation.leaderRole,
        opacityForLayer(labelMeta.layerIndex),
        offsetY,
      ),
    );
  }

  return {
    labels: renderLabels,
    strokes,
    titleBlock: null,
    hidden: result.hidden.length,
    shown: true,
  };
}

export function traceVertices(
  status: OverlayTourStatus,
  flow: TraceFlow | undefined,
  step: number,
): readonly string[] {
  return status === 'idle' || flow === undefined ? [] : flow.path.slice(0, step + 1);
}

export function traceModel(input: TraceModelInput): TraceModel {
  const timing = traceTiming(input.tokens);
  const flow = input.flow;

  if (flow === undefined || traceVertices(input.status, flow, input.step).length === 0) {
    return { ...EMPTY_TRACE, dotPeriodMs: timing.dotPeriodMs };
  }

  const anchors = new Map<string, Vec2>();

  for (const component of input.frame.components) {
    anchors.set(component.id, component.anchor);
  }

  const route = traceRoute(flow.path, input.step, anchors);

  const pads = route.vertices.map((vertex) => {
    const anchor = anchors.get(vertex);

    if (anchor === undefined) throw new Error(`Missing overlay anchor for "${vertex}".`);

    return anchor;
  });
  const current = pads[pads.length - 1] ?? null;
  const draw =
    timing.drawMs > 0 && route.hops.length > 0
      ? { ms: timing.drawMs, delayMs: timing.delayMs }
      : null;

  return {
    vertices: route.vertices,
    points: route.points,
    hops: route.hops,
    pads,
    current,
    dot: input.status === 'playing' && timing.dotPeriodMs > 0 && route.hops.length > 0,
    draw,
    dotPeriodMs: timing.dotPeriodMs,
  };
}
