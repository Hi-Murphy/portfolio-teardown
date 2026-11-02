import {
  hexToLinear,
  highlightFill,
  kindFill,
  layerFill,
  linearToSrgb,
  resolveRole,
  type Rgb,
} from '../look/fills';
import type { RoleRef } from '../look/tokens';
import { emphasis } from '../motion/emphasis';
import { COMPONENT_KINDS, type ComponentKind } from '../schema/constants';
import type { Palette } from '../theme';

export type ContrastSize = 'body' | 'large' | 'ui';
export type ContrastState = 'rest' | 'highlight' | 'dim';
export type ContrastException = 'inactive-dim';

export type BgRef =
  | RoleRef
  | `kindFill:${ComponentKind}`
  | 'highlightFill'
  | 'layerFill'
  | { readonly over: BgRef; readonly mix: RoleRef; readonly t: number };

export interface ContrastSurface {
  readonly id: string;
  readonly slice: string;
  readonly fg: RoleRef;
  readonly bg: BgRef;
  readonly size: ContrastSize;
  readonly state: ContrastState;
}

export interface ContrastRow {
  readonly id: string;
  readonly ratio: number;
  readonly threshold: number;
  readonly pass: boolean;
  readonly exception?: ContrastException;
}

export const CONTRAST_THRESHOLDS = {
  body: 4.5,
  large: 3,
  ui: 3,
} as const satisfies Record<ContrastSize, number>;

const KIND_FILL_PREFIX = 'kindFill:';
const HIGHLIGHT_MIX = 0.1;
const BYTE_MAX = 255;
const SRGB_DECODE_CUTOFF = 0.04045;
const SRGB_DECODE_DIVISOR = 12.92;
const SRGB_DECODE_OFFSET = 0.055;
const SRGB_DECODE_SCALE = 1.055;
const SRGB_GAMMA = 2.4;
const LUMINANCE_COEFFICIENTS = [0.2126, 0.7152, 0.0722] as const;
const WCAG_CONTRAST_OFFSET = 0.05;

type Colour = Rgb | string;

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function toRgb(colour: Colour): Rgb {
  return typeof colour === 'string' ? hexToLinear(colour) : colour;
}

function srgbToLinear(value: number): number {
  return value <= SRGB_DECODE_CUTOFF
    ? value / SRGB_DECODE_DIVISOR
    : ((value + SRGB_DECODE_OFFSET) / SRGB_DECODE_SCALE) ** SRGB_GAMMA;
}

function mixRgbSrgb(from: Rgb, to: Rgb, t: number): Rgb {
  const fromSrgb = linearToSrgb(from);
  const toSrgb = linearToSrgb(to);
  const progress = clamp(t, 0, 1);
  const [fromRed = 0, fromGreen = 0, fromBlue = 0] = fromSrgb;
  const [toRed = fromRed, toGreen = fromGreen, toBlue = fromBlue] = toSrgb;

  return [
    srgbToLinear(fromRed + (toRed - fromRed) * progress),
    srgbToLinear(fromGreen + (toGreen - fromGreen) * progress),
    srgbToLinear(fromBlue + (toBlue - fromBlue) * progress),
  ];
}

// The RFC records fills rounded to the same 8-bit sRGB channels as the palette hex values.
function quantizeSrgbFill(colour: Rgb): Rgb {
  const srgb = linearToSrgb(colour);
  const [red = 0, green = 0, blue = 0] = srgb;

  return [
    srgbToLinear(Math.round(red * BYTE_MAX) / BYTE_MAX),
    srgbToLinear(Math.round(green * BYTE_MAX) / BYTE_MAX),
    srgbToLinear(Math.round(blue * BYTE_MAX) / BYTE_MAX),
  ];
}

function relativeLuminance(colour: Rgb): number {
  return (
    LUMINANCE_COEFFICIENTS[0] * colour[0] +
    LUMINANCE_COEFFICIENTS[1] * colour[1] +
    LUMINANCE_COEFFICIENTS[2] * colour[2]
  );
}

