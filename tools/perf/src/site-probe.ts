import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import type { BrowserContextOptions, Page } from 'playwright';

import { chromiumVersion, launch } from './browser.ts';
import { CliError, EXIT } from './exit-codes.ts';

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

interface Viewport {
  name: ViewportName;
  width: number;
  height: number;
  isMobile: boolean;
  hasTouch: boolean;
}

interface ProbeRoute {
  label: string;
  path: string;
  base: 'site' | 'fixtures';
  hasViewer: boolean;
}

export interface ClsCell extends ClsVerdict {
  route: string;
  viewport: ViewportName;
  palette: Palette;
  entries: ClsEntry[];
}

export interface SiteProbeClsReport {
  kind: 'site-probe-cls';
  version: 1;
  baseUrl: string;
  chromium: string;
  cells: ClsCell[];
  pass: boolean;
}

export interface ClsProbeOptions {
  siteBase?: URL;
  fixturesBase?: URL;
  outDir: string;
}

interface ClsWindow {
  __siteProbeCls?: {
    entries: ClsEntry[];
    ready: boolean;
    readyAt: number | null;
  };
}

const SITE_ROUTES: readonly Omit<ProbeRoute, 'base'>[] = [
  { label: '/', path: '/', hasViewer: false },
  { label: '/projects', path: '/projects', hasViewer: false },
  {
    label: '/projects/websocket-inspector',
    path: '/projects/websocket-inspector',
    hasViewer: false,
  },
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
const HYDRATION_DELAY_MS = 250;

export function evaluateCls(entries: readonly ClsEntry[]): ClsVerdict {
  const total = entries.reduce((sum, entry) => sum + entry.value, 0);

  return {
    total,
    pass: total === 0,
    sources: entries.flatMap((entry) => entry.sources),
  };
}

export function clsRoutes(siteBase?: URL, fixturesBase?: URL): ProbeRoute[] {
  return [
    ...(siteBase === undefined
      ? []
      : SITE_ROUTES.map((route) => ({ ...route, base: 'site' as const }))),
    ...(fixturesBase === undefined ? [] : [{ ...FIXTURE_ROUTE, base: 'fixtures' as const }]),
  ];
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

async function availableRoutes(routes: readonly ProbeRoute[], options: ClsProbeOptions) {
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

  let response;
  try {
    response = await page.goto(url.href, { waitUntil: 'load', timeout: WAIT_TIMEOUT_MS });
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new CliError(EXIT.UNREACHABLE, `unreachable: ${url.href}: ${detail}`);
  }

  if (response === null || response.status() >= 400) {
    throw new CliError(
      EXIT.UNREACHABLE,
      `unreachable: ${url.href} returned HTTP ${response?.status() ?? 'no response'}`,
    );
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

export async function runClsProbe(options: ClsProbeOptions): Promise<SiteProbeClsReport> {
  const routes = await availableRoutes(clsRoutes(options.siteBase, options.fixturesBase), options);
  if (routes.length === 0) {
    throw new CliError(EXIT.USAGE, 'provide a URL, --serve <dir>, or --fixtures <dir>');
  }

  const browser = await launch();
  const browserVersion = chromiumVersion(browser);
  const cells: ClsCell[] = [];

  try {
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
  } finally {
    await browser.close();
  }

  const report: SiteProbeClsReport = {
    kind: 'site-probe-cls',
    version: 1,
    baseUrl: (options.siteBase ?? options.fixturesBase)?.href ?? '',
    chromium: browserVersion,
    cells,
    pass: cells.every((cell) => cell.pass),
  };
  await writeFile(join(options.outDir, 'cls.json'), `${JSON.stringify(report, null, 2)}\n`);
  return report;
}
