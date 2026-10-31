import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import {
  devices,
  type Browser,
  type BrowserContext,
  type BrowserContextOptions,
  type Page,
} from 'playwright';

import { parseCli, parseUrl } from '../args.ts';
import { chromiumVersion, launch } from '../browser.ts';
import {
  evaluateProbe,
  type CaptionAnchorObservation,
  type CaptionAnchorSample,
  type CaptionObservation,
  type CaptionTokenObservation,
  type ClsObservation,
  type ClsLoadObservation,
  type EngineProbeEvaluation,
  type FocusObservation,
  type HitMapObservation,
  type HoverObservation,
  type HoverSampleObservation,
  type LayoutShiftObservation,
  type MotionObservation,
  type Overlay360Observation,
  type OverlayBoxObservation,
  type OverlayColoursObservation,
  type OverlayDefaultObservation,
  type PixelObservation,
  type PointObservation,
  type ProbeScope,
  type ReducedActionObservation,
  type ReducedMotionObservation,
  type ReducedObservation,
  type S4Observation,
  type S5Observation,
  type S6Observation,
  type ScrollObservation,
  type SelectorObservation,
  type TouchObservation,
  type TouchStateObservation,
  type TouchTraceEntry,
  type TourFlowObservation,
  type TourObservation,
  type TraceFlowObservation,
  totalLayoutShift,
} from '../engine-probe.ts';
import { CliError, EXIT, EXIT_DESCRIPTIONS } from '../exit-codes.ts';
import { run } from '../log.ts';
import { assertReachable } from '../reach.ts';

interface EngineProbeArgs {
  values: { out?: string; help?: boolean; scope?: string };
  positionals: string[];
}

type EngineProbeReport = EngineProbeEvaluation & {
  kind: 'engine-probe';
  version: 1;
  url: string;
  chromium: string;
  s5?: S5Observation;
  s6?: S6Observation;
} & Partial<S4Observation>;

type PhaseEntry = [state: string, timestamp: number];

interface PhaseWindow {
  __engineProbePhases?: PhaseEntry[];
  __engineProbeClickAt?: number;
  __engineProbeObserver?: MutationObserver;
}

interface TouchWindow {
  __engineProbeTouchTrace?: TouchTraceEntry[];
}

interface ReducedWindow {
  __engineProbeReducedMutations?: { name: string; value: string; t: number }[];
  __engineProbeReducedObserver?: MutationObserver;
}

interface TourStepWindow {
  __engineProbeTourSteps?: { step: number; t: number }[];
  __engineProbeTourObserver?: MutationObserver;
}

interface BlinkSample {
  t: number;
  phase: string | null;
  attr: string | null;
  opacity: number;
  textElements: number;
}

interface BlinkWindow {
  __engineProbeBlinkSamples?: BlinkSample[];
  __engineProbeBlinkRun?: boolean;
  __engineProbeBlinkClickAt?: number;
}

interface ClsWindow {
  __engineProbeRecordLayoutShift?: (entry: ClsEntryMessage) => Promise<void>;
}

interface ClsEntryMessage {
  value: number;
  startTime: number;
  hadRecentInput: boolean;
  sources: LayoutShiftObservation['sources'];
  phase: 'load' | 'interaction';
}

interface ClsCapture {
  page: LayoutShiftObservation['page'];
  group: string;
  entries: LayoutShiftObservation[];
  loadEntries: LayoutShiftObservation[];
}

interface SweepOptions {
  cols: number;
  rows: number;
  rowStart?: number;
  rowEnd?: number;
}

interface SweepResult {
  grid: { cols: number; rows: number };
  points: Record<string, PointObservation[]>;
  empty: PointObservation[];
}

interface Surface {
  context: BrowserContext;
  page: Page;
}

interface FixtureDocument {
  layers: { components: { id: string; name?: string }[] }[];
}

const clsCaptures = new WeakMap<Page, ClsCapture>();

const CLS_LOAD_NOTE =
  'pre-ready page-load shifts: pre-existing S4 playground behaviour (F7), not S5; see .specify/features/engine-core-b/evidence/F7-log-cls-load-s4-vs-s5.txt';

