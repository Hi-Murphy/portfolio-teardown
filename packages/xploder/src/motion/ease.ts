import type { MotionEasing } from './index';

const NUMBER = String.raw`[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?`;
const CUBIC_BEZIER = new RegExp(
  String.raw`^\s*cubic-bezier\(\s*(${NUMBER})\s*,\s*(${NUMBER})\s*,\s*(${NUMBER})\s*,\s*(${NUMBER})\s*\)\s*$`,
  'i',
);

const NEWTON_ITERATIONS = 8;
const NEWTON_MIN_SLOPE = 1e-6;
const SOLVE_EPSILON = 1e-9;
const BISECTION_ITERATIONS = 80;

function assertControlPoints(x1: number, y1: number, x2: number, y2: number): void {
  if (![x1, y1, x2, y2].every(Number.isFinite)) {
    throw new TypeError('cubic-bezier controls must be finite');
  }

  if (x1 < 0 || x1 > 1 || x2 < 0 || x2 > 1) {
    throw new RangeError('cubic-bezier x controls must be between 0 and 1');
  }
}

function sampleCurve(control1: number, control2: number, t: number): number {
  const inverse = 1 - t;

  return 3 * inverse * inverse * t * control1 + 3 * inverse * t * t * control2 + t * t * t;
}

function sampleDerivative(control1: number, control2: number, t: number): number {
  const inverse = 1 - t;

  return (
    3 * inverse * inverse * control1 +
    6 * inverse * t * (control2 - control1) +
    3 * t * t * (1 - control2)
  );
}

export function parseCubicBezier(css: string): readonly [number, number, number, number] {
  const match = CUBIC_BEZIER.exec(css);

  if (match === null) {
    throw new TypeError(`Invalid cubic-bezier: ${css}`);
  }

  const x1 = Number(match[1]);
  const y1 = Number(match[2]);
  const x2 = Number(match[3]);
  const y2 = Number(match[4]);

  assertControlPoints(x1, y1, x2, y2);

  return [x1, y1, x2, y2];
}

export function cubicBezier(x1: number, y1: number, x2: number, y2: number): (t: number) => number {
  assertControlPoints(x1, y1, x2, y2);

  return (t: number): number => {
    if (t <= 0) return 0;
    if (t >= 1) return 1;

    let parameter = t;

    for (let iteration = 0; iteration < NEWTON_ITERATIONS; iteration += 1) {
      const error = sampleCurve(x1, x2, parameter) - t;

      if (Math.abs(error) < SOLVE_EPSILON) {
        return sampleCurve(y1, y2, parameter);
      }

      const slope = sampleDerivative(x1, x2, parameter);

      if (Math.abs(slope) < NEWTON_MIN_SLOPE) break;

      const next = parameter - error / slope;

      if (next <= 0 || next >= 1) break;
      parameter = next;
    }

    let low = 0;
    let high = 1;
    parameter = t;

    for (let iteration = 0; iteration < BISECTION_ITERATIONS; iteration += 1) {
      const error = sampleCurve(x1, x2, parameter) - t;

      if (Math.abs(error) < SOLVE_EPSILON) break;
      if (error < 0) low = parameter;
      else high = parameter;

      parameter = (low + high) / 2;
    }

    return sampleCurve(y1, y2, parameter);
  };
}

export function easeFromToken(token: MotionEasing): (t: number) => number {
  return cubicBezier(...parseCubicBezier(token.css));
}
