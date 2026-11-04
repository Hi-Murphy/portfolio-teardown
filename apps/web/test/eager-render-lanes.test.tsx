// @vitest-environment jsdom

import { act, Profiler } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  liveRenders: { count: 0 },
  dockRenders: { count: 0 },
  exploreRenders: { count: 0 },
  reveal: { current: null as (() => void) | null },
  onModeChange: { current: null as ((mode: 'layers' | 'flows') => void) | null },
  viewer: {
    target: 'exploded',
    can: { zoomIn: true, zoomOut: true, zoomReset: true },
    focus: { layerId: null, suspended: false },
    tour: {
      flows: [],
      flowId: null,
      status: 'idle',
      step: 0,
      total: 0,
      showFlowSelector: false,
    },
    actions: {
      explode: vi.fn(),
      implode: vi.fn(),
      rotateLeft: vi.fn(),
      rotateRight: vi.fn(),
      zoomIn: vi.fn(),
      zoomOut: vi.fn(),
      zoomReset: vi.fn(),
      highlight: vi.fn(),
      toggleFocus: vi.fn(),
      releaseFocus: vi.fn(),
      selectFlow: vi.fn(),
      play: vi.fn(),
      pause: vi.fn(),
      stop: vi.fn(),
      step: vi.fn(),
    },
  },
  panels: {
    state: { kind: 'closed' },
    actions: { toggleCaseStudy: vi.fn() },
    ids: { caseStudy: 'case-study-test', detail: 'detail-test' },
  },
}));

vi.mock('../components/viewer/live-viewer', () => ({
  LiveViewer: ({ onFirstFrame }: { readonly onFirstFrame?: () => void }) => {
    mocks.liveRenders.count += 1;
    mocks.reveal.current = onFirstFrame ?? null;
    return <div data-testid="live-viewer" />;
  },
  useLiveViewer: () => mocks.viewer,
  useViewerPanels: () => mocks.panels,
}));

vi.mock('../components/workbench/workbench-dock', () => ({
  WorkbenchDock: () => {
    mocks.dockRenders.count += 1;
    return <div data-testid="workbench-dock" />;
  },
}));

vi.mock('../components/workbench/explore-panel', () => ({
  ExplorePanel: ({
    mode,
    onModeChange,
  }: {
    readonly mode: 'layers' | 'flows';
    readonly onModeChange: (mode: 'layers' | 'flows') => void;
  }) => {
    mocks.exploreRenders.count += 1;
    mocks.onModeChange.current = onModeChange;
    return <div data-testid="explore-panel" data-mode={mode} />;
  },
}));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

type WorkbenchClientComponent =
  (typeof import('../components/workbench/workbench-client'))['WorkbenchClient'];

let WorkbenchClient: WorkbenchClientComponent;
let root: Root | null = null;
let container: HTMLDivElement | null = null;
let workbench: HTMLDivElement | null = null;
let tour: HTMLElement | null = null;
let commits = 0;

function required<T>(value: T | null): T {
  if (value === null) throw new Error('required element was not rendered');
  return value;
}

async function renderWorkbench(): Promise<void> {
  workbench = document.createElement('div');
  workbench.dataset.siteWorkbench = '';
  workbench.innerHTML = '<div data-site-dock=""></div><div data-site-tour=""></div>';
  document.body.append(workbench);
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
  tour = required(workbench.querySelector<HTMLElement>('[data-site-tour]'));

  const targets = {
    dock: required(workbench.querySelector<HTMLElement>('[data-site-dock]')),
    tour,
  };

  await act(async () => {
    root?.render(
      <Profiler
        id="workbench"
        onRender={() => {
          commits += 1;
        }}
      >
        <WorkbenchClient slug="websocket-inspector" targets={targets} />
      </Profiler>,
    );
  });
}

beforeEach(async () => {
  mocks.liveRenders.count = 0;
  mocks.dockRenders.count = 0;
  mocks.exploreRenders.count = 0;
  mocks.reveal.current = null;
  mocks.onModeChange.current = null;
  commits = 0;

  ({ WorkbenchClient } = await import('../components/workbench/workbench-client'));
});

afterEach(async () => {
  await act(async () => root?.unmount());
  root = null;
  container?.remove();
  container = null;
  workbench?.remove();
  workbench = null;
  tour = null;
});

describe('eager render lanes', () => {
  test('reveal and portals do not re-render the live tree', async () => {
    await renderWorkbench();

    expect(commits).toBe(1);
    expect(mocks.liveRenders.count).toBe(1);
    expect(mocks.dockRenders.count).toBe(1);
    expect(mocks.exploreRenders.count).toBe(1);
    expect(tour?.hasAttribute('data-site-explore-live')).toBe(true);

    await act(async () => mocks.reveal.current?.());

    expect(commits).toBe(2);
    expect(mocks.liveRenders.count).toBe(1);
    expect(mocks.dockRenders.count).toBe(1);
    expect(mocks.exploreRenders.count).toBe(1);
  });

  test('an explore interaction still re-renders the panel', async () => {
    await renderWorkbench();
    await act(async () => mocks.reveal.current?.());

    await act(async () => mocks.onModeChange.current?.('flows'));

    expect(mocks.exploreRenders.count).toBe(2);
    expect(tour?.querySelector('[data-testid="explore-panel"]')?.getAttribute('data-mode')).toBe(
      'flows',
    );
  });
});
