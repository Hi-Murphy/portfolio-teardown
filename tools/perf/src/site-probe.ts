import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { JSDOM } from 'jsdom';
import type { Browser, BrowserContext, BrowserContextOptions, Page } from 'playwright';

import { siteSource } from '../../../apps/web/content/site.source.ts';
import { evaluateTabWalk, type FocusStep } from './a11y-probe.ts';
import { chromiumVersion, launch } from './browser.ts';
import { CliError, EXIT } from './exit-codes.ts';
import { PROJECT_SOURCES, projectOutlinePath, projectPath } from './project-sources.ts';

export const SITE_PROBE_GROUPS = [
  'drill',
  'hero',
  'cls',
  'reduced-motion',
  'nojs',
  'routes',
  'draws',
  'teardown',
] as const;

export type SiteProbeGroup = (typeof SITE_PROBE_GROUPS)[number];
export const SITE_PROBE_CI_GROUPS = [
  'drill',
  'cls',
  'routes',
  'nojs',
  'reduced-motion',
  'teardown',
] as const satisfies readonly SiteProbeGroup[];

type Palette = 'light' | 'dark';
type ViewportName = 'desktop' | 'mobile';

export interface ClsRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ClsSource {
  node: {
    tag: string;
    dataAttributes: Record<string, string>;
    parentTag: string | null;
    text: string | null;
  } | null;
  previousRect: ClsRect | null;
  currentRect: ClsRect | null;
}

export interface ClsEntry {
  value: number;
  startTime: number;
  hadRecentInput: boolean;
  sources: ClsSource[];
}

export interface ClsVerdict {
  total: number;
  pass: boolean;
  sources: ClsSource[];
}

export interface DrawFrame {
  readonly draws: number;
  readonly time?: number;
}

export interface DrawVerdict {
  readonly pass: boolean;
  readonly mode: number | null;
  readonly modeCount: number;
  readonly renderedFrames: number;
  readonly totalFrames: number;
  readonly counts: Readonly<Record<string, number>>;
}

export interface HtmlFallbackVerdict {
  readonly pass: boolean;
  readonly poster: boolean;
  readonly list: boolean;
  readonly listKind: 'cards' | 'outline';
}

export type HeroLiveMode = 'eager' | 'gated';

export interface HeroEagerNoInteractionState {
  readonly liveState: string | null;
  readonly canvases: number;
  readonly ready: boolean;
}

export interface HeroLoopRunningState {
  readonly heroLoop: string | null;
  readonly canvases: number;
  readonly tour: string | null;
}

export interface SiteProbeCheck {
  readonly name: string;
  readonly pass: boolean;
  readonly expected: unknown;
  readonly actual: unknown;
}

export interface SiteProbeGroupResult {
  readonly group: SiteProbeGroup;
  readonly pass: boolean;
  readonly checks: readonly SiteProbeCheck[];
  readonly data?: unknown;
  readonly lines: readonly string[];
}

interface Viewport {
  readonly name: ViewportName;
  readonly width: number;
  readonly height: number;
  readonly isMobile: boolean;
  readonly hasTouch: boolean;
}

interface ProbeRoute {
  readonly label: string;
  readonly path: string;
  readonly base: 'site' | 'fixtures';
  readonly hasViewer: boolean;
}

export interface ClsCell extends ClsVerdict {
  readonly route: string;
  readonly viewport: ViewportName;
  readonly palette: Palette;
  readonly entries: ClsEntry[];
}

export interface SiteProbeClsReport {
  readonly kind: 'site-probe-cls';
  readonly version: 1;
  readonly baseUrl: string;
  readonly chromium: string;
  readonly cells: ClsCell[];
  readonly pass: boolean;
}

export interface SiteProbeReport {
  readonly kind: 'site-probe';
  readonly version: 2;
  readonly baseUrl: string;
  readonly chromium: string;
  readonly groups: SiteProbeGroupResult[];
  readonly pass: boolean;
}

export interface SiteProbeOptions {
  readonly siteBase?: URL;
  readonly fixturesBase?: URL;
  readonly siteDir?: string;
  readonly outDir: string;
  readonly groups: readonly SiteProbeGroup[];
}

interface ClsWindow {
  __siteProbeCls?: {
    entries: ClsEntry[];
    ready: boolean;
    readyAt: number | null;
  };
}

interface PaintWindow {
  __siteProbePaint?: {
    fcpAt: number | null;
    loadAt: number | null;
    liveStateAtFcp: string | null;
    liveStateAtLoad: string | null;
  };
}

interface DrawWindow {
  __siteProbeDraws?: {
    frames: DrawFrame[];
    currentTime: number | null;
    currentFrame: { time: number; draws: number } | null;
  };
}

interface ReducedWindow {
  __siteProbeReduced?: {
    phases: string[];
    tweening: string[];
  };
}

interface DrillTabStep extends FocusStep {
  readonly tag: string;
  readonly href: string | null;
}

const SITE_ROUTES: readonly Omit<ProbeRoute, 'base'>[] = [
  { label: '/', path: '/', hasViewer: true },
  { label: '/projects', path: '/projects', hasViewer: false },
  ...PROJECT_SOURCES.map((source) => ({
    label: projectPath(source),
    path: projectPath(source),
    hasViewer: true,
  })),
];
const FIXTURE_ROUTE: Omit<ProbeRoute, 'base'> = {
  label: '/dev/engine?fixture=a',
  path: '/dev/engine?fixture=a',
  hasViewer: true,
};
const VIEWPORTS: readonly Viewport[] = [
  { name: 'desktop', width: 1280, height: 800, isMobile: false, hasTouch: false },
  { name: 'mobile', width: 412, height: 823, isMobile: true, hasTouch: true },
] as const;
const PALETTES: readonly Palette[] = ['light', 'dark'] as const;
const WAIT_TIMEOUT_MS = 30_000;
const SETTLE_MS = 3000;
const POSTER_SCAN_MS = 4000;
const IDLE_SCAN_MS = 5000;
const HYDRATION_DELAY_MS = 250;
const MIN_RENDERED_FRAMES = 30;
const EXPECTED_DRAW_CALLS = 2;
const EXPECTED_NAV_KEYS = [
  'nav:home',
  'nav:projects',
  'nav:about',
  'nav:contact',
  'nav:github',
  'nav:linkedin',
  'nav:theme',
] as const;
const PANEL_READY_SELECTOR = '[data-xploder-ready="true"][data-xploder-panel-ready="true"]';
const MAX_TABS_TO_PROXY = 16;
const TOUR_TIMEOUT_BASE_MS = 15_000;
const TOUR_STEP_BUDGET_MS = 4_000;
const LIVE_LAYERS_PANEL_SELECTOR =
  '[data-site-explore-live] > [data-site-explore] [data-site-layers-panel]';
const LIVE_LAYER_CHIP_SELECTOR =
  '[data-site-explore-live] > [data-site-explore] [data-site-layer-chip]';
const LIVE_LAYER_PARTS_SELECTOR =
  '[data-site-explore-live] > [data-site-explore] [data-site-layer-parts] li';
const LIVE_FLOWS_PANEL_SELECTOR =
  '[data-site-explore-live] > [data-site-explore] [data-site-explore-panel="flows"]';

export interface OutlineCounts {
  readonly present: boolean;
  readonly layers: number;
  readonly components: number;
  readonly flows: number;
}

export interface TeardownCounts {
  readonly layers: number;
  readonly components: number;
  readonly flows: number;
}

export interface TeardownSource {
  readonly layers: readonly { readonly components: readonly unknown[] }[];
  readonly flows: readonly unknown[];
}

export interface TeardownTourResult {
  readonly ended: boolean;
  readonly elapsedMs: number;
  readonly timeoutMs: number;
  readonly position: string | null;
  readonly state: string | null;
}

export function evaluateCls(entries: readonly ClsEntry[]): ClsVerdict {
  const total = entries.reduce((sum, entry) => sum + entry.value, 0);

  return {
    total,
    pass: total === 0,
    sources: entries.flatMap((entry) => entry.sources),
  };
}

export function evaluateDrawFrames(
  frames: readonly DrawFrame[],
  expected = EXPECTED_DRAW_CALLS,
  minimumFrames = MIN_RENDERED_FRAMES,
): DrawVerdict {
  const counts = new Map<number, number>();
  let renderedFrames = 0;

  for (const frame of frames) {
    if (frame.draws <= 0) continue;
    renderedFrames += 1;
    counts.set(frame.draws, (counts.get(frame.draws) ?? 0) + 1);
  }

  const ranked = [...counts.entries()].sort(
    ([leftValue, leftCount], [rightValue, rightCount]) =>
      rightCount - leftCount || leftValue - rightValue,
  );
  const winner = ranked[0];
  const mode = winner?.[0] ?? null;
  const modeCount = winner?.[1] ?? 0;

  return {
    pass: renderedFrames >= minimumFrames && mode === expected,
    mode,
    modeCount,
    renderedFrames,
    totalFrames: frames.length,
    counts: Object.fromEntries(ranked.map(([value, count]) => [String(value), count])),
  };
}

export function evaluateFallbackHtml(
  html: string,
  listKind: 'cards' | 'outline',
): HtmlFallbackVerdict {
  const poster = /<svg\b[^>]*\bdata-site-poster\b/i.test(html);
  const list =
    listKind === 'cards'
      ? /<article\b[^>]*\bdata-site-card\s*=/i.test(html)
      : /<section\b[^>]*\bdata-site-outline\b/i.test(html);

  return { pass: poster && list, poster, list, listKind };
}

export function heroContainsPoster(html: string): boolean {
  const hero = /<section\b[^>]*\bdata-site-hero\b[^>]*>([\s\S]*?)<\/section>/i.exec(html);
  return hero !== null && /<svg\b[^>]*\bdata-site-poster\b/i.test(hero[1] ?? '');
}

export function parseHeroLiveMode(value: string | null | undefined): HeroLiveMode | null {
  return value === 'eager' || value === 'gated' ? value : null;
}

export function evaluateHeroEagerNoInteraction(state: HeroEagerNoInteractionState): boolean {
  return state.liveState === 'revealed' && state.canvases === 1 && state.ready;
}

