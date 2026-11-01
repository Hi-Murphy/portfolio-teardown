import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import {
  chromium,
  type Browser,
  type BrowserContext,
  type BrowserContextOptions,
  type CDPSession,
  type Page,
} from 'playwright';

import { chromiumVersion, launch } from './browser.ts';
import type { LayoutShiftObservation } from './engine-probe.ts';
import { CliError, EXIT } from './exit-codes.ts';
import { s7ClsSummary } from './panel-probe.ts';
import {
  diffPresentation,
  PRESENTATION_LAYER_SELECTORS,
  snapshotPresentation,
  type PresentationDiffEntry,
  type PresentationEntry,
  type PresentationSnapshot,
} from './presentation-snapshot.ts';

export const A11Y_GROUPS = [
  'drill',
  'aria',
  'announce',
  'contrast',
  'reduced-motion',
  'fallbacks',
  'presentation',
  'metrics',
] as const;

export type A11yGroup = (typeof A11Y_GROUPS)[number];
export type Palette = 'light' | 'dark';
export type FixtureId = 'a' | 'b' | 'c';

export interface ProbeCheck {
  readonly name: string;
  readonly pass: boolean;
  readonly expected: unknown;
  readonly actual: unknown;
}

export interface FocusStep {
  readonly key: string;
  readonly role: string;
  readonly name: string;
  readonly panel: string;
}

export interface TabWalkVerdict {
  readonly pass: boolean;
  readonly reachedLast: boolean;
  readonly trap: boolean;
  readonly forwardMatches: boolean;
  readonly backwardMatches: boolean;
  readonly repeated: string | null;
  readonly expectedBackward: readonly string[];
  readonly actualBackward: readonly string[];
}

export interface AxPartNumberNode {
  readonly role: string;
  readonly text: string;
  readonly allowedRoot: 'navigator' | 'dialog' | 'live' | 'caption' | 'playground-stat' | null;
}

export interface Rgba {
  readonly r: number;
  readonly g: number;
  readonly b: number;
  readonly a: number;
}

export interface PixelContrastVerdict {
  readonly pass: boolean;
  readonly worst: number;
  readonly median: number;
  readonly worstBackground: Rgba;
  readonly medianBackground: Rgba;
  readonly sampleCount: number;
}

export interface ReducedMotionSample {
  readonly animations: number;
  readonly tweening: boolean;
  readonly frame: number;
}

export interface ReducedMotionVerdict {
  readonly pass: boolean;
  readonly maxAnimations: number;
  readonly tweeningSeen: boolean;
  readonly frameDelta: number;
  readonly samples: number;
}

export interface A11yFixtureComponent {
  readonly id: string;
  readonly name?: string;
  readonly summary?: string;
  readonly description?: string;
  readonly kind?: string;
  readonly status?: string;
  readonly techs?: readonly string[];
  readonly metrics?: readonly { readonly label: string; readonly value: string }[];
  readonly links?: readonly { readonly label: string; readonly url: string }[];
}

export interface A11yFixtureLayer {
  readonly id: string;
  readonly name?: string;
  readonly components: readonly A11yFixtureComponent[];
}

export interface A11yFixtureProject {
  readonly meta: { readonly slug: string; readonly name?: string };
  readonly story?: {
    readonly problem?: string;
    readonly approach?: string;
    readonly outcome?: string;
  };
  readonly layers: readonly A11yFixtureLayer[];
  readonly flows?: readonly {
    readonly id: string;
    readonly label?: string;
    readonly description?: string;
    readonly path: readonly string[];
  }[];
}

export interface A11yFixtureRegistry {
  readonly techs: readonly {
    readonly id: string;
    readonly label: string;
    readonly category: string;
  }[];
}

export interface A11yFixtures {
  readonly a: A11yFixtureProject;
  readonly b: A11yFixtureProject;
  readonly c: A11yFixtureProject;
  readonly registry: A11yFixtureRegistry;
}

export interface GroupResult {
  readonly group: A11yGroup;
  readonly pass: boolean;
  readonly checks: readonly ProbeCheck[];
  readonly data?: unknown;
  readonly lines: readonly string[];
}

export interface A11yProbeReport {
  readonly kind: 'a11y-probe';
  readonly version: 1;
  readonly url: string;
  readonly chromium: string;
  readonly groups: readonly GroupResult[];
  readonly pass: boolean;
}

export interface ProbeOptions {
  readonly base: URL;
  readonly outDir: string;
  readonly groups: readonly A11yGroup[];
}

type FocusSample = FocusStep;

interface AxNode {
  readonly nodeId?: string;
  readonly backendDOMNodeId?: number;
  readonly ignored?: boolean;
  readonly role?: { readonly value?: string };
  readonly name?: { readonly value?: string };
  readonly description?: { readonly value?: string };
  readonly properties?: readonly {
    readonly name?: string;
    readonly value?: { readonly value?: unknown };
  }[];
}

interface AxTree {
  readonly nodes: readonly AxNode[];
}

interface TextNodeObservation {
  readonly id: number;
  readonly surface: 'viewer' | 'panel' | 'playground' | 'lettering' | 'overlay';
  readonly selector: string;
  readonly text: string;
  readonly fg: string;
  readonly bg: string;
  readonly opacity: number;
  readonly fontSize: number;
  readonly fontWeight: number;
  readonly rect: {
    readonly x: number;
    readonly y: number;
    readonly width: number;
    readonly height: number;
  };
  readonly pixelMethod: boolean;
  readonly dimmed: boolean;
  readonly inactive: boolean;
}

interface ContrastRow {
  readonly surface: TextNodeObservation['surface'];
  readonly scheme: Palette;
  readonly state: string;
  readonly selector: string;
  readonly text: string;
  readonly fg: string;
  readonly bg: string;
  readonly ratio: number;
  readonly threshold: number;
  readonly pass: boolean;
  readonly method: 'computed' | 'pixel';
  // `pass` is the plain ratio verdict; an exception row is allowed to fail it (RFC R3 / WCAG inactive controls).
  readonly exception?: 'inactive-dim' | 'disabled-control';
  readonly unmeasured?: true;
  readonly coveredElsewhere?: true;
  readonly medianRatio?: number;
  readonly pixels?: number;
}

interface PresentationState {
  readonly id: string;
  readonly fixture: FixtureId;
  readonly params: Readonly<Record<string, string>>;
  readonly panelOpen: boolean;
}

interface ActiveState {
  readonly pass: boolean;
  readonly lines: readonly string[];
}

const VIEWER_SELECTOR = '[data-xploder-ready="true"]';
const VIEWER_GROUP_SELECTOR = '[role="group"][aria-label$="architecture view"]';
const PROXY_SELECTOR = '[data-xploder-proxy]';
const PANEL_SELECTOR = '[data-xploder-panel-surface]';
const LIVE_SELECTOR = '[data-xploder-live]';
const WAIT_TIMEOUT_MS = 20_000;
const FRAME_COUNT = 2;
const DESKTOP = { width: 1280, height: 800 } as const;
const PART_NUMBER = /^\d+\.\d+$/;
const MOTION_SAMPLE_MS = 1000;
const MOTION_FRAME_MAX = 2;
const PIXEL_STRIDE_LIMIT = 18;
const PIXEL_SAMPLE_BUDGET = 420;
const PIXEL_GLYPH_DELTA = 64;
const FAVICON_PATH = '/favicon.ico';
const THREE_D_MOTION_ROWS = new Set([
  'explode-implode',
  'camera-turn',
  'camera-zoom',
  'hover-and-dim',
  'tour-pulse-and-beat',
  'circuit-trace',
]);
const BASELINE_PRESENTATION = new URL(
  '../../../.specify/features/a11y-floor/evidence/T002-presentation-base.json',
  import.meta.url,
);

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
const PRESENTATION_VIEWPORTS = [
  { name: 'desktop', width: 1280, height: 800, isMobile: false, hasTouch: false },
  { name: 'mobile', width: 390, height: 844, isMobile: true, hasTouch: true },
] as const;

function check(name: string, pass: boolean, expected: unknown, actual: unknown): ProbeCheck {
  return { name, pass, expected, actual };
}

function sameStrings(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function repeatedBeforeTarget(keys: readonly string[], last: string | undefined): string | null {
  const seen = new Set<string>();

  for (const key of keys) {
    if (key === last) return null;
    if (seen.has(key)) return key;
    seen.add(key);
  }

  return null;
}

export function evaluateTabWalk(
  forward: readonly FocusStep[],
  backward: readonly FocusStep[],
  expected: readonly string[],
): TabWalkVerdict {
  const actualForward = forward.map((step) => step.key);
  const actualBackward = backward.map((step) => step.key);
  const expectedBackward = [...expected].reverse().slice(1);
  const last = expected.at(-1);
  const reachedLast = last !== undefined && actualForward.includes(last);
  const repeated = repeatedBeforeTarget(actualForward, last);

  return {
    pass:
      reachedLast &&
      repeated === null &&
      sameStrings(actualForward, expected) &&
      sameStrings(actualBackward, expectedBackward),
    reachedLast,
    trap: repeated !== null,
    forwardMatches: sameStrings(actualForward, expected),
    backwardMatches: sameStrings(actualBackward, expectedBackward),
    repeated,
    expectedBackward,
    actualBackward,
  };
}

export function evaluateAxPartNumberNodes(nodes: readonly AxPartNumberNode[]): {
  readonly pass: boolean;
  readonly offenders: readonly AxPartNumberNode[];
} {
  const offenders = nodes.filter(
    (node) =>
      node.role === 'StaticText' && PART_NUMBER.test(node.text) && node.allowedRoot === null,
  );

  return { pass: offenders.length === 0, offenders };
}

function channel(value: number): number {
  return Math.max(0, Math.min(255, Math.round(value)));
}

function linearChannel(value: number): number {
  const channelValue = channel(value) / 255;
  return channelValue <= 0.04045 ? channelValue / 12.92 : ((channelValue + 0.055) / 1.055) ** 2.4;
}

export function contrastRatio(foreground: Rgba, background: Rgba): number {
  const foregroundLuminance =
    0.2126 * linearChannel(foreground.r) +
    0.7152 * linearChannel(foreground.g) +
    0.0722 * linearChannel(foreground.b);
  const backgroundLuminance =
    0.2126 * linearChannel(background.r) +
    0.7152 * linearChannel(background.g) +
    0.0722 * linearChannel(background.b);
  const lighter = Math.max(foregroundLuminance, backgroundLuminance);
  const darker = Math.min(foregroundLuminance, backgroundLuminance);

  return (lighter + 0.05) / (darker + 0.05);
}

function median(values: readonly number[]): number {
  if (values.length === 0) return 0;

  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  const upper = sorted[middle] ?? 0;

  if (sorted.length % 2 === 1) return upper;

  return ((sorted[middle - 1] ?? upper) + upper) / 2;
}

export function evaluatePixelContrast(
  pixels: readonly Rgba[],
  foreground: Rgba,
): PixelContrastVerdict {
  if (pixels.length === 0) {
    return {
      pass: false,
      worst: 0,
      median: 0,
      worstBackground: { r: 0, g: 0, b: 0, a: 1 },
      medianBackground: { r: 0, g: 0, b: 0, a: 1 },
      sampleCount: 0,
    };
  }

  const ratios = pixels.map((pixel) => contrastRatio(foreground, pixel));
  let worstIndex = 0;

  for (let index = 1; index < ratios.length; index += 1) {
    if ((ratios[index] ?? Infinity) < (ratios[worstIndex] ?? Infinity)) worstIndex = index;
  }

  const sortedRatios = [...ratios].sort((left, right) => left - right);
  const medianRatio = median(sortedRatios);
  let medianIndex = 0;
  let medianDistance = Infinity;

  for (let index = 0; index < ratios.length; index += 1) {
    const distance = Math.abs((ratios[index] ?? 0) - medianRatio);
    if (distance < medianDistance) {
      medianDistance = distance;
      medianIndex = index;
    }
  }

  return {
    pass: (ratios[worstIndex] ?? 0) >= 4.5,
    worst: ratios[worstIndex] ?? 0,
    median: medianRatio,
    worstBackground: pixels[worstIndex] ?? { r: 0, g: 0, b: 0, a: 1 },
    medianBackground: pixels[medianIndex] ?? pixels[worstIndex] ?? { r: 0, g: 0, b: 0, a: 1 },
    sampleCount: pixels.length,
  };
}

export function evaluateReducedMotion(
  samples: readonly ReducedMotionSample[],
  threeD: boolean,
): ReducedMotionVerdict {
  const frames = samples.map((sample) => sample.frame).filter(Number.isFinite);
  const firstFrame = frames[0];
  const lastFrame = frames.at(-1);
  const frameDelta =
    firstFrame === undefined || lastFrame === undefined ? 0 : Math.max(0, lastFrame - firstFrame);
  const maxAnimations = samples.reduce(
    (maximum, sample) => Math.max(maximum, sample.animations),
    0,
  );
  const tweeningSeen = samples.some((sample) => sample.tweening);

  return {
    pass:
      samples.length > 0 &&
      maxAnimations === 0 &&
      !tweeningSeen &&
      (!threeD || frameDelta <= MOTION_FRAME_MAX),
    maxAnimations,
    tweeningSeen,
    frameDelta,
    samples: samples.length,
  };
}

function parseRgba(value: string): Rgba | null {
  const trimmed = value.trim().toLowerCase();
  if (trimmed === 'transparent') return { r: 0, g: 0, b: 0, a: 0 };

  const match = /^rgba?\(([^)]+)\)$/.exec(trimmed);
  if (match === null) return null;

  const parts = (match[1] ?? '').replaceAll('/', ' ').split(/[ ,]+/).filter(Boolean).map(Number);
  const [r, g, b, alpha = 1] = parts;

  if (r === undefined || g === undefined || b === undefined) return null;
  if (![r, g, b, alpha].every(Number.isFinite)) return null;

  return { r: channel(r), g: channel(g), b: channel(b), a: Math.max(0, Math.min(1, alpha)) };
}

