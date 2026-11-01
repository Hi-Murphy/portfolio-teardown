import { Canvas } from '@react-three/fiber';
import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from 'react';

import { announce, type AnnounceEvent } from '../a11y/announce';
import { PAN_PAGE_FRACTION, PAN_STEP_PX } from '../a11y/look';
import type { Phase } from '../engine/explode';
import { captionAnchor } from '../interaction/caption';
import { rescaleScroll } from '../interaction/scroll';
import { resolveViewerLayoutOptions } from '../look/product';
import { look } from '../look/tokens';
import { layoutProject, type LayoutOptions } from '../layout';
import { resolveMotion } from '../motion';
import { traceVertices } from '../overlay/model';
import { panelReducer, type PanelState } from '../panel/state';
import { resolveSlabClick } from '../panel/tourClick';
import type { ComponentKind } from '../schema/constants';
import type { TechRegistry } from '../schema/tech';
import type { Palette } from '../theme';
import { CanvasBoundary } from './a11y/CanvasBoundary';
import { ComponentNavigator, type ComponentNavigatorHandle } from './a11y/ComponentNavigator';
import { LiveRegion, type LiveRegionHandle } from './a11y/LiveRegion';
import { hasWebgl } from './a11y/webgl';
import {
  LETTERING_HIDE_CSS,
  PartLettering,
  type PartLetteringHandle,
} from './lettering/PartLettering';
import { BlueprintOverlay, type BlueprintOverlayHandle } from './overlay/BlueprintOverlay';
import { TourCaption } from './overlay/TourCaption';
import { executeTourCommand } from './panel/executeTourCommand';
import { PanelLayer, type PanelLayerHandle } from './panel/PanelLayer';
import {
  panelsMetadataOf,
  useViewerPanels,
  type ViewerPanelsHandle,
} from './panel/useViewerPanels';
import { useSlabClick } from './panel/useSlabClick';
import { Scene } from './scene/Scene';
import type { EmphasisPhase, EmphasisState } from './scene/Emphasis';
import type { OverlayEvent } from './scene/OverlayProjector';
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

type ViewerComponent = ViewerProject['layers'][number]['components'][number] & {
  readonly kind?: ComponentKind;
};

export interface TeardownViewerProps {
  project: ViewerProject;
  viewer: TeardownViewerHandle;
  palette?: Palette;
  layoutOptions?: Partial<LayoutOptions>;
  onStats?: (stats: ViewerStats) => void;
  onSettled?: (state: 'imploded' | 'exploded') => void;
  panels?: ViewerPanelsHandle;
  registry?: TechRegistry;
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

const VISUALLY_HIDDEN_STYLE: CSSProperties = {
  position: 'absolute',
  width: '1px',
  height: '1px',
  overflow: 'hidden',
  clip: 'rect(0 0 0 0)',
  clipPath: 'inset(50%)',
  whiteSpace: 'nowrap',
  margin: '-1px',
  padding: 0,
  border: 0,
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
  panels,
  registry,
  className,
  'aria-label': ariaLabel,
  fallback,
}: TeardownViewerProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const liveRegionRef = useRef<LiveRegionHandle>(null);
  const navigatorRef = useRef<ComponentNavigatorHandle>(null);
  const proxyOpenerRef = useRef<HTMLButtonElement | null>(null);
  const overlayRef = useRef<BlueprintOverlayHandle>(null);
  const letteringRef = useRef<PartLetteringHandle>(null);
  const panelLayerRef = useRef<PanelLayerHandle>(null);
  const progressRef = useRef<Float32Array | null>(null);
  const [scrollExtentPx, setScrollExtentPx] = useState(0);
  const [phase, setPhase] = useState<Phase | null>(null);
  const [webgl] = useState(() => hasWebgl());
  const keysHelpId = useId();
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
  const internalPanels = useViewerPanels();
  const panelsHandle = panels ?? internalPanels;
  const { dispatch, recordOpener } = panelsMetadataOf(panelsHandle);
  const previousPanelStateRef = useRef<PanelState>(panelsHandle.state);
  const previousPanelKindRef = useRef(panelsHandle.state.kind);
  const previousSlugRef = useRef(project.meta.slug);
  const previousTourRef = useRef<{
    readonly flowId: string | null;
    readonly step: number;
  } | null>(null);
  const pendingTourJumpRef = useRef(false);
  const pendingTourPauseRef = useRef(false);
  const previousAnnouncementPanelRef = useRef<PanelState>(panelsHandle.state);
  const themePalette = useBlueprintPalette();
  const prefersReducedMotion = usePrefersReducedMotion();
  const resolvedPalette = palette ?? themePalette;
  const tokens = useMemo(() => resolveMotion(prefersReducedMotion), [prefersReducedMotion]);
  const resolvedLayoutOptions = useMemo(
    () => resolveViewerLayoutOptions(layoutOptions),
    [layoutOptions],
  );
  const layout = useMemo(
    () => layoutProject(project, resolvedLayoutOptions),
    [project, resolvedLayoutOptions],
  );
  const kinds = useMemo(
    () =>
      project.layers.flatMap((layer) =>
        layer.components.map((component) => (component as ViewerComponent).kind ?? 'module'),
      ),
    [project],
  );
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
  const componentCount = project.layers.reduce(
    (count, layer) => count + layer.components.length,
    0,
  );

