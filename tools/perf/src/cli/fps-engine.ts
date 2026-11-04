import { spawn } from 'node:child_process';
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import type { Page, Request } from 'playwright';

import { parseCli } from '../args.ts';
import { chromiumVersion, freePort, launch, PROFILES } from '../browser.ts';
import { FPS_NOMINAL, FPS_TOLERANCE } from '../budgets.ts';
import { CliError, EXIT, EXIT_DESCRIPTIONS } from '../exit-codes.ts';
import { samplesInWindow, type CpuProfileTraceEvent } from '../cpu-profile.ts';
import {
  analyzeTrace,
  droppedFrameTimesFromTrace,
  inBand,
  LOAD_MARK,
  measureFps,
  traceCategories,
  type FpsResult,
  type TraceEvent as FpsTraceEvent,
} from '../fps.ts';
import { run } from '../log.ts';
import { serveDir } from '../serve.ts';
import {
  countMainThreadTasks,
  findPerformanceMark,
  findLongTasks,
  findTasksIntersectingWindow,
  findTasksOver,
  traceTimeOriginFromMark,
  type LongTask,
  type TaskWindowEntry,
  type TraceEvent as StartupTraceEvent,
} from '../startup.ts';

type FixtureScenario = 'explode' | 'tour';
type Scenario = FixtureScenario | 'startup' | 'load';
export type Engagement = 'move' | 'click';
export type LoadFrameMode = 'trace-only' | 'recorder';
export type NamedTaskName =
  'renderer-constructor' | 'program-compile' | 'first-content-frame' | 'unnamed';

export interface NamedFunction {
  fn: string;
  url: string;
  selfMs: number;
  pct: number;
}

export interface NamedTask {
  name: NamedTaskName;
  startMs: number;
  durMs: number;
  topFunctions: NamedFunction[];
  containsReady: boolean;
}

export interface NamedException {
  durMs: number | null;
  cap?: number;
  pass?: boolean;
}

export type NamedExceptions = Record<Exclude<NamedTaskName, 'unnamed'>, NamedException>;

export interface NamedCaps {
  'renderer-constructor'?: number;
  'program-compile'?: number;
  'first-content-frame'?: number;
}

export interface NamedLoadOptions {
  trace: readonly StartupTraceEvent[];
  traceTimeOriginUs: number;
  rendererConstructorMs: number | null;
  programCompileMs: number | null;
  readyMs: number | null;
  caps?: NamedCaps;
}

export interface NamedLoadReport {
  names: NamedTask[];
  namedExceptions: NamedExceptions;
  unnamedMaxMs: number;
  namedWithinCaps?: boolean;
}

interface FpsEngineArgs {
  values: {
    scenario?: string;
    out?: string;
    route?: string;
    engage?: string;
    frames?: string;
    cpu?: string;
    names?: boolean;
    caps?: string;
    'no-build'?: boolean;
    help?: boolean;
  };
  positionals: string[];
}

export interface FpsEngineVerdict {
  rule: 'dropped-frames';
  droppedFrames0: boolean;
  liveness: boolean;
  pass: boolean;
}

export interface FpsEngineReport extends Omit<
  FpsResult,
  'trace' | 'expect' | 'tolerance' | 'pass'
> {
  kind: 'fps-engine';
  version: 1;
  url: string;
  scenario: FixtureScenario;
  tourStepsAdvanced?: number;
  drawCalls?: number;
  verdict: FpsEngineVerdict;
}

export interface FpsEngineStartupVerdict {
  rule: 'startup';
  droppedFrames0: boolean;
  longTask50: boolean;
  pass: boolean;
}

export interface FpsEngineStartupReport extends Omit<
  FpsResult,
  'trace' | 'expect' | 'tolerance' | 'pass'
> {
  kind: 'fps-engine';
  version: 1;
  url: string;
  scenario: 'startup';
  route: string;
  engage: Engagement;
  cpuThrottle: number;
  longTasks: LongTask[];
  droppedFrameTimes: number[];
  tasksOver16ms: Array<{ start: number; dur: number }>;
  maxLongTaskMs: number;
  /** Main-thread tasks from the TracingStartedInBrowser metadata pid; never a DrawFrame fallback. */
  mainThreadTaskCount: number;
  liveness: 'not-applicable';
  verdict: FpsEngineStartupVerdict;
}

export interface FpsEngineLoadVerdict {
  longTask50: boolean;
  droppedFramesLe2: boolean;
  gated: boolean;
  namedWithinCaps?: boolean;
}

export interface FpsEngineLoadReport extends Omit<
  FpsResult,
  'trace' | 'expect' | 'tolerance' | 'pass' | 'frames'
> {
  kind: 'fps-engine';
  version: 1;
  url: string;
  scenario: 'load';
  route: string;
  frames: LoadFrameMode;
  frameCount: number;
  cpuThrottle: number;
  loadMs: number;
  longTasks: TaskWindowEntry[];
  maxLongTaskMs: number;
  preLoadTasks: TaskWindowEntry[];
  droppedFrameTimes: number[];
  mounted: boolean;
  readyMs: number | null;
  verdict: FpsEngineLoadVerdict;
  exclusionNote?: string;
  names?: NamedTask[];
  namedExceptions?: NamedExceptions;
  unnamedMaxMs?: number;
}

interface TourResult {
  result: FpsResult;
  tourStepsAdvanced: number;
  drawCalls: number;
}

interface TourCounter {
  advanced: number;
  observer: MutationObserver;
}

const REPO_ROOT = fileURLToPath(new URL('../../../../', import.meta.url));
const FIXTURE_DIR = join(REPO_ROOT, 'out-fixtures');
const WEB_OUT_DIR = join(REPO_ROOT, 'apps', 'web', 'out');
const NAVIGATION_TIMEOUT_MS = 30_000;
const QUIET_MS = 2_000;
const STARTUP_WINDOW_MS = 5_000;
const STARTUP_CPU_THROTTLE = 4;
const LONG_TASK_THRESHOLD_MS = 50;
const TASK_TIMELINE_THRESHOLD_MS = 16.7;
const LOAD_WINDOW_MS = 5_000;
const LOAD_CPU_THROTTLE = 4;
const LOAD_DROPPED_FRAME_LIMIT = 2;
export const LOAD_TRACE_CATEGORIES = [
  'toplevel',
  'disabled-by-default-devtools.timeline',
  'blink.user_timing',
  'loading',
] as const;
export const LOAD_NAMED_TRACE_CATEGORIES = [
  ...LOAD_TRACE_CATEGORIES,
  'disabled-by-default-v8.cpu_profiler',
] as const;
export const STARTUP_TRACE_CATEGORIES = [
  'toplevel',
  'disabled-by-default-devtools.timeline',
  'v8.execute',
] as const;
const TOUR_SELECTOR = '[data-xploder-ready="true"][data-xploder-tour="playing"]';
const TOUR_COUNTER_KEY = '__perfFpsEngineTourCounter';
const EXPLORE_3D_SELECTOR = '[data-site-control="explore-3d"]';
const LOAD_OBSERVER_KEY = '__xpPerfLoad';
const LOAD_RECORDER_START_MARK = 'xp-perf:load-recorder-start';
const RECORDER_EXCLUSION =
  'the harness rAF recorder adds a frame demand on every vsync; this count is excluded from AC2.';

