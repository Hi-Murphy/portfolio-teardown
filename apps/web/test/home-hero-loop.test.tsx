// @vitest-environment jsdom

import type { Project } from 'xploder';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { createHeroLoop, HERO_LOOP_STEP_MS } from '../components/hero/hero-loop';

const { bootHeroStage, liveViewerProps, viewerActions } = vi.hoisted(() => ({
  bootHeroStage: vi.fn(),
  liveViewerProps: [] as { onFirstFrame?: () => void }[],
  viewerActions: {
    explode: vi.fn(),
    implode: vi.fn(),
    rotateRight: vi.fn(),
  },
}));

vi.mock('../components/hero/hero-boot', () => ({ bootHeroStage }));
vi.mock('../components/viewer/live-viewer', () => ({
  useLiveViewer: () => ({ actions: viewerActions }),
  LiveViewer: (props: { onFirstFrame?: () => void }) => {
    liveViewerProps.push(props);
    return null;
  },
}));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

type HeroLiveComponent = (typeof import('../components/hero/hero-live'))['HeroLive'];

const LABELS = { pause: 'Pause animation test', play: 'Play animation test' };

let HeroLive: HeroLiveComponent;
let root: Root | null = null;
let container: HTMLDivElement | null = null;
let reduced = false;
let motionListeners = new Set<() => void>();
let intersectionCallback: IntersectionObserverCallback | null = null;
let readyStateDescriptor: PropertyDescriptor | undefined;
let visibilityDescriptor: PropertyDescriptor | undefined;
let connectionDescriptor: PropertyDescriptor | undefined;
let idleDescriptor: PropertyDescriptor | undefined;
let cancelIdleDescriptor: PropertyDescriptor | undefined;

class TestIntersectionObserver {
  readonly root = null;
  readonly rootMargin = '0px';
  readonly thresholds = [0];

  constructor(callback: IntersectionObserverCallback) {
    intersectionCallback = callback;
  }

  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }
}

function setReduced(next: boolean): void {
  reduced = next;
  for (const listener of motionListeners) listener();
}

function setReadyState(value: DocumentReadyState): void {
  Object.defineProperty(document, 'readyState', { configurable: true, value });
}

function setSaveData(value: boolean): void {
  Object.defineProperty(navigator, 'connection', {
    configurable: true,
    value: { saveData: value },
  });
}

function setVisibility(value: DocumentVisibilityState): void {
  Object.defineProperty(document, 'visibilityState', { configurable: true, value });
  act(() => {
    document.dispatchEvent(new Event('visibilitychange'));
  });
}

function reportIntersection(isIntersecting: boolean): void {
  act(() => {
    intersectionCallback?.(
      [{ isIntersecting } as IntersectionObserverEntry],
      {} as IntersectionObserver,
    );
  });
}

async function flush(): Promise<void> {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
  });
}

async function renderHero(): Promise<void> {
  await act(async () => {
    root?.render(<HeroLive project={{} as Project} labels={LABELS} />);
  });
  await flush();
}

async function firstFrame(): Promise<void> {
  const props = liveViewerProps.at(-1);
  if (props === undefined) throw new Error('HeroStage did not render LiveViewer');

  await act(async () => {
    props.onFirstFrame?.();
  });
  await flush();
}

async function advanceStep(): Promise<void> {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(HERO_LOOP_STEP_MS);
  });
}

function heroLoop(): string | undefined {
  return container?.querySelector<HTMLElement>('[data-hero-loop]')?.dataset.heroLoop;
}

function loopButton(): HTMLButtonElement | null {
  return container?.querySelector<HTMLButtonElement>('button') ?? null;
}

