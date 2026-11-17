// Logo C (S19): two blocks joined by a dash, on a 32-unit sheet. Source: .specify/design/logo-c-32.svg.
export const LOGO_SHEET_SIZE = 32;
export const LOGO_TILE_RADIUS = 6;

export interface LogoGlyphRect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly rx: number;
}

export const LOGO_GLYPH_RECTS: readonly LogoGlyphRect[] = [
  { x: 3, y: 12, width: 8.5, height: 8, rx: 1 },
  { x: 20.5, y: 12, width: 8.5, height: 8, rx: 1 },
  { x: 12.5, y: 14.5, width: 7, height: 3, rx: 1 },
];

// The glyph's own bounds, for placements that size it to text rather than to the tile.
export const LOGO_GLYPH_BOUNDS = { x: 3, y: 12, width: 26, height: 8 } as const;

export function logoGlyphRectsSvg(): string {
  return LOGO_GLYPH_RECTS.map(
    ({ x, y, width, height, rx }) =>
      `<rect x="${x}" y="${y}" width="${width}" height="${height}" rx="${rx}"/>`,
  ).join('');
}
