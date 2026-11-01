import type { Vec2 } from '../overlay/project';

import { faceBasis, type FaceQuad } from './faces';
import { LETTERING_LOOK, type LetteringLook } from './look';

export interface LetteringBox {
  readonly w: number;
  readonly h: number;
}

export interface FaceLettering {
  readonly kind: 'face';
  readonly matrix: readonly [number, number, number, number, number, number];
  readonly numberPx: number;
  readonly namePx: number | null;
  readonly nameLines: readonly string[];
  readonly box: LetteringBox;
  readonly screen: FaceQuad;
}

export interface MarkLettering {
  readonly kind: 'mark';
  readonly x: number;
  readonly y: number;
  readonly numberPx: number;
  readonly matrix: readonly [number, number, number, number, number, number];
  readonly box: LetteringBox;
  readonly anchor: Vec2;
}

export type Lettering = FaceLettering | MarkLettering;

export interface LetterPartInput {
  readonly quad: FaceQuad;
  readonly number: string;
  readonly name: string | null;
  readonly occluders: readonly (readonly Vec2[])[];
  readonly look?: LetteringLook;
}

interface GridPoint {
  readonly x: number;
  readonly y: number;
  readonly index: number;
}

function characterCount(text: string): number {
  return Array.from(text).length;
}

export function textWidth(text: string, fontPx: number, look: LetteringLook): number {
  return Math.ceil(characterCount(text) * look.charEm * fontPx);
}

export function lineHeight(fontPx: number, look: LetteringLook): number {
  return Math.ceil(look.lineEm * fontPx);
}

function wrappedName(
  name: string,
  fontPx: number,
  availableWidth: number,
  look: LetteringLook,
): readonly string[] | null {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = '';

  for (const word of words) {
    if (textWidth(word, fontPx, look) > availableWidth) return null;

    const candidate = line === '' ? word : `${line} ${word}`;

    if (textWidth(candidate, fontPx, look) <= availableWidth) {
      line = candidate;
      continue;
    }

    if (lines.length >= look.nameMaxLines) return null;

    lines.push(line);
    line = word;
  }

  if (line !== '') lines.push(line);

  return lines.length === 0 || lines.length > look.nameMaxLines ? null : lines;
}

function facePad(lu: number, lv: number, look: LetteringLook): number {
  return Math.max(look.padMinPx, look.padFrac * Math.min(lu, lv));
}

function screenPoint(origin: Vec2, u: Vec2, v: Vec2, x: number, y: number): Vec2 {
  return [origin[0] + x * u[0] + y * v[0], origin[1] + x * u[1] + y * v[1]];
}

function screenBox(
  origin: Vec2,
  u: Vec2,
  v: Vec2,
  x: number,
  y: number,
  box: LetteringBox,
): FaceQuad {
  return [
    screenPoint(origin, u, v, x, y),
    screenPoint(origin, u, v, x + box.w, y),
    screenPoint(origin, u, v, x + box.w, y + box.h),
    screenPoint(origin, u, v, x, y + box.h),
  ];
}

function projection(points: readonly Vec2[], axis: Vec2): readonly [number, number] {
  let min = Infinity;
  let max = -Infinity;

  for (const point of points) {
    const value = point[0] * axis[0] + point[1] * axis[1];
    min = Math.min(min, value);
    max = Math.max(max, value);
  }

  return [min, max];
}

export function convexPolygonsIntersect(left: readonly Vec2[], right: readonly Vec2[]): boolean {
  if (left.length === 0 || right.length === 0) return false;

  for (const polygon of [left, right]) {
    for (let index = 0; index < polygon.length; index += 1) {
      const from = polygon[index];
      const to = polygon[(index + 1) % polygon.length];

      if (from === undefined || to === undefined) continue;

      const edge: Vec2 = [to[0] - from[0], to[1] - from[1]];
      const axis: Vec2 = [-edge[1], edge[0]];

      if (axis[0] === 0 && axis[1] === 0) continue;

      const [leftMin, leftMax] = projection(left, axis);
      const [rightMin, rightMax] = projection(right, axis);

      if (leftMax <= rightMin || rightMax <= leftMin) return false;
    }
  }

  return true;
}

function collides(screen: FaceQuad, occluders: readonly (readonly Vec2[])[]): boolean {
  return occluders.some((occluder) => convexPolygonsIntersect(screen, occluder));
}

function gridAxis(min: number, max: number, steps: number): readonly number[] {
  if (max < min || steps <= 0) return [];
  if (steps === 1) return [min];

  return Array.from({ length: steps }, (_, index) => min + ((max - min) * index) / (steps - 1));
}