function ratio(foreground: Rgb, background: Rgb): number {
  const foregroundLuminance = relativeLuminance(foreground);
  const backgroundLuminance = relativeLuminance(background);
  const lighter = Math.max(foregroundLuminance, backgroundLuminance);
  const darker = Math.min(foregroundLuminance, backgroundLuminance);

  return (lighter + WCAG_CONTRAST_OFFSET) / (darker + WCAG_CONTRAST_OFFSET);
}

/** CSS alpha compositing: opacity is the weight of the foreground, in sRGB space. */
export function compositeOver(foreground: Colour, background: Colour, opacity: number): Rgb {
  return mixRgbSrgb(toRgb(background), toRgb(foreground), clamp(opacity, 0, 1));
}

function resolveBackground(palette: Palette, ref: BgRef): Rgb {
  if (typeof ref !== 'string') {
    return quantizeSrgbFill(
      mixRgbSrgb(
        resolveBackground(palette, ref.over),
        hexToLinear(resolveRole(palette, ref.mix)),
        ref.t,
      ),
    );
  }

  if (ref.startsWith(KIND_FILL_PREFIX)) {
    return quantizeSrgbFill(kindFill(palette, ref.slice(KIND_FILL_PREFIX.length) as ComponentKind));
  }

  if (ref === 'highlightFill') return quantizeSrgbFill(highlightFill(palette));
  if (ref === 'layerFill') return quantizeSrgbFill(layerFill(palette));

  return hexToLinear(resolveRole(palette, ref as RoleRef));
}

function resolvedForeground(palette: Palette, surface: ContrastSurface): Rgb {
  const foreground = hexToLinear(resolveRole(palette, surface.fg));

  return surface.state === 'dim'
    ? compositeOver(foreground, palette.paper, emphasis.dim.level)
    : foreground;
}

export function measureContrast(palette: Palette, surface: ContrastSurface): ContrastRow {
  const threshold = CONTRAST_THRESHOLDS[surface.size];
  const value = ratio(resolvedForeground(palette, surface), resolveBackground(palette, surface.bg));
  const base = {
    id: surface.id,
    ratio: value,
    threshold,
    pass: value >= threshold,
  };

  return surface.state === 'dim' ? { ...base, exception: 'inactive-dim' } : base;
}

export function contrastTable(
  palette: Palette,
  surfaces: readonly ContrastSurface[] = CONTRAST_SURFACES,
): readonly ContrastRow[] {
  return surfaces.map((surface) => measureContrast(palette, surface));
}

type SurfaceSpec = ContrastSurface & { readonly dimmed?: boolean };

function surface(spec: SurfaceSpec): SurfaceSpec {
  return spec;
}

function surfaceId(surface: ContrastSurface): string {
  return surface.id;
}

function toContrastSurface(spec: SurfaceSpec): ContrastSurface {
  return {
    id: spec.id,
    slice: spec.slice,
    fg: spec.fg,
    bg: spec.bg,
    size: spec.size,
    state: spec.state,
  };
}

