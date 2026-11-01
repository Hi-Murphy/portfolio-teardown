export interface LetteringLook {
  readonly baseline: LetteringBaseline;
  readonly numberMaxPx: number;
  readonly numberMinPx: number;
  readonly nameRatio: number;
  readonly nameMinPx: number;
  readonly nameMaxLines: number;
  readonly charEm: number;
  readonly lineEm: number;
  readonly padFrac: number;
  readonly padMinPx: number;
  readonly gridSteps: number;
  readonly markOffsetPx: number;
}

export type LetteringBaseline = 'down-right' | 'down-left';

export const LETTERING_LOOK = {
  baseline: 'down-right',
  numberMaxPx: 16,
  numberMinPx: 9,
  nameRatio: 0.62,
  nameMinPx: 8,
  nameMaxLines: 3,
  charEm: 0.62,
  lineEm: 1.2,
  padFrac: 0.1,
  padMinPx: 2,
  gridSteps: 5,
  markOffsetPx: 10,
} as const satisfies LetteringLook;