  const onScrollExtent = useCallback((extent: number) => {
    if (extent === publishedExtentRef.current) return;

    publishedExtentRef.current = extent;
    setScrollExtentPx(extent);
  }, []);

  const onOverlay = useCallback((event: OverlayEvent) => {
    overlayRef.current?.update(event);
    letteringRef.current?.update(event);
    panelLayerRef.current?.update(event);
    navigatorRef.current?.update(event);
  }, []);

  const onTitleBlockShown = useCallback((shown: boolean) => {
    if (wrapperRef.current !== null) {
      wrapperRef.current.dataset.xploderTitleblock = shown ? 'shown' : 'hidden';
    }
  }, []);

  const onOverlayScroll = useCallback((offsetY: number) => {
    overlayRef.current?.setScroll(offsetY);
    letteringRef.current?.setScroll(offsetY);
    panelLayerRef.current?.setScroll(offsetY);
    navigatorRef.current?.setScroll(offsetY);
  }, []);

  usePointerPick(stageRef, pickBridgeRef, layout, viewer.onPointerInput, pointer);

  const focusProxyOpener = useCallback((opener: Element | null): boolean => {
    const recorded = opener ?? proxyOpenerRef.current;
    const proxy =
      recorded instanceof HTMLElement &&
      recorded.isConnected &&
      recorded.matches('[data-xploder-proxy]')
        ? recorded
        : null;

    proxyOpenerRef.current = null;

    if (proxy === null) return false;

    proxy.focus({ preventScroll: true });
    return true;
  }, []);

  const onSlabClick = useCallback(
    (hit: string | null, opener: HTMLButtonElement | null = null) => {
      const decision = resolveSlabClick({
        hit,
        tour: {
          status: viewer.tour.status,
          flowId: viewer.tour.flowId,
          step: viewer.tour.step,
        },
        flows: project.flows ?? [],
      });

      if (decision.tour?.type === 'jump') pendingTourJumpRef.current = true;
      if (decision.tour?.type === 'pause') pendingTourPauseRef.current = true;

      executeTourCommand(viewer.actions, decision.tour);

      if (decision.panelEvent !== null) {
        const next = panelReducer(panelsHandle.state, decision.panelEvent);
        const openedDetail =
          next.kind === 'detail' &&
          (panelsHandle.state.kind !== 'detail' ||
            panelsHandle.state.componentId !== next.componentId);

        if (openedDetail) {
          if (opener === null) {
            proxyOpenerRef.current = null;
            recordOpener(wrapperRef.current);
          } else {
            proxyOpenerRef.current = opener;
            recordOpener(opener);
          }
        }

        dispatch(decision.panelEvent);

        if (
          panelsHandle.state.kind !== 'closed' &&
          next.kind === 'closed' &&
          decision.tour?.type !== 'jump'
        ) {
          if (!focusProxyOpener(panelsMetadataOf(panelsHandle).opener)) {
            wrapperRef.current?.focus({ preventScroll: true });
          }
        }
      }
    },
    [
      dispatch,
      focusProxyOpener,
      panelsHandle,
      recordOpener,
      project.flows,
      viewer.actions,
      viewer.tour.flowId,
      viewer.tour.status,
      viewer.tour.step,
    ],
  );