async function clickLoopButton(): Promise<void> {
  const button = loopButton();
  if (button === null) throw new Error('loop button was not rendered');

  await act(async () => {
    button.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
  await flush();
}

beforeEach(async () => {
  vi.useFakeTimers();
  vi.stubGlobal('__XP_EAGER_HERO__', true);
  vi.stubGlobal('__XP_EAGER_3D__', false);
  reduced = false;
  motionListeners = new Set<() => void>();
  intersectionCallback = null;
  liveViewerProps.length = 0;
  viewerActions.explode.mockReset();
  viewerActions.implode.mockReset();
  viewerActions.rotateRight.mockReset();
  bootHeroStage.mockReset();

  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: (query: string) =>
      ({
        get matches() {
          return reduced;
        },
        media: query,
        onchange: null,
        addListener: () => undefined,
        removeListener: () => undefined,
        addEventListener: (type: string, listener: () => void) => {
          if (type === 'change') motionListeners.add(listener);
        },
        removeEventListener: (type: string, listener: () => void) => {
          if (type === 'change') motionListeners.delete(listener);
        },
        dispatchEvent: () => false,
      }) as unknown as MediaQueryList,
  });

  readyStateDescriptor = Object.getOwnPropertyDescriptor(document, 'readyState');
  visibilityDescriptor = Object.getOwnPropertyDescriptor(document, 'visibilityState');
  connectionDescriptor = Object.getOwnPropertyDescriptor(navigator, 'connection');
  idleDescriptor = Object.getOwnPropertyDescriptor(window, 'requestIdleCallback');
  cancelIdleDescriptor = Object.getOwnPropertyDescriptor(window, 'cancelIdleCallback');
  setReadyState('complete');
  Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' });
  setSaveData(false);
  Object.defineProperty(window, 'requestIdleCallback', {
    configurable: true,
    value: (callback: () => void) => {
      callback();
      return 1;
    },
  });
  Object.defineProperty(window, 'cancelIdleCallback', {
    configurable: true,
    value: () => undefined,
  });
  vi.stubGlobal('IntersectionObserver', TestIntersectionObserver);

  ({ HeroLive } = await import('../components/hero/hero-live'));
  const { HeroStage } = await import('../components/hero/hero-stage');
  bootHeroStage.mockImplementation(
    async (_signal: AbortSignal, mount: (stage: () => unknown) => void) => {
      mount(() => HeroStage);
    },
  );

  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => root?.unmount());
  root = null;
  container?.remove();
  container = null;
  vi.useRealTimers();

  if (readyStateDescriptor === undefined) Reflect.deleteProperty(document, 'readyState');
  else Object.defineProperty(document, 'readyState', readyStateDescriptor);

  if (visibilityDescriptor === undefined) Reflect.deleteProperty(document, 'visibilityState');
  else Object.defineProperty(document, 'visibilityState', visibilityDescriptor);

  if (connectionDescriptor === undefined) Reflect.deleteProperty(navigator, 'connection');
  else Object.defineProperty(navigator, 'connection', connectionDescriptor);

  if (idleDescriptor === undefined) Reflect.deleteProperty(window, 'requestIdleCallback');
  else Object.defineProperty(window, 'requestIdleCallback', idleDescriptor);

  if (cancelIdleDescriptor === undefined) Reflect.deleteProperty(window, 'cancelIdleCallback');
  else Object.defineProperty(window, 'cancelIdleCallback', cancelIdleDescriptor);

  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('createHeroLoop', () => {
  test('turns then implodes, turns then explodes, and repeats over three steps', () => {
    const actions = { explode: vi.fn(), implode: vi.fn(), rotateRight: vi.fn() };
    const loop = createHeroLoop({
      actions,
      schedule: (callback, delayMs) => window.setTimeout(callback, delayMs),
      cancel: (handle) => window.clearTimeout(handle as number),
    });

    expect(loop.state).toBe('paused');
    loop.start();
    expect(loop.state).toBe('running');
    expect(actions.rotateRight).not.toHaveBeenCalled();

    vi.advanceTimersByTime(HERO_LOOP_STEP_MS);
    expect(actions.rotateRight).toHaveBeenCalledTimes(1);
    expect(actions.implode).toHaveBeenCalledTimes(1);
    expect(actions.explode).not.toHaveBeenCalled();

    vi.advanceTimersByTime(HERO_LOOP_STEP_MS);
    expect(actions.rotateRight).toHaveBeenCalledTimes(2);
    expect(actions.implode).toHaveBeenCalledTimes(1);
    expect(actions.explode).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(HERO_LOOP_STEP_MS);
    expect(actions.rotateRight).toHaveBeenCalledTimes(3);
    expect(actions.implode).toHaveBeenCalledTimes(2);
    expect(actions.explode).toHaveBeenCalledTimes(1);
  });

  test('pause cancels the pending step and resume schedules a fresh full step', () => {
    const actions = { explode: vi.fn(), implode: vi.fn(), rotateRight: vi.fn() };
    const loop = createHeroLoop({
      actions,
      schedule: (callback, delayMs) => window.setTimeout(callback, delayMs),
      cancel: (handle) => window.clearTimeout(handle as number),
    });

    loop.start();
    vi.advanceTimersByTime(HERO_LOOP_STEP_MS / 2);
    loop.pause();
    expect(loop.state).toBe('paused');
    vi.advanceTimersByTime(HERO_LOOP_STEP_MS);
    expect(actions.rotateRight).not.toHaveBeenCalled();

    loop.resume();
    vi.advanceTimersByTime(HERO_LOOP_STEP_MS - 1);
    expect(actions.rotateRight).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(actions.rotateRight).toHaveBeenCalledTimes(1);
    expect(actions.implode).toHaveBeenCalledTimes(1);
  });
});

describe('hero loop stage', () => {
  test('renders no button before the first frame and runs the sequence afterwards', async () => {
    await renderHero();

    expect(heroLoop()).toBe('paused');
    expect(loopButton()).toBeNull();

    await firstFrame();

    expect(heroLoop()).toBe('running');
    const button = loopButton();
    expect(button).not.toBeNull();
    expect(button?.getAttribute('aria-label')).toBe(LABELS.pause);
    expect(button?.closest('[aria-hidden="true"]')).toBeNull();
    expect(button?.className).toContain('h-11');
    expect(button?.className).toContain('w-11');
    expect(viewerActions.rotateRight).not.toHaveBeenCalled();

    await advanceStep();
    expect(viewerActions.rotateRight).toHaveBeenCalledTimes(1);
    expect(viewerActions.implode).toHaveBeenCalledTimes(1);
    expect(viewerActions.explode).not.toHaveBeenCalled();

    await advanceStep();
    expect(viewerActions.rotateRight).toHaveBeenCalledTimes(2);
    expect(viewerActions.implode).toHaveBeenCalledTimes(1);
    expect(viewerActions.explode).toHaveBeenCalledTimes(1);

    await advanceStep();
    expect(viewerActions.rotateRight).toHaveBeenCalledTimes(3);
    expect(viewerActions.implode).toHaveBeenCalledTimes(2);
    expect(viewerActions.explode).toHaveBeenCalledTimes(1);
  });

  test('never mounts the stage or loop under reduced motion', async () => {
    setReduced(true);

    await renderHero();

    expect(bootHeroStage).not.toHaveBeenCalled();
    expect(container?.querySelector('[data-hero-loop]')).toBeNull();
    expect(loopButton()).toBeNull();
  });

  test('pauses when hidden or off-screen and resumes only when both are back', async () => {
    await renderHero();
    await firstFrame();

    setVisibility('hidden');
    expect(heroLoop()).toBe('paused');
    await advanceStep();
    expect(viewerActions.rotateRight).not.toHaveBeenCalled();

    setVisibility('visible');
    expect(heroLoop()).toBe('running');
    await advanceStep();
    expect(viewerActions.rotateRight).toHaveBeenCalledTimes(1);

    reportIntersection(false);
    expect(heroLoop()).toBe('paused');
    await advanceStep();
    expect(viewerActions.rotateRight).toHaveBeenCalledTimes(1);

    reportIntersection(true);
    expect(heroLoop()).toBe('running');
    await advanceStep();
    expect(viewerActions.rotateRight).toHaveBeenCalledTimes(2);
  });

  test('a user pause wins over automatic resumes and switches the label', async () => {
    await renderHero();
    await firstFrame();

    await clickLoopButton();
    expect(heroLoop()).toBe('paused');
    expect(loopButton()?.getAttribute('aria-label')).toBe(LABELS.play);

    setVisibility('hidden');
    setVisibility('visible');
    reportIntersection(false);
    reportIntersection(true);
    expect(heroLoop()).toBe('paused');
    await advanceStep();
    expect(viewerActions.rotateRight).not.toHaveBeenCalled();

    await clickLoopButton();
    expect(heroLoop()).toBe('running');
    expect(loopButton()?.getAttribute('aria-label')).toBe(LABELS.pause);
    await advanceStep();
    expect(viewerActions.rotateRight).toHaveBeenCalledTimes(1);
  });
});
