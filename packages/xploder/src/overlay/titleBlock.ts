import type { ProjectLayout } from '../layout';
import type { LookTokens } from '../look/tokens';

import { labelBox, layerNumber, type LabelBox } from './parts';
import { rectIntersectsPolygon, type Rect } from './place';
import { convexHull, type OverlayFrame, type Vec2 } from './project';

export type TitleBlockCorner = 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';

export interface TitleBlockProject {
  readonly meta: {
    readonly slug: string;
    readonly name?: string;
  };
  readonly layers: readonly {
    readonly id: string;
    readonly name?: string;
  }[];
}

export interface TitleBlockLines {
  readonly title: string;
  readonly meta: string;
  readonly rows: readonly string[];
}

export interface TitleBlockPlacement extends Rect {
  readonly corner: TitleBlockCorner;
}

const CORNERS = ['bottom-right', 'bottom-left', 'top-right', 'top-left'] as const;

function inflate(rect: Rect, amount: number): Rect {
  return {
    x: rect.x - amount,
    y: rect.y - amount,
    w: rect.w + 2 * amount,
    h: rect.h + 2 * amount,
  };
}

function cornerRect(
  corner: TitleBlockCorner,
  box: LabelBox,
  viewport: { readonly width: number; readonly height: number },
  insetPx: number,
): Rect {
  return {
    x: corner.endsWith('right') ? viewport.width - insetPx - box.w : insetPx,
    y: corner.startsWith('bottom') ? viewport.height - insetPx - box.h : insetPx,
    w: box.w,
    h: box.h,
  };
}

export function titleBlockLines(
  project: TitleBlockProject,
  layout: Pick<ProjectLayout, 'footprint'>,
): TitleBlockLines {
  return {
    title: project.meta.name ?? project.meta.slug,
    meta: `${project.layers.length} layers · ${layout.footprint.cols} × ${layout.footprint.rows}`,
    rows: project.layers.map(
      (layer, layerIndex) => `${layerNumber(layerIndex)} ${layer.name ?? layer.id}`,
    ),
  };
}

export function titleBlockBox(lines: TitleBlockLines, look: LookTokens): LabelBox {
  const textLines = [lines.title, lines.meta, ...lines.rows];

  return {
    w: Math.max(...textLines.map((line) => labelBox(line, look.annotation).w)),
    h:
      textLines.length * Math.ceil(look.annotation.lineEm * look.annotation.fontPx) +
      2 * look.annotation.padYPx,
  };
}

export function placeTitleBlock(
  box: LabelBox,
  frame: OverlayFrame,
  viewport: { readonly width: number; readonly height: number },
  look: LookTokens,
): TitleBlockPlacement | null {
  const silhouettes: readonly (readonly Vec2[])[] = [
    ...frame.components.map((component) => component.hull),
    ...frame.layers.map((layer) => convexHull(layer.corners)),
  ];

  for (const corner of CORNERS) {
    const rect = cornerRect(corner, box, viewport, look.titleBlock.insetPx);

    if (
      rect.x < 0 ||
      rect.y < 0 ||
      rect.x + rect.w > viewport.width ||
      rect.y + rect.h > viewport.height
    ) {
      continue;
    }

    const inflated = inflate(rect, look.annotation.gapPx);

    if (silhouettes.some((silhouette) => rectIntersectsPolygon(inflated, silhouette))) continue;

    return { ...rect, corner };
  }

  return null;
}
