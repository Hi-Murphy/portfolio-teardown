// @vitest-environment jsdom

import { act, useEffect } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeAll, beforeEach, expect, test, vi } from 'vitest';
import { parseProject } from 'xploder';
import { projectAJson } from 'xploder/fixtures';
import { TeardownViewer, useTeardownViewer, type TeardownViewerHandle } from 'xploder/react';

const STEP_ONE =
  'Live update · Step 1 of 6. Beachgoer. A person checking the next high tide.. A new tide reading travels from the public feed to the chart.';
const STEP_TWO =
  'Live update · Step 2 of 6. Tide Chart Screen. The main chart and its live-or-saved state.';
const JSDOM_CANVAS_UNAVAILABLE = 'jsdom canvas context is unavailable';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const project = parseProject(projectAJson);

const viewerRef: { current: TeardownViewerHandle | null } = { current: null };
let root: Root | null = null;
let container: HTMLDivElement | null = null;

function ViewerHarness() {
  const current = useTeardownViewer({ project, now: () => 0 });

  useEffect(() => {
    viewerRef.current = current;
  }, [current]);

  return <TeardownViewer project={project} viewer={current} />;
}

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
    throw new Error(JSDOM_CANVAS_UNAVAILABLE);
  });
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => root?.unmount());
  root = null;
  container?.remove();
  container = null;
  viewerRef.current = null;
  vi.restoreAllMocks();
});

function currentViewer(): TeardownViewerHandle {
  if (viewerRef.current === null) throw new Error('viewer handle was not captured');

  return viewerRef.current;
}

function region(): HTMLElement {
  if (container === null) throw new Error('test container was not mounted');

  return container.querySelector<HTMLElement>('[data-xploder-live]') as HTMLElement;
}

test('keeps one live region mounted and announces tour steps on the same node', async () => {
  await act(async () => root?.render(<ViewerHarness />));

  if (container === null) throw new Error('test container was not mounted');

  const wrapper = container.firstElementChild;
  const live = region();

  expect(wrapper?.getAttribute('data-xploder-webgl')).toBe('unavailable');
  expect(container.querySelectorAll('[aria-live="polite"]')).toHaveLength(1);
  expect(live.getAttribute('aria-live')).toBe('polite');
  expect(live).toBe(container.querySelector('[data-xploder-live]'));
  expect(live.textContent).toBe('');
  expect(container.querySelector('[data-xploder-caption-live]')).toBeNull();

  await act(async () => currentViewer().actions.play());

  expect(region()).toBe(live);
  expect(live.textContent).toBe(STEP_ONE);

  await act(async () => currentViewer().actions.step());

  expect(region()).toBe(live);
  expect(live.textContent).toBe(STEP_TWO);
  expect(container.querySelector('[data-xploder-caption-live]')).toBeNull();
});
