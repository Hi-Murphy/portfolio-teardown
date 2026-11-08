import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

import { describe, expect, test } from 'vitest';

import {
  eagerProbeExitCode,
  eagerProbeFileName,
  eagerProbeRouteName,
  evaluateCanvasPixels,
  evaluateEagerProbe,
  evaluateGatedProbe,
  evaluateSaveDataProbe,
  type EagerProbeEventCounts,
  type EagerProbeRun,
  type EagerProbeSnapshot,
} from '../src/eager-probe.ts';

const NO_EVENTS: EagerProbeEventCounts = {
  pointerdown: 0,
  pointermove: 0,
  pointerup: 0,
  mousedown: 0,
  mousemove: 0,
  mouseup: 0,
  click: 0,
  touchstart: 0,
  touchmove: 0,
  wheel: 0,
  scroll: 0,
  keydown: 0,
  focusin: 0,
};

function snapshot(overrides: Partial<EagerProbeSnapshot> = {}): EagerProbeSnapshot {
  return {
    observedAtMs: 2_500,
    timeOriginMs: 0,
    loadAtMs: 100,
    readyAtMs: 400,
    liveStates: [
      { value: 'idle', t: 100 },
      { value: 'loading', t: 200 },
      { value: 'revealed', t: 500 },
    ],
    eventCounts: NO_EVENTS,
    trustedEvents: 0,
    canvasCount: 1,
    canvasRect: { x: 0, y: 0, width: 320, height: 180 },
    liveState: 'revealed',
    liveOpacity: '1',
    posterPresent: true,
    posterOpacity: '0',
    posterVisibility: 'hidden',
    tour: 'idle',
    tweening: 'false',
    heroLoop: 'running',
    backgroundRgb: 'rgb(245, 245, 243)',
    readyAttribute: true,
    ...overrides,
  };
}

describe('evaluateEagerProbe', () => {
  test('passes a normal run only when the canvas is visible and the view stays idle', () => {
    const atDeadline = snapshot();
    const afterRest = snapshot({ observedAtMs: 4_500 });
    const result = evaluateEagerProbe('normal', atDeadline, afterRest, {
      file: 'deadline.png',
      width: 320,
      height: 180,
      colours: 42,
      nonBlank: true,
    });

    expect(result.pass).toBe(true);
    expect(result.checks.map((entry) => entry.name)).toEqual([
      'canvas-present',
      'ready-by-deadline',
      'revealed-by-deadline',
      'live-opacity',
      'poster-hidden',
      'no-trusted-events',
      'canvas-non-blank',
      'ambient-idle',
    ]);
  });

  test('reports each failed deadline condition independently', () => {
    const result = evaluateEagerProbe(
      'normal',
      snapshot({
        readyAtMs: 2_501,
        liveOpacity: '0.5',
        posterVisibility: 'visible',
        trustedEvents: 2,
      }),
      snapshot({
        liveStates: [
          { value: 'idle', t: 100 },
          { value: 'loading', t: 200 },
          { value: 'revealed', t: 500 },
          { value: 'changed', t: 3_000 },
        ],
        tour: 'playing',
        tweening: 'true',
      }),
      { file: 'deadline.png', width: 320, height: 180, colours: 1, nonBlank: false },
    );

    expect(result.pass).toBe(false);
    expect(result.checks.filter((entry) => !entry.pass).map((entry) => entry.name)).toEqual([
      'ready-by-deadline',
      'live-opacity',
      'poster-hidden',
      'no-trusted-events',
      'canvas-non-blank',
      'ambient-idle',
    ]);
  });

  test('live-loop passes only when the loop is running and the live layer is settled', () => {
    const atDeadline = snapshot();
    const afterRest = snapshot({ observedAtMs: 4_500, tweening: 'true' });
    const screenshot = {
      file: 'deadline.png',
      width: 320,
      height: 180,
      colours: 42,
      nonBlank: true,
    };

    const running = evaluateEagerProbe('normal', atDeadline, afterRest, screenshot, 'live-loop');
    const missing = evaluateEagerProbe(
      'normal',
      atDeadline,
      snapshot({ observedAtMs: 4_500, heroLoop: null }),
      screenshot,
      'live-loop',
    );
    const paused = evaluateEagerProbe(
      'normal',
      atDeadline,
      snapshot({ observedAtMs: 4_500, heroLoop: 'paused' }),
      screenshot,
      'live-loop',
    );

    expect(running.pass).toBe(true);
    expect(running.checks.at(-1)).toMatchObject({ name: 'loop-running', pass: true });
    expect(missing.pass).toBe(false);
    expect(missing.checks.at(-1)).toMatchObject({ name: 'loop-running', pass: false });
    expect(paused.pass).toBe(false);
    expect(paused.checks.at(-1)).toMatchObject({ name: 'loop-running', pass: false });
  });

  test('live keeps ambient-idle and ignores the loop attribute', () => {
    const result = evaluateEagerProbe(
      'normal',
      snapshot(),
      snapshot({ observedAtMs: 4_500, heroLoop: 'paused' }),
      { file: 'deadline.png', width: 320, height: 180, colours: 42, nonBlank: true },
    );

    expect(result.pass).toBe(true);
    expect(result.checks.at(-1)).toMatchObject({ name: 'ambient-idle', pass: true });
  });

  test('passes reduced motion only with no canvas or ready marker and a visible poster', () => {
    const reduced = evaluateEagerProbe(
      'reduce',
      snapshot({
        canvasCount: 0,
        canvasRect: null,
        readyAtMs: null,
        readyAttribute: false,
        liveState: null,
        liveOpacity: null,
        posterOpacity: '1',
        posterVisibility: 'visible',
      }),
      null,
      null,
    );
    const eager = evaluateEagerProbe('reduce', snapshot(), null, null);

    expect(reduced.pass).toBe(true);
    expect(eager.pass).toBe(false);
    expect(eager.checks.filter((entry) => !entry.pass).map((entry) => entry.name)).toEqual([
      'canvas-absent',
      'ready-absent',
      'poster-visible',
    ]);
  });
});

