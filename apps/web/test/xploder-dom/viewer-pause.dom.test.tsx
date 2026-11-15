// @vitest-environment jsdom

import { act, useEffect } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeAll, beforeEach, expect, test, vi } from 'vitest';
import { parseProject } from 'xploder';
import { createFakeClock, projectAJson } from 'xploder/fixtures';
import {
  TeardownViewer,
  useTeardownViewer,
  useViewerPanels,
  type TeardownViewerHandle,
  type ViewerPanelsHandle,
} from 'xploder/react';
import { tourCommandActionsOf } from '../../../../packages/xploder/src/react/TeardownViewer';
import { panelsMetadataOf } from '../../../../packages/xploder/src/react/panel/useViewerPanels';

vi.mock('../../../../packages/xploder/src/react/a11y/webgl', () => ({
  hasWebgl: () => true,
}));

vi.mock('@react-three/fiber', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@react-three/fiber')>();

  return { ...actual, Canvas: () => null };
});

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const project = parseProject(projectAJson);

interface ViewerCapture {
  readonly viewer: TeardownViewerHandle;
  readonly panels: ViewerPanelsHandle;
}

const viewerCapture: { current: ViewerCapture | null } = { current: null };

function ViewerHarness({ clock }: { readonly clock: ReturnType<typeof createFakeClock> }) {
  const viewer = useTeardownViewer({ project, clock });
  const panels = useViewerPanels();

  useEffect(() => {
    viewerCapture.current = { viewer, panels };
  }, [panels, viewer]);

  return <TeardownViewer project={project} viewer={viewer} panels={panels} />;
}

let root: Root | null = null;
let container: HTMLDivElement | null = null;

beforeAll(() => {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => undefined,
      removeListener: () => undefined,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      dispatchEvent: () => false,
    }),
  });
});

beforeEach(() => {
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => {
    throw new Error('jsdom canvas context is unavailable');
  });
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
  viewerCapture.current = null;
});

afterEach(async () => {
  await act(async () => root?.unmount());
  root = null;
  container?.remove();
  container = null;
  viewerCapture.current = null;
  vi.restoreAllMocks();
});

function capture(): ViewerCapture {
  if (viewerCapture.current === null) throw new Error('viewer handles were not captured');
  return viewerCapture.current;
}

function wrapper(): HTMLElement {
  if (container === null) throw new Error('test container was not mounted');

  const element = container.querySelector<HTMLElement>('[data-xploder-webgl]');

  if (element === null) throw new Error('viewer wrapper was not rendered');
  return element;
}

async function mount(clock: ReturnType<typeof createFakeClock>): Promise<void> {
  await act(async () => root?.render(<ViewerHarness clock={clock} />));
}

async function panelDispatch(event: { type: 'openCaseStudy' }): Promise<void> {
  await act(async () => panelsMetadataOf(capture().panels).dispatch(event));
}

test('the tour command adapter maps pause to pauseTour', async () => {
  const clock = createFakeClock();

  await mount(clock);
  await act(async () => capture().viewer.actions.play());

  const actions = capture().viewer.actions;
  const tourActions = tourCommandActionsOf(actions);

  expect(tourActions.pause).toBe(actions.pauseTour);

  await act(async () => tourActions.pause());
  expect(capture().viewer.tour.status).toBe('paused');
  expect(capture().viewer.paused).toBe(false);
  expect(clock.paused).toBe(false);
});

test('opening the case study pauses the tour and leaves the clock running', async () => {
  const clock = createFakeClock();

  await mount(clock);
  await act(async () => capture().viewer.actions.play());

  await panelDispatch({ type: 'openCaseStudy' });

  expect(wrapper().dataset.xploderTour).toBe('paused');
  expect(clock.paused).toBe(false);
  expect(capture().viewer.paused).toBe(false);
});
