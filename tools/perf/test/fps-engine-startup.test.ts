import { describe, expect, test } from 'vitest';

import {
  assertLongTaskCheckIsNotVacuous,
  buildStartupReport,
  evaluateStartupVerdict,
  longTasksFromTrace,
  mainThreadTaskCountFromTrace,
  scenarioUrl,
  STARTUP_TRACE_CATEGORIES,
} from '../src/cli/fps-engine.ts';
import { CliError, EXIT } from '../src/exit-codes.ts';
import { traceCategories, type FpsResult } from '../src/fps.ts';
import type { TraceEvent } from '../src/startup.ts';

const BASE_URL = new URL('http://127.0.0.1:4199/');
const WINDOW_START_US = 1_000_000;

function fpsResult(overrides: Partial<FpsResult> = {}): FpsResult {
  return {
    fps: 60,
    frames: 300,
    droppedFrames: 0,
    windowMs: 5_000,
    intervalsMs: { p50: 16.7, p95: 17, max: 18 },
    rafFps: 60,
    source: 'trace:DrawFrame',
    chromium: 'test',
    pid: 1,
    pidSource: 'trace-metadata',
    ...overrides,
  };
}

function traceWithTask(startOffsetMs: number, durationMs: number): TraceEvent[] {
  return [
    {
      cat: 'disabled-by-default-devtools.timeline',
      name: 'TracingStartedInBrowser',
      ph: 'I',
      pid: 1,
      tid: 1,
      ts: WINDOW_START_US,
      args: { data: { frames: [{ processId: 1, isMainFrame: true }] } },
    },
    {
      cat: 'devtools.timeline',
      name: 'thread_name',
      ph: 'M',
      pid: 1,
      tid: 1,
      ts: WINDOW_START_US,
      args: { name: 'CrRendererMain' },
    },
    {
      cat: 'devtools.timeline',
      name: 'RunTask',
      ph: 'X',
      pid: 1,
      tid: 1,
      ts: WINDOW_START_US + startOffsetMs * 1_000,
      dur: durationMs * 1_000,
    },
  ];
}

describe('startup scenario', () => {
  test('appends optional trace categories only when provided', () => {
    expect(traceCategories()).toBe('devtools.timeline,disabled-by-default-devtools.timeline.frame');
    expect(traceCategories([])).toBe(
      'devtools.timeline,disabled-by-default-devtools.timeline.frame',
    );
    expect(traceCategories(STARTUP_TRACE_CATEGORIES)).toBe(
      'devtools.timeline,disabled-by-default-devtools.timeline.frame,toplevel,disabled-by-default-devtools.timeline,v8.execute',
    );
  });

  test('uses the production route instead of the fixture route', () => {
    expect(scenarioUrl(BASE_URL, 'startup', '/projects/websocket-inspector').href).toBe(
      'http://127.0.0.1:4199/projects/websocket-inspector',
    );
  });

  test('requires an absolute route', () => {
    expect(() => scenarioUrl(BASE_URL, 'startup', 'projects/websocket-inspector')).toThrow(
      '--route must be an absolute path',
    );
    expect(() => scenarioUrl(BASE_URL, 'startup', '//example.test/project')).toThrow(
      '--route must be an absolute path',
    );
  });

  test('applies the dropped-frame and 50 ms long-task rules independently', () => {
    expect(evaluateStartupVerdict(0, 50)).toEqual({
      rule: 'startup',
      droppedFrames0: true,
      longTask50: true,
      pass: true,
    });
    expect(evaluateStartupVerdict(1, 0)).toMatchObject({
      droppedFrames0: false,
      longTask50: true,
      pass: false,
    });
    expect(evaluateStartupVerdict(0, 51)).toMatchObject({
      droppedFrames0: true,
      longTask50: false,
      pass: false,
    });
  });

  test('finds long tasks in the kept trace and excludes the 50 ms boundary', () => {
    expect(longTasksFromTrace(traceWithTask(10, 51))).toEqual([
      { start: 10, dur: 51, phase: 'other' },
    ]);
    expect(longTasksFromTrace(traceWithTask(10, 50))).toEqual([]);
    expect(longTasksFromTrace(traceWithTask(6_000, 100))).toEqual([]);
  });

  test('counts metadata main-thread tasks and ignores the draw-frame fallback pid', () => {
    const trace = traceWithTask(10, 51);
    expect(mainThreadTaskCountFromTrace(trace)).toBe(1);

    const withoutMetadata = trace.filter((event) => event.name !== 'TracingStartedInBrowser');
    expect(mainThreadTaskCountFromTrace(withoutMetadata)).toBe(0);
    expect(longTasksFromTrace(withoutMetadata)).toEqual([]);
  });

  test('fails internals when the long-task check would be vacuous', () => {
    expect(() => assertLongTaskCheckIsNotVacuous(0)).toThrow(
      'vacuous long-task check: no main-thread tasks in trace',
    );

    try {
      assertLongTaskCheckIsNotVacuous(0);
      expect.unreachable('expected a vacuous trace to fail');
    } catch (error) {
      expect(error).toBeInstanceOf(CliError);
      expect((error as CliError).code).toBe(EXIT.INTERNAL);
    }
  });

  test('adds startup fields without retaining the trace or a liveness verdict', () => {
    const result = fpsResult({ trace: traceWithTask(10, 51) });
    const longTasks = longTasksFromTrace((result.trace ?? []) as TraceEvent[]);
    const mainThreadTaskCount = mainThreadTaskCountFromTrace((result.trace ?? []) as TraceEvent[]);
    const report = buildStartupReport(
      result,
      'http://127.0.0.1:4199/projects/websocket-inspector',
      '/projects/websocket-inspector',
      'click',
      longTasks,
      mainThreadTaskCount,
    );

    expect(report).toMatchObject({
      kind: 'fps-engine',
      version: 1,
      scenario: 'startup',
      route: '/projects/websocket-inspector',
      engage: 'click',
      cpuThrottle: 4,
      longTasks: [{ start: 10, dur: 51, phase: 'other' }],
      maxLongTaskMs: 51,
      mainThreadTaskCount: 1,
      liveness: 'not-applicable',
      verdict: {
        rule: 'startup',
        droppedFrames0: true,
        longTask50: false,
        pass: false,
      },
    });
    expect(Object.keys(report)).not.toContain('trace');
    expect(Object.keys(report.verdict)).not.toContain('liveness');
  });
});
