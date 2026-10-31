import ReactThreeTestRenderer from '@react-three/test-renderer';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { motion } from '../src/motion';
import {
  useTeardownViewer,
  type TeardownViewerHandle,
  type ViewerProject,
} from '../src/react/useTeardownViewer';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const MILLISECONDS_PER_SECOND = 1_000;

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
  ],
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
}

class FakeWindow {
  readonly media = new FakeMediaQueryList();

  matchMedia(): MediaQueryList {
    return this.media as unknown as MediaQueryList;
  }

  addEventListener(): void {}

  removeEventListener(): void {}
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

beforeEach(() => {
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: new FakeWindow(),
  });
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  Reflect.deleteProperty(globalThis, 'window');
});

describe('useTourClock', () => {
  test('advances through every beat when the clock lags the timer', async () => {
    const beatMilliseconds = motion.durations.tourBeat * MILLISECONDS_PER_SECOND;
    const lagSeconds = motion.staggers.explodeComponent / MILLISECONDS_PER_SECOND;
    const path = projectA.flows?.[0]?.path ?? [];

    // A non-zero timer clock makes the fractional delay below one beat round down,
    // reproducing a timer fire just before the injected clock reaches the boundary.
    vi.advanceTimersByTime(beatMilliseconds * MILLISECONDS_PER_SECOND);

    let viewer: TeardownViewerHandle | null = null;
    const stepped: string[] = [];
    const capture = (next: TeardownViewerHandle) => {
      viewer = next;
      const componentId = path[next.tour.step];

      if (componentId !== undefined && stepped.at(-1) !== componentId) {
        stepped.push(componentId);
      }
    };
    const renderer = await ReactThreeTestRenderer.create(
      <Probe
        project={projectA}
        now={() => performance.now() / MILLISECONDS_PER_SECOND - lagSeconds}
        capture={capture}
      />,
    );
    const current = (): TeardownViewerHandle => {
      if (viewer === null) throw new Error('viewer handle was not captured');
      return viewer;
    };

    try {
      await ReactThreeTestRenderer.act(async () => current().actions.play());

      for (let index = 0; index < path.length; index += 1) {
        await ReactThreeTestRenderer.act(async () => {
          vi.advanceTimersByTime(beatMilliseconds);
        });
      }

      expect(stepped).toEqual(path);
      expect(current().tour.status).toBe('ended');
    } finally {
      await renderer.unmount();
    }
  });
});
