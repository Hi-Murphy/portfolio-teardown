import type { ComponentSlab, Vec3 } from '../layout';
import type { Vec2 } from '../overlay/project';

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

export function faceBasis(quad: FaceQuad): FaceBasis {
  const [first, second, third, fourth] = quad;
  const xEdge = subtract(second, first);
  const zEdge = subtract(fourth, first);
  const candidates: readonly EdgeCandidate[] = [
    {
      u: xEdge,
      lu: Math.hypot(xEdge[0], xEdge[1]),
      v: zEdge,
      lv: Math.hypot(zEdge[0], zEdge[1]),
      origin: first,
      flippedOrigin: fourth,
    },
    {
      u: negate(xEdge),
      lu: Math.hypot(xEdge[0], xEdge[1]),
      v: zEdge,
      lv: Math.hypot(zEdge[0], zEdge[1]),
      origin: second,
      flippedOrigin: third,
    },
    {
      u: zEdge,
      lu: Math.hypot(zEdge[0], zEdge[1]),
      v: xEdge,
      lv: Math.hypot(xEdge[0], xEdge[1]),
      origin: first,
      flippedOrigin: second,
    },
    {
      u: negate(zEdge),
      lu: Math.hypot(zEdge[0], zEdge[1]),
      v: xEdge,
      lv: Math.hypot(xEdge[0], xEdge[1]),
      origin: fourth,
      flippedOrigin: third,
    },
  ];
  let selected = candidates[0];

  for (const candidate of candidates) {
    if (selected === undefined || candidate.u[0] > selected.u[0]) selected = candidate;
  }

  if (selected === undefined || selected.lu === 0 || selected.lv === 0) {
    throw new RangeError('Cannot build a basis for a degenerate face');
  }

  const u = unit(selected.u, selected.lu);
  const naturalV = unit(selected.v, selected.lv);
  const flipped = cross(u, naturalV) < 0;

  return {
    origin: flipped ? selected.flippedOrigin : selected.origin,
    u,
    v: flipped ? negate(naturalV) : naturalV,
    lu: selected.lu,
    lv: selected.lv,
  };
}
