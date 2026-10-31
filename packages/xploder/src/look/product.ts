import type { LayoutOptions } from '../layout';

export const VIEWER_LAYOUT_DEFAULTS = { explodedGap: 2 } as const satisfies Partial<LayoutOptions>;

export function resolveViewerLayoutOptions(
  options?: Partial<LayoutOptions>,
): Partial<LayoutOptions> {
  return { ...VIEWER_LAYOUT_DEFAULTS, ...options };
}
