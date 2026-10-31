import type { PaletteRole } from '../theme';

export interface EmphasisTokens {
  readonly highlight: { readonly role: PaletteRole };
  readonly dim: { readonly level: number; readonly toward: PaletteRole };
  readonly tourPulse: { readonly floor: number };
}

export const emphasis = {
  highlight: { role: 'accent' },
  dim: { level: 0.3, toward: 'paper' },
  tourPulse: { floor: 0.6 },
} as const satisfies EmphasisTokens;