export function evaluateHeroLoopRunning(state: HeroLoopRunningState): boolean {
  const validTour =
    state.tour === null || ['idle', 'playing', 'paused', 'ended'].includes(state.tour);

  return state.heroLoop === 'running' && state.canvases === 1 && validTour;
}

export function outlineCountsFromHtml(html: string): OutlineCounts {
  const dom = new JSDOM(html);

  try {
    const outline = dom.window.document.querySelector('[data-site-outline]');
    if (outline === null) {
      return { present: false, layers: 0, components: 0, flows: 0 };
    }

    const layerSections = [...outline.querySelectorAll('section')].filter((section) => {
      const children = [...section.children];
      return (
        children.some((child) => child.tagName === 'H3') &&
        children.some((child) => child.tagName === 'UL')
      );
    });
    const components = layerSections.reduce((total, section) => {
      const list = [...section.children].find((child) => child.tagName === 'UL');
      return total + (list?.querySelectorAll(':scope > li').length ?? 0);
    }, 0);

    return {
      present: true,
      layers: layerSections.length,
      components,
      flows: outline.querySelectorAll('ol > li').length,
    };
  } finally {
    dom.window.close();
  }
}

export function expectedTeardownCounts(source: TeardownSource): TeardownCounts {
  return {
    layers: source.layers.length,
    components: source.layers.reduce((total, layer) => total + layer.components.length, 0),
    flows: source.flows.length,
  };
}

export function teardownCountsMatch(actual: TeardownCounts, expected: TeardownCounts): boolean {
  return (
    actual.layers === expected.layers &&
    actual.components === expected.components &&
    actual.flows === expected.flows
  );
}

export function tourTimeoutMs(pathLength: number): number {
  if (!Number.isInteger(pathLength) || pathLength < 0) {
    throw new RangeError('tour path length must be a non-negative integer');
  }

  return TOUR_TIMEOUT_BASE_MS + TOUR_STEP_BUDGET_MS * pathLength;
}

export function clsRoutes(siteBase?: URL, fixturesBase?: URL): ProbeRoute[] {
  return [
    ...(siteBase === undefined
      ? []
      : SITE_ROUTES.map((route) => ({ ...route, base: 'site' as const }))),
    ...(fixturesBase === undefined ? [] : [{ ...FIXTURE_ROUTE, base: 'fixtures' as const }]),
  ];
}

function check(name: string, pass: boolean, expected: unknown, actual: unknown): SiteProbeCheck {
  return { name, pass, expected, actual };
}

function sameStrings(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function groupResult(
  group: SiteProbeGroup,
  checks: readonly SiteProbeCheck[],
  data?: unknown,
): SiteProbeGroupResult {
  return {
    group,
    pass: checks.every((entry) => entry.pass),
    checks,
    ...(data === undefined ? {} : { data }),
    lines: [],
  };
}

async function routeIsAvailable(url: URL): Promise<boolean> {
  let response: Response;

  try {
    response = await fetch(url, {
      method: 'HEAD',
      redirect: 'follow',
      signal: AbortSignal.timeout(WAIT_TIMEOUT_MS),
    });
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new CliError(EXIT.UNREACHABLE, `unreachable: ${url.href}: ${detail}`);
  }

  await response.body?.cancel().catch(() => undefined);

  if (response.status >= 500) {
    throw new CliError(
      EXIT.UNREACHABLE,
      `unreachable: ${url.href} returned HTTP ${response.status}`,
    );
  }

  return response.status < 400;
}

async function availableRoutes(routes: readonly ProbeRoute[], options: SiteProbeOptions) {
  const available: ProbeRoute[] = [];

  for (const route of routes) {
    const base = route.base === 'site' ? options.siteBase : options.fixturesBase;
    if (base === undefined) throw new Error(`missing ${route.base} base URL`);

    const present = await routeIsAvailable(new URL(route.path, base));
    if (present || route.base === 'fixtures') available.push(route);
  }

  return available;
}

function contextOptions(palette: Palette, viewport: Viewport): BrowserContextOptions {
  return {
    viewport: { width: viewport.width, height: viewport.height },
    deviceScaleFactor: 1,
    isMobile: viewport.isMobile,
    hasTouch: viewport.hasTouch,
    colorScheme: palette,
  };
}

async function installClsObserver(page: Page, hasViewer: boolean): Promise<void> {
  await page.addInitScript((viewerExpected: boolean) => {
    const target = window as unknown as ClsWindow;
    const state = {
      entries: [] as ClsEntry[],
      ready: false,
      readyAt: null as number | null,
    };
    target.__siteProbeCls = state;

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
      };
    };
    const rect = (value: DOMRectReadOnly | undefined) =>
      value === undefined
        ? null
        : { x: value.x, y: value.y, width: value.width, height: value.height };
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
        state.entries.push({
          value: item.value,
          startTime: item.startTime,
          hadRecentInput: item.hadRecentInput === true,
          sources: (item.sources ?? []).map((source) => ({
            node: describe(source.node),
            previousRect: rect(source.previousRect),
            currentRect: rect(source.currentRect),
          })),
        });
      }
    });

    observer.observe({ type: 'layout-shift', buffered: true });

    const markReady = () => {
      if (state.ready) return;
      state.ready = true;
      state.readyAt = performance.now();
    };

    if (!viewerExpected) {
      if (document.readyState === 'complete') markReady();
      else window.addEventListener('load', markReady, { once: true });
      return;
    }

    const checkViewer = () => {
      if (document.querySelector('[data-xploder-ready="true"]') !== null) markReady();
    };
    const readyObserver = new MutationObserver(checkViewer);
    readyObserver.observe(document, {
      attributes: true,
      subtree: true,
      attributeFilter: ['data-xploder-ready'],
    });
    checkViewer();
  }, hasViewer);
}

async function installPaintObserver(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const target = window as unknown as PaintWindow;
    const state = {
      fcpAt: null as number | null,
      loadAt: null as number | null,
      liveStateAtFcp: null as string | null,
      liveStateAtLoad: null as string | null,
    };
    target.__siteProbePaint = state;

    const liveState = () =>
      document.querySelector('[data-site-live]')?.getAttribute('data-site-live-state') ?? null;
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.name !== 'first-contentful-paint' || state.fcpAt !== null) continue;
        state.fcpAt = entry.startTime;
        state.liveStateAtFcp = liveState();
      }
    });

    observer.observe({ type: 'paint', buffered: true });
    window.addEventListener(
      'load',
      () => {
        state.loadAt = performance.now();
        state.liveStateAtLoad = liveState();
      },
      { once: true },
    );
  });
}

async function installDrawCounter(context: BrowserContext): Promise<void> {
  await context.addInitScript(() => {
    const target = window as unknown as DrawWindow;
    const state = {
      frames: [] as DrawFrame[],
      currentTime: null as number | null,
      currentFrame: null as { time: number; draws: number } | null,
    };
    target.__siteProbeDraws = state;

    const bucket = (time: number) => {
      if (state.currentFrame === null || state.currentTime !== time) {
        state.currentTime = time;
        state.currentFrame = { time, draws: 0 };
        state.frames.push(state.currentFrame);
      }
      return state.currentFrame;
    };
    const prototype = WebGL2RenderingContext.prototype as unknown as Record<
      string,
      (...args: unknown[]) => unknown
    >;

    for (const name of [
      'drawElements',
      'drawArrays',
      'drawElementsInstanced',
      'drawArraysInstanced',
    ]) {
      const original = prototype[name];
      if (typeof original !== 'function') continue;

      prototype[name] = function (this: WebGL2RenderingContext, ...args: unknown[]) {
        const frame = state.currentFrame ?? bucket(performance.now());
        frame.draws += 1;
        return original.apply(this, args);
      };
    }

    const requestFrame = window.requestAnimationFrame.bind(window);
    window.requestAnimationFrame = (callback: FrameRequestCallback): number =>
      requestFrame((time) => {
        bucket(time);
        return callback(time);
      });
  });
}

async function navigatePage(page: Page, url: URL, allowHttpError = false): Promise<Page> {
  let response;

  try {
    response = await page.goto(url.href, { waitUntil: 'load', timeout: WAIT_TIMEOUT_MS });
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new CliError(EXIT.UNREACHABLE, `unreachable: ${url.href}: ${detail}`);
  }

  if (!allowHttpError && (response === null || response.status() >= 400)) {
    throw new CliError(
      EXIT.UNREACHABLE,
      `unreachable: ${url.href} returned HTTP ${response?.status() ?? 'no response'}`,
    );
  }

  return page;
}

async function openPage(context: BrowserContext, url: URL, allowHttpError = false): Promise<Page> {
  return await navigatePage(await context.newPage(), url, allowHttpError);
}

async function waitForHydration(page: Page): Promise<void> {
  await page.locator('button[aria-label^="Switch to "]').waitFor({
    state: 'visible',
    timeout: WAIT_TIMEOUT_MS,
  });
}

async function waitForViewerReady(page: Page): Promise<void> {
  await page.locator('[data-xploder-ready="true"]').waitFor({
    state: 'visible',
    timeout: WAIT_TIMEOUT_MS,
  });
  await page.evaluate(async () => {
    await document.fonts.ready;
  });
  await page.waitForFunction(
    () => {
      const viewer = document.querySelector('[data-xploder-ready="true"]');
      return (
        viewer?.getAttribute('data-xploder-state') === 'exploded' &&
        viewer.getAttribute('data-xploder-tweening') === 'false'
      );
    },
    undefined,
    { timeout: WAIT_TIMEOUT_MS },
  );
}

async function activateHomeLive(page: Page): Promise<void> {
  await waitForHydration(page);
  await page.mouse.move(16, 16);
  await page.waitForFunction(
    () =>
      document.querySelector('[data-site-live]')?.getAttribute('data-site-live-state') ===
      'revealed',
    undefined,
    { timeout: WAIT_TIMEOUT_MS },
  );
  await waitForViewerReady(page);
}

async function activateProjectViewer(page: Page): Promise<void> {
  await waitForHydration(page);
  const control = page.locator('[data-site-control="explore-3d"]');
  await control.waitFor({ state: 'visible', timeout: WAIT_TIMEOUT_MS });
  await control.click({ timeout: WAIT_TIMEOUT_MS });
  await waitForViewerReady(page);
}

