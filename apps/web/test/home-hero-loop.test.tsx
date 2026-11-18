// @vitest-environment jsdom

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import type { Project } from 'xploder';
import { createFakeClock, type FakeClock } from 'xploder/fixtures';
import { motion } from 'xploder/motion';
import { clockFromNow, type EngineClock } from 'xploder/react';

import { jevToolkit } from '../content/projects/jev-toolkit';
import { websocketInspector } from '../content/projects/websocket-inspector';
import { HeroCaption } from '../components/hero/hero-caption';
import {
  createHeroSequence,
  HERO_STORYBOARD_MS,
  MS_PER_SECOND,
  type HeroFollowDriver,
  type HeroTourState,
} from '../components/hero/hero-loop';

const { bootHeroStage, liveViewerProps, viewerActions, viewerState, viewerStore } = vi.hoisted(
  () => {
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
      viewerState: {
        clock: null as EngineClock | null,
        pausePausedTour: false,
        calls: [] as string[],
      },
      viewerActions: {
        explode: vi.fn(),
        implode: vi.fn(),
        zoomIn: vi.fn(),
        zoomReset: vi.fn(),
        rotateRight: vi.fn(),
        selectFlow: vi.fn(),
        play: vi.fn(),
        pause: vi.fn(),
        resume: vi.fn(),
        pauseTour: vi.fn(),
        stop: vi.fn(),
      },
    };
  },
);

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
      return { actions: viewerActions, tour: viewerStore.tour, clock: viewerState.clock };
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
const TOUR_BEAT_MS = motion.durations.tourBeat * 1000;
const TOUR_OVERDUE_MS = TOUR_BEAT_MS * 1.5;
const EXPLODE_STORYBOARD_MS =
  (motion.durations.explode +
    motion.durations.tourPulse +
    motion.durations.tourBeat +
    motion.durations.tourBeat) *
  MS_PER_SECOND;
const ZOOM_SETTLE_STORYBOARD_MS =
  (motion.durations.implode + motion.staggers.tourStep + motion.durations.tourBeat) * MS_PER_SECOND;
const TOUR_END_HOLD_MS = TOUR_BEAT_MS;

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