describe('evaluateCanvasPixels', () => {
  test('accepts more than one colour when the canvas is not uniformly the page background', () => {
    const image = {
      width: 2,
      height: 1,
      data: Uint8Array.from([245, 245, 243, 255, 30, 60, 90, 255]),
    };

    expect(evaluateCanvasPixels(image, 'rgb(245, 245, 243)')).toEqual({
      colours: 2,
      nonBlank: true,
    });
  });

  test('rejects a uniform background or a single transparent colour', () => {
    expect(
      evaluateCanvasPixels(
        {
          width: 2,
          height: 1,
          data: Uint8Array.from([245, 245, 243, 255, 245, 245, 243, 255]),
        },
        'rgb(245, 245, 243)',
      ),
    ).toEqual({ colours: 1, nonBlank: false });
    expect(
      evaluateCanvasPixels({ width: 2, height: 1, data: new Uint8Array(8) }, 'rgb(245, 245, 243)'),
    ).toEqual({ colours: 1, nonBlank: false });
  });
});

describe('evaluateGatedProbe', () => {
  test('passes only when the gated route has no canvas, ready marker, or input', () => {
    const gated = snapshot({
      canvasCount: 0,
      canvasRect: null,
      readyAtMs: null,
      readyAttribute: false,
      liveState: null,
      liveOpacity: null,
      posterOpacity: '1',
      posterVisibility: 'visible',
    });

    expect(evaluateGatedProbe(gated).pass).toBe(true);
    expect(
      evaluateGatedProbe(snapshot())
        .checks.filter((entry) => !entry.pass)
        .map((entry) => entry.name),
    ).toEqual(['canvas-absent', 'ready-absent', 'poster-visible']);
  });
});

describe('evaluateSaveDataProbe', () => {
  test('passes only with a visible poster and live state skipped', () => {
    const saveData = snapshot({
      canvasCount: 0,
      canvasRect: null,
      readyAtMs: null,
      readyAttribute: false,
      liveStates: [
        { value: 'idle', t: 100 },
        { value: 'skipped', t: 150 },
      ],
      liveState: 'skipped',
      liveOpacity: null,
      posterOpacity: '1',
      posterVisibility: 'visible',
    });

    expect(evaluateSaveDataProbe(saveData).pass).toBe(true);
    expect(
      evaluateSaveDataProbe(snapshot())
        .checks.filter((entry) => !entry.pass)
        .map((entry) => entry.name),
    ).toEqual(['canvas-absent', 'ready-absent', 'poster-visible', 'live-state-skipped']);
  });
});

describe('eager probe artifacts', () => {
  test('uses the route and motion names from the evidence contract', () => {
    expect(eagerProbeRouteName('/')).toBe('home');
    expect(eagerProbeRouteName('/projects/websocket-inspector')).toBe('project');
    expect(eagerProbeRouteName('/projects/Other Route/')).toBe('other-route');
    expect(eagerProbeFileName('project', 'reduce', 2, 'json')).toBe(
      'eager-probe-project-reduce-r2.json',
    );
    expect(eagerProbeFileName('home', 'normal', 1, 'png')).toBe(
      'eager-probe-home-normal-r1.deadline.png',
    );
    expect(eagerProbeFileName('home', 'save-data', 1, 'json')).toBe(
      'eager-probe-home-save-data-r1.json',
    );
  });

  test('exits 6 when any run fails', () => {
    const pass = { pass: true } as EagerProbeRun;
    const fail = { pass: false } as EagerProbeRun;

    expect(eagerProbeExitCode([pass, pass])).toBe(0);
    expect(eagerProbeExitCode([pass, fail])).toBe(6);
  });

  test('keeps interaction APIs out of the probe implementation', async () => {
    const sources = await Promise.all(
      ['eager-probe.ts', 'cli/eager-probe.ts'].map((path) =>
        readFile(fileURLToPath(new URL(`../src/${path}`, import.meta.url)), 'utf8'),
      ),
    );
    const forbidden =
      /\b(mouse|keyboard|touchscreen)\.|\.(hover|focus|click|tap)\(|dispatchEvent|scrollIntoView/;

    expect(sources.some((source) => forbidden.test(source))).toBe(false);
  });
});
