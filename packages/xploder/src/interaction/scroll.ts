export function scrollExtent(
  contentTopPx: number,
  contentBottomPx: number,
  viewportHeight: number,
  marginPx: number,
): number {
  const extent = contentBottomPx - contentTopPx + 2 * marginPx - viewportHeight;

  return extent <= 1e-9 ? 0 : extent;
}

export function offsetFor(scrollTop: number, extent: number): number {
  const boundedExtent = Math.max(0, extent);
  const boundedScrollTop = Math.min(Math.max(0, scrollTop), boundedExtent);

  return boundedScrollTop - boundedExtent / 2;
}

export function rescaleScroll(
  prevScrollTop: number,
  prevExtent: number,
  nextExtent: number,
): number {
  const boundedPrevExtent = Math.max(0, prevExtent);
  const boundedNextExtent = Math.max(0, nextExtent);
  const boundedPrevScrollTop = Math.min(Math.max(0, prevScrollTop), boundedPrevExtent);

  return Math.min(
    Math.max(boundedPrevScrollTop + (boundedNextExtent - boundedPrevExtent) / 2, 0),
    boundedNextExtent,
  );
}