const LOAD_OBSERVER_INIT_SCRIPT = `(() => {
  const key = ${JSON.stringify(LOAD_OBSERVER_KEY)};
  const markName = ${JSON.stringify(LOAD_MARK)};
  const state = { loadMs: null, mounted: false, readyMs: null };
  window[key] = state;

  const recordLoad = () => {
    performance.mark(markName);
    const entry = performance.getEntriesByName(markName).at(-1);
    state.loadMs = entry?.startTime ?? performance.now();
  };
  window.addEventListener('load', recordLoad, { once: true });

  const checkReady = () => {
    if (document.querySelector('[data-xploder-ready="true"]') === null) return;
    state.mounted = true;
    state.readyMs ??= performance.now();
  };
  new MutationObserver(checkReady).observe(document, {
    attributes: true,
    subtree: true,
    attributeFilter: ['data-xploder-ready'],
  });
  checkReady();
})();`;

const LOAD_OBSERVER_NAMED_INIT_SCRIPT = `(() => {
  const key = ${JSON.stringify(LOAD_OBSERVER_KEY)};
  const markName = ${JSON.stringify(LOAD_MARK)};
  const state = {
    loadMs: null,
    mounted: false,
    readyMs: null,
    rendererConstructorMs: null,
    programCompileMs: null
  };
  window[key] = state;

  const recordLoad = () => {
    performance.mark(markName);
    const entry = performance.getEntriesByName(markName).at(-1);
    state.loadMs = entry?.startTime ?? performance.now();
  };
  window.addEventListener('load', recordLoad, { once: true });

  const checkReady = () => {
    if (document.querySelector('[data-xploder-ready="true"]') === null) return;
    state.mounted = true;
    state.readyMs ??= performance.now();
  };
  new MutationObserver(checkReady).observe(document, {
    attributes: true,
    subtree: true,
    attributeFilter: ['data-xploder-ready'],
  });
  checkReady();

  const originalGetContext = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function (type, ...args) {
    const context = Reflect.apply(originalGetContext, this, [type, ...args]);
    if (
      state.rendererConstructorMs === null &&
      (type === 'webgl2' || type === 'webgl') &&
      this.isConnected
    ) {
      state.rendererConstructorMs = performance.now();
    }
    return context;
  };

  for (const contextType of [globalThis.WebGLRenderingContext, globalThis.WebGL2RenderingContext]) {
    const originalLinkProgram = contextType?.prototype.linkProgram;
    if (typeof originalLinkProgram !== 'function') continue;
    contextType.prototype.linkProgram = function (...args) {
      state.programCompileMs ??= performance.now();
      return Reflect.apply(originalLinkProgram, this, args);
    };
  }
})();`;

function loadObserverInitScript(names: boolean): string {
  return names ? LOAD_OBSERVER_NAMED_INIT_SCRIPT : LOAD_OBSERVER_INIT_SCRIPT;
}

function loadTraceCategories(names: boolean): readonly string[] {
  return names ? LOAD_NAMED_TRACE_CATEGORIES : LOAD_TRACE_CATEGORIES;
}

const usage = `Usage: pnpm fps:engine [--scenario explode|tour|startup|load] [options]

Builds the fixture or production export, serves it on 127.0.0.1, and runs the
S3 FPS harness.

Scenarios:
  explode         /dev/engine?fixture=a&cycle=1 via pnpm fps (default)
  tour            live-update tour via in-process Playwright
  startup         production route under the mobile profile and 4x CPU throttle
  load            eager production route from load through load + 5 s, with no input

Options:
  --scenario <name>  explode, tour, startup, or load (default: explode)
  --route <path>     production route for startup or load
  --engage <action>  startup engagement: move or click (default: move)
  --frames <mode>    load frame mode: trace-only or recorder (default: trace-only)
  --cpu <rate>       load CPU throttling rate (default: 4)
  --names            add V8 samples and name the load exceptions
  --caps <json>      named-task caps: {"renderer-constructor": ms, ...}
  --no-build         use an existing export
  --out <dir>        output directory for fps.json
  --help             show this help`;

function exitCodeTable(): string {
  return Object.entries(EXIT)
    .map(([name, code]) => `${code} ${EXIT_DESCRIPTIONS[name as keyof typeof EXIT]}`)
    .join('\n');
}

function stamp(date: Date): string {
  const values = [
    date.getFullYear(),
    date.getMonth() + 1,
    date.getDate(),
    date.getHours(),
    date.getMinutes(),
    date.getSeconds(),
  ].map((value) => String(value).padStart(2, '0'));
  return `${values[0]}${values[1]}${values[2]}-${values[3]}${values[4]}${values[5]}`;
}

function defaultOut(): string {
  if (process.env.CI === 'true') return join(process.cwd(), '.evidence', 'ci', 'fps-engine');
  return join(process.cwd(), '.evidence', `${stamp(new Date())}-fps-engine`);
}

async function runCommand(command: string, args: string[]): Promise<number | null> {
  return await new Promise<number | null>((resolveCode, reject) => {
    const child = spawn(command, args, { cwd: REPO_ROOT, stdio: 'inherit' });
    child.once('error', reject);
    child.once('exit', (code) => resolveCode(code));
  }).catch((error: unknown) => {
    const detail = error instanceof Error ? error.message : String(error);
    throw new CliError(EXIT.INTERNAL, `could not run ${command}: ${detail}`);
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function finiteNumber(value: unknown, field: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new CliError(EXIT.INTERNAL, `invalid fps.json: missing or invalid ${field}`);
  }
  return value;
}

function integerNumber(value: unknown, field: string): number {
  const number = finiteNumber(value, field);
  if (!Number.isInteger(number)) {
    throw new CliError(EXIT.INTERNAL, `invalid fps.json: ${field} must be an integer`);
  }
  return number;
}

function readFpsArtifact(raw: string): FpsResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new CliError(EXIT.INTERNAL, `invalid fps.json: ${detail}`);
  }

  if (!isRecord(parsed) || !isRecord(parsed.intervalsMs)) {
    throw new CliError(EXIT.INTERNAL, 'invalid fps.json: missing fps result fields');
  }
  if (parsed.source !== 'trace:DrawFrame') {
    throw new CliError(EXIT.INTERNAL, 'invalid fps.json: missing or invalid source');
  }
  if (
    parsed.pidSource !== 'trace-metadata' &&
    parsed.pidSource !== 'draw-frame-frequency-fallback'
  ) {
    throw new CliError(EXIT.INTERNAL, 'invalid fps.json: missing or invalid pidSource');
  }
  if (parsed.pid !== null && typeof parsed.pid !== 'number') {
    throw new CliError(EXIT.INTERNAL, 'invalid fps.json: missing or invalid pid');
  }
  if (typeof parsed.chromium !== 'string') {
    throw new CliError(EXIT.INTERNAL, 'invalid fps.json: missing or invalid chromium');
  }

  return {
    fps: finiteNumber(parsed.fps, 'fps'),
    frames: integerNumber(parsed.frames, 'frames'),
    droppedFrames: integerNumber(parsed.droppedFrames, 'droppedFrames'),
    windowMs: finiteNumber(parsed.windowMs, 'windowMs'),
    intervalsMs: {
      p50: finiteNumber(parsed.intervalsMs.p50, 'intervalsMs.p50'),
      p95: finiteNumber(parsed.intervalsMs.p95, 'intervalsMs.p95'),
      max: finiteNumber(parsed.intervalsMs.max, 'intervalsMs.max'),
    },
    rafFps: finiteNumber(parsed.rafFps, 'rafFps'),
    source: 'trace:DrawFrame',
    chromium: parsed.chromium,
    pid: parsed.pid,
    pidSource: parsed.pidSource,
  };
}

