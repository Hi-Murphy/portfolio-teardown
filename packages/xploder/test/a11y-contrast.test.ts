import { describe, expect, test } from 'vitest';

import {
  CONTRAST_SURFACES,
  CONTRAST_THRESHOLDS,
  R2_BEFORE_SURFACES,
  compositeOver,
  contrastTable,
  type BgRef,
  type ContrastRow,
  type ContrastSurface,
} from '../src/a11y/contrast';
import { hexToLinear } from '../src/look/fills';
import { blueprint, type Palette } from '../src/theme';

const THEMES = ['light', 'dark'] as const;
const INK_ROLE = /palette\.ink/g;
const R2_ROWS = ['lettering-face-number-highlight', 'lettering-face-name-highlight'] as const;
const REQUIRED_SURFACES = [
  'panel-body',
  'panel-label',
  'panel-link',
  'chip-label',
  'chip-border',
  'caption-heading',
  'caption-body',
  'callout-label',
  'balloon-label',
  'dimension-label',
  'title-title',
  'title-meta',
  'title-row',
  'title-border',
  'lettering-face-number-rest-module',
  'lettering-face-name-rest-module',
  'lettering-face-number-highlight',
  'lettering-face-name-highlight',
  'focus-ring-paper',
  'focus-ring-surface',
  'focus-ring-kind-fill',
  'playground-button-text-on-paper',
  'playground-meta-on-paper',
  'playground-button-text-on-surface',
  'playground-meta-on-surface',
  'playground-button-text-hover',
  'playground-meta-hover',
] as const;

type ThemeName = (typeof THEMES)[number];
type SourceModuleMeta = ImportMeta & {
  glob(
    pattern: string,
    options: { query: '?raw'; import: 'default'; eager: true },
  ): Record<string, string>;
};

const PART_LETTERING_SOURCE = Object.values(
  (import.meta as SourceModuleMeta).glob('../src/react/lettering/PartLettering.tsx', {
    query: '?raw',
    import: 'default',
    eager: true,
  }),
)[0];

function backgroundLabel(background: BgRef): string {
  return typeof background === 'string' ? background : JSON.stringify(background);
}

function formatTable(
  theme: ThemeName,
  surfaces: readonly ContrastSurface[],
  rows: readonly ContrastRow[],
  heading: string,
): string {
  const lines = [
    `[${theme}] ${heading}`,
    '  id                                              state      size   fg                  background                   ratio    threshold  verdict  exception',
  ];

  for (const [index, row] of rows.entries()) {
    const surface = surfaces[index];

    if (surface === undefined) throw new Error(`Missing surface for ${row.id}`);

    lines.push(
      `  ${row.id.padEnd(48)} ${surface.state.padEnd(10)} ${surface.size.padEnd(6)} ${surface.fg.padEnd(19)} ${backgroundLabel(surface.bg).padEnd(28)} ${row.ratio.toFixed(2).padStart(6)}  ${row.threshold.toFixed(1).padStart(9)}  ${(row.pass ? 'PASS' : 'FAIL').padEnd(7)}  ${row.exception ?? ''}`,
    );
  }

  return lines.join('\n');
}

function rowFor(palette: Palette, surfaces: readonly ContrastSurface[], id: string): ContrastRow {
  const table = contrastTable(palette, surfaces);
  const row = table.find((candidate) => candidate.id === id);

  if (row === undefined) throw new Error(`Missing contrast row for ${id}`);

  return row;
}

function expectCloseToRfc(actual: number, expected: number): void {
  expect(Math.abs(actual - expected)).toBeLessThanOrEqual(0.01);
}

function postFixInkUses(): number {
  const source = PART_LETTERING_SOURCE ?? '';

  return [...source.matchAll(INK_ROLE)].length;
}

describe('contrast inventory', () => {
  test('covers the RFC D6 surfaces and every state', () => {
    const ids = CONTRAST_SURFACES.map((surface) => surface.id);

    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toEqual(expect.arrayContaining([...REQUIRED_SURFACES]));
    expect(new Set(CONTRAST_SURFACES.map((surface) => surface.state))).toEqual(
      new Set(['rest', 'highlight', 'dim']),
    );

    for (const row of contrastTable(blueprint.light)) {
      if (row.exception === undefined) continue;

      expect(row.exception).toBe('inactive-dim');
      expect(row.id.endsWith('-dim')).toBe(true);
    }
  });

  test('prints both palettes and passes every non-exception row', () => {
    for (const theme of THEMES) {
      const palette = blueprint[theme];
      const rows = contrastTable(palette);
      const before = contrastTable(palette, R2_BEFORE_SURFACES);

      console.log(formatTable(theme, CONTRAST_SURFACES, rows, 'surface inventory'));
      console.log(formatTable(theme, R2_BEFORE_SURFACES, before, 'R2 pre-fix evidence'));

      for (const row of rows) {
        expect(row.threshold).toBe(
          CONTRAST_THRESHOLDS[
            CONTRAST_SURFACES.find((surface) => surface.id === row.id)?.size ?? 'body'
          ],
        );
        if (row.exception === undefined) expect(row.pass, `${theme} ${row.id}`).toBe(true);
      }
    }
  });

  test('reproduces the RFC D6 ratios within 0.01', () => {
    const expected = {
      light: {
        number: 3.05,
        name: 4.24,
        ink: 7.93,
        libraryOnPaper: 4.93,
      },
      dark: {
        number: 3.34,
        name: 3.01,
        ink: 5.17,
        libraryOnPaper: 9.64,
      },
    } as const;

    for (const theme of THEMES) {
      const palette = blueprint[theme];
      const before = contrastTable(palette, R2_BEFORE_SURFACES);
      const current = contrastTable(palette);

      expectCloseToRfc(before[0]?.ratio ?? 0, expected[theme].number);
      expectCloseToRfc(before[1]?.ratio ?? 0, expected[theme].name);
      expectCloseToRfc(
        current.find((row) => row.id === 'lettering-face-number-highlight')?.ratio ?? 0,
        expected[theme].ink,
      );
      expectCloseToRfc(
        current.find((row) => row.id === 'lettering-face-name-highlight')?.ratio ?? 0,
        expected[theme].ink,
      );
      expectCloseToRfc(
        current.find((row) => row.id === 'tech-library-on-paper')?.ratio ?? 0,
        expected[theme].libraryOnPaper,
      );
    }
  });

  test('composites dimmed text with CSS opacity semantics', () => {
    const palette = blueprint.light;
    const ink = hexToLinear(palette.ink);
    const paper = hexToLinear(palette.paper);

    expect(compositeOver(ink, paper, 1)[0]).toBeCloseTo(ink[0], 12);
    expect(compositeOver(ink, paper, 1)[1]).toBeCloseTo(ink[1], 12);
    expect(compositeOver(ink, paper, 1)[2]).toBeCloseTo(ink[2], 12);
    expect(compositeOver(ink, paper, 0)[0]).toBeCloseTo(paper[0], 12);
    expect(compositeOver(ink, paper, 0)[1]).toBeCloseTo(paper[1], 12);
    expect(compositeOver(ink, paper, 0)[2]).toBeCloseTo(paper[2], 12);
    expect(rowFor(palette, CONTRAST_SURFACES, 'panel-body-dim').pass).toBe(false);
  });

  for (const theme of THEMES) {
    for (const id of R2_ROWS) {
      test(`${theme} ${id} uses the post-fix ink role`, () => {
        expect(CONTRAST_SURFACES.find((surface) => surface.id === id)?.fg).toBe('ink');
        expect(postFixInkUses()).toBeGreaterThanOrEqual(2);
      });
    }
  }
});
