import type { CSSProperties, ReactElement } from 'react';
import { blueprint } from 'xploder/theme';

import type { PosterPoint } from '../../content/poster';
import type { OgCardModel, OgCardSilhouette } from './card-model';

const CANVAS_WIDTH = 1200;
const CANVAS_HEIGHT = 630;
const SHEET_INSET = 20;
const GRID_PITCH = 30;
const MAJOR_GRID_PITCH = 150;
const CONTENT_LEFT = 58;
const CONTENT_TOP = 56;
const CONTENT_RIGHT = 58;
const CONTENT_BOTTOM = 46;
const TEXT_COLUMN_WIDTH = '52%';
const COLUMN_GAP = 38;
const EYEBROW_FONT_SIZE = 19;
const TITLE_FONT_SIZE = 76;
const TITLE_LINE_HEIGHT = 1.1;
const SUBTITLE_FONT_SIZE = 25;
const SUBTITLE_LINE_HEIGHT = 1.35;
const RULE_WIDTH = 68;
const RULE_HEIGHT = 4;
const TEXT_LINE_CLAMP = 2;
const TITLE_BLOCK_WIDTH = 386;
const TITLE_BLOCK_PADDING = 17;
const TITLE_BLOCK_TITLE_SIZE = 25;
const TITLE_BLOCK_META_SIZE = 17;
const TITLE_BLOCK_ROW_SIZE = 18;
const RIGHT_COLUMN_PADDING_TOP = 13;
const RIGHT_COLUMN_PADDING_BOTTOM = 10;
const SILHOUETTE_GAP = 12;
const SILHOUETTE_ROW_MAX_WIDTH = 480;
const SILHOUETTE_STROKE_DIVISOR = 260;

const SANS_FONT = 'IBM Plex Sans';
const MONO_FONT = 'IBM Plex Mono';
const palette = blueprint.light;

function pointsAttribute(points: readonly PosterPoint[]): string {
  return points.map(([x, y]) => `${x},${y}`).join(' ');
}

function topLayerId(silhouette: OgCardSilhouette): string | undefined {
  return silhouette.slabs.reduce<(typeof silhouette.slabs)[number] | undefined>(
    (top, slab) => (top === undefined || slab.center[1] > top.center[1] ? slab : top),
    undefined,
  )?.id;
}

function silhouetteSvg(silhouette: OgCardSilhouette): string {
  const [viewX, viewY, viewWidth, viewHeight] = silhouette.viewBox;
  const strokeWidth = Math.max(viewWidth, viewHeight) / SILHOUETTE_STROKE_DIVISOR;
  const topId = topLayerId(silhouette);
  const slabs = silhouette.slabs
    .map((slab) => {
      const stroke = slab.id === topId ? palette.accent : palette.line;

      return [
        `<g fill="${palette.paper}" stroke="${stroke}" stroke-width="${strokeWidth}" stroke-linejoin="round">`,
        `<polygon points="${pointsAttribute(slab.faces.sideX.points)}"/>`,
        `<polygon points="${pointsAttribute(slab.faces.sideZ.points)}"/>`,
        `<polygon points="${pointsAttribute(slab.faces.top.points)}" fill="${palette.surface}"/>`,
        '</g>',
      ].join('');
    })
    .join('');

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewX} ${viewY} ${viewWidth} ${viewHeight}" preserveAspectRatio="xMidYMid meet">`,
    slabs,
    '</svg>',
  ].join('');
}

