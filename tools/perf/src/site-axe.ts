import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

import type { BrowserContextOptions, Page } from 'playwright';

import {
  AXE_TAGS,
  axeVerdict,
  runAxe,
  settleAnimations,
  type AxeVerdictCounts,
  type AxeRuleResult,
} from './a11y-axe.ts';
import { chromiumVersion, launch } from './browser.ts';
import { CliError, EXIT } from './exit-codes.ts';

export const SITE_ROUTE_GROUPS = ['home', 'projects', 'project'] as const;
export type SiteRouteGroup = (typeof SITE_ROUTE_GROUPS)[number];

export const SITE_STATE_IDS = [
  'home',
  'home-poster',
  'home-reduced',
  'projects',
  'project-poster',
  'project-idle',
  'project-case-study',
  'project-detail',
  'project-flows-step1',
  'project-no-webgl',
] as const;
export type SiteStateId = (typeof SITE_STATE_IDS)[number];

export interface SiteStateDefinition {
  readonly id: SiteStateId;
  readonly routeGroup: SiteRouteGroup;
  readonly path: string;
  readonly reducedMotion?: 'reduce';
}

export const SITE_STATES: readonly SiteStateDefinition[] = [
  { id: 'home', routeGroup: 'home', path: '/' },
  { id: 'home-poster', routeGroup: 'home', path: '/' },
  { id: 'home-reduced', routeGroup: 'home', path: '/', reducedMotion: 'reduce' },
  { id: 'projects', routeGroup: 'projects', path: '/projects' },
  {
    id: 'project-poster',
    routeGroup: 'project',
    path: '/projects/websocket-inspector',
  },
  { id: 'project-idle', routeGroup: 'project', path: '/projects/websocket-inspector' },
  {
    id: 'project-case-study',
    routeGroup: 'project',
    path: '/projects/websocket-inspector',
  },
  { id: 'project-detail', routeGroup: 'project', path: '/projects/websocket-inspector' },
  {
    id: 'project-flows-step1',
    routeGroup: 'project',
    path: '/projects/websocket-inspector',
  },
  {
    id: 'project-no-webgl',
    routeGroup: 'project',
    path: '/projects/websocket-inspector',
  },
] as const;

export type Palette = 'light' | 'dark';
export type ViewportName = 'desktop' | 'mobile';

export interface SiteViewport {
  readonly name: ViewportName;
  readonly width: number;
  readonly height: number;
  readonly isMobile: boolean;
  readonly hasTouch: boolean;
}

export interface SiteAxeStateResult {
  readonly state: SiteStateId;
  readonly routeGroup: SiteRouteGroup;
  readonly path: string;
  readonly url: string;
  readonly violations: readonly AxeRuleResult[];
  readonly incomplete: readonly AxeRuleResult[];
}

export interface SiteAxeCellDocument {
  readonly kind: 'site-axe';
  readonly version: 1;
  readonly routeGroup: SiteRouteGroup;
  readonly palette: Palette;
  readonly viewport: SiteViewport;
  readonly tags: readonly string[];
  readonly states: readonly SiteAxeStateResult[];
}

export interface SiteAxeCellSummary extends AxeVerdictCounts {
  readonly id: string;
  readonly routeGroup: SiteRouteGroup;
  readonly palette: Palette;
  readonly viewport: ViewportName;
  readonly states: number;
}

export interface SiteAxeAggregate extends AxeVerdictCounts {
  readonly failingRules: readonly string[];
  readonly exitCode: number;
}

export interface SiteAxeSummary extends SiteAxeAggregate {
  readonly kind: 'site-axe-summary';
  readonly version: 1;
  readonly baseUrl: string;
  readonly chromium: string;
  readonly tags: readonly string[];
  readonly states: readonly SiteStateId[];
  readonly cells: readonly SiteAxeCellSummary[];
}

export interface SiteAxeOptions {
  readonly outDir: string;
  readonly routeGroups?: readonly SiteRouteGroup[];
  readonly log?: (line: string) => void;
}

const PALETTES: readonly Palette[] = ['light', 'dark'];
const VIEWPORTS: readonly SiteViewport[] = [
  { name: 'desktop', width: 1280, height: 800, isMobile: false, hasTouch: false },
  { name: 'mobile', width: 390, height: 844, isMobile: true, hasTouch: true },
] as const;
const WAIT_TIMEOUT_MS = 30_000;
const FRAME_COUNT = 2;
const POSTER_SETTLE_MS = 4_000;
const MAX_TABS_TO_PROXY = 16;
const VIEWER_SELECTOR = '[data-xploder-ready="true"]';
const PANEL_READY_SELECTOR = '[data-xploder-ready="true"][data-xploder-panel-ready="true"]';

