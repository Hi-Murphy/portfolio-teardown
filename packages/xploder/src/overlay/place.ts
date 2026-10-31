import type { LookTokens } from '../look/tokens';

import { labelBox } from './parts';
import type { Vec2 } from './project';

export const PLACEMENT_RADII = [8, 20, 36, 56, 80, 104] as const;

const VIEWPORT_INSET_PX = 4;
// Look-ahead only runs when first-fit hides a label. Alternative stack anchors expand the
// candidate set, so the cap is larger while still bounding settle-time cost on phones.
const SEARCH_NODE_LIMIT = 3_000;

export type LabelKind = 'layer' | 'part' | 'tag' | 'dimension';

export type PlacementDirection = 'C' | 'W' | 'NW' | 'SW' | 'N' | 'S' | 'NE' | 'E' | 'SE';

export interface PlacementLabel {
  readonly key: string;
  readonly kind: LabelKind;
  readonly anchor: Vec2;
  readonly anchors?: readonly Vec2[];
  readonly text: string;
  readonly shortText?: string;
  readonly layerIndex?: number;
  readonly slot?: number;
  readonly excludeObstacles?: readonly number[];
}

export interface Rect {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}

export interface Leader {
  readonly from: Vec2;
  readonly to: Vec2;
}

export interface LabelPlacement extends Rect {
  readonly key: string;
  readonly kind: LabelKind;
  readonly anchor: Vec2;
  readonly text: string;
  readonly direction: PlacementDirection;
  readonly radius: number;
  readonly leader: Leader | null;
}

export interface PlacementResult {
  readonly placements: readonly LabelPlacement[];
  readonly hidden: readonly string[];
  readonly fellBack: readonly string[];
  readonly offscreen: readonly string[];
}

const PREFERENCES = {
  layer: ['W', 'NW', 'SW', 'N', 'S', 'NE', 'E', 'SE'],
  part: ['NE', 'N', 'NW', 'E', 'W', 'SE', 'S', 'SW'],
  tag: ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'],
  dimension: ['W', 'E', 'S', 'N', 'SW', 'NW', 'SE', 'NE'],
} as const satisfies Readonly<Record<LabelKind, readonly PlacementDirection[]>>;

const DIRECTIONS = {
  C: [0, 0],
  W: [-1, 0],
  NW: [-1, -1],
  SW: [-1, 1],
  N: [0, -1],
  S: [0, 1],
  NE: [1, -1],
  E: [1, 0],
  SE: [1, 1],
} as const satisfies Readonly<Record<PlacementDirection, readonly [number, number]>>;

interface OrderedLabel {
  readonly label: PlacementLabel;
  readonly inputIndex: number;
}

interface Candidate extends Rect {
  readonly direction: PlacementDirection;
  readonly radius: number;
}

interface LabelOption {
  readonly placement: LabelPlacement;
  readonly fellBack: boolean;
}

function orderKey(label: PlacementLabel): readonly [number, number, number] {
  if (label.kind === 'layer') return [0, label.layerIndex ?? 0, 0];
  if (label.kind === 'part' || label.kind === 'tag') {
    return [1, label.layerIndex ?? 0, label.slot ?? 0];
  }
  return [2, 0, 0];
}

function compareLabels(left: OrderedLabel, right: OrderedLabel): number {
  const leftKey = orderKey(left.label);
  const rightKey = orderKey(right.label);

  for (let index = 0; index < leftKey.length; index += 1) {
    const difference = (leftKey[index] ?? 0) - (rightKey[index] ?? 0);

    if (difference !== 0) return difference;
  }

  return left.inputIndex - right.inputIndex;
}

function candidate(
  anchor: Vec2,
  box: { readonly w: number; readonly h: number },
  radius: number,
  direction: PlacementDirection,
): Candidate {
  const [horizontal, vertical] = DIRECTIONS[direction];
  const x =
    horizontal < 0
      ? anchor[0] - radius - box.w
      : horizontal > 0
        ? anchor[0] + radius
        : anchor[0] - box.w / 2;
  const y =
    vertical < 0
      ? anchor[1] - radius - box.h
      : vertical > 0
        ? anchor[1] + radius
        : anchor[1] - box.h / 2;

  return { x, y, w: box.w, h: box.h, direction, radius };
}

function clampToViewport(
  candidateBox: Candidate,
  viewport: { readonly width: number; readonly height: number },
): Candidate {
  return {
    ...candidateBox,
    x: Math.max(
      VIEWPORT_INSET_PX,
      Math.min(candidateBox.x, viewport.width - VIEWPORT_INSET_PX - candidateBox.w),
    ),
    y: Math.max(
      VIEWPORT_INSET_PX,
      Math.min(candidateBox.y, viewport.height - VIEWPORT_INSET_PX - candidateBox.h),
    ),
  };
}

function inflate(rect: Rect, amount: number): Rect {
  return {
    x: rect.x - amount,
    y: rect.y - amount,
    w: rect.w + 2 * amount,
    h: rect.h + 2 * amount,
  };
}

