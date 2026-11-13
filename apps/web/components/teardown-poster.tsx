import type { Project } from 'xploder';

import {
  posterFlowPoints,
  posterGeometry,
  type PosterPoint,
  type PosterState,
} from '../content/poster';

export interface TeardownPosterProps {
  readonly project: Project;
  readonly state?: PosterState;
  readonly flowPath?: readonly string[];
  readonly className?: string;
}

function pointsAttribute(points: readonly PosterPoint[]): string {
  return points.map(([x, y]) => `${x},${y}`).join(' ');
}

export function TeardownPoster({
  project,
  state = 'exploded',
  flowPath,
  className,
}: TeardownPosterProps) {
  const geometry = posterGeometry(project, state);
  const flowPoints = flowPath === undefined ? null : posterFlowPoints(geometry, flowPath);

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
      {flowPoints === null ? null : (
        <g
          data-site-poster-flow=""
          fill="none"
          stroke="var(--bp-accent)"
          strokeWidth={1}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline
            data-site-poster-flow-line=""
            points={pointsAttribute(flowPoints)}
            strokeDasharray="2 6"
            vectorEffect="non-scaling-stroke"
          />
          {flowPoints.map(([x, y], index) => (
            <g key={index} data-site-poster-step={index + 1}>
              <circle
                cx={x}
                cy={y}
                r={0.32}
                className="[r:0.32px] sm:[r:0.26px] lg:[r:0.16px]"
                fill="var(--bp-paper)"
                vectorEffect="non-scaling-stroke"
              />
              <text
                x={x}
                y={y}
                fill="var(--bp-accent)"
                stroke="none"
                dominantBaseline="central"
                fontFamily="var(--font-mono, ui-monospace, monospace)"
                fontSize={0.3}
                className="[font-size:0.3px] sm:[font-size:0.24px] lg:[font-size:0.18px]"
                textAnchor="middle"
              >
                {index + 1}
              </text>
            </g>
          ))}
        </g>
      )}
    </svg>
  );
}
