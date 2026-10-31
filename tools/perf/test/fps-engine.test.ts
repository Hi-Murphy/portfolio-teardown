import { describe, expect, test } from 'vitest';

import { FPS_NOMINAL, FPS_TOLERANCE } from '../src/budgets.ts';
import { buildFpsReport, evaluateVerdict, scenarioUrl } from '../src/cli/fps-engine.ts';
import type { FpsResult } from '../src/fps.ts';

const BASE_URL = new URL('http://127.0.0.1:4199/');

function fpsResult(overrides: Partial<FpsResult> = {}): FpsResult {
  return {
    fps: FPS_NOMINAL,
    frames: 1,
    droppedFrames: 0,
    windowMs: 1,
    intervalsMs: { p50: 0, p95: 0, max: 0 },
    rafFps: FPS_NOMINAL,
    source: 'trace:DrawFrame',
    chromium: 'test',
    pid: null,
    pidSource: 'trace-metadata',
    ...overrides,
  };
}

describe('evaluateVerdict', () => {
  test('includes both edges of the configured liveness band', () => {
    const lower = FPS_NOMINAL * (1 - FPS_TOLERANCE);
    const upper = FPS_NOMINAL * (1 + FPS_TOLERANCE);

    expect(evaluateVerdict(lower, 0)).toMatchObject({
      rule: 'dropped-frames',
      droppedFrames0: true,
      liveness: true,
      pass: true,
    });
    expect(evaluateVerdict(upper, 0)).toMatchObject({
      droppedFrames0: true,
      liveness: true,
      pass: true,
    });
  });

  test('rejects readings outside the configured liveness band', () => {
    const below = FPS_NOMINAL * (1 - FPS_TOLERANCE * 2);
    const above = FPS_NOMINAL * (1 + FPS_TOLERANCE * 2);

    expect(evaluateVerdict(below, 0)).toMatchObject({ liveness: false, pass: false });
    expect(evaluateVerdict(above, 0)).toMatchObject({ liveness: false, pass: false });
  });

  test('rejects any dropped frame even when the measured rate is live', () => {
    expect(evaluateVerdict(FPS_NOMINAL, 1)).toEqual({
      rule: 'dropped-frames',
      droppedFrames0: false,
      liveness: true,
      pass: false,
    });
  });
});

describe('scenarioUrl', () => {
  test('keeps the S4 explode route', () => {
    expect(scenarioUrl(BASE_URL, 'explode').href).toBe(
      'http://127.0.0.1:4199/dev/engine?fixture=a&cycle=1',
    );
  });

  test('builds the looping live-update tour route', () => {
    expect(scenarioUrl(BASE_URL, 'tour').href).toBe(
      'http://127.0.0.1:4199/dev/engine?fixture=a&state=exploded&flow=live-update&tour=play&loop=1',
    );
  });
});

describe('buildFpsReport', () => {
  test('reports the dropped-frames verdict and tour details without a legacy key', () => {
    const report = buildFpsReport(fpsResult({ droppedFrames: 1 }), 'tour', 'http://example.test', {
      tourStepsAdvanced: 3,
      drawCalls: 2,
    });

    expect(report).toMatchObject({
      kind: 'fps-engine',
      version: 1,
      scenario: 'tour',
      droppedFrames: 1,
      tourStepsAdvanced: 3,
      drawCalls: 2,
      verdict: {
        rule: 'dropped-frames',
        droppedFrames0: false,
        liveness: true,
        pass: false,
      },
    });
    expect(Object.keys(report)).not.toContain('literal60');
    expect(JSON.stringify(report)).not.toContain('literal60');
  });
});
