import { describe, expect, test } from 'vitest';

import {
  decomposeEmphasis,
  highlightFill,
  kindFill,
  layerFill,
  mixSrgb,
  parityReport,
  type ParityReport,
  type Rgb,
} from '../src/look/fills';
import { look, type RoleRef } from '../src/look/tokens';
import { COMPONENT_KINDS, type ComponentKind, type TechCategory } from '../src/schema/constants';
import { blueprint, type Palette, type PaletteRole } from '../src/theme';

const THEMES = ['light', 'dark'] as const;
const BYTE_MAX = 255;
const SRGB_DECODE_CUTOFF = 0.04045;
const SRGB_DECODE_DIVISOR = 12.92;
const SRGB_DECODE_OFFSET = 0.055;
const SRGB_DECODE_SCALE = 1.055;
const SRGB_GAMMA = 2.4;
const TECH_ROLE_PREFIX = 'tech.';
const RANDOM_CASES = 200;
const RANDOM_SEED = 20261031;
const STABLE_P_LIMIT = 0.99;
const ROUND_TRIP_TOLERANCE = 1e-4;

type ThemeName = (typeof THEMES)[number];

function resolveRole(palette: Palette, ref: RoleRef): string {
  if (ref.startsWith(TECH_ROLE_PREFIX)) {
    return palette.tech[ref.slice(TECH_ROLE_PREFIX.length) as TechCategory];
  }

  return palette[ref as PaletteRole];
}

function srgbToLinear(value: number): number {
  return value <= SRGB_DECODE_CUTOFF
    ? value / SRGB_DECODE_DIVISOR
    : ((value + SRGB_DECODE_OFFSET) / SRGB_DECODE_SCALE) ** SRGB_GAMMA;
}

function hexToLinear(hex: string): Rgb {
  const match = /^#([0-9a-fA-F]{2})([0-9a-fA-F]{2})([0-9a-fA-F]{2})$/.exec(hex);
  const red = match?.[1];
  const green = match?.[2];
  const blue = match?.[3];

  if (!red || !green || !blue) throw new Error(`Invalid hex colour: ${hex}`);

  return [
    srgbToLinear(Number.parseInt(red, 16) / BYTE_MAX),
    srgbToLinear(Number.parseInt(green, 16) / BYTE_MAX),
    srgbToLinear(Number.parseInt(blue, 16) / BYTE_MAX),
  ];
}

function mixLinear(a: Rgb, b: Rgb, t: number): Rgb {
  const [aRed, aGreen, aBlue] = a;
  const [bRed, bGreen, bBlue] = b;

  return [aRed + (bRed - aRed) * t, aGreen + (bGreen - aGreen) * t, aBlue + (bBlue - aBlue) * t];
}

function ratioOf(target: Rgb, base: Rgb): Rgb {
  return [target[0] / base[0], target[1] / base[1], target[2] / base[2]];
}

function mulberry32(seed: number): () => number {
  let state = seed >>> 0;

  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;

    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);

    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function expectRgbClose(actual: Rgb, expected: Rgb): void {
  expect(actual[0]).toBeCloseTo(expected[0], 12);
  expect(actual[1]).toBeCloseTo(expected[1], 12);
  expect(actual[2]).toBeCloseTo(expected[2], 12);
}

function contrastFor(rows: ParityReport['text'], role: PaletteRole): number {
  const row = rows.find((entry) => entry.role === role);

  if (!row) throw new Error(`Missing parity row for ${role}`);

  return row.ratio;
}

function edgeFor(rows: ParityReport['edgeFill'], kind: ComponentKind): number {
  const row = rows.find((entry) => entry.kind === kind);

  if (!row) throw new Error(`Missing edge row for ${kind}`);

  return row.ratio;
}

function highlightFor(rows: ParityReport['highlightFill'], kind: ComponentKind): number {
  const row = rows.find((entry) => entry.kind === kind);

  if (!row) throw new Error(`Missing highlight row for ${kind}`);

  return row.deltaE;
}

function formatParity(theme: ThemeName, report: ParityReport): string {
  const lines = [
    `[${theme}]`,
    '  text contrast on paper',
    ...report.text.map(
      (row) => `    ${row.role.padEnd(8)} ${row.ratio.toFixed(2).padStart(6)} : 1`,
    ),
    '  stroke contrast on paper',
    ...report.strokes.map(
      (row) => `    ${row.role.padEnd(8)} ${row.ratio.toFixed(2).padStart(6)} : 1`,
    ),
    '  line edge vs kind fill contrast',
    ...report.edgeFill.map(
      (row) => `    ${row.kind.padEnd(8)} ${row.ratio.toFixed(2).padStart(6)} : 1`,
    ),
    '  highlight fill vs kind fill (CIE76 ΔE)',
    ...report.highlightFill.map(
      (row) => `    ${row.kind.padEnd(8)} ${row.deltaE.toFixed(1).padStart(6)}`,
    ),
    `  smallest kind ΔE ${report.smallestKindDeltaE.deltaE.toFixed(1)} (${report.smallestKindDeltaE.left}/${report.smallestKindDeltaE.right})`,
  ];

  return lines.join('\n');
}

