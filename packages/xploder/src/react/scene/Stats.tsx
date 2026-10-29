import { useFrame } from '@react-three/fiber';
import { useLayoutEffect, useMemo, useRef } from 'react';

import type { ProjectLayout } from '../../layout';

export interface ViewerStats {
  drawCalls: number;
  triangles: number;
  frame: number;
  instances: { layers: number; components: number };
}

export interface StatsProps {
  readonly layout: ProjectLayout;
  readonly onStats?: (stats: ViewerStats) => void;
}

export function Stats({ layout, onStats }: StatsProps) {
  const onStatsRef = useRef(onStats);
  const lastStatsRef = useRef<ViewerStats | null>(null);
  const instances = useMemo(
    () => ({ layers: layout.layers.length, components: layout.components.length }),
    [layout.components.length, layout.layers.length],
  );

  useLayoutEffect(() => {
    onStatsRef.current = onStats;
  }, [onStats]);

  useFrame(({ gl, scene, camera }) => {
    gl.render(scene, camera);

    const { calls, triangles, frame } = gl.info.render;
    const previous = lastStatsRef.current;

    if (
      previous !== null &&
      previous.drawCalls === calls &&
      previous.triangles === triangles &&
      previous.frame === frame
    ) {
      return;
    }

    const stats: ViewerStats = {
      drawCalls: calls,
      triangles,
      frame,
      instances,
    };

    lastStatsRef.current = stats;
    onStatsRef.current?.(stats);
  }, 1);

  return null;
}
