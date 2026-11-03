import { execFileSync } from 'node:child_process';
import { constants } from 'node:fs';
import { access, mkdir, stat, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { join, resolve } from 'node:path';
import { gzipSync } from 'node:zlib';

import type { BrowserContext, Page } from 'playwright';

import { parseCli, parseUrl } from '../args.ts';
import { chromiumVersion, freePort, launch, PROFILES } from '../browser.ts';
import {
  PROFILE_TASK_THRESHOLD_MS,
  summarizeCpuProfile,
  type CpuProfile,
  type CpuProfileSummary,
} from '../cpu-profile.ts';
import { CliError, EXIT, EXIT_DESCRIPTIONS } from '../exit-codes.ts';
import { run } from '../log.ts';
import { serveDir, type ServedDir } from '../serve.ts';
import { startupAttributionScript, type StartupAttributionState } from '../startup-attribution.ts';
import {
  analyzeStartup,
  findStartupTaskWindows,
  phaseModelError,
  type GlSpan,
  type PageMarks,
  type PhaseId,
  type SequenceRecord,
  type StartupReport,
  type TraceEvent,
} from '../startup.ts';

interface StartupArgs {
  values: {
    serve?: string;
    route?: string;
    engage?: string;
    runs?: string;
    attribute?: boolean;
    'cpu-profile'?: boolean;
    cpu?: string;
    out?: string;
    'keep-trace'?: boolean;
    'no-observers'?: boolean;
    help?: boolean;
  };
  positionals: string[];
}

type Engage = 'move' | 'click';
type RunKind = 'clean' | 'attributed' | 'profiled';
type GlCounts = Record<string, number>;

interface StartupRunArtifact extends StartupReport {
  glCounts: GlCounts;
}

interface RunSummary {
  readonly run: number;
  readonly file: string;
  readonly phases: Record<PhaseId, { ms: number; mainThreadMs: number } | null>;
  readonly glCounts: GlCounts;
  readonly firstFrame: number | null;
  readonly mainThreadCostMs: number;
  readonly attributedMs: number;
  readonly otherMs: number;
  readonly blockingMs: number;
  readonly clsRaw: number;
  readonly clsFiltered: number;
  readonly textureMs: number;
  readonly textureCount: number;
  readonly sequence: SequenceRecord | null;
}

interface RunMeta {
  readonly run: number;
  readonly benchmarkIndex: number;
  readonly renderer: string | null;
  readonly extensions: string[];
}

interface StartupSummary {
  readonly kind: 'startup-summary';
  readonly version: 1;
  readonly label: string;
  readonly route: string;
  readonly engage: Engage;
  readonly kindOfRun: RunKind;
  readonly observers: boolean;
  readonly runs: RunSummary[];
  readonly median: {
    readonly phases: Record<PhaseId, number | null>;
    readonly phaseMainThreadMs: Record<PhaseId, number | null>;
    readonly glCounts: GlCounts;
    readonly firstFrame: number | null;
    readonly mainThreadCostMs: number | null;
    readonly attributedMs: number | null;
    readonly otherMs: number | null;
    readonly blockingMs: number | null;
    readonly clsRaw: number | null;
    readonly clsFiltered: number | null;
    readonly textureMs: number | null;
    readonly textureCount: number | null;
  };
  readonly spreadPct: {
    readonly phases: Record<PhaseId, number | null>;
    readonly glCounts: GlCounts;
    readonly firstFrame: number | null;
    readonly mainThreadCostMs: number | null;
    readonly attributedMs: number | null;
    readonly otherMs: number | null;
    readonly blockingMs: number | null;
    readonly clsRaw: number | null;
    readonly clsFiltered: number | null;
    readonly textureMs: number | null;
    readonly textureCount: number | null;
  };
  readonly spreadFlagged: boolean;
}

interface StartupMeta {
  readonly kind: 'startup-meta';
  readonly version: 1;
  readonly command: string[];
  readonly exitCode: 0;
  readonly chromium: string;
  readonly route: string;
  readonly engage: Engage;
  readonly kindOfRun: RunKind;
  readonly cpuThrottle: number;
  readonly observers: boolean;
  readonly runs: RunMeta[];
  readonly git: { sha: string; dirty: boolean } | null;
}

interface RunResult {
  readonly artifact: StartupRunArtifact;
  readonly spans: GlSpan[];
  readonly state: StartupAttributionState;
  readonly benchmarkIndex: number;
  readonly trace: TraceEvent[];
  readonly origin: string;
  readonly cpuProfile: CpuProfile | null;
  readonly cpuProfileSummary: CpuProfileSummary | null;
}

interface TraceDataPayload {
  value: TraceEvent[];
}

const PHASE_IDS: readonly PhaseId[] = ['P0', 'P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7', 'P8', 'P9'];
const GL_METHODS = [
  'getContext',
  'compileShader',
  'linkProgram',
  'getProgramParameter',
  'getShaderParameter',
  'getUniformLocation',
  'getProgramInfoLog',
  'bufferData',
  'bufferSubData',
  'texImage2D',
  'texStorage2D',
  'texSubImage2D',
  'drawArrays',
  'drawElements',
  'drawArraysInstanced',
  'drawElementsInstanced',
  'createProgram',
] as const;
const TRACE_CATEGORIES = [
  'devtools.timeline',
  'disabled-by-default-devtools.timeline',
  'disabled-by-default-devtools.timeline.frame',
  'v8',
  'v8.execute',
  'blink.user_timing',
  'loading',
].join(',');
const ENGAGE_MARK = 'xp-perf:engage';
const QUIET_MS = 2000;
const WINDOW_MS = 5000;
const READY_TIMEOUT_MS = 30_000;
const NAVIGATION_TIMEOUT_MS = 45_000;
const QUIET_TIMEOUT_MS = 30_000;
const POLL_MS = 100;
const SPREAD_LIMIT_PCT = 20;
const GENERIC_ORIGIN = 'http://127.0.0.1:PORT';
const LOCAL_PATH_TOKEN = '<local-path>';
const ABSOLUTE_PATH_PATTERN =
  /(?:file:\/\/\/[^\s"',]+|[A-Za-z]:\\[^\s"',]+|\/(?:Users|home|private|tmp|var|opt|Applications|Volumes)\/[^\s"',]+)/g;

const require = createRequire(import.meta.url);
const lighthousePageFunctions = require('lighthouse/core/lib/page-functions.js') as {
  pageFunctions: { computeBenchmarkIndex: () => number };
};

const usage = `Usage: pnpm perf:startup <url> | --serve <dir> --route <path> [options]

Measures engagement-driven 3D startup on the mobile profile with 4x CPU throttling.

Options:
  --serve <dir>       serve a static export on a free local port
  --route <path>      route to open (default: /)
  --engage <kind>     move or click (default: move)
  --runs <n>          measured runs (default: 2)
  --attribute         install the GL attribution wrappers
  --cpu-profile       record a CPU profile and per-task attribution
  --cpu <rate>        CPU throttling rate (default: 4)
  --out <dir>         output directory (default: .evidence/startup-<timestamp>)
  --keep-trace        write the sanitized, gzipped Chromium trace
  --no-observers      disable the ready and layout-shift observers
  --help              show this help`;

function exitCodeTable(): string {
  return Object.entries(EXIT)
    .map(([name, code]) => `${code} ${EXIT_DESCRIPTIONS[name as keyof typeof EXIT]}`)
    .join('\n');
}

function finite(value: number | null | undefined): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isDirectory(path: string): Promise<boolean> {
  return stat(path).then(
    (info) => info.isDirectory(),
    () => false,
  );
}

function parseEngage(raw: string | undefined): Engage {
  if (raw === undefined || raw === 'move') return 'move';
  if (raw === 'click') return 'click';
  throw new CliError(EXIT.USAGE, `--engage must be move or click: ${raw}`);
}

function parsePositiveNumber(raw: string | undefined, fallback: number, option: string): number {
  if (raw === undefined) return fallback;
  const value = Number(raw);
  if (!Number.isFinite(value) || value <= 0) {
    throw new CliError(EXIT.USAGE, `${option} must be a positive number`);
  }
  return value;
}

function parseRuns(raw: string | undefined): number {
  const value = Number(raw ?? '2');
  if (!Number.isInteger(value) || value <= 0) {
    throw new CliError(EXIT.USAGE, '--runs must be a positive integer');
  }
  return value;
}

function parseRoute(raw: string | undefined): string {
  const route = raw ?? '/';
  if (!route.startsWith('/')) {
    throw new CliError(EXIT.USAGE, `--route must start with /: ${route}`);
  }
  return route;
}

function labelFor(route: string): string {
  if (route === '/') return 'home';
  if (route.startsWith('/projects/')) return 'project';
  const label = route.replace(/^\/+|\/+$/g, '').replace(/[^a-z0-9-]+/gi, '-');
  return label.length === 0 ? 'route' : label;
}

function timestamp(date = new Date()): string {
  return date.toISOString().replace(/[:.]/g, '-');
}

function defaultOutDir(): string {
  return join(process.cwd(), '.evidence', `startup-${timestamp()}`);
}

async function ensureOutputDir(path: string): Promise<void> {
  try {
    await mkdir(path, { recursive: true });
    await access(path, constants.W_OK);
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new CliError(EXIT.USAGE, `output directory is not writable: ${path}: ${detail}`);
  }
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function sanitizeText(value: string, origin: string): string {
  let sanitized = value.replaceAll(process.cwd(), '.');
  sanitized = sanitized.replace(new RegExp(escapeRegExp(origin), 'g'), GENERIC_ORIGIN);
  sanitized = sanitized.replace(/http:\/\/127\.0\.0\.1:\d+/g, GENERIC_ORIGIN);
  return sanitized.replace(ABSOLUTE_PATH_PATTERN, LOCAL_PATH_TOKEN);
}

function sanitizeValue(value: unknown, origin: string): unknown {
  if (typeof value === 'string') return sanitizeText(value, origin);
  if (Array.isArray(value)) return value.map((entry) => sanitizeValue(entry, origin));
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, entry]) => {
        const sanitizedKey = sanitizeText(key, origin);
        return [sanitizedKey, sanitizeValue(entry, origin)];
      }),
    );
  }
  return value;
}

