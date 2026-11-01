import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';

import type { BrowserContextOptions, Page } from 'playwright';

import { parseCli, parseUrl } from '../args.ts';
import {
  AXE_TAGS,
  axeVerdict,
  parseAxeSelection,
  readDimLedger,
  runAxe,
  tagDimmedElements,
  type AxeRuleResult,
  type DimLedgerSource,
} from '../a11y-axe.ts';
import { launch } from '../browser.ts';
import { CliError, EXIT, EXIT_DESCRIPTIONS } from '../exit-codes.ts';
import { run } from '../log.ts';
import { assertReachable } from '../reach.ts';
import { serveDir, type ServedDir } from '../serve.ts';

type Palette = 'light' | 'dark';
type ViewportName = 'desktop' | 'mobile';
type FixtureId = 'a' | 'b' | 'c';

interface AxeArgs {
  values: {
    serve?: string;
    out?: string;
    states?: string;
    help?: boolean;
  };
  positionals: string[];
}

interface Viewport {
  readonly name: ViewportName;
  readonly width: number;
  readonly height: number;
  readonly isMobile: boolean;
  readonly hasTouch: boolean;
}

interface AxeState {
  readonly id: string;
  readonly fixture: FixtureId;
  readonly params: Readonly<Record<string, string>>;
  readonly panelOpen: boolean;
  readonly componentFocused?: boolean;
  readonly noWebgl?: boolean;
}

interface FixtureProject {
  readonly layers: readonly {
    readonly id: string;
    readonly components: readonly { readonly id: string }[];
  }[];
}

interface StateResult {
  readonly state: string;
  readonly url: string;
  readonly tagged: number;
  readonly dimLedger: readonly DimLedgerSource[];
  readonly violations: readonly AxeRuleResult[];
  readonly incomplete: readonly AxeRuleResult[];
}

interface CellDocument {
  readonly kind: 'a11y-axe';
  readonly version: 1;
  readonly palette: Palette;
  readonly viewport: Omit<Viewport, 'name'> & { readonly name: ViewportName };
  readonly tags: readonly string[];
  readonly states: readonly StateResult[];
}

interface CellSummary {
  readonly id: string;
  readonly palette: Palette;
  readonly viewport: ViewportName;
  readonly states: number;
  readonly serious: number;
  readonly critical: number;
  readonly moderate: number;
  readonly minor: number;
  readonly incomplete: number;
  readonly ledger: number;
}

interface SummaryLedgerEntry {
  readonly cell: string;
  readonly state: string;
  readonly selector: string;
  readonly ratio: number | null;
  readonly layer: string;
  readonly opacity: number;
}

interface AxeSummary {
  readonly serious: number;
  readonly critical: number;
  readonly moderate: number;
  readonly minor: number;
  readonly incomplete: number;
  readonly ledger: readonly SummaryLedgerEntry[];
  readonly cells: readonly CellSummary[];
  readonly failingRules: readonly string[];
}

const PALETTES: readonly Palette[] = ['light', 'dark'];
const VIEWPORTS: readonly Viewport[] = [
  { name: 'desktop', width: 1280, height: 800, isMobile: false, hasTouch: false },
  { name: 'mobile', width: 390, height: 844, isMobile: true, hasTouch: true },
] as const;
const VIEWER_SELECTOR = '[data-xploder-ready="true"]';
const NO_WEBGL_SELECTOR = '[data-xploder-webgl="unavailable"]';
const WAIT_TIMEOUT_MS = 30_000;
const FRAME_COUNT = 2;
const MAX_TABS_TO_COMPONENTS = 12;
const DEFAULT_OUT = '.evidence/axe';

const usage = `Usage: pnpm a11y:axe <url> [options]
       pnpm a11y:axe --serve <dir> [options]

Runs axe-core across the S08 palette, viewport and engine-state matrix.

Options:
  --serve <dir>   serve a fixture export in-process and scan /dev/engine
  --out <dir>     output directory (default: ${DEFAULT_OUT})
  --states <list> "all" or a comma-separated state-id list
  --help          show this help`;

