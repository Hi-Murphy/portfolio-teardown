import { Canvas } from '@react-three/fiber';
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';

import type { Phase } from '../engine/explode';
import { captionAnchor } from '../interaction/caption';
import { rescaleScroll } from '../interaction/scroll';
import { layoutProject, type LayoutOptions } from '../layout';
import { resolveMotion } from '../motion';
import type { Palette } from '../theme';
import { TourCaption } from './overlay/TourCaption';
import { Scene } from './scene/Scene';
import type { EmphasisPhase, EmphasisState } from './scene/Emphasis';
import type { PickBridgeHandle } from './scene/PickBridge';
import type { ViewerStats } from './scene/Stats';
import { usePointerPick } from './usePointerPick';
import { useBlueprintPalette } from './usePalette';
import { usePrefersReducedMotion } from './useReducedMotion';
import {
  viewerMetadataOf,
  type TeardownViewerHandle,
  type ViewerProject,
} from './useTeardownViewer';

export interface TeardownViewerProps {
  project: ViewerProject;
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

const STAGE_STYLE: CSSProperties = {
  height: '100%',
  overflowX: 'hidden',
  overflowY: 'auto',
  position: 'relative',
  scrollbarWidth: 'thin',
  touchAction: 'pan-y pinch-zoom',
  width: '100%',
};

const CANVAS_VIEWPORT_STYLE: CSSProperties = {
  height: '100%',
  position: 'sticky',
  top: 0,
  width: '100%',
};

const PROJECT_MISMATCH_WARNING =
  'TeardownViewer: pass the same project object to useTeardownViewer({ project }) and <TeardownViewer project>.';

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
  const stageRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<Float32Array | null>(null);
  const [scrollExtentPx, setScrollExtentPx] = useState(0);
  const publishedExtentRef = useRef(0);
  const adjustedExtentRef = useRef(0);
  const pickBridgeRef = useRef<PickBridgeHandle>({
    camera: null,
    progress: null,
    onFrame: null,
  });
  const readyRef = useRef(false);
  const warnedProjectRef = useRef(false);
  const { pointer, position, project: viewerProject } = viewerMetadataOf(viewer);
  const themePalette = useBlueprintPalette();
  const prefersReducedMotion = usePrefersReducedMotion();
  const resolvedPalette = palette ?? themePalette;
  const tokens = useMemo(() => resolveMotion(prefersReducedMotion), [prefersReducedMotion]);
  const layout = useMemo(() => layoutProject(project, layoutOptions), [project, layoutOptions]);
  const targetLayerIndex =
    position.componentId === null
      ? null
      : project.layers.findIndex((layer) =>
          layer.components.some((component) => component.id === position.componentId),
        );
  const captionSide = captionAnchor(
    targetLayerIndex === null || targetLayerIndex < 0 ? null : targetLayerIndex,
    project.layers.length,
  );

  const onScrollExtent = useCallback((extent: number) => {
    if (extent === publishedExtentRef.current) return;

    publishedExtentRef.current = extent;
    setScrollExtentPx(extent);
  }, []);

  usePointerPick(stageRef, pickBridgeRef, layout, viewer.onPointerInput, pointer);

  useEffect(() => {
    if (warnedProjectRef.current) return;
    if (viewerProject === undefined || viewerProject === project) return;

    warnedProjectRef.current = true;
    console.warn(PROJECT_MISMATCH_WARNING);
  }, [project, viewerProject]);

  const emphasis = useMemo<EmphasisState>(
    () => ({
      highlight: viewer.highlight,
      focusLayerId: viewer.focus.layerId,
      focusSuspended: viewer.tour.status !== 'idle',
      tourComponentId: position.componentId,
      stepStartedAt: position.stepStartedAt,
      tourPlaying: viewer.tour.status === 'playing',
    }),
    [
      position.componentId,
      position.stepStartedAt,
      viewer.focus.layerId,
      viewer.highlight,
      viewer.tour.status,
    ],
  );

  const onPhase = useCallback((phase: Phase) => {
    if (wrapperRef.current !== null) wrapperRef.current.dataset.xploderState = phase;
  }, []);

  const onEmphasisPhase = useCallback((phase: EmphasisPhase) => {
    if (wrapperRef.current === null) return;

    wrapperRef.current.dataset.xploderTweening = String(phase.tweening);
    wrapperRef.current.dataset.xploderPulse = String(phase.pulse);
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

    element.dataset.xploderTweening = 'false';
    element.dataset.xploderPulse = 'false';
  }, []);

  useLayoutEffect(() => {
    const stage = stageRef.current;
    const previousExtent = adjustedExtentRef.current;

    if (stage === null || scrollExtentPx === previousExtent) return;

    const nextScrollTop =
      previousExtent === 0
        ? scrollExtentPx / 2
        : rescaleScroll(stage.scrollTop, previousExtent, scrollExtentPx);

    adjustedExtentRef.current = scrollExtentPx;
    stage.scrollTop = nextScrollTop;
    stage.dispatchEvent(new Event('scroll'));
  }, [scrollExtentPx]);

  useLayoutEffect(() => {
    const element = wrapperRef.current;

    if (element === null) return;

    element.dataset.xploderAzimuth = String(viewer.azimuthDegrees);
    element.dataset.xploderZoom = String(viewer.rig.zoomFactor);
  }, [viewer.azimuthDegrees, viewer.rig.zoomFactor]);

  useLayoutEffect(() => {
    const element = wrapperRef.current;

    if (element === null) return;

    if (viewer.highlight === null) {
      delete element.dataset.xploderHighlight;
    } else {
      element.dataset.xploderHighlight = viewer.highlight;
    }
  }, [viewer.highlight]);

  useLayoutEffect(() => {
    const element = wrapperRef.current;

    if (element === null) return;

    if (viewer.focus.layerId === null) {
      delete element.dataset.xploderFocus;
    } else {
      element.dataset.xploderFocus = viewer.focus.layerId;
    }

    element.dataset.xploderTour = viewer.tour.status;
    element.dataset.xploderTourStep = String(viewer.tour.step);

    if (viewer.tour.flowId === null) {
      delete element.dataset.xploderTourFlow;
    } else {
      element.dataset.xploderTourFlow = viewer.tour.flowId;
    }
  }, [viewer.focus.layerId, viewer.tour.flowId, viewer.tour.status, viewer.tour.step]);

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
      <div ref={stageRef} data-xploder-stage="" style={STAGE_STYLE}>
        <div data-xploder-canvas-viewport="" style={CANVAS_VIEWPORT_STYLE}>
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
              emphasis={emphasis}
              onEmphasisPhase={onEmphasisPhase}
              progressRef={progressRef}
              pickBridgeRef={pickBridgeRef}
              scrollRef={stageRef}
              onScrollExtent={onScrollExtent}
            />
          </Canvas>
        </div>
        <div data-xploder-scroll-spacer="" style={{ height: scrollExtentPx }} />
      </div>
      {viewer.tour.flowId === null || viewer.tour.status === 'idle' ? null : (
        <TourCaption
          key={captionSide}
          project={project}
          flowId={viewer.tour.flowId}
          position={position}
          anchor={captionSide}
          palette={resolvedPalette}
          tokens={tokens}
        />
      )}
    </div>
  );
}
