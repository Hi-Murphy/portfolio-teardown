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

interface PortalTargets {
  readonly dock: HTMLElement;
  readonly tour: HTMLElement;
}

export function WorkbenchClient({ slug }: { readonly slug: string }) {
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
  const [portalTargets, setPortalTargets] = useState<PortalTargets | null>(null);
  const [exploreMode, setExploreMode] = useState<ExploreMode>('layers');
  const reveal = useCallback(() => setLiveState('revealed'), []);

  useLayoutEffect(() => {
    let frame: number | undefined;

    const resolveTargets = () => {
      const root = rootRef.current?.closest<HTMLElement>('[data-site-workbench]');
      const dock = root?.querySelector<HTMLElement>('[data-site-dock]') ?? null;
      const tour = root?.querySelector<HTMLElement>('[data-site-tour]') ?? null;

      if (dock !== null && tour !== null) {
        tour.setAttribute('data-site-explore-live', '');
        setPortalTargets({ dock, tour });
        return;
      }

      frame = window.requestAnimationFrame(resolveTargets);
    };

    resolveTargets();

    return () => {
      if (frame !== undefined) window.cancelAnimationFrame(frame);
    };
  }, []);

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
          aria-label={`${project.meta.name} architecture view`}
        />
      </div>
      {portalTargets === null ? null : (
        <>
          {createPortal(
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
            portalTargets.dock,
          )}
          {createPortal(
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
            portalTargets.tour,
          )}
        </>
      )}
    </>
  );
}
