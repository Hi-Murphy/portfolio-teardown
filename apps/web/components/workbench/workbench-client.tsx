'use client';

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { getProject } from '../../content/projects';
import { SITE_REGISTRY } from '../../content/tech-registry';
import { LIVE_CLASS } from '../hero/hero-classes';
import { ProjectOutline } from '../project-outline';
import { LiveViewer, useLiveViewer, useViewerPanels } from '../viewer/live-viewer';
import { ExplorePanel, type ExploreMode } from './explore-panel';
import { buildLayerModels, buildTourFlows, jumpSequence } from './tour-model';
import { WorkbenchDock } from './workbench-dock';

export interface WorkbenchPortalTargets {
  readonly dock: HTMLElement | null;
  readonly tour: HTMLElement | null;
}

export interface WorkbenchClientProps {
  readonly slug: string;
  readonly targets: WorkbenchPortalTargets;
}

export function WorkbenchClient({ slug, targets }: WorkbenchClientProps) {
  const project = getProject(slug);

  if (project === undefined) {
    throw new Error(`Unknown project slug "${slug}".`);
  }

  const viewer = useLiveViewer({ initial: 'exploded', project });
  const panels = useViewerPanels();
  const tourFlows = useMemo(() => buildTourFlows(project), [project]);
  const layers = useMemo(() => buildLayerModels(project), [project]);
  const rootRef = useRef<HTMLDivElement>(null);
  const [liveState, setLiveState] = useState<'loading' | 'revealed'>('loading');
  const [exploreMode, setExploreMode] = useState<ExploreMode>('layers');
  const reveal = useCallback(() => setLiveState('revealed'), []);

  useLayoutEffect(() => {
    targets.tour?.setAttribute('data-site-explore-live', '');
  }, [targets.tour]);

  useEffect(() => {
    if (rootRef.current?.querySelector('[data-xploder-webgl="unavailable"]') === null) return;

    const frame = window.requestAnimationFrame(() => setLiveState('revealed'));

    return () => window.cancelAnimationFrame(frame);
  }, []);

  const jumpToStep = useCallback(
    (stepIndex: number) => {
      if (viewer.target === 'imploded') viewer.actions.explode();

      const resume = viewer.tour.status === 'playing';

      for (const action of jumpSequence(stepIndex, resume)) {
        viewer.actions[action]();
      }
    },
    [viewer.actions, viewer.target, viewer.tour.status],
  );

  const previousStep = useCallback(() => {
    jumpToStep(Math.max(0, viewer.tour.step - 1));
  }, [jumpToStep, viewer.tour.step]);

  const nextStep = useCallback(() => {
    jumpToStep(Math.min(Math.max(0, viewer.tour.step + 1), viewer.tour.total - 1));
  }, [jumpToStep, viewer.tour.step, viewer.tour.total]);

  const restartTour = useCallback(() => jumpToStep(0), [jumpToStep]);

  const togglePlayback = useCallback(() => {
    if (viewer.tour.status === 'playing') viewer.actions.pause();
    else viewer.actions.play();
  }, [viewer.actions, viewer.tour.status]);

  const toggleTarget = useCallback(() => {
    if (exploreMode === 'flows') return;

    if (viewer.target === 'imploded') {
      viewer.actions.explode();
      return;
    }

    if (viewer.tour.status === 'playing') viewer.actions.pause();
    viewer.actions.implode();
  }, [exploreMode, viewer.actions, viewer.target, viewer.tour.status]);

  const changeExploreMode = useCallback(
    (next: ExploreMode) => {
      if (next === exploreMode) return;

      if (next === 'flows') {
        if (viewer.target === 'imploded') viewer.actions.explode();
        viewer.actions.releaseFocus();
      } else {
        viewer.actions.stop();
      }

      setExploreMode(next);
    },
    [exploreMode, viewer.actions, viewer.target],
  );

  const ariaLabel = `${project.meta.name} architecture view`;
  const liveViewer = useMemo(
    () => (
      <LiveViewer
        project={project}
        viewer={viewer}
        initial="exploded"
        panels={panels}
        registry={SITE_REGISTRY}
        fallback={
          <ProjectOutline
            project={project}
            message="WebGL is unavailable for this teardown."
            className="h-full overflow-y-auto p-4 sm:p-6"
          />
        }
        onFirstFrame={reveal}
        className="h-full w-full"
        aria-label={ariaLabel}
      />
    ),
    [ariaLabel, panels, project, reveal, viewer],
  );

  const dockPortal = useMemo(
    () =>
      targets.dock === null
        ? null
        : createPortal(
            <WorkbenchDock
              target={viewer.target}
              can={viewer.can}
              caseStudyOpen={panels.state.kind === 'caseStudy'}
              caseStudyControlsId={panels.ids.caseStudy}
              flowsActive={exploreMode === 'flows'}
              onToggle={toggleTarget}
              onRotateLeft={viewer.actions.rotateLeft}
              onRotateRight={viewer.actions.rotateRight}
              onZoomOut={viewer.actions.zoomOut}
              onZoomReset={viewer.actions.zoomReset}
              onZoomIn={viewer.actions.zoomIn}
              onToggleCaseStudy={panels.actions.toggleCaseStudy}
            />,
            targets.dock,
          ),
    [
      exploreMode,
      panels.actions.toggleCaseStudy,
      panels.ids.caseStudy,
      panels.state.kind,
      targets.dock,
      toggleTarget,
      viewer.actions.rotateLeft,
      viewer.actions.rotateRight,
      viewer.actions.zoomIn,
      viewer.actions.zoomOut,
      viewer.actions.zoomReset,
      viewer.can,
      viewer.target,
    ],
  );
  const tourPortal = useMemo(
    () =>
      targets.tour === null
        ? null
        : createPortal(
            <ExplorePanel
              mode={exploreMode}
              onModeChange={changeExploreMode}
              layers={layers}
              focusedLayerId={viewer.focus.layerId}
              onToggleLayer={viewer.actions.toggleFocus}
              flows={tourFlows}
              flowId={viewer.tour.flowId}
              status={viewer.tour.status}
              step={viewer.tour.step}
              onSelectFlow={viewer.actions.selectFlow}
              onTogglePlayback={togglePlayback}
              onPrevious={previousStep}
              onNext={nextStep}
              onRestart={restartTour}
              onJump={jumpToStep}
              onHighlight={viewer.actions.highlight}
            />,
            targets.tour,
          ),
    [
      changeExploreMode,
      exploreMode,
      jumpToStep,
      layers,
      nextStep,
      previousStep,
      restartTour,
      targets.tour,
      togglePlayback,
      tourFlows,
      viewer.actions.highlight,
      viewer.actions.selectFlow,
      viewer.actions.toggleFocus,
      viewer.focus.layerId,
      viewer.tour.flowId,
      viewer.tour.status,
      viewer.tour.step,
    ],
  );

  return (
    <>
      <div
        ref={rootRef}
        data-site-workbench-slot=""
        data-site-live=""
        data-site-live-state={liveState}
        className={LIVE_CLASS}
        inert={liveState !== 'revealed'}
      >
        {liveViewer}
      </div>
      {dockPortal}
      {tourPortal}
    </>
  );
}
