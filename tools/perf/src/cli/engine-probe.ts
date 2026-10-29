import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import type { Browser, BrowserContextOptions, Page } from 'playwright';

import { parseCli, parseUrl } from '../args.ts';
import { chromiumVersion, launch, PROFILES } from '../browser.ts';
import {
  evaluateProbe,
  type EngineProbeEvaluation,
  type EngineProbeObservation,
  type FixtureObservation,
  type MotionObservation,
  type ReducedMotionObservation,
} from '../engine-probe.ts';
import { CliError, EXIT, EXIT_DESCRIPTIONS } from '../exit-codes.ts';
import { run } from '../log.ts';
import { assertReachable } from '../reach.ts';

interface EngineProbeArgs {
  values: { out?: string; help?: boolean };
  positionals: string[];
}

interface EngineProbeReport extends EngineProbeObservation, EngineProbeEvaluation {
  kind: 'engine-probe';
  version: 1;
  url: string;
  chromium: string;
}

type PhaseEntry = [state: string, timestamp: number];

interface PhaseWindow {
  __engineProbePhases?: PhaseEntry[];
  __engineProbeClickAt?: number;
  __engineProbeObserver?: MutationObserver;
}

const WAIT_TIMEOUT_MS = 15_000;
const REDUCED_MOTION_WINDOW_MS = 1000;
const VIEWER_SELECTOR = '[data-xploder-ready="true"]';

const usage = `Usage: pnpm engine:probe <base-url> [options]

Probes /dev/engine behaviour in Chromium. <base-url> must end in "/" and serve
an out-fixtures export (for example, http://127.0.0.1:4199/).

Options:
  --out <dir>     output directory (default: .evidence/<timestamp>-engine-probe)
  --help          show this help`;

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
  if (process.env.CI === 'true') return join(process.cwd(), '.evidence', 'ci', 'engine-probe');
  return join(process.cwd(), '.evidence', `${stamp(new Date())}-engine-probe`);
}

function contextOptions(): BrowserContextOptions {
  const { width, height, deviceScaleFactor, mobile } = PROFILES.desktop.screenEmulation;

  return {
    viewport: { width, height },
    deviceScaleFactor,
    isMobile: mobile,
  };
}

function fixtureHref(base: URL, fixture: 'a' | 'b', state?: 'exploded'): string {
  const url = new URL('dev/engine', base);
  url.searchParams.set('fixture', fixture);
  if (state !== undefined) url.searchParams.set('state', state);
  return url.href;
}

async function gotoFixture(page: Page, href: string): Promise<void> {
  try {
    await page.goto(href, { waitUntil: 'load', timeout: WAIT_TIMEOUT_MS });
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new CliError(EXIT.UNREACHABLE, `unreachable: ${href}: ${detail}`);
  }
}

async function waitForReady(page: Page, state?: string): Promise<void> {
  const selector =
    state === undefined ? VIEWER_SELECTOR : `${VIEWER_SELECTOR}[data-xploder-state="${state}"]`;
  await page.waitForSelector(selector, { timeout: WAIT_TIMEOUT_MS });
}

async function waitForAzimuth(page: Page, azimuth: number): Promise<void> {
  await page.waitForFunction(
    ({ selector, azimuth: expected }) =>
      document.querySelector(selector)?.getAttribute('data-xploder-azimuth') === expected,
    { selector: VIEWER_SELECTOR, azimuth: String(azimuth) },
    { timeout: WAIT_TIMEOUT_MS },
  );
}

async function waitForZoom(page: Page, zoom: number): Promise<void> {
  await page.waitForFunction(
    ({ selector, zoom: expected }) =>
      document.querySelector(selector)?.getAttribute('data-xploder-zoom') === expected,
    { selector: VIEWER_SELECTOR, zoom: String(zoom) },
    { timeout: WAIT_TIMEOUT_MS },
  );
}

async function readAttribute(page: Page, name: string): Promise<string> {
  const value = await page.locator(VIEWER_SELECTOR).getAttribute(name);
  if (value === null) throw new Error(`viewer is missing ${name}`);
  return value;
}

async function readNumberAttribute(
  page: Page,
  name: string,
  selector = VIEWER_SELECTOR,
): Promise<number> {
  const raw = await page.locator(selector).getAttribute(name);
  if (raw === null) throw new Error(`element is missing ${name}`);
  const value = Number(raw);
  if (!Number.isFinite(value)) throw new Error(`element has invalid ${name}: ${raw}`);
  return value;
}

async function readFixture(page: Page): Promise<FixtureObservation> {
  const instances = await page
    .locator('[data-engine-instances]')
    .getAttribute('data-engine-instances');
  const drawCallsRaw = await page
    .locator('[data-engine-draw-calls]')
    .getAttribute('data-engine-draw-calls');
  const [layersRaw, componentsRaw] = (instances ?? '').split('/');
  const layers = Number(layersRaw);
  const components = Number(componentsRaw);
  const drawCalls = Number(drawCallsRaw);

  if (!Number.isInteger(layers) || !Number.isInteger(components) || !Number.isInteger(drawCalls)) {
    throw new Error(
      `playground stats are incomplete: instances=${instances ?? 'missing'} drawCalls=${drawCallsRaw ?? 'missing'}`,
    );
  }

  return { instances: { layers, components }, drawCalls };
}

