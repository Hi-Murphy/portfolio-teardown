import { describe, expect, test } from 'vitest';

import { look, type RoleRef } from '../src/look/tokens';
import type { TechCategory } from '../src/schema/constants';
import { blueprint, type Palette, type PaletteRole } from '../src/theme';

const THEMES = ['light', 'dark'] as const;
const HEX_COLOUR = /^#[0-9A-F]{6}$/;
const ROLE_REFS = [
  look.edge.role,
  look.fill.base,
  ...Object.values(look.kind),
  look.annotation.textRole,
  look.annotation.partRole,
  look.annotation.dimensionRole,
  look.annotation.leaderRole,
  look.annotation.balloonRole,
  look.annotation.balloonFillRole,
  look.annotation.labelFillRole,
  look.trace.role,
  look.trace.casingRole,
  look.titleBlock.titleRole,
  look.titleBlock.metaRole,
  look.titleBlock.rowRole,
  look.titleBlock.borderRole,
  look.titleBlock.fillRole,
] as const satisfies readonly RoleRef[];
const PX_VALUES = [
  ['edge.componentPx', look.edge.componentPx],
  ['edge.layerPx', look.edge.layerPx],
  ['annotation.fontPx', look.annotation.fontPx],
  ['annotation.gapPx', look.annotation.gapPx],
  ['annotation.padXPx', look.annotation.padXPx],
  ['annotation.padYPx', look.annotation.padYPx],
  ['annotation.wideMinPx', look.annotation.wideMinPx],
  ['trace.strokePx', look.trace.strokePx],
  ['trace.casingPx', look.trace.casingPx],
  ['trace.padPx', look.trace.padPx],
  ['titleBlock.insetPx', look.titleBlock.insetPx],
] as const;

function resolveRole(palette: Palette, ref: RoleRef): string {
  if (ref.startsWith('tech.')) {
    return palette.tech[ref.slice('tech.'.length) as TechCategory];
  }

  return palette[ref as PaletteRole];
}

describe('look tokens', () => {
  test('resolves every role ref to a hex colour in both palettes', () => {
    for (const theme of THEMES) {
      for (const ref of ROLE_REFS) {
        expect(resolveRole(blueprint[theme], ref), `${theme}.${ref}`).toMatch(HEX_COLOUR);
      }
    }
  });

  test('keeps fills, faces and layer washes in their ordered ranges', () => {
    expect(look.fill.wash).toBeGreaterThan(0);
    expect(look.fill.wash).toBeLessThan(look.fill.highlightWash);
    expect(look.fill.highlightWash).toBeLessThan(1);

    expect(look.faces.top).toBeGreaterThanOrEqual(0);
    expect(look.faces.top).toBeLessThan(look.faces.left);
    expect(look.faces.left).toBeLessThan(look.faces.right);
    expect(look.faces.right).toBeLessThan(1);

    expect(look.layer.wash).toBeGreaterThan(0);
    expect(look.layer.wash).toBeLessThan(1);
  });

  test('keeps every pixel measurement positive and annotation text readable', () => {
    for (const [name, value] of PX_VALUES) {
      expect(value, name).toBeGreaterThan(0);
    }

    expect(look.annotation.fontPx).toBeGreaterThanOrEqual(12);
  });

  test('does not use the accent highlight role for any component kind', () => {
    for (const [kind, ref] of Object.entries(look.kind)) {
      expect(ref, kind).not.toBe('accent');
    }
  });
});