function formatRgba(colour: Rgba): string {
  const alpha = Math.round(colour.a * 1000) / 1000;
  return alpha >= 1
    ? `rgb(${channel(colour.r)}, ${channel(colour.g)}, ${channel(colour.b)})`
    : `rgba(${channel(colour.r)}, ${channel(colour.g)}, ${channel(colour.b)}, ${alpha})`;
}

function composite(foreground: Rgba, background: Rgba): Rgba {
  const alpha = foreground.a + background.a * (1 - foreground.a);
  if (alpha <= 0) return { r: 0, g: 0, b: 0, a: 0 };

  return {
    r: channel(
      (foreground.r * foreground.a + background.r * background.a * (1 - foreground.a)) / alpha,
    ),
    g: channel(
      (foreground.g * foreground.a + background.g * background.a * (1 - foreground.a)) / alpha,
    ),
    b: channel(
      (foreground.b * foreground.a + background.b * background.a * (1 - foreground.a)) / alpha,
    ),
    a: alpha,
  };
}

function withOpacity(colour: Rgba, opacity: number): Rgba {
  return { ...colour, a: colour.a * Math.max(0, Math.min(1, opacity)) };
}

function isAllowedPresentationChange(
  difference: PresentationDiffEntry,
  after: PresentationSnapshot,
): boolean {
  if (difference.kind === 'added') {
    const entry = after.find(
      (candidate) => candidate.state === difference.state && candidate.path === difference.path,
    );

    if (entry === undefined || entry.tag !== 'span') return false;
    if (!difference.path.startsWith('panel-layer/')) return false;
    if (!difference.path.includes('/ul:') || !difference.path.includes('/li:')) return false;
    if (entry.rect.width > 1 || entry.rect.height > 1) return false;

    return (
      entry.styles['background-color'] === 'rgba(0, 0, 0, 0)' &&
      entry.styles.visibility === 'visible' &&
      entry.styles.opacity === '1'
    );
  }

  if (difference.kind !== 'changed' || difference.property !== 'styles.color') return false;
  if (!difference.path.startsWith('lettering-layer/')) return false;
  if (typeof difference.before !== 'string' || typeof difference.after !== 'string') return false;

  return (
    difference.before !== difference.after &&
    (difference.state.includes('highlight') || difference.state.includes('select'))
  );
}

export function evaluatePresentationDiff(
  differences: readonly PresentationDiffEntry[],
  after: PresentationSnapshot,
): {
  readonly pass: boolean;
  readonly allowed: readonly PresentationDiffEntry[];
  readonly failing: readonly PresentationDiffEntry[];
} {
  const allowed: PresentationDiffEntry[] = [];
  const failing: PresentationDiffEntry[] = [];

  for (const difference of differences) {
    if (isAllowedPresentationChange(difference, after)) allowed.push(difference);
    else failing.push(difference);
  }

  return { pass: failing.length === 0, allowed, failing };
}

export async function loadA11yFixtures(): Promise<A11yFixtures> {
  const root = new URL('../../../packages/xploder/test/fixtures/', import.meta.url);
  const readJson = async (name: string): Promise<unknown> =>
    JSON.parse(await readFile(new URL(name, root), 'utf8')) as unknown;

  const [a, b, c, registry] = await Promise.all([
    readJson('project-a-ui-app.json'),
    readJson('project-b-pipeline.json'),
    readJson('project-c-lockerbay.json'),
    readJson('tech-registry.json'),
  ]);

  return {
    a: a as A11yFixtureProject,
    b: b as A11yFixtureProject,
    c: c as A11yFixtureProject,
    registry: registry as A11yFixtureRegistry,
  };
}

function componentsOf(project: A11yFixtureProject): readonly A11yFixtureComponent[] {
  return project.layers.flatMap((layer) => layer.components);
}

function componentById(project: A11yFixtureProject, id: string): A11yFixtureComponent {
  const component = componentsOf(project).find((candidate) => candidate.id === id);

  if (component === undefined)
    throw new CliError(EXIT.INTERNAL, `fixture component missing: ${id}`);
  return component;
}

function componentName(component: A11yFixtureComponent): string {
  return component.name ?? component.id;
}

function detailOpenMessage(project: A11yFixtureProject, id: string): string {
  const component = componentById(project, id);
  const head = `${componentName(component)}, ${component.kind ?? 'module'}.`;

  return component.summary === undefined ? head : `${head} ${component.summary}`;
}

function detailCloseMessage(project: A11yFixtureProject, id: string): string {
  return `${componentName(componentById(project, id))} details closed.`;
}

function tourMessage(project: A11yFixtureProject, flowId: string, stepIndex: number): string {
  const flow = project.flows?.find((candidate) => candidate.id === flowId);
  if (flow === undefined) return '';

  const componentId = flow.path[stepIndex];
  const component = componentId === undefined ? undefined : componentById(project, componentId);
  const heading = `${flow.label ?? flow.id} · Step ${stepIndex + 1} of ${flow.path.length}`;
  const summary = component?.summary;
  const description = stepIndex === 0 ? flow.description : undefined;

  return [heading, component === undefined ? '' : componentName(component), summary, description]
    .filter((part): part is string => part !== undefined && part !== '')
    .join('. ');
}

function expectedAnnouncements(project: A11yFixtureProject): {
  readonly step1: string;
  readonly jump: string;
  readonly pausedOpen: string;
  readonly detailOpen: string;
  readonly detailClose: string;
  readonly caseStudyOpen: string;
  readonly caseStudyClose: string;
} {
  const flow = project.flows?.find((candidate) => candidate.id === 'live-update');
  const jumpStep = flow?.path.indexOf('tide-repository') ?? 0;
  const pauseId = 'forecast-details-panel';

  return {
    step1: tourMessage(project, 'live-update', 0),
    jump: `Jumped to ${tourMessage(project, 'live-update', jumpStep)}`,
    pausedOpen: `Tour paused. ${detailOpenMessage(project, pauseId)}`,
    detailOpen: detailOpenMessage(project, 'tide-repository'),
    detailClose: detailCloseMessage(project, 'tide-repository'),
    caseStudyOpen: `Case study: ${project.meta.name ?? project.meta.slug}.`,
    caseStudyClose: 'Case study closed.',
  };
}

function rootUrl(base: URL): URL {
  const root = new URL(base.href);
  if (!root.pathname.endsWith('/')) root.pathname += '/';
  return root;
}

function fixtureUrl(
  base: URL,
  fixture: FixtureId,
  params: Readonly<Record<string, string>> = {},
): URL {
  const url = new URL('dev/engine', rootUrl(base));
  url.searchParams.set('fixture', fixture);
  url.searchParams.set('state', 'exploded');

  for (const [name, value] of Object.entries(params)) url.searchParams.set(name, value);
  return url;
}

function contextOptions(palette: Palette = 'light', reducedMotion = false): BrowserContextOptions {
  return {
    viewport: { width: DESKTOP.width, height: DESKTOP.height },
    deviceScaleFactor: 1,
    colorScheme: palette,
    ...(reducedMotion ? { reducedMotion: 'reduce' as const } : {}),
  };
}

async function openPage(context: BrowserContext, url: URL): Promise<Page> {
  const page = await context.newPage();

  try {
    await page.goto(url.href, { waitUntil: 'load', timeout: WAIT_TIMEOUT_MS });
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new CliError(EXIT.UNREACHABLE, `unreachable: ${url.href}: ${detail}`);
  }

  return page;
}

async function frames(page: Page, count = FRAME_COUNT): Promise<void> {
  await page.evaluate(async (frameCount) => {
    for (let index = 0; index < frameCount; index += 1) {
      await new Promise<void>((resolveFrame) => requestAnimationFrame(() => resolveFrame()));
    }
  }, count);
}

async function waitForReady(page: Page, panelOpen = false, expectLettering = true): Promise<void> {
  await page.waitForSelector(VIEWER_SELECTOR, { timeout: WAIT_TIMEOUT_MS });
  await page.evaluate(async () => {
    await document.fonts.ready;
  });
  await page.waitForFunction(
    ({ viewerSelector, expectPanel, expectLetteringShown }) => {
      const viewer = document.querySelector(viewerSelector);
      if (viewer === null) return false;
      if (viewer.getAttribute('data-xploder-state') !== 'exploded') return false;
      if (viewer.getAttribute('data-xploder-tweening') !== 'false') return false;
      if (expectLetteringShown && viewer.getAttribute('data-xploder-lettering') !== 'shown') {
        return false;
      }
      return !expectPanel || viewer.getAttribute('data-xploder-panel-ready') === 'true';
    },
    {
      viewerSelector: VIEWER_SELECTOR,
      expectPanel: panelOpen,
      expectLetteringShown: expectLettering,
    },
    { timeout: WAIT_TIMEOUT_MS },
  );
  await frames(page);
}

async function waitForPanelReady(page: Page): Promise<void> {
  await page.waitForSelector(PANEL_SELECTOR, { timeout: WAIT_TIMEOUT_MS });
  await page.waitForFunction(
    (selector) =>
      document.querySelector(selector)?.getAttribute('data-xploder-panel-ready') === 'true',
    VIEWER_SELECTOR,
    { timeout: WAIT_TIMEOUT_MS },
  );
  await frames(page);
}

async function waitForPanelClosed(page: Page): Promise<void> {
  await page.waitForFunction(
    ({ viewerSelector, panelSelector }) => {
      const viewer = document.querySelector(viewerSelector);
      return (
        viewer?.getAttribute('data-xploder-panel') === 'closed' &&
        document.querySelector(panelSelector) === null
      );
    },
    { viewerSelector: VIEWER_SELECTOR, panelSelector: PANEL_SELECTOR },
    { timeout: WAIT_TIMEOUT_MS },
  );
}

async function readFocus(page: Page): Promise<FocusSample> {
  return await page.evaluate(
    ({ viewerSelector, proxySelector }) => {
      const element = document.activeElement;
      const viewer = document.querySelector(viewerSelector);
      const panel = viewer?.getAttribute('data-xploder-panel') ?? 'missing';

      if (!(element instanceof HTMLElement)) {
        return { key: 'body', role: 'generic', name: 'Body', panel };
      }

      const tag = element.tagName.toLowerCase();
      const implicitRole =
        tag === 'a'
          ? 'link'
          : tag === 'button'
            ? 'button'
            : tag === 'h2'
              ? 'heading'
              : tag === 'input'
                ? 'textbox'
                : (element.getAttribute('role') ?? 'generic');
      const role = element.getAttribute('role') ?? implicitRole;
      const name =
        element.getAttribute('aria-label') ??
        element.textContent?.trim().replace(/\s+/g, ' ').slice(0, 120) ??
        '';
      const proxy = element.getAttribute('data-xploder-proxy');
      const control = element.getAttribute('data-engine-control');
      const href = element.getAttribute('href');
      let key = `other:${tag}:${name}`;

      if (href === '#engine-controls') key = 'skip';
      else if (element.matches('[role="group"][aria-label$="architecture view"]')) key = 'viewer';
      else if (proxy !== null && element.matches(proxySelector)) key = `proxy:${proxy}`;
      else if (control !== null) key = `control:${control}`;
      else if (name.startsWith('Switch to ')) key = 'theme';
      else if (href?.startsWith('?fixture=') === true) key = `fallback-link:${name}`;

      return { key, role, name, panel };
    },
    { viewerSelector: VIEWER_SELECTOR, proxySelector: PROXY_SELECTOR },
  );
}