async function probeCell(
  page: Page,
  palette: Palette,
  viewport: Viewport,
  route: ProbeRoute,
  url: URL,
): Promise<ClsCell> {
  await installClsObserver(page, route.hasViewer);
  await page.route(/\/_next\/static\/.*\.js(?:\?.*)?$/, async (request) => {
    await new Promise<void>((resolveDelay) => setTimeout(resolveDelay, HYDRATION_DELAY_MS));
    await request.continue();
  });

  await navigatePage(page, url);

  if (route.base === 'site' && route.path === '/') {
    await activateHomeLive(page);
  } else if (route.base === 'site' && route.path.startsWith('/projects/')) {
    await activateProjectViewer(page);
  }

  try {
    await page.waitForFunction(
      () => (window as unknown as ClsWindow).__siteProbeCls?.ready === true,
      undefined,
      { timeout: WAIT_TIMEOUT_MS },
    );
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new CliError(EXIT.UNREACHABLE, `readiness timeout: ${url.href}: ${detail}`);
  }

  await page.waitForTimeout(SETTLE_MS);
  const entries = await page.evaluate(
    () => (window as unknown as ClsWindow).__siteProbeCls?.entries ?? [],
  );
  const verdict = evaluateCls(entries);

  return {
    route: route.label,
    viewport: viewport.name,
    palette,
    ...verdict,
    entries,
  };
}

function formatTotal(total: number): string {
  return total.toFixed(6);
}

async function runClsGroup(
  browser: Browser,
  options: SiteProbeOptions,
  browserVersion: string,
): Promise<SiteProbeGroupResult> {
  const routes = await availableRoutes(clsRoutes(options.siteBase, options.fixturesBase), options);
  const cells: ClsCell[] = [];

  for (const viewport of VIEWPORTS) {
    for (const palette of PALETTES) {
      for (const route of routes) {
        const base = route.base === 'site' ? options.siteBase : options.fixturesBase;
        if (base === undefined) throw new Error(`missing ${route.base} base URL`);

        const context = await browser.newContext(contextOptions(palette, viewport));
        try {
          const page = await context.newPage();
          const cell = await probeCell(page, palette, viewport, route, new URL(route.path, base));
          cells.push(cell);
          console.log(
            `cls ${cell.route} ${cell.viewport} ${cell.palette} total=${formatTotal(cell.total)} ${cell.pass ? 'PASS' : 'FAIL'}`,
          );
        } finally {
          await context.close();
        }
      }
    }
  }

  const report: SiteProbeClsReport = {
    kind: 'site-probe-cls',
    version: 1,
    baseUrl: (options.siteBase ?? options.fixturesBase)?.href ?? '',
    chromium: browserVersion,
    cells,
    pass: cells.every((cell) => cell.pass),
  };
  const checks = cells.map((cell) =>
    check(`cls-${cell.route}-${cell.viewport}-${cell.palette}`, cell.pass, 0, {
      total: cell.total,
      sources: cell.sources,
    }),
  );

  return groupResult('cls', checks, report);
}

async function readActiveTab(page: Page): Promise<DrillTabStep | null> {
  return await page.evaluate(() => {
    const element = document.activeElement;
    if (!(element instanceof HTMLElement) || element === document.body) return null;

    const text = (element.innerText || element.textContent || '').replace(/\s+/g, ' ').trim();
    const aria = element.getAttribute('aria-label');
    const name = (aria ?? text).slice(0, 160);
    const nav = element.closest('nav[aria-label="Primary"]');
    const hero = element.closest('[data-site-hero]');
    const card = element.closest('[data-site-card]');
    const footer = element.closest('footer');
    const href = element.getAttribute('href');

    const key = (() => {
      if (element.getAttribute('href') === '#main' && /skip/i.test(name)) return 'skip';
      if (nav !== null) {
        if (element.tagName === 'BUTTON' && aria?.startsWith('Switch to ')) return 'nav:theme';
        if (href === '/') return 'nav:home';
        if (href === '/projects') return 'nav:projects';
        if (href === '/#about') return 'nav:about';
        if (href === '/#contact') return 'nav:contact';
        if (aria === 'GitHub') return 'nav:github';
        if (aria === 'LinkedIn') return 'nav:linkedin';
      }
      if (hero !== null && element.closest('[data-hero-loop-slot]') !== null) {
        if (element.tagName === 'BUTTON') return 'hero:pause';
      }
      if (hero !== null && element.tagName === 'A') {
        const links = [...hero.querySelectorAll<HTMLAnchorElement>('a[href]')];
        return links.indexOf(element as HTMLAnchorElement) === 0
          ? 'hero:primary'
          : 'hero:secondary';
      }
      if (card !== null) return `card:${card.getAttribute('data-site-card') ?? 'unknown'}`;
      const contact = element.closest('[data-home-section="contact"]');
      if (contact !== null && element.tagName === 'A') {
        if (href?.startsWith('mailto:')) return 'contact:email';
        if (/github/i.test(name) || /github\.com/i.test(href ?? '')) return 'contact:github';
        if (/linkedin/i.test(name) || /linkedin\.com/i.test(href ?? '')) return 'contact:linkedin';
      }
      if (footer !== null) {
        if (href === '/') return 'footer:home';
        if (href?.startsWith('mailto:')) return 'footer:email';
        if (/github/i.test(name) || /github\.com/i.test(href ?? '')) return 'footer:github';
        if (/linkedin/i.test(name) || /linkedin\.com/i.test(href ?? '')) return 'footer:linkedin';
        if (href === '#main') return 'footer:top';
      }
      return `${element.tagName.toLowerCase()}:${name || 'unnamed'}`;
    })();

    return {
      key,
      role: element.getAttribute('role') ?? element.tagName.toLowerCase(),
      name,
      panel: nav !== null ? 'nav' : footer !== null ? 'footer' : hero !== null ? 'hero' : '',
      tag: element.tagName.toLowerCase(),
      href,
    };
  });
}

async function readDrillStructure(page: Page): Promise<{
  readonly expected: readonly DrillTabStep[];
  readonly nav: readonly string[];
  readonly hero: readonly string[];
  readonly cards: readonly string[];
  readonly contact: readonly string[];
  readonly footer: readonly string[];
  readonly resumeLinks: number;
}> {
  return await page.evaluate(() => {
    const normalize = (element: HTMLElement) => {
      const text = (element.innerText || element.textContent || '').replace(/\s+/g, ' ').trim();
      const aria = element.getAttribute('aria-label');
      return (aria ?? text).slice(0, 160);
    };
    const isRendered = (element: HTMLElement) =>
      element.getClientRects().length > 0 && getComputedStyle(element).visibility !== 'hidden';
    const descriptor = (element: HTMLElement, key: string, panel: string): DrillTabStep => ({
      key,
      role: element.getAttribute('role') ?? element.tagName.toLowerCase(),
      name: normalize(element),
      panel,
      tag: element.tagName.toLowerCase(),
      href: element.getAttribute('href'),
    });
    const navElements = [
      ...document.querySelectorAll<HTMLElement>(
        'nav[aria-label="Primary"] a[href], nav[aria-label="Primary"] button',
      ),
    ];
    const navKeys = navElements.map((element) => {
      const aria = element.getAttribute('aria-label');
      const href = element.getAttribute('href');
      if (element.tagName === 'BUTTON' && aria?.startsWith('Switch to ')) return 'nav:theme';
      if (href === '/') return 'nav:home';
      if (href === '/projects') return 'nav:projects';
      if (href === '/#about') return 'nav:about';
      if (href === '/#contact') return 'nav:contact';
      if (aria === 'GitHub') return 'nav:github';
      if (aria === 'LinkedIn') return 'nav:linkedin';
      return `nav:unknown:${normalize(element)}`;
    });
    const heroElements = [
      ...document.querySelectorAll<HTMLElement>(
        '[data-site-hero] a[href], [data-site-hero] [data-hero-loop-slot] button',
      ),
    ];
    const heroLinks = heroElements.filter((element) => element.tagName === 'A');
    const heroKeys = heroElements.map((element) =>
      element.tagName === 'BUTTON'
        ? 'hero:pause'
        : heroLinks.indexOf(element) === 0
          ? 'hero:primary'
          : 'hero:secondary',
    );
    const cardElements = [...document.querySelectorAll<HTMLElement>('[data-site-card] a[href]')];
    const cardKeys = cardElements.map(
      (element) =>
        `card:${element.closest('[data-site-card]')?.getAttribute('data-site-card') ?? 'unknown'}`,
    );
    const contactElements = [
      ...document.querySelectorAll<HTMLElement>('[data-home-section="contact"] a[href]'),
    ];
    const contactKeys = contactElements.map((element) => {
      const href = element.getAttribute('href');
      const name = normalize(element);
      if (href?.startsWith('mailto:')) return 'contact:email';
      if (/github/i.test(name) || /github\.com/i.test(href ?? '')) return 'contact:github';
      if (/linkedin/i.test(name) || /linkedin\.com/i.test(href ?? '')) return 'contact:linkedin';
      return `contact:unknown:${name}`;
    });
    const footerElements = [...document.querySelectorAll<HTMLElement>('footer a[href]')].filter(
      isRendered,
    );
    const footerKeys = footerElements.map((element) => {
      const href = element.getAttribute('href');
      const name = normalize(element);
      if (href === '/') return 'footer:home';
      if (href?.startsWith('mailto:')) return 'footer:email';
      if (/github/i.test(name) || /github\.com/i.test(href ?? '')) return 'footer:github';
      if (/linkedin/i.test(name) || /linkedin\.com/i.test(href ?? '')) return 'footer:linkedin';
      if (href === '#main') return 'footer:top';
      return `footer:unknown:${name}`;
    });
    const skipElement = document.querySelector<HTMLElement>('a[href="#main"]');
    const expected = [
      ...(skipElement === null ? [] : [descriptor(skipElement, 'skip', '')]),
      ...navElements.map((element, index) =>
        descriptor(element, navKeys[index] ?? 'nav:unknown', 'nav'),
      ),
      ...heroElements.map((element, index) =>
        descriptor(element, heroKeys[index] ?? 'hero:unknown', 'hero'),
      ),
      ...cardElements.map((element, index) =>
        descriptor(element, cardKeys[index] ?? 'card:unknown', ''),
      ),
      ...contactElements.map((element, index) =>
        descriptor(element, contactKeys[index] ?? 'contact:unknown', ''),
      ),
      ...footerElements.map((element, index) =>
        descriptor(element, footerKeys[index] ?? 'footer:unknown', 'footer'),
      ),
    ];
    const resumeLinks = [...document.querySelectorAll<HTMLAnchorElement>('a[href]')].filter(
      (element) => /resume/i.test(element.textContent ?? '') || /resume/i.test(element.href),
    ).length;

    return {
      expected,
      nav: navKeys,
      hero: heroKeys,
      cards: cardKeys,
      contact: contactKeys,
      footer: footerKeys,
      resumeLinks,
    };
  });
}

