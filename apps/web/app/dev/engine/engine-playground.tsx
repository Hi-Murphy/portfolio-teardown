'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import { parseProject, parseTechRegistry } from 'xploder';
import { projectAJson, projectBJson, techRegistryJson } from 'xploder/fixtures';
import { TeardownViewer, useTeardownViewer, type ViewerStats } from 'xploder/react';

import { ThemeToggle } from '../../theme-toggle';

type FixtureId = 'a' | 'b';

const BUTTON_BASE =
  'inline-flex min-h-11 items-center justify-center rounded border border-line px-3 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent';
const BUTTON_IDLE = 'bg-bg text-fg hover:bg-fg/10';
const BUTTON_SELECTED = 'bg-fg text-bg';

function updateFixtureUrl(fixture: FixtureId): void {
  const url = new URL(window.location.href);
  url.searchParams.set('fixture', fixture);
  window.history.replaceState(window.history.state, '', url);
}

export function EnginePlayground() {
  const [fixture, setFixture] = useState<FixtureId>(() => {
    const value = new URLSearchParams(window.location.search).get('fixture');
    return value === 'b' ? 'b' : 'a';
  });
  const [initialTarget] = useState<'exploded' | undefined>(() =>
    new URLSearchParams(window.location.search).get('state') === 'exploded'
      ? 'exploded'
      : undefined,
  );
  const [cycle] = useState(() => new URLSearchParams(window.location.search).get('cycle') === '1');
  const viewer = useTeardownViewer(
    initialTarget === undefined ? undefined : { initial: initialTarget },
  );
  const registry = useMemo(() => parseTechRegistry(techRegistryJson), []);
  const projects = useMemo(
    () => ({
      a: parseProject(projectAJson, { registry }),
      b: parseProject(projectBJson, { registry }),
    }),
    [registry],
  );
  const project = projects[fixture];
  const drawCallsRef = useRef<HTMLElement>(null);
  const trianglesRef = useRef<HTMLElement>(null);
  const frameRef = useRef<HTMLElement>(null);
  const instancesRef = useRef<HTMLElement>(null);

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

  const azimuth = viewer.azimuthDegrees;

  return (
    <div className="flex flex-col gap-4">
      <TeardownViewer
        project={project}
        viewer={viewer}
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
          className={`${BUTTON_BASE} ${BUTTON_IDLE}`}
          onClick={viewer.actions.zoomOut}
        >
          Zoom out
        </button>
        <button
          type="button"
          data-engine-control="zoom-reset"
          className={`${BUTTON_BASE} ${BUTTON_IDLE}`}
          onClick={viewer.actions.zoomReset}
        >
          Reset zoom
        </button>
        <button
          type="button"
          data-engine-control="zoom-in"
          className={`${BUTTON_BASE} ${BUTTON_IDLE}`}
          onClick={viewer.actions.zoomIn}
        >
          Zoom in
        </button>
        <div className="ml-auto">
          <ThemeToggle />
        </div>
      </section>

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
      </dl>
    </div>
  );
}