async function tabToLastControl(page: Page): Promise<readonly FocusSample[]> {
  await page.evaluate(() => {
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    window.scrollTo(0, 0);
  });

  const steps: FocusSample[] = [];
  const seen = new Set<string>();

  for (let index = 0; index < 80; index += 1) {
    await page.keyboard.press('Tab');
    const sample = await readFocus(page);
    if (sample.key.startsWith('fallback-link:')) continue;
    steps.push(sample);

    if (sample.key === 'control:tour-stop') return steps;
    if (seen.has(sample.key)) return steps;
    seen.add(sample.key);
  }

  return steps;
}

async function shiftTabBack(page: Page, count: number): Promise<readonly FocusSample[]> {
  const steps: FocusSample[] = [];

  for (let index = 0; index < count + 12 && steps.length < count; index += 1) {
    await page.keyboard.press('Shift+Tab');
    const sample = await readFocus(page);
    if (!sample.key.startsWith('fallback-link:')) steps.push(sample);
  }

  return steps;
}

function expectedTabOrder(project: A11yFixtureProject): readonly string[] {
  const layers = project.layers.map((layer) => layer.id);
  const allFlows = project.flows ?? [];
  const flows = allFlows.length > 1 ? allFlows.map((flow) => flow.id) : [];

  return [
    'skip',
    'viewer',
    `proxy:${componentsOf(project)[0]?.id ?? ''}`,
    'control:fixture-a',
    'control:fixture-b',
    'control:fixture-c',
    'control:toggle',
    'control:rotate-left',
    'control:rotate-right',
    'control:zoom-in',
    'control:case-study',
    'theme',
    ...layers.map((id) => `control:focus-${id}`),
    ...flows.map((id) => `control:flow-${id}`),
    'control:tour-play',
    'control:tour-step',
    'control:tour-stop',
  ];
}

async function focusProxy(page: Page, id: string): Promise<void> {
  await page.locator(`${PROXY_SELECTOR}[data-xploder-proxy="${id}"]`).focus();
  await frames(page);
}

async function focusComponentsStop(page: Page): Promise<FocusSample> {
  await page.evaluate(() => {
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    window.scrollTo(0, 0);
  });
  let sample: FocusSample = { key: 'body', role: 'generic', name: 'Body', panel: 'missing' };

  for (let index = 0; index < 12; index += 1) {
    await page.keyboard.press('Tab');
    sample = await readFocus(page);
    if (sample.key.startsWith('proxy:')) break;
  }

  await frames(page);
  return sample;
}

async function moveComponent(page: Page, key: 'ArrowDown' | 'Home' | 'End'): Promise<FocusSample> {
  await page.keyboard.press(key);
  await frames(page);
  return await readFocus(page);
}

async function enterPanelFromProxy(page: Page, id: string): Promise<ActiveState> {
  const name = await page.evaluate((proxyId) => {
    const element = document.querySelector(`[data-xploder-proxy="${proxyId}"]`);
    return element?.textContent?.trim() ?? proxyId;
  }, id);
  const lines: string[] = [];

  await page.keyboard.press('Enter');
  await waitForPanelReady(page);
  const dialog = page.locator(`${PANEL_SELECTOR}[role="dialog"]`).first();
  const dialogRole = (await dialog.getAttribute('role')) ?? null;
  const dialogName = await dialog.getAttribute('aria-labelledby');
  const namedHeading =
    dialogName === null ? null : await page.locator(`#${dialogName}`).textContent();
  const headingFocused = await page.evaluate(() => {
    const active = document.activeElement;
    return active instanceof HTMLElement && active.tagName.toLowerCase() === 'h2';
  });
  const pass = dialogRole === 'dialog' && namedHeading?.trim() === name && headingFocused;

  lines.push(
    `open ${id}: dialog=${JSON.stringify(dialogRole)} name=${JSON.stringify(namedHeading?.trim() ?? null)} heading-focused=${headingFocused} ${pass ? 'PASS' : 'FAIL'}`,
  );

  return { pass, lines };
}

async function closePanelToProxy(page: Page, id: string): Promise<ActiveState> {
  await page.keyboard.press('Escape');
  await waitForPanelClosed(page);
  const active = await readFocus(page);
  const pass = active.key === `proxy:${id}`;

  return {
    pass,
    lines: [
      `Escape ${id}: active=${active.role} ${JSON.stringify(active.name)} ${pass ? 'PASS' : 'FAIL'}`,
    ],
  };
}

async function runComponentDrill(
  page: Page,
  project: A11yFixtureProject,
): Promise<{ readonly checks: ProbeCheck[]; readonly lines: string[] }> {
  const components = componentsOf(project);
  const checks: ProbeCheck[] = [];
  const lines: string[] = [];

  if (components.length === 0) {
    return {
      checks: [check(`${project.meta.slug}-components-present`, false, '>=1', 0)],
      lines: [`${project.meta.slug}: no components`],
    };
  }

  const componentsStop = await focusComponentsStop(page);
  const firstComponent = components[0];
  let allOpen = true;
  let allClose = true;

  checks.push(
    check(
      `${project.meta.slug}-components-stop`,
      componentsStop.key === `proxy:${firstComponent?.id ?? ''}`,
      `proxy:${firstComponent?.id ?? ''}`,
      componentsStop.key,
    ),
  );
  lines.push(
    `Components stop: ${componentsStop.role} ${JSON.stringify(componentsStop.name)} ${componentsStop.key === `proxy:${firstComponent?.id ?? ''}` ? 'PASS' : 'FAIL'}`,
  );

  for (let index = 0; index < components.length; index += 1) {
    const component = components[index];
    if (component === undefined) continue;

    const focused = index === 0 ? componentsStop : await moveComponent(page, 'ArrowDown');
    const highlighted = await page.locator(VIEWER_SELECTOR).getAttribute('data-xploder-highlight');
    const ring = (await page.locator('[data-xploder-focus-ring]').count()) === 1;
    const focusPass = focused.key === `proxy:${component.id}` && highlighted === component.id;
    checks.push(
      check(
        `${project.meta.slug}-${component.id}-focus`,
        focusPass && ring,
        { key: `proxy:${component.id}`, highlight: component.id, ring: true },
        { key: focused.key, highlight: highlighted, ring },
      ),
    );
    lines.push(
      `ArrowDown ${index + 1}/${components.length}: ${focused.role} ${JSON.stringify(focused.name)} highlight=${highlighted ?? 'null'} ring=${ring} ${focusPass && ring ? 'PASS' : 'FAIL'}`,
    );

    const opened = await enterPanelFromProxy(page, component.id);
    lines.push(...opened.lines);
    const closed = await closePanelToProxy(page, component.id);
    lines.push(...closed.lines);
    allOpen &&= opened.pass;
    allClose &&= closed.pass;
  }

  checks.push(
    check(
      `${project.meta.slug}-every-component-opens`,
      allOpen,
      'every component opens a named dialog and focuses its h2',
      allOpen,
    ),
    check(
      `${project.meta.slug}-every-component-closes-to-proxy`,
      allClose,
      'every Escape returns focus to its proxy',
      allClose,
    ),
  );

  const first = components[0];
  const last = components.at(-1);
  if (first !== undefined && last !== undefined) {
    const wrapped = await moveComponent(page, 'ArrowDown');
    const ended = await moveComponent(page, 'End');
    const homed = await moveComponent(page, 'Home');
    checks.push(
      check(
        `${project.meta.slug}-move-keys-wrap-home-end`,
        wrapped.key === `proxy:${first.id}` &&
          ended.key === `proxy:${last.id}` &&
          homed.key === `proxy:${first.id}`,
        [first.id, last.id, first.id],
        [wrapped.key, ended.key, homed.key],
      ),
    );
    lines.push(
      `wrap=${wrapped.key} End=${ended.key} Home=${homed.key} ${wrapped.key === `proxy:${first.id}` && ended.key === `proxy:${last.id}` && homed.key === `proxy:${first.id}` ? 'PASS' : 'FAIL'}`,
    );

    await page.keyboard.press('Space');
    await waitForPanelReady(page);
    const spaceHeadingFocused = await page.evaluate(
      () => document.activeElement instanceof HTMLHeadingElement,
    );
    await page.keyboard.press('Escape');
    await waitForPanelClosed(page);
    const spaceReturn = await readFocus(page);
    checks.push(
      check(
        `${project.meta.slug}-space-opens`,
        spaceHeadingFocused && spaceReturn.key === `proxy:${first.id}`,
        true,
        { spaceHeadingFocused, returned: spaceReturn.key },
      ),
    );
    lines.push(
      `Space ${first.id}: heading-focused=${spaceHeadingFocused} returned=${spaceReturn.key} ${spaceHeadingFocused && spaceReturn.key === `proxy:${first.id}` ? 'PASS' : 'FAIL'}`,
    );

    const azimuthBefore = await page.locator(VIEWER_SELECTOR).getAttribute('data-xploder-azimuth');
    await page.keyboard.press('ArrowLeft');
    const azimuthAfter = await page.locator(VIEWER_SELECTOR).getAttribute('data-xploder-azimuth');
    const zoomBefore = await page.locator(VIEWER_SELECTOR).getAttribute('data-xploder-zoom');
    await page.keyboard.press('+');
    const zoomAfter = await page.locator(VIEWER_SELECTOR).getAttribute('data-xploder-zoom');
    const rotatePass = azimuthBefore !== azimuthAfter;
    const zoomPass = zoomBefore !== zoomAfter;
    checks.push(
      check(`${project.meta.slug}-proxy-rotate-zoom-bubble`, rotatePass && zoomPass, true, {
        rotatePass,
        zoomPass,
      }),
    );
    lines.push(
      `proxy ArrowLeft=${azimuthBefore}->${azimuthAfter} +=${zoomBefore}->${zoomAfter} ${rotatePass && zoomPass ? 'PASS' : 'FAIL'}`,
    );
  }

  return { checks, lines };
}

async function runPointerVariant(
  page: Page,
  componentId: string,
): Promise<{ readonly check: ProbeCheck; readonly lines: readonly string[] }> {
  const rect = await page
    .locator(`${PROXY_SELECTOR}[data-xploder-proxy="${componentId}"]`)
    .boundingBox();
  const lines: string[] = [];

  if (rect === null) {
    return {
      check: check('pointer-open', false, 'proxy rect', null),
      lines: [`pointer ${componentId}: no proxy rect FAIL`],
    };
  }

  await page.mouse.click(rect.x + rect.width / 2, rect.y + rect.height / 2);
  await waitForPanelReady(page);
  const headingFocused = await page.evaluate(
    () => document.activeElement instanceof HTMLHeadingElement,
  );
  await page.keyboard.press('Escape');
  await waitForPanelClosed(page);
  const returned = await readFocus(page);
  const pass = headingFocused && returned.key === 'viewer';
  lines.push(
    `pointer ${componentId}: heading-focused=${headingFocused} Escape-active=${returned.role} ${JSON.stringify(returned.name)} ${pass ? 'PASS' : 'FAIL'}`,
  );

  return {
    check: check('pointer-open-focus-wrapper-close', pass, true, {
      headingFocused,
      returned: returned.key,
    }),
    lines,
  };
}