function imageSource(svg: string): string {
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function sheetSvg(): string {
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${CANVAS_WIDTH}" height="${CANVAS_HEIGHT}" viewBox="0 0 ${CANVAS_WIDTH} ${CANVAS_HEIGHT}">`,
    `<rect width="${CANVAS_WIDTH}" height="${CANVAS_HEIGHT}" fill="${palette.paper}"/>`,
    '<defs>',
    `<pattern id="minor-grid" width="${GRID_PITCH}" height="${GRID_PITCH}" patternUnits="userSpaceOnUse">`,
    `<path d="M ${GRID_PITCH} 0 L 0 0 0 ${GRID_PITCH}" fill="none" stroke="${palette.grid}" stroke-width="1"/>`,
    '</pattern>',
    `<pattern id="major-grid" width="${MAJOR_GRID_PITCH}" height="${MAJOR_GRID_PITCH}" patternUnits="userSpaceOnUse">`,
    `<path d="M ${MAJOR_GRID_PITCH} 0 L 0 0 0 ${MAJOR_GRID_PITCH}" fill="none" stroke="${palette.lineMuted}" stroke-width="1"/>`,
    '</pattern>',
    '</defs>',
    `<rect width="${CANVAS_WIDTH}" height="${CANVAS_HEIGHT}" fill="url(#minor-grid)"/>`,
    `<rect width="${CANVAS_WIDTH}" height="${CANVAS_HEIGHT}" fill="url(#major-grid)"/>`,
    `<rect x="${SHEET_INSET}" y="${SHEET_INSET}" width="${CANVAS_WIDTH - 2 * SHEET_INSET}" height="${CANVAS_HEIGHT - 2 * SHEET_INSET}" fill="none" stroke="${palette.line}" stroke-width="2"/>`,
    `<rect x="${SHEET_INSET + 7}" y="${SHEET_INSET + 7}" width="${CANVAS_WIDTH - 2 * SHEET_INSET - 14}" height="${CANVAS_HEIGHT - 2 * SHEET_INSET - 14}" fill="none" stroke="${palette.lineMuted}" stroke-width="1"/>`,
    '</svg>',
  ].join('');
}

const pageStyle: CSSProperties = {
  position: 'relative',
  display: 'flex',
  width: `${CANVAS_WIDTH}px`,
  height: `${CANVAS_HEIGHT}px`,
  overflow: 'hidden',
  backgroundColor: palette.paper,
  color: palette.ink,
  fontFamily: SANS_FONT,
};

const sheetStyle: CSSProperties = {
  position: 'absolute',
  top: 0,
  left: 0,
  width: `${CANVAS_WIDTH}px`,
  height: `${CANVAS_HEIGHT}px`,
};

const contentStyle: CSSProperties = {
  position: 'absolute',
  top: `${CONTENT_TOP}px`,
  left: `${CONTENT_LEFT}px`,
  width: `${CANVAS_WIDTH - CONTENT_LEFT - CONTENT_RIGHT}px`,
  height: `${CANVAS_HEIGHT - CONTENT_TOP - CONTENT_BOTTOM}px`,
  display: 'flex',
  flexDirection: 'row',
};

const textColumnStyle: CSSProperties = {
  width: TEXT_COLUMN_WIDTH,
  height: '100%',
  paddingRight: `${COLUMN_GAP / 2}px`,
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
};

const rightColumnStyle: CSSProperties = {
  flex: 1,
  height: '100%',
  paddingLeft: `${COLUMN_GAP / 2}px`,
  paddingTop: `${RIGHT_COLUMN_PADDING_TOP}px`,
  paddingBottom: `${RIGHT_COLUMN_PADDING_BOTTOM}px`,
  display: 'flex',
  flexDirection: 'column',
};

const columnRuleStyle: CSSProperties = {
  width: '1px',
  height: '100%',
  backgroundColor: palette.lineMuted,
  opacity: 0.55,
};

const eyebrowStyle: CSSProperties = {
  color: palette.label,
  fontFamily: MONO_FONT,
  fontSize: `${EYEBROW_FONT_SIZE}px`,
  fontWeight: 400,
  letterSpacing: '1.7px',
  lineHeight: 1.3,
};

const ruleStyle: CSSProperties = {
  width: `${RULE_WIDTH}px`,
  height: `${RULE_HEIGHT}px`,
  marginTop: '17px',
  marginBottom: '21px',
  backgroundColor: palette.accent,
};

const titleStyle: CSSProperties = {
  display: 'block',
  maxWidth: '560px',
  color: palette.ink,
  fontFamily: SANS_FONT,
  fontSize: `${TITLE_FONT_SIZE}px`,
  fontWeight: 600,
  letterSpacing: '-2.1px',
  lineHeight: TITLE_LINE_HEIGHT,
  lineClamp: TEXT_LINE_CLAMP,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
};

const subtitleStyle: CSSProperties = {
  display: 'block',
  maxWidth: '565px',
  marginTop: '22px',
  color: palette.label,
  fontFamily: SANS_FONT,
  fontSize: `${SUBTITLE_FONT_SIZE}px`,
  fontWeight: 600,
  letterSpacing: '-0.25px',
  lineHeight: SUBTITLE_LINE_HEIGHT,
  lineClamp: TEXT_LINE_CLAMP,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
};

