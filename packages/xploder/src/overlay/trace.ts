export type Vec2 = readonly [x: number, y: number];

export interface TraceHop {
  readonly from: string;
  readonly to: string;
  readonly points: readonly Vec2[];
}

export interface TraceRoute {
  readonly vertices: readonly string[];
  readonly points: readonly Vec2[];
  readonly hops: readonly TraceHop[];
}

function samePoint(left: Vec2, right: Vec2): boolean {
  return left[0] === right[0] && left[1] === right[1];
}

function appendDistinct(points: Vec2[], point: Vec2): void {
  const last = points[points.length - 1];

  if (last === undefined || !samePoint(last, point)) {
    points.push(point);
  }
}

export function octilinearHop(from: Vec2, to: Vec2): Vec2[] {
  const dx = to[0] - from[0];
  const dy = to[1] - from[1];
  const corner: Vec2 =
    Math.abs(dy) >= Math.abs(dx)
      ? [from[0], to[1] - Math.sign(dy) * Math.abs(dx)]
      : [to[0] - Math.sign(dx) * Math.abs(dy), from[1]];
  const points: Vec2[] = [from];

  appendDistinct(points, corner);
  appendDistinct(points, to);

  return points;
}

function anchorFor(anchors: ReadonlyMap<string, Vec2>, id: string): Vec2 {
  const anchor = anchors.get(id);

  if (anchor === undefined) {
    throw new Error(`Missing overlay anchor for "${id}".`);
  }

  return anchor;
}

export function traceRoute(
  path: readonly string[],
  step: number,
  anchors: ReadonlyMap<string, Vec2>,
): TraceRoute {
  const vertices = path.slice(0, step + 1);

  if (vertices.length === 0) {
    return { vertices, points: [], hops: [] };
  }

  const points: Vec2[] = [anchorFor(anchors, vertices[0] ?? '')];
  const hops: TraceHop[] = [];

  for (let index = 1; index < vertices.length; index += 1) {
    const from = vertices[index - 1] ?? '';
    const to = vertices[index] ?? '';
    const hopPoints = octilinearHop(anchorFor(anchors, from), anchorFor(anchors, to));

    for (let pointIndex = 1; pointIndex < hopPoints.length; pointIndex += 1) {
      const point = hopPoints[pointIndex];

      if (point !== undefined) {
        appendDistinct(points, point);
      }
    }

    hops.push({ from, to, points: hopPoints });
  }

  return { vertices, points, hops };
}
