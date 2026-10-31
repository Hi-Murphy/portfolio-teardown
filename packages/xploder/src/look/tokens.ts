import type { ComponentKind, TechCategory } from '../schema/constants';
import type { PaletteRole } from '../theme';

export type RoleRef = PaletteRole | `tech.${TechCategory}`;

export interface LookTokens {
  readonly edge: { readonly componentPx: number; readonly layerPx: number; readonly role: 'line' };
  readonly fill: {
    readonly base: PaletteRole;
    readonly wash: number;
    readonly highlightWash: number;
  };
  readonly faces: { readonly top: number; readonly left: number; readonly right: number };
  readonly layer: { readonly wash: number };
  readonly kind: Readonly<Record<ComponentKind, RoleRef>>;
  readonly annotation: {
    readonly fontPx: number;
    readonly gapPx: number;
    readonly padXPx: number;
    readonly padYPx: number;
    readonly charEm: number;
    readonly lineEm: number;
    readonly wideMinPx: number;
    readonly textRole: PaletteRole;
    readonly partRole: PaletteRole;
    readonly dimensionRole: PaletteRole;
    readonly leaderRole: PaletteRole;
    readonly balloonRole: PaletteRole;
    readonly balloonFillRole: PaletteRole;
  };
  readonly trace: {
    readonly role: PaletteRole;
    readonly casingRole: PaletteRole;
    readonly strokePx: number;
    readonly casingPx: number;
    readonly padPx: number;
  };
}

export const look = {
  edge: { componentPx: 1, layerPx: 1, role: 'line' },
  fill: { base: 'surface', wash: 0.18, highlightWash: 0.4 },
  faces: { top: 0, left: 0.06, right: 0.12 },
  layer: { wash: 0.1 },
  kind: {
    module: 'line',
    service: 'tech.framework',
    store: 'tech.storage',
    external: 'steel',
    actor: 'tech.tooling',
  },
  annotation: {
    fontPx: 12,
    gapPx: 4,
    padXPx: 4,
    padYPx: 2,
    charEm: 0.62,
    lineEm: 1.4,
    wideMinPx: 768,
    textRole: 'label',
    partRole: 'ink',
    dimensionRole: 'steel',
    leaderRole: 'lineMuted',
    balloonRole: 'line',
    balloonFillRole: 'surface',
  },
  trace: { role: 'accent', casingRole: 'paper', strokePx: 2, casingPx: 2, padPx: 3 },
} as const satisfies LookTokens;
