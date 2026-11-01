import type { Vec2 } from '../overlay/project';

import { faceBasis, type FaceQuad } from './faces';
import { LETTERING_LOOK, type LetteringLook } from './look';
import { convexPolygonsIntersect, lineHeight, textWidth } from './place';

export interface LayerLetteringLayer {
  readonly id: string;
  readonly index: number;
  readonly name: string;
  readonly corners: FaceQuad;
}

export interface LayerLetteringComponent {
  readonly layerIndex: number;
  readonly hull: readonly Vec2[];
}

export interface FaceLayerLettering {
  readonly kind: 'face';
  readonly id: string;
  readonly layerIndex: number;
  readonly text: string;
  readonly matrix: readonly [number, number, number, number, number, number];
  readonly fontPx: number;
  readonly w: number;
  readonly h: number;
  readonly screen: FaceQuad;
}

export interface PlainLayerLettering {
  readonly kind: 'plain';
  readonly id: string;
  readonly layerIndex: number;
  readonly text: string;
  readonly x: number;
  readonly y: number;
  readonly fontPx: number;
  readonly w: number;
  readonly h: number;
}

export type LayerLettering = FaceLayerLettering | PlainLayerLettering;

export interface LayerLetteringInput {
  readonly layers: readonly LayerLetteringLayer[];
  readonly components: readonly LayerLetteringComponent[];
  readonly look?: LetteringLook;
}

function facePad(lu: number, lv: number, look: LetteringLook): number {
  return Math.max(look.padMinPx, look.padFrac * Math.min(lu, lv));
}

function leftmost(corners: readonly Vec2[]): Vec2 {
  let result = corners[0] ?? ([0, 0] as const);

  for (const corner of corners) {
    if (corner[0] < result[0] || (corner[0] === result[0] && corner[1] < result[1])) {
      result = corner;
    }
  }

  return result;
}

function screenQuad(
  origin: Vec2,
  u: Vec2,
  v: Vec2,
  x: number,
  y: number,
  w: number,
  h: number,
): FaceQuad {
  return [
    [origin[0] + x * u[0] + y * v[0], origin[1] + x * u[1] + y * v[1]],
    [origin[0] + (x + w) * u[0] + y * v[0], origin[1] + (x + w) * u[1] + y * v[1]],
    [origin[0] + (x + w) * u[0] + (y + h) * v[0], origin[1] + (x + w) * u[1] + (y + h) * v[1]],
    [origin[0] + x * u[0] + (y + h) * v[0], origin[1] + x * u[1] + (y + h) * v[1]],
  ];
}

function plainLettering(
  layer: LayerLetteringLayer,
  text: string,
  look: LetteringLook,
): PlainLayerLettering {
  const fontPx = look.annotationFontPx;
  const w = textWidth(text, fontPx, look);
  const h = lineHeight(fontPx, look);
  const anchor = leftmost(layer.corners);

  return {
    kind: 'plain',
    id: layer.id,
    layerIndex: layer.index,
    text,
    x: anchor[0] - look.columnGapPx - w,
    y: anchor[1] - h / 2,
    fontPx,
    w,
    h,
  };
}

export function layerLetteringModel(input: LayerLetteringInput): readonly LayerLettering[] {
  const look = input.look ?? LETTERING_LOOK;

  return input.layers.map((layer) => {
    const text = `${layer.index + 1} ${layer.name}`.toUpperCase();
    const basis = faceBasis(layer.corners, look.baseline);
    const pad = facePad(basis.lu, basis.lv, look);
    const occluders = input.components
      .filter((component) => component.layerIndex <= layer.index)
      .map((component) => component.hull);

    for (let fontPx = look.layerFontMaxPx; fontPx >= look.layerFontMinPx; fontPx -= 1) {
      const w = textWidth(text, fontPx, look);
      const h = lineHeight(fontPx, look);

      if (w > basis.lu - 2 * pad || h > basis.lv - 2 * pad) continue;

      const x = pad;
      const y = basis.lv - pad - h;
      const screen = screenQuad(basis.origin, basis.u, basis.v, x, y, w, h);

      if (occluders.some((hull) => convexPolygonsIntersect(screen, hull))) continue;

      return {
        kind: 'face' as const,
        id: layer.id,
        layerIndex: layer.index,
        text,
        matrix: [
          basis.u[0],
          basis.u[1],
          basis.v[0],
          basis.v[1],
          basis.origin[0] + x * basis.u[0] + y * basis.v[0],
          basis.origin[1] + x * basis.u[1] + y * basis.v[1],
        ] as const,
        fontPx,
        w,
        h,
        screen,
      };
    }

    return plainLettering(layer, text, look);
  });
}
