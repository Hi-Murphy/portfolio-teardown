// @vitest-environment jsdom

import { act, useEffect } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeAll, beforeEach, expect, test, vi } from 'vitest';
import { createFakeClock } from 'xploder/fixtures';
import { motion } from 'xploder/motion';
import {
  TeardownViewer,
  useTeardownViewer,
  type SettlePhase,
  type TeardownViewerHandle,
  type ViewerProject,
  type ViewerStats,
} from 'xploder/react';

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

const project: ViewerProject = {
  meta: { slug: 'event-project' },
  layers: [
    {
      id: 'layer',
      name: 'Layer',
      components: [
        { id: 'first', name: 'First' },
        { id: 'second', name: 'Second' },
      ],
    },
  ],
  flows: [{ id: 'flow', label: 'Flow', path: ['first', 'second'] }],
};

const STATS: ViewerStats = {
  drawCalls: 1,
  triangles: 2,
  frame: 1,
  instances: { layers: 1, components: 2 },
};

interface SettledOverlayEvent {
  readonly kind: 'settled';
  readonly phase: SettlePhase;
  readonly at: number;
  readonly frame: { readonly layers: readonly unknown[]; readonly components: readonly unknown[] };
  readonly width: number;
  readonly height: number;
  readonly offsetY: number;
}

interface MovingOverlayEvent {
  readonly kind: 'moving';
  readonly at: number;
}

type OverlayEventStub = SettledOverlayEvent | MovingOverlayEvent;

interface SceneStubProps {
  readonly onStats?: (stats: ViewerStats) => void;
  readonly onOverlay?: (event: OverlayEventStub) => void;
  readonly onSettled?: unknown;
}

interface HandlerProps {
  readonly onReady?: () => void;
  readonly onSettled?: (phase: SettlePhase) => void;
  readonly onTourEnded?: (flowId: string) => void;
}

type ViewerClock = ReturnType<typeof createFakeClock>;

const viewerCapture: { current: TeardownViewerHandle | null } = { current: null };

function ViewerHarness({ clock, ...handlers }: HandlerProps & { readonly clock: ViewerClock }) {
  const viewer = useTeardownViewer({ project, clock });

  useEffect(() => {
    viewerCapture.current = viewer;
  }, [viewer]);

  return <TeardownViewer project={project} viewer={viewer} {...handlers} />;
}

let root: Root | null = null;
let container: HTMLDivElement | null = null;
let domEvents: Array<{ readonly name: string; readonly detail: unknown }> = [];

const onDomEvent = (event: Event): void => {
  domEvents.push({ name: event.type, detail: (event as CustomEvent<unknown>).detail });
};

const DOM_EVENT_NAMES = ['xploder:ready', 'xploder:settled', 'xploder:tour-ended'] as const;

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
  viewerCapture.current = null;
  domEvents = [];
  for (const name of DOM_EVENT_NAMES) document.addEventListener(name, onDomEvent);
});

afterEach(async () => {
  await act(async () => root?.unmount());
  root = null;
  container?.remove();
  container = null;
  sceneCapture.props.length = 0;
  viewerCapture.current = null;
  for (const name of DOM_EVENT_NAMES) document.removeEventListener(name, onDomEvent);
  vi.restoreAllMocks();
});

function wrapper(): HTMLElement {
  if (container === null) throw new Error('test container was not mounted');

  const element = container.querySelector<HTMLElement>('[data-xploder-webgl]');

  if (element === null) throw new Error('viewer wrapper was not rendered');
  return element;
}

function viewer(): TeardownViewerHandle {
  if (viewerCapture.current === null) throw new Error('viewer handle was not captured');
  return viewerCapture.current;
}

function sceneProps(): SceneStubProps {
  const props = sceneCapture.props.at(-1);

  if (props === undefined) throw new Error('Scene was not rendered');
  return props as unknown as SceneStubProps;
}

function settledEvent(phase: SettlePhase, at: number): SettledOverlayEvent {
  return {
    kind: 'settled',
    phase,
    at,
    frame: { layers: [], components: [] },
    width: 800,
    height: 600,
    offsetY: 0,
  };
}

async function mount(clock: ViewerClock, handlers: HandlerProps = {}): Promise<void> {
  await act(async () => root?.render(<ViewerHarness clock={clock} {...handlers} />));
}

async function driveStats(stats: ViewerStats = STATS): Promise<void> {
  await act(async () => sceneProps().onStats?.(stats));
}

