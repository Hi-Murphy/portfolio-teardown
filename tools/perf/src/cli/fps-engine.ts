import { spawn } from 'node:child_process';
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import type { Page } from 'playwright';

import { parseCli } from '../args.ts';
import { freePort, launch, PROFILES } from '../browser.ts';
import { FPS_NOMINAL, FPS_TOLERANCE } from '../budgets.ts';
import { CliError, EXIT, EXIT_DESCRIPTIONS } from '../exit-codes.ts';
import { inBand, measureFps, type FpsResult } from '../fps.ts';
import { run } from '../log.ts';
import { serveDir } from '../serve.ts';

type Scenario = 'explode' | 'tour';

interface FpsEngineArgs {
  values: { scenario?: string; out?: string; 'no-build'?: boolean; help?: boolean };
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
  scenario: Scenario;
  tourStepsAdvanced?: number;
  drawCalls?: number;
  verdict: FpsEngineVerdict;
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
const NAVIGATION_TIMEOUT_MS = 30_000;
const TOUR_SELECTOR = '[data-xploder-ready="true"][data-xploder-tour="playing"]';
const TOUR_COUNTER_KEY = '__perfFpsEngineTourCounter';

const usage = `Usage: pnpm fps:engine [--scenario explode|tour] [options]

Builds the fixture export, serves it on 127.0.0.1, and measures /dev/engine
with the S3 FPS harness.

Scenarios:
  explode         /dev/engine?fixture=a&cycle=1 via pnpm fps (default)
  tour            live-update tour via in-process Playwright

Options:
  --scenario <name>  explode or tour (default: explode)
  --no-build         use an existing out-fixtures/ export
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

export function scenarioUrl(base: URL, scenario: Scenario): URL {
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

export function buildFpsReport(
  result: FpsResult,
  scenario: Scenario,
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
  throw new CliError(EXIT.USAGE, `--scenario must be explode or tour: ${value}`);
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

export async function main(argv: string[]): Promise<number> {
  const { values } = parseCli<FpsEngineArgs>(argv, {
    options: {
      scenario: { type: 'string' },
      out: { type: 'string' },
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

  if (!values['no-build']) {
    console.log('building fixture export...');
    const buildCode = await runCommand('pnpm', ['build:fixtures']);
    if (buildCode !== 0) {
      throw new CliError(
        EXIT.INTERNAL,
        `pnpm build:fixtures exited with ${buildCode ?? 'a signal'}`,
      );
    }
  }

  try {
    const directory = await stat(FIXTURE_DIR);
    if (!directory.isDirectory()) throw new Error('not a directory');
  } catch {
    throw new CliError(EXIT.USAGE, `fixture export not found: ${FIXTURE_DIR}`);
  }

  const outDir = values.out ?? defaultOut();
  await mkdir(outDir, { recursive: true });
  const port = await freePort();
  const server = await serveDir(FIXTURE_DIR, { port });

  let report: FpsEngineReport;
  try {
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
  } finally {
    await server.close();
  }

  const artifact = join(outDir, 'fps.json');
  await writeFile(artifact, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  printReport(report, artifact);
  return report.verdict.pass ? EXIT.OK : EXIT.BUDGET;
}

const entrypoint = process.argv[1];
if (entrypoint !== undefined && import.meta.url === pathToFileURL(entrypoint).href) {
  await run(main);
}
