// @vitest-environment jsdom

import { afterEach, describe, expect, test, vi } from 'vitest';

import { loadStaged, yieldToMain, type Stage } from '../components/boot-3d';

type SchedulerWindow = Window & {
  scheduler?: {
    yield?: () => Promise<void>;
  };
};

interface TestPort {
  onmessage: ((event: MessageEvent) => void) | null;
  close: () => void;
}

const windowWithScheduler = window as SchedulerWindow;

afterEach(() => {
  delete windowWithScheduler.scheduler;
  vi.unstubAllGlobals();
});

describe('yieldToMain', () => {
  test('uses scheduler.yield when it is available', async () => {
    const yieldTask = vi.fn(async () => undefined);
    windowWithScheduler.scheduler = { yield: yieldTask };

    await yieldToMain();

    expect(yieldTask).toHaveBeenCalledTimes(1);
  });

  test('posts one MessageChannel task when scheduler.yield is unavailable', async () => {
    let port: TestPort | undefined;
    const close = vi.fn();
    const postMessage = vi.fn((value: unknown) => {
      void value;
      port?.onmessage?.({} as MessageEvent);
    });

    class MessageChannelStub {
      readonly port1: TestPort = { onmessage: null, close };
      readonly port2 = { postMessage };

      constructor() {
        port = this.port1;
      }
    }

    vi.stubGlobal('MessageChannel', MessageChannelStub);

    let settled = false;
    const pending = yieldToMain().then(() => {
      settled = true;
    });

    expect(settled).toBe(false);
    expect(postMessage).toHaveBeenCalledTimes(1);

    await pending;

    expect(settled).toBe(true);
    expect(close).toHaveBeenCalledTimes(1);
  });
});

describe('loadStaged', () => {
  test('awaits each stage and yields between them', async () => {
    const order: string[] = [];
    windowWithScheduler.scheduler = {
      yield: async () => {
        order.push('yield');
      },
    };
    const stages: Stage[] = [
      async () => {
        order.push('first');
      },
      async () => {
        order.push('second');
      },
    ];

    const loaded = await loadStaged(stages, new AbortController().signal);

    expect(loaded).toBe(true);
    expect(order).toEqual(['first', 'yield', 'second', 'yield']);
  });

  test('stops before the first stage when the signal is already aborted', async () => {
    const stage = vi.fn(async () => undefined);
    const controller = new AbortController();
    controller.abort();

    const loaded = await loadStaged([stage], controller.signal);

    expect(loaded).toBe(false);
    expect(stage).not.toHaveBeenCalled();
  });

  test('stops before the next stage when the signal aborts during a stage', async () => {
    const first = vi.fn(async () => undefined);
    const second = vi.fn(async () => undefined);
    const controller = new AbortController();
    const stages: Stage[] = [
      async () => {
        await first();
        controller.abort();
      },
      second,
    ];

    const loaded = await loadStaged(stages, controller.signal);

    expect(loaded).toBe(false);
    expect(second).not.toHaveBeenCalled();
  });
});
