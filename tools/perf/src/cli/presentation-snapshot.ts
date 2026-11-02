import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

import type { BrowserContext, BrowserContextOptions, Page } from 'playwright';

import { parseCli, parseUrl } from '../args.ts';
import { launch } from '../browser.ts';
import { CliError, EXIT, EXIT_DESCRIPTIONS } from '../exit-codes.ts';
import { run } from '../log.ts';
import {
  PRESENTATION_LAYER_SELECTORS,
  snapshotPresentation,
  type PresentationEntry,
} from '../presentation-snapshot.ts';

interface PresentationSnapshotArgs {
  values: { url?: string; out?: string; help?: boolean };
  positionals: string[];
}

type Palette = 'light' | 'dark';
type ViewportName = 'desktop' | 'mobile';

interface PresentationState {
  readonly id: string;
  readonly fixture: 'a' | 'b' | 'c';
  readonly params: Readonly<Record<string, string>>;
  readonly panelOpen: boolean;
}

interface Viewport {
  readonly name: ViewportName;
  readonly width: number;
  readonly height: number;
  readonly isMobile: boolean;
  readonly hasTouch: boolean;
}

const PRESENTATION_STATES: readonly PresentationState[] = [
  { id: 'a-exploded-idle', fixture: 'a', params: {}, panelOpen: false },
  {
    id: 'a-highlight-tide-repository',
    fixture: 'a',
    params: { highlight: 'tide-repository' },
    panelOpen: false,
  },
  {
    id: 'a-select-tide-repository',
    fixture: 'a',
    params: { select: 'tide-repository' },
    panelOpen: true,
  },
  {
    id: 'a-panel-case-study',
    fixture: 'a',
    params: { panel: 'case-study' },
    panelOpen: true,
  },
  {
    id: 'b-select-reconciliation-ledger',
    fixture: 'b',
    params: { select: 'reconciliation-ledger' },
    panelOpen: true,
  },
  { id: 'c-exploded-idle', fixture: 'c', params: {}, panelOpen: false },
  { id: 'c-focus-client', fixture: 'c', params: { focus: 'client' }, panelOpen: false },
] as const;

const PALETTES: readonly Palette[] = ['light', 'dark'];
const VIEWPORTS: readonly Viewport[] = [
  { name: 'desktop', width: 1280, height: 800, isMobile: false, hasTouch: false },
  { name: 'mobile', width: 390, height: 844, isMobile: true, hasTouch: true },
] as const;
const VIEWER_SELECTOR = '[data-xploder-ready="true"]';
const WAIT_TIMEOUT_MS = 30_000;
const FRAME_COUNT = 2;

const usage = `Usage: node tools/perf/src/cli/presentation-snapshot.ts --url <base> --out <file>

Captures the fixed S08 presentation state matrix from an exported fixture build.

Options:
  --url <base>   base URL serving /dev/engine
  --out <file>   output JSON file
  --help         show this help`;

function exitCodeTable(): string {
  return Object.entries(EXIT)
    .map(([name, code]) => `${code} ${EXIT_DESCRIPTIONS[name as keyof typeof EXIT]}`)
    .join('\n');
}

function rootUrl(base: URL): URL {
  const root = new URL(base.href);
  if (!root.pathname.endsWith('/')) root.pathname += '/';
  return root;
}