export function evaluateVerdict(fps: number, droppedFrames: number): FpsEngineVerdict {
  const droppedFrames0 = droppedFrames === 0;
  const liveness = inBand(fps, FPS_NOMINAL, FPS_TOLERANCE);

  return {
    rule: 'dropped-frames',
    droppedFrames0,
    liveness,
    pass: droppedFrames0 && liveness,
  };
}

export function evaluateStartupVerdict(
  droppedFrames: number,
  maxLongTaskMs: number,
): FpsEngineStartupVerdict {
  const droppedFrames0 = droppedFrames === 0;
  const longTask50 = maxLongTaskMs <= LONG_TASK_THRESHOLD_MS;

  return {
    rule: 'startup',
    droppedFrames0,
    longTask50,
    pass: droppedFrames0 && longTask50,
  };
}

export function evaluateLoadVerdict(
  maxLongTaskMs: number,
  droppedFrames: number,
  frames: LoadFrameMode,
): FpsEngineLoadVerdict {
  return {
    longTask50: maxLongTaskMs <= LONG_TASK_THRESHOLD_MS,
    droppedFramesLe2: droppedFrames <= LOAD_DROPPED_FRAME_LIMIT,
    gated: frames === 'trace-only',
  };
}

export function scenarioUrl(base: URL, scenario: Scenario, route?: string): URL {
  if (scenario === 'startup' || scenario === 'load') {
    if (route === undefined) {
      throw new CliError(EXIT.USAGE, `--route is required with --scenario ${scenario}`);
    }
    if (!route.startsWith('/') || route.startsWith('//')) {
      throw new CliError(EXIT.USAGE, `--route must be an absolute path: ${route}`);
    }
    return new URL(route, base);
  }

  const url = new URL('dev/engine', base);
  url.searchParams.set('fixture', 'a');

  if (scenario === 'explode') {
    url.searchParams.set('cycle', '1');
  } else {
    url.searchParams.set('state', 'exploded');
    url.searchParams.set('flow', 'live-update');
    url.searchParams.set('tour', 'play');
    url.searchParams.set('loop', '1');
  }

  return url;
}

export function buildStartupReport(
  result: FpsResult,
  measurementUrl: string,
  route: string,
  engage: Engagement,
  longTasks: readonly LongTask[],
  mainThreadTaskCount: number,
): FpsEngineStartupReport {
  const maxLongTaskMs = longTasks.reduce((maximum, task) => Math.max(maximum, task.dur), 0);
  const trace = (result.trace ?? []) as StartupTraceEvent[];
  const traceStartUs = traceWindowStart(trace);
  const traceEndUs = traceStartUs === null ? null : traceStartUs + STARTUP_WINDOW_MS * 1000;
  const droppedFrameTimes =
    traceStartUs === null || traceEndUs === null
      ? []
      : droppedFrameTimesFromTrace(trace, traceStartUs, traceEndUs);
  const tasksOver16ms =
    traceStartUs === null
      ? []
      : findTasksOver(
          trace,
          traceStartUs,
          traceStartUs + STARTUP_WINDOW_MS * 1000,
          TASK_TIMELINE_THRESHOLD_MS,
          traceStartUs,
          true,
        );

  return {
    kind: 'fps-engine',
    version: 1,
    url: measurementUrl,
    scenario: 'startup',
    route,
    engage,
    cpuThrottle: STARTUP_CPU_THROTTLE,
    fps: result.fps,
    frames: result.frames,
    droppedFrames: result.droppedFrames,
    windowMs: result.windowMs,
    intervalsMs: result.intervalsMs,
    rafFps: result.rafFps,
    source: result.source,
    chromium: result.chromium,
    pid: result.pid,
    pidSource: result.pidSource,
    longTasks: [...longTasks],
    droppedFrameTimes,
    tasksOver16ms,
    maxLongTaskMs,
    mainThreadTaskCount,
    liveness: 'not-applicable',
    verdict: evaluateStartupVerdict(result.droppedFrames, maxLongTaskMs),
  };
}

const NAMED_EXCEPTION_NAMES = [
  'renderer-constructor',
  'program-compile',
  'first-content-frame',
] as const;

interface NamedTaskRecord {
  startUs: number;
  endUs: number;
  names: Set<(typeof NAMED_EXCEPTION_NAMES)[number]>;
  containsReady: boolean;
}

function namedTopFunctions(
  trace: readonly StartupTraceEvent[],
  task: NamedTaskRecord,
): NamedFunction[] {
  const functions = new Map<string, { fn: string; url: string; selfUs: number }>();
  for (const sample of samplesInWindow(
    trace as readonly CpuProfileTraceEvent[],
    task.startUs,
    task.endUs,
  )) {
    const overlapUs = Math.min(sample.endUs, task.endUs) - Math.max(sample.startUs, task.startUs);
    if (overlapUs <= 0) continue;

    const functionName = sample.node.callFrame.functionName.trim();
    if (functionName === '(idle)') continue;
    const url = sample.node.callFrame.url;
    const fn = functionName || (url === '' ? '(native)' : '(anonymous)');
    const key = `${url}\0${fn}`;
    const prior = functions.get(key);
    if (prior === undefined) functions.set(key, { fn, url, selfUs: overlapUs });
    else prior.selfUs += overlapUs;
  }

  const durationUs = task.endUs - task.startUs;
  return [...functions.values()]
    .sort(
      (left, right) =>
        right.selfUs - left.selfUs ||
        left.fn.localeCompare(right.fn) ||
        left.url.localeCompare(right.url),
    )
    .slice(0, 8)
    .map((entry) => ({
      fn: entry.fn,
      url: entry.url,
      selfMs: entry.selfUs / 1_000,
      pct: durationUs === 0 ? 0 : (entry.selfUs / durationUs) * 100,
    }));
}