async function collectTabWalk(
  page: Page,
  expected: readonly DrillTabStep[],
): Promise<{
  readonly forward: DrillTabStep[];
  readonly backward: DrillTabStep[];
  readonly anchor: DrillTabStep | null;
  readonly stoppedAfterLast: boolean;
}> {
  await page.evaluate(() => {
    (document.activeElement as HTMLElement | null)?.blur();
    document.body.focus();
  });

  const forward: DrillTabStep[] = [];
  for (let index = 0; index < expected.length + 4; index += 1) {
    await page.keyboard.press('Tab');
    const step = await readActiveTab(page);
    if (step === null) break;
    forward.push(step);
  }
  const stoppedAfterLast = (await readActiveTab(page)) === null;

  await page.keyboard.press('Tab');
  await readActiveTab(page);

  await page.evaluate(() => {
    (document.activeElement as HTMLElement | null)?.blur();
    document.body.focus();
  });
  await page.keyboard.press('Shift+Tab');
  const anchor = await readActiveTab(page);
  const backward: DrillTabStep[] = [];

  for (let index = 0; index < expected.length - 1; index += 1) {
    await page.keyboard.press('Shift+Tab');
    const step = await readActiveTab(page);
    if (step !== null) backward.push(step);
  }

  return { forward, backward, anchor, stoppedAfterLast };
}

async function runDrillGroup(browser: Browser, siteBase: URL): Promise<SiteProbeGroupResult> {
  const context = await browser.newContext(contextOptions('light', VIEWPORTS[0] as Viewport));
  const page = await context.newPage();
  await installClsObserver(page, false);

  try {
    await navigatePage(page, siteBase);
    await waitForHydration(page);
    const structure = await readDrillStructure(page);
    const expectedKeys = structure.expected.map((step) => step.key);
    const walk = await collectTabWalk(page, structure.expected);
    const actualForward = walk.forward.map((step) => step.key);
    const expectedLast = expectedKeys.at(-1) ?? null;
    const walkVerdict = evaluateTabWalk(walk.forward, walk.backward, expectedKeys);
    const structurePass = sameStrings(actualForward, expectedKeys);
    const navPass = sameStrings(structure.nav, [...EXPECTED_NAV_KEYS]);
    const noResume = structure.resumeLinks === 0;
    const noWrap = walk.stoppedAfterLast && walk.anchor?.key === expectedLast;
    const noTrap = !walkVerdict.trap && walkVerdict.reachedLast && walkVerdict.backwardMatches;

    const checks: SiteProbeCheck[] = [
      check('drill-tab-logical-order', structurePass, expectedKeys, actualForward),
      check('drill-nav-dom-order', navPass, EXPECTED_NAV_KEYS, structure.nav),
      check('drill-no-resume-link', noResume, 0, structure.resumeLinks),
      check(
        'drill-shift-tab-reverses',
        walkVerdict.backwardMatches,
        [...expectedKeys].reverse().slice(1),
        walkVerdict.actualBackward,
      ),
      check('drill-no-trap', noWrap && noTrap, true, {
        stoppedAfterLast: walk.stoppedAfterLast,
        anchor: walk.anchor?.key ?? null,
        trap: walkVerdict.trap,
        repeated: walkVerdict.repeated,
      }),
    ];

    if (walk.forward.length > 0) {
      console.log(
        `drill tabs: ${walk.forward.map((step) => step.key).join(' -> ')} ${structurePass ? 'PASS' : 'FAIL'}`,
      );
    }

    await page.evaluate(() => {
      const state = (window as unknown as ClsWindow).__siteProbeCls;
      if (state !== undefined) state.entries.length = 0;
      (window as Window & { __siteProbeSoftNav?: boolean }).__siteProbeSoftNav = true;
    });

    const primarySource = PROJECT_SOURCES[0];
    const primaryProjectPath = projectPath(primarySource);
    const cardSelector = `[data-site-card="${primarySource.meta.slug}"] a[href="${primaryProjectPath}"]`;
    const card = page.locator(cardSelector).first();
    await card.focus();
    await page.keyboard.press('Enter');
    await page.waitForURL((url) => url.pathname === primaryProjectPath, {
      timeout: WAIT_TIMEOUT_MS,
    });
    const markerAfterProject = await page.evaluate(
      () => (window as Window & { __siteProbeSoftNav?: boolean }).__siteProbeSoftNav === true,
    );
    await activateProjectViewer(page);
    const projectUrlPath = new URL(page.url()).pathname;
    const projectViewerReady = (await page.locator('[data-xploder-ready="true"]').count()) === 1;
    const h1 = (await page.locator('main h1').first().innerText()).trim();
    await page.waitForTimeout(1500);

    await page.goBack({ waitUntil: 'load', timeout: WAIT_TIMEOUT_MS });
    await page.waitForURL((url) => url.pathname === '/', { timeout: WAIT_TIMEOUT_MS });
    await card.waitFor({ state: 'visible', timeout: WAIT_TIMEOUT_MS });
    await page.waitForTimeout(1500);
    const markerAfterBack = await page.evaluate(
      () => (window as Window & { __siteProbeSoftNav?: boolean }).__siteProbeSoftNav === true,
    );
    const softEntries = await page.evaluate(
      () => (window as unknown as ClsWindow).__siteProbeCls?.entries ?? [],
    );
    const softCls = evaluateCls(softEntries);
    await card.focus();
    const cardReachable = await page.evaluate(
      (selector) => document.activeElement?.matches(selector) === true,
      cardSelector,
    );

    checks.push(
      check(
        'drill-card-enter-url',
        projectUrlPath === primaryProjectPath,
        primaryProjectPath,
        projectUrlPath,
      ),
      check('drill-card-enter-viewer', projectViewerReady, true, projectViewerReady),
      check('drill-card-enter-h1', h1 === primarySource.meta.name, primarySource.meta.name, h1),
      check('drill-soft-navigation', markerAfterProject && markerAfterBack, true, {
        project: markerAfterProject,
        back: markerAfterBack,
      }),
      check('drill-back-card-reachable', cardReachable, true, cardReachable),
      check('drill-soft-nav-cls', softCls.pass, 0, {
        total: softCls.total,
        entries: softEntries,
      }),
    );

    await page.locator('nav[aria-label="Primary"] a[href="/projects"]').focus();
    await page.keyboard.press('Enter');
    await page.waitForURL((url) => url.pathname === '/projects', { timeout: WAIT_TIMEOUT_MS });
    await page
      .locator('[data-site-card] a[href^="/projects/"]')
      .first()
      .waitFor({ timeout: WAIT_TIMEOUT_MS });
    checks.push(
      check('drill-projects-one-activation', true, '/projects', new URL(page.url()).pathname),
    );

    const cardHrefs = await page
      .locator('[data-site-card] a[href^="/projects/"]')
      .evaluateAll((elements) => [
        ...new Set(elements.map((element) => element.getAttribute('href'))),
      ]);
    const statuses: { href: string; status: number }[] = [];
    for (const href of cardHrefs) {
      if (href === null) continue;
      const response = await page.request.get(new URL(href, siteBase).href);
      statuses.push({ href, status: response.status() });
    }
    checks.push(
      check(
        'drill-card-hrefs-200',
        statuses.length > 0 && statuses.every((entry) => entry.status === 200),
        'every status 200',
        statuses,
      ),
    );

    return groupResult('drill', checks, { structure, walk, softCls });
  } finally {
    await context.close();
  }
}

