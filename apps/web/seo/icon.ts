import { createElement, type CSSProperties, type ReactElement, type SVGProps } from 'react';
import { blueprint, type Palette } from 'xploder/theme';

const SVG_NAMESPACE = 'http://www.w3.org/2000/svg';
const SHEET_SIZE = 32;
const APPLE_ICON_SIZE = 180;
const FRAME_INSET = 1;
const FRAME_SIZE = SHEET_SIZE - FRAME_INSET * 2;
const CONTENT_LEFT = 2;
const CONTENT_RIGHT = 30;
const RULE_ONE_Y = 11;
const RULE_TWO_Y = 15;
const TITLE_TOP = 18;
const TITLE_HEIGHT = 6;
const META_TOP = TITLE_TOP + TITLE_HEIGHT;
const META_BOTTOM = 30;
const DIVIDER_X = SHEET_SIZE / 2;
const RULE_PATH = `M${CONTENT_LEFT} ${RULE_ONE_Y}H${CONTENT_RIGHT}M${CONTENT_LEFT} ${RULE_TWO_Y}H${CONTENT_RIGHT}`;
const DIVIDER_PATH = `M${DIVIDER_X} ${META_TOP}V${META_BOTTOM}`;

function paletteClasses(palette: Palette): string {
  return `.p{fill:${palette.paper}}.l{stroke:${palette.line}}.m{stroke:${palette.lineMuted}}.a{fill:${palette.accent}}`;
}

export function iconSvg(): string {
  const light = paletteClasses(blueprint.light);
  const dark = paletteClasses(blueprint.dark);

  return `<svg xmlns="${SVG_NAMESPACE}" width="${SHEET_SIZE}" height="${SHEET_SIZE}" viewBox="0 0 ${SHEET_SIZE} ${SHEET_SIZE}" shape-rendering="crispEdges"><style>${light}@media (prefers-color-scheme: dark){${dark}}</style><rect class="p" width="${SHEET_SIZE}" height="${SHEET_SIZE}"/><rect class="l" x="${FRAME_INSET}" y="${FRAME_INSET}" width="${FRAME_SIZE}" height="${FRAME_SIZE}" fill="none" stroke-width="2"/><path class="m" d="${RULE_PATH}" fill="none" stroke-width="2"/><rect class="a" x="${CONTENT_LEFT}" y="${TITLE_TOP}" width="${CONTENT_RIGHT - CONTENT_LEFT}" height="${TITLE_HEIGHT}"/><path class="l" d="${DIVIDER_PATH}" fill="none" stroke-width="2"/></svg>`;
}

function rect(props: SVGProps<SVGRectElement>): ReactElement {
  return createElement('rect', props);
}

function path(props: SVGProps<SVGPathElement>): ReactElement {
  return createElement('path', props);
}

export function appleIconElement(): ReactElement {
  const light = blueprint.light;
  const svg = createElement(
    'svg',
    {
      xmlns: SVG_NAMESPACE,
      width: APPLE_ICON_SIZE,
      height: APPLE_ICON_SIZE,
      viewBox: `0 0 ${SHEET_SIZE} ${SHEET_SIZE}`,
      shapeRendering: 'crispEdges',
    } as SVGProps<SVGSVGElement>,
    rect({ width: SHEET_SIZE, height: SHEET_SIZE, fill: light.paper }),
    rect({
      x: FRAME_INSET,
      y: FRAME_INSET,
      width: FRAME_SIZE,
      height: FRAME_SIZE,
      fill: 'none',
      stroke: light.line,
      strokeWidth: 2,
    }),
    path({ d: RULE_PATH, fill: 'none', stroke: light.lineMuted, strokeWidth: 2 }),
    rect({
      x: CONTENT_LEFT,
      y: TITLE_TOP,
      width: CONTENT_RIGHT - CONTENT_LEFT,
      height: TITLE_HEIGHT,
      fill: light.accent,
    }),
    path({ d: DIVIDER_PATH, fill: 'none', stroke: light.line, strokeWidth: 2 }),
  );
  const style: CSSProperties = {
    width: '100%',
    height: '100%',
    display: 'flex',
    backgroundColor: light.paper,
  };

  return createElement('div', { style }, svg);
}