const BASE_SURFACES = [
  surface({
    id: 'panel-body',
    slice: 'S7',
    fg: 'ink',
    bg: 'surface',
    size: 'body',
    state: 'rest',
    dimmed: true,
  }),
  surface({
    id: 'panel-label',
    slice: 'S7',
    fg: 'label',
    bg: 'surface',
    size: 'body',
    state: 'rest',
    dimmed: true,
  }),
  surface({
    id: 'panel-link',
    slice: 'S7',
    fg: 'accent',
    bg: 'surface',
    size: 'body',
    state: 'rest',
    dimmed: true,
  }),
  surface({
    id: 'panel-border',
    slice: 'S7',
    fg: 'line',
    bg: 'surface',
    size: 'ui',
    state: 'rest',
  }),
  surface({
    id: 'chip-label',
    slice: 'S7',
    fg: 'ink',
    bg: 'surface',
    size: 'body',
    state: 'rest',
    dimmed: true,
  }),
  surface({
    id: 'chip-border',
    slice: 'S7',
    fg: 'lineMuted',
    bg: 'surface',
    size: 'ui',
    state: 'rest',
  }),
  surface({
    id: 'chip-tech-library-accent',
    slice: 'S7',
    fg: 'tech.library',
    bg: 'surface',
    size: 'ui',
    state: 'rest',
  }),
  surface({
    id: 'tech-library-on-paper',
    slice: 'S2',
    fg: 'tech.library',
    bg: 'paper',
    size: 'ui',
    state: 'rest',
  }),
  surface({
    id: 'caption-heading',
    slice: 'S6',
    fg: 'label',
    bg: 'surface',
    size: 'body',
    state: 'rest',
    dimmed: true,
  }),
  surface({
    id: 'caption-body',
    slice: 'S6',
    fg: 'ink',
    bg: 'surface',
    size: 'body',
    state: 'rest',
    dimmed: true,
  }),
  surface({
    id: 'caption-border',
    slice: 'S6',
    fg: 'line',
    bg: 'surface',
    size: 'ui',
    state: 'rest',
  }),
  surface({
    id: 'callout-label',
    slice: 'S6',
    fg: 'label',
    bg: 'paper',
    size: 'body',
    state: 'rest',
    dimmed: true,
  }),
  surface({
    id: 'balloon-label',
    slice: 'S6',
    fg: 'ink',
    bg: 'surface',
    size: 'body',
    state: 'rest',
    dimmed: true,
  }),
  surface({
    id: 'balloon-border',
    slice: 'S6',
    fg: 'line',
    bg: 'surface',
    size: 'ui',
    state: 'rest',
  }),
  surface({
    id: 'dimension-label',
    slice: 'S6',
    fg: 'steel',
    bg: 'paper',
    size: 'body',
    state: 'rest',
    dimmed: true,
  }),
  surface({
    id: 'leader-line',
    slice: 'S6',
    fg: 'lineMuted',
    bg: 'paper',
    size: 'ui',
    state: 'rest',
  }),
  surface({
    id: 'title-title',
    slice: 'S6',
    fg: 'ink',
    bg: 'paper',
    size: 'body',
    state: 'rest',
    dimmed: true,
  }),
  surface({
    id: 'title-meta',
    slice: 'S6',
    fg: 'steel',
    bg: 'paper',
    size: 'body',
    state: 'rest',
    dimmed: true,
  }),
  surface({
    id: 'title-row',
    slice: 'S6',
    fg: 'label',
    bg: 'paper',
    size: 'body',
    state: 'rest',
    dimmed: true,
  }),
  surface({
    id: 'title-border',
    slice: 'S6',
    fg: 'line',
    bg: 'paper',
    size: 'ui',
    state: 'rest',
  }),
  ...COMPONENT_KINDS.flatMap((kind): SurfaceSpec[] => [
    surface({
      id: `lettering-face-number-rest-${kind}`,
      slice: 'S7',
      fg: 'ink',
      bg: `kindFill:${kind}`,
      size: 'body',
      state: 'rest',
      dimmed: true,
    }),
    surface({
      id: `lettering-face-name-rest-${kind}`,
      slice: 'S7',
      fg: 'label',
      bg: `kindFill:${kind}`,
      size: 'body',
      state: 'rest',
      dimmed: true,
    }),
  ]),
  surface({
    id: 'lettering-face-number-highlight',
    slice: 'S7',
    fg: 'ink',
    bg: 'highlightFill',
    size: 'body',
    state: 'highlight',
    dimmed: true,
  }),
  surface({
    id: 'lettering-face-name-highlight',
    slice: 'S7',
    fg: 'ink',
    bg: 'highlightFill',
    size: 'body',
    state: 'highlight',
    dimmed: true,
  }),
  surface({
    id: 'lettering-column-number',
    slice: 'S7',
    fg: 'accent',
    bg: 'paper',
    size: 'body',
    state: 'rest',
    dimmed: true,
  }),
  surface({
    id: 'lettering-column-name',
    slice: 'S7',
    fg: 'label',
    bg: 'paper',
    size: 'body',
    state: 'rest',
    dimmed: true,
  }),
  surface({
    id: 'lettering-column-number-highlight',
    slice: 'S7',
    fg: 'accent',
    bg: 'paper',
    size: 'body',
    state: 'highlight',
    dimmed: true,
  }),
  surface({
    id: 'lettering-column-name-highlight',
    slice: 'S7',
    fg: 'accent',
    bg: 'paper',
    size: 'body',
    state: 'highlight',
    dimmed: true,
  }),
  surface({
    id: 'lettering-layer-face-label',
    slice: 'S7',
    fg: 'label',
    bg: 'layerFill',
    size: 'body',
    state: 'rest',
    dimmed: true,
  }),
  surface({
    id: 'lettering-layer-plain-label',
    slice: 'S7',
    fg: 'label',
    bg: 'paper',
    size: 'body',
    state: 'rest',
    dimmed: true,
  }),
  surface({
    id: 'focus-ring-paper',
    slice: 'S8',
    fg: 'accent',
    bg: 'paper',
    size: 'ui',
    state: 'rest',
  }),
  surface({
    id: 'focus-ring-surface',
    slice: 'S8',
    fg: 'accent',
    bg: 'surface',
    size: 'ui',
    state: 'rest',
  }),
  surface({
    id: 'focus-ring-kind-fill',
    slice: 'S8',
    fg: 'accent',
    bg: 'kindFill:module',
    size: 'ui',
    state: 'rest',
  }),
  surface({
    id: 'playground-button-text-on-paper',
    slice: 'web',
    fg: 'ink',
    bg: 'paper',
    size: 'body',
    state: 'rest',
    dimmed: true,
  }),
  surface({
    id: 'playground-meta-on-paper',
    slice: 'web',
    fg: 'label',
    bg: 'paper',
    size: 'body',
    state: 'rest',
    dimmed: true,
  }),
  surface({
    id: 'playground-button-text-on-surface',
    slice: 'web',
    fg: 'ink',
    bg: 'surface',
    size: 'body',
    state: 'rest',
    dimmed: true,
  }),
  surface({
    id: 'playground-meta-on-surface',
    slice: 'web',
    fg: 'label',
    bg: 'surface',
    size: 'body',
    state: 'rest',
    dimmed: true,
  }),
  surface({
    id: 'playground-button-text-hover',
    slice: 'web',
    fg: 'ink',
    bg: { over: 'paper', mix: 'ink', t: HIGHLIGHT_MIX },
    size: 'body',
    state: 'rest',
    dimmed: true,
  }),
  surface({
    id: 'playground-meta-hover',
    slice: 'web',
    fg: 'label',
    bg: { over: 'paper', mix: 'ink', t: HIGHLIGHT_MIX },
    size: 'body',
    state: 'rest',
    dimmed: true,
  }),
  surface({
    id: 'playground-button-selected-text',
    slice: 'web',
    fg: 'paper',
    bg: 'ink',
    size: 'body',
    state: 'rest',
    dimmed: true,
  }),
  surface({
    id: 'playground-button-border',
    slice: 'web',
    fg: 'line',
    bg: 'paper',
    size: 'ui',
    state: 'rest',
  }),
] satisfies readonly SurfaceSpec[];

