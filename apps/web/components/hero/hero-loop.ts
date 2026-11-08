import { motion } from 'xploder/motion';

export const MS_PER_SECOND = 1_000;

export const HERO_LOOP_STEP_MS =
  (Math.max(motion.durations.explode, motion.durations.implode) + motion.durations.tourBeat) *
  MS_PER_SECOND;

export type HeroLoopState = 'running' | 'paused';

export interface HeroLoopActions {
  explode(): void;
  implode(): void;
  rotateRight(): void;
}

export interface HeroLoopOptions {
  readonly actions: HeroLoopActions;
  readonly schedule: (callback: () => void, delayMs: number) => unknown;
  readonly cancel: (handle: unknown) => void;
}

export interface HeroLoop {
  start(): void;
  pause(): void;
  resume(): void;
  dispose(): void;
  readonly state: HeroLoopState;
}

export function createHeroLoop({ actions, schedule, cancel }: HeroLoopOptions): HeroLoop {
  let state: HeroLoopState = 'paused';
  let disposed = false;
  let scheduled = false;
  let handle: unknown;
  let next: 'implode' | 'explode' = 'implode';

  const cancelPending = (): void => {
    if (!scheduled) return;

    cancel(handle);
    scheduled = false;
  };

  const scheduleNext = (): void => {
    scheduled = true;
    handle = schedule(() => {
      scheduled = false;
      if (disposed || state !== 'running') return;

      actions.rotateRight();
      if (next === 'implode') actions.implode();
      else actions.explode();
      next = next === 'implode' ? 'explode' : 'implode';
      scheduleNext();
    }, HERO_LOOP_STEP_MS);
  };

  const resume = (): void => {
    if (disposed || state === 'running') return;

    state = 'running';
    scheduleNext();
  };

  return {
    start: resume,
    resume,
    pause: () => {
      if (disposed) return;

      cancelPending();
      state = 'paused';
    },
    dispose: () => {
      if (disposed) return;

      disposed = true;
      cancelPending();
      state = 'paused';
    },
    get state() {
      return state;
    },
  };
}