function stateUrl(base: URL, state: PresentationState): URL {
  const url = new URL('dev/engine', rootUrl(base));
  url.searchParams.set('fixture', state.fixture);
  url.searchParams.set('state', 'exploded');

  for (const [name, value] of Object.entries(state.params)) {
    url.searchParams.set(name, value);
  }

  return url;
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

async function waitForFrames(page: Page, count: number): Promise<void> {
  await page.evaluate(async (frameCount) => {
    for (let index = 0; index < frameCount; index += 1) {
      await new Promise<void>((resolveFrame) => {
        requestAnimationFrame(() => resolveFrame());
      });
    }
  }, count);
}

async function waitForPresentation(
  page: Page,
  palette: Palette,
  panelOpen: boolean,
): Promise<void> {
  await page.waitForSelector(VIEWER_SELECTOR, { timeout: WAIT_TIMEOUT_MS });
  await page.evaluate(async () => {
    await document.fonts.ready;
  });
  await page.waitForFunction(
    ({ root, expectedPalette, expectedPanelOpen, layerSelectors }) => {
      const viewer = document.querySelector(root);
      if (viewer === null) return false;
      if (!document.documentElement.classList.contains(expectedPalette)) return false;
      if (viewer.getAttribute('data-xploder-state') !== 'exploded') return false;
      if (viewer.getAttribute('data-xploder-tweening') !== 'false') return false;
      if (viewer.getAttribute('data-xploder-lettering') !== 'shown') return false;
      if (expectedPanelOpen && viewer.getAttribute('data-xploder-panel-ready') !== 'true') {
        return false;
      }

      const roots = layerSelectors.flatMap((selector) => [...document.querySelectorAll(selector)]);
      return document.getAnimations().every((animation) => {
        const effect = animation.effect;
        const target = effect instanceof KeyframeEffect ? effect.target : null;
        if (!(target instanceof Element)) return true;
        if (!roots.some((layer) => layer === target || layer.contains(target))) return true;
        return animation.playState === 'finished' || animation.playState === 'idle';
      });
    },
    {
      root: VIEWER_SELECTOR,
      expectedPalette: palette,
      expectedPanelOpen: panelOpen,
      layerSelectors: [...PRESENTATION_LAYER_SELECTORS],
    },
    { timeout: WAIT_TIMEOUT_MS },
  );
  await waitForFrames(page, FRAME_COUNT);
}

async function captureState(
  context: BrowserContext,
  url: URL,
  palette: Palette,
  stateId: string,
  panelOpen: boolean,
): Promise<PresentationEntry[]> {
  const page = await context.newPage();

  try {
    try {
      await page.goto(url.href, { waitUntil: 'load', timeout: WAIT_TIMEOUT_MS });
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      throw new CliError(EXIT.UNREACHABLE, `unreachable: ${url.href}: ${detail}`);
    }

    await waitForPresentation(page, palette, panelOpen);
    return [...(await snapshotPresentation(page, stateId))];
  } finally {
    await page.close();
  }
}

export async function main(argv: string[]): Promise<number> {
  const { values } = parseCli<PresentationSnapshotArgs>(argv, {
    options: {
      url: { type: 'string' },
      out: { type: 'string' },
      help: { type: 'boolean' },
    },
    allowPositionals: false,
    requiredPositionals: 0,
  });

  if (values.help) {
    console.log(`${usage}\n\nExit codes:\n${exitCodeTable()}`);
    return EXIT.OK;
  }
  if (values.url === undefined) {
    throw new CliError(EXIT.USAGE, 'missing --url');
  }
  if (values.out === undefined) {
    throw new CliError(EXIT.USAGE, 'missing --out');
  }

  const base = parseUrl(values.url);
  const browser = await launch();
  const snapshot: PresentationEntry[] = [];

  try {
    for (const palette of PALETTES) {
      for (const viewport of VIEWPORTS) {
        const context = await browser.newContext(contextOptions(palette, viewport));

        try {
          for (const state of PRESENTATION_STATES) {
            const stateId = `${state.id}/${palette}/${viewport.name}`;
            const entries = await captureState(
              context,
              stateUrl(base, state),
              palette,
              stateId,
              state.panelOpen,
            );
            snapshot.push(...entries);
            console.log(`captured ${stateId}: ${entries.length} nodes`);
          }
        } finally {
          await context.close();
        }
      }
    }
  } finally {
    await browser.close();
  }

  const stateCount = new Set(snapshot.map((entry) => entry.state)).size;
  if (stateCount !== PRESENTATION_STATES.length * PALETTES.length * VIEWPORTS.length) {
    throw new CliError(
      EXIT.INTERNAL,
      `captured ${stateCount} states, expected ${PRESENTATION_STATES.length * PALETTES.length * VIEWPORTS.length}`,
    );
  }

  await mkdir(dirname(values.out), { recursive: true });
  await writeFile(values.out, `${JSON.stringify(snapshot, null, 2)}\n`, 'utf8');
  console.log(`presentation snapshot: ${stateCount} states, ${snapshot.length} nodes`);
  return EXIT.OK;
}

await run(main);