async function runHeroGroup(
  browser: Browser,
  siteBase: URL,
  outDir: string,
): Promise<SiteProbeGroupResult> {
  const checks: SiteProbeCheck[] = [];
  const rawResponse = await fetch(siteBase, { redirect: 'follow' });
  const rawHtml = await rawResponse.text();
  const posterAtSsr = heroContainsPoster(rawHtml);
  checks.push(check('hero-ssr-poster', posterAtSsr, true, posterAtSsr));

  const homeContext = await browser.newContext(contextOptions('light', VIEWPORTS[0] as Viewport));
  const homePage = await homeContext.newPage();
  await installPaintObserver(homePage);

  try {
    await navigatePage(homePage, siteBase);
    await waitForHydration(homePage);
    await homePage.waitForFunction(
      () => (window as unknown as PaintWindow).__siteProbePaint?.fcpAt !== null,
      undefined,
      { timeout: WAIT_TIMEOUT_MS },
    );
    const paint = await homePage.evaluate(
      () => (window as unknown as PaintWindow).__siteProbePaint,
    );
    checks.push(
      check(
        'hero-first-paint-is-poster',
        paint?.fcpAt !== null && paint?.fcpAt !== undefined && paint.liveStateAtFcp !== 'revealed',
        { liveStateNot: 'revealed', hasFcp: true },
        paint ?? null,
      ),
    );

    const liveMode = parseHeroLiveMode(
      await homePage.locator('[data-site-live]').getAttribute('data-site-live-mode'),
    );

    if (liveMode === null) {
      checks.push(check('hero-live-mode', false, 'eager|gated', null));
    } else if (liveMode === 'eager') {
      await homePage
        .waitForFunction(
          () => {
            const live = document.querySelector('[data-site-live]');
            const hero = document.querySelector('[data-site-hero]');
            return (
              live?.getAttribute('data-site-live-state') === 'revealed' &&
              hero !== null &&
              hero.querySelectorAll('canvas').length === 1 &&
              document.querySelector('[data-xploder-ready="true"]') !== null
            );
          },
          undefined,
          { timeout: WAIT_TIMEOUT_MS },
        )
        .catch(() => undefined);
      const eagerState = await homePage.evaluate(() => {
        const live = document.querySelector('[data-site-live]');
        const hero = document.querySelector('[data-site-hero]');
        return {
          liveState: live?.getAttribute('data-site-live-state') ?? null,
          canvases: hero?.querySelectorAll('canvas').length ?? 0,
          ready: document.querySelector('[data-xploder-ready="true"]') !== null,
        };
      });
      checks.push(
        check(
          'hero-eager-no-interaction',
          evaluateHeroEagerNoInteraction(eagerState),
          { liveState: 'revealed', canvases: 1, ready: true },
          eagerState,
        ),
      );
    } else {
      await homePage.waitForTimeout(POSTER_SCAN_MS);
      const posterState = await homePage.evaluate(() => {
        const live = document.querySelector('[data-site-live]');
        const posters = [...document.querySelectorAll('[data-site-hero] [data-site-poster]')];
        const poster =
          posters.find((candidate) => candidate.getBoundingClientRect().width > 1) ??
          posters[0] ??
          null;
        const rect = poster?.getBoundingClientRect();
        return {
          liveState: live?.getAttribute('data-site-live-state') ?? null,
          canvases: document.querySelectorAll('[data-site-hero] canvas').length,
          posterWidth: rect?.width ?? 0,
          posterOpacity: poster === null ? null : getComputedStyle(poster).opacity,
        };
      });
      checks.push(
        check(
          'hero-poster-no-interaction',
          posterState.liveState === 'idle' &&
            posterState.canvases === 0 &&
            posterState.posterWidth > 1,
          { liveState: 'idle', canvases: 0, posterWidthPositive: true },
          posterState,
        ),
      );
    }
    await homePage.screenshot({ path: join(outDir, 'hero-home-poster.png'), fullPage: true });

    await activateHomeLive(homePage);
    const revealed = await homePage.evaluate(
      () => (window as unknown as PaintWindow).__siteProbePaint,
    );
    const liveStateAfterInteraction = await homePage
      .locator('[data-site-live]')
      .getAttribute('data-site-live-state');
    checks.push(
      check(
        'hero-revealed-after-load',
        liveStateAfterInteraction === 'revealed' &&
          revealed?.loadAt !== null &&
          revealed?.loadAt !== undefined &&
          revealed.liveStateAtFcp !== 'revealed',
        { afterLoad: true, liveState: 'revealed' },
        { ...(revealed ?? {}), liveStateAfterInteraction },
      ),
    );

    await homePage.waitForTimeout(IDLE_SCAN_MS);
    const loopPresent = (await homePage.locator('[data-hero-loop]').count()) > 0;
    const idle = await homePage.evaluate(() => {
      const viewer = document.querySelector('[data-xploder-ready="true"]');
      return {
        state: viewer?.getAttribute('data-xploder-state') ?? null,
        tweening: viewer?.getAttribute('data-xploder-tweening') ?? null,
        tour: viewer?.getAttribute('data-xploder-tour') ?? null,
        heroLoop:
          document.querySelector('[data-hero-loop]')?.getAttribute('data-hero-loop') ?? null,
        canvases: document.querySelectorAll('canvas').length,
      };
    });
    checks.push(
      loopPresent
        ? check(
            'hero-loop-running',
            evaluateHeroLoopRunning(idle),
            { heroLoop: 'running', canvases: 1, tour: 'capture or inspect' },
            { heroLoop: idle.heroLoop, canvases: idle.canvases, tour: idle.tour },
          )
        : check(
            'hero-idle-exploded',
            idle.state === 'exploded' && idle.tweening === 'false',
            { state: 'exploded', tweening: 'false' },
            { state: idle.state, tweening: idle.tweening, canvases: idle.canvases },
          ),
      check('hero-one-canvas-max', idle.canvases <= 1, 1, idle.canvases),
    );
  } finally {
    await homeContext.close();
  }

  const projectContext = await browser.newContext(
    contextOptions('light', VIEWPORTS[0] as Viewport),
  );
  try {
    for (const source of PROJECT_SOURCES) {
      const slug = source.meta.slug;
      const projectPage = await openPage(projectContext, new URL(projectPath(source), siteBase));
      await waitForHydration(projectPage);
      await projectPage.waitForTimeout(POSTER_SCAN_MS);
      const projectPoster = await projectPage.evaluate(() => {
        const poster = document.querySelector('[data-site-stage] [data-site-poster]');
        const staticExplore = document.querySelector<HTMLElement>('[data-site-explore-static]');
        const control = document.querySelector<HTMLElement>('[data-site-control="explore-3d"]');
        const posterRect = poster?.getBoundingClientRect();
        return {
          canvases: document.querySelectorAll('canvas').length,
          posterWidth: posterRect?.width ?? 0,
          staticExploreVisible:
            staticExplore !== null && staticExplore.getBoundingClientRect().height > 1,
          controlVisible: control !== null && control.getBoundingClientRect().height >= 44,
        };
      });
      checks.push(
        check(
          `hero-project-poster-${slug}`,
          projectPoster.canvases === 0 &&
            projectPoster.posterWidth > 1 &&
            projectPoster.staticExploreVisible &&
            projectPoster.controlVisible,
          { canvases: 0, poster: true, staticExplore: true, exploreControl: true },
          projectPoster,
        ),
      );
      await projectPage.screenshot({
        path: join(outDir, `hero-project-poster-${slug}.png`),
        fullPage: true,
      });
      await projectPage.close();
    }
  } finally {
    await projectContext.close();
  }

  return groupResult('hero', checks);
}

async function runReducedMotionGroup(
  browser: Browser,
  siteBase: URL,
): Promise<SiteProbeGroupResult> {
  const checks: SiteProbeCheck[] = [];
  const context = await browser.newContext({
    ...contextOptions('light', VIEWPORTS[0] as Viewport),
    reducedMotion: 'reduce' as const,
  });

  try {
    const page = await openPage(context, siteBase);
    await page.waitForFunction(
      () =>
        document.querySelector('[data-site-live]')?.getAttribute('data-site-live-state') ===
        'skipped',
      undefined,
      { timeout: WAIT_TIMEOUT_MS },
    );
    const home = await page.evaluate(() => {
      const hero = document.querySelector('[data-site-hero]');
      const posters = [...document.querySelectorAll('[data-site-hero] [data-site-poster]')];
      const poster =
        posters.find((candidate) => candidate.getBoundingClientRect().width > 1) ??
        posters[0] ??
        null;
      return {
        liveState:
          document.querySelector('[data-site-live]')?.getAttribute('data-site-live-state') ?? null,
        heroCanvases: hero?.querySelectorAll('canvas').length ?? 0,
        posterWidth: poster?.getBoundingClientRect().width ?? 0,
      };
    });
    checks.push(
      check(
        'reduced-home-skipped',
        home.liveState === 'skipped' && home.heroCanvases === 0 && home.posterWidth > 1,
        { liveState: 'skipped', heroCanvases: 0, posterVisible: true },
        home,
      ),
    );

    const animationSamples = await page.evaluate(async () => {
      const samples: number[] = [];
      const start = performance.now();
      while (performance.now() - start < 2000) {
        samples.push(document.getAnimations().length);
        await new Promise<void>((resolveDelay) => setTimeout(resolveDelay, 100));
      }
      return samples;
    });
    checks.push(
      check(
        'reduced-home-no-animations',
        animationSamples.every((count) => count === 0),
        'all samples 0',
        animationSamples,
      ),
    );

    for (const source of PROJECT_SOURCES) {
      const slug = source.meta.slug;
      await navigatePage(page, new URL(projectPath(source), siteBase));
      await activateProjectViewer(page);
      const posterTransition = await page
        .locator('[data-site-stage] [data-site-poster]')
        .evaluate((element) => getComputedStyle(element).transitionDuration);
      const allZeroDurations = posterTransition
        .split(',')
        .map((value) => value.trim())
        .every((value) => Number.parseFloat(value) === 0);
      checks.push(
        check(
          `reduced-poster-no-transition-${slug}`,
          allZeroDurations,
          'all durations 0',
          posterTransition,
        ),
      );

      await page.evaluate(() => {
        const viewer = document.querySelector('[data-xploder-ready="true"]');
        const state = { phases: [] as string[], tweening: [] as string[] };
        (window as unknown as ReducedWindow).__siteProbeReduced = state;
        if (viewer === null) return;
        state.phases.push(viewer.getAttribute('data-xploder-state') ?? '');
        state.tweening.push(viewer.getAttribute('data-xploder-tweening') ?? '');
        new MutationObserver((mutations) => {
          for (const mutation of mutations) {
            if (mutation.attributeName === 'data-xploder-state') {
              state.phases.push(viewer.getAttribute('data-xploder-state') ?? '');
            }
            if (mutation.attributeName === 'data-xploder-tweening') {
              state.tweening.push(viewer.getAttribute('data-xploder-tweening') ?? '');
            }
          }
        }).observe(viewer, {
          attributes: true,
          attributeFilter: ['data-xploder-state', 'data-xploder-tweening'],
        });
      });

      await page.locator('[data-site-control="toggle"]').click();
      await page.waitForFunction(
        () =>
          document
            .querySelector('[data-xploder-ready="true"]')
            ?.getAttribute('data-xploder-state') === 'imploded',
        undefined,
        { timeout: WAIT_TIMEOUT_MS },
      );
      const animationsAfterImplode = await page.evaluate(() => document.getAnimations().length);
      await page.locator('[data-site-control="toggle"]').click();
      await page.waitForFunction(
        () =>
          document
            .querySelector('[data-xploder-ready="true"]')
            ?.getAttribute('data-xploder-state') === 'exploded',
        undefined,
        { timeout: WAIT_TIMEOUT_MS },
      );
      const animationsAfterExplode = await page.evaluate(() => document.getAnimations().length);
      const reduced = await page.evaluate(
        () =>
          (window as unknown as ReducedWindow).__siteProbeReduced ?? {
            phases: [],
            tweening: [],
          },
      );
      const directPhases = reduced.phases.every(
        (phase) => phase === '' || phase === 'imploded' || phase === 'exploded',
      );
      checks.push(
        check(
          `reduced-project-toggles-instant-${slug}`,
          directPhases && !reduced.tweening.includes('true'),
          { phases: ['exploded', 'imploded', 'exploded'], tweeningNeverTrue: true },
          reduced,
        ),
        check(
          `reduced-project-no-animations-${slug}`,
          animationsAfterImplode === 0 && animationsAfterExplode === 0,
          { implode: 0, explode: 0 },
          { implode: animationsAfterImplode, explode: animationsAfterExplode },
        ),
      );
    }
  } finally {
    await context.close();
  }

  return groupResult('reduced-motion', checks);
}

