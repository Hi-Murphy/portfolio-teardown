import { createElement, type CSSProperties, type ReactElement, type SVGProps } from 'react';
import { blueprint, type Palette } from 'xploder/theme';

import {
  LOGO_GLYPH_RECTS,
  LOGO_SHEET_SIZE,
  LOGO_TILE_RADIUS,
  logoGlyphRectsSvg,
} from '../content/logo-glyph';

const SVG_NAMESPACE = 'http://www.w3.org/2000/svg';
const APPLE_ICON_SIZE = 180;

function paletteClasses(palette: Palette): string {
  return `.p{fill:${palette.paper}}.g{fill:${palette.ink}}`;
}

export function iconSvg(): string {
  const light = paletteClasses(blueprint.light);
  const dark = paletteClasses(blueprint.dark);

  return `<svg xmlns="${SVG_NAMESPACE}" width="${LOGO_SHEET_SIZE}" height="${LOGO_SHEET_SIZE}" viewBox="0 0 ${LOGO_SHEET_SIZE} ${LOGO_SHEET_SIZE}"><style>${light}@media (prefers-color-scheme: dark){${dark}}</style><rect class="p" width="${LOGO_SHEET_SIZE}" height="${LOGO_SHEET_SIZE}" rx="${LOGO_TILE_RADIUS}"/><g class="g">${logoGlyphRectsSvg()}</g></svg>`;
}

function rect(props: SVGProps<SVGRectElement>): ReactElement {
  return createElement('rect', props);
}

// iOS masks the touch icon itself, so the apple icon is a full-bleed paper square.
export function appleIconElement(): ReactElement {
  const light = blueprint.light;
  const svg = createElement(
    'svg',
    {
      xmlns: SVG_NAMESPACE,
      width: APPLE_ICON_SIZE,
      height: APPLE_ICON_SIZE,
      viewBox: `0 0 ${LOGO_SHEET_SIZE} ${LOGO_SHEET_SIZE}`,
    } as SVGProps<SVGSVGElement>,
    rect({ width: LOGO_SHEET_SIZE, height: LOGO_SHEET_SIZE, fill: light.paper }),
    ...LOGO_GLYPH_RECTS.map((glyphRect) =>
      rect({ key: `${glyphRect.x}`, ...glyphRect, fill: light.ink }),
    ),
  );
  const style: CSSProperties = {
    width: '100%',
    height: '100%',
    display: 'flex',
    backgroundColor: light.paper,
  };

  return createElement('div', { style }, svg);
}
