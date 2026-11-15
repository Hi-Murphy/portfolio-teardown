import ReactThreeTestRenderer from '@react-three/test-renderer';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import { motion } from '../src/motion';
import {
  useTeardownViewer,
  type TeardownViewerHandle,
  type ViewerProject,
} from '../src/react/useTeardownViewer';
import { createEngineClock, type ClockHost, type ClockReader } from '../src/time/clock';
import { createFakeClock, type FakeClock } from '../src/time/fake';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const MILLISECONDS_PER_SECOND = 1_000;
const EARLY_TICK_SECONDS = 0.0004;

function projectWithPath(slug: string, path: readonly string[]): ViewerProject {
  return {
    meta: { slug },
    layers: [
      {
        id: 'layer',
        name: 'Layer',
        components: path.map((id) => ({ id, name: id })),
      },
    ],
    flows: [{ id: 'flow', label: 'Flow', path }],
  };
}

const twoStepProject = projectWithPath('project-two', ['first', 'second']);
const threeStepProject = projectWithPath('project-three', ['first', 'second', 'third']);

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
  readonly clock: ClockReader;
  readonly capture: (viewer: TeardownViewerHandle) => void;
}

function Probe({ project, clock, capture }: ProbeProps) {
  capture(useTeardownViewer({ project, clock }));
  return null;
}

interface AdvancingClock {
  advance(seconds: number): void;
}

interface ManualClock extends AdvancingClock {
  readonly host: ClockHost;
}

function createManualClock(): ManualClock {
  interface QueuedTimer {
    readonly due: number;
    readonly sequence: number;
    readonly callback: () => void;
  }

  const timers = new Map<number, QueuedTimer>();
  let current = 0;
  let nextHandle = 1;
  let nextSequence = 0;

  const host: ClockHost = {
    now: () => current,
    setTimer(callback, delayMs) {
      const handle = nextHandle;
      nextHandle += 1;
      timers.set(handle, {
        due: current + delayMs / MILLISECONDS_PER_SECOND,
        sequence: nextSequence,
        callback,
      });
      nextSequence += 1;
      return handle;
    },
    clearTimer(handle) {
      if (typeof handle === 'number') timers.delete(handle);
    },
  };

  function advance(seconds: number): void {
    const target = current + seconds;

    while (true) {
      let nextHandle: number | undefined;
      let nextTimer: QueuedTimer | undefined;

      for (const [handle, timer] of timers) {
        if (timer.due - EARLY_TICK_SECONDS > target) continue;

        if (
          nextTimer === undefined ||
          timer.due < nextTimer.due ||
          (timer.due === nextTimer.due && timer.sequence < nextTimer.sequence)
        ) {
          nextHandle = handle;
          nextTimer = timer;
        }
      }

      if (nextHandle === undefined || nextTimer === undefined) break;

      timers.delete(nextHandle);
      current = nextTimer.due - EARLY_TICK_SECONDS;
      nextTimer.callback();
    }

    current = target;
  }

  return { host, advance };
}

async function advance(clock: AdvancingClock, seconds: number): Promise<void> {
  await ReactThreeTestRenderer.act(async () => clock.advance(seconds));
}

async function mount(
  project: ViewerProject,
  clock: ClockReader,
  capture?: (viewer: TeardownViewerHandle) => void,
) {
  let viewer: TeardownViewerHandle | null = null;
  const renderer = await ReactThreeTestRenderer.create(
    <Probe
      project={project}
      clock={clock}
      capture={(next) => {
        viewer = next;
        capture?.(next);
      }}
    />,
  );
  const current = (): TeardownViewerHandle => {
    if (viewer === null) throw new Error('viewer handle was not captured');
    return viewer;
  };

  return { renderer, current };
}

beforeEach(() => {
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: new FakeWindow(),
  });
});

afterEach(() => {
  Reflect.deleteProperty(globalThis, 'window');
});

describe('useTourClock on the engine clock', () => {
  test('ends when the final tick fires just before the boundary', async () => {
    const beat = motion.durations.tourBeat;
    const manual = createManualClock();
    const clock = createEngineClock(manual.host);
    const { renderer, current } = await mount(twoStepProject, clock);

    try {
      await ReactThreeTestRenderer.act(async () => current().actions.play());

      await advance(manual, beat);
      expect(current().tour).toMatchObject({ status: 'playing', step: 1 });

      await advance(manual, beat + EARLY_TICK_SECONDS);

      expect(current().tour).toMatchObject({ status: 'ended', step: 1 });
    } finally {
      await renderer.unmount();
    }
  });

  test('ends when the final tick fires on time', async () => {
    const beat = motion.durations.tourBeat;
    const clock = createFakeClock();
    const { renderer, current } = await mount(twoStepProject, clock);

    try {
      await ReactThreeTestRenderer.act(async () => current().actions.play());

      await advance(clock, beat);
      expect(current().tour).toMatchObject({ status: 'playing', step: 1 });

      await advance(clock, beat);

      expect(current().tour).toMatchObject({ status: 'ended', step: 1 });
    } finally {
      await renderer.unmount();
    }
  });

  test('advances intermediate steps at the same beats', async () => {
    const beat = motion.durations.tourBeat;
    const path = threeStepProject.flows?.[0]?.path ?? [];
    const clock = createFakeClock();
    const visited: { readonly componentId: string; readonly at: number }[] = [];
    const { renderer, current } = await mount(threeStepProject, clock, (next) => {
      const componentId = path[next.tour.step];

      if (componentId !== undefined && visited.at(-1)?.componentId !== componentId) {
        visited.push({ componentId, at: clock.now() });
      }
    });

    try {
      await ReactThreeTestRenderer.act(async () => current().actions.play());

      for (let step = 1; step < path.length; step += 1) {
        await advance(clock, beat);
        expect(current().tour).toMatchObject({ status: 'playing', step });
      }

      await advance(clock, beat);

      expect(visited).toEqual(path.map((componentId, step) => ({ componentId, at: step * beat })));
      expect(current().tour).toMatchObject({ status: 'ended', step: path.length - 1 });
    } finally {
      await renderer.unmount();
    }
  });

  test('exposes the injected clock on the viewer handle', async () => {
    const clock: FakeClock = createFakeClock(2.5);
    const { renderer, current } = await mount(twoStepProject, clock);

    try {
      expect(current().clock).toBe(clock);
      expect(current().clock.now()).toBe(clock.now());
      expect(current().clock.now()).toBe(2.5);
    } finally {
      await renderer.unmount();
    }
  });
});