export function buildNamedLoadReport(loadMs: number, options: NamedLoadOptions): NamedLoadReport {
  const loadUs = options.traceTimeOriginUs + loadMs * 1_000;
  const endUs = loadUs + LOAD_WINDOW_MS * 1_000;
  const records: NamedTaskRecord[] = findTasksIntersectingWindow(
    options.trace,
    loadUs,
    endUs,
    0,
    options.traceTimeOriginUs,
    true,
  ).intersecting.map((task) => ({
    startUs: options.traceTimeOriginUs + task.start * 1_000,
    endUs: options.traceTimeOriginUs + (task.start + task.dur) * 1_000,
    names: new Set(),
    containsReady: false,
  }));

  const timestamps = {
    'renderer-constructor': options.rendererConstructorMs,
    'program-compile': options.programCompileMs,
    'first-content-frame': options.readyMs,
  } satisfies Record<(typeof NAMED_EXCEPTION_NAMES)[number], number | null>;

  for (const name of NAMED_EXCEPTION_NAMES) {
    const timestampMs = timestamps[name];
    if (timestampMs === null || !Number.isFinite(timestampMs)) continue;
    const timestampUs = options.traceTimeOriginUs + timestampMs * 1_000;
    let task = records.find(
      (candidate) => timestampUs >= candidate.startUs && timestampUs < candidate.endUs,
    );
    if (task === undefined) {
      const containing = findTasksIntersectingWindow(
        options.trace,
        timestampUs,
        timestampUs,
        0,
        options.traceTimeOriginUs,
        true,
      ).intersecting[0];
      if (containing !== undefined) {
        task = {
          startUs: options.traceTimeOriginUs + containing.start * 1_000,
          endUs: options.traceTimeOriginUs + (containing.start + containing.dur) * 1_000,
          names: new Set(),
          containsReady: false,
        };
        records.push(task);
      }
    }
    if (task !== undefined) task.names.add(name);
  }

  if (options.readyMs !== null) {
    const readyUs = options.traceTimeOriginUs + options.readyMs * 1_000;
    for (const task of records) {
      task.containsReady = readyUs >= task.startUs && readyUs <= task.endUs;
    }
  }

  records.sort((left, right) => left.startUs - right.startUs || right.endUs - left.endUs);
  const names: NamedTask[] = [];
  for (const record of records) {
    const durMs = (record.endUs - record.startUs) / 1_000;
    const selected = NAMED_EXCEPTION_NAMES.filter((name) => record.names.has(name));
    if (selected.length > 0) {
      for (const name of selected) {
        names.push({
          name,
          startMs: (record.startUs - options.traceTimeOriginUs) / 1_000,
          durMs,
          topFunctions: namedTopFunctions(options.trace, record),
          containsReady: record.containsReady,
        });
      }
    } else if (durMs >= TASK_TIMELINE_THRESHOLD_MS) {
      names.push({
        name: 'unnamed',
        startMs: (record.startUs - options.traceTimeOriginUs) / 1_000,
        durMs,
        topFunctions: namedTopFunctions(options.trace, record),
        containsReady: record.containsReady,
      });
    }
  }

  const namedExceptions = Object.fromEntries(
    NAMED_EXCEPTION_NAMES.map((name) => {
      const match = names.find((task) => task.name === name);
      const cap = options.caps?.[name];
      return [
        name,
        match === undefined
          ? { durMs: null, ...(cap === undefined ? {} : { cap, pass: false }) }
          : {
              durMs: match.durMs,
              ...(cap === undefined ? {} : { cap, pass: match.durMs <= cap }),
            },
      ];
    }),
  ) as NamedExceptions;
  const namedWithinCaps =
    options.caps === undefined
      ? undefined
      : NAMED_EXCEPTION_NAMES.every((name) => {
          const cap = options.caps?.[name];
          if (cap === undefined) return true;
          return namedExceptions[name].pass === true;
        });
  const unnamedMaxMs = records.reduce((maximum, record) => {
    if (record.names.size > 0) return maximum;
    return Math.max(maximum, (record.endUs - record.startUs) / 1_000);
  }, 0);

  return {
    names,
    namedExceptions,
    unnamedMaxMs,
    ...(namedWithinCaps === undefined ? {} : { namedWithinCaps }),
  };
}

export function buildLoadReport(
  result: FpsResult,
  measurementUrl: string,
  route: string,
  frames: LoadFrameMode,
  cpuThrottle: number,
  loadMs: number,
  mounted: boolean,
  readyMs: number | null,
  longTasks: readonly TaskWindowEntry[],
  preLoadTasks: readonly TaskWindowEntry[],
  droppedFrameTimes: readonly number[],
  named?: NamedLoadOptions,
): FpsEngineLoadReport {
  const maxLongTaskMs = longTasks.reduce((maximum, task) => Math.max(maximum, task.dur), 0);
  const droppedFrames = droppedFrameTimes.length;

  const report: FpsEngineLoadReport = {
    kind: 'fps-engine',
    version: 1,
    url: measurementUrl,
    scenario: 'load',
    route,
    frames,
    cpuThrottle,
    loadMs,
    fps: result.fps,
    frameCount: result.frames,
    droppedFrames,
    windowMs: LOAD_WINDOW_MS,
    intervalsMs: result.intervalsMs,
    rafFps: result.rafFps,
    source: result.source,
    chromium: result.chromium,
    pid: result.pid,
    pidSource: result.pidSource,
    longTasks: [...longTasks],
    maxLongTaskMs,
    preLoadTasks: [...preLoadTasks],
    droppedFrameTimes: [...droppedFrameTimes],
    mounted,
    readyMs,
    verdict: evaluateLoadVerdict(maxLongTaskMs, droppedFrames, frames),
    ...(frames === 'recorder' ? { exclusionNote: RECORDER_EXCLUSION } : {}),
  };
  if (named === undefined) return report;

  const namedReport = buildNamedLoadReport(loadMs, named);
  return {
    ...report,
    names: namedReport.names,
    namedExceptions: namedReport.namedExceptions,
    unnamedMaxMs: namedReport.unnamedMaxMs,
    verdict:
      namedReport.namedWithinCaps === undefined
        ? report.verdict
        : { ...report.verdict, namedWithinCaps: namedReport.namedWithinCaps },
  };
}

export function assertLoadMounted(mounted: boolean): void {
  if (!mounted) {
    throw new CliError(
      EXIT.INTERNAL,
      'load run did not mount: data-xploder-ready was not observed',
    );
  }
}

function traceWindowStart(events: readonly StartupTraceEvent[]): number | null {
  const tracingStart = events.find(
    (event) => event.name === 'TracingStartedInBrowser' && typeof event.ts === 'number',
  )?.ts;
  if (tracingStart !== undefined) return tracingStart;

  let earliest: number | null = null;
  for (const event of events) {
    if (
      (event.name === 'RunTask' || event.name === 'ThreadControllerImpl::RunTask') &&
      typeof event.ts === 'number' &&
      (earliest === null || event.ts < earliest)
    ) {
      earliest = event.ts;
    }
  }
  if (earliest !== null) return earliest;

  for (const event of events) {
    if (typeof event.ts === 'number' && (earliest === null || event.ts < earliest)) {
      earliest = event.ts;
    }
  }
  return earliest;
}

export function longTasksFromTrace(events: readonly StartupTraceEvent[]): LongTask[] {
  const startUs = traceWindowStart(events);
  if (startUs === null) return [];

  return findLongTasks(
    events,
    startUs,
    startUs + STARTUP_WINDOW_MS * 1_000,
    () => 'other',
    startUs,
    true,
  );
}

export function mainThreadTaskCountFromTrace(events: readonly StartupTraceEvent[]): number {
  const startUs = traceWindowStart(events);
  if (startUs === null) return 0;

  return countMainThreadTasks(events, startUs, startUs + STARTUP_WINDOW_MS * 1_000, true);
}

