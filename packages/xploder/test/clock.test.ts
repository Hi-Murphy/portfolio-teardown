import { afterEach, describe, expect, test, vi } from 'vitest';

import {
  browserHost,
  clockFromNow,
  createEngineClock,
  hostNow,
  type ClockHost,
} from '../src/time/clock';
import { createFakeClock } from '../src/time/fake';

afterEach(() => {
  vi.unstubAllGlobals();
});

function createCountingHost(startSeconds: number): {
  readonly host: ClockHost;
  reads(): number;
  advance(seconds: number): void;
} {
  let current = startSeconds;
  let readCount = 0;
  let nextHandle = 1;

  return {
    host: {
      now() {
        readCount += 1;
        return current;
      },
      setTimer() {
        const handle = nextHandle;
        nextHandle += 1;
        return handle;
      },
      clearTimer() {},
    },
    reads: () => readCount,
    advance(seconds) {
      current += seconds;
    },
  };
}

describe('engine clock', () => {
  test('now() advances with host time and freezes while paused', () => {
    const clock = createFakeClock(10);

    expect(clock.now()).toBe(10);
    clock.advance(3);
    expect(clock.now()).toBe(13);

    clock.pause();
    clock.advance(7);
    expect(clock.now()).toBe(13);
    expect(clock.paused).toBe(true);
  });

  test('resume continues from the last running value without a jump', () => {
    const clock = createFakeClock(10);

    clock.advance(0.25);
    const lastRunning = clock.now();
    clock.pause();
    clock.advance(5);
    clock.resume();

    expect(clock.now()).toBe(lastRunning);
    clock.advance(0.5);
    expect(clock.now()).toBe(lastRunning + 0.5);
  });

  test('pause and resume are idempotent and notify once per transition', () => {
    const clock = createFakeClock();
    const transitions: boolean[] = [];
    const unsubscribe = clock.subscribe((paused) => transitions.push(paused));

    clock.pause();
    clock.pause();
    expect(transitions).toEqual([true]);

    clock.resume();
    clock.resume();
    expect(transitions).toEqual([true, false]);

    unsubscribe();
    clock.pause();
    expect(transitions).toEqual([true, false]);
  });

  test('pausing suspends a timer and preserves its remaining engine time', () => {
    const clock = createFakeClock();
    const fired: number[] = [];

    clock.schedule(0.4, () => fired.push(clock.now()));
    clock.advance(0.1);
    clock.pause();

    expect(clock.pendingTimers).toBe(0);
    clock.advance(5);
    expect(fired).toEqual([]);

    clock.resume();
    clock.advance(0.29);
    expect(fired).toEqual([]);
    clock.advance(0.01);

    expect(fired).toEqual([0.4]);
    expect(clock.now()).toBe(0.4);
  });

  test('timers fire in due order, cancellation is idempotent, and paused schedules wait for resume', () => {
    const clock = createFakeClock();
    const order: string[] = [];

    clock.schedule(0.3, () => order.push('third'));
    clock.schedule(0.1, () => order.push('first'));
    clock.schedule(0.2, () => order.push('second-a'));
    clock.schedule(0.2, () => order.push('second-b'));

    const cancel = clock.schedule(0.15, () => order.push('cancelled'));
    cancel();
    cancel();

    clock.advance(0.5);
    expect(order).toEqual(['first', 'second-a', 'second-b', 'third']);

    let resumedTimerFired = false;
    clock.pause();
    clock.schedule(2, () => {
      resumedTimerFired = true;
    });
    expect(clock.pendingTimers).toBe(0);

    clock.resume();
    clock.advance(1.99);
    expect(resumedTimerFired).toBe(false);
    clock.advance(0.01);
    expect(resumedTimerFired).toBe(true);
  });

  test('schedule with from makes no host read and now makes exactly the required reads', () => {
    const manual = createCountingHost(10);
    const clock = createEngineClock(manual.host);

    const cancel = clock.schedule(2, () => {}, 5);
    expect(manual.reads()).toBe(0);

    expect(clock.now()).toBe(10);
    expect(manual.reads()).toBe(1);

    clock.pause();
    const readsAtPause = manual.reads();
    manual.advance(3);
    expect(clock.now()).toBe(10);
    expect(manual.reads()).toBe(readsAtPause);

    clock.resume();
    const readsAtResume = manual.reads();
    clock.now();
    expect(manual.reads()).toBe(readsAtResume + 1);

    cancel();
  });

  test('clockFromNow preserves injected values exactly and resolves timers at call time', () => {
    for (const value of [0.1 + 0.2, 1e-7]) {
      const clock = clockFromNow(() => value);

      expect(clock.now()).toBe(value);
    }

    const clock = clockFromNow(() => 0.1 + 0.2);
    const setTimeoutStub = vi.fn(() => 17);
    const clearTimeoutStub = vi.fn();
    vi.stubGlobal('setTimeout', setTimeoutStub);
    vi.stubGlobal('clearTimeout', clearTimeoutStub);

    const cancel = clock.schedule(0.2, () => {}, 0);
    expect(setTimeoutStub).toHaveBeenCalledWith(expect.any(Function), 200);

    cancel();
    expect(clearTimeoutStub).toHaveBeenCalledWith(17);
  });

  test('browserHost and hostNow read the stubbed performance clock', () => {
    vi.stubGlobal('performance', { now: () => 1234.5 });

    expect(browserHost.now()).toBe(1.2345);
    expect(hostNow()).toBe(1234.5);
  });
});