function contextOptions(palette: Palette, viewport: SiteViewport): BrowserContextOptions {
  return {
    viewport: { width: viewport.width, height: viewport.height },
    deviceScaleFactor: 1,
    isMobile: viewport.isMobile,
    hasTouch: viewport.hasTouch,
    colorScheme: palette,
  };
}

function stateUrl(base: URL, state: SiteStateDefinition): URL {
  return new URL(state.path, base);
}

async function waitForFrames(page: Page, count: number): Promise<void> {
  await page.evaluate(async (frameCount) => {
    for (let index = 0; index < frameCount; index += 1) {
      await new Promise<void>((resolveFrame) => {
        requestAnimationFrame(() => resolveFrame());
      });
    }
  }, count);
}

async function waitForLiveState(page: Page, states: readonly string[]): Promise<void> {
  await page.waitForFunction(
    (accepted) => {
      const live = document.querySelector('[data-site-live][data-site-live-state]');
      const value = live?.getAttribute('data-site-live-state');
      return value !== null && value !== undefined && accepted.includes(value);
    },
    states,
    { timeout: WAIT_TIMEOUT_MS },
  );
}

async function waitForProjectReady(page: Page): Promise<void> {
  const control = page.locator('[data-site-control="explore-3d"]');
  await control.waitFor({ state: 'visible', timeout: WAIT_TIMEOUT_MS });
  await control.click({ timeout: WAIT_TIMEOUT_MS });
  await page.locator(VIEWER_SELECTOR).waitFor({ state: 'attached', timeout: WAIT_TIMEOUT_MS });
}

async function waitForPanelReady(page: Page): Promise<void> {
  await page.locator(PANEL_READY_SELECTOR).waitFor({ state: 'attached', timeout: WAIT_TIMEOUT_MS });
}

async function focusFirstProxyAndOpen(page: Page): Promise<void> {
  await page.locator(VIEWER_SELECTOR).focus();

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

async function installNoWebgl(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (
      this: HTMLCanvasElement,
      contextId: string,
      ...args: unknown[]
    ): RenderingContext | null {
      if (contextId === 'webgl' || contextId === 'webgl2') return null;
      return original.call(this, contextId, ...args) as RenderingContext | null;
    } as typeof HTMLCanvasElement.prototype.getContext;
  });
}

async function assertPosterOnly(page: Page, routeGroup: 'home' | 'project'): Promise<void> {
  const actual = await page.evaluate(() => ({
    canvases: document.querySelectorAll('canvas').length,
    ready: document.querySelector('[data-xploder-ready="true"]') !== null,
    posterVisible:
      document.querySelector('[data-site-poster]')?.getBoundingClientRect().width !== 0,
  }));

  if (actual.canvases !== 0 || actual.ready || !actual.posterVisible) {
    throw new Error(
      `${routeGroup} poster state is not pre-interaction: canvas=${actual.canvases} ready=${actual.ready} posterVisible=${actual.posterVisible}`,
    );
  }
}

