export interface LetteringLook {
  readonly baseline: LetteringBaseline;
  readonly numberMaxPx: number;
  readonly numberMinPx: number;
  readonly nameRatio: number;
  readonly nameMinPx: number;
  readonly nameMaxLines: number;
  readonly compactColumnPx: number;
  readonly columnGapPx: number;
  readonly columnInsetPx: number;
  readonly columnRowGapPx: number;
  readonly columnLayerGapPx: number;
  readonly columnMaxLines: number;
  readonly layerFontMinPx: number;
  readonly layerFontMaxPx: number;
  readonly charEm: number;
  readonly lineEm: number;
  readonly padFrac: number;
  readonly padMinPx: number;
  readonly gridSteps: number;
  readonly markOffsetPx: number;
  readonly annotationFontPx: number;
}

export type LetteringBaseline = 'down-right' | 'down-left';

export const LETTERING_LOOK = {
  baseline: 'down-right',
  numberMaxPx: 16,
  numberMinPx: 9,
  nameRatio: 0.62,
  nameMinPx: 8,
  nameMaxLines: 3,
  compactColumnPx: 9,
  columnGapPx: 6,
  columnInsetPx: 4,
  columnRowGapPx: 2,
  columnLayerGapPx: 6,
  columnMaxLines: 2,
  layerFontMinPx: 9,
  layerFontMaxPx: 13,
  charEm: 0.62,
  lineEm: 1.2,
  padFrac: 0.1,
  padMinPx: 2,
  gridSteps: 5,
  markOffsetPx: 10,
  annotationFontPx: 12,
} as const satisfies LetteringLook;