async function runTourVariant(
  page: Page,
  project: A11yFixtureProject,
): Promise<{ readonly checks: ProbeCheck[]; readonly lines: string[] }> {
  const checks: ProbeCheck[] = [];
  const lines: string[] = [];
  const expected = expectedAnnouncements(project);
  const live = page.locator(LIVE_SELECTOR);

  await focusProxy(page, 'tide-repository');
  await page.keyboard.press('Enter');
  await page.waitForFunction(
    (selector) => document.querySelector(selector)?.getAttribute('data-xploder-tour-step') === '3',
    VIEWER_SELECTOR,
    { timeout: WAIT_TIMEOUT_MS },
  );
  const jumpTour = await page.locator(VIEWER_SELECTOR).getAttribute('data-xploder-tour');
  const jumpFocus = await readFocus(page);
  await page.waitForFunction(
    ({ selector, text }) => document.querySelector(selector)?.textContent === text,
    { selector: LIVE_SELECTOR, text: expected.jump },
    { timeout: WAIT_TIMEOUT_MS },
  );
  const jumpText = await live.textContent();
  const jumpPass =
    jumpTour === 'playing' &&
    jumpFocus.key === 'proxy:tide-repository' &&
    jumpText?.startsWith('Jumped to ') === true;
  checks.push(
    check(
      'tour-in-flow-jump',
      jumpPass,
      { status: 'playing', focus: 'proxy:tide-repository', copy: expected.jump },
      { status: jumpTour, focus: jumpFocus.key, copy: jumpText },
    ),
  );
  lines.push(
    `tour jump: status=${jumpTour} focus=${jumpFocus.key} copy=${JSON.stringify(jumpText)} ${jumpPass ? 'PASS' : 'FAIL'}`,
  );

  await focusProxy(page, 'forecast-details-panel');
  await page.keyboard.press('Enter');
  await waitForPanelReady(page);
  const paused = await page.locator(VIEWER_SELECTOR).getAttribute('data-xploder-tour');
  await page.waitForFunction(
    ({ selector, text }) => document.querySelector(selector)?.textContent === text,
    { selector: LIVE_SELECTOR, text: expected.pausedOpen },
    { timeout: WAIT_TIMEOUT_MS },
  );
  const pausedText = await live.textContent();
  const h2 = await page.evaluate(() => document.activeElement instanceof HTMLHeadingElement);
  await page.keyboard.press('Escape');
  await waitForPanelClosed(page);
  const returned = await readFocus(page);
  const pausePass =
    paused === 'paused' &&
    pausedText === expected.pausedOpen &&
    h2 &&
    returned.key === 'proxy:forecast-details-panel';
  checks.push(
    check(
      'tour-not-in-flow-pause',
      pausePass,
      {
        status: 'paused',
        heading: true,
        returned: 'proxy:forecast-details-panel',
        copy: expected.pausedOpen,
      },
      { status: paused, heading: h2, returned: returned.key, copy: pausedText },
    ),
  );
  lines.push(
    `tour pause: status=${paused} heading=${h2} returned=${returned.key} copy=${JSON.stringify(pausedText)} ${pausePass ? 'PASS' : 'FAIL'}`,
  );

  return { checks, lines };
}

async function runDrillGroup(
  browser: Browser,
  base: URL,
  fixtures: A11yFixtures,
  log: (line: string) => void,
): Promise<GroupResult> {
  const checks: ProbeCheck[] = [];
  const data: unknown[] = [];

  for (const fixture of ['a', 'b'] as const) {
    const project = fixtures[fixture];
    const context = await browser.newContext(contextOptions('light'));
    const page = await openPage(context, fixtureUrl(base, fixture));
    await waitForReady(page);
    const forward = await tabToLastControl(page);
    const expected = expectedTabOrder(project);
    const verdict = evaluateTabWalk(forward, [], expected);
    const walked = await shiftTabBack(page, Math.max(0, forward.length - 1));
    const fullVerdict = evaluateTabWalk(forward, walked, expected);

    checks.push(
      check(
        `drill-${fixture}-tab-order`,
        fullVerdict.forwardMatches && fullVerdict.reachedLast,
        expected,
        forward.map((step) => step.key),
      ),
      check(
        `drill-${fixture}-shift-tab-order`,
        fullVerdict.backwardMatches,
        fullVerdict.expectedBackward,
        fullVerdict.actualBackward,
      ),
      check(`drill-${fixture}-no-trap`, !fullVerdict.trap, null, fullVerdict.repeated),
    );

    for (const step of forward) {
      const expectedIndex = forward.findIndex((candidate) => candidate === step);
      const pass = expected[expectedIndex] === step.key;
      log(
        `drill-${fixture} Tab ${step.key} role=${step.role} name=${JSON.stringify(step.name)} panel=${step.panel} ${pass ? 'PASS' : 'FAIL'}`,
      );
    }
    walked.forEach((step, index) => {
      const expectedKey = fullVerdict.expectedBackward[index];
      log(
        `drill-${fixture} Shift+Tab ${step.key} role=${step.role} name=${JSON.stringify(step.name)} panel=${step.panel} ${step.key === expectedKey ? 'PASS' : 'FAIL'}`,
      );
    });
    data.push({
      fixture,
      forward,
      backward: walked,
      verdict: fullVerdict,
      initialVerdict: verdict,
    });

    await page.goto(fixtureUrl(base, fixture).href, {
      waitUntil: 'load',
      timeout: WAIT_TIMEOUT_MS,
    });
    await waitForReady(page);
    const componentDrill = await runComponentDrill(page, project);
    checks.push(...componentDrill.checks);
    componentDrill.lines.forEach(log);

    await page.goto(fixtureUrl(base, fixture).href, {
      waitUntil: 'load',
      timeout: WAIT_TIMEOUT_MS,
    });
    await waitForReady(page);
    const pointerId = fixture === 'a' ? 'tide-repository' : componentsOf(project)[0]?.id;
    if (pointerId === undefined) {
      throw new CliError(
        EXIT.INTERNAL,
        `fixture ${fixture} has no component for the pointer drill`,
      );
    }
    const pointer = await runPointerVariant(page, pointerId);
    checks.push(pointer.check);
    pointer.lines.forEach(log);
    await context.close();
  }

  const reduced = await browser.newContext(contextOptions('light', true));
  const reducedPage = await openPage(
    reduced,
    fixtureUrl(base, 'a', { tour: 'play', flow: 'live-update' }),
  );
  await waitForReady(reducedPage, false, false);
  const tour = await runTourVariant(reducedPage, fixtures.a);
  checks.push(...tour.checks);
  tour.lines.forEach(log);
  await reduced.close();

  return { group: 'drill', pass: checks.every((entry) => entry.pass), checks, data, lines: [] };
}

async function cdpAccessibilityTree(page: Page): Promise<{
  readonly cdp: CDPSession;
  readonly nodes: readonly AxNode[];
}> {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Accessibility.enable');
  const tree = (await cdp.send('Accessibility.getFullAXTree')) as AxTree;
  return { cdp, nodes: tree.nodes };
}

async function allowedRootForAxNode(
  cdp: CDPSession,
  node: AxNode,
): Promise<AxPartNumberNode['allowedRoot']> {
  if (node.backendDOMNodeId === undefined) return null;

  try {
    const resolved = (await cdp.send('DOM.resolveNode', {
      backendNodeId: node.backendDOMNodeId,
    })) as { object?: { objectId?: string } };
    const objectId = resolved.object?.objectId;
    if (objectId === undefined) return null;

    const result = (await cdp.send('Runtime.callFunctionOn', {
      objectId,
      returnByValue: true,
      functionDeclaration: `function () {
        const element = this.nodeType === Node.TEXT_NODE ? this.parentElement : this;
        if (!(element instanceof Element)) return null;
        if (element.closest('[data-engine-zoom]') !== null) return 'playground-stat';
        if (element.closest('[data-xploder-navigator]') !== null) return 'navigator';
        if (element.closest('[role="dialog"]') !== null) return 'dialog';
        if (element.closest('[data-xploder-live]') !== null) return 'live';
        if (element.closest('[data-xploder-caption]') !== null) return 'caption';
        return null;
      }`,
    })) as { result?: { value?: unknown } };
    const value = result.result?.value;

    return value === 'navigator' ||
      value === 'dialog' ||
      value === 'live' ||
      value === 'caption' ||
      value === 'playground-stat'
      ? value
      : null;
  } catch {
    return null;
  }
}

async function ignoredAxRoots(
  page: Page,
  cdp: CDPSession,
  nodes: readonly AxNode[],
): Promise<{ readonly pass: boolean; readonly roots: readonly string[] }> {
  await cdp.send('DOM.enable');
  const document = (await cdp.send('DOM.getDocument', { depth: -1, pierce: true })) as {
    root: { nodeId: number };
  };
  const selectors = ['[data-xploder-lettering-layer]', '[data-xploder-callouts]'];
  const roots: string[] = [];
  let pass = true;

  for (const selector of selectors) {
    const queried = (await cdp.send('DOM.querySelector', {
      nodeId: document.root.nodeId,
      selector,
    })) as { nodeId: number };
    if (queried.nodeId === 0) {
      roots.push(`${selector}:missing`);
      continue;
    }

    const described = (await cdp.send('DOM.describeNode', {
      nodeId: queried.nodeId,
      depth: 0,
    })) as { node: { backendNodeId: number } };
    const matching = nodes.filter((node) => node.backendDOMNodeId === described.node.backendNodeId);

    if (matching.some((node) => node.ignored !== true)) pass = false;
    roots.push(
      `${selector}:${matching.length === 0 ? 'omitted' : matching.every((node) => node.ignored) ? 'ignored' : 'exposed'}`,
    );
  }

  return { pass, roots };
}

function expectedChips(
  project: A11yFixtureProject,
  componentId: string,
  registry: A11yFixtureRegistry,
): readonly { readonly label: string; readonly category: string }[] {
  const techs = new Map(registry.techs.map((tech) => [tech.id, tech]));

  return (componentById(project, componentId).techs ?? []).map((id) => {
    const tech = techs.get(id);
    return { label: tech?.label ?? id, category: tech?.category ?? 'unknown' };
  });
}

async function captureAxState(
  page: Page,
  state: string,
): Promise<{
  readonly state: string;
  readonly ariaSnapshot: string;
  readonly nodes: readonly {
    readonly role: string;
    readonly name: string;
    readonly description: string;
    readonly ignored: boolean;
  }[];
  readonly partNumbers: readonly AxPartNumberNode[];
  readonly partNumberVerdict: ReturnType<typeof evaluateAxPartNumberNodes>;
  readonly ignoredRoots: Awaited<ReturnType<typeof ignoredAxRoots>>;
  readonly liveRegions: readonly { readonly politeness: string; readonly text: string }[];
}> {
  const { cdp, nodes } = await cdpAccessibilityTree(page);
  const ariaSnapshot = await page.locator(VIEWER_GROUP_SELECTOR).ariaSnapshot();
  const partNumbers: AxPartNumberNode[] = [];

  for (const node of nodes) {
    const role = node.role?.value ?? '';
    const text = node.name?.value ?? '';
    if (role !== 'StaticText' || !PART_NUMBER.test(text)) continue;
    partNumbers.push({ role, text, allowedRoot: await allowedRootForAxNode(cdp, node) });
  }

  const roots = await ignoredAxRoots(page, cdp, nodes);
  const liveRegions = await page.evaluate((selector) => {
    const viewer = document.querySelector(selector);
    if (viewer === null) return [];

    return [...viewer.querySelectorAll<HTMLElement>('[aria-live]')].map((element) => ({
      politeness: element.getAttribute('aria-live') ?? '',
      text: element.textContent?.trim() ?? '',
    }));
  }, VIEWER_SELECTOR);
  const summary = nodes.map((node) => ({
    role: node.role?.value ?? '',
    name: node.name?.value ?? '',
    description: node.description?.value ?? '',
    ignored: node.ignored === true,
  }));

  await cdp.detach();

  return {
    state,
    ariaSnapshot,
    nodes: summary,
    partNumbers,
    partNumberVerdict: evaluateAxPartNumberNodes(partNumbers),
    ignoredRoots: roots,
    liveRegions,
  };
}