async function prepareState(page: Page, state: SiteStateDefinition): Promise<void> {
  switch (state.id) {
    case 'home': {
      await page
        .locator('[data-site-poster]')
        .waitFor({ state: 'visible', timeout: WAIT_TIMEOUT_MS });
      await page.mouse.move(16, 16);
      await waitForLiveState(page, ['revealed', 'skipped']);
      break;
    }
    case 'home-poster': {
      await page
        .locator('[data-site-poster]')
        .waitFor({ state: 'visible', timeout: WAIT_TIMEOUT_MS });
      // S11.8 (D-19 amended, rfc.md §11.5 R11): an eager hero leaves the poster on its own, so its
      // lasting poster-only state is the Save-Data one. Gated builds keep the pre-interaction scan.
      const mode = await page.locator('[data-site-live]').getAttribute('data-site-live-mode');
      if (mode === 'eager') {
        await page.addInitScript(() => {
          Object.defineProperty(navigator, 'connection', { value: { saveData: true } });
        });
        await page.reload({ waitUntil: 'load', timeout: WAIT_TIMEOUT_MS });
        await page
          .locator('[data-site-poster]')
          .waitFor({ state: 'visible', timeout: WAIT_TIMEOUT_MS });
        await waitForLiveState(page, ['skipped']);
        await assertPosterOnly(page, 'home');
        break;
      }
      await page.waitForTimeout(POSTER_SETTLE_MS);
      await assertPosterOnly(page, 'home');
      const liveState = await page
        .locator('[data-site-live][data-site-live-state]')
        .getAttribute('data-site-live-state');
      if (liveState !== 'idle') {
        throw new Error(`home-poster live state is ${JSON.stringify(liveState)}, expected "idle"`);
      }
      break;
    }
    case 'home-reduced': {
      await waitForLiveState(page, ['skipped']);
      break;
    }
    case 'projects': {
      break;
    }
    case 'project-poster': {
      await page
        .locator('[data-site-poster]')
        .waitFor({ state: 'visible', timeout: WAIT_TIMEOUT_MS });
      await page
        .locator('[data-site-explore-static]')
        .waitFor({ state: 'visible', timeout: WAIT_TIMEOUT_MS });
      await page
        .locator('[data-site-control="explore-3d"]')
        .waitFor({ state: 'visible', timeout: WAIT_TIMEOUT_MS });
      await assertPosterOnly(page, 'project');
      break;
    }
    case 'project-idle': {
      await waitForProjectReady(page);
      break;
    }
    case 'project-case-study': {
      await waitForProjectReady(page);
      await page.locator('[data-site-control="case-study"]').click({ timeout: WAIT_TIMEOUT_MS });
      await waitForPanelReady(page);
      break;
    }
    case 'project-detail': {
      await waitForProjectReady(page);
      await focusFirstProxyAndOpen(page);
      await waitForPanelReady(page);
      break;
    }
    case 'project-flows-step1': {
      await waitForProjectReady(page);
      await page.getByRole('tab', { name: 'Flows', exact: true }).click();
      await page
        .locator('[data-site-tour-transport] button[aria-label*="Next"]')
        .click({ timeout: WAIT_TIMEOUT_MS });
      await page.waitForFunction(
        () =>
          document
            .querySelector('[data-xploder-ready="true"]')
            ?.getAttribute('data-xploder-tour') === 'paused',
        undefined,
        { timeout: WAIT_TIMEOUT_MS },
      );
      break;
    }
    case 'project-no-webgl': {
      const control = page.locator('[data-site-control="explore-3d"]');
      await control.waitFor({ state: 'visible', timeout: WAIT_TIMEOUT_MS });
      await control.click({ timeout: WAIT_TIMEOUT_MS });
      await page
        .locator('[data-xploder-webgl="unavailable"]')
        .waitFor({ state: 'attached', timeout: WAIT_TIMEOUT_MS });
      break;
    }
  }
}

async function captureState(
  page: Page,
  base: URL,
  state: SiteStateDefinition,
): Promise<SiteAxeStateResult> {
  await page.emulateMedia({ reducedMotion: state.reducedMotion ?? 'no-preference' });
  if (state.id === 'project-no-webgl') await installNoWebgl(page);

  const url = stateUrl(base, state);
  let response;
  try {
    response = await page.goto(url.href, { waitUntil: 'load', timeout: WAIT_TIMEOUT_MS });
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new CliError(EXIT.UNREACHABLE, `unreachable: ${url.href}: ${detail}`);
  }

  if (response !== null && response.status() >= 400) {
    throw new CliError(
      EXIT.UNREACHABLE,
      `unreachable: ${url.href} returned HTTP ${response.status()}`,
    );
  }

  try {
    await prepareState(page, state);
    await waitForFrames(page, FRAME_COUNT);
    await settleAnimations(page);
  } catch (error) {
    if (error instanceof CliError) throw error;
    const detail = error instanceof Error ? error.message : String(error);
    throw new CliError(
      EXIT.UNREACHABLE,
      `state ${state.id} did not become ready at ${url.href}: ${detail}`,
    );
  }

  const results = await runAxe(page, { tags: AXE_TAGS });

  return {
    state: state.id,
    routeGroup: state.routeGroup,
    path: state.path,
    url: url.href,
    violations: results.violations,
    incomplete: results.incomplete,
  };
}