const titleBlockStyle: CSSProperties = {
  width: `${TITLE_BLOCK_WIDTH}px`,
  alignSelf: 'flex-end',
  padding: `${TITLE_BLOCK_PADDING}px`,
  display: 'flex',
  flexDirection: 'column',
  borderWidth: '2px',
  borderStyle: 'solid',
  borderColor: palette.line,
  backgroundColor: palette.paper,
};

const titleBlockTitleStyle: CSSProperties = {
  color: palette.ink,
  fontFamily: SANS_FONT,
  fontSize: `${TITLE_BLOCK_TITLE_SIZE}px`,
  fontWeight: 600,
  letterSpacing: '-0.4px',
  lineHeight: 1.1,
};

const titleBlockMetaStyle: CSSProperties = {
  marginTop: '3px',
  color: palette.steel,
  fontFamily: MONO_FONT,
  fontSize: `${TITLE_BLOCK_META_SIZE}px`,
  fontWeight: 400,
  lineHeight: 1.35,
};

const titleBlockRuleStyle: CSSProperties = {
  height: '1px',
  marginTop: '11px',
  marginBottom: '9px',
  backgroundColor: palette.lineMuted,
};

const titleBlockRowsStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
};

const titleBlockRowStyle: CSSProperties = {
  color: palette.label,
  fontFamily: MONO_FONT,
  fontSize: `${TITLE_BLOCK_ROW_SIZE}px`,
  fontWeight: 400,
  lineHeight: 1.28,
};

function titleBlockEstimatedHeight(model: OgCardModel): number {
  const metaHeight = model.titleBlock.meta.length > 0 ? TITLE_BLOCK_META_SIZE * 1.5 + 3 : 0;

  return (
    TITLE_BLOCK_PADDING * 2 +
    TITLE_BLOCK_TITLE_SIZE * 1.2 +
    metaHeight +
    21 +
    model.titleBlock.rows.length * TITLE_BLOCK_ROW_SIZE * 1.35
  );
}

function fitSilhouette(
  silhouette: OgCardSilhouette,
  maxWidth: number,
  maxHeight: number,
): { width: number; height: number } {
  const [, , viewWidth, viewHeight] = silhouette.viewBox;
  const scale = Math.min(maxWidth / viewWidth, maxHeight / viewHeight);

  return { width: viewWidth * scale, height: viewHeight * scale };
}

export function cardElement(model: OgCardModel): ReactElement {
  const rightColumnHeight =
    CANVAS_HEIGHT -
    CONTENT_TOP -
    CONTENT_BOTTOM -
    RIGHT_COLUMN_PADDING_TOP -
    RIGHT_COLUMN_PADDING_BOTTOM;
  const silhouetteHeight = Math.max(
    180,
    rightColumnHeight - titleBlockEstimatedHeight(model) - SILHOUETTE_GAP,
  );
  const silhouetteMaxWidth =
    (SILHOUETTE_ROW_MAX_WIDTH - SILHOUETTE_GAP * (model.silhouettes.length - 1)) /
    Math.max(1, model.silhouettes.length);

  return (
    <div style={pageStyle}>
      <img src={imageSource(sheetSvg())} style={sheetStyle} alt="" />

      <div style={contentStyle}>
        <div style={textColumnStyle}>
          <div style={eyebrowStyle}>{model.eyebrow}</div>
          <div style={ruleStyle} />
          <div style={titleStyle}>{model.title}</div>
          <div style={subtitleStyle}>{model.subtitle}</div>
        </div>

        <div style={columnRuleStyle} />

        <div style={rightColumnStyle}>
          <div
            style={{
              height: `${silhouetteHeight}px`,
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '16px',
            }}
          >
            {model.silhouettes.map((item) => (
              <img
                key={item.projectId}
                src={imageSource(silhouetteSvg(item))}
                style={{
                  ...fitSilhouette(item, silhouetteMaxWidth, silhouetteHeight),
                  flex: 'none',
                  objectFit: 'contain',
                }}
                alt=""
              />
            ))}
          </div>

          <div style={titleBlockStyle}>
            <div style={titleBlockTitleStyle}>{model.titleBlock.title}</div>
            {model.titleBlock.meta.length > 0 ? (
              <div style={titleBlockMetaStyle}>{model.titleBlock.meta}</div>
            ) : null}
            <div style={titleBlockRuleStyle} />
            <div style={titleBlockRowsStyle}>
              {model.titleBlock.rows.map((row, index) => (
                <div key={`${index}-${row}`} style={titleBlockRowStyle}>
                  {row}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
