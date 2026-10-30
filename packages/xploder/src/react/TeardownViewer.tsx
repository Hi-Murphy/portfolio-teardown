import { Canvas } from '@react-three/fiber';
import {
  useCallback,
  useLayoutEffect,
  useMemo,
  useRef,
  type CSSProperties,
  type ReactNode,
} from 'react';

import type { Phase } from '../engine/explode';
import { layoutProject, type LayoutInput, type LayoutOptions } from '../layout';
import { resolveMotion } from '../motion';
import type { Palette } from '../theme';
import { Scene } from './scene/Scene';
import type { ViewerStats } from './scene/Stats';
import { useBlueprintPalette } from './usePalette';
import { usePrefersReducedMotion } from './useReducedMotion';
import type { TeardownViewerHandle } from './useTeardownViewer';

export interface TeardownViewerProps {
  project: LayoutInput & { meta: { slug: string } };
  viewer: TeardownViewerHandle;
  palette?: Palette;
  layoutOptions?: Partial<LayoutOptions>;
  onStats?: (stats: ViewerStats) => void;
  onSettled?: (state: 'imploded' | 'exploded') => void;
  className?: string;
  'aria-label'?: string;
  fallback?: ReactNode;
}

const WRAPPER_STYLE: CSSProperties = {
  touchAction: 'pan-y pinch-zoom',
  position: 'relative',
};

const CANVAS_STYLE: CSSProperties = {
  touchAction: 'pan-y pinch-zoom',
};

export function TeardownViewer({
  project,
  viewer,
  palette,
  layoutOptions,
  onStats,
  onSettled,
  className,
  'aria-label': ariaLabel,
  fallback,
}: TeardownViewerProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const readyRef = useRef(false);
  const themePalette = useBlueprintPalette();
  const prefersReducedMotion = usePrefersReducedMotion();
  const resolvedPalette = palette ?? themePalette;
  const tokens = useMemo(() => resolveMotion(prefersReducedMotion), [prefersReducedMotion]);
  const layout = useMemo(() => layoutProject(project, layoutOptions), [project, layoutOptions]);

  const onPhase = useCallback((phase: Phase) => {
    if (wrapperRef.current !== null) wrapperRef.current.dataset.xploderState = phase;
  }, []);

  const onStatsChange = useCallback(
    (stats: ViewerStats) => {
      if (wrapperRef.current !== null && !readyRef.current) {
        readyRef.current = true;
        wrapperRef.current.dataset.xploderReady = 'true';
      }

      onStats?.(stats);
    },
    [onStats],
  );

  useLayoutEffect(() => {
    const element = wrapperRef.current;

    if (element === null) return;

    element.dataset.xploderAzimuth = String(viewer.azimuthDegrees);
    element.dataset.xploderZoom = String(viewer.rig.zoomFactor);
  }, [viewer.azimuthDegrees, viewer.rig.zoomFactor]);

  return (
    <div
      ref={wrapperRef}
      tabIndex={0}
      role="group"
      aria-label={ariaLabel ?? `${project.meta.slug} architecture view`}
      aria-keyshortcuts="ArrowLeft ArrowRight + - 0"
      onKeyDown={viewer.onKeyDown}
      style={WRAPPER_STYLE}
      className={className}
    >
      <Canvas
        orthographic
        frameloop="demand"
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: true }}
        style={CANVAS_STYLE}
        fallback={fallback ?? <p>WebGL is unavailable for this architecture view.</p>}
      >
        <Scene
          layout={layout}
          palette={resolvedPalette}
          tokens={tokens}
          target={viewer.target}
          rig={viewer.rig}
          slug={project.meta.slug}
          onPhase={onPhase}
          onSettled={onSettled}
          onStats={onStatsChange}
        />
      </Canvas>
    </div>
  );
}