async function driveOverlay(event: OverlayEventStub): Promise<void> {
  await act(async () => sceneProps().onOverlay?.(event));
}

async function advance(clock: ViewerClock, seconds: number): Promise<void> {
  await act(async () => {
    clock.advance(seconds);
    await Promise.resolve();
  });
}

async function flushMicrotasks(): Promise<void> {
  await act(async () => Promise.resolve());
}

test('the Scene stub no longer receives onSettled from TeardownViewer', async () => {
  await mount(createFakeClock());

  expect(sceneProps()).not.toHaveProperty('onSettled');
});

test('the first stats callback emits ready once and later stats callbacks do nothing', async () => {
  const onReady = vi.fn();

  await mount(createFakeClock(), { onReady });
  await driveStats();

  expect(onReady).toHaveBeenCalledTimes(1);
  expect(wrapper().dataset.xploderReady).toBe('true');
  expect(domEvents).toEqual([{ name: 'xploder:ready', detail: {} }]);

  await driveStats({ ...STATS, frame: 2 });

  expect(onReady).toHaveBeenCalledTimes(1);
  expect(domEvents).toEqual([{ name: 'xploder:ready', detail: {} }]);
});

test('settled emits once per call with phase and at, while moving emits nothing', async () => {
  const onSettled = vi.fn();

  await mount(createFakeClock(), { onSettled });
  await driveStats();
  await driveOverlay(settledEvent('exploded', 1));

  expect(onSettled).toHaveBeenCalledTimes(1);
  expect(onSettled).toHaveBeenCalledWith('exploded');
  expect(domEvents).toEqual([
    { name: 'xploder:ready', detail: {} },
    { name: 'xploder:settled', detail: { phase: 'exploded', at: 1 } },
  ]);

  await driveOverlay({ kind: 'moving', at: 2 });

  expect(onSettled).toHaveBeenCalledTimes(1);
  expect(domEvents).toHaveLength(2);
});

test('a settle before the first stats callback is delivered immediately after ready', async () => {
  const order: string[] = [];
  const onReady = vi.fn(() => order.push('ready'));
  const onSettled = vi.fn((phase: SettlePhase) => order.push(`settled:${phase}`));

  await mount(createFakeClock(), { onReady, onSettled });
  await driveOverlay(settledEvent('zoomed', 3));

  expect(onSettled).not.toHaveBeenCalled();
  expect(domEvents).toEqual([]);

  await driveStats();

  expect(order).toEqual(['ready', 'settled:zoomed']);
  expect(domEvents).toEqual([
    { name: 'xploder:ready', detail: {} },
    { name: 'xploder:settled', detail: { phase: 'zoomed', at: 3 } },
  ]);
});

test('a two-step tour emits tour-ended once when it reaches ended', async () => {
  const clock = createFakeClock();
  const onTourEnded = vi.fn();

  await mount(clock, { onTourEnded });
  await driveStats();
  await act(async () => viewer().actions.play());

  expect(viewer().tour.status).toBe('playing');

  await advance(clock, motion.durations.tourBeat);
  expect(viewer().tour.status).toBe('playing');

  await advance(clock, motion.durations.tourBeat);
  await flushMicrotasks();

  expect(viewer().tour.status).toBe('ended');
  expect(onTourEnded).toHaveBeenCalledTimes(1);
  expect(onTourEnded).toHaveBeenCalledWith('flow');
  expect(domEvents.filter((event) => event.name === 'xploder:tour-ended')).toEqual([
    { name: 'xploder:tour-ended', detail: { flowId: 'flow' } },
  ]);
});

test('pauseTour and stop are not tour ends', async () => {
  const clock = createFakeClock();
  const onTourEnded = vi.fn();

  await mount(clock, { onTourEnded });
  await driveStats();
  await act(async () => viewer().actions.play());
  await act(async () => viewer().actions.pauseTour());

  expect(viewer().tour.status).toBe('paused');
  await flushMicrotasks();
  expect(onTourEnded).not.toHaveBeenCalled();

  await act(async () => viewer().actions.play());
  expect(viewer().tour.status).toBe('playing');
  await act(async () => viewer().actions.stop());

  expect(viewer().tour.status).toBe('idle');
  await flushMicrotasks();
  expect(onTourEnded).not.toHaveBeenCalled();
  expect(domEvents.filter((event) => event.name === 'xploder:tour-ended')).toEqual([]);
});
