import { describe, expect, test } from 'vitest';

import { createViewerEvents, type ViewerEventHandlers } from '../src/react/events';

interface Delivery {
  readonly name: string;
  readonly detail: object;
}

function recorder() {
  const log: string[] = [];
  const deliveries: Delivery[] = [];
  let handlers: ViewerEventHandlers = {
    onReady: () => log.push('onReady'),
    onSettled: (phase) => log.push(`onSettled:${phase}`),
    onTourEnded: (flowId) => log.push(`onTourEnded:${flowId}`),
    dispatch: (name, detail) => {
      log.push(`dispatch:${name}`);
      deliveries.push({ name, detail });
    },
  };
  const events = createViewerEvents(() => handlers);

  return {
    deliveries,
    events,
    log,
    replaceHandlers(next: ViewerEventHandlers) {
      handlers = next;
    },
  };
}

describe('viewer events emitter', () => {
  test('delivers ready once and dispatches after the callback', () => {
    const recorderState = recorder();

    recorderState.events.ready();
    recorderState.events.ready();

    expect(recorderState.log).toEqual(['onReady', 'dispatch:ready']);
    expect(recorderState.deliveries).toEqual([{ name: 'ready', detail: {} }]);
  });

  test('buffers two settles before ready and flushes them after ready in the same call', () => {
    const recorderState = recorder();

    recorderState.events.settled('exploded', 1);
    recorderState.events.settled('turned', 2);

    expect(recorderState.log).toEqual([]);

    recorderState.events.ready();

    expect(recorderState.log).toEqual([
      'onReady',
      'dispatch:ready',
      'onSettled:exploded',
      'dispatch:settled',
      'onSettled:turned',
      'dispatch:settled',
    ]);
    expect(recorderState.deliveries).toEqual([
      { name: 'ready', detail: {} },
      { name: 'settled', detail: { phase: 'exploded', at: 1 } },
      { name: 'settled', detail: { phase: 'turned', at: 2 } },
    ]);
  });

  test('buffers tour-ended before ready in call order', () => {
    const recorderState = recorder();

    recorderState.events.settled('zoomed', 3);
    recorderState.events.tourEnded('flow');
    recorderState.events.settled('turned', 4);
    recorderState.events.ready();

    expect(recorderState.deliveries).toEqual([
      { name: 'ready', detail: {} },
      { name: 'settled', detail: { phase: 'zoomed', at: 3 } },
      { name: 'tour-ended', detail: { flowId: 'flow' } },
      { name: 'settled', detail: { phase: 'turned', at: 4 } },
    ]);
  });

  test('delivers every settled call after ready', () => {
    const recorderState = recorder();

    recorderState.events.ready();
    recorderState.events.settled('exploded', 5);
    recorderState.events.settled('zoomed', 6);

    expect(recorderState.deliveries.slice(1)).toEqual([
      { name: 'settled', detail: { phase: 'exploded', at: 5 } },
      { name: 'settled', detail: { phase: 'zoomed', at: 6 } },
    ]);
  });

  test('delivers tour-ended after a settle decided in the same task', async () => {
    const recorderState = recorder();

    recorderState.events.ready();
    recorderState.events.tourEnded('flow');
    recorderState.events.settled('exploded', 7);

    expect(recorderState.log).toEqual([
      'onReady',
      'dispatch:ready',
      'onSettled:exploded',
      'dispatch:settled',
    ]);

    await Promise.resolve();

    expect(recorderState.log).toEqual([
      'onReady',
      'dispatch:ready',
      'onSettled:exploded',
      'dispatch:settled',
      'onTourEnded:flow',
      'dispatch:tour-ended',
    ]);
  });

  test('delivers duplicate tour-ended calls for one flow once per task', async () => {
    const recorderState = recorder();

    recorderState.events.ready();
    recorderState.events.tourEnded('flow');
    recorderState.events.tourEnded('flow');

    await Promise.resolve();

    expect(recorderState.log).toEqual([
      'onReady',
      'dispatch:ready',
      'onTourEnded:flow',
      'dispatch:tour-ended',
    ]);
  });

  test('reads the latest handlers at every delivery', async () => {
    const calls: string[] = [];
    let handlers: ViewerEventHandlers = {
      onReady: () => calls.push('first:ready'),
      dispatch: (name) => calls.push(`first:dispatch:${name}`),
    };
    const events = createViewerEvents(() => handlers);

    events.ready();

    handlers = {
      onSettled: (phase) => calls.push(`second:${phase}`),
      dispatch: (name) => calls.push(`second:dispatch:${name}`),
    };
    events.settled('exploded', 8);

    handlers = {
      onTourEnded: (flowId) => calls.push(`third:${flowId}`),
      dispatch: (name) => calls.push(`third:dispatch:${name}`),
    };
    events.tourEnded('flow');

    handlers = {
      onTourEnded: (flowId) => calls.push(`fourth:${flowId}`),
      dispatch: (name) => calls.push(`fourth:dispatch:${name}`),
    };

    await Promise.resolve();

    expect(calls).toEqual([
      'first:ready',
      'first:dispatch:ready',
      'second:exploded',
      'second:dispatch:settled',
      'fourth:flow',
      'fourth:dispatch:tour-ended',
    ]);
  });
});