  const onNavigatorActivate = useCallback(
    (id: string, proxy: HTMLButtonElement) => {
      onSlabClick(id, proxy);
    },
    [onSlabClick],
  );

  const onWrapperKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLDivElement>) => {
      viewer.onKeyDown(event);

      if (event.defaultPrevented || event.target !== event.currentTarget) return;

      const stage = stageRef.current;

      if (stage === null || stage.scrollHeight <= stage.clientHeight) return;

      const maximum = stage.scrollHeight - stage.clientHeight;
      let next: number | null = null;

      switch (event.key) {
        case 'ArrowUp':
          next = stage.scrollTop - PAN_STEP_PX;
          break;
        case 'ArrowDown':
          next = stage.scrollTop + PAN_STEP_PX;
          break;
        case 'PageUp':
          next = stage.scrollTop - stage.clientHeight * PAN_PAGE_FRACTION;
          break;
        case 'PageDown':
          next = stage.scrollTop + stage.clientHeight * PAN_PAGE_FRACTION;
          break;
        case 'Home':
          next = 0;
          break;
        case 'End':
          next = maximum;
          break;
      }

      if (next === null) return;

      event.preventDefault();
      stage.scrollTop = Math.min(maximum, Math.max(0, next));
      stage.dispatchEvent(new Event('scroll'));
    },
    [viewer],
  );

  useSlabClick(stageRef, pickBridgeRef, layout, onSlabClick);

  const onPanelClose = useCallback(
    (reason: 'escape' | 'outside' | 'closeControl') => {
      const closing = panelsHandle.state;
      const opener = panelsMetadataOf(panelsHandle).opener;
      const wrapper = wrapperRef.current;

      dispatch({ type: reason });

      if (focusProxyOpener(opener)) {
        return;
      }

      if (closing.kind === 'caseStudy' && opener instanceof HTMLElement && opener.isConnected) {
        opener.focus({ preventScroll: true });
      } else if (reason !== 'outside') {
        wrapper?.focus({ preventScroll: true });
      } else {
        const active = document.activeElement;

        if (
          active === null ||
          active === document.body ||
          (wrapper !== null && wrapper.contains(active))
        ) {
          wrapper?.focus({ preventScroll: true });
        }
      }
    },
    [dispatch, focusProxyOpener, panelsHandle],
  );

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

    setPhase(phase);
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

    const traceFlow =
      viewer.tour.flowId === null
        ? undefined
        : project.flows?.find((flow) => flow.id === viewer.tour.flowId);

    element.dataset.xploderTrace = traceVertices(
      viewer.tour.status,
      traceFlow,
      viewer.tour.step,
    ).join(' ');
  }, [
    project.flows,
    viewer.focus.layerId,
    viewer.tour.flowId,
    viewer.tour.status,
    viewer.tour.step,
  ]);

  useLayoutEffect(() => {
    const previous = previousPanelStateRef.current;
    const current = panelsHandle.state;

    if (
      previous.kind === 'detail' &&
      (current.kind !== 'detail' || current.componentId !== previous.componentId) &&
      viewer.highlight === previous.componentId
    ) {
      viewer.actions.highlight(null);
    }

    // Always re-assert as a program highlight (RFC D4): a mouse hover highlight would be
    // cleared when the pointer leaves the stage for the panel.
    if (
      current.kind === 'detail' &&
      (previous.kind !== 'detail' || previous.componentId !== current.componentId)
    ) {
      viewer.actions.highlight(current.componentId);
    }

    previousPanelStateRef.current = current;
  }, [panelsHandle.state, viewer.actions, viewer.highlight]);

  useLayoutEffect(() => {
    if (previousSlugRef.current === project.meta.slug) return;

    previousSlugRef.current = project.meta.slug;
    dispatch({ type: 'reset' });
  }, [dispatch, project.meta.slug]);

  useLayoutEffect(() => {
    const previous = previousPanelKindRef.current;
    const current = panelsHandle.state.kind;

    previousPanelKindRef.current = current;

    if (previous !== 'caseStudy' && current === 'caseStudy' && viewer.tour.status === 'playing') {
      viewer.actions.pause();
    }
  }, [panelsHandle.state.kind, viewer.actions, viewer.tour.status]);

  useLayoutEffect(() => {
    const element = wrapperRef.current;

    if (element === null) return;

    element.dataset.xploderPanel =
      panelsHandle.state.kind === 'caseStudy' ? 'case-study' : panelsHandle.state.kind;
  }, [panelsHandle.state.kind]);

  useLayoutEffect(() => {
    const previous = previousAnnouncementPanelRef.current;
    const current = panelsHandle.state;
    const paused = pendingTourPauseRef.current;

    previousAnnouncementPanelRef.current = current;
    pendingTourPauseRef.current = false;

    let event: AnnounceEvent | null = null;

    if (
      current.kind === 'detail' &&
      (previous.kind !== 'detail' || previous.componentId !== current.componentId)
    ) {
      event = paused
        ? { type: 'tourPausedOpen', componentId: current.componentId }
        : { type: 'detailOpen', componentId: current.componentId };
    } else if (current.kind === 'caseStudy' && previous.kind !== 'caseStudy') {
      event = { type: 'caseStudyOpen' };
    } else if (current.kind === 'closed' && previous.kind === 'detail') {
      event = { type: 'detailClose', componentId: previous.componentId };
    } else if (current.kind === 'closed' && previous.kind === 'caseStudy') {
      event = { type: 'caseStudyClose' };
    }

    if (event !== null) liveRegionRef.current?.say(announce(event, project));
  }, [panelsHandle.state, project]);

  useLayoutEffect(() => {
    const previous = previousTourRef.current;
    const current = {
      flowId: viewer.tour.flowId,
      step: viewer.tour.step,
    } as const;

    previousTourRef.current = current;

    if (previous === null) return;

    const jump = pendingTourJumpRef.current;
    const changed = previous.flowId !== current.flowId || previous.step !== current.step;

    if (!changed && !jump) return;

    pendingTourJumpRef.current = false;

    if (viewer.tour.status === 'idle' || current.flowId === null) return;

    const type = jump ? 'tourJump' : 'tourStep';

    liveRegionRef.current?.say(announce({ type, flowId: current.flowId, position }, project));
  }, [position, project, viewer.tour.flowId, viewer.tour.status, viewer.tour.step]);

  const webglFallback = fallback ?? <p>WebGL is unavailable for this architecture view.</p>;
  const detailOpenId = panelsHandle.state.kind === 'detail' ? panelsHandle.state.componentId : null;

  return (
    <div
      ref={wrapperRef}
      tabIndex={0}
      role="group"
      aria-label={ariaLabel ?? `${project.meta.slug} architecture view`}
      aria-keyshortcuts="ArrowLeft ArrowRight ArrowUp ArrowDown PageUp PageDown Home End + - 0"
      aria-describedby={keysHelpId}
      onKeyDown={onWrapperKeyDown}
      style={WRAPPER_STYLE}
      className={className}
      data-xploder-titleblock="hidden"
      data-xploder-lettering-on=""
      data-xploder-webgl={webgl ? 'available' : 'unavailable'}
    >
      <style>{LETTERING_HIDE_CSS}</style>
      <LiveRegion ref={liveRegionRef} />
      <p id={keysHelpId} style={VISUALLY_HIDDEN_STYLE}>
        {project.layers.length} {project.layers.length === 1 ? 'layer' : 'layers'}, {componentCount}{' '}
        {componentCount === 1 ? 'component' : 'components'}. Use Left and Right Arrow to rotate,
        plus and minus to zoom, and Up and Down Arrow, Page Up, Page Down, Home, or End to pan the
        drawing. Press Tab to move to Components.
      </p>
      {webgl ? (
        <>
          <div
            ref={stageRef}
            data-xploder-stage=""
            style={STAGE_STYLE}
            tabIndex={-1}
            onFocus={(event) => {
              if (event.target === event.currentTarget) {
                wrapperRef.current?.focus({ preventScroll: true });
              }
            }}
          >
            <div data-xploder-canvas-viewport="" style={CANVAS_VIEWPORT_STYLE}>
              <CanvasBoundary fallback={webglFallback}>
                <Canvas
                  orthographic
                  frameloop="demand"
                  dpr={[1, 2]}
                  gl={{ antialias: true, alpha: true }}
                  style={CANVAS_STYLE}
                  fallback={webglFallback}
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
                    look={look}
                    kinds={kinds}
                    onOverlay={onOverlay}
                    onOverlayScroll={onOverlayScroll}
                  />
                </Canvas>
              </CanvasBoundary>
              <div aria-hidden="true">
                <BlueprintOverlay
                  ref={overlayRef}
                  project={project}
                  layout={layout}
                  palette={resolvedPalette}
                  tokens={tokens}
                  target={viewer.target}
                  phase={phase}
                  tour={viewer.tour}
                  focus={viewer.focus}
                  highlight={viewer.highlight}
                  look={look}
                  onTitleBlockShown={onTitleBlockShown}
                />
              </div>
              <PartLettering
                ref={letteringRef}
                layout={layout}
                project={project}
                palette={resolvedPalette}
                tokens={tokens}
                look={look}
                bridgeRef={pickBridgeRef}
                target={viewer.target}
                phase={phase}
                tourStatus={viewer.tour.status}
                focus={viewer.focus}
                highlight={viewer.highlight}
                wrapperRef={wrapperRef}
              />
            </div>
            <div data-xploder-scroll-spacer="" style={{ height: scrollExtentPx }} />
          </div>
          <ComponentNavigator
            ref={navigatorRef}
            project={project}
            palette={resolvedPalette}
            stageRef={stageRef}
            highlight={viewer.highlight}
            detailOpenId={detailOpenId}
            detailId={panelsHandle.ids.detail}
            onHighlight={viewer.actions.highlight}
            onActivate={onNavigatorActivate}
          />
        </>
      ) : (
        webglFallback
      )}
      {viewer.tour.flowId === null || viewer.tour.status === 'idle' ? null : (
        <TourCaption
          key={`${captionSide}:${viewer.tour.flowId}:${position.step}`}
          project={project}
          flowId={viewer.tour.flowId}
          position={position}
          anchor={captionSide}
          palette={resolvedPalette}
          tokens={tokens}
        />
      )}
      <PanelLayer
        ref={panelLayerRef}
        state={panelsHandle.state}
        project={project}
        registry={registry}
        palette={resolvedPalette}
        tokens={tokens}
        wrapperRef={wrapperRef}
        headingIds={{ detail: panelsHandle.ids.detail, caseStudy: panelsHandle.ids.caseStudy }}
        onClose={onPanelClose}
      />
    </div>
  );
}
