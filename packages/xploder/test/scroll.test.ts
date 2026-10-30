import { OrthographicCamera, Vector3 } from 'three';
import { describe, expect, test } from 'vitest';

import { offsetFor, rescaleScroll, scrollExtent } from '../src/interaction/scroll';
import { fitZoom, layoutProject, VIEW, type Box, type ProjectLayout } from '../src/layout';
import { parseProject, parseTechRegistry } from '../src/index';
import { projectAJson, projectBJson, projectCJson, techRegistryJson } from './fixtures';

const registry = parseTechRegistry(techRegistryJson);
const projects = [
  ['A', layoutProject(parseProject(projectAJson, { registry }))],
  ['B', layoutProject(parseProject(projectBJson, { registry }))],
  ['C', layoutProject(parseProject(projectCJson, { registry }))],
] as const;
const VIEWPORT = { width: 1280, height: 720 } as const;
const CAMERA_DISTANCE_MULTIPLIER = 4;

function cameraDistance(bounds: Box): number {
  const width = bounds.max[0] - bounds.min[0];
  const height = bounds.max[1] - bounds.min[1];
  const depth = bounds.max[2] - bounds.min[2];

  return CAMERA_DISTANCE_MULTIPLIER * (Math.hypot(width, height, depth) / 2);
}

function projectedExtent(layout: ProjectLayout, zoomFactor: number, turns: number): number {
  const bounds = layout.bounds.exploded;
  const distance = cameraDistance(bounds);
  const azimuth = VIEW.baseAzimuth + turns * VIEW.snap;
  const radius = distance * Math.cos(VIEW.elevation);
  const camera = new OrthographicCamera(
    -VIEWPORT.width / 2,
    VIEWPORT.width / 2,
    VIEWPORT.height / 2,
    -VIEWPORT.height / 2,
    0.1,
    2 * distance,
  );
  const corner = new Vector3();
  let top = Infinity;
  let bottom = -Infinity;

  camera.position.set(
    radius * Math.sin(azimuth),
    distance * Math.sin(VIEW.elevation),
    radius * Math.cos(azimuth),
  );
  camera.lookAt(0, 0, 0);
  camera.zoom = fitZoom(bounds, VIEWPORT) * zoomFactor;
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld(true);

  for (const x of [bounds.min[0], bounds.max[0]]) {
    for (const y of [bounds.min[1], bounds.max[1]]) {
      for (const z of [bounds.min[2], bounds.max[2]]) {
        const ndc = corner.set(x, y, z).project(camera);
        const screenY = ((1 - ndc.y) * VIEWPORT.height) / 2;

        top = Math.min(top, screenY);
        bottom = Math.max(bottom, screenY);
      }
    }
  }

  return scrollExtent(top, bottom, VIEWPORT.height, VIEW.fitMargin * VIEWPORT.height);
}

describe('scroll math', () => {
  test('content height contributes only after the viewport and fitted margins', () => {
    expect(scrollExtent(0, 400, 400, 0)).toBe(0);
    expect(scrollExtent(20, 460, 400, 0)).toBe(40);
    expect(scrollExtent(20, 460, 400, 20)).toBe(80);
  });

  test.each(projects)('fixture %s has no scroll extent at zoom 1 at any azimuth', (_, layout) => {
    for (let turns = 0; turns < 4; turns += 1) {
      expect(projectedExtent(layout, 1, turns), `turns ${turns}`).toBe(0);
    }
  });

  test.each(projects)('fixture %s gains scroll extent when zoomed', (_, layout) => {
    for (let turns = 0; turns < 4; turns += 1) {
      expect(projectedExtent(layout, 3, turns), `turns ${turns}`).toBeGreaterThan(0);
    }
  });

  test('offsetFor centres at zero and moves with native scroll', () => {
    const extent = 240;

    expect(offsetFor(0, extent)).toBe(-120);
    expect(offsetFor(extent / 2, extent)).toBe(0);
    expect(offsetFor(extent, extent)).toBe(120);
  });

  test('rescaleScroll keeps the content point at the viewport centre', () => {
    const prevExtent = 180;
    const nextExtent = 420;

    for (const scrollTop of [0, 45, 90, 135, 180]) {
      const rescaled = rescaleScroll(scrollTop, prevExtent, nextExtent);
      const roundTrip = rescaleScroll(rescaled, nextExtent, prevExtent);

      expect(rescaled - nextExtent / 2).toBeCloseTo(scrollTop - prevExtent / 2, 9);
      expect(roundTrip).toBeCloseTo(scrollTop, 9);
    }
  });
});