async function runAriaGroup(
  browser: Browser,
  base: URL,
  fixtures: A11yFixtures,
  log: (line: string) => void,
): Promise<GroupResult> {
  const context = await browser.newContext(contextOptions('light'));
  const page = await openPage(context, fixtureUrl(base, 'a'));
  const checks: ProbeCheck[] = [];
  const states: Awaited<ReturnType<typeof captureAxState>>[] = [];

  await waitForReady(page);
  const idle = await captureAxState(page, 'idle');
  states.push(idle);
  const polite = idle.liveRegions.filter((region) => region.politeness === 'polite');
  checks.push(
    check(
      'aria-one-polite-live-region-idle',
      polite.length === 1 && polite[0]?.text === '',
      { count: 1, text: '' },
      idle.liveRegions,
    ),
  );

  await focusProxy(page, 'tide-repository');
  const focused = await captureAxState(page, 'component-focused');
  states.push(focused);

  await page.goto(fixtureUrl(base, 'a', { select: 'tide-repository' }).href, {
    waitUntil: 'load',
    timeout: WAIT_TIMEOUT_MS,
  });
  await waitForReady(page, true);
  const detail = await captureAxState(page, 'detail');
  states.push(detail);
  const dialog = detail.nodes.find(
    (node) => node.role === 'dialog' && node.name === 'Tide Repository',
  );
  const description = dialog?.description ?? '';
  checks.push(
    check(
      'aria-detail-dialog-name-description',
      dialog !== undefined &&
        description.includes('module · shipped') &&
        description.includes(componentById(fixtures.a, 'tide-repository').summary ?? ''),
      {
        name: 'Tide Repository',
        descriptionIncludes: [
          'module · shipped',
          componentById(fixtures.a, 'tide-repository').summary ?? '',
        ],
      },
      { name: dialog?.name ?? null, description },
    ),
  );

  const chipSnapshot = await page.locator('[aria-label="Tech"]').ariaSnapshot();
  const chipTexts = chipSnapshot
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.startsWith('- listitem:'))
    .map((line) => line.replace(/^- listitem:\s*/, '').replace(/\s+, /g, ', '));
  const chips = expectedChips(fixtures.a, 'tide-repository', fixtures.registry);
  const chipExpected = chips.map((chip) => `${chip.label}, ${chip.category}`);
  checks.push(
    check(
      'aria-chip-label-category-sequence',
      sameStrings(chipTexts, chipExpected),
      chipExpected,
      chipTexts,
    ),
  );
  log(
    `aria chips: ${chips.map((chip) => `${chip.label}, ${chip.category}`).join(' | ')} snapshot=${JSON.stringify(
      chipSnapshot
        .split('\n')
        .filter((line) => line.includes('listitem:'))
        .map((line) => line.trim()),
    )}`,
  );

  await page.goto(fixtureUrl(base, 'a', { panel: 'case-study' }).href, {
    waitUntil: 'load',
    timeout: WAIT_TIMEOUT_MS,
  });
  await waitForReady(page, true);
  const caseStudy = await captureAxState(page, 'case-study');
  states.push(caseStudy);

  await page.goto(fixtureUrl(base, 'a', { tour: 'paused', step: '0' }).href, {
    waitUntil: 'load',
    timeout: WAIT_TIMEOUT_MS,
  });
  await waitForReady(page, false, false);
  const tour = await captureAxState(page, 'tour-step1');
  states.push(tour);

  await focusProxy(page, 'tide-repository');
  await page.keyboard.press('Enter');
  await page.waitForFunction(
    (selector) => document.querySelector(selector)?.getAttribute('data-xploder-tour-step') === '3',
    VIEWER_SELECTOR,
    { timeout: WAIT_TIMEOUT_MS },
  );
  const jump = await captureAxState(page, 'jump');
  states.push(jump);

  checks.push(
    check(
      'aria-lettering-overlay-ignored',
      states.every((state) => state.ignoredRoots.pass),
      'lettering and overlay omitted from AX',
      states.map((state) => ({ state: state.state, roots: state.ignoredRoots.roots })),
    ),
    check(
      'aria-part-numbers-outside-allowed-roots',
      states.every((state) => state.partNumberVerdict.pass),
      [],
      states.flatMap((state) =>
        state.partNumberVerdict.offenders.map((offender) => ({ state: state.state, ...offender })),
      ),
    ),
  );

  for (const state of states) {
    log(
      `aria ${state.state}: ${state.ariaSnapshot.split('\n').length} snapshot lines, ${state.nodes.length} AX nodes, part-number-verdict=${state.partNumberVerdict.pass ? 'PASS' : 'FAIL'}, ignored-roots=${state.ignoredRoots.pass ? 'PASS' : 'FAIL'}`,
    );
    for (const line of state.ariaSnapshot.split('\n')) log(`aria ${state.state} | ${line}`);
  }

  await context.close();
  return {
    group: 'aria',
    pass: checks.every((entry) => entry.pass),
    checks,
    data: { states },
    lines: [],
  };
}

async function waitForLiveText(page: Page, expected: string): Promise<string> {
  await page.waitForFunction(
    ({ selector, text }) => document.querySelector(selector)?.textContent === text,
    { selector: LIVE_SELECTOR, text: expected },
    { timeout: WAIT_TIMEOUT_MS },
  );
  return (await page.locator(LIVE_SELECTOR).textContent()) ?? '';
}

async function runAnnounceGroup(
  browser: Browser,
  base: URL,
  fixtures: A11yFixtures,
  log: (line: string) => void,
): Promise<GroupResult> {
  const expected = expectedAnnouncements(fixtures.a);
  const checks: ProbeCheck[] = [];
  const data: unknown[] = [];
  const context = await browser.newContext(contextOptions('light'));
  const page = await openPage(context, fixtureUrl(base, 'a'));
  await waitForReady(page);
  const live = page.locator(LIVE_SELECTOR);
  const initial = (await live.textContent()) ?? '';
  checks.push(check('announce-empty-at-mount', initial === '', '', initial));

  await focusProxy(page, 'tide-repository');
  await page.keyboard.press('Enter');
  await waitForPanelReady(page);
  const opened = await waitForLiveText(page, expected.detailOpen);
  await page.keyboard.press('Escape');
  await waitForPanelClosed(page);
  const closed = await waitForLiveText(page, expected.detailClose);
  checks.push(
    check('announce-detail-open', opened === expected.detailOpen, expected.detailOpen, opened),
    check('announce-detail-close', closed === expected.detailClose, expected.detailClose, closed),
  );
  data.push({ event: 'detail-open', text: opened }, { event: 'detail-close', text: closed });

  await page.locator('[data-engine-control="case-study"]').click();
  await waitForPanelReady(page);
  const caseOpen = await waitForLiveText(page, expected.caseStudyOpen);
  await page.keyboard.press('Escape');
  await waitForPanelClosed(page);
  const caseClose = await waitForLiveText(page, expected.caseStudyClose);
  checks.push(
    check(
      'announce-case-study-open',
      caseOpen === expected.caseStudyOpen,
      expected.caseStudyOpen,
      caseOpen,
    ),
    check(
      'announce-case-study-close',
      caseClose === expected.caseStudyClose,
      expected.caseStudyClose,
      caseClose,
    ),
  );
  data.push(
    { event: 'case-study-open', text: caseOpen },
    { event: 'case-study-close', text: caseClose },
  );
  await context.close();

  const reduced = await browser.newContext(contextOptions('light', true));
  const tourPage = await openPage(
    reduced,
    fixtureUrl(base, 'a', { tour: 'play', flow: 'live-update' }),
  );
  await waitForReady(tourPage, false, false);
  const step1 = await waitForLiveText(tourPage, expected.step1);
  await focusProxy(tourPage, 'tide-repository');
  await tourPage.keyboard.press('Enter');
  await tourPage.waitForFunction(
    (selector) => document.querySelector(selector)?.getAttribute('data-xploder-tour-step') === '3',
    VIEWER_SELECTOR,
    { timeout: WAIT_TIMEOUT_MS },
  );
  const jump = await waitForLiveText(tourPage, expected.jump);
  await focusProxy(tourPage, 'forecast-details-panel');
  await tourPage.keyboard.press('Enter');
  await waitForPanelReady(tourPage);
  const paused = await waitForLiveText(tourPage, expected.pausedOpen);
  checks.push(
    check('announce-tour-step1', step1 === expected.step1, expected.step1, step1),
    check('announce-tour-jump', jump === expected.jump, expected.jump, jump),
    check('announce-tour-paused-open', paused === expected.pausedOpen, expected.pausedOpen, paused),
  );
  data.push(
    { event: 'tour-step1', text: step1 },
    { event: 'tour-jump', text: jump },
    { event: 'tour-paused-open', text: paused },
  );
  await reduced.close();

  for (const row of data as { event: string; text: string }[]) {
    log(`announce ${row.event}: ${JSON.stringify(row.text)} PASS`);
  }

  return { group: 'announce', pass: checks.every((entry) => entry.pass), checks, data, lines: [] };
}

async function collectTextNodes(page: Page): Promise<readonly TextNodeObservation[]> {
  return await page.evaluate((viewerSelector) => {
    interface Colour {
      r: number;
      g: number;
      b: number;
      a: number;
    }

    function clamp(value: number): number {
      return Math.max(0, Math.min(255, Math.round(value)));
    }

    function parse(value: string): Colour | null {
      const trimmed = value.trim().toLowerCase();
      if (trimmed === 'transparent') return { r: 0, g: 0, b: 0, a: 0 };
      const match = /^rgba?\(([^)]+)\)$/.exec(trimmed);
      if (match === null) return null;
      const parts = (match[1] ?? '')
        .replaceAll('/', ' ')
        .split(/[ ,]+/)
        .filter(Boolean)
        .map(Number);
      const [r, g, b, alpha = 1] = parts;
      if (r === undefined || g === undefined || b === undefined) return null;
      return { r: clamp(r), g: clamp(g), b: clamp(b), a: Math.max(0, Math.min(1, alpha)) };
    }

    function composite(foreground: Colour, background: Colour): Colour {
      const alpha = foreground.a + background.a * (1 - foreground.a);
      if (alpha <= 0) return { r: 0, g: 0, b: 0, a: 0 };
      return {
        r: clamp(
          (foreground.r * foreground.a + background.r * background.a * (1 - foreground.a)) / alpha,
        ),
        g: clamp(
          (foreground.g * foreground.a + background.g * background.a * (1 - foreground.a)) / alpha,
        ),
        b: clamp(
          (foreground.b * foreground.a + background.b * background.a * (1 - foreground.a)) / alpha,
        ),
        a: alpha,
      };
    }

    function css(colour: Colour): string {
      return `rgb(${clamp(colour.r)}, ${clamp(colour.g)}, ${clamp(colour.b)})`;
    }

    function pathFor(element: Element): string {
      const parts: string[] = [];
      let current: Element | null = element;

      while (current !== null && current !== document.body) {
        const dataName = [...current.attributes]
          .map((attribute) => attribute.name)
          .find((name) => name.startsWith('data-xploder-') || name.startsWith('data-engine-'));
        const dataValue = dataName === undefined ? null : current.getAttribute(dataName);
        const marker =
          dataName === undefined
            ? current.tagName.toLowerCase()
            : `${current.tagName.toLowerCase()}[${dataName}${dataValue === '' ? '' : `="${dataValue}"`}]`;
        const siblings = current.parentElement
          ? [...current.parentElement.children].filter(
              (child) => child.tagName === current?.tagName,
            )
          : [];
        const index = siblings.indexOf(current) + 1;
        parts.unshift(`${marker}:nth-of-type(${index})`);
        current = current.parentElement;
      }

      return parts.join('/');
    }

    function backgroundFor(element: Element): {
      colour: Colour;
      opacity: number;
      opaqueBeforeCanvas: boolean;
    } {
      const layers: Colour[] = [];
      let opacity = 1;
      let current: Element | null = element;
      let opaqueBeforeCanvas = false;

      while (current !== null) {
        const computed = getComputedStyle(current);
        const colour = parse(computed.backgroundColor);
        if (colour !== null && colour.a > 0) {
          layers.push(colour);
          if (colour.a >= 0.999 && current.matches('[data-xploder-canvas-viewport]') === false) {
            opaqueBeforeCanvas = true;
          }
        }
        opacity *= Number(computed.opacity || '1');
        current = current.parentElement;
      }

      let result: Colour = { r: 255, g: 255, b: 255, a: 1 };
      for (const layer of layers.reverse()) result = composite(layer, result);
      return { colour: result, opacity, opaqueBeforeCanvas };
    }

    const viewer = document.querySelector(viewerSelector);
    const main = document.querySelector('main');
    if (main === null) return [];

    const observations: TextNodeObservation[] = [];
    let index = 0;

    for (const element of main.querySelectorAll<HTMLElement>('*')) {
      const directText = [...element.childNodes]
        .filter((node) => node.nodeType === Node.TEXT_NODE)
        .map((node) => node.textContent ?? '')
        .join(' ')
        .trim()
        .replace(/\s+/g, ' ');
      if (directText === '') continue;
      if (['SCRIPT', 'STYLE', 'NOSCRIPT'].includes(element.tagName)) continue;

      const computed = getComputedStyle(element);
      if (computed.display === 'none' || computed.visibility === 'hidden') continue;
      const rect = element.getBoundingClientRect();
      if (rect.width <= 1 || rect.height <= 1) continue;
      if (computed.clipPath.includes('inset(50%)')) continue;

      const backdrop = backgroundFor(element);
      if (backdrop.opacity <= 0.01) continue;

      const inViewer = viewer?.contains(element) === true;
      const panel = element.closest('[data-xploder-panel-surface]') !== null;
      const lettering = element.closest('[data-xploder-lettering-layer]') !== null;
      const overlay = element.closest('[data-xploder-callouts]') !== null;
      const surface = panel
        ? 'panel'
        : lettering
          ? 'lettering'
          : overlay
            ? 'overlay'
            : inViewer
              ? 'viewer'
              : 'playground';
      const ownBackground = parse(computed.backgroundColor);
      const pixelMethod =
        lettering ||
        (overlay &&
          (ownBackground === null || ownBackground.a === 0) &&
          !backdrop.opaqueBeforeCanvas);
      const fontSize = Number.parseFloat(computed.fontSize) || 16;
      const fontWeight = Number.parseInt(computed.fontWeight, 10) || 400;
      const dimmed = viewer?.hasAttribute('data-xploder-focus') === true && backdrop.opacity < 0.99;
      const inactive = element.closest(':disabled') !== null;

      if (pixelMethod) element.setAttribute('data-a11y-contrast-id', String(index));

      observations.push({
        id: index,
        surface,
        selector: pathFor(element),
        text: directText,
        fg: computed.color,
        bg: css(backdrop.colour),
        opacity: backdrop.opacity,
        fontSize,
        fontWeight,
        rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
        pixelMethod,
        dimmed,
        inactive,
      });
      index += 1;
    }

    return observations;
  }, VIEWER_SELECTOR);
}

