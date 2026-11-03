import { spawn } from 'node:child_process';
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import type { Page, Request } from 'playwright';

import { parseCli } from '../args.ts';
import { freePort, launch, PROFILES } from '../browser.ts';
import { FPS_NOMINAL, FPS_TOLERANCE } from '../budgets.ts';
import { CliError, EXIT, EXIT_DESCRIPTIONS } from '../exit-codes.ts';
import { inBand, measureFps, type FpsResult } from '../fps.ts';
import { run } from '../log.ts';
import { serveDir } from '../serve.ts';
import {
  countMainThreadTasks,
  findLongTasks,
  type LongTask,
  type TraceEvent as StartupTraceEvent,
} from '../startup.ts';

type FixtureScenario = 'explode' | 'tour';
type Scenario = FixtureScenario | 'startup';
export type Engagement = 'move' | 'click';

interface FpsEngineArgs {
  values: {
    scenario?: string;
    out?: string;
    route?: string;
    engage?: string;
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
  maxLongTaskMs: number;
  /** Main-thread tasks from the TracingStartedInBrowser metadata pid; never a DrawFrame fallback. */
  mainThreadTaskCount: number;
  liveness: 'not-applicable';
  verdict: FpsEngineStartupVerdict;
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
export const STARTUP_TRACE_CATEGORIES = [
  'toplevel',
  'disabled-by-default-devtools.timeline',
  'v8.execute',
] as const;
const TOUR_SELECTOR = '[data-xploder-ready="true"][data-xploder-tour="playing"]';
const TOUR_COUNTER_KEY = '__perfFpsEngineTourCounter';
const EXPLORE_3D_SELECTOR = '[data-site-control="explore-3d"]';

const usage = `Usage: pnpm fps:engine [--scenario explode|tour|startup] [options]

Builds the fixture or production export, serves it on 127.0.0.1, and runs the
S3 FPS harness.

Scenarios:
  explode         /dev/engine?fixture=a&cycle=1 via pnpm fps (default)
  tour            live-update tour via in-process Playwright
  startup         production route under the mobile profile and 4x CPU throttle

Options:
  --scenario <name>  explode, tour, or startup (default: explode)
  --route <path>     production route for startup (required with startup)
  --engage <action>  startup engagement: move or click (default: move)
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

export function scenarioUrl(base: URL, scenario: Scenario, route?: string): URL {
  if (scenario === 'startup') {
    if (route === undefined) {
      throw new CliError(EXIT.USAGE, '--route is required with --scenario startup');
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
    maxLongTaskMs,
    mainThreadTaskCount,
    liveness: 'not-applicable',
    verdict: evaluateStartupVerdict(result.droppedFrames, maxLongTaskMs),
  };
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
  throw new CliError(EXIT.USAGE, `--scenario must be explode, tour, or startup: ${value}`);
}

function requiredRoute(value: string | undefined): string {
  if (value === undefined) {
    throw new CliError(EXIT.USAGE, '--route is required with --scenario startup');
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

export async function main(argv: string[]): Promise<number> {
  const { values } = parseCli<FpsEngineArgs>(argv, {
    options: {
      scenario: { type: 'string' },
      out: { type: 'string' },
      route: { type: 'string' },
      engage: { type: 'string' },
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
  if (scenario !== 'startup' && values.route !== undefined) {
    throw new CliError(EXIT.USAGE, '--route is only valid with --scenario startup');
  }
  if (scenario !== 'startup' && values.engage !== undefined) {
    throw new CliError(EXIT.USAGE, '--engage is only valid with --scenario startup');
  }

  const production = scenario === 'startup';
  const exportDir = production ? WEB_OUT_DIR : FIXTURE_DIR;

  if (!values['no-build']) {
    console.log(production ? 'building production export...' : 'building fixture export...');
    const buildScript = production ? 'build' : 'build:fixtures';
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

  let report: FpsEngineReport | FpsEngineStartupReport;
  try {
    if (scenario === 'startup') {
      const route = requiredRoute(values.route);
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
  } else {
    printReport(report, artifact);
  }
  return report.verdict.pass ? EXIT.OK : EXIT.BUDGET;
}

const entrypoint = process.argv[1];
if (entrypoint !== undefined && import.meta.url === pathToFileURL(entrypoint).href) {
  await run(main);
}
