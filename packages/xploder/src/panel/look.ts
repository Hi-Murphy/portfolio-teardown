export interface PanelLook {
  readonly insetPx: number;
  readonly gapPx: number;
  readonly wideMinPx: number;
  readonly side: {
    readonly prefPx: number;
    readonly prefFrac: number;
    readonly minPx: number;
  };
  readonly sheet: {
    readonly prefFrac: number;
    readonly prefMaxPx: number;
    readonly minPx: number;
  };
  readonly compactMinPx: number;
  readonly caseStudy: {
    readonly sidePx: number;
    readonly sideFrac: number;
    readonly sheetFrac: number;
    readonly sheetMaxPx: number;
  };
  readonly zIndex: number;
  readonly typography: {
    readonly headingRem: number;
    readonly bodyRem: number;
    readonly monoRem: number;
  };
}

export const PANEL_LOOK = {
  insetPx: 8,
  gapPx: 8,
  wideMinPx: 640,
  side: { prefPx: 320, prefFrac: 0.42, minPx: 240 },
  sheet: { prefFrac: 0.45, prefMaxPx: 320, minPx: 128 },
  compactMinPx: 48,
  caseStudy: { sidePx: 448, sideFrac: 0.5, sheetFrac: 0.7, sheetMaxPx: 480 },
  zIndex: 2,
  typography: { headingRem: 1, bodyRem: 0.875, monoRem: 0.75 },
} as const satisfies PanelLook;
