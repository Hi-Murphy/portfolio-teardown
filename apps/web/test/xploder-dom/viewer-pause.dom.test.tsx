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
let animationFrames: { readonly id: number; readonly callback: FrameRequestCallback }[] = [];
const originalGetAnimations = Object.getOwnPropertyDescriptor(
  HTMLElement.prototype,
  'getAnimations',
);

interface FakeAnimation {
  playState: AnimationPlayState;
  readonly pause: ReturnType<typeof vi.fn>;
  readonly play: ReturnType<typeof vi.fn>;
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
  animationFrames = [];
  if (originalGetAnimations === undefined) {
    Reflect.deleteProperty(HTMLElement.prototype, 'getAnimations');
  } else {
    Object.defineProperty(HTMLElement.prototype, 'getAnimations', originalGetAnimations);
  }
  vi.unstubAllGlobals();
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

function fakeAnimation(playState: AnimationPlayState = 'running'): FakeAnimation {
  const animation: FakeAnimation = {
    playState,
    pause: vi.fn(() => {
      animation.playState = 'paused';
    }),
    play: vi.fn(() => {
      animation.playState = 'running';
    }),
  };

  return animation;
}

function stubAnimations(animations: () => readonly FakeAnimation[]) {
  const getAnimations = vi.fn(() => animations() as unknown as Animation[]);

  Object.defineProperty(HTMLElement.prototype, 'getAnimations', {
    configurable: true,
    value: getAnimations,
    writable: true,
  });

  return getAnimations;
}

function stubAnimationFrames() {
  let nextId = 1;
  const request = vi.fn((callback: FrameRequestCallback) => {
    const id = nextId;
    nextId += 1;
    animationFrames.push({ id, callback });
    return id;
  });
  const cancel = vi.fn((id: number) => {
    animationFrames = animationFrames.filter((frame) => frame.id !== id);
  });

  vi.stubGlobal('requestAnimationFrame', request);
  vi.stubGlobal('cancelAnimationFrame', cancel);

  return { cancel, request };
}

function runAnimationFrames(): void {
  while (animationFrames.length > 0) {
    const frame = animationFrames.shift();
    if (frame === undefined) return;
    frame.callback(0);
  }
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

test('data-xploder-clock follows the viewer clock', async () => {
  const clock = createFakeClock();

  await mount(clock);
  expect(wrapper().dataset.xploderClock).toBe('running');

  await act(async () => capture().viewer.actions.pause());
  expect(wrapper().dataset.xploderClock).toBe('paused');

  await act(async () => capture().viewer.actions.resume());
  expect(wrapper().dataset.xploderClock).toBe('running');
});

test('pause stops every running animation and leaves finished animations alone', async () => {
  const clock = createFakeClock();
  const first = fakeAnimation();
  const second = fakeAnimation();
  const finished = fakeAnimation('finished');

  await mount(clock);
  const getAnimations = stubAnimations(() => [first, second, finished]);
  stubAnimationFrames();

  await act(async () => capture().viewer.actions.pause());

  expect(getAnimations).toHaveBeenCalledWith({ subtree: true });
  expect(first.pause).toHaveBeenCalledTimes(1);
  expect(second.pause).toHaveBeenCalledTimes(1);
  expect(finished.pause).not.toHaveBeenCalled();
  expect(first.playState).toBe('paused');
  expect(second.playState).toBe('paused');
  expect(finished.playState).toBe('finished');
});

test('the next frame catches an animation created after the pause', async () => {
  const clock = createFakeClock();
  const first = fakeAnimation();
  const late = fakeAnimation();
  const animations = [first];

  await mount(clock);
  stubAnimations(() => animations);
  const frames = stubAnimationFrames();

  await act(async () => capture().viewer.actions.pause());
  expect(first.pause).toHaveBeenCalledTimes(1);

  animations.push(late);
  runAnimationFrames();

  expect(frames.request).toHaveBeenCalledTimes(1);
  expect(late.pause).toHaveBeenCalledTimes(1);
  expect(late.playState).toBe('paused');
});

test('resume plays the held animations and cancels the queued sweep', async () => {
  const clock = createFakeClock();
  const first = fakeAnimation();
  const late = fakeAnimation();
  const animations = [first];

  await mount(clock);
  stubAnimations(() => animations);
  const frames = stubAnimationFrames();

  await act(async () => capture().viewer.actions.pause());
  animations.push(late);
  await act(async () => capture().viewer.actions.resume());

  expect(first.play).toHaveBeenCalledTimes(1);
  expect(first.playState).toBe('running');
  expect(wrapper().dataset.xploderClock).toBe('running');
  expect(frames.cancel).toHaveBeenCalledWith(frames.request.mock.results[0]?.value);

  runAnimationFrames();
  expect(late.pause).not.toHaveBeenCalled();
});

test('pause and resume do not throw without getAnimations', async () => {
  const clock = createFakeClock();

  await mount(clock);
  Reflect.deleteProperty(HTMLElement.prototype, 'getAnimations');

  await expect(act(async () => capture().viewer.actions.pause())).resolves.toBeUndefined();
  await expect(act(async () => capture().viewer.actions.resume())).resolves.toBeUndefined();
});