function insideViewport(
  rect: Rect,
  viewport: { readonly width: number; readonly height: number },
): boolean {
  return (
    rect.x >= VIEWPORT_INSET_PX &&
    rect.y >= VIEWPORT_INSET_PX &&
    rect.x + rect.w <= viewport.width - VIEWPORT_INSET_PX &&
    rect.y + rect.h <= viewport.height - VIEWPORT_INSET_PX
  );
}

function projection(axis: Vec2, point: Vec2): number {
  return axis[0] * point[0] + axis[1] * point[1];
}

function separates(leftMin: number, leftMax: number, rightMin: number, rightMax: number): boolean {
  return leftMax < rightMin || rightMax < leftMin;
}

function rectProjection(rect: Rect, axis: Vec2): readonly [number, number] {
  const corners: readonly Vec2[] = [
    [rect.x, rect.y],
    [rect.x + rect.w, rect.y],
    [rect.x + rect.w, rect.y + rect.h],
    [rect.x, rect.y + rect.h],
  ];
  let min = Infinity;
  let max = -Infinity;

  for (const corner of corners) {
    const value = projection(axis, corner);
    min = Math.min(min, value);
    max = Math.max(max, value);
  }

  return [min, max];
}

function polygonProjection(polygon: readonly Vec2[], axis: Vec2): readonly [number, number] {
  let min = Infinity;
  let max = -Infinity;

  for (const point of polygon) {
    const value = projection(axis, point);
    min = Math.min(min, value);
    max = Math.max(max, value);
  }

  return [min, max];
}

export function rectsIntersect(left: Rect, right: Rect): boolean {
  return (
    !separates(left.x, left.x + left.w, right.x, right.x + right.w) &&
    !separates(left.y, left.y + left.h, right.y, right.y + right.h)
  );
}

export function rectIntersectsPolygon(rect: Rect, polygon: readonly Vec2[]): boolean {
  if (polygon.length === 0) return false;

  const axes: Vec2[] = [
    [1, 0],
    [0, 1],
  ];

  for (let index = 0; index < polygon.length; index += 1) {
    const from = polygon[index];
    const to = polygon[(index + 1) % polygon.length];

    if (from === undefined || to === undefined) continue;

    const edge: Vec2 = [to[0] - from[0], to[1] - from[1]];

    if (edge[0] !== 0 || edge[1] !== 0) axes.push([-edge[1], edge[0]]);
  }

  for (const axis of axes) {
    const [rectMin, rectMax] = rectProjection(rect, axis);
    const [polygonMin, polygonMax] = polygonProjection(polygon, axis);

    if (separates(rectMin, rectMax, polygonMin, polygonMax)) return false;
  }

  return true;
}

function rectsOverlap(left: Rect, right: Rect): boolean {
  return (
    left.x < right.x + right.w &&
    right.x < left.x + left.w &&
    left.y < right.y + right.h &&
    right.y < left.y + left.h
  );
}

function rectOverlapsPolygon(rect: Rect, polygon: readonly Vec2[]): boolean {
  if (polygon.length === 0) return false;

  const axes: Vec2[] = [
    [1, 0],
    [0, 1],
  ];

  for (let index = 0; index < polygon.length; index += 1) {
    const from = polygon[index];
    const to = polygon[(index + 1) % polygon.length];

    if (from === undefined || to === undefined) continue;

    const edge: Vec2 = [to[0] - from[0], to[1] - from[1]];

    if (edge[0] !== 0 || edge[1] !== 0) axes.push([-edge[1], edge[0]]);
  }

  for (const axis of axes) {
    const [rectMin, rectMax] = rectProjection(rect, axis);
    const [polygonMin, polygonMax] = polygonProjection(polygon, axis);

    if (rectMax <= polygonMin || polygonMax <= rectMin) return false;
  }

  return true;
}

function nearestPoint(rect: Rect, point: Vec2): Vec2 {
  return [
    Math.max(rect.x, Math.min(point[0], rect.x + rect.w)),
    Math.max(rect.y, Math.min(point[1], rect.y + rect.h)),
  ];
}