async function pressMany(page: Page, key: string, count: number): Promise<void> {
  for (let index = 0; index < count; index += 1) {
    await page.keyboard.press(key);
  }
}

async function installPhaseObserver(page: Page): Promise<void> {
  await page.evaluate((selector) => {
    const target = window as unknown as PhaseWindow;
    const viewer = document.querySelector(selector);
    if (viewer === null) throw new Error('viewer is missing');

    target.__engineProbePhases = [];
    const observer = new MutationObserver(() => {
      const state = (viewer as HTMLElement).dataset.xploderState;
      if (state !== undefined) target.__engineProbePhases?.push([state, performance.now()]);
    });
    observer.observe(viewer, { attributes: true, attributeFilter: ['data-xploder-state'] });
    target.__engineProbeObserver = observer;
  }, VIEWER_SELECTOR);
}

async function startPhaseCapture(page: Page): Promise<void> {
  await page.evaluate(() => {
    const target = window as unknown as PhaseWindow;
    target.__engineProbePhases = [];
    target.__engineProbeClickAt = performance.now();
  });
}

async function readPhaseCapture(page: Page): Promise<MotionObservation> {
  const capture = await page.evaluate(() => {
    const target = window as unknown as PhaseWindow;
    return {
      phases: target.__engineProbePhases ?? [],
      clickAt: target.__engineProbeClickAt ?? performance.now(),
    };
  });
  const lastTimestamp = capture.phases.at(-1)?.[1] ?? capture.clickAt;

  return {
    phases: capture.phases.map(([state]) => state),
    settledMs: Number(Math.max(0, lastTimestamp - capture.clickAt).toFixed(3)),
  };
}

async function stopPhaseObserver(page: Page): Promise<void> {
  await page.evaluate(() => {
    const target = window as unknown as PhaseWindow;
    target.__engineProbeObserver?.disconnect();
    delete target.__engineProbeObserver;
  });
}

async function captureFixturesAndCamera(
  page: Page,
  base: URL,
  outDir: string,
): Promise<Pick<EngineProbeObservation, 'fixtures' | 'camera'>> {
  await gotoFixture(page, fixtureHref(base, 'a'));
  await waitForReady(page, 'imploded');
  const fixtureA = await readFixture(page);
  const defaultAzimuth = await readNumberAttribute(page, 'data-xploder-azimuth');
  await page.screenshot({ path: join(outDir, 'screenshot-a-imploded.png') });

  const viewer = page.locator(VIEWER_SELECTOR);
  await page.locator('[data-engine-control="rotate-right"]').click();
  await waitForAzimuth(page, 135);
  const afterButtonRight = await readNumberAttribute(page, 'data-xploder-azimuth');

  await viewer.focus();
  await page.keyboard.press('ArrowRight');
  await waitForAzimuth(page, 225);
  const afterArrowRight = await readNumberAttribute(page, 'data-xploder-azimuth');

  const disabledAtDefault = {
    zoomOut: await page.locator('[data-engine-control="zoom-out"]').isDisabled(),
    zoomReset: await page.locator('[data-engine-control="zoom-reset"]').isDisabled(),
  };

  await viewer.focus();
  await pressMany(page, '+', 20);
  await waitForZoom(page, 3);
  const zoomAfter20In = await readNumberAttribute(page, 'data-xploder-zoom');
  const disabledAtMax = {
    zoomIn: await page.locator('[data-engine-control="zoom-in"]').isDisabled(),
  };

  await pressMany(page, '-', 20);
  await waitForZoom(page, 1);
  const zoomAfter20Out = await readNumberAttribute(page, 'data-xploder-zoom');

  await page.keyboard.press('+');
  await waitForZoom(page, 1.25);
  await page.locator('[data-engine-control="zoom-reset"]').click();
  await waitForZoom(page, 1);
  const zoomAfterReset = await readNumberAttribute(page, 'data-xploder-zoom');

  await gotoFixture(page, fixtureHref(base, 'b', 'exploded'));
  await waitForReady(page, 'exploded');
  const fixtureB = await readFixture(page);
  await page.screenshot({ path: join(outDir, 'screenshot-b-exploded.png') });

  return {
    fixtures: { a: fixtureA, b: fixtureB },
    camera: {
      defaultAzimuth,
      afterButtonRight,
      afterArrowRight,
      zoomAfter20In,
      zoomAfter20Out,
      zoomAfterReset,
      disabledAtDefault,
      disabledAtMax,
    },
  };
}

