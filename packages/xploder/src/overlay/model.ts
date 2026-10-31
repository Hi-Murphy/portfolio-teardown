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
import { placeTitleBlockResponsive, titleBlockLines } from './titleBlock';
import { traceRoute, type TraceHop } from './trace';

export type OverlayState = 'imploded' | 'exploded';
export type OverlayTourStatus = 'idle' | 'playing' | 'paused' | 'ended';

export function overlayVisible({
  moving,
  settledTarget,
  target,
  phase,
  layoutMatches,
}: {
  readonly moving: boolean;
  readonly settledTarget: 'imploded' | 'exploded' | null;
  readonly target: 'imploded' | 'exploded';
  readonly phase: Phase | null;
  readonly layoutMatches: boolean;
}): boolean {
  return (
    layoutMatches &&
    !moving &&
    settledTarget !== null &&
    settledTarget === target &&
    phase === target
  );
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
  readonly columns: number;
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

const STACK_LABEL_ANCHOR_TS = [0.35, 0.65, 0.2, 0.8, 0.1, 0.9, 0, 1] as const;

function leftmost(corners: readonly Vec2[]): Vec2 | null {
  let result = corners[0];

  if (result === undefined) return null;

  for (const corner of corners) {
    if (corner[0] < result[0] || (corner[0] === result[0] && corner[1] < result[1])) {
      result = corner;
    }
  }

  return result;
}

function railPoint(from: Vec2, to: Vec2, t: number): Vec2 {
  return [from[0] + (to[0] - from[0]) * t, from[1] + (to[1] - from[1]) * t];
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

  frame.layers.forEach((layerFrame) => {
    const layerIndex = project.layers.findIndex((layer) => layer.id === layerFrame.id);
    const layer = project.layers[layerIndex];
    const anchor = leftmost(layerFrame.corners);

    if (layer === undefined || anchor === null) return;

    labels.push({
      key: `layer:${layer.id}`,
      kind: 'layer',
      anchor,
      text: layerText(layerIndex, layer.name ?? layer.id),
      layerIndex,
    });
  });

  if (state === 'exploded') {
    const wide = viewport.width >= look.annotation.wideMinPx;

    frame.components.forEach((componentFrame) => {
      const layerIndex = project.layers.findIndex((layer) => layer.id === componentFrame.layerId);
      const layer = project.layers[layerIndex];

      if (layer === undefined) return;

      const slot = layer.components.findIndex((component) => component.id === componentFrame.id);
      const component = layer.components[slot];

      if (component === undefined) return;

      labels.push({
        key: `part:${component.id}`,
        kind: 'part',
        anchor: componentFrame.anchor,
        text: wide
          ? partText(layerIndex, slot, component.name ?? component.id)
          : partShortText(layerIndex, slot),
        shortText: partShortText(layerIndex, slot),
        layerIndex,
        slot,
      });
    });
  }

  const stack = stackDimension(frame);
  const footprint = footprintDimension(frame, layout.footprint);
  const stackAnchors = STACK_LABEL_ANCHOR_TS.map((t) =>
    railPoint(stack.rail.from, stack.rail.to, t),
  );

  labels.push(
    {
      key: 'dimension:stack',
      kind: 'dimension',
      anchor: stack.labelAnchor,
      anchors: stackAnchors,
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
    const layoutResult = placeTitleBlockResponsive(lines, viewportFrame, viewport, look);

    if (layoutResult === null) {
      return { labels: [], strokes: [], titleBlock: null, hidden: 0, shown: false };
    }

    const { placement, columns } = layoutResult;

    return {
      labels: [],
      strokes: [],
      titleBlock: {
        x: placement.x,
        y: placement.y + offsetY,
        w: placement.w,
        h: placement.h,
        columns,
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
  const requestedVertices = flow === undefined ? [] : traceVertices(input.status, flow, input.step);

  if (flow === undefined || requestedVertices.length === 0) {
    return { ...EMPTY_TRACE, dotPeriodMs: timing.dotPeriodMs };
  }

  const anchors = new Map<string, Vec2>();

  for (const component of input.frame.components) {
    anchors.set(component.id, component.anchor);
  }

  const vertices = requestedVertices.filter((vertex) => anchors.has(vertex));

  if (vertices.length === 0) {
    return { ...EMPTY_TRACE, dotPeriodMs: timing.dotPeriodMs };
  }

  const route = traceRoute(vertices, vertices.length - 1, anchors);

  const pads = route.vertices.flatMap((vertex) => {
    const anchor = anchors.get(vertex);

    return anchor === undefined ? [] : [anchor];
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
