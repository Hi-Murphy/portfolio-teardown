import type { Project } from 'xploder';
import { layoutProject, type ComponentSlab, type Vec3 } from 'xploder/layout';

export interface EngineFallbackProps {
  readonly projects: readonly Project[];
  readonly message?: string;
}

type ScreenPoint = readonly [x: number, y: number];

interface SlabFaces {
  readonly top: readonly ScreenPoint[];
  readonly sideX: readonly ScreenPoint[];
  readonly sideZ: readonly ScreenPoint[];
}

const ISO_COS_30 = Math.cos(Math.PI / 6);
const ISO_SIN_30 = Math.sin(Math.PI / 6);
const POSTER_PADDING = 0.18;
const FIXTURE_IDS = ['a', 'b', 'c'] as const;

function screenPoint([x, y, z]: Vec3): ScreenPoint {
  return [(x - z) * ISO_COS_30, (x + z) * ISO_SIN_30 - y];
}

function slabFaces(component: ComponentSlab): SlabFaces {
  const [centerX, centerY, centerZ] = component.exploded;
  const [sizeX, sizeY, sizeZ] = component.size;
  const minX = centerX - sizeX / 2;
  const maxX = centerX + sizeX / 2;
  const minY = centerY - sizeY / 2;
  const maxY = centerY + sizeY / 2;
  const minZ = centerZ - sizeZ / 2;
  const maxZ = centerZ + sizeZ / 2;

  return {
    top: [
      screenPoint([minX, maxY, minZ]),
      screenPoint([maxX, maxY, minZ]),
      screenPoint([maxX, maxY, maxZ]),
      screenPoint([minX, maxY, maxZ]),
    ],
    sideX: [
      screenPoint([maxX, maxY, minZ]),
      screenPoint([maxX, maxY, maxZ]),
      screenPoint([maxX, minY, maxZ]),
      screenPoint([maxX, minY, minZ]),
    ],
    sideZ: [
      screenPoint([minX, maxY, maxZ]),
      screenPoint([maxX, maxY, maxZ]),
      screenPoint([maxX, minY, maxZ]),
      screenPoint([minX, minY, maxZ]),
    ],
  };
}

function pointsAttribute(points: readonly ScreenPoint[]): string {
  return points.map(([x, y]) => `${x},${y}`).join(' ');
}

function posterViewBox(faces: readonly SlabFaces[]): string {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const face of faces) {
    for (const [x, y] of [...face.top, ...face.sideX, ...face.sideZ]) {
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }

  return `${minX - POSTER_PADDING} ${minY - POSTER_PADDING} ${maxX - minX + POSTER_PADDING * 2} ${maxY - minY + POSTER_PADDING * 2}`;
}

export function EngineFallback({ projects, message }: EngineFallbackProps) {
  const project = projects[0];

  if (project === undefined) return null;

  const layout = layoutProject(project);
  const faces = layout.components.map(slabFaces);
  const componentCount = layout.components.length;

  return (
    <div data-engine-fallback="" className="flex flex-col gap-4">
      {message === undefined ? null : (
        <p role="status" className="text-sm text-fg">
          {message}
        </p>
      )}
      <svg
        role="img"
        aria-label={`${project.meta.name} architecture: ${project.layers.length} layers, ${componentCount} components`}
        viewBox={posterViewBox(faces)}
        preserveAspectRatio="xMidYMid meet"
        className="mx-auto h-auto max-h-[34dvh] w-full"
      >
        <g fill="var(--bp-surface)" stroke="var(--bp-line)" strokeWidth="1" strokeLinejoin="round">
          {faces.map((face, index) => (
            <g key={layout.components[index]?.id ?? index} data-engine-fallback-slab="">
              <polygon
                points={pointsAttribute(face.sideX)}
                fill="var(--bp-paper)"
                vectorEffect="non-scaling-stroke"
              />
              <polygon
                points={pointsAttribute(face.sideZ)}
                fill="var(--bp-paper)"
                vectorEffect="non-scaling-stroke"
              />
              <polygon points={pointsAttribute(face.top)} vectorEffect="non-scaling-stroke" />
            </g>
          ))}
        </g>
      </svg>
      <nav aria-label="Projects">
        <ul className="grid gap-3 sm:grid-cols-3">
          {projects.map((entry, index) => (
            <li key={entry.meta.slug} className="text-sm">
              <a
                href={`?fixture=${FIXTURE_IDS[index] ?? index + 1}`}
                className="font-medium text-fg underline decoration-line underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              >
                {entry.meta.name}
              </a>
              {entry.meta.tagline === undefined ? null : ` — ${entry.meta.tagline}`}
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