export function assertLongTaskCheckIsNotVacuous(mainThreadTaskCount: number): void {
  if (mainThreadTaskCount === 0) {
    throw new CliError(EXIT.INTERNAL, 'vacuous long-task check: no main-thread tasks in trace');
  }
}

export function buildFpsReport(
  result: FpsResult,
  scenario: FixtureScenario,
  url: string,
  details: Partial<Pick<TourResult, 'tourStepsAdvanced' | 'drawCalls'>> = {},
): FpsEngineReport {
  return {
    kind: 'fps-engine',
    version: 1,
    url,
    scenario,
    fps: result.fps,
    frames: result.frames,
    droppedFrames: result.droppedFrames,
    windowMs: result.windowMs,
    intervalsMs: result.intervalsMs,
    rafFps: result.rafFps,
    source: result.source,
    chromium: result.chromium,
    pid: result.pid,
    pidSource: result.pidSource,
    ...details,
    verdict: evaluateVerdict(result.fps, result.droppedFrames),
  };
}

function parseScenario(value: string | undefined): Scenario {
  if (value === undefined || value === 'explode') return 'explode';
  if (value === 'tour') return 'tour';
  if (value === 'startup') return 'startup';
  if (value === 'load') return 'load';
  throw new CliError(EXIT.USAGE, `--scenario must be explode, tour, startup, or load: ${value}`);
}

function requiredRoute(value: string | undefined, scenario: 'startup' | 'load'): string {
  if (value === undefined) {
    throw new CliError(EXIT.USAGE, `--route is required with --scenario ${scenario}`);
  }
  if (!value.startsWith('/') || value.startsWith('//')) {
    throw new CliError(EXIT.USAGE, `--route must be an absolute path: ${value}`);
  }
  return value;
}

function parseEngagement(value: string | undefined): Engagement {
  if (value === undefined || value === 'move') return 'move';
  if (value === 'click') return 'click';
  throw new CliError(EXIT.USAGE, `--engage must be move or click: ${value}`);
}

function parseFrames(value: string | undefined): LoadFrameMode {
  if (value === undefined || value === 'trace-only') return 'trace-only';
  if (value === 'recorder') return 'recorder';
  throw new CliError(EXIT.USAGE, `--frames must be trace-only or recorder: ${value}`);
}

function parseCpu(value: string | undefined): number {
  if (value === undefined) return LOAD_CPU_THROTTLE;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new CliError(EXIT.USAGE, '--cpu must be a positive number');
  }
  return parsed;
}

async function readNamedCaps(path: string): Promise<NamedCaps> {
  const resolved = resolve(process.cwd(), path);
  let parsed: unknown;
  try {
    parsed = JSON.parse(await readFile(resolved, 'utf8')) as unknown;
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new CliError(EXIT.USAGE, `could not read --caps ${resolved}: ${detail}`);
  }
  if (!isRecord(parsed)) {
    throw new CliError(EXIT.USAGE, '--caps must contain a JSON object');
  }

  const caps: NamedCaps = {};
  for (const [name, value] of Object.entries(parsed)) {
    if (!NAMED_EXCEPTION_NAMES.includes(name as (typeof NAMED_EXCEPTION_NAMES)[number])) {
      throw new CliError(EXIT.USAGE, `unknown --caps name: ${name}`);
    }
    if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
      throw new CliError(EXIT.USAGE, `--caps ${name} must be a non-negative number`);
    }
    caps[name as keyof NamedCaps] = value;
  }
  return caps;
}

interface NetworkWatcher {
  waitForQuiet(): Promise<void>;
  stop(): void;
}

function watchNetwork(page: Page): NetworkWatcher {
  const inFlight = new Set<Request>();
  let onChange: (() => void) | undefined;
  let stopped = false;

  const started = (request: Request): void => {
    if (stopped) return;
    inFlight.add(request);
    onChange?.();
  };
  const finished = (request: Request): void => {
    if (stopped) return;
    inFlight.delete(request);
    onChange?.();
  };

  page.on('request', started);
  page.on('requestfinished', finished);
  page.on('requestfailed', finished);

  return {
    waitForQuiet(): Promise<void> {
      return new Promise((resolveQuiet, reject) => {
        let quietTimer: NodeJS.Timeout | undefined;
        let done = false;

        const finish = (): void => {
          if (done) return;
          done = true;
          onChange = undefined;
          if (quietTimer) clearTimeout(quietTimer);
          clearTimeout(timeout);
          resolveQuiet();
        };

        const update = (): void => {
          if (done) return;
          if (inFlight.size > 0) {
            if (quietTimer) {
              clearTimeout(quietTimer);
              quietTimer = undefined;
            }
            return;
          }

          quietTimer ??= setTimeout(finish, QUIET_MS);
        };

        const timeout = setTimeout(() => {
          if (done) return;
          done = true;
          onChange = undefined;
          if (quietTimer) clearTimeout(quietTimer);
          reject(new CliError(EXIT.UNREACHABLE, `page did not become network-quiet within 30 s`));
        }, NAVIGATION_TIMEOUT_MS);

        onChange = update;
        update();
      });
    },
    stop(): void {
      stopped = true;
      onChange = undefined;
      page.off('request', started);
      page.off('requestfinished', finished);
      page.off('requestfailed', finished);
    },
  };
}

async function installTourCounter(page: Page): Promise<void> {
  await page.evaluate(
    ({ key, selector }) => {
      const target = window as unknown as Record<string, TourCounter | undefined>;
      target[key]?.observer.disconnect();

      const viewer = document.querySelector(selector);
      if (viewer === null) throw new Error(`tour viewer not found: ${selector}`);

      // Count real step changes only: the viewer may rewrite the attribute with the same value.
      let last = viewer.getAttribute('data-xploder-tour-step');
      const counter: TourCounter = {
        advanced: 0,
        observer: new MutationObserver(() => {
          const current = viewer.getAttribute('data-xploder-tour-step');
          if (current !== last) {
            counter.advanced += 1;
            last = current;
          }
        }),
      };
      counter.observer.observe(viewer, {
        attributes: true,
        attributeFilter: ['data-xploder-tour-step'],
        attributeOldValue: true,
      });
      target[key] = counter;
    },
    { key: TOUR_COUNTER_KEY, selector: TOUR_SELECTOR },
  );
}

async function readTourCounter(page: Page): Promise<number> {
  return await page.evaluate((key) => {
    const target = window as unknown as Record<string, TourCounter | undefined>;
    const counter = target[key];
    if (counter === undefined) throw new Error('tour step counter was not installed');

    counter.observer.disconnect();
    delete target[key];
    return counter.advanced;
  }, TOUR_COUNTER_KEY);
}

async function readDrawCalls(page: Page): Promise<number> {
  const raw = await page.locator('[data-engine-draw-calls]').getAttribute('data-engine-draw-calls');
  const drawCalls = Number(raw);
  if (!Number.isInteger(drawCalls)) {
    throw new Error(`playground draw calls are incomplete: ${raw ?? 'missing'}`);
  }
  return drawCalls;
}

