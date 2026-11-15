// @vitest-environment jsdom

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeAll, beforeEach, expect, test, vi } from 'vitest';
import { parseProject } from 'xploder';
import { createFakeClock, projectAJson } from 'xploder/fixtures';
import { TeardownViewer, useTeardownViewer } from 'xploder/react';

vi.mock('../../../../packages/xploder/src/react/a11y/webgl', () => ({
  hasWebgl: () => true,
}));

vi.mock('@react-three/fiber', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@react-three/fiber')>();

  return { ...actual, Canvas: ({ children }: { children?: unknown }) => children };
});

const sceneCapture = vi.hoisted(() => ({ props: [] as Array<Record<string, unknown>> }));

vi.mock('../../../../packages/xploder/src/react/scene/Scene', () => ({
  Scene: (props: Record<string, unknown>) => {
    sceneCapture.props.push(props);
    return null;
  },
}));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const project = parseProject(projectAJson);

type ViewerClock = ReturnType<typeof createFakeClock>;

function ViewerHarness({ clock }: { readonly clock: ViewerClock }) {
  const viewer = useTeardownViewer({ project, clock });

  return <TeardownViewer project={project} viewer={viewer} />;
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
  sceneCapture.props.length = 0;
});

afterEach(async () => {
  await act(async () => root?.unmount());
  root = null;
  container?.remove();
  container = null;
  sceneCapture.props.length = 0;
  vi.restoreAllMocks();
});

test('Scene receives the viewer clock', async () => {
  const clock = createFakeClock();

  await act(async () => root?.render(<ViewerHarness clock={clock} />));

  expect(sceneCapture.props.length).toBeGreaterThan(0);
  expect(sceneCapture.props.at(-1)?.clock).toBe(clock);
});