const WAIT_TIMEOUT_MS = 15_000;
const REDUCED_MOTION_WINDOW_MS = 1000;
const BLINK_SETTLE_MS = 2500;
const BLINK_OPACITY_THRESHOLD = 0.01;
const BLINK_ROUNDS = 4;
const BLINK_THROTTLE = 4;
const SAMPLE_SCAN_PX = 60;
const OVERLAY_360_WIDTH = 360;
const OVERLAY_360_HEIGHT = 740;
const VIEWER_SELECTOR = '[data-xploder-ready="true"]';
const CAPTION_SELECTOR = '[data-xploder-caption]';
const STAGE_SELECTOR = '[data-xploder-stage]';
const DESKTOP_GRID = { cols: 40, rows: 24 } as const;
const MOBILE_GRID = { cols: 32, rows: 24 } as const;
const DEFAULT_GAP_GRID = { cols: 80, rows: 48 } as const;
const CAPTION_DESKTOP_GRID = { cols: 80, rows: 48 } as const;
const CAPTION_MOBILE_GRID = { cols: 64, rows: 48 } as const;
const PICKUP_READY_PATH = [
  'recipient',
  'pickup-app',
  'pickup-api',
  'booking-service',
  'locker-registry',
  'notifier',
  'push-gateway',
] as const;
const usage = `Usage: pnpm engine:probe <base-url> [options]

Probes /dev/engine behaviour in Chromium. <base-url> must end in "/" and serve
an out-fixtures export (for example, http://127.0.0.1:4199/).

Options:
  --out <dir>     output directory (default: .evidence/<timestamp>-engine-probe)
  --scope <scope>  s4, s5, s6, or all (default: all)
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

function desktopOptions(): BrowserContextOptions {
  return {
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 1,
    isMobile: false,
  };
}

function mobileOptions(): BrowserContextOptions {
  return {
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 1,
    isMobile: true,
    hasTouch: true,
  };
}

function reducedOptions(): BrowserContextOptions {
  return { ...desktopOptions(), reducedMotion: 'reduce' };
}

function narrowOptions(): BrowserContextOptions {
  return {
    viewport: { width: OVERLAY_360_WIDTH, height: OVERLAY_360_HEIGHT },
    deviceScaleFactor: 1,
    isMobile: true,
    hasTouch: true,
    colorScheme: 'light',
  };
}

function osDarkOptions(): BrowserContextOptions {
  return { ...desktopOptions(), colorScheme: 'dark' };
}

function pixelOptions(): BrowserContextOptions {
  return { ...devices['Pixel 7'] };
}

function fixtureHref(
  base: URL,
  fixture: 'a' | 'b' | 'c',
  state?: 'exploded',
  flow?: string,
  tour?: 'paused',
  step?: number,
): string {
  const url = new URL('dev/engine', base);
  url.searchParams.set('fixture', fixture);
  if (state !== undefined) url.searchParams.set('state', state);
  if (flow !== undefined) url.searchParams.set('flow', flow);
  if (tour !== undefined) url.searchParams.set('tour', tour);
  if (step !== undefined) url.searchParams.set('step', String(step));
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

async function waitForViewerAttribute(
  page: Page,
  name: string,
  value: string | null,
): Promise<void> {
  await page.waitForFunction(
    ({ selector, attribute, expected }) => {
      const actual = document.querySelector(selector)?.getAttribute(attribute) ?? null;
      return actual === expected;
    },
    { selector: VIEWER_SELECTOR, attribute: name, expected: value },
    { timeout: WAIT_TIMEOUT_MS },
  );
}

async function waitForFrames(page: Page): Promise<void> {
  await page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
      }),
  );
}

async function waitForStableFrame(page: Page): Promise<number> {
  let previous = await readFrame(page);
  let stable = 0;

  for (let index = 0; index < 8 && stable < 2; index += 1) {
    await waitForFrames(page);
    const current = await readFrame(page);
    stable = current === previous ? stable + 1 : 0;
    previous = current;
  }

  return previous;
}

async function waitForSettledEmphasis(page: Page): Promise<void> {
  await waitForFrames(page);
  await page.waitForFunction(
    (selector) => {
      const viewer = document.querySelector(selector);
      return (
        viewer?.getAttribute('data-xploder-tweening') === 'false' &&
        viewer?.getAttribute('data-xploder-pulse') === 'false'
      );
    },
    VIEWER_SELECTOR,
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

async function readOptionalAttribute(page: Page, name: string): Promise<string | null> {
  return page.locator(VIEWER_SELECTOR).getAttribute(name);
}

async function readHighlight(page: Page): Promise<string | null> {
  return readOptionalAttribute(page, 'data-xploder-highlight');
}

async function readCamera(page: Page): Promise<{ azimuth: number; zoom: number }> {
  return {
    azimuth: await readNumberAttribute(page, 'data-xploder-azimuth'),
    zoom: await readNumberAttribute(page, 'data-xploder-zoom'),
  };
}

async function readFixture(page: Page): Promise<{
  instances: { layers: number; components: number };
  drawCalls: number;
}> {
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

async function captureFixturesAndCamera(
  page: Page,
  base: URL,
  outDir: string,
): Promise<Pick<S4Observation, 'fixtures' | 'camera'>> {
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

  await gotoFixture(page, fixtureHref(base, 'c', 'exploded'));
  await waitForReady(page, 'exploded');
  const fixtureC = await readFixture(page);
  await page.screenshot({ path: join(outDir, 'screenshot-c-exploded.png') });

  return {
    fixtures: { a: fixtureA, b: fixtureB, c: fixtureC },
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

async function captureNormalMotion(page: Page, base: URL): Promise<S4Observation['motion']> {
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

async function captureReducedMotion(
  page: Page,
  base: URL,
): Promise<S4Observation['reducedMotion']> {
  await gotoFixture(page, fixtureHref(base, 'a'));
  await waitForReady(page, 'exploded');
  const initialState = await readAttribute(page, 'data-xploder-state');
  await installPhaseObserver(page);
  const afterToggle = await measureReducedToggle(page);
  const afterToggleBack = await measureReducedToggle(page);
  await stopPhaseObserver(page);

  return { initialState, afterToggle, afterToggleBack };
}

async function captureS4(
  page: Page,
  reducedPage: Page,
  base: URL,
  outDir: string,
): Promise<S4Observation> {
  setClsGroup(page, 's4-fixtures-camera');
  const fixturesAndCamera = await captureFixturesAndCamera(page, base, outDir);
  await finishClsGroup(page);
  setClsGroup(page, 's4-motion');
  const motion = await captureNormalMotion(page, base);
  await finishClsGroup(page);
  setClsGroup(reducedPage, 's4-reduced-motion');
  const reducedMotion = await captureReducedMotion(reducedPage, base);
  await finishClsGroup(reducedPage);
  return { ...fixturesAndCamera, motion, reducedMotion };
}

async function sweepHitMap(page: Page, options: SweepOptions): Promise<SweepResult> {
  return page.evaluate(
    async ({ stageSelector, viewerSelector, grid }) => {
      const stage = document.querySelector(stageSelector);
      const viewer = document.querySelector(viewerSelector);
      if (!(stage instanceof HTMLElement) || !(viewer instanceof HTMLElement)) {
        throw new Error('viewer or stage is missing');
      }

      const rect = stage.getBoundingClientRect();
      const rowStart = grid.rowStart ?? 1;
      const rowEnd = grid.rowEnd ?? grid.rows;
      const points: Record<string, [number, number][]> = {};
      const empty: [number, number][] = [];

      for (let row = rowStart; row < rowEnd; row += 1) {
        const clientY = rect.top + (rect.height * row) / grid.rows;
        for (let col = 1; col < grid.cols; col += 1) {
          const clientX = rect.left + (rect.width * col) / grid.cols;
          stage.dispatchEvent(
            new PointerEvent('pointermove', {
              bubbles: true,
              pointerType: 'mouse',
              clientX,
              clientY,
            }),
          );
          await new Promise((resolve) => setTimeout(resolve, 0));
          const id = viewer.dataset.xploderHighlight;
          const point: [number, number] = [Math.round(clientX), Math.round(clientY)];

          if (id === undefined) {
            if (empty.length === 0) empty.push(point);
          } else {
            (points[id] ??= []).push(point);
          }
        }
      }

      return {
        grid: { cols: grid.cols, rows: grid.rows },
        points: Object.fromEntries(
          Object.entries(points).map(([id, values]) => [id, values.map(([x, y]) => ({ x, y }))]),
        ),
        empty: empty.map(([x, y]) => ({ x, y })),
      };
    },
    {
      stageSelector: STAGE_SELECTOR,
      viewerSelector: VIEWER_SELECTOR,
      grid: {
        cols: options.cols,
        rows: options.rows,
        rowStart: options.rowStart,
        rowEnd: options.rowEnd,
      },
    },
  );
}

function centralPoint(
  points: readonly PointObservation[] | undefined,
  id = 'unknown',
): PointObservation {
  if (points === undefined || points.length === 0) {
    throw new Error(`hit-map point is missing for ${id}`);
  }
  const center = points.reduce(
    (sum, point) => ({ x: sum.x + point.x / points.length, y: sum.y + point.y / points.length }),
    { x: 0, y: 0 },
  );

  return points.reduce((best, point) => {
    const bestDistance = Math.hypot(best.x - center.x, best.y - center.y);
    const pointDistance = Math.hypot(point.x - center.x, point.y - center.y);
    return pointDistance < bestDistance ? point : best;
  });
}

async function clearPointer(page: Page): Promise<void> {
  await page.mouse.move(1, 1);
  await waitForViewerAttribute(page, 'data-xploder-highlight', null);
}

async function installClsCapture(
  page: Page,
  pageName: LayoutShiftObservation['page'],
): Promise<void> {
  const capture: ClsCapture = {
    page: pageName,
    group: 'setup',
    entries: [],
    loadEntries: [],
  };
  clsCaptures.set(page, capture);
  await page.exposeFunction('__engineProbeRecordLayoutShift', (entry: ClsEntryMessage) => {
    const observation: LayoutShiftObservation = {
      value: entry.value,
      startTime: entry.startTime,
      hadRecentInput: entry.hadRecentInput,
      page: capture.page,
      group: capture.group,
      sources: entry.sources,
    };
    if (entry.phase === 'interaction') {
      capture.entries.push(observation);
    } else {
      capture.loadEntries.push(observation);
    }
  });
  await page.addInitScript(() => {
    const target = window as unknown as ClsWindow;
    const describe = (node: Node | null) => {
      const element = node instanceof Element ? node : (node?.parentElement ?? null);
      if (element === null) return null;
      return {
        tag: node instanceof Element ? element.tagName.toLowerCase() : '#text',
        dataAttributes: Object.fromEntries(
          [...element.attributes]
            .filter((attribute) => attribute.name.startsWith('data-'))
            .map((attribute) => [attribute.name, attribute.value]),
        ),
        parentTag: element.parentElement?.tagName.toLowerCase() ?? null,
        text: element.textContent?.trim().slice(0, 80) || null,
        inOverlay: element.closest('[data-xploder-overlay]') !== null,
      };
    };
    const rect = (value: DOMRectReadOnly | undefined) =>
      value === undefined
        ? null
        : { x: value.x, y: value.y, width: value.width, height: value.height };
    let readyAt: number | null = null;
    const markReady = () => {
      if (readyAt !== null) return;
      if (document.querySelector('[data-xploder-ready="true"]') === null) return;
      readyAt = performance.now();
    };
    const readyObserver = new MutationObserver(markReady);
    readyObserver.observe(document, {
      attributes: true,
      subtree: true,
      attributeFilter: ['data-xploder-ready'],
    });
    markReady();
    const observer = new PerformanceObserver((list) => {
      for (const item of list.getEntries() as (PerformanceEntry & {
        value: number;
        hadRecentInput: boolean;
        sources?: {
          node: Node | null;
          previousRect?: DOMRectReadOnly;
          currentRect?: DOMRectReadOnly;
        }[];
      })[]) {
        void target
          .__engineProbeRecordLayoutShift?.({
            value: item.value,
            startTime: item.startTime,
            hadRecentInput: item.hadRecentInput === true,
            sources: (item.sources ?? []).map((source) => ({
              node: describe(source.node),
              previousRect: rect(source.previousRect),
              currentRect: rect(source.currentRect),
            })),
            phase: readyAt !== null && item.startTime > readyAt ? 'interaction' : 'load',
          })
          .catch(() => undefined);
      }
    });
    observer.observe({ type: 'layout-shift', buffered: true });
  });
}

function setClsGroup(page: Page, group: string): void {
  const capture = clsCaptures.get(page);
  if (capture === undefined) throw new Error('layout-shift observer is not installed');
  capture.group = group;
}

async function finishClsGroup(page: Page): Promise<void> {
  await waitForFrames(page);
  await page.waitForTimeout(0);
}

function collectCls(pages: readonly Page[]): ClsObservation {
  const entries = pages.flatMap((page) => clsCaptures.get(page)?.entries ?? []);
  return {
    total: totalLayoutShift(entries),
    entries,
  };
}

function collectClsLoad(pages: readonly Page[]): ClsLoadObservation {
  const entries = pages.flatMap((page) => clsCaptures.get(page)?.loadEntries ?? []);
  return {
    total: totalLayoutShift(entries),
    entries,
    note: CLS_LOAD_NOTE,
  };
}

async function readPixel(page: Page, point: PointObservation): Promise<PixelObservation> {
  const screenshot = await page.screenshot({
    clip: { x: Math.round(point.x), y: Math.round(point.y), width: 1, height: 1 },
  });

  return page.evaluate(async (base64) => {
    const image = new Image();
    image.src = `data:image/png;base64,${base64}`;
    await image.decode();
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    const context = canvas.getContext('2d');
    if (context === null) throw new Error('2D canvas is unavailable');
    context.drawImage(image, 0, 0);
    const [r = 0, g = 0, b = 0] = context.getImageData(0, 0, 1, 1).data;
    return { r, g, b };
  }, screenshot.toString('base64'));
}

async function readCssColor(page: Page, variable: string): Promise<PixelObservation> {
  return page.evaluate((name) => {
    const element = document.createElement('span');
    element.style.color = `var(${name})`;
    document.body.append(element);
    const raw = getComputedStyle(element).color;
    element.remove();
    const match = raw.match(/rgba?\(([^)]+)\)/);
    if (match === null) throw new Error(`unsupported computed colour: ${raw}`);
    const channels = (match[1] ?? '')
      .split(/[ ,/]+/)
      .filter(Boolean)
      .map(Number);
    const [r = 0, g = 0, b = 0] = channels;
    return { r, g, b };
  }, variable);
}

function parseComputedColor(raw: string): PixelObservation {
  const match = raw.match(/rgba?\(([^)]+)\)/);
  if (match === null) throw new Error(`unsupported computed colour: ${raw}`);
  const channels = (match[1] ?? '')
    .split(/[ ,/]+/)
    .filter(Boolean)
    .map(Number);
  const [r = 0, g = 0, b = 0] = channels;
  return { r, g, b };
}

async function readElementColor(page: Page, selector: string): Promise<PixelObservation> {
  const raw = await page
    .locator(selector)
    .first()
    .evaluate((element) => {
      return getComputedStyle(element).color;
    });
  return parseComputedColor(raw);
}

async function setTheme(page: Page, theme: 'light' | 'dark'): Promise<void> {
  await page.waitForSelector('button[aria-label^="Switch to "]', { timeout: WAIT_TIMEOUT_MS });
  const isDark = await page.evaluate(() => document.documentElement.classList.contains('dark'));

  if (isDark !== (theme === 'dark')) {
    await page
      .getByRole('button', { name: isDark ? 'Switch to light theme' : 'Switch to dark theme' })
      .click();
    await page.waitForFunction(
      (dark) => document.documentElement.classList.contains('dark') === dark,
      theme === 'dark',
      { timeout: WAIT_TIMEOUT_MS },
    );
  }

  await waitForFrames(page);
}

async function withOverlayHidden<T>(page: Page, work: () => Promise<T>): Promise<T> {
  const style = await page.addStyleTag({
    content: '[data-xploder-overlay]{visibility:hidden}',
  });

  try {
    return await work();
  } finally {
    await style.evaluate((element) => (element as HTMLElement).remove());
  }
}

async function readPixelColumn(
  page: Page,
  point: PointObservation,
  height: number,
): Promise<PixelObservation[]> {
  const screenshot = await page.screenshot({
    clip: { x: Math.round(point.x), y: Math.round(point.y), width: 1, height },
  });

  return page.evaluate(
    async ({ base64, pixels }) => {
      const image = new Image();
      image.src = `data:image/png;base64,${base64}`;
      await image.decode();
      const canvas = document.createElement('canvas');
      canvas.width = 1;
      canvas.height = pixels;
      const context = canvas.getContext('2d');
      if (context === null) throw new Error('2D canvas is unavailable');
      context.drawImage(image, 0, 0);
      const data = context.getImageData(0, 0, 1, pixels).data;
      const result: { r: number; g: number; b: number }[] = [];

      for (let index = 0; index < pixels; index += 1) {
        const offset = index * 4;
        result.push({ r: data[offset] ?? 0, g: data[offset + 1] ?? 0, b: data[offset + 2] ?? 0 });
      }

      return result;
    },
    { base64: screenshot.toString('base64'), pixels: height },
  );
}

async function readScreenshotPixels(
  page: Page,
  screenshot: Buffer,
  points: readonly PointObservation[],
): Promise<PixelObservation[]> {
  return page.evaluate(
    async ({ base64, samples }) => {
      const image = new Image();
      image.src = `data:image/png;base64,${base64}`;
      await image.decode();
      const canvas = document.createElement('canvas');
      canvas.width = image.width;
      canvas.height = image.height;
      const context = canvas.getContext('2d');
      if (context === null) throw new Error('2D canvas is unavailable');
      context.drawImage(image, 0, 0);

      return samples.map(({ x, y }) => {
        const [r = 0, g = 0, b = 0] = context.getImageData(Math.round(x), Math.round(y), 1, 1).data;
        return { r, g, b };
      });
    },
    { base64: screenshot.toString('base64'), samples: points },
  );
}

async function waitForOverlay(page: Page, state: 'imploded' | 'exploded'): Promise<void> {
  await waitForSettledEmphasis(page);
  await page.waitForFunction(
    ({ selector, expected }) => {
      const viewer = document.querySelector(selector);
      const overlay = document.querySelector('[data-xploder-overlay]');
      if (!(viewer instanceof HTMLElement) || !(overlay instanceof HTMLElement)) return false;

      if (expected === 'imploded') {
        return (
          viewer.dataset.xploderTitleblock === 'shown' &&
          document.querySelectorAll('[data-xploder-label]').length === 0
        );
      }

      return (
        overlay.dataset.xploderOverlay === 'shown' && overlay.dataset.xploderOverlayHidden === '0'
      );
    },
    { selector: VIEWER_SELECTOR, expected: state },
    { timeout: WAIT_TIMEOUT_MS },
  );
  await page.waitForFunction(
    () => {
      const overlay = document.querySelector('[data-xploder-overlay]');
      return (
        overlay instanceof HTMLElement &&
        Number.parseFloat(getComputedStyle(overlay).opacity) >= 0.99
      );
    },
    undefined,
    { timeout: WAIT_TIMEOUT_MS },
  );
}

async function readOverlayDefault(
  page: Page,
  fixture: 'a' | 'b' | 'c',
  state: 'imploded' | 'exploded',
  viewport: 'mobile' | 'desktop',
): Promise<OverlayDefaultObservation> {
  return page.evaluate(
    ({ fixture: fixtureId, state: target, viewport: viewportName, selector }) => {
      const viewer = document.querySelector(selector);
      const overlay = document.querySelector('[data-xploder-overlay]');
      if (!(viewer instanceof HTMLElement) || !(overlay instanceof HTMLElement)) {
        throw new Error('viewer or overlay is missing');
      }

      return {
        fixture: fixtureId,
        state: target,
        viewport: viewportName,
        titleBlock: viewer.dataset.xploderTitleblock ?? null,
        overlay: overlay.dataset.xploderOverlay ?? null,
        hidden: overlay.dataset.xploderOverlayHidden ?? null,
        labelCount: document.querySelectorAll('[data-xploder-label]').length,
      };
    },
    { fixture, state, viewport, selector: VIEWER_SELECTOR },
  );
}

async function readOverlay360(
  page: Page,
  fixture: 'a' | 'c',
  state: 'imploded' | 'exploded',
  theme: 'light' | 'dark',
): Promise<Overlay360Observation> {
  return page.evaluate(
    ({ fixture: fixtureId, state: target, theme: themeName, selector }) => {
      const viewer = document.querySelector(selector);
      if (!(viewer instanceof HTMLElement)) throw new Error('viewer is missing');
      const viewerRect = viewer.getBoundingClientRect();
      const boxes: OverlayBoxObservation[] = [
        ...document.querySelectorAll<HTMLElement>(
          '[data-xploder-label],[data-xploder-titleblock-box]',
        ),
      ].map((element) => {
        const rect = element.getBoundingClientRect();

        return {
          key:
            element.dataset.xploderLabel ??
            (element.hasAttribute('data-xploder-titleblock-box') ? 'titleblock' : ''),
          left: rect.left,
          top: rect.top,
          right: rect.right,
          bottom: rect.bottom,
          fontSize: Number.parseFloat(getComputedStyle(element).fontSize),
        };
      });

      return {
        fixture: fixtureId,
        state: target,
        theme: themeName,
        viewer: {
          left: viewerRect.left,
          top: viewerRect.top,
          right: viewerRect.right,
          bottom: viewerRect.bottom,
        },
        boxes,
      };
    },
    { fixture, state, theme, selector: VIEWER_SELECTOR },
  );
}

async function readSelection(
  page: Page,
  selector: string,
): Promise<{ text: string; selected: string; userSelect: string }> {
  return page
    .locator(selector)
    .first()
    .evaluate((element) => {
      const range = document.createRange();
      range.selectNodeContents(element);
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);

      return {
        text: element.textContent?.trim() ?? '',
        selected: selection?.toString().trim() ?? '',
        userSelect: getComputedStyle(element).userSelect,
      };
    });
}

async function readOverlayColourExpectation(
  page: Page,
): Promise<OverlayColoursObservation['expected']> {
  return {
    label: await readCssColor(page, '--bp-label'),
    ink: await readCssColor(page, '--bp-ink'),
    steel: await readCssColor(page, '--bp-steel'),
  };
}

async function readOverlayLabelColours(
  page: Page,
): Promise<Pick<OverlayColoursObservation, 'layer' | 'part' | 'dimension' | 'expected'>> {
  return {
    layer: await readElementColor(page, '[data-xploder-label^="layer:"]'),
    part: await readElementColor(page, '[data-xploder-label^="part:"]'),
    dimension: await readElementColor(page, '[data-xploder-label^="dimension:"]'),
    expected: await readOverlayColourExpectation(page),
  };
}

async function readOverlayTitleColour(page: Page): Promise<PixelObservation> {
  return readElementColor(page, '[data-xploder-titleblock-box] > div:first-child');
}

async function captureHitMap(page: Page, base: URL, outDir: string): Promise<HitMapObservation> {
  await gotoFixture(page, fixtureHref(base, 'a', 'exploded'));
  await waitForReady(page, 'exploded');
  await waitForSettledEmphasis(page);
  const exploded = await sweepHitMap(page, DESKTOP_GRID);
  await page.screenshot({ path: join(outDir, 'screenshot-hitMap-exploded.png') });

  await clearPointer(page);
  await page.locator('[data-engine-control="toggle"]').click();
  await waitForReady(page, 'imploded');
  await waitForSettledEmphasis(page);
  const imploded = await sweepHitMap(page, DESKTOP_GRID);
  await page.screenshot({ path: join(outDir, 'screenshot-hitMap-imploded.png') });
  await clearPointer(page);

  return {
    grid: exploded.grid,
    imploded: imploded.points,
    exploded: exploded.points,
  };
}

async function captureHoverSample(
  page: Page,
  base: URL,
  state: 'exploded' | 'imploded',
  target: string,
  point: PointObservation,
  outDir: string,
): Promise<HoverSampleObservation> {
  await gotoFixture(page, fixtureHref(base, 'a', state === 'exploded' ? 'exploded' : undefined));
  await waitForReady(page, state);
  await waitForSettledEmphasis(page);
  await clearPointer(page);

  const pixelBefore = await readPixel(page, point);
  await page.mouse.move(point.x, point.y);
  await waitForViewerAttribute(page, 'data-xploder-highlight', target);
  await waitForSettledEmphasis(page);
  const highlight = await readHighlight(page);
  const cursor = await page.locator('canvas').evaluate((canvas) => canvas.style.cursor);
  const pixelAfter = await readPixel(page, point);
  const accent = await readCssColor(page, '--bp-accent');
  await page.screenshot({ path: join(outDir, `screenshot-hover-${state}.png`) });

  await page.mouse.move(1, 1);
  await waitForViewerAttribute(page, 'data-xploder-highlight', null);
  const clearAfterLeave = (await readHighlight(page)) === null;

  return { target, highlight, cursor, pixelBefore, pixelAfter, accent, clearAfterLeave };
}

async function captureHover(
  page: Page,
  base: URL,
  hitMap: HitMapObservation,
  outDir: string,
): Promise<HoverObservation> {
  const target = 'tide-chart-screen';
  const explodedPoint = centralPoint(hitMap.exploded[target]);
  const implodedPoint = centralPoint(hitMap.imploded[target]);
  const exploded = await captureHoverSample(page, base, 'exploded', target, explodedPoint, outDir);
  const imploded = await captureHoverSample(page, base, 'imploded', target, implodedPoint, outDir);

  return { exploded, imploded };
}

async function installTouchTrace(page: Page): Promise<void> {
  await page.evaluate(() => {
    const target = window as unknown as TouchWindow;
    target.__engineProbeTouchTrace = [];
    for (const type of ['pointerdown', 'pointerup', 'click']) {
      document.addEventListener(
        type,
        (event) => {
          const pointer = event as PointerEvent;
          target.__engineProbeTouchTrace?.push({
            type,
            pointerType: pointer.pointerType ?? '',
            t: performance.now(),
          });
        },
        true,
      );
    }
  });
}

async function readTouchTrace(page: Page): Promise<TouchTraceEntry[]> {
  return page.evaluate(() =>
    ((window as unknown as TouchWindow).__engineProbeTouchTrace ?? []).filter(
      (entry) => entry.pointerType === 'touch',
    ),
  );
}

async function tapAndWait(
  page: Page,
  point: PointObservation,
  expected: string | null,
): Promise<void> {
  await page.touchscreen.tap(point.x, point.y);
  await waitForViewerAttribute(page, 'data-xploder-highlight', expected);
}

async function captureTouchState(
  page: Page,
  base: URL,
  state: 'exploded' | 'imploded',
  outDir: string,
): Promise<{
  result: TouchStateObservation;
  trace: TouchTraceEntry[];
}> {
  await gotoFixture(page, fixtureHref(base, 'a', state === 'exploded' ? 'exploded' : undefined));
  await waitForReady(page, state);
  await waitForSettledEmphasis(page);
  const map = await sweepHitMap(page, MOBILE_GRID);
  await clearPointer(page);
  await installTouchTrace(page);

  const ids = Object.keys(map.points);
  const firstTarget = ids[0];
  const secondTarget = ids.find((id) => id !== firstTarget);
  const empty = map.empty[0];
  if (firstTarget === undefined || secondTarget === undefined || empty === undefined) {
    throw new Error(`${state} touch targets are incomplete`);
  }

  const first = centralPoint(map.points[firstTarget]);
  const second = centralPoint(map.points[secondTarget]);

  await tapAndWait(page, first, firstTarget);
  const afterFirst = await readHighlight(page);
  await page.screenshot({ path: join(outDir, `screenshot-touch-${state}.png`) });

  await tapAndWait(page, first, null);
  const afterSecondTap = await readHighlight(page);

  await tapAndWait(page, first, firstTarget);
  await tapAndWait(page, second, secondTarget);
  const afterOtherTap = await readHighlight(page);

  await tapAndWait(page, first, firstTarget);
  await tapAndWait(page, empty, null);
  const afterEmptyTap = await readHighlight(page);

  await tapAndWait(page, first, firstTarget);
  await tapAndWait(page, { x: 1, y: 1 }, null);
  const afterOutsideTap = await readHighlight(page);

  const trace = await readTouchTrace(page);
  return {
    result: {
      firstTarget,
      secondTarget,
      afterFirst,
      afterSecondTap,
      afterOtherTap,
      afterEmptyTap,
      afterOutsideTap,
    },
    trace,
  };
}

async function captureTouch(page: Page, base: URL, outDir: string): Promise<TouchObservation> {
  const exploded = await captureTouchState(page, base, 'exploded', outDir);
  const imploded = await captureTouchState(page, base, 'imploded', outDir);

  return {
    exploded: exploded.result,
    imploded: imploded.result,
    trace: [...exploded.trace, ...imploded.trace],
  };
}

async function captureFocus(
  page: Page,
  base: URL,
  hitMap: HitMapObservation,
  outDir: string,
): Promise<FocusObservation> {
  const target = 'tide-view-model';
  const point = centralPoint(hitMap.exploded[target]);
  await gotoFixture(page, fixtureHref(base, 'a', 'exploded'));
  await waitForReady(page, 'exploded');
  await waitForSettledEmphasis(page);
  await clearPointer(page);

  const pixelBefore = await readPixel(page, point);
  await page.locator('[data-engine-control="focus-ui"]').click();
  await waitForViewerAttribute(page, 'data-xploder-focus', 'ui');
  await waitForSettledEmphasis(page);
  const pixelAfter = await readPixel(page, point);
  const paper = await readCssColor(page, '--bp-paper');
  const toggleLayer = await readOptionalAttribute(page, 'data-xploder-focus');
  await page.screenshot({ path: join(outDir, 'screenshot-focus-exploded.png') });

  await page.keyboard.press('Escape');
  await waitForViewerAttribute(page, 'data-xploder-focus', null);
  const escapeLayer = await readOptionalAttribute(page, 'data-xploder-focus');

  await page.locator('[data-engine-control="focus-ui"]').click();
  await waitForViewerAttribute(page, 'data-xploder-focus', 'ui');
  await page.locator('[data-engine-control="focus-ui"]').click();
  await waitForViewerAttribute(page, 'data-xploder-focus', null);
  const toggleReleaseLayer = await readOptionalAttribute(page, 'data-xploder-focus');

  await gotoFixture(page, fixtureHref(base, 'a'));
  await waitForReady(page, 'imploded');
  await page.locator('[data-engine-control="focus-ui"]').click();
  await waitForViewerAttribute(page, 'data-xploder-focus', 'ui');
  await page.locator('[data-engine-control="toggle"]').click();
  await waitForReady(page, 'exploded');
  const afterExplode = {
    state: await readAttribute(page, 'data-xploder-state'),
    layer: await readOptionalAttribute(page, 'data-xploder-focus'),
  };

  await page.locator('[data-engine-control="rotate-right"]').click();
  await waitForAzimuth(page, 135);
  const afterRotate = {
    azimuth: await readNumberAttribute(page, 'data-xploder-azimuth'),
    layer: await readOptionalAttribute(page, 'data-xploder-focus'),
  };

  return {
    target,
    pixelBefore,
    pixelAfter,
    paper,
    toggleLayer,
    escapeLayer,
    toggleReleaseLayer,
    afterExplode,
    afterRotate,
  };
}

async function loadComponentNames(fixture: 'a' | 'c'): Promise<Map<string, string>> {
  const filenames = {
    a: 'project-a-ui-app.json',
    c: 'project-c-lockerbay.json',
  } as const;
  const source = await readFile(
    new URL(`../../../../packages/xploder/test/fixtures/${filenames[fixture]}`, import.meta.url),
    'utf8',
  );
  const document = JSON.parse(source) as FixtureDocument;
  const names = new Map<string, string>();

  for (const component of document.layers.flatMap((layer) => layer.components)) {
    names.set(component.name ?? component.id, component.id);
    names.set(component.id, component.id);
  }

  return names;
}

async function waitForTour(
  page: Page,
  status: string,
  flowId: string,
  step: number,
): Promise<void> {
  await page.waitForSelector(
    `${VIEWER_SELECTOR}[data-xploder-tour="${status}"][data-xploder-tour-flow="${flowId}"][data-xploder-tour-step="${step}"]`,
    { timeout: WAIT_TIMEOUT_MS },
  );
  await waitForFrames(page);
}

async function captionComponentId(page: Page, names: Map<string, string>): Promise<string> {
  const text = await page.locator(`${CAPTION_SELECTOR} p`).nth(1).textContent();
  const id = names.get(text?.trim() ?? '');
  if (id === undefined) throw new Error(`unknown caption component: ${text ?? 'missing'}`);
  return id;
}

async function tourTotal(page: Page): Promise<number> {
  const text = await page.locator('[data-engine-tour]').textContent();
  const match = text?.match(/\/\s*(\d+)/);
  const total = Number(match?.[1]);
  if (!Number.isSafeInteger(total) || total <= 0) throw new Error('tour total is missing');
  return total;
}

async function captureTourFlow(
  page: Page,
  base: URL,
  fixture: 'a' | 'c',
  flowId: string,
  names: Map<string, string>,
  outDir: string,
): Promise<TourFlowObservation> {
  await gotoFixture(page, fixtureHref(base, fixture, 'exploded', flowId, 'paused'));
  await waitForTour(page, 'paused', flowId, 0);
  const total = await tourTotal(page);
  const timeline: string[] = [];
  const stepNumbers: number[] = [];
  const azimuths: number[] = [];
  const zooms: number[] = [];

  for (let step = 0; step < total; step += 1) {
    await waitForTour(page, step === total - 1 ? 'paused' : 'paused', flowId, step);
    timeline.push(await captionComponentId(page, names));
    stepNumbers.push(await readNumberAttribute(page, 'data-xploder-tour-step'));
    azimuths.push(await readNumberAttribute(page, 'data-xploder-azimuth'));
    zooms.push(await readNumberAttribute(page, 'data-xploder-zoom'));

    if (step < total - 1) {
      await page.locator('[data-engine-control="tour-step"]').click();
    }
  }

  await page.screenshot({ path: join(outDir, `screenshot-tour-${fixture}-${flowId}.png`) });
  await page.locator('[data-engine-control="tour-stop"]').click();
  await page.waitForSelector(
    `${VIEWER_SELECTOR}[data-xploder-tour="idle"][data-xploder-tour-step="-1"]`,
    { timeout: WAIT_TIMEOUT_MS },
  );
  const stop = {
    status: await readAttribute(page, 'data-xploder-tour'),
    captionVisible: (await page.locator(CAPTION_SELECTOR).count()) > 0,
  };

  return {
    fixture,
    flowId,
    timeline,
    stepNumbers,
    stop,
    camera: { azimuths, zooms },
  };
}

async function captureTourTiming(
  page: Page,
  base: URL,
): Promise<Pick<TourObservation, 'normalCadenceMs' | 'pause'>> {
  await gotoFixture(page, fixtureHref(base, 'a', 'exploded', 'live-update', 'paused'));
  await waitForTour(page, 'paused', 'live-update', 0);
  await installTourStepObserver(page);
  await page.locator('[data-engine-control="tour-play"]').click();
  await waitForTour(page, 'playing', 'live-update', 0);
  await waitForTour(page, 'playing', 'live-update', 1);
  await waitForTour(page, 'playing', 'live-update', 2);
  await waitForTour(page, 'playing', 'live-update', 3);
  const steps = await readTourStepTimes(page);
  const first = steps.find((entry) => entry.step === 1)?.t;
  const second = steps.find((entry) => entry.step === 2)?.t;
  const third = steps.find((entry) => entry.step === 3)?.t;
  if (first === undefined || second === undefined || third === undefined) {
    throw new Error('normal tour cadence was not observed');
  }
  const normalCadenceMs = [second - first, third - second];
  const [firstInterval = 0, secondInterval = 0] = normalCadenceMs;
  await page.locator('[data-engine-control="tour-play"]').click();
  await page.waitForSelector(`${VIEWER_SELECTOR}[data-xploder-tour="paused"]`, {
    timeout: WAIT_TIMEOUT_MS,
  });
  const stepAtPause = await readNumberAttribute(page, 'data-xploder-tour-step');
  const holdMs = Math.max(1, (firstInterval + secondInterval) / 2);
  await page.waitForTimeout(holdMs * 1.2);
  const stepAfterHold = await readNumberAttribute(page, 'data-xploder-tour-step');

  return {
    normalCadenceMs,
    pause: { stepAtPause, stepAfterHold },
  };
}

async function captureTourFocus(page: Page, base: URL): Promise<TourObservation['focusSuspended']> {
  await gotoFixture(page, fixtureHref(base, 'a'));
  await waitForReady(page, 'imploded');
  await page.locator('[data-engine-control="focus-ui"]').click();
  await waitForViewerAttribute(page, 'data-xploder-focus', 'ui');
  await page.locator('[data-engine-control="tour-play"]').click();
  await page.waitForSelector(`${VIEWER_SELECTOR}[data-xploder-tour="playing"]`, {
    timeout: WAIT_TIMEOUT_MS,
  });
  const during =
    (await readOptionalAttribute(page, 'data-xploder-focus')) === 'ui' &&
    (await page.locator('[data-engine-control="focus-ui"]').isDisabled());

  await page.locator('[data-engine-control="tour-stop"]').click();
  await page.waitForSelector(`${VIEWER_SELECTOR}[data-xploder-tour="idle"]`, {
    timeout: WAIT_TIMEOUT_MS,
  });
  const layerAfter = await readOptionalAttribute(page, 'data-xploder-focus');
  const after =
    layerAfter === 'ui' && !(await page.locator('[data-engine-control="focus-ui"]').isDisabled());

  return { during, after, layerAfter };
}

async function captureTour(page: Page, base: URL, outDir: string): Promise<TourObservation> {
  const names = {
    a: await loadComponentNames('a'),
    c: await loadComponentNames('c'),
  };
  const flows = [
    await captureTourFlow(page, base, 'a', 'live-update', names.a, outDir),
    await captureTourFlow(page, base, 'a', 'offline-read', names.a, outDir),
    await captureTourFlow(page, base, 'c', 'pickup-ready', names.c, outDir),
    await captureTourFlow(page, base, 'c', 'push-failed', names.c, outDir),
  ];
  const timing = await captureTourTiming(page, base);
  const focusSuspended = await captureTourFocus(page, base);

  return { flows, ...timing, focusSuspended };
}

async function captureSelector(page: Page, base: URL): Promise<SelectorObservation> {
  const read = async (fixture: 'a' | 'b' | 'c') => {
    await gotoFixture(page, fixtureHref(base, fixture, 'exploded'));
    await waitForReady(page, 'exploded');
    const buttons = page.locator('[data-engine-control^="flow-"]');
    const flowButtons = await buttons.count();
    return { flowButtons, visible: flowButtons > 0 && (await buttons.first().isVisible()) };
  };

  const a = await read('a');
  const b = await read('b');
  const c = await read('c');
  return { a, b, c };
}

async function readCaptionTokens(page: Page): Promise<CaptionTokenObservation> {
  return page.evaluate((selector) => {
    const caption = document.querySelector(selector);
    const body = caption?.querySelectorAll('p')[1];
    if (!(caption instanceof HTMLElement) || !(body instanceof HTMLElement)) {
      throw new Error('caption is missing');
    }

    const range = document.createRange();
    range.selectNodeContents(body);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);

    const resolveColor = (value: string): { r: number; g: number; b: number } => {
      const probe = document.createElement('span');
      probe.style.color = value;
      document.body.append(probe);
      const raw = getComputedStyle(probe).color;
      probe.remove();
      const match = raw.match(/rgba?\(([^)]+)\)/);
      if (match === null) throw new Error(`unsupported computed colour: ${raw}`);
      const channels = (match[1] ?? '')
        .split(/[ ,/]+/)
        .filter(Boolean)
        .map(Number);
      const [r = 0, g = 0, b = 0] = channels;
      return { r, g, b };
    };

    return {
      userSelect: getComputedStyle(caption).userSelect,
      selectedText: selection?.toString() ?? '',
      text: body.textContent ?? '',
      color: resolveColor(getComputedStyle(body).color),
      background: resolveColor(getComputedStyle(caption).backgroundColor),
      expectedColor: resolveColor('var(--bp-ink)'),
      expectedBackground: resolveColor('var(--bp-surface)'),
    };
  }, CAPTION_SELECTOR);
}

async function captureCaption(page: Page, base: URL, outDir: string): Promise<CaptionObservation> {
  await gotoFixture(page, fixtureHref(base, 'c', 'exploded', 'pickup-ready', 'paused', 0));
  await waitForTour(page, 'paused', 'pickup-ready', 0);
  const light = await readCaptionTokens(page);
  await page.screenshot({ path: join(outDir, 'screenshot-caption-light.png') });

  await page.getByRole('button', { name: 'Switch to dark theme' }).click();
  await page.waitForFunction(() => document.documentElement.classList.contains('dark'));
  await waitForFrames(page);
  const dark = await readCaptionTokens(page);
  await page.screenshot({ path: join(outDir, 'screenshot-caption-dark.png') });

  return { light, dark };
}

async function installReducedObserver(page: Page): Promise<void> {
  await page.evaluate((selector) => {
    const target = window as unknown as ReducedWindow;
    const viewer = document.querySelector(selector);
    if (viewer === null) throw new Error('viewer is missing');

    target.__engineProbeReducedMutations = [
      {
        name: 'data-xploder-tweening',
        value: (viewer as HTMLElement).dataset.xploderTweening ?? '',
        t: performance.now(),
      },
      {
        name: 'data-xploder-pulse',
        value: (viewer as HTMLElement).dataset.xploderPulse ?? '',
        t: performance.now(),
      },
    ];
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (!(mutation.target instanceof HTMLElement)) continue;
        if (mutation.attributeName === 'data-xploder-tweening') {
          target.__engineProbeReducedMutations?.push({
            name: 'data-xploder-tweening',
            value: mutation.target.dataset.xploderTweening ?? '',
            t: performance.now(),
          });
        }
        if (mutation.attributeName === 'data-xploder-pulse') {
          target.__engineProbeReducedMutations?.push({
            name: 'data-xploder-pulse',
            value: mutation.target.dataset.xploderPulse ?? '',
            t: performance.now(),
          });
        }
      }
    });
    observer.observe(viewer, {
      attributes: true,
      attributeFilter: ['data-xploder-tweening', 'data-xploder-pulse'],
    });
    target.__engineProbeReducedObserver = observer;
  }, VIEWER_SELECTOR);
}

async function readReducedMutations(
  page: Page,
): Promise<{ name: string; value: string; t: number }[]> {
  return page.evaluate(
    () => (window as unknown as ReducedWindow).__engineProbeReducedMutations ?? [],
  );
}

async function installTourStepObserver(page: Page): Promise<void> {
  await page.evaluate((selector) => {
    const target = window as unknown as TourStepWindow;
    const viewer = document.querySelector(selector);
    if (viewer === null) throw new Error('viewer is missing');

    target.__engineProbeTourSteps = [];
    const observer = new MutationObserver(() => {
      const step = Number((viewer as HTMLElement).dataset.xploderTourStep);
      if (Number.isSafeInteger(step)) {
        target.__engineProbeTourSteps?.push({ step, t: performance.now() });
      }
    });
    observer.observe(viewer, {
      attributes: true,
      attributeFilter: ['data-xploder-tour-step'],
    });
    target.__engineProbeTourObserver = observer;
  }, VIEWER_SELECTOR);
}

async function readTourStepTimes(page: Page): Promise<{ step: number; t: number }[]> {
  return page.evaluate(() => (window as unknown as TourStepWindow).__engineProbeTourSteps ?? []);
}

function valuesFor(entries: readonly { name: string; value: string }[], name: string): string[] {
  return entries.filter((entry) => entry.name === name).map((entry) => entry.value);
}

async function readFrame(page: Page): Promise<number> {
  return readNumberAttribute(page, 'data-engine-frame', '[data-engine-frame]');
}

async function captureReduced(
  page: Page,
  base: URL,
  hitMap: HitMapObservation,
  normalCadenceMs: readonly number[],
  outDir: string,
): Promise<ReducedObservation> {
  const names = await loadComponentNames('a');
  await gotoFixture(page, fixtureHref(base, 'a', 'exploded'));
  await waitForReady(page, 'exploded');
  await waitForSettledEmphasis(page);
  await installReducedObserver(page);
  await clearPointer(page);

  const hoverTarget = 'tide-chart-screen';
  const hoverPoint = centralPoint(hitMap.exploded[hoverTarget]);
  const hoverFrameBefore = await readFrame(page);
  await page.mouse.move(hoverPoint.x, hoverPoint.y);
  await waitForViewerAttribute(page, 'data-xploder-highlight', hoverTarget);
  await waitForFrames(page);
  const hoverFrameAfter = await readFrame(page);
  const hoverMutations = await readReducedMutations(page);
  const hover: ReducedActionObservation = {
    target: hoverTarget,
    frameDelta: hoverFrameAfter - hoverFrameBefore,
    highlight: await readHighlight(page),
    tweening: valuesFor(hoverMutations, 'data-xploder-tweening'),
    pulse: valuesFor(hoverMutations, 'data-xploder-pulse'),
  };
  await page.screenshot({ path: join(outDir, 'screenshot-reduced-hover.png') });

  await clearPointer(page);
  await waitForSettledEmphasis(page);
  const focusTarget = 'ui';
  const focusFrameBefore = await readFrame(page);
  await page.locator('[data-engine-control="focus-ui"]').click();
  await waitForViewerAttribute(page, 'data-xploder-focus', focusTarget);
  await waitForFrames(page);
  const focusFrameAfter = await readFrame(page);
  const focusMutations = await readReducedMutations(page);
  const focus: ReducedActionObservation = {
    target: focusTarget,
    frameDelta: focusFrameAfter - focusFrameBefore,
    highlight: await readOptionalAttribute(page, 'data-xploder-focus'),
    tweening: valuesFor(focusMutations, 'data-xploder-tweening'),
    pulse: valuesFor(focusMutations, 'data-xploder-pulse'),
  };
  await page.screenshot({ path: join(outDir, 'screenshot-reduced-focus.png') });

  await page.keyboard.press('Escape');
  await waitForViewerAttribute(page, 'data-xploder-focus', null);
  await installTourStepObserver(page);
  await page.locator('[data-engine-control="tour-play"]').click();
  await waitForTour(page, 'playing', 'live-update', 0);
  await waitForStableFrame(page);

  const timeline = ['beachgoer'];
  const framesPerStep: number[] = [];
  let previousFrame = await readFrame(page);

  for (let step = 1; step < 6; step += 1) {
    await waitForTour(page, 'playing', 'live-update', step);
    const frame = await waitForStableFrame(page);
    framesPerStep.push(frame - previousFrame);
    previousFrame = frame;
    timeline.push(await captionComponentId(page, names));
  }

  const stepTimes = await readTourStepTimes(page);
  const ordered = [1, 2, 3, 4, 5].map((step) => stepTimes.find((entry) => entry.step === step)?.t);
  if (ordered.some((time) => time === undefined)) {
    throw new Error('reduced tour cadence was not observed');
  }
  const intervalsMs = ordered.slice(1).map((time, index) => (time ?? 0) - (ordered[index] ?? 0));

  const tourMutations = await readReducedMutations(page);
  await page.screenshot({ path: join(outDir, 'screenshot-reduced-tour.png') });
  await page.locator('[data-engine-control="tour-stop"]').click();

  if (normalCadenceMs.length === 0) throw new Error('normal tour cadence was not measured');

  return {
    hover,
    focus,
    tour: {
      timeline,
      framesPerStep,
      intervalsMs,
      tweening: valuesFor(tourMutations, 'data-xploder-tweening'),
      pulse: valuesFor(tourMutations, 'data-xploder-pulse'),
    },
  };
}

async function sweepRegion(
  page: Page,
  options: SweepOptions,
): Promise<{ ids: string[]; points: SweepResult['points'] }> {
  const result = await sweepHitMap(page, options);
  return { ids: Object.keys(result.points), points: result.points };
}

async function stageOverflow(page: Page): Promise<number> {
  return page.locator(STAGE_SELECTOR).evaluate((stage) => stage.scrollHeight - stage.clientHeight);
}

async function scrollStage(page: Page, edge: 'top' | 'bottom'): Promise<void> {
  await page.locator(STAGE_SELECTOR).evaluate((stage, target) => {
    stage.scrollTop = target === 'top' ? 0 : stage.scrollHeight;
    stage.dispatchEvent(new Event('scroll'));
  }, edge);
  await waitForFrames(page);
}

async function captureScroll(page: Page, base: URL, outDir: string): Promise<ScrollObservation> {
  await gotoFixture(page, fixtureHref(base, 'a', 'exploded'));
  await waitForReady(page, 'exploded');
  await waitForSettledEmphasis(page);
  const zoomOneOverflow = await stageOverflow(page);
  const viewer = page.locator(VIEWER_SELECTOR);
  await viewer.focus();
  await pressMany(page, '+', 5);
  await page.waitForFunction(
    (selector) => {
      const stage = document.querySelector(selector);
      return stage instanceof HTMLElement && stage.scrollHeight - stage.clientHeight > 1;
    },
    STAGE_SELECTOR,
    { timeout: WAIT_TIMEOUT_MS },
  );
  await waitForFrames(page);
  const zoomedOverflow = await stageOverflow(page);
  const zoomedTo = await readNumberAttribute(page, 'data-xploder-zoom');
  const cameraBefore = await readCamera(page);

  await scrollStage(page, 'top');
  await clearPointer(page);
  const top = await sweepRegion(page, { ...DESKTOP_GRID, rowStart: 1, rowEnd: 9 });
  await page.screenshot({ path: join(outDir, 'screenshot-scroll-top.png') });

  await scrollStage(page, 'bottom');
  await clearPointer(page);
  const bottom = await sweepRegion(page, { ...DESKTOP_GRID, rowStart: 10, rowEnd: 24 });
  await page.screenshot({ path: join(outDir, 'screenshot-scroll-bottom.png') });
  const cameraAfter = await readCamera(page);

  return {
    zoomOneOverflow,
    zoomedOverflow,
    zoomedTo,
    topHits: top.ids,
    bottomHits: bottom.ids,
    cameraBefore,
    cameraAfter,
  };
}

async function captureCaptionAnchorSurface(
  page: Page,
  base: URL,
  viewport: 'desktop' | 'mobile',
  grid: SweepOptions,
  outDir: string,
): Promise<CaptionAnchorSample[]> {
  await gotoFixture(page, fixtureHref(base, 'c', 'exploded'));
  await waitForReady(page, 'exploded');
  await waitForSettledEmphasis(page);
  const map = await sweepHitMap(page, grid);
  await clearPointer(page);
  const samples: CaptionAnchorSample[] = [];

  for (let step = 0; step < PICKUP_READY_PATH.length; step += 1) {
    const target = PICKUP_READY_PATH[step];
    if (target === undefined) throw new Error('caption target is missing');
    await gotoFixture(page, fixtureHref(base, 'c', 'exploded', 'pickup-ready', 'paused', step));
    await waitForTour(page, 'paused', 'pickup-ready', step);
    const point = centralPoint(map.points[target], target);
    const caption = await page.locator(CAPTION_SELECTOR).boundingBox();
    if (caption === null) throw new Error('caption has no bounding box');
    const outside =
      point.x < caption.x ||
      point.x > caption.x + caption.width ||
      point.y < caption.y ||
      point.y > caption.y + caption.height;

    samples.push({
      viewport,
      step,
      target,
      point,
      caption: {
        left: caption.x,
        top: caption.y,
        right: caption.x + caption.width,
        bottom: caption.y + caption.height,
      },
      outside,
    });
  }

  await page.screenshot({ path: join(outDir, `screenshot-captionAnchor-${viewport}.png`) });
  return samples;
}

async function captureCaptionAnchor(
  desktop: Page,
  mobile: Page,
  base: URL,
  outDir: string,
): Promise<CaptionAnchorObservation> {
  const desktopSamples = await captureCaptionAnchorSurface(
    desktop,
    base,
    'desktop',
    CAPTION_DESKTOP_GRID,
    outDir,
  );
  const mobileSamples = await captureCaptionAnchorSurface(
    mobile,
    base,
    'mobile',
    CAPTION_MOBILE_GRID,
    outDir,
  );

  return { samples: [...desktopSamples, ...mobileSamples] };
}

async function captureDefaultGap(
  page: Page,
  base: URL,
  outDir: string,
): Promise<{
  observation: S6Observation['defaultGap'];
  pointsA: SweepResult['points'];
}> {
  const ids: Record<'a' | 'c', string[]> = { a: [], c: [] };
  let pointsA: SweepResult['points'] = {};

  for (const fixture of ['a', 'c'] as const) {
    await gotoFixture(page, fixtureHref(base, fixture, 'exploded'));
    await waitForReady(page, 'exploded');
    await waitForAzimuth(page, 45);
    await setTheme(page, 'light');
    await waitForSettledEmphasis(page);
    await waitForOverlay(page, 'exploded');
    const map = await sweepHitMap(page, DEFAULT_GAP_GRID);
    await clearPointer(page);
    ids[fixture] = Object.keys(map.points).sort();
    if (fixture === 'a') pointsA = map.points;
    await page.screenshot({ path: join(outDir, `screenshot-default-gap-${fixture}.png`) });
  }

  return { observation: { a: ids.a, c: ids.c }, pointsA };
}

async function capturePalette(
  page: Page,
  base: URL,
  point: PointObservation,
  pointsA: SweepResult['points'],
): Promise<S6Observation['palette']> {
  await gotoFixture(page, fixtureHref(base, 'a', 'exploded'));
  await waitForReady(page, 'exploded');
  await waitForAzimuth(page, 45);
  await waitForSettledEmphasis(page);
  await setTheme(page, 'light');

  return withOverlayHidden(page, async () => {
    const lightPaper = await readCssColor(page, '--bp-paper');
    const lightLine = await readCssColor(page, '--bp-line');
    const lightColumn = await readPixelColumn(page, point, SAMPLE_SCAN_PX + 1);
    const store = await readPixel(page, centralPoint(pointsA['tide-cache']));
    const service = await readPixel(page, centralPoint(pointsA['live-tide-client']));

    await setTheme(page, 'dark');
    const darkPaper = await readCssColor(page, '--bp-paper');
    const darkLine = await readCssColor(page, '--bp-line');
    const darkColumn = await readPixelColumn(page, point, SAMPLE_SCAN_PX + 1);

    return {
      light: {
        fill: lightColumn[0] ?? lightPaper,
        edgeScan: lightColumn.slice(1),
        paper: lightPaper,
        line: lightLine,
      },
      dark: {
        fill: darkColumn[0] ?? darkPaper,
        edgeScan: darkColumn.slice(1),
        paper: darkPaper,
        line: darkLine,
      },
      kinds: { store, service },
      toggle: {
        fill: darkColumn[0] ?? darkPaper,
        lightPaper,
        darkPaper,
      },
      osDarkFirstPaint: {
        background: lightPaper,
        fill: darkColumn[0] ?? darkPaper,
        lightPaper,
        darkPaper,
      },
    };
  });
}

async function captureOsDarkFirstPaint(
  page: Page,
  base: URL,
  point: PointObservation,
  palette: S6Observation['palette'],
  outDir: string,
): Promise<S6Observation['palette']['osDarkFirstPaint']> {
  await gotoFixture(page, fixtureHref(base, 'a', 'exploded'));
  await waitForReady(page, 'exploded');

  const screenshot = await withOverlayHidden(page, async () => {
    const image = await page.screenshot({
      path: join(outDir, 'screenshot-os-dark-first-paint.png'),
    });
    return image;
  });
  const [background = palette.toggle.darkPaper, fill = palette.toggle.darkPaper] =
    await readScreenshotPixels(page, screenshot, [{ x: 1, y: 1 }, point]);

  return {
    background,
    fill,
    lightPaper: palette.toggle.lightPaper,
    darkPaper: palette.toggle.darkPaper,
  };
}

async function captureOverlayDefaults(
  desktop: Page,
  mobile: Page,
  base: URL,
): Promise<OverlayDefaultObservation[]> {
  const samples: OverlayDefaultObservation[] = [];

  for (const [viewport, page] of [
    ['mobile', mobile],
    ['desktop', desktop],
  ] as const) {
    for (const fixture of ['a', 'b', 'c'] as const) {
      for (const state of ['imploded', 'exploded'] as const) {
        await gotoFixture(
          page,
          fixtureHref(base, fixture, state === 'exploded' ? 'exploded' : undefined),
        );
        await waitForReady(page, state);
        await setTheme(page, 'light');
        await waitForOverlay(page, state);
        samples.push(await readOverlayDefault(page, fixture, state, viewport));
      }
    }
  }

  return samples;
}

async function captureOverlay360(
  page: Page,
  base: URL,
  outDir: string,
): Promise<Overlay360Observation[]> {
  const samples: Overlay360Observation[] = [];

  for (const theme of ['light', 'dark'] as const) {
    for (const fixture of ['a', 'c'] as const) {
      for (const state of ['exploded', 'imploded'] as const) {
        await gotoFixture(
          page,
          fixtureHref(base, fixture, state === 'exploded' ? 'exploded' : undefined),
        );
        await waitForReady(page, state);
        await setTheme(page, theme);
        await waitForOverlay(page, state);
        samples.push(await readOverlay360(page, fixture, state, theme));
        await page.screenshot({
          path: join(outDir, `screenshot-overlay-360-${theme}-${fixture}-${state}.png`),
        });
      }
    }
  }

  return samples;
}

async function captureSelectable(page: Page, base: URL): Promise<S6Observation['selectable']> {
  await gotoFixture(page, fixtureHref(base, 'a', 'exploded'));
  await waitForReady(page, 'exploded');
  await setTheme(page, 'light');
  await waitForOverlay(page, 'exploded');
  const layer = await readSelection(page, '[data-xploder-label^="layer:"]');

  await gotoFixture(page, fixtureHref(base, 'a'));
  await waitForReady(page, 'imploded');
  await waitForOverlay(page, 'imploded');
  const title = await readSelection(page, '[data-xploder-titleblock-box] > div:nth-child(3)');

  return {
    userSelect: layer.userSelect,
    titleUserSelect: title.userSelect,
    layerText: layer.text,
    selectedLayerText: layer.selected,
    titleRowText: title.text,
    selectedTitleRowText: title.selected,
  };
}

async function captureColours(page: Page, base: URL): Promise<S6Observation['colours']> {
  const result: Partial<S6Observation['colours']> = {};

  for (const theme of ['light', 'dark'] as const) {
    await gotoFixture(page, fixtureHref(base, 'a', 'exploded'));
    await waitForReady(page, 'exploded');
    await setTheme(page, theme);
    await waitForOverlay(page, 'exploded');
    const labels = await readOverlayLabelColours(page);

    await gotoFixture(page, fixtureHref(base, 'a'));
    await waitForReady(page, 'imploded');
    await waitForOverlay(page, 'imploded');
    const title = await readOverlayTitleColour(page);
    result[theme] = { ...labels, title };
  }

  if (result.light === undefined || result.dark === undefined) {
    throw new Error('overlay colours are incomplete');
  }
  return { light: result.light, dark: result.dark };
}

async function exposedPoint(
  page: Page,
  points: readonly PointObservation[],
): Promise<PointObservation | null> {
  return page.evaluate(
    (candidates) => {
      return (
        candidates.find(({ x, y }) => {
          const element = document.elementFromPoint(x, y);
          return (
            element === null ||
            element.closest('[data-xploder-label],[data-xploder-titleblock-box]') === null
          );
        }) ?? null
      );
    },
    points.slice(0, 60),
  );
}

async function hoverExposedComponent(
  page: Page,
  points: SweepResult['points'],
): Promise<{ target: string; highlight: string | null; point: PointObservation }> {
  for (const [target, candidates] of Object.entries(points)) {
    for (const point of candidates.slice(0, 12)) {
      const exposed = await exposedPoint(page, [point]);
      if (exposed === null) continue;
      await page.mouse.move(exposed.x, exposed.y);
      await waitForFrames(page);
      const highlight = await readHighlight(page);
      if (highlight === target) return { target, highlight, point: exposed };
    }
  }

  throw new Error('overlay hit-through hover target was not found');
}

async function exposedComponentPoint(
  page: Page,
  points: SweepResult['points'],
): Promise<{ target: string; point: PointObservation }> {
  for (const [target, candidates] of Object.entries(points)) {
    const point = await exposedPoint(page, candidates);
    if (point !== null) return { target, point };
  }

  throw new Error('overlay hit-through touch target was not found');
}

async function captureHitThrough(
  desktop: Page,
  mobile: Page,
  base: URL,
  pointsA: SweepResult['points'],
): Promise<S6Observation['hitThrough']> {
  await gotoFixture(desktop, fixtureHref(base, 'a', 'exploded'));
  await waitForReady(desktop, 'exploded');
  await setTheme(desktop, 'light');
  await waitForOverlay(desktop, 'exploded');
  const hover = await hoverExposedComponent(desktop, pointsA);

  await gotoFixture(mobile, fixtureHref(base, 'a', 'exploded'));
  await waitForReady(mobile, 'exploded');
  await setTheme(mobile, 'light');
  await waitForOverlay(mobile, 'exploded');
  const map = await sweepHitMap(mobile, MOBILE_GRID);
  await clearPointer(mobile);
  const tap = await exposedComponentPoint(mobile, map.points);
  await tapAndWait(mobile, tap.point, tap.target);
  const tapHighlight = await readHighlight(mobile);

  const label = mobile.locator('[data-xploder-label^="layer:"]').first();
  const labelTarget = (await label.getAttribute('data-xploder-label')) ?? 'layer:missing';
  const labelBox = await label.boundingBox();
  if (labelBox === null) throw new Error('layer label has no bounding box');
  await mobile.touchscreen.tap(labelBox.x + labelBox.width / 2, labelBox.y + labelBox.height / 2);
  await waitForFrames(mobile);
  const afterLabelTap = await readHighlight(mobile);

  return {
    hoverTarget: hover.target,
    hoverHighlight: hover.highlight,
    tapTarget: tap.target,
    tapHighlight,
    labelTarget,
    afterLabelTap,
  };
}

async function captureTraceFlow(
  page: Page,
  base: URL,
  fixture: 'a' | 'c',
  flowId: string,
  outDir: string,
  screenshot: boolean,
): Promise<TraceFlowObservation> {
  await gotoFixture(page, fixtureHref(base, fixture, 'exploded', flowId, 'paused'));
  await waitForTour(page, 'paused', flowId, 0);
  const total = await tourTotal(page);
  const traces: string[] = [];

  for (let step = 0; step < total; step += 1) {
    await waitForTour(page, 'paused', flowId, step);
    traces.push(await readAttribute(page, 'data-xploder-trace'));

    if (step < total - 1) {
      await page.locator('[data-engine-control="tour-step"]').click();
    }
  }

  if (screenshot) {
    await page.screenshot({ path: join(outDir, `screenshot-trace-${fixture}.png`) });
  }

  await page.locator('[data-engine-control="tour-stop"]').click();
  await page.waitForSelector(
    `${VIEWER_SELECTOR}[data-xploder-tour="idle"][data-xploder-tour-step="-1"]`,
    { timeout: WAIT_TIMEOUT_MS },
  );

  return {
    fixture,
    flowId,
    traces,
    stopTrace: await readAttribute(page, 'data-xploder-trace'),
  };
}

async function captureTrace(
  page: Page,
  base: URL,
  outDir: string,
): Promise<S6Observation['trace']['flows']> {
  return [
    await captureTraceFlow(page, base, 'a', 'live-update', outDir, false),
    await captureTraceFlow(page, base, 'a', 'offline-read', outDir, true),
    await captureTraceFlow(page, base, 'c', 'pickup-ready', outDir, false),
    await captureTraceFlow(page, base, 'c', 'push-failed', outDir, true),
  ];
}

async function readReducedTraceSample(
  page: Page,
  step: number,
): Promise<{ step: number; trace: string; animations: number }> {
  return page.evaluate(
    ({ selector, expectedStep }) => {
      const viewer = document.querySelector(selector);
      const overlay = document.querySelector('[data-xploder-overlay]');
      if (!(viewer instanceof HTMLElement) || !(overlay instanceof HTMLElement)) {
        throw new Error('viewer or overlay is missing');
      }

      return {
        step: expectedStep,
        trace: viewer.dataset.xploderTrace ?? '',
        animations: overlay.getAnimations({ subtree: true }).length,
      };
    },
    { selector: VIEWER_SELECTOR, expectedStep: step },
  );
}

async function captureReducedTrace(
  page: Page,
  base: URL,
  outDir: string,
): Promise<S6Observation['trace']['reducedMotion']> {
  await gotoFixture(page, fixtureHref(base, 'a', 'exploded', 'live-update', 'paused'));
  await waitForTour(page, 'paused', 'live-update', 0);
  await page.locator('[data-engine-control="tour-play"]').click();
  await waitForTour(page, 'playing', 'live-update', 1);
  const first = await readReducedTraceSample(page, 1);
  await waitForTour(page, 'playing', 'live-update', 3);
  const second = await readReducedTraceSample(page, 3);
  await page.screenshot({ path: join(outDir, 'screenshot-rm-trace.png') });
  await page.locator('[data-engine-control="tour-stop"]').click();

  return { samples: [first, second] };
}

async function captureDrawCallsMidTour(page: Page, base: URL): Promise<number> {
  await gotoFixture(page, fixtureHref(base, 'a', 'exploded', 'live-update'));
  await waitForReady(page, 'exploded');
  await page.locator('[data-engine-control="tour-play"]').click();
  await waitForTour(page, 'playing', 'live-update', 1);
  const drawCalls = (await readFixture(page)).drawCalls;
  await page.locator('[data-engine-control="tour-stop"]').click();
  return drawCalls;
}

async function captureBlink(surface: Surface, base: URL): Promise<S6Observation['blink']> {
  const { page } = surface;
  const cdp = await surface.context.newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: BLINK_THROTTLE });
  await gotoFixture(page, fixtureHref(base, 'a'));
  await waitForReady(page, 'imploded');
  await waitForOverlay(page, 'imploded');

  let framesSampled = 0;
  let blinkFrames = 0;
  const stuckHiddenAfterSettle: S6Observation['blink']['stuckHiddenAfterSettle'] = [];

  for (let round = 0; round < BLINK_ROUNDS; round += 1) {
    const from = await readAttribute(page, 'data-xploder-state');
    const want = from === 'imploded' ? 'exploded' : 'imploded';
    await page.evaluate(() => {
      const target = window as unknown as BlinkWindow;
      target.__engineProbeBlinkSamples = [];
      target.__engineProbeBlinkRun = true;
      const overlay = document.querySelector('[data-xploder-overlay]');
      const viewer = document.querySelector('[data-xploder-state]');
      if (!(overlay instanceof HTMLElement) || !(viewer instanceof HTMLElement)) {
        throw new Error('viewer or overlay is missing');
      }

      const tick = () => {
        if (target.__engineProbeBlinkRun !== true) return;
        target.__engineProbeBlinkSamples?.push({
          t: performance.now(),
          phase: viewer.getAttribute('data-xploder-state'),
          attr: overlay.getAttribute('data-xploder-overlay'),
          opacity: Number.parseFloat(getComputedStyle(overlay).opacity),
          textElements: overlay.querySelectorAll(
            '[data-xploder-label],[data-xploder-titleblock-box]',
          ).length,
        });
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
    await page.evaluate(() => {
      const target = window as unknown as BlinkWindow;
      const button = document.querySelector('[data-engine-control="toggle"]');
      if (!(button instanceof HTMLElement)) throw new Error('toggle button is missing');
      target.__engineProbeBlinkClickAt = performance.now();
      button.click();
    });
    await page.waitForTimeout(BLINK_SETTLE_MS);
    const end = await page.locator('[data-xploder-overlay]').getAttribute('data-xploder-overlay');
    if (end !== 'shown') stuckHiddenAfterSettle.push({ round, to: want, end });

    const samples = await page.evaluate(() => {
      const target = window as unknown as BlinkWindow;
      target.__engineProbeBlinkRun = false;
      const clickAt = target.__engineProbeBlinkClickAt ?? 0;
      return (target.__engineProbeBlinkSamples ?? []).filter((sample) => sample.t >= clickAt);
    });

    let reached = false;
    for (const sample of samples) {
      framesSampled += 1;
      if (sample.phase === want) reached = true;
      if (!reached && sample.opacity > BLINK_OPACITY_THRESHOLD && sample.textElements > 0) {
        blinkFrames += 1;
      }
    }
  }

  return {
    throttle: BLINK_THROTTLE,
    rounds: BLINK_ROUNDS,
    framesSampled,
    blinkFrames,
    stuckHiddenAfterSettle,
  };
}

async function captureS6(
  desktop: Page,
  mobile: Page,
  reducedPage: Page,
  narrow: Page,
  osDarkPage: Page,
  blinkSurface: Surface,
  base: URL,
  outDir: string,
): Promise<S6Observation> {
  setClsGroup(desktop, 's6-default-gap');
  const defaultGap = await captureDefaultGap(desktop, base, outDir);
  await finishClsGroup(desktop);

  setClsGroup(desktop, 's6-palette-light');
  const fillPoint = centralPoint(defaultGap.pointsA['tide-chart-screen']);
  const palette = await capturePalette(desktop, base, fillPoint, defaultGap.pointsA);
  await finishClsGroup(desktop);

  setClsGroup(osDarkPage, 's6-os-dark-first-paint');
  const osDarkFirstPaint = await captureOsDarkFirstPaint(
    osDarkPage,
    base,
    fillPoint,
    palette,
    outDir,
  );
  await finishClsGroup(osDarkPage);
  palette.osDarkFirstPaint = osDarkFirstPaint;

  setClsGroup(desktop, 's6-overlay-default');
  setClsGroup(mobile, 's6-overlay-default');
  const overlayDefaults = await captureOverlayDefaults(desktop, mobile, base);
  await finishClsGroup(desktop);
  await finishClsGroup(mobile);

  setClsGroup(narrow, 's6-overlay-360');
  const overlay360 = await captureOverlay360(narrow, base, outDir);
  await finishClsGroup(narrow);

  setClsGroup(desktop, 's6-selectable');
  const selectable = await captureSelectable(desktop, base);
  await finishClsGroup(desktop);

  setClsGroup(desktop, 's6-colours');
  const colours = await captureColours(desktop, base);
  await finishClsGroup(desktop);

  setClsGroup(desktop, 's6-hit-through');
  setClsGroup(mobile, 's6-hit-through');
  const hitThrough = await captureHitThrough(desktop, mobile, base, defaultGap.pointsA);
  await finishClsGroup(desktop);
  await finishClsGroup(mobile);

  setClsGroup(desktop, 's6-trace');
  const traceFlows = await captureTrace(desktop, base, outDir);
  await finishClsGroup(desktop);

  setClsGroup(reducedPage, 's6-reduced-trace');
  const reducedTrace = await captureReducedTrace(reducedPage, base, outDir);
  await finishClsGroup(reducedPage);

  setClsGroup(desktop, 's6-draw-calls');
  const drawCallsMidTour = await captureDrawCallsMidTour(desktop, base);
  await finishClsGroup(desktop);

  setClsGroup(blinkSurface.page, 's6-no-blink');
  const blink = await captureBlink(blinkSurface, base);
  await finishClsGroup(blinkSurface.page);

  const s6Pages = [desktop, mobile, reducedPage, narrow, osDarkPage, blinkSurface.page];
  const entries = s6Pages.flatMap((page) => {
    const capture = clsCaptures.get(page);
    if (capture === undefined) return [];

    return [
      ...capture.entries.filter((entry) => entry.group.startsWith('s6-')),
      ...capture.loadEntries,
    ];
  });

  return {
    palette,
    overlayDefaults,
    overlay360,
    selectable,
    colours,
    hitThrough,
    cls: { total: totalLayoutShift(entries), entries },
    trace: { flows: traceFlows, reducedMotion: reducedTrace },
    defaultGap: defaultGap.observation,
    drawCallsMidTour,
    blink,
  };
}

async function openSurface(
  browser: Browser,
  options: BrowserContextOptions,
  pageName: LayoutShiftObservation['page'],
): Promise<Surface> {
  const context = await browser.newContext(options);
  const page = await context.newPage();
  page.setDefaultTimeout(WAIT_TIMEOUT_MS);
  await installClsCapture(page, pageName);
  return { context, page };
}

async function captureS5(
  desktop: Page,
  mobile: Page,
  reducedPage: Page,
  base: URL,
  outDir: string,
): Promise<S5Observation> {
  setClsGroup(desktop, 'hitMap');
  const hitMap = await captureHitMap(desktop, base, outDir);
  await finishClsGroup(desktop);
  setClsGroup(desktop, 'hover');
  const hover = await captureHover(desktop, base, hitMap, outDir);
  await finishClsGroup(desktop);
  setClsGroup(mobile, 'touch');
  const touch = await captureTouch(mobile, base, outDir);
  await finishClsGroup(mobile);
  setClsGroup(desktop, 'focus');
  const focus = await captureFocus(desktop, base, hitMap, outDir);
  await finishClsGroup(desktop);
  setClsGroup(desktop, 'tour');
  const tour = await captureTour(desktop, base, outDir);
  await finishClsGroup(desktop);
  setClsGroup(desktop, 'selector');
  const selector = await captureSelector(desktop, base);
  await finishClsGroup(desktop);
  setClsGroup(desktop, 'caption');
  const caption = await captureCaption(desktop, base, outDir);
  await finishClsGroup(desktop);
  setClsGroup(reducedPage, 'reduced-motion');
  const reduced = await captureReduced(reducedPage, base, hitMap, tour.normalCadenceMs, outDir);
  await finishClsGroup(reducedPage);
  setClsGroup(desktop, 'scroll');
  const scroll = await captureScroll(desktop, base, outDir);
  await finishClsGroup(desktop);
  setClsGroup(desktop, 'captionAnchor');
  setClsGroup(mobile, 'captionAnchor');
  const captionAnchor = await captureCaptionAnchor(desktop, mobile, base, outDir);
  await finishClsGroup(desktop);
  await finishClsGroup(mobile);
  const cls = collectCls([desktop, mobile, reducedPage]);
  const clsLoad = collectClsLoad([desktop, mobile, reducedPage]);

  return {
    hitMap,
    hover,
    touch,
    cls,
    clsLoad,
    focus,
    tour,
    selector,
    caption,
    reduced,
    scroll,
    captionAnchor,
  };
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
      scope: { type: 'string' },
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
  if (
    values.scope !== undefined &&
    values.scope !== 's4' &&
    values.scope !== 's5' &&
    values.scope !== 's6' &&
    values.scope !== 'all'
  ) {
    throw new CliError(EXIT.USAGE, '--scope must be s4, s5, s6, or all');
  }

  const scope = (values.scope ?? 'all') as ProbeScope;
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
  let report: EngineProbeReport;
  try {
    const chromium = chromiumVersion(browser);
    const desktop = await openSurface(browser, desktopOptions(), 'desktop');
    const reduced = await openSurface(browser, reducedOptions(), 'reduced');
    const surfaces: Surface[] = [desktop, reduced];
    let s4: S4Observation | undefined;
    let s5: S5Observation | undefined;
    let s6: S6Observation | undefined;
    let mobile: Surface | undefined;

    try {
      if (scope === 's4' || scope === 'all') {
        s4 = await captureS4(desktop.page, reduced.page, base, outDir);
      }
      if (scope === 's5' || scope === 'all' || scope === 's6') {
        mobile = await openSurface(browser, mobileOptions(), 'mobile');
        surfaces.push(mobile);
      }
      if (scope === 's5' || scope === 'all') {
        if (mobile === undefined) throw new Error('mobile surface is unavailable');
        s5 = await captureS5(desktop.page, mobile.page, reduced.page, base, outDir);
      }
      if (scope === 's6' || scope === 'all') {
        if (mobile === undefined) throw new Error('mobile surface is unavailable');
        const narrow = await openSurface(browser, narrowOptions(), 'mobile');
        const osDark = await openSurface(browser, osDarkOptions(), 'desktop');
        const blink = await openSurface(browser, pixelOptions(), 'mobile');
        surfaces.push(narrow, osDark, blink);
        s6 = await captureS6(
          desktop.page,
          mobile.page,
          reduced.page,
          narrow.page,
          osDark.page,
          blink,
          base,
          outDir,
        );
      }
    } finally {
      await Promise.all(surfaces.map((surface) => surface.context.close()));
    }

    const observation = {
      ...(s4 ?? {}),
      ...(s5 === undefined ? {} : { s5 }),
      ...(s6 === undefined ? {} : { s6 }),
    };
    const evaluation = evaluateProbe(observation, scope);
    report = {
      kind: 'engine-probe',
      version: 1,
      url: base.href,
      chromium,
      ...observation,
      ...evaluation,
    };
    const artifact = join(outDir, 'engine-probe.json');
    await writeFile(artifact, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
    if (s5 !== undefined) {
      await writeFile(
        join(outDir, 'touch-trace.json'),
        `${JSON.stringify(s5.touch.trace, null, 2)}\n`,
        'utf8',
      );
    }
    printEvaluation(evaluation);
    console.log(`engine-probe.json: ${artifact}`);
    return evaluation.pass ? EXIT.OK : EXIT.BUDGET;
  } catch (error) {
    if (error instanceof CliError) throw error;
    const detail = error instanceof Error ? error.message : String(error);
    throw new CliError(EXIT.BROWSER, `engine probe failed: ${detail}`);
  } finally {
    await browser.close();
  }
}

await run(main);