function placementsForText(
  label: PlacementLabel,
  text: string,
  box: { readonly w: number; readonly h: number },
  obstacles: readonly (readonly Vec2[])[],
  placed: readonly Rect[],
  viewport: { readonly width: number; readonly height: number },
  gapPx: number,
): LabelPlacement[] {
  const placements: LabelPlacement[] = [];
  const excluded = new Set(label.excludeObstacles ?? []);
  const labelObstacles = obstacles.filter((_, index) => !excluded.has(index));

  const anchors = [label.anchor, ...(label.anchors ?? [])];

  for (const anchor of anchors) {
    if (label.kind === 'tag') {
      const centered: Candidate = {
        x: anchor[0] - box.w / 2,
        y: anchor[1] - box.h / 2,
        w: box.w,
        h: box.h,
        direction: 'C',
        radius: 0,
      };

      if (
        insideViewport(centered, viewport) &&
        !labelObstacles.some((hull) => rectOverlapsPolygon(inflate(centered, gapPx), hull)) &&
        !placed.some((rect) => rectsOverlap(inflate(centered, gapPx), rect))
      ) {
        placements.push({
          key: label.key,
          kind: label.kind,
          anchor,
          text,
          x: centered.x,
          y: centered.y,
          w: centered.w,
          h: centered.h,
          direction: centered.direction,
          radius: centered.radius,
          leader: null,
        });
      }
    }

    for (const radius of PLACEMENT_RADII) {
      for (const direction of PREFERENCES[label.kind]) {
        const next = clampToViewport(candidate(anchor, box, radius, direction), viewport);
        const inflated = inflate(next, gapPx);

        if (!insideViewport(next, viewport)) continue;
        if (labelObstacles.some((hull) => rectOverlapsPolygon(inflated, hull))) continue;
        if (placed.some((rect) => rectsOverlap(inflated, rect))) continue;

        placements.push({
          key: label.key,
          kind: label.kind,
          anchor,
          text,
          x: next.x,
          y: next.y,
          w: next.w,
          h: next.h,
          direction: next.direction,
          radius: next.radius,
          leader:
            next.radius > PLACEMENT_RADII[0]
              ? { from: anchor, to: nearestPoint(next, anchor) }
              : null,
        });
      }
    }
  }

  return placements;
}

function labelOptions(
  label: PlacementLabel,
  obstacles: readonly (readonly Vec2[])[],
  placed: readonly Rect[],
  viewport: { readonly width: number; readonly height: number },
  look: Pick<LookTokens, 'annotation'>,
): LabelOption[] {
  const options = placementsForText(
    label,
    label.text,
    labelBox(label.text, look.annotation),
    obstacles,
    placed,
    viewport,
    look.annotation.gapPx,
  ).map((placement) => ({ placement, fellBack: false }));

  if (label.kind === 'part' && label.shortText !== undefined && label.shortText !== label.text) {
    options.push(
      ...placementsForText(
        label,
        label.shortText,
        labelBox(label.shortText, look.annotation),
        obstacles,
        placed,
        viewport,
        look.annotation.gapPx,
      ).map((placement) => ({ placement, fellBack: true })),
    );
  }

  return options;
}

function isOffscreen(
  anchor: Vec2,
  viewport: { readonly width: number; readonly height: number },
): boolean {
  return (
    anchor[0] < 0 || anchor[0] > viewport.width || anchor[1] < 0 || anchor[1] > viewport.height
  );
}

function firstFit(
  ordered: readonly OrderedLabel[],
  obstacles: readonly (readonly Vec2[])[],
  viewport: { readonly width: number; readonly height: number },
  look: Pick<LookTokens, 'annotation'>,
): PlacementResult {
  const placements: LabelPlacement[] = [];
  const hidden: string[] = [];
  const fellBack: string[] = [];
  const offscreen: string[] = [];

  for (const { label } of ordered) {
    if (isOffscreen(label.anchor, viewport)) {
      offscreen.push(label.key);
      continue;
    }

    const option = labelOptions(label, obstacles, placements, viewport, look)[0];

    if (option === undefined) {
      hidden.push(label.key);
      continue;
    }

    placements.push(option.placement);

    if (option.fellBack) fellBack.push(label.key);
  }

  return { placements, hidden, fellBack, offscreen };
}

function completeSearch(
  ordered: readonly OrderedLabel[],
  obstacles: readonly (readonly Vec2[])[],
  viewport: { readonly width: number; readonly height: number },
  look: Pick<LookTokens, 'annotation'>,
  offscreen: readonly string[],
): PlacementResult | null {
  const offscreenKeys = new Set(offscreen);
  const onscreen = ordered.filter(({ label }) => !offscreenKeys.has(label.key));
  const placements: LabelPlacement[] = [];
  const fellBack: string[] = [];
  let visited = 0;

  function search(index: number): boolean {
    if (visited >= SEARCH_NODE_LIMIT) return false;
    visited += 1;

    if (index === onscreen.length) return true;

    const label = onscreen[index]?.label;

    if (label === undefined) return false;

    for (const option of labelOptions(label, obstacles, placements, viewport, look)) {
      placements.push(option.placement);

      if (option.fellBack) fellBack.push(label.key);

      if (search(index + 1)) return true;

      if (option.fellBack) fellBack.pop();
      placements.pop();
    }

    return false;
  }

  return search(0) ? { placements, hidden: [], fellBack, offscreen } : null;
}

export function placeLabels(
  labels: readonly PlacementLabel[],
  obstacles: readonly (readonly Vec2[])[],
  viewport: { readonly width: number; readonly height: number },
  look: Pick<LookTokens, 'annotation'>,
): PlacementResult {
  const ordered = labels.map((label, inputIndex) => ({ label, inputIndex })).sort(compareLabels);
  const first = firstFit(ordered, obstacles, viewport, look);

  if (first.hidden.length === 0) return first;

  return completeSearch(ordered, obstacles, viewport, look, first.offscreen) ?? first;
}
