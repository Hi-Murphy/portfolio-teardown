'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { getProject } from '../../content/projects';
import { SITE_REGISTRY } from '../../content/tech-registry';
import { LIVE_CLASS } from '../hero/hero-classes';
import { ProjectOutline } from '../project-outline';
import { LiveViewer, useLiveViewer, useViewerPanels } from '../viewer/live-viewer';

const BUTTON_BASE =
  'inline-flex min-h-11 shrink-0 items-center justify-center rounded border border-line px-3 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent';
const BUTTON_IDLE =
  'bg-bg text-fg hover:bg-fg/10 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-bg';
const BUTTON_SELECTED = 'bg-fg text-bg';
const TOOLBAR_CLASS = 'flex h-full min-w-0 flex-nowrap items-center gap-2 overflow-x-auto px-2';
const FLOW_GROUP_CLASS = 'flex shrink-0 items-center gap-2';

type LiveViewerHandle = ReturnType<typeof useLiveViewer>;
type PanelsHandle = ReturnType<typeof useViewerPanels>;

function findToolbarTarget(): HTMLElement | null {
  return typeof document === 'undefined'
    ? null
    : document.querySelector<HTMLElement>('[data-site-toolbar]');
}

interface ToolbarProps {
  readonly viewer: LiveViewerHandle;
  readonly panels: PanelsHandle;
}

function Toolbar({ viewer, panels }: ToolbarProps) {
  const caseStudyOpen = panels.state.kind === 'caseStudy';

  const step = () => {
    if (viewer.tour.status === 'idle' || viewer.tour.status === 'ended') {
      viewer.actions.play();
    }

    viewer.actions.step();
  };

  return (
    <div data-site-controls="" className={TOOLBAR_CLASS}>
      <button
        type="button"
        data-site-control="toggle"
        className={`${BUTTON_BASE} ${BUTTON_IDLE}`}
        onClick={viewer.target === 'imploded' ? viewer.actions.explode : viewer.actions.implode}
      >
        {viewer.target === 'imploded' ? 'Explode' : 'Implode'}
      </button>
      <button
        type="button"
        data-site-control="rotate-left"
        className={`${BUTTON_BASE} ${BUTTON_IDLE}`}
        onClick={viewer.actions.rotateLeft}
      >
        Rotate left
      </button>
      <button
        type="button"
        data-site-control="rotate-right"
        className={`${BUTTON_BASE} ${BUTTON_IDLE}`}
        onClick={viewer.actions.rotateRight}
      >
        Rotate right
      </button>
      <button
        type="button"
        data-site-control="zoom-out"
        disabled={!viewer.can.zoomOut}
        className={`${BUTTON_BASE} ${BUTTON_IDLE}`}
        onClick={viewer.actions.zoomOut}
      >
        Zoom out
      </button>
      <button
        type="button"
        data-site-control="zoom-reset"
        disabled={!viewer.can.zoomReset}
        className={`${BUTTON_BASE} ${BUTTON_IDLE}`}
        onClick={viewer.actions.zoomReset}
      >
        Reset zoom
      </button>
      <button
        type="button"
        data-site-control="zoom-in"
        disabled={!viewer.can.zoomIn}
        className={`${BUTTON_BASE} ${BUTTON_IDLE}`}
        onClick={viewer.actions.zoomIn}
      >
        Zoom in
      </button>
      <button
        type="button"
        data-site-control="case-study"
        aria-expanded={caseStudyOpen}
        aria-controls={panels.ids.caseStudy}
        className={`${BUTTON_BASE} ${caseStudyOpen ? BUTTON_SELECTED : BUTTON_IDLE}`}
        onClick={panels.actions.toggleCaseStudy}
      >
        Case study
      </button>
      {viewer.tour.showFlowSelector ? (
        <div role="group" aria-label="Tour flow" className={FLOW_GROUP_CLASS}>
          {viewer.tour.flows.map((flow) => (
            <button
              key={flow.id}
              type="button"
              data-site-control={`flow-${flow.id}`}
              aria-pressed={viewer.tour.flowId === flow.id}
              className={`${BUTTON_BASE} ${
                viewer.tour.flowId === flow.id ? BUTTON_SELECTED : BUTTON_IDLE
              }`}
              onClick={() => viewer.actions.selectFlow(flow.id)}
            >
              {flow.label}
            </button>
          ))}
        </div>
      ) : null}
      <button
        type="button"
        data-site-control="tour-play"
        aria-pressed={viewer.tour.status === 'playing'}
        disabled={viewer.tour.flows.length === 0}
        className={`${BUTTON_BASE} ${BUTTON_IDLE}`}
        onClick={viewer.tour.status === 'playing' ? viewer.actions.pause : viewer.actions.play}
      >
        {viewer.tour.status === 'playing' ? 'Pause' : 'Play'}
      </button>
      <button
        type="button"
        data-site-control="tour-step"
        disabled={viewer.tour.flows.length === 0}
        className={`${BUTTON_BASE} ${BUTTON_IDLE}`}
        onClick={step}
      >
        Step
      </button>
      <button
        type="button"
        data-site-control="tour-stop"
        disabled={viewer.tour.status === 'idle'}
        className={`${BUTTON_BASE} ${BUTTON_IDLE}`}
        onClick={viewer.actions.stop}
      >
        Stop
      </button>
    </div>
  );
}

export function WorkbenchClient({ slug }: { readonly slug: string }) {
  const project = getProject(slug);

  if (project === undefined) {
    throw new Error(`Unknown project slug "${slug}".`);
  }

  const viewer = useLiveViewer({ initial: 'exploded', project });
  const panels = useViewerPanels();
  const liveRef = useRef<HTMLDivElement>(null);
  const [liveState, setLiveState] = useState<'loading' | 'revealed'>('loading');
  const [toolbarTarget] = useState(findToolbarTarget);
  const reveal = useCallback(() => setLiveState('revealed'), []);

  useEffect(() => {
    if (liveRef.current?.querySelector('[data-xploder-webgl="unavailable"]') === null) return;

    const frame = window.requestAnimationFrame(() => setLiveState('revealed'));

    return () => window.cancelAnimationFrame(frame);
  }, []);

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
      {toolbarTarget === null
        ? null
        : createPortal(<Toolbar viewer={viewer} panels={panels} />, toolbarTarget)}
    </>
  );
}
