import type { Vec2 } from '../overlay/project';

import { PANEL_LOOK, type PanelLook } from './look';

export interface Size {
  readonly width: number;
  readonly height: number;
}

export interface Rect {
  readonly left: number;
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
}

export type Dock = 'left' | 'right' | 'top' | 'bottom';

export interface Placement {
  readonly dock: Dock;
  readonly size: number;
  readonly rect: Rect;
  readonly stage: 1 | 2 | 3 | 4;
}

export interface PlacePanelInput {
  readonly canvas: Size;
  readonly slab: Rect | null;
  readonly kind: 'detail' | 'caseStudy';
  readonly current?: { readonly dock: Dock; readonly size: number } | null;
  readonly look?: PanelLook;
}

const SIDE_DOCKS = ['left', 'right'] as const satisfies readonly Dock[];
const SHEET_DOCKS = ['top', 'bottom'] as const satisfies readonly Dock[];

function isSide(dock: Dock): boolean {
  return dock === 'left' || dock === 'right';
}

function allocatedRect(dock: Dock, size: number, canvas: Size, look: PanelLook): Rect {
  const inset = look.insetPx;
  const maximumWidth = Math.max(0, canvas.width - 2 * inset);
  const maximumHeight = Math.max(0, canvas.height - 2 * inset);
  const boundedSize = Math.max(0, size);

  if (isSide(dock)) {
    return {
      left: dock === 'left' ? inset : canvas.width - inset - boundedSize,
      top: inset,
      right: dock === 'left' ? inset + boundedSize : canvas.width - inset,
      bottom: inset + maximumHeight,
    };
  }

  return {
    left: inset,
    top: dock === 'top' ? inset : canvas.height - inset - boundedSize,
    right: inset + maximumWidth,
    bottom: dock === 'top' ? inset + boundedSize : canvas.height - inset,
  };
}

function preferredSize(dock: Dock, canvas: Size, look: PanelLook): number {
  return isSide(dock)
    ? Math.min(look.side.prefPx, look.side.prefFrac * canvas.width)
    : Math.min(look.sheet.prefFrac * canvas.height, look.sheet.prefMaxPx);
}

function minimumSize(dock: Dock, look: PanelLook): number {
  return isSide(dock) ? look.side.minPx : look.sheet.minPx;
}

function freeSpace(slab: Rect, canvas: Size, look: PanelLook): Readonly<Record<Dock, number>> {
  return {
    right: canvas.width - look.insetPx - (slab.right + look.gapPx),
    left: slab.left - look.gapPx - look.insetPx,
    bottom: canvas.height - look.insetPx - (slab.bottom + look.gapPx),
    top: slab.top - look.gapPx - look.insetPx,
  };
}

function preferenceOrder(slab: Rect, canvas: Size, wide: boolean): readonly Dock[] {
  const centerX = (slab.left + slab.right) / 2;
  const centerY = (slab.top + slab.bottom) / 2;
  const oppositeX: Dock = centerX <= canvas.width / 2 ? 'right' : 'left';
  const oppositeY: Dock = centerY <= canvas.height / 2 ? 'bottom' : 'top';
  const otherX: Dock = oppositeX === 'right' ? 'left' : 'right';
  const otherY: Dock = oppositeY === 'bottom' ? 'top' : 'bottom';

  return wide ? [oppositeX, otherX, oppositeY, otherY] : [oppositeY, otherY];
}

function stageForSize(size: number, dock: Dock, canvas: Size, look: PanelLook): 1 | 2 | 3 | 4 {
  if (size >= preferredSize(dock, canvas, look)) return 1;
  if (size >= minimumSize(dock, look)) return 2;
  if (size >= look.compactMinPx) return 3;
  return 4;
}

function result(
  dock: Dock,
  size: number,
  stage: 1 | 2 | 3 | 4,
  canvas: Size,
  look: PanelLook,
): Placement {
  return { dock, size, stage, rect: allocatedRect(dock, size, canvas, look) };
}

