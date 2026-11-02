import type { Vec2 } from '../overlay/project';

export interface RevealScrollTopInput {
  readonly hull: readonly Vec2[];
  readonly offsetY: number;
  readonly canvasHeight: number;
  readonly scrollTop: number;
  readonly extent: number;
  readonly marginPx: number;
}

interface VerticalBounds {
  readonly minY: number;
  readonly maxY: number;
}

function verticalBounds(hull: readonly Vec2[]): VerticalBounds | null {
  let minY = Infinity;
  let maxY = -Infinity;

  for (const [, y] of hull) {
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
  }

  return minY === Infinity ? null : { minY, maxY };
}

export function revealScrollTop({
  hull,
  offsetY,
  canvasHeight,
  scrollTop,
  extent,
  marginPx,
}: RevealScrollTopInput): number | null {
  const bounds = verticalBounds(hull);

  if (bounds === null) return null;

  const visibleTop = offsetY + marginPx;
  const visibleBottom = offsetY + canvasHeight - marginPx;

  if (bounds.minY >= visibleTop && bounds.maxY <= visibleBottom) return null;

  const availableHeight = canvasHeight - 2 * marginPx;
  const fits = bounds.maxY - bounds.minY <= availableHeight;
  const targetOffsetY =
    !fits || bounds.minY < visibleTop
      ? bounds.minY - marginPx
      : bounds.maxY - canvasHeight + marginPx;
  const nextScrollTop = scrollTop + targetOffsetY - offsetY;

  return Math.min(Math.max(nextScrollTop, 0), Math.max(0, extent));
}
