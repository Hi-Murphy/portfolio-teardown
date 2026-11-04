import { describe, expect, test } from 'vitest';

import {
  assertLoadMounted,
  buildLoadReport,
  buildNamedLoadReport,
  evaluateLoadVerdict,
  LOAD_NAMED_TRACE_CATEGORIES,
  LOAD_TRACE_CATEGORIES,
  scenarioUrl,
} from '../src/cli/fps-engine.ts';
import { CliError, EXIT } from '../src/exit-codes.ts';
import { LOAD_MARK, traceCategories, type FpsResult } from '../src/fps.ts';
import {
  findPerformanceMark,
  findTasksIntersectingWindow,
  traceTimeOriginFromMark,
  type TraceEvent,
} from '../src/startup.ts';

const BASE_URL = new URL('http://127.0.0.1:4199/');
const LOAD_START_US = 1_000_000;
const LOAD_END_US = LOAD_START_US + 5_000_000;

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

function traceWithTasks(tasks: ReadonlyArray<{ startMs: number; durMs: number }>): TraceEvent[] {
  return [
    {
      cat: 'disabled-by-default-devtools.timeline',
      name: 'TracingStartedInBrowser',
      ph: 'I',
      pid: 1,
      tid: 1,
      ts: LOAD_START_US,
      args: { data: { frames: [{ processId: 1, isMainFrame: true }] } },
    },
    {
      cat: 'devtools.timeline',
      name: 'thread_name',
      ph: 'M',
      pid: 1,
      tid: 1,
      ts: LOAD_START_US,
      args: { name: 'CrRendererMain' },
    },
    ...tasks.map(({ startMs, durMs }) => ({
      cat: 'devtools.timeline',
      name: 'RunTask',
      ph: 'X',
      pid: 1,
      tid: 1,
      ts: LOAD_START_US + startMs * 1_000,
      dur: durMs * 1_000,
    })),
  ];
}

function namedTrace(): TraceEvent[] {
  const originUs = 1_000_000;
  const profileStartUs = originUs + 100_000;
  const nodes = [
    { id: 1, callFrame: { functionName: 'WebGLRenderer', url: 'http://local/three.js' } },
    { id: 2, callFrame: { functionName: 'linkProgram', url: 'http://local/three.js' } },
    { id: 3, callFrame: { functionName: 'layout', url: 'http://local/app.js' } },
  ];
  const samples = Array.from({ length: 500 }, (_, index) => {
    const timestampUs = profileStartUs + index * 1_000;
    if (timestampUs >= 1_102_000 && timestampUs < 1_122_000) return 1;
    if (timestampUs >= 1_125_000 && timestampUs < 1_185_000) return 2;
    return 3;
  });
  const timeDeltas = samples.map(() => 1_000);

  return [
    {
      cat: 'disabled-by-default-devtools.timeline',
      name: 'TracingStartedInBrowser',
      ph: 'I',
      pid: 1,
      tid: 1,
      ts: originUs,
      args: { data: { frames: [{ processId: 1, isMainFrame: true }] } },
    },
    {
      cat: 'devtools.timeline',
      name: 'thread_name',
      ph: 'M',
      pid: 1,
      tid: 1,
      ts: originUs,
      args: { name: 'CrRendererMain' },
    },
    ...[
      { startMs: 102, durMs: 20 },
      { startMs: 125, durMs: 60 },
      { startMs: 200, durMs: 70 },
      { startMs: 300, durMs: 10 },
    ].map(({ startMs, durMs }) => ({
      cat: 'devtools.timeline',
      name: 'RunTask',
      ph: 'X',
      pid: 1,
      tid: 1,
      ts: originUs + startMs * 1_000,
      dur: durMs * 1_000,
    })),
    {
      cat: 'disabled-by-default-v8.cpu_profiler',
      name: 'Profile',
      ph: 'P',
      id: '0x1',
      pid: 1,
      tid: 2,
      ts: profileStartUs,
      args: {
        data: {
          startTime: profileStartUs,
          cpuProfile: { nodes: [], samples: [], timeDeltas: [] },
        },
      },
    },
    {
      cat: 'disabled-by-default-v8.cpu_profiler',
      name: 'ProfileChunk',
      ph: 'P',
      id: '0x1',
      pid: 1,
      tid: 2,
      ts: profileStartUs,
      args: { data: { cpuProfile: { nodes, samples }, timeDeltas } },
    },
  ] as TraceEvent[];
}

