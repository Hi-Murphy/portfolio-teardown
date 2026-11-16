import type { LabelItem, LabelQuad } from './types';

export interface SweepQuad {
  readonly key: string;
  readonly quad: LabelQuad;
}

export interface SweepPair {
  readonly a: SweepQuad;
  readonly b: SweepQuad;
}

type Axis = readonly [number, number];

function axes(quad: LabelQuad): readonly Axis[] {
  const result: Axis[] = [];

  for (let index = 0; index < quad.length; index += 1) {
    const from = quad[index]!;
    const to = quad[(index + 1) % quad.length]!;

    const x = -(to[1] - from[1]);
    const y = to[0] - from[0];
    const length = Math.hypot(x, y);

    if (length) result.push([x / length, y / length]);
  }

  return result;
}

function projectedRange(quad: LabelQuad, axis: Axis): readonly [number, number] {
  let minimum = Infinity;
  let maximum = -Infinity;

  for (const point of quad) {
    const value = point[0] * axis[0] + point[1] * axis[1];

    minimum = Math.min(minimum, value);
    maximum = Math.max(maximum, value);
  }

  return [minimum, maximum];
}

export function quadsIntersect(a: LabelQuad, b: LabelQuad, depthPx = 1 / 64): boolean {
  const axesA = axes(a);
  const axesB = axes(b);

  if (axesA.length === 0 || axesB.length === 0) return false;

  for (const axis of [...axesA, ...axesB]) {
    const [aMin, aMax] = projectedRange(a, axis);
    const [bMin, bMax] = projectedRange(b, axis);
    const overlap = Math.min(aMax, bMax) - Math.max(aMin, bMin);

    if (overlap <= depthPx) return false;
  }

  return true;
}

export function sweepPairs(items: readonly LabelItem[]): readonly SweepPair[] {
  const visible = items.filter((item) => item.visible);
  const pairs: SweepPair[] = [];

  for (const [left, a] of visible.entries()) {
    for (const b of visible.slice(left + 1)) {
      if (!quadsIntersect(a.quad, b.quad)) continue;
      pairs.push({
        a: { key: a.key, quad: a.quad },
        b: { key: b.key, quad: b.quad },
      });
    }
  }

  return pairs;
}