function gitInfo(): { sha: string; dirty: boolean } | null {
  try {
    const sha = execFileSync('git', ['rev-parse', 'HEAD'], {
      cwd: process.cwd(),
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
    const status = execFileSync('git', ['status', '--porcelain'], {
      cwd: process.cwd(),
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
    return { sha, dirty: status.length > 0 };
  } catch {
    return null;
  }
}

function median(values: readonly number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[middle] ?? null;
  const before = sorted[middle - 1];
  const after = sorted[middle];
  return finite(before) && finite(after) ? (before + after) / 2 : null;
}

function spreadPct(values: readonly number[]): number | null {
  if (values.length < 2) return values.length === 1 ? 0 : null;
  const center = median(values);
  if (center === null) return null;
  if (center === 0) {
    return values.every((value) => value === 0) ? 0 : null;
  }
  const low = Math.min(...values);
  const high = Math.max(...values);
  return ((high - low) / Math.abs(center)) * 100;
}

function medianBy<T>(
  values: readonly T[],
  map: (value: T) => number | null | undefined,
): number | null {
  return median(values.map(map).filter((value): value is number => finite(value)));
}

function spreadBy<T>(
  values: readonly T[],
  map: (value: T) => number | null | undefined,
): number | null {
  return spreadPct(values.map(map).filter((value): value is number => finite(value)));
}

function phaseValue(report: StartupRunArtifact, phase: PhaseId): number | null {
  return report.phases[phase]?.ms ?? null;
}

function phaseMainThreadValue(report: StartupRunArtifact, phase: PhaseId): number | null {
  return report.phases[phase]?.mainThreadMs ?? null;
}

function countGlCalls(
  spans: readonly GlSpan[],
  engageMs: number,
  firstFrame: number | null,
): GlCounts {
  const counts = Object.fromEntries(GL_METHODS.map((name) => [name, 0])) as GlCounts;
  if (firstFrame === null) return counts;

  const firstSpan = spans.reduce<number | null>((earliest, span) => {
    if (!Number.isFinite(span.start)) return earliest;
    return earliest === null ? span.start : Math.min(earliest, span.start);
  }, null);
  const costStart = firstSpan === null ? engageMs : Math.min(engageMs, firstSpan);

  for (const span of spans) {
    if (!Number.isFinite(span.start) || span.start < costStart || span.start > firstFrame) continue;
    if (Object.hasOwn(counts, span.name)) counts[span.name] = (counts[span.name] ?? 0) + 1;
  }
  return counts;
}

async function waitForVisible(page: Page): Promise<void> {
  await page.waitForFunction(() => document.visibilityState === 'visible', undefined, {
    timeout: READY_TIMEOUT_MS,
  });
}

async function waitForNetworkQuiet(lastRequestAt: () => number): Promise<void> {
  const deadline = Date.now() + QUIET_TIMEOUT_MS;
  while (Date.now() - lastRequestAt() < QUIET_MS) {
    if (Date.now() >= deadline) {
      throw new CliError(EXIT.UNREACHABLE, `network did not become quiet for ${QUIET_MS} ms`);
    }
    await new Promise<void>((resolveWait) => {
      setTimeout(resolveWait, POLL_MS);
    });
  }
}

async function waitForReady(page: Page, observers: boolean): Promise<number> {
  try {
    if (observers) {
      await page.waitForFunction(
        () => {
          const state = (window as unknown as Record<string, StartupAttributionState | undefined>)
            .__xpPerf;
          return state !== undefined && state.readyMs !== null;
        },
        undefined,
        { timeout: READY_TIMEOUT_MS },
      );
      const readyMs = await page.evaluate(
        () =>
          (window as unknown as Record<string, StartupAttributionState | undefined>).__xpPerf
            ?.readyMs ?? null,
      );
      if (finite(readyMs)) return readyMs;
    }

    const ready = await page.waitForFunction(
      () =>
        document.querySelector('[data-xploder-ready="true"]') === null ? false : performance.now(),
      undefined,
      { timeout: READY_TIMEOUT_MS },
    );
    const readyMs = await ready.jsonValue();
    if (typeof readyMs !== 'number' || !finite(readyMs)) {
      throw new Error('ready timestamp was not finite');
    }
    return readyMs;
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new CliError(
      EXIT.UNREACHABLE,
      `no canvas ready within ${READY_TIMEOUT_MS} ms: ${detail}`,
    );
  }
}

async function engage(page: Page, kind: Engage): Promise<void> {
  if (kind === 'move') {
    const viewport = page.viewportSize();
    if (viewport === null) throw new CliError(EXIT.INTERNAL, 'page has no viewport size');
    await page.mouse.move(viewport.width / 2, viewport.height / 2, { steps: 2 });
    return;
  }

  const control = page.locator('[data-site-control="explore-3d"]');
  await control.waitFor({ state: 'visible', timeout: READY_TIMEOUT_MS });
  await control.click({ timeout: READY_TIMEOUT_MS });
}

async function markEngagement(page: Page): Promise<number> {
  return await page.evaluate((name) => {
    performance.mark(name);
    const mark = performance.getEntriesByName(name).at(-1);
    return mark?.startTime ?? performance.now();
  }, ENGAGE_MARK);
}

async function waitForWindow(page: Page, engageMs: number): Promise<void> {
  const remainder = await page.evaluate(
    ({ start, duration }) => Math.max(0, start + duration - performance.now()),
    { start: engageMs, duration: WINDOW_MS },
  );
  if (remainder > 0) await page.waitForTimeout(remainder);
}

function findEngageMark(events: readonly TraceEvent[], engageMs: number): TraceEvent {
  const matching = events.filter((event) => {
    const name = event.name ?? event.args?.data?.name;
    return name === ENGAGE_MARK && finite(event.ts);
  });
  const mark = matching.at(-1);
  if (mark === undefined) {
    throw new CliError(
      EXIT.INTERNAL,
      `trace did not contain the ${ENGAGE_MARK} mark (engage ${engageMs} ms)`,
    );
  }
  return mark;
}

function sequenceFromState(state: StartupAttributionState): SequenceRecord | null {
  const { firstInstancedDraw, ready, liveStates } = state.sequence;
  if (firstInstancedDraw === null || ready === null) return null;
  return { firstInstancedDraw, ready, liveStates };
}

async function captureRun(
  context: BrowserContext,
  page: Page,
  url: URL,
  options: {
    readonly route: string;
    readonly engage: Engage;
    readonly attribute: boolean;
    readonly cpuProfile: boolean;
    readonly observers: boolean;
    readonly cpu: number;
    readonly run: number;
  },
): Promise<RunResult> {
  let lastRequestAt = Date.now();
  page.on('request', () => {
    lastRequestAt = Date.now();
  });
  page.setDefaultTimeout(READY_TIMEOUT_MS);

  const benchmarkIndex = await page.evaluate(
    lighthousePageFunctions.pageFunctions.computeBenchmarkIndex as () => number,
  );

  const cdp = await context.newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: options.cpu });

  let response;
  try {
    response = await page.goto(url.href, {
      waitUntil: 'load',
      timeout: NAVIGATION_TIMEOUT_MS,
    });
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new CliError(EXIT.UNREACHABLE, `unreachable: ${url.href}: ${detail}`);
  }
  if (response === null) {
    throw new CliError(EXIT.UNREACHABLE, `unreachable: ${url.href}: no response`);
  }
  if (response.status() >= 400) {
    throw new CliError(EXIT.UNREACHABLE, `unreachable: ${url.href}: HTTP ${response.status()}`);
  }

  await waitForVisible(page);
  await waitForNetworkQuiet(() => lastRequestAt);
  if (options.engage === 'click') {
    await page
      .locator('[data-site-control="explore-3d"]')
      .waitFor({ state: 'visible', timeout: READY_TIMEOUT_MS });
  }

  const traceEvents: TraceEvent[] = [];
  const traceComplete = new Promise<void>((resolveTrace) => {
    cdp.once('Tracing.tracingComplete', () => resolveTrace());
  });
  cdp.on('Tracing.dataCollected', (payload: TraceDataPayload) => {
    traceEvents.push(...payload.value);
  });

  let tracingStarted = false;
  let tracingEnded = false;
  let profilerStarted = false;
  let profilerStopped = false;
  let capturedCpuProfile: CpuProfile | null = null;
  try {
    await cdp.send('Tracing.start', {
      categories: TRACE_CATEGORIES,
      transferMode: 'ReportEvents',
    });
    tracingStarted = true;

    const engageMs = await markEngagement(page);
    if (options.cpuProfile) {
      await cdp.send('Profiler.enable');
      await cdp.send('Profiler.setSamplingInterval', { interval: 100 });
      await cdp.send('Profiler.start');
      profilerStarted = true;
    }
    await engage(page, options.engage);
    const readyMs = await waitForReady(page, options.observers);
    await waitForWindow(page, engageMs);

    if (profilerStarted) {
      const stopped = (await cdp.send('Profiler.stop')) as { profile: CpuProfile };
      capturedCpuProfile = stopped.profile;
      profilerStopped = true;
    }

    await cdp.send('Tracing.end');
    tracingEnded = true;
    await traceComplete;

    const state = await page.evaluate(
      () =>
        (window as unknown as Record<string, StartupAttributionState | undefined>).__xpPerf ?? null,
    );
    if (state === null) {
      throw new CliError(EXIT.INTERNAL, 'startup attribution state was not installed');
    }
    state.readyMs = readyMs;

    const loadMs =
      state.loadMs ??
      (await page.evaluate(() => {
        const navigation = performance.getEntriesByType('navigation')[0] as
          PerformanceNavigationTiming | undefined;
        return navigation?.loadEventEnd ?? performance.now();
      }));
    const mark = findEngageMark(traceEvents, engageMs);
    if (!finite(mark.ts)) {
      throw new CliError(EXIT.INTERNAL, `${ENGAGE_MARK} mark had no trace timestamp`);
    }

    const marks: PageMarks = {
      traceTimeOriginUs: mark.ts - engageMs * 1000,
      loadMs,
      engageMs,
      readyMs,
      layoutShifts: state.layoutShifts,
    };
    const sequence = options.attribute ? sequenceFromState(state) : null;
    const report = analyzeStartup(traceEvents, state.spans, marks, sequence);
    const inconsistency = phaseModelError(report);
    if (inconsistency !== null) {
      throw new CliError(EXIT.INTERNAL, inconsistency);
    }
    const artifact: StartupRunArtifact = {
      ...report,
      glCounts: countGlCalls(state.spans, engageMs, report.firstFrame),
    };
    const cpuProfileSummary =
      capturedCpuProfile === null
        ? null
        : summarizeCpuProfile(
            capturedCpuProfile,
            findStartupTaskWindows(
              traceEvents,
              mark.ts,
              mark.ts + WINDOW_MS * 1000,
              PROFILE_TASK_THRESHOLD_MS,
            ),
            {
              route: options.route,
              engage: options.engage,
              run: options.run,
              traceTimeOriginUs: marks.traceTimeOriginUs,
            },
          );

    return {
      artifact,
      spans: state.spans,
      state,
      benchmarkIndex,
      trace: traceEvents,
      origin: url.origin,
      cpuProfile: capturedCpuProfile,
      cpuProfileSummary,
    };
  } finally {
    if (profilerStarted && !profilerStopped) {
      try {
        await cdp.send('Profiler.stop');
      } catch {
        // Preserve the original error.
      }
    }
    if (profilerStarted) await cdp.send('Profiler.disable').catch(() => undefined);
    if (tracingStarted && !tracingEnded) {
      try {
        await cdp.send('Tracing.end');
      } catch {
        // Preserve the original error.
      }
    }
    await cdp.detach().catch(() => undefined);
  }
}

function summarize(
  reports: readonly StartupRunArtifact[],
  files: readonly string[],
  route: string,
  engage: Engage,
  kindOfRun: RunKind,
  observers: boolean,
): StartupSummary {
  const runs = reports.map<RunSummary>((report, index) => ({
    run: index + 1,
    file: files[index] ?? '',
    phases: Object.fromEntries(
      PHASE_IDS.map((phase) => {
        const value = report.phases[phase];
        return [phase, value === null ? null : { ms: value.ms, mainThreadMs: value.mainThreadMs }];
      }),
    ) as Record<PhaseId, { ms: number; mainThreadMs: number } | null>,
    glCounts: report.glCounts,
    firstFrame: report.firstFrame,
    mainThreadCostMs: report.mainThreadCostMs,
    attributedMs: report.attributedMs,
    otherMs: report.otherMs,
    blockingMs: report.blockingMs,
    clsRaw: report.cls.raw,
    clsFiltered: report.cls.filtered,
    textureMs: report.textures.ms,
    textureCount: report.textures.count,
    sequence: report.sequence,
  }));

  const phases = Object.fromEntries(
    PHASE_IDS.map((phase) => [phase, medianBy(reports, (report) => phaseValue(report, phase))]),
  ) as Record<PhaseId, number | null>;
  const phaseMainThreadMs = Object.fromEntries(
    PHASE_IDS.map((phase) => [
      phase,
      medianBy(reports, (report) => phaseMainThreadValue(report, phase)),
    ]),
  ) as Record<PhaseId, number | null>;
  const glCounts = Object.fromEntries(
    GL_METHODS.map((name) => [
      name,
      medianBy(reports, (report) => report.glCounts[name] ?? 0) ?? 0,
    ]),
  );
  const phaseSpread = Object.fromEntries(
    PHASE_IDS.map((phase) => [phase, spreadBy(reports, (report) => phaseValue(report, phase))]),
  ) as Record<PhaseId, number | null>;
  const glSpread = Object.fromEntries(
    GL_METHODS.map((name) => [
      name,
      spreadBy(reports, (report) => report.glCounts[name] ?? 0) ?? 0,
    ]),
  );
  const spreadValues = [
    ...PHASE_IDS.map((phase) => phaseSpread[phase]),
    ...GL_METHODS.map((name) => glSpread[name]),
  ].filter((value): value is number => finite(value));

  return {
    kind: 'startup-summary',
    version: 1,
    label: labelFor(route),
    route,
    engage,
    kindOfRun,
    observers,
    runs,
    median: {
      phases,
      phaseMainThreadMs,
      glCounts,
      firstFrame: medianBy(reports, (report) => report.firstFrame),
      mainThreadCostMs: medianBy(reports, (report) => report.mainThreadCostMs),
      attributedMs: medianBy(reports, (report) => report.attributedMs),
      otherMs: medianBy(reports, (report) => report.otherMs),
      blockingMs: medianBy(reports, (report) => report.blockingMs),
      clsRaw: medianBy(reports, (report) => report.cls.raw),
      clsFiltered: medianBy(reports, (report) => report.cls.filtered),
      textureMs: medianBy(reports, (report) => report.textures.ms),
      textureCount: medianBy(reports, (report) => report.textures.count),
    },
    spreadPct: {
      phases: phaseSpread,
      glCounts: glSpread,
      firstFrame: spreadBy(reports, (report) => report.firstFrame),
      mainThreadCostMs: spreadBy(reports, (report) => report.mainThreadCostMs),
      attributedMs: spreadBy(reports, (report) => report.attributedMs),
      otherMs: spreadBy(reports, (report) => report.otherMs),
      blockingMs: spreadBy(reports, (report) => report.blockingMs),
      clsRaw: spreadBy(reports, (report) => report.cls.raw),
      clsFiltered: spreadBy(reports, (report) => report.cls.filtered),
      textureMs: spreadBy(reports, (report) => report.textures.ms),
      textureCount: spreadBy(reports, (report) => report.textures.count),
    },
    spreadFlagged: spreadValues.some((value) => value > SPREAD_LIMIT_PCT),
  };
}

async function writeJson(path: string, value: unknown): Promise<void> {
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`);
}

function printRun(report: StartupRunArtifact, file: string): void {
  const phases = PHASE_IDS.map((phase) => {
    const value = report.phases[phase];
    return `${phase}=${value === null ? 'null' : value.ms.toFixed(1)}`;
  }).join(' ');
  console.log(`phases: ${phases}`);
  console.log(
    `cost: ${report.mainThreadCostMs.toFixed(1)} ms; ` +
      `attributed: ${report.attributedMs.toFixed(1)} ms; ` +
      `other: ${report.otherMs.toFixed(1)} ms; blocking: ${report.blockingMs.toFixed(1)} ms`,
  );
  console.log(
    `glCounts: createProgram=${report.glCounts.createProgram ?? 0} ` +
      `linkProgram=${report.glCounts.linkProgram ?? 0}`,
  );
  console.log(`startup: ${file}`);
}

export async function main(argv: string[]): Promise<number> {
  const { values, positionals } = parseCli<StartupArgs>(argv, {
    options: {
      serve: { type: 'string' },
      route: { type: 'string' },
      engage: { type: 'string' },
      runs: { type: 'string' },
      attribute: { type: 'boolean' },
      'cpu-profile': { type: 'boolean' },
      cpu: { type: 'string' },
      out: { type: 'string' },
      'keep-trace': { type: 'boolean' },
      'no-observers': { type: 'boolean' },
      help: { type: 'boolean' },
    },
    allowPositionals: true,
    requiredPositionals: 0,
  });

  if (values.help) {
    console.log(`${usage}\n\nExit codes:\n${exitCodeTable()}`);
    return EXIT.OK;
  }
  if (values.serve !== undefined && positionals.length > 0) {
    throw new CliError(EXIT.USAGE, 'provide either a URL or --serve <dir>, not both');
  }
  if (values.serve === undefined && positionals.length !== 1) {
    throw new CliError(EXIT.USAGE, 'expected exactly one URL or --serve <dir>');
  }

  const route = parseRoute(values.route);
  const engage = parseEngage(values.engage);
  const runs = parseRuns(values.runs);
  const cpu = parsePositiveNumber(values.cpu, 4, '--cpu');
  const attribute = values.attribute ?? false;
  const cpuProfile = values['cpu-profile'] ?? false;
  if (attribute && cpuProfile) {
    throw new CliError(EXIT.USAGE, '--attribute and --cpu-profile cannot be combined');
  }
  const observers = !(values['no-observers'] ?? false);
  const keepTrace = values['keep-trace'] ?? false;
  const kindOfRun: RunKind = cpuProfile ? 'profiled' : attribute ? 'attributed' : 'clean';
  const outDir = values.out ?? defaultOutDir();

  await ensureOutputDir(outDir);
  let server: ServedDir | undefined;
  let base: URL;

  try {
    if (values.serve !== undefined) {
      const dir = resolve(process.cwd(), values.serve);
      if (!(await isDirectory(dir))) {
        throw new CliError(EXIT.USAGE, `directory not found: ${dir}`);
      }
      try {
        server = await serveDir(dir, { port: await freePort() });
      } catch (error) {
        const detail = error instanceof Error ? error.message : String(error);
        throw new CliError(EXIT.INTERNAL, `could not serve ${dir}: ${detail}`);
      }
      base = server.url;
    } else {
      base = parseUrl(positionals[0]);
    }

    const url = new URL(route, base);
    const browser = await launch();
    const reports: StartupRunArtifact[] = [];
    const files: string[] = [];
    const metaRuns: RunMeta[] = [];

    try {
      for (let run = 1; run <= runs; run += 1) {
        const context = await browser.newContext({
          viewport: {
            width: PROFILES.mobile.screenEmulation.width,
            height: PROFILES.mobile.screenEmulation.height,
          },
          deviceScaleFactor: PROFILES.mobile.screenEmulation.deviceScaleFactor,
          isMobile: PROFILES.mobile.formFactor === 'mobile',
          hasTouch: PROFILES.mobile.formFactor === 'mobile',
          userAgent: PROFILES.mobile.userAgent,
          colorScheme: 'light',
          reducedMotion: 'no-preference',
        });

        try {
          await context.addInitScript({
            content: startupAttributionScript({ attribute, observers }),
          });
          const page = await context.newPage();
          console.log(`run ${run}/${runs}: ${labelFor(route)} ${engage} ${kindOfRun}`);
          const result = await captureRun(context, page, url, {
            route,
            engage,
            attribute,
            cpuProfile,
            observers,
            cpu,
            run,
          });
          reports.push(result.artifact);
          metaRuns.push({
            run,
            benchmarkIndex: result.benchmarkIndex,
            renderer: result.state.renderer,
            extensions: result.state.extensions,
          });

          const file = `startup-${labelFor(route)}-${engage}-${kindOfRun}-r${run}.json`;
          files.push(file);
          await writeJson(join(outDir, file), result.artifact);
          printRun(result.artifact, join(outDir, file));

          if (result.cpuProfileSummary !== null) {
            const profileFile = `cpuprofile-summary-${labelFor(route)}-${engage}-r${run}.json`;
            await writeJson(join(outDir, profileFile), result.cpuProfileSummary);
            console.log(`cpu profile: ${join(outDir, profileFile)}`);
          }

          if (keepTrace) {
            const traceFile = `trace-${labelFor(route)}-${engage}-${kindOfRun}-r${run}.json.gz`;
            const sanitized = {
              traceEvents: result.trace.map((event) => sanitizeValue(event, result.origin)),
            };
            await writeFile(
              join(outDir, traceFile),
              gzipSync(Buffer.from(`${JSON.stringify(sanitized)}\n`), { level: 9 }),
            );

            if (result.cpuProfile !== null) {
              const profileFile = `cpuprofile-${labelFor(route)}-${engage}-r${run}.cpuprofile.gz`;
              const sanitizedProfile = sanitizeValue(result.cpuProfile, result.origin);
              await writeFile(
                join(outDir, profileFile),
                gzipSync(Buffer.from(`${JSON.stringify(sanitizedProfile)}\n`), { level: 9 }),
              );
            }
          }
        } finally {
          await context.close().catch(() => undefined);
        }
      }

      const summary = summarize(reports, files, route, engage, kindOfRun, observers);
      await writeJson(join(outDir, 'summary.json'), summary);

      const meta: StartupMeta = {
        kind: 'startup-meta',
        version: 1,
        command: argv.map((value) => sanitizeText(value, url.origin)),
        exitCode: 0,
        chromium: chromiumVersion(browser),
        route,
        engage,
        kindOfRun,
        cpuThrottle: cpu,
        observers,
        runs: metaRuns,
        git: gitInfo(),
      };
      await writeJson(join(outDir, 'meta.json'), meta);

      const cost = summary.median.mainThreadCostMs;
      console.log(
        `summary: ${join(outDir, 'summary.json')} ` +
          `(mainThreadCostMs=${cost === null ? 'null' : cost.toFixed(1)}, ` +
          `spreadFlagged=${summary.spreadFlagged})`,
      );
      return EXIT.OK;
    } finally {
      await browser.close().catch(() => undefined);
    }
  } finally {
    await server?.close();
  }
}

await run(main);