async function runNoJsGroup(
  browser: Browser,
  siteBase: URL,
  siteDir: string | undefined,
  outDir: string,
): Promise<SiteProbeGroupResult> {
  const checks: SiteProbeCheck[] = [];
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 1,
    javaScriptEnabled: false,
    colorScheme: 'light',
  });
  const page = await context.newPage();
  const captures: unknown[] = [];

  try {
    const pageRoutes = [
      {
        name: 'home',
        path: '/',
        listKind: 'cards' as const,
        checkName: 'nojs-home-poster-and-list',
      },
      ...PROJECT_SOURCES.map((source) => ({
        name: `project-${source.meta.slug}`,
        path: projectPath(source),
        listKind: 'outline' as const,
        checkName: `nojs-project-${source.meta.slug}-poster-and-list`,
      })),
    ];

    for (const route of pageRoutes) {
      await navigatePage(page, new URL(route.path, siteBase));
      const screenshot = `nojs-${route.name}.png`;
      const dump = `nojs-${route.name}.html`;
      await page.screenshot({ path: join(outDir, screenshot), fullPage: true });
      const html = await page.content();
      await writeFile(join(outDir, dump), `${html}\n`, 'utf8');
      const actual = await page.evaluate(() => ({
        posters: document.querySelectorAll('[data-site-poster]').length,
        // `/` has two posters since S11.9 (imploded + numbered path); measure the visible one.
        posterWidth: Math.max(
          0,
          ...[...document.querySelectorAll('[data-site-poster]')].map(
            (poster) => poster.getBoundingClientRect().width,
          ),
        ),
        cards: document.querySelectorAll('[data-site-card]').length,
        outlines: document.querySelectorAll('[data-site-outline]').length,
      }));
      const listCount = route.listKind === 'cards' ? actual.cards : actual.outlines;
      checks.push(
        check(
          route.checkName,
          actual.posters > 0 && actual.posterWidth > 1 && listCount > 0,
          { posters: 1, list: route.listKind },
          actual,
        ),
      );
      captures.push({ name: route.name, screenshot, dump, actual });
    }
  } finally {
    await context.close();
  }

  if (siteDir !== undefined) {
    const homeHtml = await readFile(join(siteDir, 'index.html'), 'utf8');
    const homeVerdict = evaluateFallbackHtml(homeHtml, 'cards');
    checks.push(
      check('nojs-raw-home-poster-list', homeVerdict.pass, true, homeVerdict),
      check(
        'nojs-raw-hero-poster',
        heroContainsPoster(homeHtml),
        true,
        heroContainsPoster(homeHtml),
      ),
    );

    for (const source of PROJECT_SOURCES) {
      const projectHtml = await readFile(join(siteDir, projectOutlinePath(source)), 'utf8');
      const projectVerdict = evaluateFallbackHtml(projectHtml, 'outline');
      checks.push(
        check(
          `nojs-raw-project-${source.meta.slug}-poster-list`,
          projectVerdict.pass,
          true,
          projectVerdict,
        ),
      );
    }
  }

  const noWebglContext = await browser.newContext(
    contextOptions('light', VIEWPORTS[0] as Viewport),
  );
  await noWebglContext.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (
      this: HTMLCanvasElement,
      type: string,
      ...args: unknown[]
    ) {
      if (type === 'webgl' || type === 'webgl2' || type === 'experimental-webgl') return null;
      return original.call(this, type, ...args);
    } as typeof HTMLCanvasElement.prototype.getContext;
  });

  try {
    for (const source of PROJECT_SOURCES) {
      const slug = source.meta.slug;
      const projectPage = await openPage(noWebglContext, new URL(projectPath(source), siteBase));
      await waitForHydration(projectPage);
      await projectPage.locator('[data-site-control="explore-3d"]').click();
      await projectPage.locator('[data-xploder-webgl="unavailable"]').waitFor({
        state: 'visible',
        timeout: WAIT_TIMEOUT_MS,
      });
      const noWebgl = await projectPage.evaluate(() => {
        const outline = document.querySelector('[data-site-outline]');
        const text = outline?.textContent ?? '';
        return {
          outline: outline !== null,
          message: /WebGL is unavailable/i.test(text),
          canvases: document.querySelectorAll('canvas').length,
          text: text.slice(0, 200),
        };
      });
      await projectPage.screenshot({
        path: join(outDir, `project-${slug}-no-webgl.png`),
        fullPage: true,
      });
      checks.push(
        check(
          `nojs-project-${slug}-no-webgl-outline`,
          noWebgl.outline && noWebgl.message && noWebgl.canvases === 0,
          { outline: true, message: true, canvases: 0 },
          noWebgl,
        ),
      );
      await projectPage.close();
    }
  } finally {
    await noWebglContext.close();
  }

  return groupResult('nojs', checks, { captures });
}

async function readRouteMetadata(
  context: BrowserContext,
  base: URL,
  path: string,
  allowHttpError = false,
): Promise<{
  readonly title: string;
  readonly description: string | null;
  readonly status: number;
  readonly h1: string | null;
  readonly body: string;
}> {
  const page = await openPage(context, new URL(path, base), allowHttpError);
  const actual = await page.evaluate(() => ({
    title: document.title,
    description:
      document.querySelector<HTMLMetaElement>('meta[name="description"]')?.content ?? null,
    h1: document.querySelector('h1')?.textContent?.trim() ?? null,
    body: document.body.textContent?.slice(0, 500) ?? '',
  }));
  const response = await context.request.get(new URL(path, base).href);
  return { ...actual, status: response.status() };
}

async function runRoutesGroup(browser: Browser, siteBase: URL): Promise<SiteProbeGroupResult> {
  const checks: SiteProbeCheck[] = [];
  const context = await browser.newContext(contextOptions('light', VIEWPORTS[0] as Viewport));
  const siteName = siteSource.meta.siteName;

  try {
    const root = await readRouteMetadata(context, siteBase, '/');
    checks.push(
      check(
        'routes-home-title',
        root.title === siteSource.meta.title,
        siteSource.meta.title,
        root.title,
      ),
      check(
        'routes-home-description',
        root.description === siteSource.meta.description,
        siteSource.meta.description,
        root.description,
      ),
    );

    const projects = await readRouteMetadata(context, siteBase, '/projects');
    checks.push(
      check(
        'routes-projects-title',
        projects.title === `${siteSource.projects.title} · ${siteName}`,
        `${siteSource.projects.title} · ${siteName}`,
        projects.title,
      ),
      check(
        'routes-projects-description',
        projects.description === siteSource.meta.description,
        siteSource.meta.description,
        projects.description,
      ),
    );

    for (const source of PROJECT_SOURCES) {
      const slug = source.meta.slug;
      const project = await readRouteMetadata(context, siteBase, projectPath(source));
      checks.push(
        check(
          `routes-project-title-${slug}`,
          project.title === `${source.meta.name} · ${siteName}`,
          `${source.meta.name} · ${siteName}`,
          project.title,
        ),
        check(
          `routes-project-description-${slug}`,
          project.description === (source.meta.tagline ?? ''),
          source.meta.tagline,
          project.description,
        ),
      );
    }

    const missing = await readRouteMetadata(context, siteBase, '/projects/does-not-exist', true);
    checks.push(
      check('routes-unknown-project-status', missing.status === 404, 404, missing.status),
      check(
        'routes-unknown-project-content',
        missing.h1 === 'Page not found' || /Page not found/i.test(missing.body),
        'not-found content',
        { h1: missing.h1 },
      ),
    );

    for (const path of ['/dev/engine', '/fixtures/fps-calibration', '/resume.pdf']) {
      const response = await context.request.get(new URL(path, siteBase).href);
      checks.push(check(`routes-${path}-404`, response.status() === 404, 404, response.status()));
    }
  } finally {
    await context.close();
  }

  return groupResult('routes', checks);
}

async function drawFrames(page: Page): Promise<DrawFrame[]> {
  return await page.evaluate(() =>
    ((window as unknown as DrawWindow).__siteProbeDraws?.frames ?? []).map((frame) => ({
      draws: frame.draws,
      time: frame.time,
    })),
  );
}

async function waitForRenderedFrames(page: Page): Promise<DrawFrame[]> {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    const frames = await drawFrames(page);
    if (frames.filter((frame) => frame.draws > 0).length >= MIN_RENDERED_FRAMES) return frames;
    await page.waitForTimeout(100);
  }
  return await drawFrames(page);
}