function exitCodeTable(): string {
  return Object.entries(EXIT)
    .map(([name, code]) => `${code} ${EXIT_DESCRIPTIONS[name as keyof typeof EXIT]}`)
    .join('\n');
}

function stateList(firstLayer: string): readonly AxeState[] {
  return [
    { id: 'a-idle', fixture: 'a', params: {}, panelOpen: false },
    {
      id: 'a-detail',
      fixture: 'a',
      params: { select: 'tide-repository' },
      panelOpen: true,
    },
    {
      id: 'a-case-study',
      fixture: 'a',
      params: { panel: 'case-study' },
      panelOpen: true,
    },
    {
      id: 'a-tour-step1',
      fixture: 'a',
      params: { tour: 'paused', step: '0' },
      panelOpen: false,
    },
    {
      id: 'a-component-focused',
      fixture: 'a',
      params: {},
      panelOpen: false,
      componentFocused: true,
    },
    {
      id: 'a-layer-focus',
      fixture: 'a',
      params: { focus: firstLayer },
      panelOpen: false,
    },
    { id: 'b-idle', fixture: 'b', params: {}, panelOpen: false },
    {
      id: 'b-detail',
      fixture: 'b',
      params: { select: 'reconciliation-ledger' },
      panelOpen: true,
    },
    { id: 'c-idle', fixture: 'c', params: {}, panelOpen: false },
    {
      id: 'c-component-focused',
      fixture: 'c',
      params: {},
      panelOpen: false,
      componentFocused: true,
    },
    { id: 'no-webgl', fixture: 'a', params: {}, panelOpen: false, noWebgl: true },
  ];
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

function stateUrl(base: URL, state: AxeState): URL {
  const url = new URL(base.href);
  url.searchParams.set('fixture', state.fixture);
  url.searchParams.set('state', 'exploded');

  for (const [name, value] of Object.entries(state.params)) {
    url.searchParams.set(name, value);
  }

  return url;
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

async function waitForState(page: Page, state: AxeState, palette: Palette): Promise<void> {
  await page.waitForSelector(state.noWebgl === true ? NO_WEBGL_SELECTOR : VIEWER_SELECTOR, {
    timeout: WAIT_TIMEOUT_MS,
  });
  await page.evaluate(async () => {
    await document.fonts.ready;
  });

  await page.waitForFunction(
    ({ expectedPalette, expectedPanelOpen, noWebgl, focusLayer, tourStatus }) => {
      if (!document.documentElement.classList.contains(expectedPalette)) return false;

      const viewer = document.querySelector('[data-xploder-ready="true"]');
      if (noWebgl) {
        return document.querySelector('[data-xploder-webgl="unavailable"]') !== null;
      }
      if (viewer === null) return false;
      if (viewer.getAttribute('data-xploder-state') !== 'exploded') return false;
      if (viewer.getAttribute('data-xploder-tweening') !== 'false') return false;
      if (expectedPanelOpen && viewer.getAttribute('data-xploder-panel-ready') !== 'true') {
        return false;
      }
      if (focusLayer !== null && viewer.getAttribute('data-xploder-focus') !== focusLayer) {
        return false;
      }
      if (tourStatus !== null && viewer.getAttribute('data-xploder-tour') !== tourStatus) {
        return false;
      }

      return true;
    },
    {
      expectedPalette: palette,
      expectedPanelOpen: state.panelOpen,
      noWebgl: state.noWebgl === true,
      focusLayer: state.params.focus ?? null,
      tourStatus: state.params.tour === 'paused' ? 'paused' : null,
    },
    { timeout: WAIT_TIMEOUT_MS },
  );
}

async function focusFirstComponent(page: Page): Promise<void> {
  await page.locator(VIEWER_SELECTOR).focus();

  for (let attempt = 0; attempt < MAX_TABS_TO_COMPONENTS; attempt += 1) {
    await page.keyboard.press('Tab');
    const focused = await page.evaluate(() => {
      const active = document.activeElement;
      return (
        active instanceof HTMLElement &&
        active.matches('[data-xploder-proxy]') &&
        active.closest('[data-xploder-ready="true"]') !== null
      );
    });

    if (focused) return;
  }

  throw new Error('Tab did not reach the Components navigator');
}

async function captureState(
  page: Page,
  url: URL,
  state: AxeState,
  palette: Palette,
  componentLayers: Readonly<Record<string, string>>,
): Promise<StateResult> {
  if (state.noWebgl === true) {
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

  await waitForState(page, state, palette);
  if (state.componentFocused === true) await focusFirstComponent(page);
  await waitForFrames(page, FRAME_COUNT);

  const tagged = await tagDimmedElements(page);
  const results = await runAxe(page);
  const dimLedger = await readDimLedger(page, results, componentLayers);

  return {
    state: state.id,
    url: url.href,
    tagged,
    dimLedger,
    violations: results.violations,
    incomplete: results.incomplete,
  };
}

async function projectLayers(): Promise<{
  readonly firstLayer: string;
  readonly componentLayers: Readonly<Record<string, string>>;
}> {
  const root = new URL('../../../../packages/xploder/test/fixtures/', import.meta.url);
  const filenames = [
    'project-a-ui-app.json',
    'project-b-pipeline.json',
    'project-c-lockerbay.json',
  ];
  const documents = await Promise.all(
    filenames.map(async (filename) => {
      const source = await readFile(new URL(filename, root), 'utf8');
      return JSON.parse(source) as FixtureProject;
    }),
  );
  const componentLayers: Record<string, string> = {};

  for (const project of documents) {
    for (const layer of project.layers) {
      for (const component of layer.components) componentLayers[component.id] = layer.id;
    }
  }

  const firstLayer = documents[0]?.layers[0]?.id;
  if (firstLayer === undefined) {
    throw new CliError(EXIT.INTERNAL, 'fixture A has no first layer');
  }

  return { firstLayer, componentLayers };
}

async function prepareOut(dir: string): Promise<void> {
  try {
    await mkdir(dir, { recursive: true });
    const info = await stat(dir);
    if (!info.isDirectory()) throw new Error('not a directory');
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

function verdict(result: StateResult) {
  return axeVerdict(result, { dimLedger: result.dimLedger });
}

function mergeCounts(
  results: readonly StateResult[],
): Omit<AxeSummary, 'ledger' | 'cells' | 'failingRules'> {
  const verdicts = results.map(verdict);

  return {
    serious: verdicts.reduce((total, verdict) => total + verdict.counts.serious, 0),
    critical: verdicts.reduce((total, verdict) => total + verdict.counts.critical, 0),
    moderate: verdicts.reduce((total, verdict) => total + verdict.counts.moderate, 0),
    minor: verdicts.reduce((total, verdict) => total + verdict.counts.minor, 0),
    incomplete: verdicts.reduce((total, verdict) => total + verdict.counts.incomplete, 0),
  };
}

function failingRules(states: readonly StateResult[]): readonly string[] {
  return [
    ...new Set(states.flatMap((state) => verdict(state).failing.map((result) => result.id))),
  ].sort();
}

function logCell(cell: CellSummary): void {
  console.log(
    `axe ${cell.id}: ${cell.states} states | serious ${cell.serious} critical ${cell.critical} moderate ${cell.moderate} minor ${cell.minor} | incomplete ${cell.incomplete} ledger ${cell.ledger}`,
  );
}

export async function main(argv: string[]): Promise<number> {
  const { values, positionals } = parseCli<AxeArgs>(argv, {
    options: {
      serve: { type: 'string' },
      out: { type: 'string' },
      states: { type: 'string' },
      help: { type: 'boolean' },
    },
    allowPositionals: true,
  });

  if (values.help) {
    console.log(`${usage}\n\nExit codes:\n${exitCodeTable()}`);
    return EXIT.OK;
  }
  if (values.serve !== undefined && positionals.length > 0) {
    throw new CliError(EXIT.USAGE, 'use either <url> or --serve <dir>, not both');
  }
  if (values.serve === undefined && positionals.length !== 1) {
    throw new CliError(EXIT.USAGE, 'expected exactly one URL or --serve <dir>');
  }

  const { firstLayer, componentLayers } = await projectLayers();
  const allStates = stateList(firstLayer);
  const selectedIds = parseAxeSelection(
    values.states,
    allStates.map((state) => state.id),
  );
  const states = allStates.filter((state) => selectedIds.includes(state.id));
  const outDir = values.out ?? resolve(process.cwd(), DEFAULT_OUT);
  await prepareOut(outDir);

  let serving: ServedDir | undefined;
  let target: URL;

  if (values.serve !== undefined) {
    const dir = resolve(process.cwd(), values.serve);
    try {
      const info = await stat(dir);
      if (!info.isDirectory()) throw new Error('not a directory');
    } catch {
      throw new CliError(EXIT.USAGE, `directory not found: ${dir}`);
    }

    try {
      serving = await serveDir(dir);
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      throw new CliError(EXIT.INTERNAL, `could not serve ${dir}: ${detail}`);
    }

    target = new URL('/dev/engine', serving.url);
  } else {
    target = parseUrl(positionals[0]);
  }

  try {
    await assertReachable(target);
    const browser = await launch();
    const cells: CellSummary[] = [];
    const ledger: SummaryLedgerEntry[] = [];
    const allResults: StateResult[] = [];

    try {
      for (const palette of PALETTES) {
        for (const viewport of VIEWPORTS) {
          const cellId = `${palette}/${viewport.name}`;
          const context = await browser.newContext(contextOptions(palette, viewport));
          const stateResults: StateResult[] = [];

          try {
            for (const state of states) {
              const page = await context.newPage();
              try {
                const result = await captureState(
                  page,
                  stateUrl(target, state),
                  state,
                  palette,
                  componentLayers,
                );
                const stateVerdict = verdict(result);

                for (const entry of result.dimLedger) {
                  const source = stateVerdict.ledger.find(
                    (candidate) => candidate.selector === entry.selector,
                  );
                  if (source !== undefined) {
                    ledger.push({ cell: cellId, state: state.id, ...source });
                  }
                }

                stateResults.push(result);
                allResults.push(result);
              } finally {
                await page.close();
              }
            }
          } finally {
            await context.close();
          }

          const cellVerdicts = stateResults.map(verdict);
          const document: CellDocument = {
            kind: 'a11y-axe',
            version: 1,
            palette,
            viewport: { ...viewport },
            tags: AXE_TAGS,
            states: stateResults,
          };
          const cell: CellSummary = {
            id: cellId,
            palette,
            viewport: viewport.name,
            states: stateResults.length,
            serious: cellVerdicts.reduce((total, verdict) => total + verdict.counts.serious, 0),
            critical: cellVerdicts.reduce((total, verdict) => total + verdict.counts.critical, 0),
            moderate: cellVerdicts.reduce((total, verdict) => total + verdict.counts.moderate, 0),
            minor: cellVerdicts.reduce((total, verdict) => total + verdict.counts.minor, 0),
            incomplete: cellVerdicts.reduce(
              (total, verdict) => total + verdict.counts.incomplete,
              0,
            ),
            ledger: cellVerdicts.reduce((total, verdict) => total + verdict.ledger.length, 0),
          };

          cells.push(cell);
          await writeJson(join(outDir, `axe-${palette}-${viewport.name}.json`), document);
          logCell(cell);
        }
      }
    } finally {
      await browser.close();
    }

    const totals = mergeCounts(allResults);
    const summary: AxeSummary = {
      ...totals,
      ledger,
      cells,
      failingRules: failingRules(allResults),
    };
    await writeJson(join(outDir, 'axe-summary.json'), summary);
    console.log(
      `axe total: serious ${summary.serious} critical ${summary.critical} moderate ${summary.moderate} minor ${summary.minor} | incomplete ${summary.incomplete} ledger ${summary.ledger.length}${summary.failingRules.length === 0 ? '' : ` | failing ${summary.failingRules.join(', ')}`}`,
    );

    return totals.serious + totals.critical > 0 ? EXIT.BUDGET : EXIT.OK;
  } finally {
    await serving?.close();
  }
}

await run(main);
