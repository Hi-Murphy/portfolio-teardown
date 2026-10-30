import ReactThreeTestRenderer from '@react-three/test-renderer';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { motion } from '../src/motion';
import {
  useTeardownViewer,
  type TeardownViewerHandle,
  type ViewerProject,
} from '../src/react/useTeardownViewer';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const projectA: ViewerProject = {
  meta: { slug: 'project-a' },
  layers: [
    {
      id: 'ui',
      name: 'UI',
      components: [
        { id: 'view', name: 'View', summary: 'Renders the interface.' },
        { id: 'cache', name: 'Cache' },
      ],
    },
    {
      id: 'data',
      name: 'Data',
      components: [{ id: 'store', name: 'Store', summary: 'Keeps durable state.' }],
    },
  ],
  flows: [
    {
      id: 'live-update',
      label: 'Live update',
      description: 'Follow a refresh through the system.',
      path: ['view', 'store'],
    },
    { id: 'offline-read', label: 'Offline read', path: ['cache', 'store'] },
  ],
};

const projectB: ViewerProject = {
  meta: { slug: 'project-b' },
  layers: [
    {
      id: 'edge',
      name: 'Edge',
      components: [{ id: 'request', name: 'Request' }],
    },
  ],
  flows: [{ id: 'request-flow', label: 'Request', path: ['request', 'request'] }],
};

class FakeMediaQueryList {
  matches = false;
  private readonly listeners = new Set<() => void>();

  addEventListener(type: string, listener: () => void): void {
    if (type === 'change') this.listeners.add(listener);
  }

  removeEventListener(type: string, listener: () => void): void {
    if (type === 'change') this.listeners.delete(listener);
  }

  setMatches(matches: boolean): void {
    this.matches = matches;
    for (const listener of this.listeners) listener();
  }
}

class FakeWindow {
  readonly media = new FakeMediaQueryList();
  private readonly listeners = new Map<string, Set<EventListener>>();

  matchMedia(): MediaQueryList {
    return this.media as unknown as MediaQueryList;
  }

  addEventListener(type: string, listener: EventListenerOrEventListenerObject): void {
    const callback =
      typeof listener === 'function' ? listener : (event: Event) => listener.handleEvent(event);
    const bucket = this.listeners.get(type) ?? new Set<EventListener>();

    bucket.add(callback);
    this.listeners.set(type, bucket);
  }

  removeEventListener(type: string, listener: EventListenerOrEventListenerObject): void {
    const bucket = this.listeners.get(type);

    if (bucket === undefined) return;

    if (typeof listener === 'function') {
      bucket.delete(listener);
    } else {
      bucket.delete((event: Event) => listener.handleEvent(event));
    }
  }

  dispatch(type: string, event: Event): Event {
    for (const listener of [...(this.listeners.get(type) ?? [])]) listener(event);
    return event;
  }

  listenerCount(type: string): number {
    return this.listeners.get(type)?.size ?? 0;
  }
}

interface ProbeProps {
  readonly project: ViewerProject;
  readonly now: () => number;
  readonly capture: (viewer: TeardownViewerHandle) => void;
}

function Probe({ project, now, capture }: ProbeProps) {
  capture(useTeardownViewer({ project, now }));
  return null;
}

let browser: FakeWindow;

beforeEach(() => {
  browser = new FakeWindow();
  Object.defineProperty(globalThis, 'window', { configurable: true, value: browser });
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  Reflect.deleteProperty(globalThis, 'window');
});

async function mount(project: ViewerProject, now: () => number) {
  let viewer: TeardownViewerHandle | null = null;
  const capture = (next: TeardownViewerHandle) => {
    viewer = next;
  };
  const element = (nextProject: ViewerProject) => (
    <Probe project={nextProject} now={now} capture={capture} />
  );
  const renderer = await ReactThreeTestRenderer.create(element(project));
  const current = (): TeardownViewerHandle => {
    if (viewer === null) throw new Error('viewer handle was not captured');
    return viewer;
  };

  return {
    renderer,
    current,
    update: (nextProject: ViewerProject) => renderer.update(element(nextProject)),
  };
}

async function run(action: () => void): Promise<void> {
  await ReactThreeTestRenderer.act(async () => action());
}

function escapeEvent(prevented = false): Event {
  const event = new Event('keydown', { cancelable: true });

  Object.defineProperty(event, 'key', { value: 'Escape' });
  if (prevented) event.preventDefault();
  return event;
}