async function runDrawsGroup(browser: Browser, siteBase: URL): Promise<SiteProbeGroupResult> {
  const checks: SiteProbeCheck[] = [];
  const projectContext = await browser.newContext(
    contextOptions('light', VIEWPORTS[0] as Viewport),
  );
  await installDrawCounter(projectContext);

  try {
    for (const source of PROJECT_SOURCES) {
      const slug = source.meta.slug;
      const page = await openPage(projectContext, new URL(projectPath(source), siteBase));
      await activateProjectViewer(page);
      await page.waitForTimeout(500);
      await page.evaluate(() => {
        const state = (window as unknown as DrawWindow).__siteProbeDraws;
        if (state !== undefined) state.frames.length = 0;
      });
      await page.locator('[data-site-control="rotate-right"]').click();
      const projectFrames = await waitForRenderedFrames(page);
      const projectVerdict = evaluateDrawFrames(projectFrames);
      checks.push(
        check(`draws-project-${slug}`, projectVerdict.pass, EXPECTED_DRAW_CALLS, projectVerdict),
      );
      console.log(
        `draws project ${slug}: mode=${projectVerdict.mode} rendered=${projectVerdict.renderedFrames} total=${projectVerdict.totalFrames} ${projectVerdict.pass ? 'PASS' : 'FAIL'}`,
      );
      await page.close();
    }
  } finally {
    await projectContext.close();
  }

  const heroContext = await browser.newContext(contextOptions('light', VIEWPORTS[0] as Viewport));
  await installDrawCounter(heroContext);

  try {
    const page = await openPage(heroContext, siteBase);
    await page.waitForTimeout(POSTER_SCAN_MS);
    await activateHomeLive(page);
    await page.waitForTimeout(500);
    await page.evaluate(() => {
      const state = (window as unknown as DrawWindow).__siteProbeDraws;
      if (state !== undefined) state.frames.length = 0;
    });
    for (let index = 0; index < 40; index += 1) {
      const width = index % 2 === 0 ? 1270 : 1280;
      await page.setViewportSize({ width, height: 800 });
      await page.waitForTimeout(35);
    }
    await page.setViewportSize({ width: 1280, height: 800 });
    const heroFrames = await waitForRenderedFrames(page);
    const heroVerdict = evaluateDrawFrames(heroFrames);
    checks.push(check('draws-hero', heroVerdict.pass, EXPECTED_DRAW_CALLS, heroVerdict));
    console.log(
      `draws hero: mode=${heroVerdict.mode} rendered=${heroVerdict.renderedFrames} total=${heroVerdict.totalFrames} ${heroVerdict.pass ? 'PASS' : 'FAIL'}`,
    );
  } finally {
    await heroContext.close();
  }

  return groupResult('draws', checks);
}

