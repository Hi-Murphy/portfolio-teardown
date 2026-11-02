import { describe, expect, test } from 'vitest';
import { fitZoom, layoutProject, VIEW, type Vec3 } from 'xploder/layout';

import { websocketInspector } from '../content/projects/websocket-inspector';
import { posterGeometry, projectPoint } from '../content/poster';

const CAMERA_TO_POSTER = Math.sqrt(3 / 2);

function dot(left: Vec3, right: Vec3): number {
  return left[0] * right[0] + left[1] * right[1] + left[2] * right[2];
}

function pseudoRandom(seed: number): () => number {
  let value = seed;

  return () => {
    value = (value * 1664525 + 1013904223) >>> 0;

    return value / 4294967296;
  };
}

describe('poster geometry', () => {
  test('matches the public view projection for random points', () => {
    const sinAzimuth = Math.sin(VIEW.baseAzimuth);
    const cosAzimuth = Math.cos(VIEW.baseAzimuth);
    const sinElevation = Math.sin(VIEW.elevation);
    const cosElevation = Math.cos(VIEW.elevation);
    const right: Vec3 = [cosAzimuth, 0, -sinAzimuth];
    const up: Vec3 = [-sinElevation * sinAzimuth, cosElevation, -sinElevation * cosAzimuth];
    const random = pseudoRandom(42);

    for (let index = 0; index < 32; index += 1) {
      const point: Vec3 = [random() * 6 - 3, random() * 6 - 3, random() * 6 - 3];
      const projected = projectPoint(point);

      expect(projected[0]).toBeCloseTo(dot(right, point) * CAMERA_TO_POSTER, 9);
      expect(projected[1]).toBeCloseTo(-dot(up, point) * CAMERA_TO_POSTER, 9);
    }
  });

  test('frames the selected state symmetrically about the origin', () => {
    const [x, y, width, height] = posterGeometry(websocketInspector, 'exploded').viewBox;

    expect(width).toBeGreaterThan(0);
    expect(height).toBeGreaterThan(0);
    expect(x).toBeCloseTo(-width / 2, 12);
    expect(y).toBeCloseTo(-height / 2, 12);
    expect(x + width / 2).toBeCloseTo(0, 12);
    expect(y + height / 2).toBeCloseTo(0, 12);
  });

  test('uses the fitZoom scale ratio at the same aspect', () => {
    const geometry = posterGeometry(websocketInspector, 'exploded');
    const [, , width, height] = geometry.viewBox;
    const scale = 6;
    const bounds = layoutProject(websocketInspector).bounds.exploded;
    const zoom = fitZoom(bounds, { width: width * scale, height: height * scale });

    expect(zoom / scale).toBeCloseTo(CAMERA_TO_POSTER, 9);
  });

  test('paints slabs from far to near in a stable order', () => {
    const first = posterGeometry(websocketInspector, 'exploded');
    const second = posterGeometry(websocketInspector, 'exploded');
    const depths = first.slabs.map((slab) => slab.depth);

    expect(depths).toEqual([...depths].sort((left, right) => left - right));

    for (const slab of first.slabs) {
      const [x, y, z] = slab.center;
      expect(slab.depth).toBeCloseTo(x + y + z, 9);
    }
    expect(second.slabs.map((slab) => slab.id)).toEqual(first.slabs.map((slab) => slab.id));
  });

  test('contains 21 slabs for 5 layers and 16 components', () => {
    const slabs = posterGeometry(websocketInspector, 'exploded').slabs;

    expect(slabs).toHaveLength(21);
    expect(slabs.filter((slab) => slab.kind === 'layer')).toHaveLength(5);
    expect(slabs.filter((slab) => slab.kind === 'component')).toHaveLength(16);
  });
});