function orderedGrid(
  box: LetteringBox,
  lu: number,
  lv: number,
  pad: number,
  look: LetteringLook,
): readonly GridPoint[] {
  const xs = gridAxis(pad, lu - pad - box.w, look.gridSteps);
  const ys = gridAxis(pad, lv - pad - box.h, look.gridSteps);
  const faceCenter: Vec2 = [lu / 2, lv / 2];
  const points: GridPoint[] = [];

  for (const y of ys) {
    for (const x of xs) {
      points.push({ x, y, index: points.length });
    }
  }

  return points.sort((left, right) => {
    const leftDistance = Math.hypot(
      left.x + box.w / 2 - faceCenter[0],
      left.y + box.h / 2 - faceCenter[1],
    );
    const rightDistance = Math.hypot(
      right.x + box.w / 2 - faceCenter[0],
      right.y + box.h / 2 - faceCenter[1],
    );

    return leftDistance - rightDistance || left.index - right.index;
  });
}

function faceLettering(
  quad: FaceQuad,
  number: string,
  name: string | null,
  occluders: readonly (readonly Vec2[])[],
  look: LetteringLook,
): FaceLettering | null {
  const basis = faceBasis(quad, look.baseline);
  const pad = facePad(basis.lu, basis.lv, look);
  const availableWidth = basis.lu - 2 * pad;
  const availableHeight = basis.lv - 2 * pad;

  const attempt = (
    numberPx: number,
    namePx: number | null,
    nameLines: readonly string[],
  ): FaceLettering | null => {
    const numberLine = lineHeight(numberPx, look);
    const nameLine = namePx === null ? 0 : lineHeight(namePx, look);
    const box: LetteringBox = {
      w: Math.max(
        textWidth(number, numberPx, look),
        ...nameLines.map((text) => textWidth(text, namePx ?? 0, look)),
      ),
      h: numberLine + nameLine * nameLines.length,
    };

    if (box.w > availableWidth || box.h > availableHeight) return null;

    for (const point of orderedGrid(box, basis.lu, basis.lv, pad, look)) {
      const screen = screenBox(basis.origin, basis.u, basis.v, point.x, point.y, box);

      if (collides(screen, occluders)) continue;

      return {
        kind: 'face',
        matrix: [
          basis.u[0],
          basis.u[1],
          basis.v[0],
          basis.v[1],
          basis.origin[0] + point.x * basis.u[0] + point.y * basis.v[0],
          basis.origin[1] + point.x * basis.u[1] + point.y * basis.v[1],
        ],
        numberPx,
        namePx,
        nameLines,
        box,
        screen,
      };
    }

    return null;
  };

  for (let numberPx = Math.floor(look.numberMaxPx); numberPx >= look.numberMinPx; numberPx -= 1) {
    if (name !== null && name.trim() !== '') {
      const namePx = Math.max(look.nameMinPx, Math.round(look.nameRatio * numberPx));
      const oneLine = attempt(numberPx, namePx, [name]);

      if (oneLine !== null) return oneLine;

      const lines = wrappedName(name, namePx, availableWidth, look);
      const placed = lines === null ? null : attempt(numberPx, namePx, lines);

      if (placed !== null) return placed;
    }
  }

  for (let numberPx = Math.floor(look.numberMaxPx); numberPx >= look.numberMinPx; numberPx -= 1) {
    const placed = attempt(numberPx, null, []);

    if (placed !== null) return placed;
  }

  return null;
}

function markLettering(
  quad: FaceQuad,
  number: string,
  occluders: readonly (readonly Vec2[])[],
  look: LetteringLook,
): MarkLettering {
  const basis = faceBasis(quad, look.baseline);
  const anchor = quad.reduce((front, corner) => (corner[1] > front[1] ? corner : front));
  const numberPx = look.numberMinPx;
  const box: LetteringBox = { w: textWidth(number, numberPx, look), h: lineHeight(numberPx, look) };
  const offset = look.markOffsetPx;
  const candidates: readonly Vec2[] = [
    [anchor[0] - offset - box.w, anchor[1] + offset],
    [anchor[0] + offset, anchor[1] + offset],
    [anchor[0] - offset - box.w, anchor[1] - box.h / 2],
    [anchor[0] + offset, anchor[1] - box.h / 2],
  ];
  const fallback = candidates[0] ?? [anchor[0] - offset - box.w, anchor[1] + offset];
  const selected = candidates.find(([x, y]) => {
    const screen: FaceQuad = [
      [x, y],
      [x + box.w, y],
      [x + box.w, y + box.h],
      [x, y + box.h],
    ];

    return !collides(screen, occluders);
  });
  const [x, y] = selected ?? fallback;

  return {
    kind: 'mark',
    x,
    y,
    numberPx,
    matrix: [basis.u[0], basis.u[1], basis.v[0], basis.v[1], x, y],
    box,
    anchor,
  };
}

export function letterPart(input: LetterPartInput): Lettering {
  const look = input.look ?? LETTERING_LOOK;
  const placed = faceLettering(input.quad, input.number, input.name, input.occluders, look);

  return placed ?? markLettering(input.quad, input.number, input.occluders, look);
}
