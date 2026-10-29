import type { Box } from './types';
import { VIEW } from './view';

function projectedHalfExtents(bounds: Box, azimuth: number): { u: number; v: number } {
  const sinAzimuth = Math.sin(azimuth);
  const cosAzimuth = Math.cos(azimuth);
  const sinElevation = Math.sin(VIEW.elevation);
  const cosElevation = Math.cos(VIEW.elevation);
  const right = [cosAzimuth, 0, -sinAzimuth] as const;
  const up = [-sinElevation * sinAzimuth, cosElevation, -sinElevation * cosAzimuth] as const;

  let u = 0;
  let v = 0;

  for (const x of [bounds.min[0], bounds.max[0]]) {
    for (const y of [bounds.min[1], bounds.max[1]]) {
      for (const z of [bounds.min[2], bounds.max[2]]) {
        u = Math.max(u, Math.abs(x * right[0] + y * right[1] + z * right[2]));
        v = Math.max(v, Math.abs(x * up[0] + y * up[1] + z * up[2]));
      }
    }
  }

  return { u, v };
}

export function fitZoom(bounds: Box, viewport: { width: number; height: number }): number {
  const usableWidth = viewport.width * (1 - 2 * VIEW.fitMargin);
  const usableHeight = viewport.height * (1 - 2 * VIEW.fitMargin);
  let zoom = Infinity;

  for (let step = 0; step < 4; step += 1) {
    const { u, v } = projectedHalfExtents(bounds, VIEW.baseAzimuth + step * VIEW.snap);
    const horizontal = u === 0 ? Infinity : usableWidth / (2 * u);
    const vertical = v === 0 ? Infinity : usableHeight / (2 * v);

    zoom = Math.min(zoom, horizontal, vertical);
  }

  return zoom === 0 ? 0 : zoom;
}