async function sampleBackgroundPixels(
  page: Page,
  observations: readonly TextNodeObservation[],
): Promise<Map<number, readonly Rgba[]>> {
  const pixelObservations = observations.filter((observation) => observation.pixelMethod);
  if (pixelObservations.length === 0) return new Map();

  const visibleScreenshot = await page.screenshot({ type: 'png', fullPage: true });
  const style = await page.addStyleTag({
    content: '[data-a11y-contrast-id]{visibility:hidden !important}',
  });
  let backgroundScreenshot: Buffer;

  try {
    backgroundScreenshot = await page.screenshot({ type: 'png', fullPage: true });
  } finally {
    await page.evaluate(() => {
      for (const element of document.querySelectorAll('[data-a11y-contrast-id]')) {
        element.removeAttribute('data-a11y-contrast-id');
      }
    });
    await style.evaluate((element) => {
      if (element instanceof Element) element.remove();
    });
  }

  const visibleDataUrl = `data:image/png;base64,${visibleScreenshot.toString('base64')}`;
  const backgroundDataUrl = `data:image/png;base64,${backgroundScreenshot.toString('base64')}`;
  const scroll = await page.evaluate(() => ({ x: window.scrollX, y: window.scrollY }));
  const boxes = pixelObservations.map((observation) => ({
    id: observation.id,
    x: observation.rect.x + scroll.x,
    y: observation.rect.y + scroll.y,
    width: observation.rect.width,
    height: observation.rect.height,
  }));
  const sampled = await page.evaluate(
    async ({ visibleUrl, backgroundUrl, targets, budget, strideLimit, glyphDelta }) => {
      async function load(url: string): Promise<HTMLCanvasElement | null> {
        const image = new Image();
        image.src = url;
        await image.decode();
        const canvas = document.createElement('canvas');
        canvas.width = image.naturalWidth;
        canvas.height = image.naturalHeight;
        const context = canvas.getContext('2d', { willReadFrequently: true });
        if (context === null) return null;
        context.drawImage(image, 0, 0);
        return canvas;
      }

      const visible = await load(visibleUrl);
      const background = await load(backgroundUrl);
      if (visible === null || background === null) return {};
      const visibleContext = visible.getContext('2d', { willReadFrequently: true });
      const backgroundContext = background.getContext('2d', { willReadFrequently: true });
      if (visibleContext === null || backgroundContext === null) return {};
      if (visible.width !== background.width || visible.height !== background.height) return {};

      const result: Record<number, { r: number; g: number; b: number; a: number }[]> = {};

      for (const target of targets) {
        const left = Math.max(0, Math.floor(target.x));
        const top = Math.max(0, Math.floor(target.y));
        const right = Math.min(visible.width, Math.ceil(target.x + target.width));
        const bottom = Math.min(visible.height, Math.ceil(target.y + target.height));
        if (right <= left || bottom <= top) {
          result[target.id] = [];
          continue;
        }

        const width = right - left;
        const height = bottom - top;
        const stride = Math.max(
          1,
          Math.min(strideLimit, Math.ceil(Math.sqrt((width * height) / budget))),
        );
        const pixels: { r: number; g: number; b: number; a: number }[] = [];

        for (let y = top; y < bottom; y += stride) {
          for (let x = left; x < right; x += stride) {
            const shown = visibleContext.getImageData(x, y, 1, 1).data;
            const hidden = backgroundContext.getImageData(x, y, 1, 1).data;
            const differs =
              Math.max(
                Math.abs((shown[0] ?? 0) - (hidden[0] ?? 0)),
                Math.abs((shown[1] ?? 0) - (hidden[1] ?? 0)),
                Math.abs((shown[2] ?? 0) - (hidden[2] ?? 0)),
                Math.abs((shown[3] ?? 255) - (hidden[3] ?? 255)),
              ) >= glyphDelta;

            if (differs) {
              pixels.push({
                r: hidden[0] ?? 0,
                g: hidden[1] ?? 0,
                b: hidden[2] ?? 0,
                a: (hidden[3] ?? 255) / 255,
              });
            }
          }
        }

        result[target.id] = pixels;
      }

      return result;
    },
    {
      visibleUrl: visibleDataUrl,
      backgroundUrl: backgroundDataUrl,
      targets: boxes,
      budget: PIXEL_SAMPLE_BUDGET,
      strideLimit: PIXEL_STRIDE_LIMIT,
      glyphDelta: PIXEL_GLYPH_DELTA,
    },
  );

  return new Map(Object.entries(sampled).map(([id, pixels]) => [Number(id), pixels] as const));
}

function thresholdFor(observation: TextNodeObservation): number {
  const large =
    observation.fontSize >= 24 || (observation.fontSize >= 18.66 && observation.fontWeight >= 700);
  return large ? 3 : 4.5;
}

async function contrastRowsForState(
  page: Page,
  scheme: Palette,
  state: string,
): Promise<readonly ContrastRow[]> {
  const observations = await collectTextNodes(page);
  const pixels = await sampleBackgroundPixels(page, observations);
  const rows: ContrastRow[] = [];

  for (const observation of observations) {
    const foreground = parseRgba(observation.fg);
    const background = parseRgba(observation.bg);
    if (foreground === null || background === null) continue;
    const threshold = thresholdFor(observation);

    if (observation.pixelMethod) {
      const patch = pixels.get(observation.id) ?? [];
      const verdict = evaluatePixelContrast(patch, foreground);
      const exception = contrastException(observation);
      if (verdict.sampleCount === 0) {
        // Fully clipped / off-canvas glyphs: recorded, never silently dropped.
        rows.push({
          surface: observation.surface,
          scheme,
          state,
          selector: observation.selector,
          text: observation.text,
          fg: observation.fg,
          bg: observation.bg,
          ratio: Number.NaN,
          threshold,
          pass: false,
          method: 'pixel',
          ...(exception === undefined ? {} : { exception }),
          unmeasured: true,
          pixels: 0,
        });
        continue;
      }
      const pass = verdict.worst >= threshold;
      rows.push({
        surface: observation.surface,
        scheme,
        state,
        selector: observation.selector,
        text: observation.text,
        fg: observation.fg,
        bg: verdict.sampleCount === 0 ? observation.bg : formatRgba(verdict.worstBackground),
        ratio: verdict.worst,
        threshold,
        pass,
        method: 'pixel',
        ...(exception === undefined ? {} : { exception }),
        medianRatio: verdict.median,
        pixels: verdict.sampleCount,
      });
      continue;
    }

    const effectiveForeground = composite(withOpacity(foreground, observation.opacity), background);
    const ratio = contrastRatio(effectiveForeground, background);
    const exception = contrastException(observation);
    rows.push({
      surface: observation.surface,
      scheme,
      state,
      selector: observation.selector,
      text: observation.text,
      fg: observation.fg,
      bg: observation.bg,
      ratio,
      threshold,
      pass: ratio >= threshold,
      method: 'computed',
      ...(exception === undefined ? {} : { exception }),
    });
  }

  return rows;
}

function contrastException(observation: {
  readonly dimmed?: boolean;
  readonly inactive?: boolean;
}): ContrastRow['exception'] {
  if (observation.inactive === true) return 'disabled-control';
  if (observation.dimmed === true) return 'inactive-dim';
  return undefined;
}

async function zoomIn(page: Page, count: number, requireHighlightedName = false): Promise<void> {
  for (let index = 0; index < count; index += 1) {
    await page.locator('[data-engine-control="zoom-in"]').evaluate((element) => {
      if (element instanceof HTMLElement) element.click();
    });
    await page.waitForFunction(
      (selector) =>
        document.querySelector(selector)?.getAttribute('data-xploder-tweening') === 'false',
      VIEWER_SELECTOR,
      { timeout: WAIT_TIMEOUT_MS },
    );
  }
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForFunction(
    ({ selector, letteringSelector, requireName }) => {
      const viewer = document.querySelector(selector);
      const layer = document.querySelector(letteringSelector);
      const highlighted = document.querySelector('[data-xploder-lettering="tide-repository"]');

      return (
        viewer?.getAttribute('data-xploder-tweening') === 'false' &&
        viewer.getAttribute('data-xploder-lettering') === 'shown' &&
        layer !== null &&
        Number.parseFloat(getComputedStyle(layer).opacity) > 0.99 &&
        (!requireName || /Tide\s*Repository/.test(highlighted?.textContent ?? ''))
      );
    },
    {
      selector: VIEWER_SELECTOR,
      letteringSelector: '[data-xploder-lettering-layer]',
      requireName: requireHighlightedName,
    },
    { timeout: WAIT_TIMEOUT_MS },
  );
  await frames(page, 3);
}

async function runContrastGroup(
  browser: Browser,
  base: URL,
  log: (line: string) => void,
  outDir: string,
): Promise<GroupResult> {
  const rows: ContrastRow[] = [];
  const checks: ProbeCheck[] = [];

  for (const scheme of PALETTES) {
    const context = await browser.newContext(contextOptions(scheme));

    const highlightPage = await openPage(
      context,
      fixtureUrl(base, 'a', { highlight: 'tide-repository' }),
    );
    await waitForReady(highlightPage);
    await zoomIn(highlightPage, 4, true);
    rows.push(...(await contrastRowsForState(highlightPage, scheme, 'highlight-2.44x')));
    // At 2.44x part of the stack is scrolled off the canvas; sample it at the stage's top and bottom too.
    for (const edge of ['top', 'bottom'] as const) {
      await highlightPage.evaluate((position) => {
        const stage = document.querySelector('[data-xploder-stage]');
        if (!(stage instanceof HTMLElement)) return;
        stage.scrollTop = position === 'top' ? 0 : stage.scrollHeight;
        stage.dispatchEvent(new Event('scroll'));
      }, edge);
      await frames(highlightPage);
      rows.push(...(await contrastRowsForState(highlightPage, scheme, `highlight-2.44x-${edge}`)));
    }

    const highlightRows = rows.filter(
      (row) =>
        row.scheme === scheme &&
        row.state === 'highlight-2.44x' &&
        row.surface === 'lettering' &&
        row.selector.includes('tide-repository'),
    );
    const numberRows = highlightRows.filter((row) => PART_NUMBER.test(row.text));
    const nameRows = highlightRows.filter((row) => !PART_NUMBER.test(row.text));
    const displayedName = nameRows.map((row) => row.text).join(' ');
    const letteringPass =
      numberRows.length > 0 &&
      nameRows.length > 0 &&
      /^Tide\s*Repository$/i.test(displayedName) &&
      [...numberRows, ...nameRows].every((row) => row.pass);
    checks.push(
      check(
        `contrast-${scheme}-highlighted-face`,
        letteringPass,
        'number and name visible at >=4.5:1',
        [...numberRows, ...nameRows].map((row) => ({
          text: row.text,
          ratio: row.ratio,
          fg: row.fg,
          bg: row.bg,
        })),
      ),
    );
    log(
      `contrast ${scheme} highlighted face: ${[...numberRows, ...nameRows].map((row) => `${JSON.stringify(row.text)}=${row.ratio.toFixed(2)} (${row.method})`).join(', ')} ${letteringPass ? 'PASS' : 'FAIL'}`,
    );

    const detailPage = await openPage(
      context,
      fixtureUrl(base, 'a', { select: 'tide-repository' }),
    );
    await waitForReady(detailPage, true);
    rows.push(...(await contrastRowsForState(detailPage, scheme, 'detail-open')));

    const focusPage = await openPage(context, fixtureUrl(base, 'a', { focus: 'ui' }));
    await waitForReady(focusPage);
    rows.push(...(await contrastRowsForState(focusPage, scheme, 'layer-focus')));
    await context.close();
  }

  // An off-canvas glyph at one scroll position is covered when the same text is measured at another.
  const measuredKeys = new Set(
    rows
      .filter((row) => row.unmeasured !== true)
      .map(
        (row) =>
          `${row.scheme}|${row.surface}|${row.text}|${row.state.split('-').slice(0, 2).join('-')}`,
      ),
  );
  for (const [index, row] of rows.entries()) {
    if (row.unmeasured !== true) continue;
    const key = `${row.scheme}|${row.surface}|${row.text}|${row.state.split('-').slice(0, 2).join('-')}`;
    if (measuredKeys.has(key)) rows[index] = { ...row, coveredElsewhere: true };
  }
  const measured = rows.filter((row) => row.unmeasured !== true);
  const failing = measured.filter((row) => !row.pass && row.exception === undefined);
  const excepted = measured.filter((row) => !row.pass && row.exception !== undefined);
  const unmeasured = rows.filter((row) => row.unmeasured === true && row.coveredElsewhere !== true);
  checks.push(
    check('contrast-all-text-rows-aa', failing.length === 0, [], failing.slice(0, 20)),
    check('contrast-exceptions-only-dim-or-disabled', true, 'reported, not failed', {
      inactiveDim: excepted.filter((row) => row.exception === 'inactive-dim').length,
      disabledControl: excepted.filter((row) => row.exception === 'disabled-control').length,
    }),
    check('contrast-unmeasured-reported', true, 'reported, not failed', unmeasured.length),
  );

  for (const row of rows) {
    log(
      `contrast ${row.scheme} ${row.state} ${row.surface} ${JSON.stringify(row.text).slice(0, 80)} ${row.ratio.toFixed(2)}/${row.threshold} ${row.method} ${row.exception ?? ''} ${row.unmeasured === true ? 'UNMEASURED' : row.pass ? 'PASS' : row.exception === undefined ? 'FAIL' : 'EXCEPTION'}`,
    );
  }

  await writeFile(
    join(outDir, 'contrast-browser.json'),
    `${JSON.stringify({ kind: 'contrast-browser', version: 1, rows }, null, 2)}\n`,
  );

  return {
    group: 'contrast',
    pass: checks.every((entry) => entry.pass),
    checks,
    data: {
      rows,
      failing: failing.length,
      excepted: excepted.length,
      unmeasured: unmeasured.length,
    },
    lines: [],
  };
}

