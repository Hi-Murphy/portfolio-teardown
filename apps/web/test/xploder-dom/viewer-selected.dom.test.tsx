// @vitest-environment jsdom

import { act, useEffect } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeAll, beforeEach, expect, test, vi } from 'vitest';
import { parseProject } from 'xploder';
import { projectAJson } from 'xploder/fixtures';
import {
  TeardownViewer,
  useTeardownViewer,
  useViewerPanels,
  type TeardownViewerHandle,
  type ViewerPanelsHandle,
} from 'xploder/react';
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
const A = 'tide-view-model';
const B = 'tide-repository';

interface ViewerCapture {
  readonly viewer: TeardownViewerHandle;
  readonly panels: ViewerPanelsHandle;
}

const viewerCapture: { current: ViewerCapture | null } = { current: null };

function ViewerHarness() {
  const viewer = useTeardownViewer({ project, now: () => 0 });
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

function proxy(id: string): HTMLButtonElement {
  if (container === null) throw new Error('test container was not mounted');

  const element = container.querySelector<HTMLButtonElement>(`[data-xploder-proxy="${id}"]`);

  if (element === null) throw new Error(`missing ${id} navigator proxy`);
  return element;
}

function viewed(): { highlight: string | null; selected: string | null } {
  return {
    highlight: wrapper().getAttribute('data-xploder-highlight'),
    selected: wrapper().getAttribute('data-xploder-selected'),
  };
}

async function mount(): Promise<void> {
  await act(async () => root?.render(<ViewerHarness />));
}

async function move(hit: string | null): Promise<void> {
  await act(async () => capture().viewer.onPointerInput({ type: 'move', hit }));
}

async function leave(): Promise<void> {
  await act(async () => capture().viewer.onPointerInput({ type: 'leave' }));
}

async function panelDispatch(
  event: { type: 'openDetail'; id: string } | { type: 'slab'; hit: string | null },
): Promise<void> {
  await act(async () => panelsMetadataOf(capture().panels).dispatch(event));
}

async function escape(): Promise<void> {
  await act(async () =>
    document.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }),
    ),
  );
}

test('open A plus hover B lights both', async () => {
  await mount();
  await panelDispatch({ type: 'openDetail', id: A });
  await move(B);

  expect(viewed()).toEqual({ highlight: B, selected: A });
});

test('leaving B while A is open keeps A selected', async () => {
  await mount();
  await panelDispatch({ type: 'openDetail', id: A });
  await move(B);

  await leave();
  expect(viewed()).toEqual({ highlight: null, selected: A });
});

test('closing A with the pointer elsewhere clears both', async () => {
  await mount();
  await panelDispatch({ type: 'openDetail', id: A });

  await escape();
  expect(viewed()).toEqual({ highlight: null, selected: null });
});

test('mouse hover survives closing A by slab toggle', async () => {
  await mount();
  await move(A);
  await panelDispatch({ type: 'slab', hit: A });

  await panelDispatch({ type: 'slab', hit: A });
  expect(viewed()).toEqual({ highlight: A, selected: null });
});

test('keyboard activation opens A and Escape returns focus with A highlighted', async () => {
  await mount();
  const opener = proxy(A);

  await act(async () => opener.focus());
  expect(viewed().highlight).toBe(A);

  await act(async () => opener.click());
  expect(viewed()).toEqual({ highlight: A, selected: A });
});

test('Escape returns focus to the A proxy and keeps A highlighted', async () => {
  await mount();
  const opener = proxy(A);

  await act(async () => opener.focus());
  await act(async () => opener.click());

  await escape();
  expect(document.activeElement).toBe(opener);
  expect(viewed()).toEqual({ highlight: A, selected: null });
});

test('opening A while it is hovered keeps the highlight immediately', async () => {
  await mount();
  await move(A);
  await panelDispatch({ type: 'slab', hit: A });

  expect(viewed().highlight).toBe(A);
});