function errorDetail(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

async function waitForTourState(
  page: Page,
  state: string,
  timeout = WAIT_TIMEOUT_MS,
): Promise<void> {
  const deadline = Date.now() + timeout;
  let current: string | null = null;

  while (Date.now() <= deadline) {
    await page.bringToFront();
    current = await page.evaluate(
      () =>
        document.querySelector('[data-xploder-ready="true"]')?.getAttribute('data-xploder-tour') ??
        null,
    );
    if (current === state) return;

    await new Promise<void>((resolveDelay) => setTimeout(resolveDelay, 100));
  }

  throw new Error(`tour did not reach ${state}; last state ${JSON.stringify(current)}`);
}

async function keepPageActive(page: Page): Promise<void> {
  await page.bringToFront();
  const session = await page.context().newCDPSession(page);
  try {
    await session.send('Page.setWebLifecycleState', { state: 'active' });
  } finally {
    await session.detach();
  }
}

async function focusFirstProxyAndOpen(page: Page): Promise<void> {
  await page.locator('[data-xploder-ready="true"]').focus();

  for (let attempt = 0; attempt < MAX_TABS_TO_PROXY; attempt += 1) {
    await page.keyboard.press('Tab');
    const focused = await page.evaluate(() => {
      const active = document.activeElement;
      return active instanceof HTMLElement && active.matches('[data-xploder-proxy]');
    });

    if (focused) {
      await page.keyboard.press('Enter');
      return;
    }
  }

  throw new Error('Tab did not reach the S8 navigator proxy');
}

async function openComponentPanel(page: Page): Promise<{
  readonly attached: boolean;
  readonly visible: boolean;
}> {
  await focusFirstProxyAndOpen(page);
  await page.locator(PANEL_READY_SELECTOR).waitFor({ state: 'visible', timeout: WAIT_TIMEOUT_MS });

  return await page.evaluate((selector) => {
    const panel = document.querySelector(selector);
    if (!(panel instanceof HTMLElement)) return { attached: false, visible: false };

    const rect = panel.getBoundingClientRect();
    const style = getComputedStyle(panel);
    return {
      attached: true,
      visible:
        rect.width > 0 &&
        rect.height > 0 &&
        style.visibility !== 'hidden' &&
        style.display !== 'none' &&
        Number(style.opacity) !== 0,
    };
  }, PANEL_READY_SELECTOR);
}

async function closeComponentPanel(page: Page): Promise<void> {
  await page.locator('[data-xploder-panel-close]').click({ timeout: WAIT_TIMEOUT_MS });
  await page.locator(PANEL_READY_SELECTOR).waitFor({ state: 'detached', timeout: WAIT_TIMEOUT_MS });
}

async function resetTeardownTour(page: Page): Promise<void> {
  await page.getByRole('tab', { name: 'Layers', exact: true }).click({ timeout: WAIT_TIMEOUT_MS });
  await waitForTourState(page, 'idle');
}

async function runTeardownTour(
  page: Page,
  flow: { readonly id: string; readonly path: readonly string[] },
): Promise<TeardownTourResult> {
  const timeoutMs = tourTimeoutMs(flow.path.length);
  await keepPageActive(page);
  await page.getByRole('tab', { name: 'Flows', exact: true }).click({ timeout: WAIT_TIMEOUT_MS });

  const option = page.locator(`[data-site-tour-flow-option="${flow.id}"]`);
  if ((await option.count()) > 0) {
    await option.click({ timeout: WAIT_TIMEOUT_MS });
    await page.waitForFunction(
      (flowId) =>
        [...document.querySelectorAll('[data-site-tour-flow-option]')].some(
          (candidate) =>
            candidate.getAttribute('data-site-tour-flow-option') === flowId &&
            candidate.getAttribute('aria-pressed') === 'true',
        ),
      flow.id,
      { timeout: WAIT_TIMEOUT_MS },
    );
  } else if ((await page.locator('[data-site-tour-flow-header]').count()) !== 1) {
    throw new Error(`flow ${flow.id} has neither an option nor a single-flow header`);
  }

  await waitForTourState(page, 'idle');
  await page
    .locator('[data-site-tour-transport] button[aria-label="Start tour"]')
    .click({ timeout: WAIT_TIMEOUT_MS });
  const startedAt = Date.now();
  let ended = true;

  try {
    await waitForTourState(page, 'ended', timeoutMs);
  } catch {
    ended = false;
  }

  const elapsedMs = Date.now() - startedAt;
  const final = await page.evaluate(() => ({
    state:
      document.querySelector('[data-xploder-ready="true"]')?.getAttribute('data-xploder-tour') ??
      null,
    position:
      document
        .querySelector('[data-site-tour-position]')
        ?.textContent?.replace(/\s+/g, ' ')
        .trim() ?? null,
  }));

  return { ended: ended && final.state === 'ended', elapsedMs, timeoutMs, ...final };
}

async function probeDesktopTeardown(
  browser: Browser,
  source: (typeof PROJECT_SOURCES)[number],
  palette: Palette,
  siteBase: URL,
  expected: TeardownCounts,
  outDir: string,
): Promise<SiteProbeCheck[]> {
  const checks: SiteProbeCheck[] = [];
  const slug = source.meta.slug;
  const context = await browser.newContext(contextOptions(palette, VIEWPORTS[0] as Viewport));

  try {
    const page = await openPage(context, new URL(projectPath(source), siteBase));
    await activateProjectViewer(page);
    await page
      .getByRole('tab', { name: 'Layers', exact: true })
      .click({ timeout: WAIT_TIMEOUT_MS });
    await page.locator(LIVE_LAYERS_PANEL_SELECTOR).waitFor({ state: 'visible' });

    const layerCount = await page.locator(LIVE_LAYER_CHIP_SELECTOR).count();
    const partCounts: number[] = [];
    for (let index = 0; index < layerCount; index += 1) {
      await page.locator(LIVE_LAYER_CHIP_SELECTOR).nth(index).click({ timeout: WAIT_TIMEOUT_MS });
      await page.waitForFunction(
        (selector) => document.querySelectorAll(selector).length > 0,
        LIVE_LAYER_PARTS_SELECTOR,
        { timeout: WAIT_TIMEOUT_MS },
      );
      partCounts.push(await page.locator(LIVE_LAYER_PARTS_SELECTOR).count());
    }
    const partsTotal = partCounts.reduce((total, count) => total + count, 0);
    checks.push(
      check(
        `teardown-${slug}-layers-${palette}`,
        layerCount === expected.layers && partsTotal === expected.components,
        { layers: expected.layers, parts: expected.components },
        { layers: layerCount, parts: partsTotal, partsByLayer: partCounts },
      ),
    );

    await page.getByRole('tab', { name: 'Flows', exact: true }).click({ timeout: WAIT_TIMEOUT_MS });
    await page.locator(LIVE_FLOWS_PANEL_SELECTOR).waitFor({ state: 'visible' });
    const flowOptions = await page.locator('[data-site-tour-flow-option]').count();
    const flowHeaders = await page.locator('[data-site-tour-flow-header]').count();
    const flowCount = flowOptions > 0 ? flowOptions : flowHeaders;
    checks.push(
      check(`teardown-${slug}-flows-${palette}`, flowCount === expected.flows, expected.flows, {
        options: flowOptions,
        headers: flowHeaders,
        count: flowCount,
      }),
    );

    await resetTeardownTour(page);
    const panel = await openComponentPanel(page);
    checks.push(
      check(`teardown-${slug}-panel-${palette}`, panel.attached && panel.visible, true, panel),
    );
    await page.screenshot({
      path: join(outDir, `teardown-${slug}-panel-desktop-${palette}.png`),
    });
    await closeComponentPanel(page);
    await navigatePage(page, new URL(projectPath(source), siteBase));
    await activateProjectViewer(page);
    await page.waitForTimeout(500);

    for (const [flowIndex, flow] of source.flows.entries()) {
      if (flowIndex > 0) {
        await navigatePage(page, new URL(projectPath(source), siteBase));
        await activateProjectViewer(page);
        await page.waitForTimeout(500);
      }

      let tour: TeardownTourResult;
      try {
        tour = await runTeardownTour(page, flow);
      } catch (error) {
        tour = {
          ended: false,
          elapsedMs: 0,
          timeoutMs: tourTimeoutMs(flow.path.length),
          position: null,
          state: null,
        };
        console.log(`teardown tour ${slug} ${flow.id} ${palette} error=${errorDetail(error)}`);
      }

      console.log(
        `teardown tour ${slug} ${flow.id} ${palette} elapsedMs=${tour.elapsedMs} position=${JSON.stringify(tour.position)}`,
      );
      await page.screenshot({
        path: join(outDir, `teardown-${slug}-tour-${flow.id}-ended-desktop-${palette}.png`),
      });
      checks.push(
        check(
          `teardown-${slug}-tour-${flow.id}-${palette}`,
          tour.ended && tour.position === `Step ${flow.path.length} of ${flow.path.length}`,
          { state: 'ended', position: `Step ${flow.path.length} of ${flow.path.length}` },
          tour,
        ),
      );

      try {
        await resetTeardownTour(page);
      } catch (error) {
        console.log(`teardown reset ${slug} ${flow.id} ${palette} error=${errorDetail(error)}`);
      }
    }
  } catch (error) {
    checks.push(
      check(`teardown-${slug}-desktop-${palette}-setup`, false, 'live workbench ready', {
        error: errorDetail(error),
      }),
    );
  } finally {
    await context.close();
  }

  return checks;
}

async function probeMobileTeardown(
  browser: Browser,
  source: (typeof PROJECT_SOURCES)[number],
  palette: Palette,
  siteBase: URL,
  expected: TeardownCounts,
  outDir: string,
): Promise<SiteProbeCheck[]> {
  const checks: SiteProbeCheck[] = [];
  const slug = source.meta.slug;
  const context = await browser.newContext(contextOptions(palette, VIEWPORTS[1] as Viewport));

  try {
    const page = await openPage(context, new URL(projectPath(source), siteBase));
    await activateProjectViewer(page);

    try {
      await page.waitForFunction(
        () =>
          document
            .querySelector('[data-xploder-lettering-column]')
            ?.getAttribute('data-xploder-lettering-column') === 'shown',
        undefined,
        { timeout: WAIT_TIMEOUT_MS },
      );
    } catch {
      // The assertion below reports the observed state.
    }

    const compact = await page.evaluate(() => ({
      column:
        document
          .querySelector('[data-xploder-lettering-column]')
          ?.getAttribute('data-xploder-lettering-column') ?? null,
      rows: document.querySelectorAll('[data-xploder-column-row]').length,
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }));
    checks.push(
      check(
        `teardown-${slug}-compact-column-${palette}`,
        compact.column === 'shown' &&
          compact.rows === expected.components &&
          compact.scrollWidth <= compact.clientWidth,
        { column: 'shown', rows: expected.components, noOverflow: true },
        compact,
      ),
    );
    await page.screenshot({
      path: join(outDir, `teardown-${slug}-compact-mobile-${palette}.png`),
    });

    if (palette === 'light') {
      const panel = await openComponentPanel(page);
      checks.push(
        check(`teardown-${slug}-mobile-panel`, panel.attached && panel.visible, true, panel),
      );
      await page.screenshot({
        path: join(outDir, `teardown-${slug}-panel-mobile-light.png`),
      });
      await closeComponentPanel(page);
      await navigatePage(page, new URL(projectPath(source), siteBase));
      await activateProjectViewer(page);
      await page.waitForTimeout(500);

      const firstFlow = source.flows[0];
      if (firstFlow === undefined) {
        checks.push(
          check(`teardown-${slug}-mobile-tour`, false, 'first flow reaches ended', 'no flows'),
        );
      } else {
        let tour: TeardownTourResult;
        try {
          tour = await runTeardownTour(page, firstFlow);
        } catch (error) {
          tour = {
            ended: false,
            elapsedMs: 0,
            timeoutMs: tourTimeoutMs(firstFlow.path.length),
            position: null,
            state: null,
          };
          console.log(`teardown tour ${slug} ${firstFlow.id} mobile error=${errorDetail(error)}`);
        }

        console.log(
          `teardown tour ${slug} ${firstFlow.id} mobile elapsedMs=${tour.elapsedMs} position=${JSON.stringify(tour.position)}`,
        );
        await page.screenshot({
          path: join(outDir, `teardown-${slug}-tour-${firstFlow.id}-ended-mobile-light.png`),
        });
        checks.push(
          check(
            `teardown-${slug}-mobile-tour`,
            tour.ended &&
              tour.position === `Step ${firstFlow.path.length} of ${firstFlow.path.length}`,
            {
              flowId: firstFlow.id,
              state: 'ended',
              position: `Step ${firstFlow.path.length} of ${firstFlow.path.length}`,
            },
            tour,
          ),
        );
        await resetTeardownTour(page).catch((error: unknown) => {
          console.log(`teardown reset ${slug} ${firstFlow.id} mobile error=${errorDetail(error)}`);
        });
      }
    }
  } catch (error) {
    checks.push(
      check(`teardown-${slug}-mobile-${palette}-setup`, false, 'compact teardown ready', {
        error: errorDetail(error),
      }),
    );
  } finally {
    await context.close();
  }

  return checks;
}

async function runTeardownGroup(
  browser: Browser,
  siteBase: URL,
  siteDir: string | undefined,
  outDir: string,
): Promise<SiteProbeGroupResult> {
  const checks: SiteProbeCheck[] = [];

  if (siteDir === undefined) {
    throw new CliError(EXIT.USAGE, 'group teardown requires --serve <dir>');
  }

  for (const source of PROJECT_SOURCES) {
    const slug = source.meta.slug;
    // The no-JS outline (S10) lists layers and their parts only; flows render in the live workbench.
    const { layers, components } = expectedTeardownCounts(source);
    const expected = { layers, components };
    try {
      const html = await readFile(join(siteDir, projectOutlinePath(source)), 'utf8');
      const actual = outlineCountsFromHtml(html);
      checks.push(
        check(
          `teardown-${slug}-outline-counts`,
          actual.present && actual.layers === layers && actual.components === components,
          expected,
          actual,
        ),
      );
    } catch {
      checks.push(
        check(`teardown-${slug}-outline-counts`, false, expected, {
          present: false,
          error: 'exported outline missing',
        }),
      );
    }
  }

  for (const palette of PALETTES) {
    for (const source of PROJECT_SOURCES) {
      const expected = expectedTeardownCounts(source);
      checks.push(
        ...(await probeDesktopTeardown(browser, source, palette, siteBase, expected, outDir)),
      );
    }
  }

  for (const palette of PALETTES) {
    for (const source of PROJECT_SOURCES) {
      const expected = expectedTeardownCounts(source);
      checks.push(
        ...(await probeMobileTeardown(browser, source, palette, siteBase, expected, outDir)),
      );
    }
  }

  return groupResult('teardown', checks);
}

async function runGroup(
  group: SiteProbeGroup,
  browser: Browser,
  options: SiteProbeOptions,
  browserVersion: string,
): Promise<SiteProbeGroupResult> {
  if (group === 'cls') return await runClsGroup(browser, options, browserVersion);

  if (options.siteBase === undefined) {
    throw new CliError(EXIT.USAGE, `group ${group} requires a site URL or --serve <dir>`);
  }

  switch (group) {
    case 'drill':
      return await runDrillGroup(browser, options.siteBase);
    case 'hero':
      return await runHeroGroup(browser, options.siteBase, options.outDir);
    case 'reduced-motion':
      return await runReducedMotionGroup(browser, options.siteBase);
    case 'nojs':
      return await runNoJsGroup(browser, options.siteBase, options.siteDir, options.outDir);
    case 'routes':
      return await runRoutesGroup(browser, options.siteBase);
    case 'draws':
      return await runDrawsGroup(browser, options.siteBase);
    case 'teardown':
      return await runTeardownGroup(browser, options.siteBase, options.siteDir, options.outDir);
  }
}

async function writeGroupArtifacts(outDir: string, result: SiteProbeGroupResult): Promise<void> {
  const lines = [
    `group: ${result.group}`,
    `result: ${result.pass ? 'PASS' : 'FAIL'}`,
    ...result.checks.map(
      (entry) =>
        `${entry.pass ? 'PASS' : 'FAIL'} ${entry.name}: expected ${JSON.stringify(entry.expected)} actual ${JSON.stringify(entry.actual)}`,
    ),
    `summary: ${result.pass ? 'PASS' : 'FAIL'} (${result.checks.length} checks)`,
  ];
  await writeFile(join(outDir, `${result.group}.log.txt`), `${lines.join('\n')}\n`, 'utf8');
  await writeFile(
    join(outDir, `${result.group}.json`),
    `${JSON.stringify(
      {
        group: result.group,
        pass: result.pass,
        checks: result.checks,
        data: result.data,
      },
      null,
      2,
    )}\n`,
    'utf8',
  );
}

export async function runSiteProbe(options: SiteProbeOptions): Promise<SiteProbeReport> {
  await mkdir(options.outDir, { recursive: true });
  const browser = await launch({
    args: [
      '--disable-background-timer-throttling',
      '--disable-backgrounding-occluded-windows',
      '--disable-renderer-backgrounding',
      '--disable-features=IntensiveWakeUpThrottling',
    ],
  });
  const browserVersion = chromiumVersion(browser);
  const groups: SiteProbeGroupResult[] = [];

  try {
    for (const group of options.groups) {
      const result = await runGroup(group, browser, options, browserVersion);
      groups.push(result);

      for (const entry of result.checks) {
        console.log(
          `${entry.pass ? 'PASS' : 'FAIL'} ${entry.name}: expected ${JSON.stringify(entry.expected)} actual ${JSON.stringify(entry.actual)}`,
        );
      }
      console.log(`${group}: ${result.pass ? 'PASS' : 'FAIL'} (${result.checks.length} checks)`);
      await writeGroupArtifacts(options.outDir, result);

      if (group === 'cls') {
        await writeFile(
          join(options.outDir, 'cls.json'),
          `${JSON.stringify(result.data, null, 2)}\n`,
          'utf8',
        );
      }
    }

    const report: SiteProbeReport = {
      kind: 'site-probe',
      version: 2,
      baseUrl: (options.siteBase ?? options.fixturesBase)?.href ?? '',
      chromium: browserVersion,
      groups,
      pass: groups.every((group) => group.pass),
    };
    await writeFile(
      join(options.outDir, 'site-probe.json'),
      `${JSON.stringify(report, null, 2)}\n`,
      'utf8',
    );
    return report;
  } finally {
    await browser.close();
  }
}