interface MotionMatrixRow {
  readonly id: string;
  readonly slice: string;
  readonly trigger: string;
}

async function loadMotionMatrix(): Promise<readonly MotionMatrixRow[]> {
  const raw = await readFile(
    new URL('../../../packages/xploder/test/a11y-motion-matrix.json', import.meta.url),
    'utf8',
  );
  const parsed = JSON.parse(raw) as unknown;

  if (!Array.isArray(parsed)) throw new CliError(EXIT.INTERNAL, 'motion matrix is malformed');
  return parsed as MotionMatrixRow[];
}

async function sampleMotion(page: Page): Promise<readonly ReducedMotionSample[]> {
  return await page.evaluate(
    async ({ selector, duration }) => {
      const viewer = document.querySelector(selector);
      const samples: { animations: number; tweening: boolean; frame: number }[] = [];
      const start = performance.now();
      let nextFrame = Number(
        document.querySelector<HTMLElement>('[data-engine-frame]')?.dataset.engineFrame ?? 0,
      );

      await new Promise<void>((resolveSample) => {
        function sample(timestamp: number): void {
          if (viewer !== null) {
            nextFrame = Number(
              document.querySelector<HTMLElement>('[data-engine-frame]')?.dataset.engineFrame ??
                nextFrame,
            );
            samples.push({
              animations: document.getAnimations().length,
              tweening: viewer.getAttribute('data-xploder-tweening') === 'true',
              frame: nextFrame,
            });
          }

          if (timestamp - start >= duration) resolveSample();
          else requestAnimationFrame(sample);
        }

        requestAnimationFrame(sample);
      });

      return samples;
    },
    { selector: VIEWER_SELECTOR, duration: MOTION_SAMPLE_MS },
  );
}

async function triggerMotionRow(page: Page, id: string): Promise<void> {
  switch (id) {
    case 'explode-implode':
      await page.locator('[data-engine-control="toggle"]').click();
      break;
    case 'camera-turn':
      await page.locator('[data-engine-control="rotate-right"]').click();
      break;
    case 'camera-zoom':
      await page.locator('[data-engine-control="zoom-in"]').click();
      break;
    case 'hover-and-dim':
      await focusProxy(page, 'tide-repository');
      break;
    case 'tour-pulse-and-beat':
    case 'tour-caption-fade':
      await page.locator('[data-engine-control="tour-play"]').click();
      break;
    case 'circuit-trace':
      await page.locator('[data-engine-control="flow-live-update"]').click();
      await page.locator('[data-engine-control="tour-play"]').click();
      break;
    case 'overlay-and-title-fade':
      await focusProxy(page, 'tide-repository');
      break;
    case 'panel-enter-exit':
      await focusProxy(page, 'tide-repository');
      await page.keyboard.press('Enter');
      await waitForPanelReady(page);
      break;
    case 'lettering-and-column-fade':
      await zoomIn(page, 3);
      await focusProxy(page, 'tide-repository');
      break;
    case 'tailwind-default-transition':
      await page.locator('[data-engine-control="fixture-a"]').hover();
      break;
    case 'focus-ring-and-reveal':
      await focusProxy(page, 'tide-repository');
      break;
    default:
      throw new CliError(EXIT.INTERNAL, `unrecognised motion matrix row: ${id}`);
  }
}

function motionRowUsesThreeD(row: MotionMatrixRow): boolean {
  return THREE_D_MOTION_ROWS.has(row.id);
}

async function runReducedMotionGroup(
  browser: Browser,
  base: URL,
  log: (line: string) => void,
): Promise<GroupResult> {
  const matrix = await loadMotionMatrix();
  const checks: ProbeCheck[] = [];
  const rows: unknown[] = [];

  for (const row of matrix) {
    const context = await browser.newContext(contextOptions('light', true));
    const page = await openPage(context, fixtureUrl(base, 'a'));
    await waitForReady(page);
    await triggerMotionRow(page, row.id);
    const samples = await sampleMotion(page);
    const verdict = evaluateReducedMotion(samples, motionRowUsesThreeD(row));
    checks.push(
      check(
        `reduced-motion-${row.id}`,
        verdict.pass,
        {
          maxAnimations: 0,
          tweening: false,
          frameDeltaMax: motionRowUsesThreeD(row) ? MOTION_FRAME_MAX : null,
        },
        verdict,
      ),
    );
    rows.push({ id: row.id, trigger: row.trigger, threeD: motionRowUsesThreeD(row), verdict });
    log(
      `reduced-motion ${row.id}: animations max=${verdict.maxAnimations} tweening=${verdict.tweeningSeen} frame-delta=${verdict.frameDelta} samples=${verdict.samples} ${verdict.pass ? 'PASS' : 'FAIL'}`,
    );
    await context.close();
  }

  return {
    group: 'reduced-motion',
    pass: checks.every((entry) => entry.pass),
    checks,
    data: rows,
    lines: [],
  };
}

function faviconConsoleError(message: {
  readonly text: () => string;
  readonly location: () => { readonly url: string };
}): boolean {
  try {
    return new URL(message.location().url).pathname === FAVICON_PATH;
  } catch {
    return false;
  }
}

async function noJsFallback(
  browser: Browser,
  base: URL,
  scheme: Palette,
  outDir: string,
): Promise<{ readonly pass: boolean; readonly actual: unknown; readonly screenshot: string }> {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 1,
    javaScriptEnabled: false,
    colorScheme: scheme,
  });
  const page = await context.newPage();
  const screenshot = `nojs-${scheme}.png`;

  await page.goto(fixtureUrl(base, 'a').href, { waitUntil: 'load', timeout: WAIT_TIMEOUT_MS });
  await page.screenshot({ path: join(outDir, screenshot), fullPage: true });
  const actual = await page.evaluate(() => {
    const poster = document.querySelector<SVGElement>('[data-engine-fallback] svg[role="img"]');
    const links = [
      ...document.querySelectorAll('[data-engine-fallback] nav[aria-label="Projects"] a'),
    ].map((link) => link.textContent?.trim() ?? '');
    const loading = document.querySelector<HTMLElement>('[data-engine-loading]');
    return {
      posterRole: poster?.getAttribute('role') ?? null,
      posterName: poster?.getAttribute('aria-label') ?? null,
      posterWidth: poster?.getBoundingClientRect().width ?? 0,
      links,
      loadingDisplay: loading === null ? 'absent' : getComputedStyle(loading).display,
    };
  });
  await context.close();

  const pass =
    actual.posterRole === 'img' &&
    actual.posterName === 'Tidewatch architecture: 4 layers, 8 components' &&
    actual.posterWidth > 1 &&
    sameStrings(actual.links, ['Tidewatch', 'Ledgerline', 'Lockerbay']) &&
    actual.loadingDisplay === 'none';

  return { pass, actual, screenshot };
}

