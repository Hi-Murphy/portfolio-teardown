'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { parseProject, parseTechRegistry } from 'xploder';
import { projectAJson, projectBJson, projectCJson, techRegistryJson } from 'xploder/fixtures';
import { TeardownViewer, useTeardownViewer, type ViewerStats } from 'xploder/react';

import { ThemeToggle } from '../../theme-toggle';

type FixtureId = 'a' | 'b' | 'c';

const BUTTON_BASE =
  'inline-flex min-h-11 items-center justify-center rounded border border-line px-3 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent';
const BUTTON_IDLE =
  'bg-bg text-fg hover:bg-fg/10 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-bg';
const BUTTON_SELECTED = 'bg-fg text-bg';
const PLAYGROUND_LAYOUT_OPTIONS = { explodedGap: 2 } as const;

function updateFixtureUrl(fixture: FixtureId): void {
  const url = new URL(window.location.href);
  url.searchParams.set('fixture', fixture);
  window.history.replaceState(window.history.state, '', url);
}

export function EnginePlayground() {
  const [query] = useState(() => new URLSearchParams(window.location.search));
  const [fixture, setFixture] = useState<FixtureId>(() => {
    const value = query.get('fixture');
    return value === 'b' || value === 'c' ? value : 'a';
  });
  const [initialTarget] = useState<'exploded' | undefined>(() =>
    query.get('state') === 'exploded' ? 'exploded' : undefined,
  );
  const [cycle] = useState(() => query.get('cycle') === '1');
  const [loop] = useState(() => query.get('loop') === '1');
  const registry = useMemo(() => parseTechRegistry(techRegistryJson), []);
  const projects = useMemo(
    () => ({
      a: parseProject(projectAJson, { registry }),
      b: parseProject(projectBJson, { registry }),
      c: parseProject(projectCJson, { registry }),
    }),
    [registry],
  );
  const project = projects[fixture];
  const viewer = useTeardownViewer({ initial: initialTarget, project });
  const drawCallsRef = useRef<HTMLElement>(null);
  const trianglesRef = useRef<HTMLElement>(null);
  const frameRef = useRef<HTMLElement>(null);
  const instancesRef = useRef<HTMLElement>(null);
  const queryAppliedRef = useRef(false);

  const onStats = useCallback((stats: ViewerStats) => {
    const drawCalls = drawCallsRef.current;
    const triangles = trianglesRef.current;
    const frame = frameRef.current;
    const instances = instancesRef.current;

    if (drawCalls !== null) {
      const value = String(stats.drawCalls);
      drawCalls.textContent = value;
      drawCalls.dataset.engineDrawCalls = value;
    }

    if (triangles !== null) {
      const value = String(stats.triangles);
      triangles.textContent = value;
      triangles.dataset.engineTriangles = value;
    }

    if (frame !== null) {
      const value = String(stats.frame);
      frame.textContent = value;
      frame.dataset.engineFrame = value;
    }

    if (instances !== null) {
      instances.textContent = `${stats.instances.layers} layers · ${stats.instances.components} components`;
      instances.dataset.engineInstances = `${stats.instances.layers}/${stats.instances.components}`;
    }
  }, []);

  const onSettled = useCallback(() => {
    if (cycle) viewer.actions.toggle();
  }, [cycle, viewer.actions]);

  const selectFixture = useCallback((next: FixtureId) => {
    setFixture(next);
    updateFixtureUrl(next);
  }, []);

  useEffect(() => {
    if (queryAppliedRef.current) return;

    queryAppliedRef.current = true;
    const highlightId = query.get('highlight');
    const focusId = query.get('focus');
    const flowId = query.get('flow');
    const tour = query.get('tour');

    if (highlightId !== null) viewer.actions.highlight(highlightId);
    if (focusId !== null) viewer.actions.toggleFocus(focusId);
    if (flowId !== null) viewer.actions.selectFlow(flowId);

    if (tour === 'play') {
      viewer.actions.play();
    } else if (tour === 'paused') {
      const step = Number(query.get('step') ?? 0);
      const lastStep = Number.isSafeInteger(step) && step >= 0 ? step : 0;

      for (let index = 0; index <= lastStep; index += 1) viewer.actions.step();
    }
  }, [query, viewer.actions]);

  useEffect(() => {
    if (loop && viewer.tour.status === 'ended') viewer.actions.play();
  }, [loop, viewer.actions, viewer.tour.status]);

  const azimuth = viewer.azimuthDegrees;

  return (
    <div className="flex flex-col gap-4">
      <TeardownViewer
        project={project}
        viewer={viewer}
        layoutOptions={PLAYGROUND_LAYOUT_OPTIONS}
        onStats={onStats}
        onSettled={onSettled}
        className="h-[60dvh] w-full rounded border border-line"
        aria-label={`${project.meta.name} architecture view`}
      />
      <section
        aria-label="Engine playground controls"
        className="flex flex-wrap items-center gap-2 rounded border border-line bg-surface p-3 sm:p-4"
      >
        <button
          type="button"
          data-engine-control="fixture-a"
          aria-pressed={fixture === 'a'}
          className={`${BUTTON_BASE} ${fixture === 'a' ? BUTTON_SELECTED : BUTTON_IDLE}`}
          onClick={() => selectFixture('a')}
        >
          Fixture A
        </button>
        <button
          type="button"
          data-engine-control="fixture-b"
          aria-pressed={fixture === 'b'}
          className={`${BUTTON_BASE} ${fixture === 'b' ? BUTTON_SELECTED : BUTTON_IDLE}`}
          onClick={() => selectFixture('b')}
        >
          Fixture B
        </button>
        <button
          type="button"
          data-engine-control="fixture-c"
          aria-pressed={fixture === 'c'}
          className={`${BUTTON_BASE} ${fixture === 'c' ? BUTTON_SELECTED : BUTTON_IDLE}`}
          onClick={() => selectFixture('c')}
        >
          Fixture C
        </button>
        <button
          type="button"
          data-engine-control="toggle"
          className={`${BUTTON_BASE} ${BUTTON_IDLE}`}
          onClick={viewer.actions.toggle}
        >
          {viewer.target === 'imploded' ? 'Explode' : 'Implode'}
        </button>
        <button
          type="button"
          data-engine-control="rotate-left"
          className={`${BUTTON_BASE} ${BUTTON_IDLE}`}
          onClick={viewer.actions.rotateLeft}
        >
          Rotate left
        </button>
        <button
          type="button"
          data-engine-control="rotate-right"
          className={`${BUTTON_BASE} ${BUTTON_IDLE}`}
          onClick={viewer.actions.rotateRight}
        >
          Rotate right
        </button>
        <button
          type="button"
          data-engine-control="zoom-out"
          disabled={!viewer.can.zoomOut}
          className={`${BUTTON_BASE} ${BUTTON_IDLE}`}
          onClick={viewer.actions.zoomOut}
        >
          Zoom out
        </button>
        <button
          type="button"
          data-engine-control="zoom-reset"
          disabled={!viewer.can.zoomReset}
          className={`${BUTTON_BASE} ${BUTTON_IDLE}`}
          onClick={viewer.actions.zoomReset}
        >
          Reset zoom
        </button>
        <button
          type="button"
          data-engine-control="zoom-in"
          disabled={!viewer.can.zoomIn}
          className={`${BUTTON_BASE} ${BUTTON_IDLE}`}
          onClick={viewer.actions.zoomIn}
        >
          Zoom in
        </button>
        <div className="ml-auto">
          <ThemeToggle />
        </div>
      </section>

      <section
        aria-label="Layer focus controls"
        className="flex flex-wrap items-center gap-2 rounded border border-line bg-surface p-3 sm:p-4"
      >
        <span className="mr-1 font-mono text-[0.6875rem] uppercase tracking-[0.14em] text-muted">
          Focus
        </span>
        {project.layers.map((layer) => (
          <button
            key={layer.id}
            type="button"
            data-engine-control={`focus-${layer.id}`}
            aria-pressed={viewer.focus.layerId === layer.id}
            disabled={viewer.focus.suspended}
            className={`${BUTTON_BASE} ${viewer.focus.layerId === layer.id ? BUTTON_SELECTED : BUTTON_IDLE}`}
            onClick={() => viewer.actions.toggleFocus(layer.id)}
          >
            {layer.name ?? layer.id}
          </button>
        ))}
      </section>

      {viewer.tour.flows.length === 0 ? null : (
        <section
          aria-label="Tour controls"
          className="flex flex-wrap items-center gap-2 rounded border border-line bg-surface p-3 sm:p-4"
        >
          {viewer.tour.showFlowSelector ? (
            <div role="group" aria-label="Tour flow" className="flex flex-wrap gap-2">
              {viewer.tour.flows.map((flow) => (
                <button
                  key={flow.id}
                  type="button"
                  data-engine-control={`flow-${flow.id}`}
                  aria-pressed={viewer.tour.flowId === flow.id}
                  className={`${BUTTON_BASE} ${viewer.tour.flowId === flow.id ? BUTTON_SELECTED : BUTTON_IDLE}`}
                  onClick={() => viewer.actions.selectFlow(flow.id)}
                >
                  {flow.label}
                </button>
              ))}
            </div>
          ) : null}
          <button
            type="button"
            data-engine-control="tour-play"
            aria-pressed={viewer.tour.status === 'playing'}
            className={`${BUTTON_BASE} ${BUTTON_IDLE} w-20`}
            onClick={viewer.tour.status === 'playing' ? viewer.actions.pause : viewer.actions.play}
          >
            {viewer.tour.status === 'playing' ? 'Pause' : 'Play'}
          </button>
          <button
            type="button"
            data-engine-control="tour-step"
            className={`${BUTTON_BASE} ${BUTTON_IDLE}`}
            onClick={viewer.actions.step}
          >
            Step
          </button>
          <button
            type="button"
            data-engine-control="tour-stop"
            className={`${BUTTON_BASE} ${BUTTON_IDLE}`}
            onClick={viewer.actions.stop}
          >
            Stop
          </button>
        </section>
      )}

      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 rounded border border-line bg-surface p-4 text-sm sm:grid-cols-4">
        <div>
          <dt className="font-mono text-[0.6875rem] uppercase tracking-[0.14em] text-muted">
            State
          </dt>
          <dd data-engine-target={viewer.target} className="mt-1 font-mono text-fg">
            {viewer.target}
          </dd>
        </div>
        <div>
          <dt className="font-mono text-[0.6875rem] uppercase tracking-[0.14em] text-muted">
            Azimuth
          </dt>
          <dd data-engine-azimuth={azimuth} className="mt-1 font-mono text-fg">
            {azimuth}°
          </dd>
        </div>
        <div>
          <dt className="font-mono text-[0.6875rem] uppercase tracking-[0.14em] text-muted">
            Zoom
          </dt>
          <dd data-engine-zoom={viewer.rig.zoomFactor} className="mt-1 font-mono text-fg">
            {viewer.rig.zoomFactor.toFixed(2)}×
          </dd>
        </div>
        <div>
          <dt className="font-mono text-[0.6875rem] uppercase tracking-[0.14em] text-muted">
            Instances
          </dt>
          <dd ref={instancesRef} data-engine-instances="" className="mt-1 font-mono text-fg" />
        </div>
        <div>
          <dt className="font-mono text-[0.6875rem] uppercase tracking-[0.14em] text-muted">
            Draw calls
          </dt>
          <dd ref={drawCallsRef} data-engine-draw-calls="" className="mt-1 font-mono text-fg" />
        </div>
        <div>
          <dt className="font-mono text-[0.6875rem] uppercase tracking-[0.14em] text-muted">
            Triangles
          </dt>
          <dd ref={trianglesRef} data-engine-triangles="" className="mt-1 font-mono text-fg" />
        </div>
        <div>
          <dt className="font-mono text-[0.6875rem] uppercase tracking-[0.14em] text-muted">
            Frame
          </dt>
          <dd ref={frameRef} data-engine-frame="" className="mt-1 font-mono text-fg" />
        </div>
        <div>
          <dt className="font-mono text-[0.6875rem] uppercase tracking-[0.14em] text-muted">
            Highlight
          </dt>
          <dd data-engine-highlight={viewer.highlight ?? ''} className="mt-1 font-mono text-fg">
            {viewer.highlight ?? '—'}
          </dd>
        </div>
        <div>
          <dt className="font-mono text-[0.6875rem] uppercase tracking-[0.14em] text-muted">
            Focus
          </dt>
          <dd data-engine-focus={viewer.focus.layerId ?? ''} className="mt-1 font-mono text-fg">
            {viewer.focus.layerId ?? '—'}
            {viewer.focus.suspended ? ' (suspended)' : ''}
          </dd>
        </div>
        <div>
          <dt className="font-mono text-[0.6875rem] uppercase tracking-[0.14em] text-muted">
            Tour
          </dt>
          <dd data-engine-tour={viewer.tour.status} className="mt-1 font-mono text-fg">
            {viewer.tour.status}
            {viewer.tour.step >= 0 ? ` · ${viewer.tour.step + 1}/${viewer.tour.total}` : ''}
          </dd>
        </div>
      </dl>
    </div>
  );
}
