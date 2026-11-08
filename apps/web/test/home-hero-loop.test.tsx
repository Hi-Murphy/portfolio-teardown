// @vitest-environment jsdom

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { websocketInspector } from '../content/projects/websocket-inspector';
import { HeroCaption } from '../components/hero/hero-caption';
import {
  createHeroLoop,
  createHeroSequence,
  HERO_LOOP_STEP_MS,
  type HeroTourState,
} from '../components/hero/hero-loop';

const { bootHeroStage, liveViewerProps, viewerActions, viewerStore } = vi.hoisted(() => {
  const store = {
    version: 0,
    listeners: new Set<() => void>(),
    tour: {
      status: 'idle',
      flowId: null as string | null,
      step: -1,
      total: 0,
      flows: [] as { id: string; label: string }[],
    },
  };

  return {
    bootHeroStage: vi.fn(),
    liveViewerProps: [] as { onFirstFrame?: () => void }[],
    viewerStore: store,
    viewerActions: {
      explode: vi.fn(),
      implode: vi.fn(),
      rotateRight: vi.fn(),
      selectFlow: vi.fn(),
      play: vi.fn(),
      pause: vi.fn(),
      stop: vi.fn(),
    },
  };
});

vi.mock('../components/hero/hero-boot', () => ({ bootHeroStage }));
vi.mock('../components/viewer/live-viewer', async () => {
  const { useSyncExternalStore } = await import('react');
  const subscribe = (listener: () => void) => {
    viewerStore.listeners.add(listener);
    return () => viewerStore.listeners.delete(listener);
  };
  const snapshot = () => viewerStore.version;

  return {
    useLiveViewer: () => {
      useSyncExternalStore(subscribe, snapshot, snapshot);
      return { actions: viewerActions, tour: viewerStore.tour };
    },
    LiveViewer: (props: { onFirstFrame?: () => void }) => {
      liveViewerProps.push(props);
      return null;
    },
  };
});

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

type HeroLiveComponent = (typeof import('../components/hero/hero-live'))['HeroLive'];
type HeroShowcaseProviderComponent =
  (typeof import('../components/hero/hero-showcase'))['HeroShowcaseProvider'];

const LABELS = { pause: 'Pause animation test', play: 'Play animation test' };
const FLOW_A = 'fixture-capture';
const FLOW_B = 'fixture-inspect';

let HeroLive: HeroLiveComponent;
let HeroShowcaseProvider: HeroShowcaseProviderComponent;
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
const tourTotal = 7;

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

function notifyViewer(): void {
  viewerStore.version += 1;
  for (const listener of viewerStore.listeners) listener();
}

function setTour(next: Partial<typeof viewerStore.tour>): void {
  viewerStore.tour = { ...viewerStore.tour, ...next };
  notifyViewer();
}

function emitTour(next: Partial<typeof viewerStore.tour>): void {
  act(() => setTour(next));
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
    root?.render(
      <HeroShowcaseProvider>
        <HeroLive project={websocketInspector} />
        <HeroCaption
          name={websocketInspector.meta.name}
          tagline={websocketInspector.meta.tagline}
          labels={LABELS}
        />
      </HeroShowcaseProvider>,
    );
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
  await flush();
}

function heroLoop(): string | undefined {
  return container?.querySelector<HTMLElement>('[data-hero-loop]')?.dataset.heroLoop;
}

function loopButton(): HTMLButtonElement | null {
  return container?.querySelector<HTMLButtonElement>('[data-hero-loop-slot] button') ?? null;
}

function narration(): string | null {
  return (
    container?.querySelector<HTMLElement>('[data-hero-narration]')?.textContent?.trim() ?? null
  );
}

