const MILLISECONDS_PER_SECOND = 1000;

/** Injectable host time and timer primitives for the engine clock. */
export interface ClockHost {
  /** Returns monotonic host time in seconds. */
  now(): number;
  /** Arms a host timer that calls `callback` after `delayMs` milliseconds. */
  setTimer(callback: () => void, delayMs: number): unknown;
  /** Clears a host timer returned by `setTimer`. */
  clearTimer(handle: unknown): void;
}

/** Read-only engine time in seconds, including pausable scheduling. */
export interface ClockReader {
  /** Returns engine seconds, frozen while paused. */
  now(): number;
  /** Whether engine time is currently paused. */
  readonly paused: boolean;
  /** Schedules `callback` for `from + delaySeconds`; returns an idempotent cancel. */
  schedule(delaySeconds: number, callback: () => void, from?: number): () => void;
  /** Subscribes to real pause transitions; returns an unsubscribe function. */
  subscribe(listener: (paused: boolean) => void): () => void;
}

/** A readable engine clock that can be paused and resumed. */
export interface EngineClock extends ClockReader {
  /** Pauses engine time and suspends scheduled work. */
  pause(): void;
  /** Resumes engine time and re-arms suspended scheduled work. */
  resume(): void;
}

/** Browser host backed by the browser performance clock and host timers. */
export const browserHost: ClockHost = {
  now: () => performance.now() / MILLISECONDS_PER_SECOND,
  setTimer: (callback, delayMs) => setTimeout(callback, delayMs),
  clearTimer: (handle) => clearTimeout(handle as ReturnType<typeof setTimeout>),
};

/** Creates a pausable engine clock using `host` or the browser host. */
export function createEngineClock(host: ClockHost = browserHost): EngineClock {
  interface TimerRecord {
    readonly due: number;
    readonly callback: () => void;
    handle: unknown;
    armed: boolean;
    remaining: number;
  }

  const timers = new Set<TimerRecord>();
  const listeners = new Set<(paused: boolean) => void>();
  let pausedTotal = 0;
  let pausedAt = 0;
  let frozen = 0;
  let isPaused = false;

  function notify(value: boolean): void {
    for (const listener of [...listeners]) {
      listener(value);
    }
  }

  function arm(timer: TimerRecord, delayMs: number): void {
    timer.armed = true;
    timer.handle = host.setTimer(() => {
      if (!timer.armed || !timers.has(timer)) return;

      timer.armed = false;
      timers.delete(timer);
      timer.callback();
    }, delayMs);
  }

  function now(): number {
    return isPaused ? frozen : host.now() - pausedTotal;
  }

  return {
    now,
    get paused() {
      return isPaused;
    },
    schedule(delaySeconds, callback, from) {
      const due = (from ?? now()) + delaySeconds;
      const timer: TimerRecord = {
        due,
        callback,
        handle: undefined,
        armed: false,
        remaining: due - frozen,
      };

      timers.add(timer);
      if (!isPaused) {
        arm(timer, Math.max(0, delaySeconds) * MILLISECONDS_PER_SECOND);
      }

      return () => {
        if (!timers.delete(timer)) return;

        if (timer.armed) {
          host.clearTimer(timer.handle);
          timer.armed = false;
        }
      };
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    pause() {
      if (isPaused) return;

      const hostAt = host.now();
      frozen = hostAt - pausedTotal;
      pausedAt = hostAt;
      isPaused = true;

      for (const timer of timers) {
        if (timer.armed) {
          host.clearTimer(timer.handle);
          timer.armed = false;
        }
        timer.remaining = timer.due - frozen;
      }

      notify(true);
    },
    resume() {
      if (!isPaused) return;

      const hostAt = host.now();
      pausedTotal += hostAt - pausedAt;
      isPaused = false;

      for (const timer of timers) {
        arm(timer, Math.max(0, timer.remaining) * MILLISECONDS_PER_SECOND);
      }

      notify(false);
    },
  };
}

/** Creates a pausable engine clock whose host time is the injected `now()` in seconds. */
export function clockFromNow(now: () => number): EngineClock {
  return createEngineClock({
    now: () => now(),
    setTimer: (callback, delayMs) => globalThis.setTimeout(callback, delayMs),
    clearTimer: (handle) =>
      globalThis.clearTimeout(handle as ReturnType<typeof globalThis.setTimeout>),
  });
}

/** Returns host time in milliseconds for DOM event-timestamp comparisons. */
export function hostNow(): number {
  return performance.now();
}