function startupEngagement(page: Page, engage: Engagement): () => Promise<void> {
  return async () => {
    if (engage === 'click') {
      await page.locator(EXPLORE_3D_SELECTOR).click();
      return;
    }

    const viewport = page.viewportSize();
    if (viewport === null) throw new Error('mobile viewport is unavailable');
    await page.mouse.move(viewport.width / 2, viewport.height / 2, { steps: 2 });
  };
}

interface StartupMeasurement {
  result: FpsResult;
  longTasks: LongTask[];
  mainThreadTaskCount: number;
}

async function measureStartup(url: URL, engage: Engagement): Promise<StartupMeasurement> {
  const browser = await launch();
  try {
    const screen = PROFILES.mobile.screenEmulation;
    const context = await browser.newContext({
      viewport: { width: screen.width, height: screen.height },
      screen: { width: screen.width, height: screen.height },
      deviceScaleFactor: screen.deviceScaleFactor,
      isMobile: screen.mobile,
      userAgent: PROFILES.mobile.userAgent,
    });
    const page = await context.newPage();
    const cdp = await context.newCDPSession(page);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: STARTUP_CPU_THROTTLE });

    const network = watchNetwork(page);
    try {
      try {
        await page.goto(url.href, { waitUntil: 'load', timeout: NAVIGATION_TIMEOUT_MS });
      } catch (error) {
        const detail = error instanceof Error ? error.message : String(error);
        throw new CliError(EXIT.UNREACHABLE, `unreachable: ${url.href}: ${detail}`);
      }

      await page.waitForFunction(() => document.visibilityState === 'visible', undefined, {
        timeout: NAVIGATION_TIMEOUT_MS,
      });
      await network.waitForQuiet();

      const result = await measureFps(page, {
        warmupMs: 0,
        durationMs: STARTUP_WINDOW_MS,
        trigger: startupEngagement(page, engage),
        keepTrace: true,
        extraCategories: STARTUP_TRACE_CATEGORIES,
      });
      if (result.trace === undefined) throw new Error('startup trace was not retained');

      const trace = result.trace as StartupTraceEvent[];
      return {
        result,
        longTasks: longTasksFromTrace(trace),
        mainThreadTaskCount: mainThreadTaskCountFromTrace(trace),
      };
    } finally {
      network.stop();
    }
  } finally {
    await browser.close();
  }
}

interface LoadObserverState {
  loadMs: number | null;
  mounted: boolean;
  readyMs: number | null;
  rendererConstructorMs?: number | null;
  programCompileMs?: number | null;
}

interface LoadMeasurement {
  result: FpsResult;
  loadMs: number;
  mounted: boolean;
  readyMs: number | null;
  longTasks: TaskWindowEntry[];
  preLoadTasks: TaskWindowEntry[];
  droppedFrameTimes: number[];
  rendererConstructorMs?: number | null;
  programCompileMs?: number | null;
  traceOriginUs: number;
}

async function readLoadObserver(page: Page): Promise<LoadObserverState> {
  return await page.evaluate((key) => {
    const state = (window as unknown as Record<string, LoadObserverState | undefined>)[key];
    if (state === undefined) throw new Error('load observer was not installed');
    return state;
  }, LOAD_OBSERVER_KEY);
}

async function waitForLoadRecorded(page: Page): Promise<number> {
  await page.waitForFunction(
    (key) => {
      const state = (window as unknown as Record<string, LoadObserverState | undefined>)[key];
      return state?.loadMs !== null && state?.loadMs !== undefined;
    },
    LOAD_OBSERVER_KEY,
    { timeout: NAVIGATION_TIMEOUT_MS },
  );
  const state = await readLoadObserver(page);
  if (state.loadMs === null) throw new Error('load timestamp was not recorded');
  return state.loadMs;
}

async function waitForLoadWindow(page: Page, loadMs: number): Promise<void> {
  const remainder = await page.evaluate(
    ({ start, duration }) => Math.max(0, start + duration - performance.now()),
    { start: loadMs, duration: LOAD_WINDOW_MS },
  );
  if (remainder > 0) await page.waitForTimeout(remainder);
}

function loadWindowDetails(
  trace: readonly StartupTraceEvent[],
  loadUs: number,
): Pick<LoadMeasurement, 'longTasks' | 'preLoadTasks' | 'droppedFrameTimes'> {
  const endUs = loadUs + LOAD_WINDOW_MS * 1_000;
  const tasks = findTasksIntersectingWindow(
    trace,
    loadUs,
    endUs,
    LONG_TASK_THRESHOLD_MS,
    loadUs,
    true,
  );
  return {
    longTasks: tasks.intersecting,
    preLoadTasks: tasks.preLoad,
    droppedFrameTimes: droppedFrameTimesFromTrace(trace, loadUs, endUs),
  };
}

async function measureLoadTraceOnly(
  url: URL,
  cpu: number,
  names: boolean,
): Promise<LoadMeasurement> {
  const browser = await launch();
  try {
    const screen = PROFILES.mobile.screenEmulation;
    const context = await browser.newContext({
      viewport: { width: screen.width, height: screen.height },
      screen: { width: screen.width, height: screen.height },
      deviceScaleFactor: screen.deviceScaleFactor,
      isMobile: screen.mobile,
      userAgent: PROFILES.mobile.userAgent,
    });
    await context.addInitScript({ content: loadObserverInitScript(names) });
    const page = await context.newPage();
    const cdp = await context.newCDPSession(page);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: cpu });

    const trace: StartupTraceEvent[] = [];
    const traceComplete = new Promise<void>((resolveTrace) => {
      cdp.once('Tracing.tracingComplete', () => resolveTrace());
    });
    cdp.on('Tracing.dataCollected', (payload: { value: StartupTraceEvent[] }) => {
      trace.push(...payload.value);
    });

    let tracingStarted = false;
    let tracingEnded = false;
    try {
      await cdp.send('Tracing.start', {
        categories: traceCategories(loadTraceCategories(names)),
        transferMode: 'ReportEvents',
      });
      tracingStarted = true;

      try {
        await page.goto(url.href, { waitUntil: 'load', timeout: NAVIGATION_TIMEOUT_MS });
      } catch (error) {
        const detail = error instanceof Error ? error.message : String(error);
        throw new CliError(EXIT.UNREACHABLE, `unreachable: ${url.href}: ${detail}`);
      }

      const initial = await waitForLoadRecorded(page);
      await waitForLoadWindow(page, initial);
      const state = await readLoadObserver(page);
      if (state.loadMs === null) throw new Error('load timestamp was not recorded');

      await cdp.send('Tracing.end');
      tracingEnded = true;
      await traceComplete;

      const loadMark = findPerformanceMark(trace, LOAD_MARK);
      if (loadMark === null) {
        throw new CliError(EXIT.INTERNAL, `trace did not contain the ${LOAD_MARK} mark`);
      }
      const traceOriginUs = traceTimeOriginFromMark(loadMark, state.loadMs);
      const loadUs = traceOriginUs + state.loadMs * 1_000;
      const endUs = loadUs + LOAD_WINDOW_MS * 1_000;
      const analyzed = analyzeTrace(trace as unknown as FpsTraceEvent[], loadUs, endUs);
      const details = loadWindowDetails(trace, loadUs);

      return {
        result: {
          ...analyzed,
          rafFps: 0,
          chromium: chromiumVersion(browser),
          trace,
        },
        loadMs: state.loadMs,
        mounted: state.mounted,
        readyMs: state.readyMs,
        rendererConstructorMs: state.rendererConstructorMs,
        programCompileMs: state.programCompileMs,
        traceOriginUs,
        ...details,
      };
    } finally {
      if (tracingStarted && !tracingEnded) {
        try {
          await cdp.send('Tracing.end');
        } catch {
          // Preserve the original measurement error.
        }
      }
      await cdp.detach().catch(() => undefined);
    }
  } finally {
    await browser.close();
  }
}

