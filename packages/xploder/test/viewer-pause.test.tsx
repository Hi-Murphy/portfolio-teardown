import ReactThreeTestRenderer from '@react-three/test-renderer';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import { motion } from '../src/motion';
import {
  useTeardownViewer,
  type TeardownViewerHandle,
  type ViewerProject,
} from '../src/react/useTeardownViewer';
import { createFakeClock, type FakeClock } from '../src/time/fake';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const CLOCK_TOLERANCE_SECONDS = 1e-9;
const PAUSED_HOST_SECONDS = 3;

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
  readonly clock: FakeClock;
  readonly capture: (viewer: TeardownViewerHandle) => void;
}

function Probe({ project, clock, capture }: ProbeProps) {
  capture(useTeardownViewer({ project, clock }));
  return null;
}

async function mount(project: ViewerProject, clock: FakeClock, capture?: () => void) {
  let viewer: TeardownViewerHandle | null = null;
  const renderer = await ReactThreeTestRenderer.create(
    <Probe
      project={project}
      clock={clock}
      capture={(next) => {
        viewer = next;
        capture?.();
      }}
    />,
  );
  const current = (): TeardownViewerHandle => {
    if (viewer === null) throw new Error('viewer handle was not captured');
    return viewer;
  };

  return { renderer, current };
}

async function run(action: () => void): Promise<void> {
  await ReactThreeTestRenderer.act(async () => action());
}

async function advance(clock: FakeClock, seconds: number): Promise<void> {
  await ReactThreeTestRenderer.act(async () => clock.advance(seconds));
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

describe('whole-scene pause', () => {
  test('pause freezes the pending tour boundary and resume continues it exactly', async () => {
    const beat = motion.durations.tourBeat;
    const halfBeat = beat / 2;
    const clock = createFakeClock();
    const { renderer, current } = await mount(threeStepProject, clock);

    try {
      await run(() => current().actions.play());
      expect(current().tour.status).toBe('playing');

      await advance(clock, halfBeat);
      expect(current().tour.step).toBe(0);

      await run(() => current().actions.pause());
      expect(current().paused).toBe(true);
      expect(current().tour.status).toBe('paused');

      const frozenAt = clock.now();

      await advance(clock, PAUSED_HOST_SECONDS);
      expect(current().tour.step).toBe(0);
      expect(current().tour.status).toBe('paused');
      expect(clock.now()).toBeCloseTo(frozenAt, 9);

      await run(() => current().actions.resume());
      expect(current().paused).toBe(false);
      expect(current().tour.status).toBe('playing');

      await advance(clock, halfBeat - CLOCK_TOLERANCE_SECONDS);
      expect(current().tour.step).toBe(0);

      await advance(clock, CLOCK_TOLERANCE_SECONDS);
      expect(current().tour.step).toBe(1);
      expect(clock.now()).toBeCloseTo(beat, 9);
    } finally {
      await renderer.unmount();
    }
  });

  test('pauseTour pauses only the tour and play resumes it', async () => {
    const beat = motion.durations.tourBeat;
    const clock = createFakeClock();
    const { renderer, current } = await mount(threeStepProject, clock);

    try {
      await run(() => current().actions.play());
      await advance(clock, beat / 2);
      await run(() => current().actions.pauseTour());

      expect(current().tour.status).toBe('paused');
      expect(current().paused).toBe(false);

      await run(() => current().actions.play());
      expect(current().tour.status).toBe('playing');
      expect(current().paused).toBe(false);

      await advance(clock, beat / 2);
      expect(current().tour.step).toBe(1);
    } finally {
      await renderer.unmount();
    }
  });

  test('pause and resume are idempotent and paused re-renders on transition', async () => {
    const clock = createFakeClock();
    let renders = 0;
    let transitions = 0;
    const unsubscribe = clock.subscribe(() => {
      transitions += 1;
    });
    const { renderer, current } = await mount(threeStepProject, clock, () => {
      renders += 1;
    });

    try {
      const beforePause = renders;

      await run(() => {
        current().actions.pause();
        current().actions.pause();
      });

      expect(current().paused).toBe(true);
      expect(renders).toBeGreaterThan(beforePause);
      expect(transitions).toBe(1);

      const beforeResume = renders;

      await run(() => {
        current().actions.resume();
        current().actions.resume();
      });

      expect(current().paused).toBe(false);
      expect(renders).toBeGreaterThan(beforeResume);
      expect(transitions).toBe(2);
    } finally {
      unsubscribe();
      await renderer.unmount();
    }
  });

  test('a command while paused is accepted without resuming the scene', async () => {
    const clock = createFakeClock();
    const { renderer, current } = await mount(threeStepProject, clock);

    try {
      expect(current().target).toBe('imploded');

      await run(() => current().actions.pause());
      await run(() => current().actions.explode());

      expect(current().target).toBe('exploded');
      expect(current().paused).toBe(true);
    } finally {
      await renderer.unmount();
    }
  });

  test('pause while the tour is idle leaves it idle and resume does not start it', async () => {
    const beat = motion.durations.tourBeat;
    const clock = createFakeClock();
    const { renderer, current } = await mount(threeStepProject, clock);

    try {
      expect(current().tour.status).toBe('idle');

      await run(() => current().actions.pause());
      expect(current().paused).toBe(true);
      expect(current().tour.status).toBe('idle');

      await advance(clock, PAUSED_HOST_SECONDS);
      expect(current().tour.status).toBe('idle');

      await run(() => current().actions.resume());
      expect(current().paused).toBe(false);
      expect(current().tour.status).toBe('idle');

      await advance(clock, beat);
      expect(current().tour.status).toBe('idle');
      expect(current().tour.step).toBe(-1);
    } finally {
      await renderer.unmount();
    }
  });

  test('play resumes the clock and the tour after a whole-scene pause', async () => {
    const beat = motion.durations.tourBeat;
    const halfBeat = beat / 2;
    const clock = createFakeClock();
    const { renderer, current } = await mount(threeStepProject, clock);

    try {
      await run(() => current().actions.play());
      await advance(clock, halfBeat);
      await run(() => current().actions.pause());

      expect(current().paused).toBe(true);
      expect(current().tour.status).toBe('paused');

      await advance(clock, PAUSED_HOST_SECONDS);
      await run(() => current().actions.play());

      expect(current().paused).toBe(false);
      expect(current().tour.status).toBe('playing');

      await advance(clock, halfBeat - CLOCK_TOLERANCE_SECONDS);
      expect(current().tour.step).toBe(0);

      await advance(clock, CLOCK_TOLERANCE_SECONDS);
      expect(current().tour.step).toBe(1);
      expect(clock.now()).toBeCloseTo(beat, 9);
    } finally {
      await renderer.unmount();
    }
  });
});
