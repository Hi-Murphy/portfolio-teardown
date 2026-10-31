import { COMPONENT_KINDS, type ComponentKind, type TechCategory } from '../schema/constants';
import type { Palette, PaletteRole } from '../theme';
import { look, type RoleRef } from './tokens';

export type Rgb = readonly [number, number, number];

export interface ContrastRow {
  readonly role: PaletteRole;
  readonly ratio: number;
}

export interface EdgeFillContrast {
  readonly kind: ComponentKind;
  readonly ratio: number;
}

export interface HighlightFillDeltaE {
  readonly kind: ComponentKind;
  readonly deltaE: number;
}

export interface KindDeltaE {
  readonly left: ComponentKind;
  readonly right: ComponentKind;
  readonly deltaE: number;
}

export interface ParityReport {
  readonly text: readonly ContrastRow[];
  readonly strokes: readonly ContrastRow[];
  readonly edgeFill: readonly EdgeFillContrast[];
  readonly highlightFill: readonly HighlightFillDeltaE[];
  readonly smallestKindDeltaE: KindDeltaE;
}

const TECH_ROLE_PREFIX = 'tech.';
const BYTE_MAX = 255;
const SRGB_DECODE_CUTOFF = 0.04045;
const SRGB_DECODE_DIVISOR = 12.92;
const SRGB_DECODE_OFFSET = 0.055;
const SRGB_DECODE_SCALE = 1.055;
const SRGB_GAMMA = 2.4;
const SRGB_ENCODE_CUTOFF = 0.0031308;
const SRGB_ENCODE_LINEAR_SCALE = 12.92;
const SRGB_ENCODE_SCALE = 1.055;
const SRGB_ENCODE_OFFSET = 0.055;
const SRGB_ENCODE_EXPONENT = 1 / 2.4;
const LUMINANCE_COEFFICIENTS = [0.2126, 0.7152, 0.0722] as const;
const WCAG_CONTRAST_OFFSET = 0.05;
const DECOMPOSE_P_LIMIT = 0.999;
const SRGB_TO_XYZ = [
  [0.4124, 0.3576, 0.1805],
  [0.2126, 0.7152, 0.0722],
  [0.0193, 0.1192, 0.9505],
] as const;
const D65_WHITE = [0.95047, 1, 1.08883] as const;
const LAB_EPSILON = 0.008856;
const LAB_KAPPA = 7.787;
const LAB_LIGHT_OFFSET = 16;
const LAB_LIGHT_SCALE = 116;
const LAB_OFFSET = LAB_LIGHT_OFFSET / LAB_LIGHT_SCALE;
const LAB_RED_SCALE = 500;
const LAB_BLUE_SCALE = 200;
const THEME_TEXT_ROLES = ['ink', 'label', 'steel'] as const satisfies readonly PaletteRole[];
const THEME_STROKE_ROLES = ['lineMuted', 'accent'] as const satisfies readonly PaletteRole[];

function hexChannels(hex: string): Rgb {
  const match = /^#([0-9a-fA-F]{2})([0-9a-fA-F]{2})([0-9a-fA-F]{2})$/.exec(hex);
  const red = match?.[1];
  const green = match?.[2];
  const blue = match?.[3];

  if (!red || !green || !blue) throw new Error(`Invalid hex colour: ${hex}`);

  return [
    Number.parseInt(red, 16) / BYTE_MAX,
    Number.parseInt(green, 16) / BYTE_MAX,
    Number.parseInt(blue, 16) / BYTE_MAX,
  ];
}

function srgbToLinear(value: number): number {
  return value <= SRGB_DECODE_CUTOFF
    ? value / SRGB_DECODE_DIVISOR
    : ((value + SRGB_DECODE_OFFSET) / SRGB_DECODE_SCALE) ** SRGB_GAMMA;
}