async function measureLoadRecorder(
  url: URL,
  cpu: number,
  names: boolean,
): Promise<LoadMeasurement> {
  const browser = await launch();
  try {
    const screen = PROFILES.mobile.screenEmulation;
    const context = await browser.newContext({
      viewport: { width: screen.width, height: screen.height },
      screen: { width: screen.width, height: screen.height },
      deviceScaleFactor: screen.deviceScaleFactor,
      isMobile: screen.mobile,
      userAgent: PROFILES.mobile.userAgent,
    });
    await context.addInitScript({ content: loadObserverInitScript(names) });
    const page = await context.newPage();
    const cdp = await context.newCDPSession(page);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: cpu });

    try {
      await page.goto(url.href, { waitUntil: 'load', timeout: NAVIGATION_TIMEOUT_MS });
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      throw new CliError(EXIT.UNREACHABLE, `unreachable: ${url.href}: ${detail}`);
    }

    await waitForLoadRecorded(page);
    const result = await measureFps(page, {
      warmupMs: 0,
      durationMs: LOAD_WINDOW_MS,
      keepTrace: true,
      extraCategories: loadTraceCategories(names),
      traceStartMark: LOAD_RECORDER_START_MARK,
    });
    if (result.trace === undefined) throw new Error('load recorder trace was not retained');

    const state = await readLoadObserver(page);
    if (state.loadMs === null) throw new Error('load timestamp was not recorded');
    const trace = result.trace as StartupTraceEvent[];
    const anchor = findPerformanceMark(trace, LOAD_RECORDER_START_MARK);
    if (anchor === null) {
      throw new CliError(
        EXIT.INTERNAL,
        `trace did not contain the ${LOAD_RECORDER_START_MARK} mark`,
      );
    }
    const anchorMs = await page.evaluate((name) => {
      const entry = performance.getEntriesByName(name).at(-1);
      return entry?.startTime ?? null;
    }, LOAD_RECORDER_START_MARK);
    if (anchorMs === null) throw new Error('recorder trace anchor was not recorded');

    const traceOriginUs = traceTimeOriginFromMark(anchor, anchorMs);
    const loadUs = traceOriginUs + state.loadMs * 1_000;
    const details = loadWindowDetails(trace, loadUs);
    return {
      result,
      loadMs: state.loadMs,
      mounted: state.mounted,
      readyMs: state.readyMs,
      rendererConstructorMs: state.rendererConstructorMs,
      programCompileMs: state.programCompileMs,
      traceOriginUs,
      ...details,
    };
  } finally {
    await browser.close();
  }
}

async function measureLoad(
  url: URL,
  frames: LoadFrameMode,
  cpu: number,
  names: boolean,
): Promise<LoadMeasurement> {
  return frames === 'trace-only'
    ? await measureLoadTraceOnly(url, cpu, names)
    : await measureLoadRecorder(url, cpu, names);
}

async function measureTour(url: URL): Promise<TourResult> {
  const browser = await launch();
  try {
    const { width, height, deviceScaleFactor, mobile } = PROFILES.desktop.screenEmulation;
    const context = await browser.newContext({
      viewport: { width, height },
      deviceScaleFactor,
      isMobile: mobile,
      userAgent: PROFILES.desktop.userAgent,
    });
    const page = await context.newPage();

    try {
      await page.goto(url.href, { waitUntil: 'load', timeout: NAVIGATION_TIMEOUT_MS });
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      throw new CliError(EXIT.UNREACHABLE, `unreachable: ${url.href}: ${detail}`);
    }

    await page.waitForSelector(TOUR_SELECTOR, { timeout: NAVIGATION_TIMEOUT_MS });
    const result = await measureFps(page, { trigger: installTourCounter });
    const tourStepsAdvanced = await readTourCounter(page);
    const drawCalls = await readDrawCalls(page);

    return { result, tourStepsAdvanced, drawCalls };
  } finally {
    await browser.close();
  }
}

function printReport(report: FpsEngineReport, artifact: string): void {
  console.log(`scenario: ${report.scenario}`);
  console.log(
    `fps: ${report.fps.toFixed(2)} (${report.frames} frames / ${report.windowMs.toFixed(0)} ms)`,
  );
  console.log(`droppedFrames: ${report.droppedFrames}`);
  if (report.tourStepsAdvanced !== undefined) {
    console.log(`tourStepsAdvanced: ${report.tourStepsAdvanced}`);
  }
  if (report.drawCalls !== undefined) console.log(`drawCalls: ${report.drawCalls}`);
  console.log(`liveness: ${report.verdict.liveness}`);
  console.log(`verdict: ${report.verdict.pass ? 'pass' : 'fail'} (${report.verdict.rule})`);
  console.log(`fps.json: ${artifact}`);
}

function printStartupReport(report: FpsEngineStartupReport, artifact: string): void {
  console.log(`scenario: ${report.scenario}`);
  console.log(`route: ${report.route}`);
  console.log(`engage: ${report.engage}`);
  console.log(`cpuThrottle: ${report.cpuThrottle}x`);
  console.log(
    `fps: ${report.fps.toFixed(2)} (${report.frames} frames / ${report.windowMs.toFixed(0)} ms)`,
  );
  console.log(`droppedFrames: ${report.droppedFrames}`);
  console.log(`longTasks: ${report.longTasks.length}`);
  console.log(`maxLongTaskMs: ${report.maxLongTaskMs.toFixed(1)}`);
  console.log(`mainThreadTaskCount: ${report.mainThreadTaskCount}`);
  console.log(`pidSource: ${report.pidSource}`);
  console.log(`liveness: not-applicable`);
  console.log(`verdict: ${report.verdict.pass ? 'pass' : 'fail'} (${report.verdict.rule})`);
  console.log(`fps.json: ${artifact}`);
}

function printLoadReport(report: FpsEngineLoadReport, artifact: string): void {
  console.log(`scenario: ${report.scenario}`);
  console.log(`route: ${report.route}`);
  console.log(`frames: ${report.frames}`);
  console.log(`cpuThrottle: ${report.cpuThrottle}x`);
  console.log(`loadMs: ${report.loadMs.toFixed(1)}`);
  console.log(`windowMs: ${report.windowMs}`);
  console.log(`longTasks: ${report.longTasks.length}`);
  console.log(`maxLongTaskMs: ${report.maxLongTaskMs.toFixed(1)}`);
  console.log(`preLoadTasks: ${report.preLoadTasks.length}`);
  console.log(`droppedFrames: ${report.droppedFrames}`);
  console.log(`mounted: ${report.mounted}`);
  console.log(`readyMs: ${report.readyMs === null ? 'null' : report.readyMs.toFixed(1)}`);
  console.log(`gated: ${report.verdict.gated}`);
  console.log(
    `verdict: ${
      report.verdict.gated
        ? report.verdict.longTask50 && report.verdict.droppedFramesLe2
          ? 'pass'
          : 'fail'
        : 'informational (not gated)'
    }`,
  );
  if (report.exclusionNote !== undefined) console.log(`exclusion: ${report.exclusionNote}`);
  console.log(`fps.json: ${artifact}`);
}