describe('look fills', () => {
  test('mixes sRGB endpoints and the paper/line midpoint in sRGB before decoding', () => {
    const palette = blueprint.light;
    const paper = palette.paper;
    const line = palette.line;

    expectRgbClose(mixSrgb(paper, line, 0), hexToLinear(paper));
    expectRgbClose(mixSrgb(paper, line, 1), hexToLinear(line));

    const midpointSrgb: Rgb = [138 / BYTE_MAX, 160 / BYTE_MAX, 187 / BYTE_MAX];
    const midpointLinear: Rgb = [
      srgbToLinear(midpointSrgb[0]),
      srgbToLinear(midpointSrgb[1]),
      srgbToLinear(midpointSrgb[2]),
    ];

    expectRgbClose(mixSrgb(paper, line, 0.5), midpointLinear);
  });

  test('derives every kind, layer and highlight fill through the sRGB wash', () => {
    for (const theme of THEMES) {
      const palette = blueprint[theme];

      for (const kind of COMPONENT_KINDS) {
        expectRgbClose(
          kindFill(palette, kind),
          mixSrgb(palette[look.fill.base], resolveRole(palette, look.kind[kind]), look.fill.wash),
        );
      }

      expectRgbClose(
        layerFill(palette),
        mixSrgb(palette.surface, palette.lineMuted, look.layer.wash),
      );
      expectRgbClose(
        highlightFill(palette),
        mixSrgb(palette.surface, palette.accent, look.fill.highlightWash),
      );
    }
  });

  test('prints and enforces the light/dark parity table', () => {
    for (const theme of THEMES) {
      const report = parityReport(blueprint[theme]);

      console.log(formatParity(theme, report));

      for (const role of ['ink', 'label', 'steel'] as const) {
        expect(contrastFor(report.text, role), `${theme}.${role} on paper`).toBeGreaterThanOrEqual(
          4.5,
        );
      }

      for (const role of ['lineMuted', 'accent'] as const) {
        expect(
          contrastFor(report.strokes, role),
          `${theme}.${role} on paper`,
        ).toBeGreaterThanOrEqual(3);
      }

      for (const kind of COMPONENT_KINDS) {
        expect(
          edgeFor(report.edgeFill, kind),
          `${theme}.line vs ${kind} fill`,
        ).toBeGreaterThanOrEqual(3);
        expect(
          highlightFor(report.highlightFill, kind),
          `${theme}.highlight vs ${kind} fill`,
        ).toBeGreaterThanOrEqual(10);
      }

      expect(report.smallestKindDeltaE.deltaE, `${theme}.smallest kind ΔE`).toBeGreaterThanOrEqual(
        3,
      );
    }
  });

  test('round-trips the S5 emphasis composition for both bases and palettes', () => {
    for (const theme of THEMES) {
      const palette = blueprint[theme];
      const accent = hexToLinear(palette.accent);
      const paper = hexToLinear(palette.paper);

      for (const baseRole of ['line', 'lineMuted'] as const) {
        const base = hexToLinear(palette[baseRole]);
        const random = mulberry32(RANDOM_SEED);

        for (let index = 0; index < RANDOM_CASES; index += 1) {
          const randomT = random();
          const p = random();
          const t = baseRole === 'lineMuted' ? 0 : randomT;
          const target = mixLinear(mixLinear(base, accent, t), paper, p);
          const recovered = decomposeEmphasis(ratioOf(target, base), base, accent, paper);

          expect(Math.abs(recovered.p - p), `${theme}.${baseRole}[${index}].p`).toBeLessThanOrEqual(
            ROUND_TRIP_TOLERANCE,
          );

          if (p < STABLE_P_LIMIT) {
            expect(
              Math.abs(recovered.t - t),
              `${theme}.${baseRole}[${index}].t`,
            ).toBeLessThanOrEqual(ROUND_TRIP_TOLERANCE);
          }
        }
      }
    }
  });

  test('maps a neutral ratio to exactly zero emphasis', () => {
    for (const theme of THEMES) {
      const palette = blueprint[theme];
      const accent = hexToLinear(palette.accent);
      const paper = hexToLinear(palette.paper);

      for (const baseRole of ['line', 'lineMuted'] as const) {
        expect(
          decomposeEmphasis([1, 1, 1], hexToLinear(palette[baseRole]), accent, paper),
          `${theme}.${baseRole}`,
        ).toStrictEqual({ t: 0, p: 0 });
      }
    }
  });
});