async function captureNormalMotion(
  page: Page,
  base: URL,
): Promise<EngineProbeObservation['motion']> {
  await gotoFixture(page, fixtureHref(base, 'a'));
  await waitForReady(page, 'imploded');
  await installPhaseObserver(page);

  await startPhaseCapture(page);
  await page.locator('[data-engine-control="toggle"]').click();
  await waitForReady(page, 'exploded');
  const explode = await readPhaseCapture(page);

  await startPhaseCapture(page);
  await page.locator('[data-engine-control="toggle"]').click();
  await waitForReady(page, 'imploded');
  const implode = await readPhaseCapture(page);

  await stopPhaseObserver(page);
  return { explode, implode };
}

async function measureReducedToggle(page: Page): Promise<ReducedMotionObservation> {
  const initialFrame = await readNumberAttribute(page, 'data-engine-frame', '[data-engine-frame]');
  await startPhaseCapture(page);
  await page.locator('[data-engine-control="toggle"]').click();
  await page.waitForTimeout(REDUCED_MOTION_WINDOW_MS);
  const finalFrame = await readNumberAttribute(page, 'data-engine-frame', '[data-engine-frame]');
  const phases = await readPhaseCapture(page);

  return {
    phases: phases.phases,
    framesIn1s: Math.max(0, finalFrame - initialFrame),
  };
}

async function captureReducedMotion(
  browser: Browser,
  base: URL,
): Promise<EngineProbeObservation['reducedMotion']> {
  const context = await browser.newContext({
    ...contextOptions(),
    reducedMotion: 'reduce',
  });
  const page = await context.newPage();
  page.setDefaultTimeout(WAIT_TIMEOUT_MS);

  try {
    await gotoFixture(page, fixtureHref(base, 'a'));
    await waitForReady(page, 'exploded');
    const initialState = await readAttribute(page, 'data-xploder-state');
    await installPhaseObserver(page);
    const afterToggle = await measureReducedToggle(page);
    const afterToggleBack = await measureReducedToggle(page);
    await stopPhaseObserver(page);

    return { initialState, afterToggle, afterToggleBack };
  } finally {
    await context.close();
  }
}

async function captureProbe(
  browser: Browser,
  base: URL,
  outDir: string,
): Promise<EngineProbeObservation> {
  const context = await browser.newContext(contextOptions());
  const page = await context.newPage();
  page.setDefaultTimeout(WAIT_TIMEOUT_MS);

  try {
    const fixturesAndCamera = await captureFixturesAndCamera(page, base, outDir);
    const motion = await captureNormalMotion(page, base);
    const reducedMotion = await captureReducedMotion(browser, base);
    return { ...fixturesAndCamera, motion, reducedMotion };
  } finally {
    await context.close();
  }
}

function printEvaluation(result: EngineProbeEvaluation): void {
  for (const check of result.checks) {
    const status = check.pass ? 'PASS' : 'FAIL';
    console.log(
      `${status} ${check.name}: expected ${JSON.stringify(check.expected)} actual ${JSON.stringify(check.actual)}`,
    );
  }
  console.log(`pass: ${result.pass}`);
}

export async function main(argv: string[]): Promise<number> {
  const helpRequested = argv.includes('--help');
  const { values, positionals } = parseCli<EngineProbeArgs>(argv, {
    options: {
      out: { type: 'string' },
      help: { type: 'boolean' },
    },
    allowPositionals: true,
    requiredPositionals: helpRequested ? 0 : 1,
  });

  if (values.help) {
    console.log(`${usage}\n\nExit codes:\n${exitCodeTable()}`);
    return EXIT.OK;
  }
  if (positionals.length !== 1) {
    throw new CliError(EXIT.USAGE, 'expected exactly one base URL');
  }
  if (!positionals[0]?.trim().endsWith('/')) {
    throw new CliError(EXIT.USAGE, 'base URL must end with /');
  }

  const base = parseUrl(positionals[0]);
  await assertReachable(new URL('dev/engine', base));

  const outDir = values.out ?? defaultOut();
  try {
    await mkdir(outDir, { recursive: true });
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new CliError(EXIT.USAGE, `--out is not writable: ${detail}`);
  }

  const browser = await launch();
  let observation: EngineProbeObservation;
  let chromium: string;
  try {
    chromium = chromiumVersion(browser);
    observation = await captureProbe(browser, base, outDir);
  } catch (error) {
    if (error instanceof CliError) throw error;
    const detail = error instanceof Error ? error.message : String(error);
    throw new CliError(EXIT.BROWSER, `engine probe failed: ${detail}`);
  } finally {
    await browser.close();
  }

  const evaluation = evaluateProbe(observation);
  const report: EngineProbeReport = {
    kind: 'engine-probe',
    version: 1,
    url: base.href,
    chromium,
    ...observation,
    ...evaluation,
  };
  const artifact = join(outDir, 'engine-probe.json');
  await writeFile(artifact, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

  printEvaluation(evaluation);
  console.log(`engine-probe.json: ${artifact}`);
  return evaluation.pass ? EXIT.OK : EXIT.BUDGET;
}

await run(main);