describe('load scenario', () => {
  test('uses the production route and requires an absolute path', () => {
    expect(scenarioUrl(BASE_URL, 'load', '/projects/websocket-inspector').href).toBe(
      'http://127.0.0.1:4199/projects/websocket-inspector',
    );
    expect(() => scenarioUrl(BASE_URL, 'load')).toThrow('--route is required with --scenario load');
    expect(() => scenarioUrl(BASE_URL, 'load', 'projects/websocket-inspector')).toThrow(
      '--route must be an absolute path',
    );
  });

  test('adds the load categories without changing the base trace categories', () => {
    const categories = traceCategories(LOAD_TRACE_CATEGORIES);

    expect(categories).toContain('devtools.timeline');
    expect(categories).toContain('disabled-by-default-devtools.timeline.frame');
    expect(categories).toContain('disabled-by-default-devtools.timeline');
    expect(categories).toContain('blink.user_timing');
  });

  test('adds V8 samples only in named mode', () => {
    expect(LOAD_TRACE_CATEGORIES).not.toContain('disabled-by-default-v8.cpu_profiler');
    expect(LOAD_NAMED_TRACE_CATEGORIES).toContain('disabled-by-default-v8.cpu_profiler');
    expect(traceCategories(LOAD_NAMED_TRACE_CATEGORIES)).toContain(
      'disabled-by-default-v8.cpu_profiler',
    );
  });

  test('names tasks by timestamp containment and caps the named exceptions', () => {
    const report = buildNamedLoadReport(100, {
      trace: namedTrace(),
      traceTimeOriginUs: 1_000_000,
      rendererConstructorMs: 105,
      programCompileMs: 130,
      readyMs: 150,
      caps: {
        'renderer-constructor': 21,
        'program-compile': 61,
        'first-content-frame': 61,
      },
    });

    expect(
      report.names.map(({ name, startMs, durMs, containsReady }) => ({
        name,
        startMs,
        durMs,
        containsReady,
      })),
    ).toEqual([
      { name: 'renderer-constructor', startMs: 102, durMs: 20, containsReady: false },
      { name: 'program-compile', startMs: 125, durMs: 60, containsReady: true },
      { name: 'first-content-frame', startMs: 125, durMs: 60, containsReady: true },
      { name: 'unnamed', startMs: 200, durMs: 70, containsReady: false },
    ]);
    expect(report.namedExceptions).toEqual({
      'renderer-constructor': { durMs: 20, cap: 21, pass: true },
      'program-compile': { durMs: 60, cap: 61, pass: true },
      'first-content-frame': { durMs: 60, cap: 61, pass: true },
    });
    expect(report.namedWithinCaps).toBe(true);
    expect(report.unnamedMaxMs).toBe(70);
    expect(report.names.find((task) => task.name === 'program-compile')?.topFunctions[0]?.fn).toBe(
      'linkProgram',
    );
  });

  test('fails a capped name when its task was not observed', () => {
    const report = buildNamedLoadReport(100, {
      trace: namedTrace(),
      traceTimeOriginUs: 1_000_000,
      rendererConstructorMs: null,
      programCompileMs: 130,
      readyMs: 150,
      caps: { 'renderer-constructor': 21 },
    });

    expect(report.namedExceptions['renderer-constructor']).toEqual({
      durMs: null,
      cap: 21,
      pass: false,
    });
    expect(report.namedWithinCaps).toBe(false);
  });

  test('partitions intersecting and wholly pre-load tasks relative to load', () => {
    const trace = traceWithTasks([
      { startMs: -200, durMs: 100 },
      { startMs: -50, durMs: 75 },
      { startMs: 800, durMs: 50 },
      { startMs: 1_000, durMs: 51 },
      { startMs: 5_000, durMs: 51 },
      { startMs: 5_001, durMs: 60 },
    ]);

    expect(
      findTasksIntersectingWindow(trace, LOAD_START_US, LOAD_END_US, 50, LOAD_START_US, true),
    ).toEqual({
      intersecting: [
        { start: -50, dur: 75 },
        { start: 1_000, dur: 51 },
        { start: 5_000, dur: 51 },
      ],
      preLoad: [{ start: -200, dur: 100 }],
    });
  });

  test('finds the last load mark and maps it onto the trace clock', () => {
    const mark = {
      cat: 'blink.user_timing',
      name: LOAD_MARK,
      ph: 'I',
      pid: 1,
      tid: 1,
      ts: LOAD_START_US + 100_000,
    } satisfies TraceEvent;
    const trace = [mark, { ...mark }];

    expect(findPerformanceMark(trace, LOAD_MARK)).toBe(trace[1]);
    expect(traceTimeOriginFromMark(mark, 100)).toBe(LOAD_START_US);
  });

  test('gates only trace-only runs and applies both AC2 boundaries', () => {
    expect(evaluateLoadVerdict(50, 2, 'trace-only')).toEqual({
      longTask50: true,
      droppedFramesLe2: true,
      gated: true,
    });
    expect(evaluateLoadVerdict(51, 3, 'trace-only')).toEqual({
      longTask50: false,
      droppedFramesLe2: false,
      gated: true,
    });
    expect(evaluateLoadVerdict(51, 3, 'recorder')).toEqual({
      longTask50: false,
      droppedFramesLe2: false,
      gated: false,
    });
  });

  test('reports the load schema and marks recorder output as excluded', () => {
    const traceOnly = buildLoadReport(
      fpsResult(),
      'http://127.0.0.1:4199/',
      '/',
      'trace-only',
      4,
      120,
      true,
      500,
      [{ start: 10, dur: 40 }],
      [{ start: -200, dur: 80 }],
      [5, 12],
    );
    const recorder = buildLoadReport(
      fpsResult(),
      'http://127.0.0.1:4199/',
      '/',
      'recorder',
      4,
      120,
      true,
      500,
      [{ start: 10, dur: 51 }],
      [],
      [5, 12, 20],
    );

    expect(traceOnly).toMatchObject({
      scenario: 'load',
      route: '/',
      frames: 'trace-only',
      frameCount: 300,
      cpuThrottle: 4,
      loadMs: 120,
      windowMs: 5_000,
      maxLongTaskMs: 40,
      droppedFrames: 2,
      mounted: true,
      readyMs: 500,
      verdict: { longTask50: true, droppedFramesLe2: true, gated: true },
    });
    expect(traceOnly).not.toHaveProperty('exclusionNote');
    expect(recorder).toMatchObject({
      frames: 'recorder',
      droppedFrames: 3,
      verdict: { longTask50: false, droppedFramesLe2: false, gated: false },
      exclusionNote:
        'the harness rAF recorder adds a frame demand on every vsync; this count is excluded from AC2.',
    });
  });

  test('rejects an unmounted load run as an internal failure', () => {
    expect(() => assertLoadMounted(true)).not.toThrow();

    try {
      assertLoadMounted(false);
      expect.unreachable('expected an unmounted run to fail');
    } catch (error) {
      expect(error).toBeInstanceOf(CliError);
      expect((error as CliError).code).toBe(EXIT.INTERNAL);
    }
  });
});