async function noWebGlFallback(
  context: BrowserContext,
  base: URL,
  mode: 'stub' | 'disable-3d-apis',
): Promise<{ readonly pass: boolean; readonly actual: unknown; readonly errors: unknown[] }> {
  if (mode === 'stub') {
    await context.addInitScript(() => {
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
  }

  const page = await context.newPage();
  const pageErrors: string[] = [];
  const consoleErrors: { readonly text: string; readonly url: string }[] = [];
  const excludedConsoleErrors: { readonly text: string; readonly url: string }[] = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  page.on('console', (message) => {
    if (message.type() !== 'error') return;
    const entry = { text: message.text(), url: message.location().url };
    if (faviconConsoleError(message)) excludedConsoleErrors.push(entry);
    else consoleErrors.push(entry);
  });

  await page.goto(fixtureUrl(base, 'a').href, { waitUntil: 'load', timeout: WAIT_TIMEOUT_MS });
  await page.waitForFunction(
    () => {
      if (document.querySelectorAll('canvas').length !== 0) return false;
      return [...document.querySelectorAll<HTMLElement>('[data-engine-fallback]')].some(
        (element) => element.getBoundingClientRect().width > 1,
      );
    },
    undefined,
    { timeout: WAIT_TIMEOUT_MS },
  );
  const actual = await page.evaluate(() => {
    const visibleFallback = [
      ...document.querySelectorAll<HTMLElement>('[data-engine-fallback]'),
    ].find((element) => element.getBoundingClientRect().width > 1);
    const links =
      visibleFallback === undefined
        ? []
        : [...visibleFallback.querySelectorAll('nav[aria-label="Projects"] a')].map(
            (link) => link.textContent?.trim() ?? '',
          );
    const status = visibleFallback?.querySelector('[role="status"]')?.textContent?.trim() ?? '';
    return {
      canvasCount: document.querySelectorAll('canvas').length,
      message: status,
      links,
      controls: document.querySelectorAll('[data-engine-control]').length,
    };
  });
  await page.waitForTimeout(100);
  await context.close();

  const pass =
    actual.canvasCount === 0 &&
    actual.message.startsWith('WebGL is unavailable') &&
    sameStrings(actual.links, ['Tidewatch', 'Ledgerline', 'Lockerbay']) &&
    actual.controls > 0 &&
    pageErrors.length === 0 &&
    consoleErrors.length === 0;

  return {
    pass,
    actual: { ...actual, pageErrors, consoleErrors, excludedFaviconErrors: excludedConsoleErrors },
    errors: [...pageErrors, ...consoleErrors],
  };
}

async function runFallbacksGroup(
  browser: Browser,
  base: URL,
  outDir: string,
  log: (line: string) => void,
): Promise<GroupResult> {
  const checks: ProbeCheck[] = [];
  const data: unknown[] = [];

  for (const scheme of PALETTES) {
    const result = await noJsFallback(browser, base, scheme, outDir);
    checks.push(check(`fallback-nojs-${scheme}`, result.pass, true, result.actual));
    data.push({ mode: `no-js-${scheme}`, screenshot: result.screenshot, actual: result.actual });
    log(
      `fallbacks no-js ${scheme}: ${JSON.stringify(result.actual)} ${result.pass ? 'PASS' : 'FAIL'}`,
    );
  }

  const stubContext = await browser.newContext({
    ...contextOptions('light'),
    javaScriptEnabled: true,
  });
  const stub = await noWebGlFallback(stubContext, base, 'stub');
  checks.push(check('fallback-nowebgl-init-stub', stub.pass, true, stub.actual));
  data.push({ mode: 'no-webgl-init-stub', actual: stub.actual });
  log(`fallbacks no-WebGL init stub: canvas/message/links/errors=${stub.pass ? 'PASS' : 'FAIL'}`);

  const disabledBrowser = await chromium.launch({
    channel: 'chromium',
    headless: true,
    args: ['--disable-3d-apis'],
  });

  try {
    const disabledContext = await disabledBrowser.newContext(contextOptions('light'));
    const disabled = await noWebGlFallback(disabledContext, base, 'disable-3d-apis');
    checks.push(check('fallback-nowebgl-disable-3d-apis', disabled.pass, true, disabled.actual));
    data.push({ mode: 'no-webgl-disable-3d-apis', actual: disabled.actual });
    log(
      `fallbacks no-WebGL --disable-3d-apis: canvas/message/links/errors=${disabled.pass ? 'PASS' : 'FAIL'}`,
    );
  } finally {
    await disabledBrowser.close();
  }

  return {
    group: 'fallbacks',
    pass: checks.every((entry) => entry.pass),
    checks,
    data,
    lines: [],
  };
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
  await frames(page);
}

async function capturePresentationMatrix(
  browser: Browser,
  base: URL,
  log: (line: string) => void,
): Promise<PresentationSnapshot> {
  const snapshot: PresentationEntry[] = [];

  for (const palette of PALETTES) {
    for (const viewport of PRESENTATION_VIEWPORTS) {
      const context = await browser.newContext({
        viewport: { width: viewport.width, height: viewport.height },
        deviceScaleFactor: 1,
        isMobile: viewport.isMobile,
        hasTouch: viewport.hasTouch,
        colorScheme: palette,
      });

      try {
        for (const state of PRESENTATION_STATES) {
          const url = fixtureUrl(base, state.fixture, state.params);
          const page = await openPage(context, url);

          try {
            await waitForPresentation(page, palette, state.panelOpen);
            const id = `${state.id}/${palette}/${viewport.name}`;
            const entries = await snapshotPresentation(page, id);
            snapshot.push(...entries);
            log(`presentation ${id}: ${entries.length} nodes`);
          } finally {
            await page.close();
          }
        }
      } finally {
        await context.close();
      }
    }
  }

  return snapshot;
}

async function runPresentationGroup(
  browser: Browser,
  base: URL,
  outDir: string,
  log: (line: string) => void,
): Promise<GroupResult> {
  const baseline = JSON.parse(
    await readFile(BASELINE_PRESENTATION, 'utf8'),
  ) as PresentationSnapshot;
  const current = await capturePresentationMatrix(browser, base, log);
  const differences = diffPresentation(baseline, current);
  const verdict = evaluatePresentationDiff(differences, current);
  const checks = [
    check(
      'presentation-diff-only-approved-kinds',
      verdict.pass,
      'R2 lettering colour and <=1x1 chip spans only',
      verdict.failing,
    ),
    check('presentation-baseline-nodes-present', current.length > 0, '>0', current.length),
  ];

  await writeFile(
    join(outDir, 'presentation-current.json'),
    `${JSON.stringify(current, null, 2)}\n`,
  );
  for (const difference of differences) {
    log(
      `presentation diff ${difference.state} ${difference.path} ${difference.kind} ${difference.property ?? ''} ${JSON.stringify(difference.before ?? null)} -> ${JSON.stringify(difference.after ?? null)} ${isAllowedPresentationChange(difference, current) ? 'ALLOWED' : 'FAIL'}`,
    );
  }
  log(
    `presentation: ${differences.length} differences, ${verdict.allowed.length} allowed, ${verdict.failing.length} failing`,
  );

  return {
    group: 'presentation',
    pass: checks.every((entry) => entry.pass),
    checks,
    data: { differences, verdict, currentNodes: current.length },
    lines: [],
  };
}

async function collectCls(page: Page): Promise<readonly LayoutShiftObservation[]> {
  return await page.evaluate(() => {
    const captured = (
      window as Window & {
        __a11yProbeCls?: LayoutShiftObservation[];
      }
    ).__a11yProbeCls;
    return captured ?? [];
  });
}

async function installClsObserver(page: Page): Promise<void> {
  await page.addInitScript(() => {
    interface EntrySource {
      node: Node | null;
      previousRect: DOMRectReadOnly;
      currentRect: DOMRectReadOnly;
    }

    interface ShiftEntry extends PerformanceEntry {
      value: number;
      hadRecentInput: boolean;
      sources: EntrySource[];
    }

    const target = window as Window & {
      __a11yProbeCls?: LayoutShiftObservation[];
      __a11yProbeStartCls?: () => void;
      __a11yProbeStopCls?: () => void;
    };
    let observer: PerformanceObserver | null = null;

    const record = (entries: readonly ShiftEntry[]): void => {
      for (const entry of entries) {
        const node = (sourceNode: Node | null) => {
          const element = sourceNode instanceof Element ? sourceNode : sourceNode?.parentElement;
          if (!(element instanceof Element)) return null;

          return {
            tag: element.tagName.toLowerCase(),
            dataAttributes: Object.fromEntries(
              [...element.attributes]
                .filter((attribute) => attribute.name.startsWith('data-'))
                .map((attribute) => [attribute.name, attribute.value]),
            ),
            parentTag: element.parentElement?.tagName.toLowerCase() ?? null,
            text: element.textContent?.trim().slice(0, 120) || null,
            inOverlay: element.closest('[data-xploder-callouts]') !== null,
            inViewer: element.closest('[data-xploder-ready="true"]') !== null,
          };
        };

        (target.__a11yProbeCls ?? []).push({
          value: entry.value,
          startTime: entry.startTime,
          hadRecentInput: entry.hadRecentInput,
          page: 'desktop',
          group: 'a11y-drill',
          sources: entry.sources.map((source) => ({
            node: source.node === null ? null : node(source.node),
            previousRect: {
              x: source.previousRect.x,
              y: source.previousRect.y,
              width: source.previousRect.width,
              height: source.previousRect.height,
            },
            currentRect: {
              x: source.currentRect.x,
              y: source.currentRect.y,
              width: source.currentRect.width,
              height: source.currentRect.height,
            },
          })),
        });
      }
    };

    target.__a11yProbeStartCls = () => {
      observer?.disconnect();
      target.__a11yProbeCls = [];
      observer = new PerformanceObserver((list) => record(list.getEntries() as ShiftEntry[]));
      observer.observe({ type: 'layout-shift', buffered: true });
    };

    target.__a11yProbeStopCls = () => {
      if (observer !== null) record(observer.takeRecords() as ShiftEntry[]);
      observer?.disconnect();
      observer = null;
    };
  });
}

async function startCls(page: Page): Promise<void> {
  await page.evaluate(() => {
    (window as Window & { __a11yProbeStartCls?: () => void }).__a11yProbeStartCls?.();
  });
}

async function stopCls(page: Page): Promise<void> {
  await page.evaluate(() => {
    (window as Window & { __a11yProbeStopCls?: () => void }).__a11yProbeStopCls?.();
  });
}

async function runMetricsGroup(
  browser: Browser,
  base: URL,
  log: (line: string) => void,
): Promise<GroupResult> {
  const checks: ProbeCheck[] = [];
  const drawCalls: unknown[] = [];
  const context = await browser.newContext(contextOptions('light'));

  const states: readonly {
    readonly name: string;
    readonly params: Readonly<Record<string, string>>;
    readonly focus?: boolean;
  }[] = [
    { name: 'idle', params: {} },
    { name: 'detail-open', params: { select: 'tide-repository' } },
    { name: 'component-focused', params: {}, focus: true },
  ];

  for (const state of states) {
    const page = await openPage(context, fixtureUrl(base, 'a', state.params));
    await waitForReady(page, state.name === 'detail-open');
    if (state.focus === true) await focusProxy(page, 'tide-repository');
    const value = await page
      .locator('[data-engine-draw-calls]')
      .getAttribute('data-engine-draw-calls');
    const pass = value === '2';
    checks.push(check(`metrics-draw-calls-${state.name}`, pass, '2', value));
    drawCalls.push({ state: state.name, value });
    log(`metrics draw calls ${state.name}: ${value ?? 'null'} ${pass ? 'PASS' : 'FAIL'}`);
    await page.close();
  }

  const page = await context.newPage();
  await installClsObserver(page);
  await page.goto(fixtureUrl(base, 'a').href, { waitUntil: 'load', timeout: WAIT_TIMEOUT_MS });
  await waitForReady(page);
  await startCls(page);

  await focusComponentsStop(page);
  await page.keyboard.press('Enter');
  await waitForPanelReady(page);
  await page.keyboard.press('Escape');
  await waitForPanelClosed(page);
  await frames(page, 6);
  await stopCls(page);
  const entries = await collectCls(page);
  const summary = s7ClsSummary(entries);
  const insideTotal = summary.inside.reduce((sum, entry) => sum + entry.value, 0);
  checks.push(check('metrics-cls-inside-viewer', summary.inside.length === 0, 0, insideTotal));
  log(
    `metrics CLS buffered: pageTotal=${summary.pageTotal.toFixed(4)} inside=${summary.inside.length} outside=${summary.outside.length} entries=${entries.length}`,
  );
  for (const entry of summary.outside) {
    log(
      `metrics CLS outside: value=${entry.value} start=${entry.startTime} hadRecentInput=${entry.hadRecentInput} sources=${entry.sources.length}`,
    );
  }

  await context.close();
  return {
    group: 'metrics',
    pass: checks.every((entry) => entry.pass),
    checks,
    data: { drawCalls, cls: summary },
    lines: [],
  };
}

async function runGroup(
  browser: Browser,
  base: URL,
  fixtures: A11yFixtures,
  outDir: string,
  group: A11yGroup,
  log: (line: string) => void,
): Promise<GroupResult> {
  switch (group) {
    case 'drill':
      return await runDrillGroup(browser, base, fixtures, log);
    case 'aria':
      return await runAriaGroup(browser, base, fixtures, log);
    case 'announce':
      return await runAnnounceGroup(browser, base, fixtures, log);
    case 'contrast':
      return await runContrastGroup(browser, base, log, outDir);
    case 'reduced-motion':
      return await runReducedMotionGroup(browser, base, log);
    case 'fallbacks':
      return await runFallbacksGroup(browser, base, outDir, log);
    case 'presentation':
      return await runPresentationGroup(browser, base, outDir, log);
    case 'metrics':
      return await runMetricsGroup(browser, base, log);
  }
}

export async function runA11yProbe(options: ProbeOptions): Promise<A11yProbeReport> {
  await mkdir(options.outDir, { recursive: true });
  const fixtures = await loadA11yFixtures();
  const browser = await launch();
  const groups: GroupResult[] = [];

  try {
    for (const group of options.groups) {
      const lines: string[] = [];
      const result = await runGroup(
        browser,
        options.base,
        fixtures,
        options.outDir,
        group,
        (line) => {
          lines.push(line);
          console.log(line);
        },
      );
      groups.push(result);

      for (const entry of result.checks) {
        console.log(
          `${entry.pass ? 'PASS' : 'FAIL'} ${entry.name}: expected ${JSON.stringify(entry.expected)} actual ${JSON.stringify(entry.actual)}`,
        );
      }
      console.log(`${group}: ${result.pass ? 'PASS' : 'FAIL'} (${result.checks.length} checks)`);

      const logLines = [
        `group: ${group}`,
        `result: ${result.pass ? 'PASS' : 'FAIL'}`,
        ...lines,
        ...result.checks.map(
          (entry) =>
            `${entry.pass ? 'PASS' : 'FAIL'} ${entry.name}: expected ${JSON.stringify(entry.expected)} actual ${JSON.stringify(entry.actual)}`,
        ),
        `summary: ${result.pass ? 'PASS' : 'FAIL'} (${result.checks.length} checks)`,
      ];
      await writeFile(join(options.outDir, `${group}.log.txt`), `${logLines.join('\n')}\n`, 'utf8');
      await writeFile(
        join(options.outDir, `${group}.json`),
        `${JSON.stringify({ group: result.group, pass: result.pass, checks: result.checks, data: result.data }, null, 2)}\n`,
        'utf8',
      );
    }

    const report: A11yProbeReport = {
      kind: 'a11y-probe',
      version: 1,
      url: options.base.href,
      chromium: chromiumVersion(browser),
      groups,
      pass: groups.every((group) => group.pass),
    };
    await writeFile(
      join(options.outDir, 'a11y-probe.json'),
      `${JSON.stringify(report, null, 2)}\n`,
      'utf8',
    );
    return report;
  } finally {
    await browser.close();
  }
}
