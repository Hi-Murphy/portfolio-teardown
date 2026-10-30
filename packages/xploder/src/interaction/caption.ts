export type CaptionAnchor = 'top' | 'bottom';

export function captionAnchor(targetLayerIndex: number | null, layerCount: number): CaptionAnchor {
  if (targetLayerIndex === null || targetLayerIndex < 0) return 'top';

  return targetLayerIndex < layerCount / 2 ? 'bottom' : 'top';
}
