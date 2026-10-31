import { describe, expect, test } from 'vitest';

import { parseProject, parseTechRegistry } from '../src/index';
import { fitZoom, layoutProject, VIEW } from '../src/layout';
import {
  DIMENSION_OFFSET_PX,
  footprintDimension,
  stackDimension,
  type DimensionSegment,
} from '../src/overlay/dimension';
import { overlayFrame, type Vec2 } from '../src/overlay/project';
import { projectAJson, projectCJson, techRegistryJson } from './fixtures';

const registry = parseTechRegistry(techRegistryJson);
const projectA = parseProject(projectAJson, { registry });
const projectC = parseProject(projectCJson, { registry });
const layoutA = layoutProject(projectA);
const layoutC = layoutProject(projectC);
const VIEWPORT = { width: 390, height: 844 };
const FRAME_A = overlayFrame(layoutA, 1, {
  azimuth: VIEW.baseAzimuth,
  zoom: fitZoom(layoutA.bounds.exploded, VIEWPORT),
  ...VIEWPORT,
});
const FRAME_C = overlayFrame(layoutC, 1, {
  azimuth: VIEW.baseAzimuth,
  zoom: fitZoom(layoutC.bounds.exploded, VIEWPORT),
  ...VIEWPORT,
});

function midpoint(left: Vec2, right: Vec2): Vec2 {
  return [(left[0] + right[0]) / 2, (left[1] + right[1]) / 2];
}

function lengthBetween(left: Vec2, right: Vec2): number {
  return Math.hypot(right[0] - left[0], right[1] - left[1]);
}

function centroid(points: readonly Vec2[]): Vec2 {
  let x = 0;
  let y = 0;

  for (const point of points) {
    x += point[0];
    y += point[1];
  }

  return [x / points.length, y / points.length];
}

function tickMidpoint(tick: DimensionSegment): Vec2 {
  return midpoint(tick.from, tick.to);
}

describe('overlay dimensions', () => {
  test('places the stack rail left of every layer corner with one ordered tick per layer', () => {
    const dimension = stackDimension(FRAME_A);
    const corners = FRAME_A.layers.flatMap((layer) => layer.corners);
    const left = Math.min(...corners.map((corner) => corner[0]));

    expect(DIMENSION_OFFSET_PX).toBe(12);
    expect(dimension.rail.from[0]).toBeCloseTo(left - DIMENSION_OFFSET_PX, 10);
    expect(dimension.rail.to[0]).toBeCloseTo(left - DIMENSION_OFFSET_PX, 10);
    expect(dimension.ticks).toHaveLength(FRAME_A.layers.length);
    expect(dimension.extensionLines).toHaveLength(FRAME_A.layers.length);
    expect(dimension.text).toBe('4 layers');
    expect(dimension.labelAnchor).toStrictEqual(midpoint(dimension.rail.from, dimension.rail.to));

    let previousY = -Infinity;

    dimension.extensionLines.forEach((extension, index) => {
      const tick = dimension.ticks[index];

      if (tick === undefined) throw new Error('Missing stack tick');

      expect(extension.to[0]).toBeCloseTo(dimension.rail.from[0], 10);
      expect(extension.to[1]).toBeCloseTo(extension.from[1], 10);
      expect(tickMidpoint(tick)[0]).toBeCloseTo(dimension.rail.from[0], 10);
      expect(tickMidpoint(tick)[1]).toBeCloseTo(extension.from[1], 10);
      expect(tickMidpoint(tick)[1]).toBeGreaterThan(previousY);
      previousY = tickMidpoint(tick)[1];
    });
  });

  test('places the footprint dimension 12 px outward from the bottom-left edge', () => {
    const bottomLayer = FRAME_A.layers[FRAME_A.layers.length - 1];

    if (bottomLayer === undefined) throw new Error('Missing bottom layer');

    const dimension = footprintDimension(FRAME_A, layoutA.footprint);
    const plateCentroid = centroid(bottomLayer.corners);
    const sourceMidpoint = midpoint(
      dimension.extensionLines[0]?.from ?? [0, 0],
      dimension.extensionLines[1]?.from ?? [0, 0],
    );
    const offset = [
      dimension.labelAnchor[0] - sourceMidpoint[0],
      dimension.labelAnchor[1] - sourceMidpoint[1],
    ] as const;
    const outward = [
      dimension.labelAnchor[0] - plateCentroid[0],
      dimension.labelAnchor[1] - plateCentroid[1],
    ] as const;

    expect(dimension.text).toBe('2 × 2');
    expect(dimension.ticks).toHaveLength(2);
    expect(dimension.extensionLines).toHaveLength(2);
    expect(dimension.labelAnchor).toStrictEqual(midpoint(dimension.line.from, dimension.line.to));
    expect(Math.hypot(offset[0], offset[1])).toBeCloseTo(DIMENSION_OFFSET_PX, 10);
    expect(offset[0] * outward[0] + offset[1] * outward[1]).toBeGreaterThan(0);
    expect(lengthBetween(plateCentroid, dimension.labelAnchor)).toBeGreaterThan(
      lengthBetween(plateCentroid, sourceMidpoint),
    );
    expect(tickMidpoint(dimension.ticks[0] ?? { from: [0, 0], to: [0, 0] })).toStrictEqual(
      dimension.line.from,
    );
    expect(tickMidpoint(dimension.ticks[1] ?? { from: [0, 0], to: [0, 0] })).toStrictEqual(
      dimension.line.to,
    );
  });

  test('derives both dimension texts from fixture C', () => {
    expect(stackDimension(FRAME_C).text).toBe('5 layers');
    expect(footprintDimension(FRAME_C, layoutC.footprint).text).toBe('3 × 2');
  });
});
