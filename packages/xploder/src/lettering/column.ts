import type { Vec2 } from '../overlay/project';

import { lineHeight, textWidth } from './place';
import type { LetteringLook } from './look';

export interface CompactColumnCanvas {
  readonly width: number;
  readonly height: number;
}

export interface CompactColumnPartLabel {
  readonly id: string;
  readonly number: string;
  readonly name: string;
}

export interface CompactColumnLayer {
  readonly index: number;
  readonly corners: readonly Vec2[];
  readonly partLabels: readonly CompactColumnPartLabel[];
}

export interface CompactColumnRow {
  readonly id: string;
  readonly layerIndex: number;
  readonly number: string;
  readonly lines: readonly string[];
  readonly y: number;
  readonly h: number;
}

export interface CompactColumn {
  readonly x: number;
  readonly rows: readonly CompactColumnRow[];
}

export interface CompactColumnInput {
  readonly canvas: CompactColumnCanvas;
  readonly layers: readonly CompactColumnLayer[];
  readonly drawingMaxX: number;
  readonly look: LetteringLook;
}

export function compactColumnAtRest({
  offsetY,
  extentPx,
}: {
  readonly offsetY: number;
  readonly extentPx: number;
}): boolean {
  return extentPx <= 1e-9 && Math.abs(offsetY) <= 1e-9;
}

function continuationIndent(number: string): string {
  return ' '.repeat(Array.from(number).length + 1);
}

function wrapLabel(
  number: string,
  name: string,
  availableWidth: number,
  look: LetteringLook,
): readonly string[] | null {
  const indent = continuationIndent(number);
  const words = name.trim().split(/\s+/).filter(Boolean);

  if (words.length === 0) return [number];

  const oneLine = `${number} ${words.join(' ')}`;

  if (textWidth(oneLine, look.compactColumnPx, look) <= availableWidth) return [oneLine];

  const best = (prefix: string): readonly string[] => {
    let selected: readonly string[] = [number, `${prefix}${words.join(' ')}`];
    let selectedWidth = Infinity;

    for (let split = 0; split <= words.length; split += 1) {
      const firstWords = words.slice(0, split);
      const restWords = words.slice(split);
      const lines = [
        firstWords.length === 0 ? number : `${number} ${firstWords.join(' ')}`,
        ...(restWords.length === 0 ? [] : [`${prefix}${restWords.join(' ')}`]),
      ];
      const width = Math.max(...lines.map((line) => textWidth(line, look.compactColumnPx, look)));

      if (width < selectedWidth) {
        selected = lines;
        selectedWidth = width;
      }
    }

    return selected;
  };

  const indented = best(indent);
  const unindented = best('');
  const indentedWidth = Math.max(
    ...indented.map((line) => textWidth(line, look.compactColumnPx, look)),
  );
  const unindentedWidth = Math.max(
    ...unindented.map((line) => textWidth(line, look.compactColumnPx, look)),
  );

  if (indentedWidth <= availableWidth) return indented;
  if (unindentedWidth <= availableWidth) return unindented;

  return unindentedWidth <= indentedWidth ? unindented : indented;
}

export function compactColumnTextScale(
  lines: readonly string[],
  availableWidth: number,
  look: LetteringLook,
): number {
  if (availableWidth <= 0) return 0;

  const width = Math.max(...lines.map((line) => textWidth(line, look.compactColumnPx, look)));

  return width <= availableWidth ? 1 : availableWidth / width;
}

function meanY(corners: readonly Vec2[]): number {
  if (corners.length === 0) return 0;

  return corners.reduce((total, corner) => total + corner[1], 0) / corners.length;
}

export function compactColumn(input: CompactColumnInput): CompactColumn | null {
  const { canvas, layers, drawingMaxX, look } = input;
  const x = drawingMaxX + look.columnGapPx;
  const availableWidth = canvas.width - look.columnInsetPx - x;

  if (!Number.isFinite(x) || availableWidth <= 0) return null;

  const rows: CompactColumnRow[] = [];
  let previousGroupBottom = -Infinity;

  for (const layer of layers) {
    if (layer.partLabels.length === 0) continue;

    const groupRows: CompactColumnRow[] = [];

    for (const part of layer.partLabels) {
      const lines = wrapLabel(part.number, part.name, availableWidth, look);

      if (lines === null) return null;

      groupRows.push({
        id: part.id,
        layerIndex: layer.index,
        number: part.number,
        lines,
        y: 0,
        h: lines.length * lineHeight(look.compactColumnPx, look),
      });
    }

    const groupHeight =
      groupRows.reduce((total, row) => total + row.h, 0) +
      look.columnRowGapPx * Math.max(0, groupRows.length - 1);
    const targetTop = meanY(layer.corners) - groupHeight / 2;
    const groupTop =
      previousGroupBottom === -Infinity
        ? targetTop
        : Math.max(targetTop, previousGroupBottom + look.columnLayerGapPx);
    let rowY = groupTop;

    for (const row of groupRows) {
      rows.push({ ...row, y: rowY });
      rowY += row.h + look.columnRowGapPx;
    }

    previousGroupBottom = groupTop + groupHeight;
  }

  if (rows.length === 0) return { x, rows };

  const limit = canvas.height - look.columnInsetPx;
  const first = rows[0];
  const last = rows[rows.length - 1];

  if (first === undefined || last === undefined) return null;

  const minY = Math.min(...rows.map((row) => row.y));
  const lastBottom = Math.max(...rows.map((row) => row.y + row.h));
  const overflow = Math.max(0, lastBottom - limit);
  const shift = Math.min(overflow, Math.max(0, minY - look.columnInsetPx));

  if (shift > 0) {
    for (let index = 0; index < rows.length; index += 1) {
      const row = rows[index];

      if (row !== undefined) rows[index] = { ...row, y: row.y - shift };
    }
  }

  const shiftedFirst = rows[0];
  const shiftedLast = rows[rows.length - 1];

  if (shiftedFirst === undefined || shiftedLast === undefined) return null;
  if (shiftedFirst.y < look.columnInsetPx - 1e-9) return null;
  if (shiftedLast.y + shiftedLast.h > limit + 1e-9) return null;
  if (rows.some((row) => row.y < look.columnInsetPx - 1e-9 || row.y + row.h > limit + 1e-9)) {
    return null;
  }

  return { x, rows };
}