function linearToSrgbChannel(value: number): number {
  return value <= SRGB_ENCODE_CUTOFF
    ? value * SRGB_ENCODE_LINEAR_SCALE
    : SRGB_ENCODE_SCALE * value ** SRGB_ENCODE_EXPONENT - SRGB_ENCODE_OFFSET;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function relativeLuminance(colour: Rgb): number {
  return (
    LUMINANCE_COEFFICIENTS[0] * colour[0] +
    LUMINANCE_COEFFICIENTS[1] * colour[1] +
    LUMINANCE_COEFFICIENTS[2] * colour[2]
  );
}

function contrastRatio(foreground: Rgb, background: Rgb): number {
  const foregroundLuminance = relativeLuminance(foreground);
  const backgroundLuminance = relativeLuminance(background);
  const lighter = Math.max(foregroundLuminance, backgroundLuminance);
  const darker = Math.min(foregroundLuminance, backgroundLuminance);

  return (lighter + WCAG_CONTRAST_OFFSET) / (darker + WCAG_CONTRAST_OFFSET);
}

function labCurve(value: number): number {
  return value > LAB_EPSILON ? value ** (1 / 3) : LAB_KAPPA * value + LAB_OFFSET;
}

function lab(colour: Rgb): Rgb {
  const [red, green, blue] = colour;
  const xyz: Rgb = [
    SRGB_TO_XYZ[0][0] * red + SRGB_TO_XYZ[0][1] * green + SRGB_TO_XYZ[0][2] * blue,
    SRGB_TO_XYZ[1][0] * red + SRGB_TO_XYZ[1][1] * green + SRGB_TO_XYZ[1][2] * blue,
    SRGB_TO_XYZ[2][0] * red + SRGB_TO_XYZ[2][1] * green + SRGB_TO_XYZ[2][2] * blue,
  ];
  const [x = 0, y = 0, z = 0] = xyz.map((value, index) =>
    labCurve(value / (D65_WHITE[index] ?? 1)),
  );

  return [
    LAB_LIGHT_SCALE * y - LAB_LIGHT_OFFSET,
    LAB_RED_SCALE * (x - y),
    LAB_BLUE_SCALE * (y - z),
  ];
}

function deltaE(left: Rgb, right: Rgb): number {
  const [leftLightness, leftRed, leftBlue] = lab(left);
  const [rightLightness, rightRed, rightBlue] = lab(right);

  return Math.hypot(leftLightness - rightLightness, leftRed - rightRed, leftBlue - rightBlue);
}

export function hexToLinear(hex: string): Rgb {
  const [red, green, blue] = hexChannels(hex);

  return [srgbToLinear(red), srgbToLinear(green), srgbToLinear(blue)];
}

export function linearToSrgb(colour: Rgb): Rgb {
  const [red, green, blue] = colour;

  return [linearToSrgbChannel(red), linearToSrgbChannel(green), linearToSrgbChannel(blue)];
}

export function mixSrgb(a: string, b: string, t: number): Rgb {
  const left = hexChannels(a);
  const right = hexChannels(b);
  const [leftRed, leftGreen, leftBlue] = left;
  const [rightRed, rightGreen, rightBlue] = right;

  return [
    srgbToLinear(leftRed + (rightRed - leftRed) * t),
    srgbToLinear(leftGreen + (rightGreen - leftGreen) * t),
    srgbToLinear(leftBlue + (rightBlue - leftBlue) * t),
  ];
}

export function resolveRole(palette: Palette, ref: RoleRef): string {
  if (ref.startsWith(TECH_ROLE_PREFIX)) {
    return palette.tech[ref.slice(TECH_ROLE_PREFIX.length) as TechCategory];
  }

  return palette[ref as PaletteRole];
}

export function kindFill(palette: Palette, kind: ComponentKind): Rgb {
  return mixSrgb(palette[look.fill.base], resolveRole(palette, look.kind[kind]), look.fill.wash);
}

export function layerFill(palette: Palette): Rgb {
  return mixSrgb(palette.surface, palette.lineMuted, look.layer.wash);
}

export function highlightFill(palette: Palette): Rgb {
  return mixSrgb(palette.surface, palette.accent, look.fill.highlightWash);
}

export function decomposeEmphasis(
  ratio: Rgb,
  base: Rgb,
  accent: Rgb,
  paper: Rgb,
): { t: number; p: number } {
  const target: Rgb = [base[0] * ratio[0], base[1] * ratio[1], base[2] * ratio[2]];
  const difference: Rgb = [target[0] - base[0], target[1] - base[1], target[2] - base[2]];
  const accentDirection: Rgb = [accent[0] - base[0], accent[1] - base[1], accent[2] - base[2]];
  const paperDirection: Rgb = [paper[0] - base[0], paper[1] - base[1], paper[2] - base[2]];
  const accentSquared = accentDirection.reduce((sum, value) => sum + value * value, 0);
  const paperSquared = paperDirection.reduce((sum, value) => sum + value * value, 0);
  const dot = accentDirection.reduce(
    (sum, value, index) => sum + value * (paperDirection[index] ?? 0),
    0,
  );
  const accentDifference = accentDirection.reduce(
    (sum, value, index) => sum + value * (difference[index] ?? 0),
    0,
  );
  const paperDifference = paperDirection.reduce(
    (sum, value, index) => sum + value * (difference[index] ?? 0),
    0,
  );
  const determinant = accentSquared * paperSquared - dot * dot;
  const alpha = (accentDifference * paperSquared - paperDifference * dot) / determinant;
  const beta = (accentSquared * paperDifference - dot * accentDifference) / determinant;
  const p = clamp(beta, 0, 1);
  const t = p < DECOMPOSE_P_LIMIT ? clamp(alpha / (1 - p), 0, 1) : 0;

  return { t, p };
}

export function parityReport(palette: Palette): ParityReport {
  const paper = hexToLinear(palette.paper);
  const fills = COMPONENT_KINDS.map((kind) => ({ kind, fill: kindFill(palette, kind) }));
  const highlight = highlightFill(palette);
  const text = THEME_TEXT_ROLES.map((role) => ({
    role,
    ratio: contrastRatio(hexToLinear(palette[role]), paper),
  }));
  const strokes = THEME_STROKE_ROLES.map((role) => ({
    role,
    ratio: contrastRatio(hexToLinear(palette[role]), paper),
  }));
  const edge = hexToLinear(palette.line);
  const edgeFill = fills.map(({ kind, fill }) => ({
    kind,
    ratio: contrastRatio(edge, fill),
  }));
  const highlightFillRows = fills.map(({ kind, fill }) => ({
    kind,
    deltaE: deltaE(highlight, fill),
  }));

  let smallestKindDeltaE: KindDeltaE | null = null;

  for (let leftIndex = 0; leftIndex < fills.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < fills.length; rightIndex += 1) {
      const left = fills[leftIndex];
      const right = fills[rightIndex];

      if (left === undefined || right === undefined) continue;

      const value = deltaE(left.fill, right.fill);

      if (smallestKindDeltaE === null || value < smallestKindDeltaE.deltaE) {
        smallestKindDeltaE = { left: left.kind, right: right.kind, deltaE: value };
      }
    }
  }

  if (smallestKindDeltaE === null) {
    throw new Error('Parity report requires at least two component kinds');
  }

  return { text, strokes, edgeFill, highlightFill: highlightFillRows, smallestKindDeltaE };
}
