import type { LookTokens } from '../look/tokens';

export interface LabelBox {
  readonly w: number;
  readonly h: number;
}

type AnnotationMetrics = Pick<
  LookTokens['annotation'],
  'charEm' | 'fontPx' | 'lineEm' | 'padXPx' | 'padYPx'
>;

export function layerNumber(layerIndex: number): number {
  return layerIndex + 1;
}

export function partNumber(layerIndex: number, slot: number): string {
  return `${layerNumber(layerIndex)}.${slot + 1}`;
}

export function layerText(layerIndex: number, layerName: string): string {
  return `${layerNumber(layerIndex)} ${layerName}`;
}

export function partText(layerIndex: number, slot: number, componentName: string): string {
  return `${partNumber(layerIndex, slot)} ${componentName}`;
}

export function partShortText(layerIndex: number, slot: number): string {
  return partNumber(layerIndex, slot);
}

export function labelBox(text: string, annotation: AnnotationMetrics): LabelBox {
  const characters = Array.from(text).length;

  return {
    w: Math.ceil(characters * annotation.charEm * annotation.fontPx) + 2 * annotation.padXPx,
    h: Math.ceil(annotation.lineEm * annotation.fontPx) + 2 * annotation.padYPx,
  };
}
