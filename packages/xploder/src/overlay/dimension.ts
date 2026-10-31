import type { ProjectLayout } from '../layout';

import type { OverlayFrame, Vec2 } from './project';

export const DIMENSION_OFFSET_PX = 12;

const TICK_HALF_PX = 4;
const DIAGONAL = Math.SQRT1_2;

export interface DimensionSegment {
  readonly from: Vec2;
  readonly to: Vec2;
}

export interface StackDimension {
  readonly rail: DimensionSegment;
  readonly ticks: readonly DimensionSegment[];
  readonly extensionLines: readonly DimensionSegment[];
  readonly labelAnchor: Vec2;
  readonly text: string;
}

export interface FootprintDimension {
  readonly line: DimensionSegment;
  readonly ticks: readonly DimensionSegment[];
  readonly extensionLines: readonly DimensionSegment[];
  readonly labelAnchor: Vec2;
  readonly text: string;
}

function midpoint(left: Vec2, right: Vec2): Vec2 {
  return [(left[0] + right[0]) / 2, (left[1] + right[1]) / 2];
}

function leftmost(corners: readonly Vec2[]): Vec2 {
  let result = corners[0];

  if (result === undefined) throw new Error('A dimension needs projected layer corners.');

  for (const corner of corners) {
    if (corner[0] < result[0] || (corner[0] === result[0] && corner[1] < result[1])) {
      result = corner;
    }
  }

  return result;
}

function lowest(corners: readonly Vec2[]): Vec2 {
  let result = corners[0];

  if (result === undefined) throw new Error('A dimension needs projected layer corners.');

  for (const corner of corners) {
    if (corner[1] > result[1] || (corner[1] === result[1] && corner[0] < result[0])) {
      result = corner;
    }
  }

  return result;
}

function slashTick(point: Vec2, edge: DimensionSegment): DimensionSegment {
  const dx = edge.to[0] - edge.from[0];
  const dy = edge.to[1] - edge.from[1];
  const length = Math.hypot(dx, dy);
  const unitX = length === 0 ? DIAGONAL : dx / length;
  const unitY = length === 0 ? DIAGONAL : dy / length;
  const slashX = (unitX - unitY) * DIAGONAL;
  const slashY = (unitX + unitY) * DIAGONAL;

  return {
    from: [point[0] - slashX * TICK_HALF_PX, point[1] - slashY * TICK_HALF_PX],
    to: [point[0] + slashX * TICK_HALF_PX, point[1] + slashY * TICK_HALF_PX],
  };
}

export function stackDimension(frame: OverlayFrame): StackDimension {
  const firstLayer = frame.layers[0];
  const lastLayer = frame.layers[frame.layers.length - 1];

  if (firstLayer === undefined || lastLayer === undefined) {
    throw new Error('A stack dimension needs at least one layer.');
  }

  const layerCorners = frame.layers.map((layer) => leftmost(layer.corners));
  const left = Math.min(...layerCorners.map((corner) => corner[0]));
  const top = leftmost(firstLayer.corners)[1];
  const bottom = leftmost(lastLayer.corners)[1];
  const rail: DimensionSegment = {
    from: [left - DIMENSION_OFFSET_PX, top],
    to: [left - DIMENSION_OFFSET_PX, bottom],
  };

  return {
    rail,
    ticks: layerCorners.map((corner) => slashTick([rail.from[0], corner[1]], rail)),
    extensionLines: layerCorners.map((corner) => ({
      from: corner,
      to: [rail.from[0], corner[1]],
    })),
    labelAnchor: midpoint(rail.from, rail.to),
    text: `${frame.layers.length} layers`,
  };
}

function outwardNormal(edge: DimensionSegment, centroid: Vec2): Vec2 {
  const dx = edge.to[0] - edge.from[0];
  const dy = edge.to[1] - edge.from[1];
  const length = Math.hypot(dx, dy);

  if (length === 0) return [0, 1];

  const first: Vec2 = [dy / length, -dx / length];
  const second: Vec2 = [-dy / length, dx / length];
  const edgeMidpoint = midpoint(edge.from, edge.to);
  const firstDot =
    first[0] * (edgeMidpoint[0] - centroid[0]) + first[1] * (edgeMidpoint[1] - centroid[1]);
  const secondDot =
    second[0] * (edgeMidpoint[0] - centroid[0]) + second[1] * (edgeMidpoint[1] - centroid[1]);

  return firstDot >= secondDot ? first : second;
}

function centroid(corners: readonly Vec2[]): Vec2 {
  let x = 0;
  let y = 0;

  for (const corner of corners) {
    x += corner[0];
    y += corner[1];
  }

  return [x / corners.length, y / corners.length];
}

export function footprintDimension(
  frame: OverlayFrame,
  footprint: Pick<ProjectLayout['footprint'], 'cols' | 'rows'>,
): FootprintDimension {
  const bottomLayer = frame.layers[frame.layers.length - 1];

  if (bottomLayer === undefined) throw new Error('A footprint dimension needs a bottom layer.');

  const from = leftmost(bottomLayer.corners);
  const to = lowest(bottomLayer.corners);
  const edge: DimensionSegment = { from, to };
  const normal = outwardNormal(edge, centroid(bottomLayer.corners));
  const line: DimensionSegment = {
    from: [from[0] + normal[0] * DIMENSION_OFFSET_PX, from[1] + normal[1] * DIMENSION_OFFSET_PX],
    to: [to[0] + normal[0] * DIMENSION_OFFSET_PX, to[1] + normal[1] * DIMENSION_OFFSET_PX],
  };

  return {
    line,
    ticks: [slashTick(line.from, line), slashTick(line.to, line)],
    extensionLines: [
      { from, to: line.from },
      { from: to, to: line.to },
    ],
    labelAnchor: midpoint(line.from, line.to),
    text: `${footprint.cols} × ${footprint.rows}`,
  };
}
