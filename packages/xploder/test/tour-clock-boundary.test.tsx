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
const EARLY_TICK_SECONDS = 0.0004;
const LATE_EFFECT_SECONDS = 0.0002;

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
  readonly now: () => number;
  readonly capture: (viewer: TeardownViewerHandle) => void;
}

function Probe({ project, now, capture }: ProbeProps) {
  capture(useTeardownViewer({ project, now }));
  return null;
}

interface RaceClock {
  readonly now: () => number;
  set(seconds: number): void;
  armFinalBoundary(boundary: number): void;
}

function createRaceClock(): RaceClock {
  let seconds = 0;
  let race: { early: number; late: number; preBoundaryCalls: number } | null = null;

  return {
    now: () => {
      if (race === null) return seconds;
      if (race.preBoundaryCalls > 0) {
        race.preBoundaryCalls -= 1;
        return race.early;
      }
      return race.late;
    },
    set: (next) => {
      seconds = next;
    },
    armFinalBoundary: (boundary) => {
      race = {
        early: boundary - EARLY_TICK_SECONDS,
        late: boundary + LATE_EFFECT_SECONDS,
        preBoundaryCalls: 2,
      };
    },
  };
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

describe('useTourClock final boundary', () => {
  test('ends when the final tick fires just before the boundary', async () => {
    const beat = motion.durations.tourBeat;
    const beatMilliseconds = beat * MILLISECONDS_PER_SECOND;
    const clock = createRaceClock();
    let viewer: TeardownViewerHandle | null = null;
    const renderer = await ReactThreeTestRenderer.create(
      <Probe project={twoStepProject} now={clock.now} capture={(next) => (viewer = next)} />,
    );
    const current = (): TeardownViewerHandle => {
      if (viewer === null) throw new Error('viewer handle was not captured');
      return viewer;
    };

    try {
      await ReactThreeTestRenderer.act(async () => current().actions.play());

      clock.set(beat);
      await ReactThreeTestRenderer.act(async () => {
        vi.advanceTimersByTime(beatMilliseconds);
      });
      expect(current().tour).toMatchObject({ status: 'playing', step: 1 });

      clock.armFinalBoundary(beat * 2);
      await ReactThreeTestRenderer.act(async () => {
        vi.advanceTimersByTime(beatMilliseconds + 5);
      });

      expect(current().tour.status).toBe('ended');
    } finally {
      await renderer.unmount();
    }
  });

  test('ends when the final tick fires on time', async () => {
    const beat = motion.durations.tourBeat;
    const beatMilliseconds = beat * MILLISECONDS_PER_SECOND;
    const clock = createRaceClock();
    let viewer: TeardownViewerHandle | null = null;
    const renderer = await ReactThreeTestRenderer.create(
      <Probe project={twoStepProject} now={clock.now} capture={(next) => (viewer = next)} />,
    );
    const current = (): TeardownViewerHandle => {
      if (viewer === null) throw new Error('viewer handle was not captured');
      return viewer;
    };

    try {
      await ReactThreeTestRenderer.act(async () => current().actions.play());

      clock.set(beat);
      await ReactThreeTestRenderer.act(async () => {
        vi.advanceTimersByTime(beatMilliseconds);
      });
      expect(current().tour).toMatchObject({ status: 'playing', step: 1 });

      clock.set(beat * 2);
      await ReactThreeTestRenderer.act(async () => {
        vi.advanceTimersByTime(beatMilliseconds);
      });

      expect(current().tour).toMatchObject({ status: 'ended', step: 1 });
    } finally {
      await renderer.unmount();
    }
  });

  test('advances intermediate steps at the same beats', async () => {
    const path = threeStepProject.flows?.[0]?.path ?? [];
    const beat = motion.durations.tourBeat;
    const beatMilliseconds = beat * MILLISECONDS_PER_SECOND;
    const clock = createRaceClock();
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
      <Probe project={threeStepProject} now={clock.now} capture={capture} />,
    );
    const current = (): TeardownViewerHandle => {
      if (viewer === null) throw new Error('viewer handle was not captured');
      return viewer;
    };

    try {
      await ReactThreeTestRenderer.act(async () => current().actions.play());

      for (let step = 1; step < path.length; step += 1) {
        clock.set(step * beat);
        await ReactThreeTestRenderer.act(async () => {
          vi.advanceTimersByTime(beatMilliseconds);
        });
        expect(current().tour).toMatchObject({ status: 'playing', step });
      }

      clock.set(path.length * beat);
      await ReactThreeTestRenderer.act(async () => {
        vi.advanceTimersByTime(beatMilliseconds);
      });

      expect(stepped).toEqual(path);
      expect(current().tour).toMatchObject({ status: 'ended', step: path.length - 1 });
    } finally {
      await renderer.unmount();
    }
  });
});