export async function main(argv: string[]): Promise<number> {
  const { values } = parseCli<FpsEngineArgs>(argv, {
    options: {
      scenario: { type: 'string' },
      out: { type: 'string' },
      route: { type: 'string' },
      engage: { type: 'string' },
      frames: { type: 'string' },
      cpu: { type: 'string' },
      names: { type: 'boolean' },
      caps: { type: 'string' },
      'no-build': { type: 'boolean' },
      help: { type: 'boolean' },
    },
    allowPositionals: false,
  });

  if (values.help) {
    console.log(`${usage}\n\nExit codes:\n${exitCodeTable()}`);
    return EXIT.OK;
  }

  const scenario = parseScenario(values.scenario);
  const production = scenario === 'startup' || scenario === 'load';
  if (!production && values.route !== undefined) {
    throw new CliError(EXIT.USAGE, '--route is only valid with --scenario startup or load');
  }
  if (scenario !== 'startup' && values.engage !== undefined) {
    throw new CliError(EXIT.USAGE, '--engage is only valid with --scenario startup');
  }
  if (scenario !== 'load' && values.frames !== undefined) {
    throw new CliError(EXIT.USAGE, '--frames is only valid with --scenario load');
  }
  if (scenario !== 'load' && values.cpu !== undefined) {
    throw new CliError(EXIT.USAGE, '--cpu is only valid with --scenario load');
  }
  if (scenario !== 'load' && values.names !== undefined) {
    throw new CliError(EXIT.USAGE, '--names is only valid with --scenario load');
  }
  if (values.caps !== undefined && values.names !== true) {
    throw new CliError(EXIT.USAGE, '--caps requires --names');
  }

  const exportDir = production ? WEB_OUT_DIR : FIXTURE_DIR;

  if (!values['no-build']) {
    console.log(
      scenario === 'load'
        ? 'building eager export...'
        : production
          ? 'building production export...'
          : 'building fixture export...',
    );
    const buildScript =
      scenario === 'load' ? 'build:eager' : production ? 'build' : 'build:fixtures';
    const buildCode = await runCommand('pnpm', [buildScript]);
    if (buildCode !== 0) {
      throw new CliError(
        EXIT.INTERNAL,
        `pnpm ${buildScript} exited with ${buildCode ?? 'a signal'}`,
      );
    }
  }

  try {
    const directory = await stat(exportDir);
    if (!directory.isDirectory()) throw new Error('not a directory');
  } catch {
    const label = production ? 'production' : 'fixture';
    throw new CliError(EXIT.USAGE, `${label} export not found: ${exportDir}`);
  }

  const outDir = values.out ?? defaultOut();
  await mkdir(outDir, { recursive: true });
  const port = await freePort();
  const server = await serveDir(exportDir, { port });

  let report: FpsEngineReport | FpsEngineStartupReport | FpsEngineLoadReport;
  try {
    if (scenario === 'startup') {
      const route = requiredRoute(values.route, scenario);
      const engage = parseEngagement(values.engage);
      const url = scenarioUrl(server.url, scenario, route);
      console.log(`production: ${url.href}`);

      const measurement = await measureStartup(url, engage);
      report = buildStartupReport(
        measurement.result,
        url.href,
        route,
        engage,
        measurement.longTasks,
        measurement.mainThreadTaskCount,
      );
    } else if (scenario === 'load') {
      const route = requiredRoute(values.route, scenario);
      const frames = parseFrames(values.frames);
      const cpu = parseCpu(values.cpu);
      const names = values.names === true;
      const caps = values.caps === undefined ? undefined : await readNamedCaps(values.caps);
      const url = scenarioUrl(server.url, scenario, route);
      console.log(`eager: ${url.href}`);

      const measurement = await measureLoad(url, frames, cpu, names);
      let namedLoad: NamedLoadOptions | undefined;
      if (names) {
        const trace = (measurement.result.trace ?? []) as unknown as StartupTraceEvent[];
        namedLoad = {
          trace,
          // Each measurement maps performance.now() onto the trace clock with its own anchor:
          // the load mark (trace-only) or the recorder-start mark (recorder).
          traceTimeOriginUs: measurement.traceOriginUs,
          rendererConstructorMs: measurement.rendererConstructorMs ?? null,
          programCompileMs: measurement.programCompileMs ?? null,
          readyMs: measurement.readyMs,
          ...(caps === undefined ? {} : { caps }),
        };
      }
      report = buildLoadReport(
        measurement.result,
        url.href,
        route,
        frames,
        cpu,
        measurement.loadMs,
        measurement.mounted,
        measurement.readyMs,
        measurement.longTasks,
        measurement.preLoadTasks,
        measurement.droppedFrameTimes,
        namedLoad,
      );
    } else {
      const url = scenarioUrl(server.url, scenario);
      console.log(`fixture: ${url.href}`);

      if (scenario === 'explode') {
        const harnessCode = await runCommand('pnpm', [
          'fps',
          url.href,
          '--expect',
          String(FPS_NOMINAL),
          '--tolerance',
          String(FPS_TOLERANCE),
          '--out',
          outDir,
        ]);

        if (harnessCode !== EXIT.OK && harnessCode !== EXIT.BUDGET) {
          throw new CliError(
            harnessCode ?? EXIT.INTERNAL,
            `pnpm fps exited with ${harnessCode ?? 'a signal'}`,
          );
        }

        const artifact = join(outDir, 'fps.json');
        const result = readFpsArtifact(await readFile(artifact, 'utf8'));
        report = buildFpsReport(result, scenario, url.href);
      } else {
        const tour = await measureTour(url);
        report = buildFpsReport(tour.result, scenario, url.href, {
          tourStepsAdvanced: tour.tourStepsAdvanced,
          drawCalls: tour.drawCalls,
        });
      }
    }
  } finally {
    await server.close();
  }

  const artifact = join(outDir, 'fps.json');
  await writeFile(artifact, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  if (report.scenario === 'startup') {
    printStartupReport(report, artifact);
    assertLongTaskCheckIsNotVacuous(report.mainThreadTaskCount);
  } else if (report.scenario === 'load') {
    printLoadReport(report, artifact);
    assertLoadMounted(report.mounted);
    return report.verdict.gated && (!report.verdict.longTask50 || !report.verdict.droppedFramesLe2)
      ? EXIT.BUDGET
      : EXIT.OK;
  } else {
    printReport(report, artifact);
  }
  return report.verdict.pass ? EXIT.OK : EXIT.BUDGET;
}

const entrypoint = process.argv[1];
if (entrypoint !== undefined && import.meta.url === pathToFileURL(entrypoint).href) {
  await run(main);
}
