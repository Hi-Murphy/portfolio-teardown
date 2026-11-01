import type { ComponentSlab, Vec3 } from '../layout';
import type { Vec2 } from '../overlay/project';

import type { LetteringBaseline } from './look';

export interface FaceBasis {
  readonly origin: Vec2;
  readonly u: Vec2;
  readonly v: Vec2;
  readonly lu: number;
  readonly lv: number;
}

export type FaceQuad = readonly [Vec2, Vec2, Vec2, Vec2];

interface EdgeCandidate {
  readonly u: Vec2;
  readonly lu: number;
  readonly v: Vec2;
  readonly lv: number;
  readonly origin: Vec2;
  readonly flippedOrigin: Vec2;
}

function lerp(from: number, to: number, progress: number): number {
  return from + (to - from) * progress;
}

function subtract(right: Vec2, left: Vec2): Vec2 {
  return [right[0] - left[0], right[1] - left[1]];
}

function negate(vector: Vec2): Vec2 {
  return [-vector[0], -vector[1]];
}

function cross(left: Vec2, right: Vec2): number {
  return left[0] * right[1] - left[1] * right[0];
}

function unit(vector: Vec2, length: number): Vec2 {
  return [vector[0] / length, vector[1] / length];
}

export function topFaceQuad(
  component: ComponentSlab,
  progress: number,
  project: (point: Vec3) => Vec2,
): FaceQuad {
  const center: Vec3 = [
    lerp(component.imploded[0], component.exploded[0], progress),
    lerp(component.imploded[1], component.exploded[1], progress),
    lerp(component.imploded[2], component.exploded[2], progress),
  ];
  const top = center[1] + component.size[1] / 2;
  const halfWidth = component.size[0] / 2;
  const halfDepth = component.size[2] / 2;

  return [
    project([center[0] - halfWidth, top, center[2] - halfDepth]),
    project([center[0] + halfWidth, top, center[2] - halfDepth]),
    project([center[0] + halfWidth, top, center[2] + halfDepth]),
    project([center[0] - halfWidth, top, center[2] + halfDepth]),
  ];
}

export function faceBasis(quad: FaceQuad, baseline: LetteringBaseline = 'down-right'): FaceBasis {
  const candidates = quad.map((origin, index): EdgeCandidate => {
    const next = quad[(index + 1) % quad.length];
    const previous = quad[(index + quad.length - 1) % quad.length];

    if (next === undefined || previous === undefined) {
      throw new RangeError('Cannot build a basis for a degenerate face');
    }

    const u = subtract(next, origin);
    const v = subtract(previous, origin);

    return {
      u,
      lu: Math.hypot(u[0], u[1]),
      v,
      lv: Math.hypot(v[0], v[1]),
      origin,
      flippedOrigin: next,
    };
  });
  const wantsDownRight = baseline === 'down-right';
  let selected = candidates.find(
    (candidate) => candidate.u[0] > 0 && (wantsDownRight ? candidate.u[1] > 0 : candidate.u[1] < 0),
  );

  if (selected === undefined) {
    for (const candidate of candidates) {
      if (candidate.u[0] <= 0 || Math.abs(candidate.u[1]) >= 1e-9) continue;
      if (selected === undefined || candidate.u[0] > selected.u[0]) selected = candidate;
    }
  }

  if (selected === undefined || selected.lu === 0 || selected.lv === 0) {
    throw new RangeError('Cannot build a basis for a degenerate face');
  }

  const u = unit(selected.u, selected.lu);
  const naturalV = unit(selected.v, selected.lv);
  const flipped = wantsDownRight ? naturalV[1] < 0 : cross(u, naturalV) < 0;

  if (wantsDownRight && naturalV[1] === 0) {
    throw new RangeError('Cannot orient a face against the baseline');
  }

  return {
    origin: flipped ? selected.flippedOrigin : selected.origin,
    u,
    v: flipped ? negate(naturalV) : naturalV,
    lu: selected.lu,
    lv: selected.lv,
  };
}