describe('useTeardownViewer interaction handle', () => {
  test('play auto-explodes and starts the first flow', async () => {
    const now = 0;
    const { renderer, current } = await mount(projectA, () => now);

    try {
      expect(current().target).toBe('imploded');
      expect(current().tour.flows).toEqual([
        { id: 'live-update', label: 'Live update' },
        { id: 'offline-read', label: 'Offline read' },
      ]);

      await run(() => current().actions.play());

      expect(current().target).toBe('exploded');
      expect(current().tour).toMatchObject({
        flowId: 'live-update',
        status: 'playing',
        step: 0,
        total: 2,
        showFlowSelector: true,
      });
      expect(current().focus.suspended).toBe(true);
    } finally {
      await renderer.unmount();
    }
  });

  test('plays, pauses, resumes, and stops', async () => {
    let now = 0;
    const { renderer, current } = await mount(projectA, () => now);

    try {
      await run(() => current().actions.play());
      expect(current().tour.status).toBe('playing');

      now = 0.5;
      await run(() => current().actions.pause());
      expect(current().tour.status).toBe('paused');
      expect(current().tour.step).toBe(0);

      now = 2.5;
      expect(current().tour.step).toBe(0);

      await run(() => current().actions.play());
      expect(current().tour.status).toBe('playing');
      expect(current().tour.step).toBe(0);

      await run(() => current().actions.stop());
      expect(current().tour).toMatchObject({ status: 'idle', step: -1 });
    } finally {
      await renderer.unmount();
    }
  });

  test('keeps focus stored but suspended during the tour, then restores it on stop', async () => {
    const now = 0;
    const { renderer, current } = await mount(projectA, () => now);

    try {
      await run(() => current().actions.toggleFocus('data'));
      expect(current().focus).toEqual({ layerId: 'data', suspended: false });

      await run(() => current().actions.play());
      expect(current().focus).toEqual({ layerId: 'data', suspended: true });

      await run(() => current().actions.stop());
      expect(current().focus).toEqual({ layerId: 'data', suspended: false });
    } finally {
      await renderer.unmount();
    }
  });

  test('Escape stops the tour first, then releases focus, and ignores prevented events', async () => {
    const now = 0;
    const { renderer, current } = await mount(projectA, () => now);

    try {
      expect(browser.listenerCount('keydown')).toBe(0);

      await run(() => current().actions.toggleFocus('data'));
      await run(() => current().actions.play());
      expect(browser.listenerCount('keydown')).toBe(1);

      await run(() => browser.dispatch('keydown', escapeEvent(true)));
      expect(current().tour.status).toBe('playing');
      expect(current().focus.layerId).toBe('data');

      await run(() => browser.dispatch('keydown', escapeEvent()));
      expect(current().tour.status).toBe('idle');
      expect(current().focus).toEqual({ layerId: 'data', suspended: false });
      expect(browser.listenerCount('keydown')).toBe(1);

      const released = escapeEvent();

      await run(() => browser.dispatch('keydown', released));
      expect(current().focus.layerId).toBeNull();
      expect(released.defaultPrevented).toBe(true);
      expect(browser.listenerCount('keydown')).toBe(0);

      const ignored = escapeEvent();

      await run(() => browser.dispatch('keydown', ignored));
      expect(ignored.defaultPrevented).toBe(false);
    } finally {
      await renderer.unmount();
    }
  });

  test('a slug change resets highlight, focus, and tour', async () => {
    const now = 0;
    const { renderer, current, update } = await mount(projectA, () => now);

    try {
      await run(() => current().actions.highlight('view'));
      await run(() => current().actions.toggleFocus('data'));
      await run(() => current().actions.play());
      expect(current().highlight).toBe('view');
      expect(current().focus.layerId).toBe('data');
      expect(current().tour.status).toBe('playing');

      await update(projectB);

      expect(current().highlight).toBeNull();
      expect(current().focus).toEqual({ layerId: null, suspended: false });
      expect(current().tour).toMatchObject({
        flowId: 'request-flow',
        status: 'idle',
        step: -1,
        total: 2,
        showFlowSelector: false,
      });
    } finally {
      await renderer.unmount();
    }
  });

  test('selectFlow stops a playing tour and selects the new flow in idle', async () => {
    const now = 0;
    const { renderer, current } = await mount(projectA, () => now);

    try {
      await run(() => current().actions.play());
      await run(() => current().actions.selectFlow('offline-read'));

      expect(current().tour).toMatchObject({
        flowId: 'offline-read',
        status: 'idle',
        step: -1,
      });
    } finally {
      await renderer.unmount();
    }
  });

  test('ignores unknown component, layer, and flow ids', async () => {
    const now = 0;
    const { renderer, current } = await mount(projectA, () => now);

    try {
      await run(() => current().actions.highlight('missing'));
      await run(() => current().actions.toggleFocus('missing'));
      await run(() => current().actions.selectFlow('missing'));

      expect(current().highlight).toBeNull();
      expect(current().focus.layerId).toBeNull();
      expect(current().tour.flowId).toBe('live-update');
    } finally {
      await renderer.unmount();
    }
  });

  test('advances at the base tourBeat under the reduced-motion twin', async () => {
    browser.media.matches = true;

    let now = 0;
    const { renderer, current } = await mount(projectA, () => now);

    try {
      await run(() => current().actions.play());
      expect(current().tour.step).toBe(0);

      await ReactThreeTestRenderer.act(async () => {
        now = motion.durations.tourBeat;
        vi.advanceTimersByTime(motion.durations.tourBeat * 1_000);
      });

      expect(current().tour.status).toBe('playing');
      expect(current().tour.step).toBe(1);
    } finally {
      await renderer.unmount();
    }
  });
});