async function clickLoopButton(): Promise<void> {
  const button = loopButton();
  if (button === null) throw new Error('loop button was not rendered');

  await act(async () => {
    button.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
  await flush();
}

function expectedNarration(flowIndex: number, step: number): string {
  const flow = websocketInspector.flows?.[flowIndex];
  const componentId = flow?.path[step];
  const component = websocketInspector.layers
    .flatMap((layer) => layer.components)
    .find((candidate) => candidate.id === componentId);

  return `${flow?.label ?? ''} · ${step + 1}/${flow?.path.length ?? 0} · ${component?.name ?? ''} — ${component?.summary ?? ''}`;
}

function sequenceActions() {
  return {
    explode: vi.fn(),
    implode: vi.fn(),
    rotateRight: vi.fn(),
    selectFlow: vi.fn(),
    playTour: vi.fn(),
    pauseTour: vi.fn(),
    stopTour: vi.fn(),
  };
}

function tour(overrides: Partial<HeroTourState> = {}): HeroTourState {
  return {
    status: 'playing',
    flowId: FLOW_A,
    step: 0,
    total: 3,
    ...overrides,
  };
}

beforeEach(async () => {
  vi.useFakeTimers();
  vi.stubGlobal('__XP_EAGER_HERO__', true);
  vi.stubGlobal('__XP_EAGER_3D__', false);
  reduced = false;
  motionListeners = new Set<() => void>();
  intersectionCallback = null;
  liveViewerProps.length = 0;
  viewerStore.version = 0;
  viewerStore.listeners.clear();
  viewerStore.tour = { status: 'idle', flowId: null, step: -1, total: 0, flows: [] };
  for (const action of Object.values(viewerActions)) action.mockReset();
  bootHeroStage.mockReset();

  viewerActions.selectFlow.mockImplementation((flowId: string) => {
    setTour({ flowId, status: 'idle', step: -1, total: tourTotal });
  });
  viewerActions.play.mockImplementation(() => {
    setTour({
      status: 'playing',
      step: viewerStore.tour.step < 0 ? 0 : viewerStore.tour.step,
    });
  });
  viewerActions.pause.mockImplementation(() => setTour({ status: 'paused' }));
  viewerActions.stop.mockImplementation(() => setTour({ status: 'idle', step: -1 }));

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
  ({ HeroShowcaseProvider } = await import('../components/hero/hero-showcase'));
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

describe('createHeroSequence', () => {
  function controller() {
    const actions = sequenceActions();
    const sequence = createHeroSequence({
      actions,
      captureFlow: FLOW_A,
      inspectFlow: FLOW_B,
      schedule: (callback, delayMs) => window.setTimeout(callback, delayMs),
      cancel: (handle) => window.clearTimeout(handle as number),
    });
    return { actions, sequence };
  }

  test('runs capture, inspect, turn, and capture again', () => {
    const { actions, sequence } = controller();

    sequence.start();
    expect(actions.selectFlow).toHaveBeenLastCalledWith(FLOW_A);
    expect(actions.playTour).toHaveBeenCalledTimes(1);
    expect(sequence.state).toMatchObject({ phase: 'capture', status: 'running', started: true });

    sequence.updateTour(tour({ status: 'ended', step: 2 }));
    expect(actions.selectFlow).toHaveBeenLastCalledWith(FLOW_B);
    expect(actions.playTour).toHaveBeenCalledTimes(2);
    expect(sequence.state.phase).toBe('inspect');

    sequence.updateTour(tour({ status: 'ended', flowId: FLOW_B, step: 2 }));
    expect(actions.stopTour).toHaveBeenCalledTimes(1);
    expect(sequence.state).toMatchObject({ phase: 'turn', status: 'running' });

    vi.advanceTimersByTime(HERO_LOOP_STEP_MS);
    expect(actions.rotateRight).toHaveBeenCalledTimes(1);
    expect(actions.implode).toHaveBeenCalledTimes(1);
    expect(sequence.state.phase).toBe('turn');

    vi.advanceTimersByTime(HERO_LOOP_STEP_MS);
    expect(actions.rotateRight).toHaveBeenCalledTimes(2);
    expect(actions.explode).toHaveBeenCalledTimes(1);
    expect(actions.selectFlow).toHaveBeenLastCalledWith(FLOW_A);
    expect(sequence.state.phase).toBe('capture');
  });

  test('pause stops the tour and turn, and resume continues the current phase', () => {
    const { actions, sequence } = controller();

    sequence.start();
    sequence.updateTour(tour());
    sequence.pause();
    expect(actions.pauseTour).toHaveBeenCalledTimes(1);
    expect(sequence.state.status).toBe('paused');

    sequence.updateTour(tour({ status: 'paused' }));
    expect(sequence.state.status).toBe('paused');
    sequence.resume();
    expect(actions.playTour).toHaveBeenCalledTimes(2);
    expect(sequence.state.status).toBe('running');

    sequence.updateTour(tour({ status: 'ended', step: 2 }));
    sequence.updateTour(tour({ status: 'ended', flowId: FLOW_B, step: 2 }));
    expect(sequence.state.phase).toBe('turn');
    sequence.pause();
    vi.advanceTimersByTime(HERO_LOOP_STEP_MS);
    expect(actions.rotateRight).not.toHaveBeenCalled();
    sequence.resume();
    vi.advanceTimersByTime(HERO_LOOP_STEP_MS);
    expect(actions.rotateRight).toHaveBeenCalledTimes(1);
  });

  test('pauses a tour that starts after suspension and replays it on resume', () => {
    const { actions, sequence } = controller();

    sequence.start();
    sequence.pause();
    expect(actions.pauseTour).toHaveBeenCalledTimes(1);

    sequence.updateTour(tour());
    expect(actions.pauseTour).toHaveBeenCalledTimes(2);
    expect(sequence.state.status).toBe('paused');

    sequence.resume();
    expect(actions.playTour).toHaveBeenCalledTimes(2);
    expect(sequence.state.status).toBe('running');
  });
});

describe('hero stage sequence', () => {
  test('narrates capture and inspect, turns twice, then returns to capture', async () => {
    await renderHero();

    expect(heroLoop()).toBe('paused');
    expect(loopButton()).toBeNull();
    expect(container?.querySelector('[data-hero-loop-slot]')).not.toBeNull();

    await firstFrame();

    expect(viewerActions.selectFlow).toHaveBeenLastCalledWith('capture-path');
    expect(viewerActions.play).toHaveBeenCalledTimes(1);
    expect(heroLoop()).toBe('running');
    expect(narration()).toBe(expectedNarration(0, 0));

    const button = loopButton();
    expect(button?.getAttribute('aria-label')).toBe(LABELS.pause);
    expect(button?.closest('[aria-hidden="true"]')).toBeNull();
    expect(button?.parentElement?.className).toContain('h-11');
    expect(button?.parentElement?.className).toContain('w-11');

    emitTour({ flowId: 'capture-path', status: 'ended', step: tourTotal - 1 });
    expect(viewerActions.selectFlow).toHaveBeenLastCalledWith('inspect-path');
    expect(narration()).toBe(expectedNarration(1, 0));

    emitTour({ flowId: 'inspect-path', status: 'ended', step: tourTotal - 1 });
    expect(viewerActions.stop).toHaveBeenCalled();
    expect(narration()).toBeNull();
    expect(container?.querySelector('#hero-caption')?.textContent).toContain(
      websocketInspector.meta.name,
    );

    await advanceStep();
    expect(viewerActions.rotateRight).toHaveBeenCalledTimes(1);
    expect(viewerActions.implode).toHaveBeenCalledTimes(1);
    await advanceStep();
    expect(viewerActions.rotateRight).toHaveBeenCalledTimes(2);
    expect(viewerActions.explode).toHaveBeenCalledTimes(1);
    expect(viewerActions.selectFlow).toHaveBeenLastCalledWith('capture-path');
    expect(narration()).toBe(expectedNarration(0, 0));
  });

  test('pauses and resumes from the button, hidden tab, and off-screen observer', async () => {
    await renderHero();
    await firstFrame();

    await clickLoopButton();
    expect(viewerActions.pause).toHaveBeenCalledTimes(1);
    expect(heroLoop()).toBe('paused');
    expect(loopButton()?.getAttribute('aria-label')).toBe(LABELS.play);

    await clickLoopButton();
    expect(viewerActions.play).toHaveBeenCalledTimes(2);
    expect(heroLoop()).toBe('running');
    expect(loopButton()?.getAttribute('aria-label')).toBe(LABELS.pause);

    setVisibility('hidden');
    expect(viewerActions.pause).toHaveBeenCalledTimes(2);
    expect(heroLoop()).toBe('paused');
    setVisibility('visible');
    expect(viewerActions.play).toHaveBeenCalledTimes(3);
    expect(heroLoop()).toBe('running');

    reportIntersection(false);
    expect(viewerActions.pause).toHaveBeenCalledTimes(3);
    expect(heroLoop()).toBe('paused');
    reportIntersection(true);
    expect(viewerActions.play).toHaveBeenCalledTimes(4);
    expect(heroLoop()).toBe('running');
  });

  test('a user pause wins over automatic resumes', async () => {
    await renderHero();
    await firstFrame();

    await clickLoopButton();
    setVisibility('hidden');
    setVisibility('visible');
    reportIntersection(false);
    reportIntersection(true);
    expect(heroLoop()).toBe('paused');
    expect(loopButton()?.getAttribute('aria-label')).toBe(LABELS.play);

    await clickLoopButton();
    expect(heroLoop()).toBe('running');
  });

  test('never mounts the stage or loop under reduced motion', async () => {
    setReduced(true);

    await renderHero();

    expect(bootHeroStage).not.toHaveBeenCalled();
    expect(container?.querySelector('[data-hero-loop]')).toBeNull();
    expect(loopButton()).toBeNull();
    expect(container?.querySelector('[data-hero-loop-slot]')).not.toBeNull();
  });
});