async function renderHero(project: Project = websocketInspector): Promise<void> {
  await act(async () => {
    root?.render(
      <HeroShowcaseProvider>
        <HeroLive project={project} />
        <HeroCaption name={project.meta.name} tagline={project.meta.tagline} labels={LABELS} />
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

async function advance(delayMs: number): Promise<void> {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(delayMs);
  });
  await flush();
}

async function advanceToCapture(): Promise<void> {
  await advance(HERO_STORYBOARD_MS.implode);
  await advance(HERO_STORYBOARD_MS.explode);
  await advance(HERO_STORYBOARD_MS.zoomSettle);
}

function heroLoop(): string | undefined {
  return container?.querySelector<HTMLElement>('[data-hero-loop]')?.dataset.heroLoop;
}

function heroPhase(): string | undefined {
  return container?.querySelector<HTMLElement>('[data-hero-loop]')?.dataset.heroPhase;
}

function heroTourStep(): number | undefined {
  const value = container?.querySelector<HTMLElement>('[data-hero-loop]')?.dataset.heroTourStep;
  return value === undefined ? undefined : Number(value);
}

function loopButton(): HTMLButtonElement | null {
  return container?.querySelector<HTMLButtonElement>('[data-hero-loop-slot] button') ?? null;
}

function projectLine(): string | null {
  return (
    container?.querySelector<HTMLElement>('[data-hero-project-line]')?.textContent?.trim() ?? null
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

function expectedProjectLine(): string {
  return `${websocketInspector.meta.name} — ${websocketInspector.meta.tagline ?? ''}`;
}

function sequenceActions() {
  return {
    explode: vi.fn(),
    implode: vi.fn(),
    zoomIn: vi.fn(),
    zoomReset: vi.fn(),
    rotateRight: vi.fn(),
    selectFlow: vi.fn(),
    playTour: vi.fn(),
    pauseTour: vi.fn(),
    stopTour: vi.fn(),
  };
}

function followDriver(): HeroFollowDriver & Record<string, ReturnType<typeof vi.fn>> {
  return {
    start: vi.fn(),
    follow: vi.fn(),
    pause: vi.fn(),
    resume: vi.fn(),
    reset: vi.fn(),
    stop: vi.fn(),
    dispose: vi.fn(),
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
  viewerState.clock = clockFromNow(() => Date.now() / MS_PER_SECOND);
  viewerState.pausePausedTour = false;
  viewerState.calls.length = 0;
  for (const action of Object.values(viewerActions)) action.mockReset();
  bootHeroStage.mockReset();

  viewerActions.selectFlow.mockImplementation((flowId: string) => {
    setTour({ flowId, status: 'idle', step: -1, total: tourTotal });
  });
  viewerActions.play.mockImplementation(() => {
    viewerState.calls.push('viewer.play');
    viewerState.clock?.resume();
    viewerState.pausePausedTour = false;
    setTour({
      status: 'playing',
      step: viewerStore.tour.step < 0 ? 0 : viewerStore.tour.step,
    });
  });
  viewerActions.pause.mockImplementation(() => {
    viewerState.calls.push('viewer.pause');
    viewerState.clock?.pause();
    if (viewerStore.tour.status === 'playing') {
      viewerState.pausePausedTour = true;
      setTour({ status: 'paused' });
    }
  });
  viewerActions.resume.mockImplementation(() => {
    viewerState.calls.push('viewer.resume');
    const resumeTour = viewerState.pausePausedTour && viewerStore.tour.status === 'paused';
    viewerState.clock?.resume();
    if (resumeTour) setTour({ status: 'playing' });
    viewerState.pausePausedTour = false;
  });
  viewerActions.pauseTour.mockImplementation(() => {
    viewerState.calls.push('viewer.pauseTour');
    setTour({ status: 'paused' });
  });
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

describe('createHeroSequence', () => {
  function controller(options: { readonly now?: () => number } = {}) {
    const actions = sequenceActions();
    const follow = followDriver();
    const schedule = vi.fn((callback: () => void, delayMs: number) =>
      window.setTimeout(callback, delayMs),
    );
    const sequence = createHeroSequence({
      actions,
      follow,
      captureFlow: FLOW_A,
      inspectFlow: FLOW_B,
      schedule,
      cancel: (handle) => window.clearTimeout(handle as number),
      now: options.now ?? (() => Date.now()),
    });
    return { actions, follow, schedule, sequence };
  }

  test('holds the exploded and zoomed views before starting capture', () => {
    const { actions, follow, sequence } = controller();

    sequence.start();
    expect(sequence.state.phase).toBe('implode');
    expect(actions.zoomReset).toHaveBeenCalledTimes(1);
    expect(actions.implode).toHaveBeenCalledTimes(1);
    expect(actions.explode).not.toHaveBeenCalled();
    expect(follow.stop).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(HERO_STORYBOARD_MS.implode);
    expect(sequence.state.phase).toBe('explode');
    expect(actions.explode).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(EXPLODE_STORYBOARD_MS - 1);
    expect(sequence.state.phase).toBe('explode');
    expect(actions.zoomIn).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(sequence.state.phase).toBe('zoomin');
    expect(actions.zoomIn).toHaveBeenCalledTimes(3);
    expect(follow.start).not.toHaveBeenCalled();

    vi.advanceTimersByTime(ZOOM_SETTLE_STORYBOARD_MS - 1);
    expect(sequence.state.phase).toBe('zoomin');
    expect(follow.start).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(sequence.state.phase).toBe('capture');
    expect(follow.start).toHaveBeenLastCalledWith(FLOW_A);
    expect(actions.selectFlow).toHaveBeenLastCalledWith(FLOW_A);
    expect(actions.playTour).toHaveBeenCalledTimes(1);
  });

  test('follows each tour step and transitions capture → inspect → turn → implode', () => {
    const { actions, follow, sequence } = controller();

    sequence.start();
    vi.advanceTimersByTime(
      HERO_STORYBOARD_MS.implode + HERO_STORYBOARD_MS.explode + HERO_STORYBOARD_MS.zoomSettle,
    );

    sequence.updateTour(tour({ step: 0 }));
    sequence.updateTour(tour({ step: 2 }));
    expect(follow.follow).toHaveBeenNthCalledWith(1, FLOW_A, 0);
    expect(follow.follow).toHaveBeenNthCalledWith(2, FLOW_A, 2);

    sequence.updateTour(tour({ status: 'ended', step: 2 }));
    expect(sequence.state.phase).toBe('capture');
    vi.advanceTimersByTime(TOUR_END_HOLD_MS - 1);
    expect(sequence.state.phase).toBe('capture');
    vi.advanceTimersByTime(1);
    expect(sequence.state.phase).toBe('inspect');
    expect(follow.start).toHaveBeenLastCalledWith(FLOW_B);
    expect(actions.selectFlow).toHaveBeenLastCalledWith(FLOW_B);

    sequence.updateTour(tour({ flowId: FLOW_B, step: 5 }));
    expect(follow.follow).toHaveBeenLastCalledWith(FLOW_B, 5);

    sequence.updateTour(tour({ flowId: FLOW_B, status: 'ended', step: 6 }));
    expect(sequence.state.phase).toBe('inspect');
    vi.advanceTimersByTime(TOUR_END_HOLD_MS - 1);
    expect(sequence.state.phase).toBe('inspect');
    vi.advanceTimersByTime(1);
    expect(sequence.state.phase).toBe('turn');
    expect(actions.stopTour).toHaveBeenCalledTimes(1);
    expect(actions.zoomReset).toHaveBeenCalledTimes(2);
    expect(follow.reset).toHaveBeenCalledTimes(1);
    expect(narrationPhase(sequence.state.phase)).toBe(false);

    expect(actions.rotateRight).not.toHaveBeenCalled();
    vi.advanceTimersByTime(HERO_STORYBOARD_MS.turnStep);
    expect(actions.rotateRight).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(HERO_STORYBOARD_MS.turnStep);
    expect(actions.rotateRight).toHaveBeenCalledTimes(2);
    vi.advanceTimersByTime(HERO_STORYBOARD_MS.turnStep);
    expect(sequence.state.phase).toBe('implode');
    expect(actions.implode).toHaveBeenCalledTimes(2);

    vi.advanceTimersByTime(HERO_STORYBOARD_MS.implode);
    expect(sequence.state.phase).toBe('explode');
    expect(actions.explode).toHaveBeenCalledTimes(2);
  });

  test('pause pauses the tour and follow; resume replays both', () => {
    const { actions, follow, sequence } = controller();

    sequence.start();
    vi.advanceTimersByTime(
      HERO_STORYBOARD_MS.implode + HERO_STORYBOARD_MS.explode + HERO_STORYBOARD_MS.zoomSettle,
    );
    sequence.updateTour(tour());
    sequence.pause();
    expect(sequence.state.status).toBe('paused');
    expect(actions.pauseTour).toHaveBeenCalledTimes(1);
    expect(follow.pause).toHaveBeenCalledTimes(1);

    sequence.updateTour(tour());
    expect(actions.pauseTour).toHaveBeenCalledTimes(2);
    sequence.resume();
    expect(follow.resume).toHaveBeenCalledTimes(1);
    expect(actions.playTour).toHaveBeenCalledTimes(2);
    expect(sequence.state.status).toBe('running');
  });

  test('pause during implode resumes after the remaining step time', () => {
    const { actions, follow, sequence } = controller();
    const remaining = HERO_STORYBOARD_MS.implode / 2;

    sequence.start();
    vi.advanceTimersByTime(remaining);
    sequence.pause();
    vi.advanceTimersByTime(5 * MS_PER_SECOND);
    expect(actions.explode).not.toHaveBeenCalled();
    expect(follow.pause).toHaveBeenCalledTimes(1);

    sequence.resume();
    expect(follow.resume).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(remaining - 1);
    expect(actions.explode).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(actions.explode).toHaveBeenCalledTimes(1);
  });

  test('pause mid-explode resumes after the remaining step time', () => {
    const { actions, sequence } = controller();
    const elapsed = HERO_STORYBOARD_MS.explode - MS_PER_SECOND;
    const remaining = HERO_STORYBOARD_MS.explode - elapsed;

    sequence.start();
    vi.advanceTimersByTime(HERO_STORYBOARD_MS.implode + elapsed);
    expect(sequence.state.phase).toBe('explode');
    sequence.pause();
    vi.advanceTimersByTime(5 * MS_PER_SECOND);
    expect(actions.zoomIn).not.toHaveBeenCalled();

    sequence.resume();
    vi.advanceTimersByTime(remaining - 1);
    expect(actions.zoomIn).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(actions.zoomIn).toHaveBeenCalledTimes(3);
  });

  test('pause mid-turn resumes after the remaining step time', () => {
    const { actions, sequence } = controller();
    const remaining = HERO_STORYBOARD_MS.turnStep / 2;

    sequence.start();
    vi.advanceTimersByTime(
      HERO_STORYBOARD_MS.implode + HERO_STORYBOARD_MS.explode + HERO_STORYBOARD_MS.zoomSettle,
    );
    sequence.updateTour(tour({ status: 'ended', step: 2 }));
    vi.advanceTimersByTime(TOUR_END_HOLD_MS);
    sequence.updateTour(tour({ flowId: FLOW_B, status: 'ended', step: 6 }));
    vi.advanceTimersByTime(TOUR_END_HOLD_MS);
    expect(sequence.state.phase).toBe('turn');
    vi.advanceTimersByTime(remaining);
    sequence.pause();
    vi.advanceTimersByTime(5 * MS_PER_SECOND);
    expect(actions.rotateRight).not.toHaveBeenCalled();

    sequence.resume();
    vi.advanceTimersByTime(remaining - 1);
    expect(actions.rotateRight).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(actions.rotateRight).toHaveBeenCalledTimes(1);
  });

  test('pause during zoom settle resumes after the remaining step time', () => {
    const { follow, sequence } = controller();
    const remaining = HERO_STORYBOARD_MS.zoomSettle / 2;

    sequence.start();
    vi.advanceTimersByTime(HERO_STORYBOARD_MS.implode + HERO_STORYBOARD_MS.explode);
    expect(sequence.state.phase).toBe('zoomin');
    vi.advanceTimersByTime(remaining);
    sequence.pause();
    vi.advanceTimersByTime(5 * MS_PER_SECOND);
    expect(follow.start).not.toHaveBeenCalled();

    sequence.resume();
    vi.advanceTimersByTime(remaining - 1);
    expect(follow.start).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(follow.start).toHaveBeenCalledWith(FLOW_A);
  });

  test('pause during the capture tour keeps the existing resume behavior', () => {
    const { actions, follow, sequence } = controller();

    sequence.start();
    vi.advanceTimersByTime(
      HERO_STORYBOARD_MS.implode + HERO_STORYBOARD_MS.explode + HERO_STORYBOARD_MS.zoomSettle,
    );
    sequence.updateTour(tour({ status: 'playing', step: 0 }));
    const starts = vi.mocked(follow.start).mock.calls.length;
    const selections = actions.selectFlow.mock.calls.length;
    const plays = actions.playTour.mock.calls.length;

    sequence.pause();
    vi.advanceTimersByTime(5 * MS_PER_SECOND);
    expect(sequence.state.phase).toBe('capture');
    expect(follow.start).toHaveBeenCalledTimes(starts);
    expect(actions.selectFlow).toHaveBeenCalledTimes(selections);

    sequence.resume();
    expect(sequence.state.phase).toBe('capture');
    expect(follow.resume).toHaveBeenCalledTimes(1);
    expect(actions.playTour).toHaveBeenCalledTimes(plays + 1);
  });

  test('pause during a tour-end hold resumes after the remaining hold time', () => {
    const { actions, follow, sequence } = controller();
    const elapsed = TOUR_END_HOLD_MS / 2;
    const remaining = TOUR_END_HOLD_MS - elapsed;

    sequence.start();
    vi.advanceTimersByTime(
      HERO_STORYBOARD_MS.implode + HERO_STORYBOARD_MS.explode + HERO_STORYBOARD_MS.zoomSettle,
    );
    const starts = vi.mocked(follow.start).mock.calls.length;
    const plays = actions.playTour.mock.calls.length;
    sequence.updateTour(tour({ status: 'ended', step: 2 }));
    expect(sequence.state.phase).toBe('capture');

    vi.advanceTimersByTime(elapsed);
    sequence.pause();
    vi.advanceTimersByTime(5 * MS_PER_SECOND);
    expect(sequence.state.phase).toBe('capture');
    expect(follow.start).toHaveBeenCalledTimes(starts);

    sequence.resume();
    vi.advanceTimersByTime(remaining - 1);
    expect(sequence.state.phase).toBe('capture');
    expect(follow.start).toHaveBeenCalledTimes(starts);
    expect(actions.playTour).toHaveBeenCalledTimes(plays);

    vi.advanceTimersByTime(1);
    expect(sequence.state.phase).toBe('inspect');
    expect(follow.start).toHaveBeenLastCalledWith(FLOW_B);
    expect(actions.playTour).toHaveBeenCalledTimes(plays + 1);
  });

  test('repeated pauses accumulate elapsed time within the same step', () => {
    const { actions, sequence } = controller();
    const firstElapsed = HERO_STORYBOARD_MS.explode - MS_PER_SECOND;
    const secondElapsed = Math.floor(HERO_STORYBOARD_MS.explode / 7);
    const remaining = HERO_STORYBOARD_MS.explode - firstElapsed - secondElapsed;

    sequence.start();
    vi.advanceTimersByTime(HERO_STORYBOARD_MS.implode + firstElapsed);
    sequence.pause();
    vi.advanceTimersByTime(5 * MS_PER_SECOND);
    sequence.resume();

    vi.advanceTimersByTime(secondElapsed);
    sequence.pause();
    vi.advanceTimersByTime(5 * MS_PER_SECOND);
    sequence.resume();

    vi.advanceTimersByTime(remaining - 1);
    expect(actions.zoomIn).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(actions.zoomIn).toHaveBeenCalledTimes(3);
  });

  test('pause in the last millisecond resumes after the remaining millisecond', () => {
    const { actions, sequence } = controller();

    sequence.start();
    vi.advanceTimersByTime(HERO_STORYBOARD_MS.implode - 1);
    sequence.pause();
    vi.advanceTimersByTime(5 * MS_PER_SECOND);
    sequence.resume();

    vi.advanceTimersByTime(0);
    expect(actions.explode).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(actions.explode).toHaveBeenCalledTimes(1);
  });

  test('resume clamps elapsed time to zero when the clock has passed the deadline', () => {
    const clockOverrun = 2;
    let clockOffset = 0;
    const { actions, schedule, sequence } = controller({ now: () => Date.now() + clockOffset });

    sequence.start();
    vi.advanceTimersByTime(HERO_STORYBOARD_MS.implode - 1);
    clockOffset = clockOverrun;
    sequence.pause();
    vi.advanceTimersByTime(5 * MS_PER_SECOND);
    sequence.resume();

    expect(schedule.mock.lastCall?.[1]).toBe(0);
    vi.advanceTimersByTime(0.1);
    expect(actions.explode).toHaveBeenCalledTimes(1);
  });

  test('resume advances an ended tour instead of replaying that flow', () => {
    const { actions, follow, sequence } = controller();

    sequence.start();
    vi.advanceTimersByTime(
      HERO_STORYBOARD_MS.implode + HERO_STORYBOARD_MS.explode + HERO_STORYBOARD_MS.zoomSettle,
    );
    sequence.updateTour(tour({ step: 2 }));
    sequence.pause();
    actions.playTour.mockClear();
    sequence.updateTour(tour({ status: 'ended', step: 2 }));

    sequence.resume();
    expect(sequence.state.phase).toBe('inspect');
    expect(actions.selectFlow).toHaveBeenLastCalledWith(FLOW_B);
    expect(actions.playTour).toHaveBeenCalledTimes(1);
    expect(actions.playTour.mock.invocationCallOrder[0]).toBeGreaterThan(
      actions.selectFlow.mock.invocationCallOrder.at(-1) ?? 0,
    );

    sequence.updateTour(tour({ flowId: FLOW_B, step: 6 }));
    sequence.pause();
    actions.playTour.mockClear();
    sequence.updateTour(tour({ flowId: FLOW_B, status: 'ended', step: 6 }));

    sequence.resume();
    expect(sequence.state.phase).toBe('turn');
    expect(actions.stopTour).toHaveBeenCalledTimes(1);
    expect(actions.playTour).not.toHaveBeenCalled();
    expect(follow.start).toHaveBeenLastCalledWith(FLOW_B);
  });

  function clockController() {
    const clock = createFakeClock();
    const actions = sequenceActions();
    const follow = followDriver();
    const schedule = vi.fn((callback: () => void, delayMs: number) =>
      clock.schedule(delayMs / MS_PER_SECOND, callback),
    );
    const sequence = createHeroSequence({
      actions,
      follow,
      captureFlow: FLOW_A,
      inspectFlow: FLOW_B,
      schedule,
      cancel: (handle) => (handle as () => void)(),
      now: () => clock.now() * MS_PER_SECOND,
    });
    return { actions, clock, follow, schedule, sequence };
  }

  function advanceClock(clock: FakeClock, milliseconds: number): void {
    clock.advance(milliseconds / MS_PER_SECOND);
  }

  function pauseClock(clock: FakeClock, sequence: ReturnType<typeof createHeroSequence>): void {
    clock.pause();
    sequence.pause();
  }

  function resumeClock(clock: FakeClock, sequence: ReturnType<typeof createHeroSequence>): void {
    clock.resume();
    sequence.resume();
  }

  test('fake clock: pause during implode resumes after the remaining step time', () => {
    const { actions, clock, follow, sequence } = clockController();
    const remaining = HERO_STORYBOARD_MS.implode / 2;

    sequence.start();
    advanceClock(clock, remaining);
    pauseClock(clock, sequence);
    clock.advance(5);
    expect(actions.explode).not.toHaveBeenCalled();
    expect(follow.pause).toHaveBeenCalledTimes(1);

    resumeClock(clock, sequence);
    expect(follow.resume).toHaveBeenCalledTimes(1);
    advanceClock(clock, remaining - 1);
    expect(actions.explode).not.toHaveBeenCalled();
    advanceClock(clock, 1);
    expect(actions.explode).toHaveBeenCalledTimes(1);
  });

  test('fake clock: pause mid-explode resumes after the remaining step time', () => {
    const { actions, clock, sequence } = clockController();
    const elapsed = HERO_STORYBOARD_MS.explode - MS_PER_SECOND;
    const remaining = HERO_STORYBOARD_MS.explode - elapsed;

    sequence.start();
    advanceClock(clock, HERO_STORYBOARD_MS.implode + elapsed);
    expect(sequence.state.phase).toBe('explode');
    pauseClock(clock, sequence);
    clock.advance(5);
    expect(actions.zoomIn).not.toHaveBeenCalled();

    resumeClock(clock, sequence);
    advanceClock(clock, remaining - 1);
    expect(actions.zoomIn).not.toHaveBeenCalled();
    advanceClock(clock, 1);
    expect(actions.zoomIn).toHaveBeenCalledTimes(3);
  });

  test('fake clock: pause mid-turn resumes after the remaining step time', () => {
    const { actions, clock, sequence } = clockController();
    const remaining = HERO_STORYBOARD_MS.turnStep / 2;

    sequence.start();
    advanceClock(
      clock,
      HERO_STORYBOARD_MS.implode + HERO_STORYBOARD_MS.explode + HERO_STORYBOARD_MS.zoomSettle,
    );
    sequence.updateTour(tour({ status: 'ended', step: 2 }));
    advanceClock(clock, TOUR_END_HOLD_MS);
    sequence.updateTour(tour({ flowId: FLOW_B, status: 'ended', step: 6 }));
    advanceClock(clock, TOUR_END_HOLD_MS);
    expect(sequence.state.phase).toBe('turn');
    advanceClock(clock, remaining);
    pauseClock(clock, sequence);
    clock.advance(5);
    expect(actions.rotateRight).not.toHaveBeenCalled();

    resumeClock(clock, sequence);
    advanceClock(clock, remaining - 1);
    expect(actions.rotateRight).not.toHaveBeenCalled();
    advanceClock(clock, 1);
    expect(actions.rotateRight).toHaveBeenCalledTimes(1);
  });

  test('fake clock: pause during a tour-end hold resumes after the remaining hold time', () => {
    const { actions, clock, follow, sequence } = clockController();
    const elapsed = TOUR_END_HOLD_MS / 2;
    const remaining = TOUR_END_HOLD_MS - elapsed;

    sequence.start();
    advanceClock(
      clock,
      HERO_STORYBOARD_MS.implode + HERO_STORYBOARD_MS.explode + HERO_STORYBOARD_MS.zoomSettle,
    );
    const starts = vi.mocked(follow.start).mock.calls.length;
    const plays = actions.playTour.mock.calls.length;
    sequence.updateTour(tour({ status: 'ended', step: 2 }));
    expect(sequence.state.phase).toBe('capture');

    advanceClock(clock, elapsed);
    pauseClock(clock, sequence);
    clock.advance(5);
    expect(sequence.state.phase).toBe('capture');
    expect(follow.start).toHaveBeenCalledTimes(starts);

    resumeClock(clock, sequence);
    advanceClock(clock, remaining - 1);
    expect(sequence.state.phase).toBe('capture');
    expect(follow.start).toHaveBeenCalledTimes(starts);
    expect(actions.playTour).toHaveBeenCalledTimes(plays);

    advanceClock(clock, 1);
    expect(sequence.state.phase).toBe('inspect');
    expect(follow.start).toHaveBeenLastCalledWith(FLOW_B);
    expect(actions.playTour).toHaveBeenCalledTimes(plays + 1);
  });
});

function narrationPhase(phase: string): boolean {
  return phase === 'capture' || phase === 'inspect';
}

describe('hero stage storyboard', () => {
  test('runs implode → explode → zoom → capture and narrates the first component', async () => {
    await renderHero();

    expect(heroLoop()).toBe('paused');
    expect(loopButton()).toBeNull();
    await firstFrame();

    expect(heroLoop()).toBe('running');
    expect(heroPhase()).toBe('implode');
    expect(viewerActions.implode).toHaveBeenCalledTimes(1);
    expect(viewerActions.zoomReset).toHaveBeenCalledTimes(1);
    expect(loopButton()?.getAttribute('aria-label')).toBe(LABELS.pause);

    await advanceToCapture();
    expect(heroPhase()).toBe('capture');
    expect(viewerActions.explode).toHaveBeenCalledTimes(1);
    expect(viewerActions.zoomIn).toHaveBeenCalledTimes(3);
    expect(viewerActions.selectFlow).toHaveBeenLastCalledWith('capture-path');
    expect(viewerActions.play).toHaveBeenCalledTimes(1);
    expect(projectLine()).toBe(expectedProjectLine());
  });

  test("tours the hero project's own first flow (S19: JEV hero)", async () => {
    await renderHero(jevToolkit);
    await firstFrame();
    await advanceToCapture();

    expect(heroPhase()).toBe('capture');
    expect(viewerActions.selectFlow).toHaveBeenLastCalledWith(jevToolkit.flows[0]?.id);
  });

  test('runs capture → inspect → turn → implode → capture again', async () => {
    await renderHero();
    await firstFrame();
    await advanceToCapture();

    emitTour({ flowId: 'capture-path', status: 'ended', step: tourTotal - 1 });
    expect(heroPhase()).toBe('capture');
    await advance(TOUR_END_HOLD_MS - 1);
    expect(heroPhase()).toBe('capture');
    await advance(1);
    expect(heroPhase()).toBe('inspect');
    expect(viewerActions.selectFlow).toHaveBeenLastCalledWith('inspect-path');
    expect(projectLine()).toBe(expectedProjectLine());

    emitTour({ flowId: 'inspect-path', status: 'ended', step: tourTotal - 1 });
    expect(heroPhase()).toBe('inspect');
    await advance(TOUR_END_HOLD_MS - 1);
    expect(heroPhase()).toBe('inspect');
    await advance(1);
    expect(heroPhase()).toBe('turn');
    expect(viewerActions.stop).toHaveBeenCalled();
    expect(viewerActions.zoomReset).toHaveBeenCalledTimes(2);
    expect(projectLine()).toBe(expectedProjectLine());

    await advance(HERO_STORYBOARD_MS.turnStep);
    expect(viewerActions.rotateRight).toHaveBeenCalledTimes(1);
    await advance(HERO_STORYBOARD_MS.turnStep);
    expect(viewerActions.rotateRight).toHaveBeenCalledTimes(2);
    await advance(HERO_STORYBOARD_MS.turnStep);
    expect(heroPhase()).toBe('implode');
    expect(viewerActions.implode).toHaveBeenCalledTimes(2);

    await advance(HERO_STORYBOARD_MS.implode);
    expect(heroPhase()).toBe('explode');
    expect(viewerActions.explode).toHaveBeenCalledTimes(2);
    await advance(HERO_STORYBOARD_MS.explode);
    await advance(HERO_STORYBOARD_MS.zoomSettle);
    expect(heroPhase()).toBe('capture');
    expect(projectLine()).toBe(expectedProjectLine());
  });

  test('pauses and resumes from the button, hidden tab, and off-screen observer', async () => {
    await renderHero();
    await firstFrame();
    await advanceToCapture();

    const pauses = viewerActions.pauseTour.mock.calls.length;
    const plays = viewerActions.play.mock.calls.length;
    await clickLoopButton();
    expect(viewerActions.pauseTour).toHaveBeenCalledTimes(pauses + 1);
    expect(heroLoop()).toBe('paused');
    expect(loopButton()?.getAttribute('aria-label')).toBe(LABELS.play);

    await clickLoopButton();
    expect(viewerActions.play).toHaveBeenCalledTimes(plays + 1);
    expect(heroLoop()).toBe('running');

    setVisibility('hidden');
    expect(viewerActions.pauseTour).toHaveBeenCalledTimes(pauses + 2);
    expect(heroLoop()).toBe('paused');
    setVisibility('visible');
    expect(viewerActions.play).toHaveBeenCalledTimes(plays + 2);
    expect(heroLoop()).toBe('running');

    reportIntersection(false);
    expect(viewerActions.pauseTour).toHaveBeenCalledTimes(pauses + 3);
    expect(heroLoop()).toBe('paused');
    reportIntersection(true);
    expect(viewerActions.play).toHaveBeenCalledTimes(plays + 3);
    expect(heroLoop()).toBe('running');
  });

  test('freezes the viewer before the storyboard on pause and resumes in reverse', async () => {
    await renderHero();
    await firstFrame();
    await advanceToCapture();
    viewerState.calls.length = 0;

    await clickLoopButton();
    const pause = viewerState.calls.indexOf('viewer.pause');
    const pauseTour = viewerState.calls.indexOf('viewer.pauseTour');
    expect(pause).toBeGreaterThanOrEqual(0);
    expect(pauseTour).toBeGreaterThan(pause);

    viewerState.calls.length = 0;
    await clickLoopButton();
    const resume = viewerState.calls.indexOf('viewer.resume');
    const play = viewerState.calls.indexOf('viewer.play');
    expect(resume).toBeGreaterThanOrEqual(0);
    expect(play).toBeGreaterThan(resume);
  });

  test('schedules the storyboard on the viewer clock', async () => {
    await renderHero();
    const clock = viewerState.clock;
    if (clock === null) throw new Error('viewer clock was not provided');
    await firstFrame();

    const remaining = HERO_STORYBOARD_MS.implode / 2;
    await advance(remaining);
    expect(heroPhase()).toBe('implode');

    act(() => clock.pause());
    await advance(10 * MS_PER_SECOND);
    expect(heroPhase()).toBe('implode');

    act(() => clock.resume());
    await advance(remaining - 2);
    expect(heroPhase()).toBe('implode');
    await advance(2);
    expect(heroPhase()).toBe('explode');
  });

  test('a user pause wins over automatic resumes', async () => {
    await renderHero();
    await firstFrame();
    await advanceToCapture();

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

  test('nudges a stalled tour once with pause then play, then continues', async () => {
    await renderHero();
    await firstFrame();
    await advanceToCapture();

    viewerActions.pauseTour.mockImplementation(() => {
      setTour({ status: 'paused', step: Math.min(viewerStore.tour.step + 1, tourTotal - 1) });
    });
    viewerActions.play.mockImplementation(() => setTour({ status: 'playing' }));
    emitTour({ flowId: 'capture-path', status: 'playing', step: 4 });
    const pauses = viewerActions.pauseTour.mock.calls.length;
    const plays = viewerActions.play.mock.calls.length;

    await advance(TOUR_OVERDUE_MS + 32);
    expect(viewerActions.pauseTour).toHaveBeenCalledTimes(pauses + 1);
    expect(viewerActions.play).toHaveBeenCalledTimes(plays + 1);
    expect(heroTourStep()).toBe(5);
    expect(heroPhase()).toBe('capture');

    await advance(32);
    expect(viewerActions.pauseTour).toHaveBeenCalledTimes(pauses + 1);
    expect(viewerActions.play).toHaveBeenCalledTimes(plays + 1);

    emitTour({ status: 'ended', step: tourTotal - 1 });
    expect(heroPhase()).toBe('capture');
    await advance(TOUR_END_HOLD_MS);
    expect(heroPhase()).toBe('inspect');
  });

  test('advances an ended last step instead of replaying it after a nudge', async () => {
    await renderHero();
    await firstFrame();
    await advanceToCapture();

    let restarted = 0;
    viewerActions.pauseTour.mockImplementation(() => {
      setTour({ status: 'ended', step: tourTotal - 1 });
    });
    viewerActions.play.mockImplementation(() => {
      if (viewerStore.tour.status === 'ended') {
        restarted += 1;
        setTour({ status: 'playing', step: 0 });
      } else {
        setTour({ status: 'playing' });
      }
    });
    emitTour({ flowId: 'capture-path', status: 'playing', step: tourTotal - 1 });

    await advance(TOUR_OVERDUE_MS + 64);
    expect(restarted).toBe(0);
    expect(heroPhase()).toBe('capture');
    await advance(TOUR_END_HOLD_MS);
    expect(heroPhase()).toBe('inspect');
    expect(viewerActions.selectFlow).toHaveBeenLastCalledWith('inspect-path');
  });

  test('watches only while running and visible, and leaves on-time steps alone', async () => {
    await renderHero();
    await firstFrame();
    await advanceToCapture();

    const updatePauses = () => viewerActions.pauseTour.mock.calls.length;
    const now = vi.spyOn(performance, 'now');
    await advance(TOUR_BEAT_MS / 2);
    expect(now.mock.calls.length).toBeGreaterThan(0);

    let pauses = updatePauses();
    await clickLoopButton();
    pauses = updatePauses();
    await advance(TOUR_OVERDUE_MS * 2);
    expect(updatePauses()).toBe(pauses);

    await clickLoopButton();
    setVisibility('hidden');
    pauses = updatePauses();
    await advance(TOUR_OVERDUE_MS * 2);
    expect(updatePauses()).toBe(pauses);

    setVisibility('visible');
    reportIntersection(false);
    pauses = updatePauses();
    await advance(TOUR_OVERDUE_MS * 2);
    expect(updatePauses()).toBe(pauses);

    reportIntersection(true);
    pauses = updatePauses();
    emitTour({ flowId: 'capture-path', status: 'playing', step: 1 });
    for (let step = 1; step < 4; step += 1) {
      await advance(TOUR_BEAT_MS);
      emitTour({ step: step + 1 });
    }
    expect(updatePauses()).toBe(pauses);
    expect(heroTourStep()).toBe(4);

    await act(async () => root?.unmount());
    root = null;
    pauses = updatePauses();
    await advance(TOUR_OVERDUE_MS * 2);
    expect(updatePauses()).toBe(pauses);
  });

  test('never mounts the stage or storyboard under reduced motion', async () => {
    setReduced(true);

    await renderHero();

    expect(bootHeroStage).not.toHaveBeenCalled();
    expect(container?.querySelector('[data-hero-loop]')).toBeNull();
    expect(loopButton()).toBeNull();
    expect(container?.querySelector('[data-hero-loop-slot]')).not.toBeNull();
  });
});