const DIM_SURFACES = BASE_SURFACES.filter((entry) => entry.dimmed === true).map(
  (entry): SurfaceSpec => ({
    id: `${entry.id}-dim`,
    slice: entry.slice,
    fg: entry.fg,
    bg: entry.bg,
    size: entry.size,
    state: 'dim',
  }),
);

export const CONTRAST_SURFACES: readonly ContrastSurface[] = [
  ...BASE_SURFACES.map(toContrastSurface),
  ...DIM_SURFACES.map(toContrastSurface),
];

/**
 * R2 pre-fix measurements. These are evidence only: the committed inventory above
 * records the approved post-fix `ink` roles. T011 flips the four `test.fails` cases
 * once PartLettering applies that role.
 */
export const R2_BEFORE_SURFACES = [
  surface({
    id: 'lettering-face-number-highlight',
    slice: 'S7',
    fg: 'accent',
    bg: 'highlightFill',
    size: 'body',
    state: 'highlight',
  }),
  surface({
    id: 'lettering-face-name-highlight',
    slice: 'S7',
    fg: 'label',
    bg: 'highlightFill',
    size: 'body',
    state: 'highlight',
  }),
] satisfies readonly SurfaceSpec[];

export const CONTRAST_IDS = CONTRAST_SURFACES.map(surfaceId);
