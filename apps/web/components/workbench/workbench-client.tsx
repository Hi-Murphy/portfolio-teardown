'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { getProject } from '../../content/projects';
import { SITE_REGISTRY } from '../../content/tech-registry';
import { LIVE_CLASS } from '../hero/hero-classes';
import { ProjectOutline } from '../project-outline';
import { LiveViewer, useLiveViewer, useViewerPanels } from '../viewer/live-viewer';
import { buildTourFlows, jumpSequence } from './tour-model';
import { TourPanel } from './tour-panel';
import { WorkbenchDock } from './workbench-dock';

interface PortalTargets {
  readonly dock: HTMLElement | null;
  readonly tour: HTMLElement | null;
}

function findPortalTargets(): PortalTargets {
  if (typeof document === 'undefined') return { dock: null, tour: null };

  return {
    dock: document.querySelector<HTMLElement>('[data-site-dock]'),
    tour: document.querySelector<HTMLElement>('[data-site-tour]'),
  };
}

export function WorkbenchClient({ slug }: { readonly slug: string }) {
  const project = getProject(slug);

  if (project === undefined) {
    throw new Error(`Unknown project slug "${slug}".`);
  }

  const viewer = useLiveViewer({ initial: 'exploded', project });
  const panels = useViewerPanels();
  const tourFlows = useMemo(() => buildTourFlows(project), [project]);
  const liveRef = useRef<HTMLDivElement>(null);
  const [liveState, setLiveState] = useState<'loading' | 'revealed'>('loading');
  const [portalTargets] = useState(findPortalTargets);
  const reveal = useCallback(() => setLiveState('revealed'), []);

  useEffect(() => {
    if (liveRef.current?.querySelector('[data-xploder-webgl="unavailable"]') === null) return;

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
    if (viewer.target === 'imploded') {
      viewer.actions.explode();
      return;
    }

    if (viewer.tour.status === 'playing') viewer.actions.pause();
    viewer.actions.implode();
  }, [viewer.actions, viewer.target, viewer.tour.status]);

  return (
    <>
      <div
        ref={liveRef}
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
      {portalTargets.dock === null
        ? null
        : createPortal(
            <WorkbenchDock
              target={viewer.target}
              can={viewer.can}
              caseStudyOpen={panels.state.kind === 'caseStudy'}
              caseStudyControlsId={panels.ids.caseStudy}
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
      {portalTargets.tour === null
        ? null
        : createPortal(
            <TourPanel
              flows={tourFlows}
              flowId={viewer.tour.flowId}
              status={viewer.tour.status}
              step={viewer.tour.step}
              onSelectFlow={viewer.actions.selectFlow}
              onTogglePlayback={togglePlayback}
              onPrevious={previousStep}
              onNext={nextStep}
              onRestart={restartTour}
              onExit={viewer.actions.stop}
              onJump={jumpToStep}
              onHighlight={viewer.actions.highlight}
            />,
            portalTargets.tour,
          )}
    </>
  );
}