export function summarizeAxeResults(
  results: readonly Pick<SiteAxeStateResult, 'violations' | 'incomplete'>[],
): SiteAxeAggregate {
  const verdicts = results.map((result) => axeVerdict(result));
  const counts: AxeVerdictCounts = {
    serious: verdicts.reduce((total, result) => total + result.counts.serious, 0),
    critical: verdicts.reduce((total, result) => total + result.counts.critical, 0),
    moderate: verdicts.reduce((total, result) => total + result.counts.moderate, 0),
    minor: verdicts.reduce((total, result) => total + result.counts.minor, 0),
    incomplete: verdicts.reduce((total, result) => total + result.counts.incomplete, 0),
  };
  const failingRules = [
    ...new Set(verdicts.flatMap((result) => result.failing.map((rule) => rule.id))),
  ].sort();

  return {
    ...counts,
    failingRules,
    exitCode: counts.serious + counts.critical > 0 ? EXIT.BUDGET : EXIT.OK,
  };
}

function summarizeCell(
  routeGroup: SiteRouteGroup,
  palette: Palette,
  viewport: ViewportName,
  results: readonly SiteAxeStateResult[],
): SiteAxeCellSummary {
  const aggregate = summarizeAxeResults(results);

  return {
    id: `${routeGroup}/${palette}/${viewport}`,
    routeGroup,
    palette,
    viewport,
    states: results.length,
    serious: aggregate.serious,
    critical: aggregate.critical,
    moderate: aggregate.moderate,
    minor: aggregate.minor,
    incomplete: aggregate.incomplete,
  };
}

async function prepareOut(dir: string): Promise<void> {
  try {
    await mkdir(dir, { recursive: true });
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new CliError(EXIT.USAGE, `--out is not writable: ${dir}: ${detail}`);
  }
}

async function writeJson(path: string, value: unknown): Promise<void> {
  try {
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new CliError(EXIT.USAGE, `could not write ${path}: ${detail}`);
  }
}

function logCell(cell: SiteAxeCellSummary, log: (line: string) => void): void {
  log(
    `axe-site ${cell.id}: ${cell.states} states | serious ${cell.serious} critical ${cell.critical} moderate ${cell.moderate} minor ${cell.minor} | incomplete ${cell.incomplete}`,
  );
}

export async function runSiteAxe(base: URL, options: SiteAxeOptions): Promise<SiteAxeSummary> {
  const routeGroups = [...new Set(options.routeGroups ?? SITE_ROUTE_GROUPS)];
  const states = SITE_STATES.filter((state) => routeGroups.includes(state.routeGroup));
  const log = options.log ?? console.log;

  await prepareOut(options.outDir);
  const browser = await launch();
  const chromium = chromiumVersion(browser);
  const summaryCells: SiteAxeCellSummary[] = [];
  const allResults: SiteAxeStateResult[] = [];

  try {
    for (const routeGroup of routeGroups) {
      const groupStates = states.filter((state) => state.routeGroup === routeGroup);

      for (const palette of PALETTES) {
        for (const viewport of VIEWPORTS) {
          const context = await browser.newContext(contextOptions(palette, viewport));
          const cellResults: SiteAxeStateResult[] = [];

          try {
            for (const state of groupStates) {
              const page = await context.newPage();
              try {
                cellResults.push(await captureState(page, base, state));
              } finally {
                await page.close();
              }
            }
          } finally {
            await context.close();
          }

          const document: SiteAxeCellDocument = {
            kind: 'site-axe',
            version: 1,
            routeGroup,
            palette,
            viewport,
            tags: AXE_TAGS,
            states: cellResults,
          };
          await writeJson(
            join(options.outDir, `axe-site-${routeGroup}-${palette}-${viewport.name}.json`),
            document,
          );

          const cell = summarizeCell(routeGroup, palette, viewport.name, cellResults);
          summaryCells.push(cell);
          allResults.push(...cellResults);
          logCell(cell, log);
        }
      }
    }
  } finally {
    await browser.close();
  }

  const aggregate = summarizeAxeResults(allResults);
  const summary: SiteAxeSummary = {
    kind: 'site-axe-summary',
    version: 1,
    baseUrl: base.href,
    chromium,
    tags: AXE_TAGS,
    states: states.map((state) => state.id),
    cells: summaryCells,
    ...aggregate,
  };
  await writeJson(join(options.outDir, 'axe-site-summary.json'), summary);
  log(
    `axe-site total: serious ${summary.serious} critical ${summary.critical} moderate ${summary.moderate} minor ${summary.minor} | incomplete ${summary.incomplete}${summary.failingRules.length === 0 ? '' : ` | failing ${summary.failingRules.join(', ')}`}`,
  );

  return summary;
}
