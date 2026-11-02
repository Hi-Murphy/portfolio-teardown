import type { Project } from 'xploder';

import { posterGeometry, type PosterPoint, type PosterState } from '../content/poster';

export interface TeardownPosterProps {
  readonly project: Project;
  readonly state?: PosterState;
  readonly className?: string;
}

function pointsAttribute(points: readonly PosterPoint[]): string {
  return points.map(([x, y]) => `${x},${y}`).join(' ');
}

export function TeardownPoster({ project, state = 'exploded', className }: TeardownPosterProps) {
  const geometry = posterGeometry(project, state);

  return (
    <svg
      aria-hidden="true"
      focusable="false"
      data-site-poster=""
      viewBox={geometry.viewBox.join(' ')}
      preserveAspectRatio="xMidYMid meet"
      className={className}
    >
      {geometry.slabs.map((slab) => (
        <g
          key={`${slab.kind}-${slab.id}`}
          data-site-poster-slab=""
          data-kind={slab.kind}
          fill="var(--bp-paper)"
          stroke={slab.kind === 'layer' ? 'var(--bp-line-muted)' : 'var(--bp-line)'}
          strokeWidth={1}
          strokeLinejoin="round"
        >
          <polygon
            points={pointsAttribute(slab.faces.sideX.points)}
            vectorEffect="non-scaling-stroke"
          />
          <polygon
            points={pointsAttribute(slab.faces.sideZ.points)}
            vectorEffect="non-scaling-stroke"
          />
          <polygon
            points={pointsAttribute(slab.faces.top.points)}
            fill="var(--bp-surface)"
            vectorEffect="non-scaling-stroke"
          />
        </g>
      ))}
    </svg>
  );
}