function bestFreeDock(
  docks: readonly Dock[],
  free: Readonly<Record<Dock, number>>,
): { readonly dock: Dock; readonly size: number } {
  let dock = docks[0] ?? 'bottom';
  let size = free[dock];

  for (const candidate of docks) {
    if (free[candidate] > size) {
      dock = candidate;
      size = free[candidate];
    }
  }

  return { dock, size };
}

export function rectOfHull(hull: readonly Vec2[]): Rect | null {
  if (hull.length === 0) return null;

  let left = Infinity;
  let top = Infinity;
  let right = -Infinity;
  let bottom = -Infinity;

  for (const point of hull) {
    left = Math.min(left, point[0]);
    top = Math.min(top, point[1]);
    right = Math.max(right, point[0]);
    bottom = Math.max(bottom, point[1]);
  }

  return { left, top, right, bottom };
}

export function visibleSlabRect(hull: readonly Vec2[], offsetY: number, canvas: Size): Rect | null {
  if (hull.length === 0) return null;

  let left = Infinity;
  let top = Infinity;
  let right = -Infinity;
  let bottom = -Infinity;

  for (const point of hull) {
    left = Math.min(left, point[0]);
    top = Math.min(top, point[1] - offsetY);
    right = Math.max(right, point[0]);
    bottom = Math.max(bottom, point[1] - offsetY);
  }

  const clipped = {
    left: Math.max(0, left),
    top: Math.max(0, top),
    right: Math.min(canvas.width, right),
    bottom: Math.min(canvas.height, bottom),
  };

  return clipped.right <= clipped.left || clipped.bottom <= clipped.top ? null : clipped;
}

export function placePanel(input: PlacePanelInput): Placement {
  const look = input.look ?? PANEL_LOOK;
  const { canvas, kind, slab } = input;
  const wide = canvas.width >= look.wideMinPx;

  if (kind === 'caseStudy') {
    const dock: Dock = wide ? 'right' : 'bottom';
    const size = wide
      ? Math.min(look.caseStudy.sidePx, look.caseStudy.sideFrac * canvas.width)
      : Math.min(look.caseStudy.sheetFrac * canvas.height, look.caseStudy.sheetMaxPx);

    return result(dock, size, 1, canvas, look);
  }

  const currentValid = input.current != null && (wide || !isSide(input.current.dock));

  if (slab === null) {
    const dock =
      currentValid && input.current != null ? input.current.dock : wide ? 'right' : 'bottom';
    const size =
      currentValid && input.current != null
        ? input.current.size
        : preferredSize(dock, canvas, look);

    return result(dock, size, stageForSize(size, dock, canvas, look), canvas, look);
  }

  const free = freeSpace(slab, canvas, look);

  // Hysteresis (RFC R1) keeps a readable dock while it still fits. A cramped current
  // size (stage 3/4) is never kept, so the panel grows back once there is room again.
  if (
    currentValid &&
    input.current != null &&
    input.current.size >= minimumSize(input.current.dock, look) &&
    free[input.current.dock] >= input.current.size
  ) {
    return result(
      input.current.dock,
      input.current.size,
      stageForSize(input.current.size, input.current.dock, canvas, look),
      canvas,
      look,
    );
  }

  const docks = wide ? [...SIDE_DOCKS, ...SHEET_DOCKS] : SHEET_DOCKS;
  const order = preferenceOrder(slab, canvas, wide);

  for (const dock of order) {
    const pref = preferredSize(dock, canvas, look);

    if (free[dock] >= pref) return result(dock, pref, 1, canvas, look);
  }

  for (const dock of order) {
    const available = Math.max(0, free[dock]);
    const min = minimumSize(dock, look);

    if (available >= min) return result(dock, available, 2, canvas, look);
  }

  const best = bestFreeDock(docks, free);
  const size = Math.max(0, best.size);

  if (size >= look.compactMinPx) return result(best.dock, size, 3, canvas, look);

  return result(best.dock, size, 4, canvas, look);
}
