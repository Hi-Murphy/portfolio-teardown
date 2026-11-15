import { createEngineClock, type ClockHost, type EngineClock } from './clock';

const MILLISECONDS_PER_SECOND = 1000;

/** A deterministic engine clock driven manually by tests. */
export interface FakeClock extends EngineClock {
  /** Advances host time, firing due timers in order; returns at the target time. */
  advance(seconds: number): void;
  /** The number of host timers currently armed by the engine clock. */
  readonly pendingTimers: number;
}

/** Creates a fake engine clock starting at `startSeconds` (default zero). */
export function createFakeClock(startSeconds = 0): FakeClock {
  interface HostTimer {
    readonly due: number;
    readonly sequence: number;
    readonly callback: () => void;
  }

  const timers = new Map<number, HostTimer>();
  let current = startSeconds;
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

  const clock = createEngineClock(host);

  function advance(seconds: number): void {
    const target = current + seconds;

    while (true) {
      let nextHandle: number | undefined;
      let nextTimer: HostTimer | undefined;

      for (const [handle, timer] of timers) {
        if (timer.due > target) continue;

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
      current = nextTimer.due;
      nextTimer.callback();
    }

    current = target;
  }

  return {
    now: clock.now,
    get paused() {
      return clock.paused;
    },
    schedule: clock.schedule,
    subscribe: clock.subscribe,
    pause: clock.pause,
    resume: clock.resume,
    advance,
    get pendingTimers() {
      return timers.size;
    },
  };
}
