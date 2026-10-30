import { describe, expect, test } from 'vitest';

import { easings } from '../src/motion/index';
import { cubicBezier, easeFromToken, parseCubicBezier } from '../src/motion/ease';

const REFERENCE_STEPS = 20_000;
const REFERENCE_BISECTIONS = 80;

function sampleCurve(control1: number, control2: number, t: number): number {
  const inverse = 1 - t;

  return 3 * inverse * inverse * t * control1 + 3 * inverse * t * t * control2 + t * t * t;
}

function referenceY(x1: number, y1: number, x2: number, y2: number, x: number): number {
  let low = 0;
  let high = 1;

  for (let step = 0; step <= REFERENCE_STEPS; step += 1) {
    const parameter = step / REFERENCE_STEPS;

    if (sampleCurve(x1, x2, parameter) >= x) {
      high = parameter;
      low = Math.max(0, (step - 1) / REFERENCE_STEPS);
      break;
    }
  }

  for (let iteration = 0; iteration < REFERENCE_BISECTIONS; iteration += 1) {
    const parameter = (low + high) / 2;

    if (sampleCurve(x1, x2, parameter) < x) low = parameter;
    else high = parameter;
  }

  return sampleCurve(y1, y2, (low + high) / 2);
}

describe('cubic-bezier easing', () => {
  test('parses both token curves and whitespace variants', () => {
    expect(parseCubicBezier(easings.explode.css)).toEqual([0.16, 1, 0.3, 1]);
    expect(parseCubicBezier(easings.implode.css)).toEqual([0.76, 0, 0.24, 1]);
    expect(parseCubicBezier('\n cubic-bezier( .16 ,\t1, 0.3 , 1e0 ) \n')).toEqual([
      0.16, 1, 0.3, 1,
    ]);
  });

  test('rejects non-cubic-bezier easing tokens', () => {
    expect(() => parseCubicBezier('ease-in')).toThrow();
    expect(() => parseCubicBezier('cubic-bezier(0, 0, 1)')).toThrow();
    expect(() => parseCubicBezier('cubic-bezier(1.1, 0, 0, 1)')).toThrow();
  });

  test('returns exact endpoints for every motion curve', () => {
    for (const token of [easings.explode, easings.implode]) {
      const ease = easeFromToken(token);

      expect(ease(0)).toBe(0);
      expect(ease(1)).toBe(1);
    }
  });

  test('matches a dense-bisection reference for the explode curve', () => {
    const [x1, y1, x2, y2] = parseCubicBezier(easings.explode.css);
    const ease = cubicBezier(x1, y1, x2, y2);

    for (const x of [0.25, 0.5, 0.75]) {
      expect(ease(x)).toBeCloseTo(referenceY(x1, y1, x2, y2, x), 4);
    }
  });

  test('is monotone across the explode curve', () => {
    const ease = easeFromToken(easings.explode);
    let previous = ease(0);

    for (let step = 1; step <= 10_000; step += 1) {
      const current = ease(step / 10_000);

      expect(current).toBeGreaterThanOrEqual(previous);
      previous = current;
    }
  });
});
