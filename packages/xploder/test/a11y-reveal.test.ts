import { describe, expect, test } from 'vitest';

import { revealScrollTop, type RevealScrollTopInput } from '../src/a11y/reveal';
import { offsetFor } from '../src/interaction/scroll';
import type { Vec2 } from '../src/overlay/project';

function hull(minY: number, maxY: number): readonly Vec2[] {
  return [
    [10, minY],
    [30, maxY],
  ];
}

function revealed(input: RevealScrollTopInput): number {
  const result = revealScrollTop(input);

  if (result === null) throw new Error('Expected the hull to need a reveal');
  return result;
}

describe('revealScrollTop', () => {
  test('reveals a hull above the visible band', () => {
    const extent = 400;
    const scrollTop = 360;
    const result = revealed({
      hull: hull(100, 150),
      offsetY: offsetFor(scrollTop, extent),
      canvasHeight: 300,
      scrollTop,
      extent,
      marginPx: 10,
    });

    expect(result).toBe(290);
    expect(offsetFor(result, extent)).toBeCloseTo(90, 9);
  });

  test('reveals a hull below the visible band', () => {
    const extent = 400;
    const scrollTop = 120;
    const result = revealed({
      hull: hull(220, 260),
      offsetY: offsetFor(scrollTop, extent),
      canvasHeight: 300,
      scrollTop,
      extent,
      marginPx: 10,
    });

    expect(result).toBe(170);
    expect(offsetFor(result, extent)).toBeCloseTo(-30, 9);
  });

  test('does nothing when the hull is inside the visible band', () => {
    const result = revealScrollTop({
      hull: hull(40, 100),
      offsetY: 20,
      canvasHeight: 300,
      scrollTop: 120,
      extent: 200,
      marginPx: 10,
    });

    expect(result).toBeNull();
  });

  test('aligns the top of a hull taller than the canvas', () => {
    const extent = 800;
    const scrollTop = 400;
    const result = revealed({
      hull: hull(100, 500),
      offsetY: offsetFor(scrollTop, extent),
      canvasHeight: 200,
      scrollTop,
      extent,
      marginPx: 10,
    });

    expect(result).toBe(490);
    expect(offsetFor(result, extent)).toBeCloseTo(90, 9);
  });

  test('clamps at zero', () => {
    const result = revealed({
      hull: hull(-1000, -900),
      offsetY: -100,
      canvasHeight: 300,
      scrollTop: 0,
      extent: 200,
      marginPx: 10,
    });

    expect(result).toBe(0);
  });

  test('clamps at the scroll extent', () => {
    const result = revealed({
      hull: hull(900, 1000),
      offsetY: 100,
      canvasHeight: 300,
      scrollTop: 200,
      extent: 200,
      marginPx: 10,
    });

    expect(result).toBe(200);
  });
});
