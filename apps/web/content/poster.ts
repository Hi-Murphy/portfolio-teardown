import type { Project } from 'xploder';
import { layoutProject, VIEW, type Box, type Vec3 } from 'xploder/layout';

export type PosterState = 'imploded' | 'exploded';
export type PosterPoint = readonly [x: number, y: number];
export type PosterViewBox = readonly [x: number, y: number, width: number, height: number];

export interface PosterFace {
  readonly points: readonly [PosterPoint, PosterPoint, PosterPoint, PosterPoint];
}

export interface PosterSlabFaces {
  readonly top: PosterFace;
  readonly sideX: PosterFace;
  readonly sideZ: PosterFace;
}

export interface PosterSlab {
  readonly id: string;
  readonly kind: 'layer' | 'component';
  readonly center: Vec3;
  readonly depth: number;
  readonly faces: PosterSlabFaces;
}

export interface PosterGeometry {
  readonly state: PosterState;
  readonly viewBox: PosterViewBox;
  readonly slabs: readonly PosterSlab[];
}

interface PosterCandidate {
  readonly id: string;
  readonly kind: PosterSlab['kind'];
  readonly center: Vec3;
  readonly size: Vec3;
  readonly sourceIndex: number;
}

const ISO_COS_30 = Math.cos(Math.PI / 6);
const ISO_SIN_30 = Math.sin(Math.PI / 6);
const CAMERA_TO_POSTER = Math.sqrt(3 / 2);

export function projectPoint([x, y, z]: Vec3): PosterPoint {
  return [(x - z) * ISO_COS_30, (x + z) * ISO_SIN_30 - y];
}

function projectedHalfExtents(bounds: Box, azimuth: number): { u: number; v: number } {
  const sinAzimuth = Math.sin(azimuth);
  const cosAzimuth = Math.cos(azimuth);
  const sinElevation = Math.sin(VIEW.elevation);
  const cosElevation = Math.cos(VIEW.elevation);
  const right: Vec3 = [cosAzimuth, 0, -sinAzimuth];
  const up: Vec3 = [-sinElevation * sinAzimuth, cosElevation, -sinElevation * cosAzimuth];

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

function posterViewBox(bounds: Box): PosterViewBox {
  let cameraU = 0;
  let cameraV = 0;

  for (let step = 0; step < 4; step += 1) {
    const extents = projectedHalfExtents(bounds, VIEW.baseAzimuth + step * VIEW.snap);

    cameraU = Math.max(cameraU, extents.u);
    cameraV = Math.max(cameraV, extents.v);
  }

  const usable = 1 - 2 * VIEW.fitMargin;
  const width = (2 * cameraU * CAMERA_TO_POSTER) / usable;
  const height = (2 * cameraV * CAMERA_TO_POSTER) / usable;

  return [-width / 2, -height / 2, width, height];
}

function slabFaces(center: Vec3, size: Vec3): PosterSlabFaces {
  const [centerX, centerY, centerZ] = center;
  const [sizeX, sizeY, sizeZ] = size;
  const minX = centerX - sizeX / 2;
  const maxX = centerX + sizeX / 2;
  const minY = centerY - sizeY / 2;
  const maxY = centerY + sizeY / 2;
  const minZ = centerZ - sizeZ / 2;
  const maxZ = centerZ + sizeZ / 2;

  return {
    top: {
      points: [
        projectPoint([minX, maxY, minZ]),
        projectPoint([maxX, maxY, minZ]),
        projectPoint([maxX, maxY, maxZ]),
        projectPoint([minX, maxY, maxZ]),
      ],
    },
    sideX: {
      points: [
        projectPoint([maxX, maxY, minZ]),
        projectPoint([maxX, maxY, maxZ]),
        projectPoint([maxX, minY, maxZ]),
        projectPoint([maxX, minY, minZ]),
      ],
    },
    sideZ: {
      points: [
        projectPoint([minX, maxY, maxZ]),
        projectPoint([maxX, maxY, maxZ]),
        projectPoint([maxX, minY, maxZ]),
        projectPoint([minX, minY, maxZ]),
      ],
    },
  };
}

// Nearness to the camera at (+x, +y, +z): paint far → near so upper and front slabs cover the ones behind them.
function depthOf([x, y, z]: Vec3): number {
  return x + y + z;
}

export function posterGeometry(project: Project, state: PosterState): PosterGeometry {
  const layout = layoutProject(project);
  const candidates: PosterCandidate[] = [
    ...layout.layers.map((slab, index) => ({
      id: slab.id,
      kind: 'layer' as const,
      center: slab[state],
      size: slab.size,
      sourceIndex: index,
    })),
    ...layout.components.map((slab, index) => ({
      id: slab.id,
      kind: 'component' as const,
      center: slab[state],
      size: slab.size,
      sourceIndex: layout.layers.length + index,
    })),
  ];

  const slabs = candidates
    .sort((left, right) => {
      const depthDelta = depthOf(left.center) - depthOf(right.center);

      return depthDelta === 0 ? left.sourceIndex - right.sourceIndex : depthDelta;
    })
    .map((slab): PosterSlab => ({
      id: slab.id,
      kind: slab.kind,
      center: slab.center,
      depth: depthOf(slab.center),
      faces: slabFaces(slab.center, slab.size),
    }));

  return {
    state,
    viewBox: posterViewBox(layout.bounds[state]),
    slabs,
  };
}
