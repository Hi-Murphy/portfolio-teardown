import { mkdir, writeFile } from 'node:fs/promises';
import { basename, join } from 'node:path';

import type { Browser, Page } from 'playwright';

import { chromiumVersion, PROFILES } from './browser.ts';
import { EXIT } from './exit-codes.ts';
import { decodePng } from './png.ts';

export const EAGER_PROBE_DEADLINE_MS = 2_500;
export const EAGER_PROBE_REST_MS = 2_000;
export const EAGER_PROBE_REDUCED_SETTLE_MS = 5_000;
export const EAGER_PROBE_WAIT_MS = 30_000;

export type EagerProbeMotion = 'normal' | 'reduce';
export type EagerProbeExpectation = 'live' | 'gated' | 'live-loop';

export interface EagerProbeEventCounts extends Record<string, number> {
  pointerdown: number;
  pointermove: number;
  pointerup: number;
  mousedown: number;
  mousemove: number;
  mouseup: number;
  click: number;
  touchstart: number;
  touchmove: number;
  wheel: number;
  scroll: number;
  keydown: number;
  focusin: number;
}

export interface EagerProbeLiveState {
  readonly value: string;
  readonly t: number;
}

export interface EagerProbeRect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface EagerProbeSnapshot {
  readonly observedAtMs: number;
  readonly timeOriginMs: number;
  readonly loadAtMs: number | null;
  readonly readyAtMs: number | null;
  readonly liveStates: readonly EagerProbeLiveState[];
  readonly eventCounts: EagerProbeEventCounts;
  readonly trustedEvents: number;
  readonly canvasCount: number;
  readonly canvasRect: EagerProbeRect | null;
  readonly liveState: string | null;
  readonly liveOpacity: string | null;
  readonly posterPresent: boolean;
  readonly posterOpacity: string | null;
  readonly posterVisibility: string | null;
  readonly tour: string | null;
  readonly tweening: string | null;
  readonly heroLoop: string | null;
  readonly backgroundRgb: string | null;
  readonly readyAttribute: boolean;
}

export interface EagerProbeScreenshot {
  readonly file: string;
  readonly width: number;
  readonly height: number;
  readonly colours: number;
  readonly nonBlank: boolean;
}

export interface EagerProbeCheck {
  readonly name: string;
  readonly pass: boolean;
  readonly expected: unknown;
  readonly actual: unknown;
}

export interface EagerProbeVerdict {
  readonly pass: boolean;
  readonly checks: readonly EagerProbeCheck[];
}

export interface EagerProbeThreeRequests {
  readonly requested: boolean;
  readonly chunks: readonly string[];
}

export interface EagerProbeRun {
  readonly kind: 'eager-probe';
  readonly version: 1;
  readonly route: string;
  readonly routeName: string;
  readonly motion: EagerProbeMotion;
  readonly saveData?: true;
  readonly expect?: EagerProbeExpectation;
  readonly run: number;
  readonly url: string;
  readonly chromium: string;
  readonly profile: 'mobile';
  readonly reducedMotion: 'no-preference' | 'reduce';
  readonly deadlineMs: number;
  readonly restWindowMs: number | null;
  readonly reducedSettleMs: number | null;
  readonly atDeadline: EagerProbeSnapshot;
  readonly afterRest: EagerProbeSnapshot | null;
  readonly screenshot: EagerProbeScreenshot | null;
  readonly threeRequested: EagerProbeThreeRequests;
  readonly verdict: EagerProbeVerdict;
  readonly pass: boolean;
}

interface EagerProbeWindow {
  __eagerProbe?: {
    timeOriginMs: number;
    loadAtMs: number | null;
    readyAtMs: number | null;
    liveStates: EagerProbeLiveState[];
    eventCounts: EagerProbeEventCounts;
    trustedEvents: number;
  };
}

export interface EagerProbeRunOptions {
  readonly browser: Browser;
  readonly base: URL;
  readonly route: string;
  readonly run: number;
  readonly motion: EagerProbeMotion;
  readonly saveData?: boolean;
  readonly expect?: EagerProbeExpectation;
  readonly outDir: string;
  readonly threeChunkPaths?: ReadonlySet<string>;
}

function installProbe(): void {
  const target = window as unknown as EagerProbeWindow;
  const eventCounts = Object.fromEntries(
    [
      'pointerdown',
      'pointermove',
      'pointerup',
      'mousedown',
      'mousemove',
      'mouseup',
      'click',
      'touchstart',
      'touchmove',
      'wheel',
      'scroll',
      'keydown',
      'focusin',
    ].map((name) => [name, 0]),
  ) as EagerProbeEventCounts;
  const state = {
    timeOriginMs: performance.timeOrigin,
    loadAtMs: null as number | null,
    readyAtMs: null as number | null,
    liveStates: [] as EagerProbeLiveState[],
    eventCounts,
    trustedEvents: 0,
  };
  target.__eagerProbe = state;

  const recordEvent = (event: Event): void => {
    if (!event.isTrusted) return;
    state.trustedEvents += 1;
    state.eventCounts[event.type] = (state.eventCounts[event.type] ?? 0) + 1;
  };
  for (const type of [
    'pointerdown',
    'pointermove',
    'pointerup',
    'mousedown',
    'mousemove',
    'mouseup',
    'click',
    'touchstart',
    'touchmove',
    'wheel',
    'scroll',
    'keydown',
    'focusin',
  ]) {
    window.addEventListener(type, recordEvent, { capture: true, passive: true });
  }

  const recordLoad = (): void => {
    if (state.loadAtMs === null) state.loadAtMs = performance.now();
  };
  if (document.readyState === 'complete') recordLoad();
  else window.addEventListener('load', recordLoad, { once: true, capture: true });

  const recordReady = (): void => {
    if (state.readyAtMs !== null) return;
    if (document.querySelector('[data-xploder-ready="true"]') === null) return;
    state.readyAtMs = performance.now();
  };
  const readyObserver = new MutationObserver(recordReady);
  readyObserver.observe(document, {
    attributes: true,
    subtree: true,
    attributeFilter: ['data-xploder-ready'],
  });
  recordReady();

  const seen = new WeakMap<Element, string>();
  const recordLiveState = (element: Element): void => {
    const value = element.getAttribute('data-site-live-state');
    if (value === null || seen.get(element) === value) return;
    seen.set(element, value);
    state.liveStates.push({ value, t: performance.now() });
  };
  const recordSubtree = (node: Node): void => {
    if (!(node instanceof Element)) return;
    if (node.hasAttribute('data-site-live-state')) recordLiveState(node);
    for (const element of node.querySelectorAll('[data-site-live-state]')) recordLiveState(element);
  };
  const liveObserver = new MutationObserver((records) => {
    for (const record of records) {
      if (
        record.type === 'attributes' &&
        record.attributeName === 'data-site-live-state' &&
        record.target instanceof Element
      ) {
        recordLiveState(record.target);
      }
      for (const node of record.addedNodes) recordSubtree(node);
    }
  });
  liveObserver.observe(document, {
    attributes: true,
    childList: true,
    subtree: true,
    attributeFilter: ['data-site-live-state'],
  });
  recordSubtree(document);
}

async function readSnapshot(page: Page): Promise<EagerProbeSnapshot> {
  return await page.evaluate(() => {
    const state = (window as unknown as EagerProbeWindow).__eagerProbe;
    if (state === undefined) throw new Error('eager probe init script did not run');

    const live = document.querySelector('[data-site-live]');
    const canvas = live?.querySelector('canvas') ?? null;
    const rect = canvas?.getBoundingClientRect() ?? null;
    // The project route mounts no live layer until the workbench boots (none under reduced motion),
    // so fall back to the poster inside the stage or hero figure.
    const poster =
      document.querySelector('[data-site-live] + [data-site-poster]') ??
      document.querySelector(
        '[data-site-stage] [data-site-poster], [data-site-hero] [data-site-poster]',
      );
    const viewer = document.querySelector('[data-xploder-ready="true"]');
    const heroLoop = document.querySelector('[data-hero-loop]');
    const liveStyle = live === null ? null : getComputedStyle(live);
    const posterStyle = poster === null ? null : getComputedStyle(poster);
    const resolver = document.createElement('span');
    resolver.style.backgroundColor = 'var(--color-bg)';
    resolver.style.position = 'absolute';
    resolver.style.visibility = 'hidden';
    document.body?.append(resolver);
    const backgroundRgb = getComputedStyle(resolver).backgroundColor || null;
    resolver.remove();

    return {
      observedAtMs: performance.now(),
      timeOriginMs: state.timeOriginMs,
      loadAtMs: state.loadAtMs,
      readyAtMs: state.readyAtMs,
      liveStates: [...state.liveStates],
      eventCounts: { ...state.eventCounts },
      trustedEvents: state.trustedEvents,
      canvasCount: document.querySelectorAll('canvas').length,
      canvasRect:
        rect === null ? null : { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
      liveState: live?.getAttribute('data-site-live-state') ?? null,
      liveOpacity: liveStyle?.opacity ?? null,
      posterPresent: poster !== null,
      posterOpacity: posterStyle?.opacity ?? null,
      posterVisibility: posterStyle?.visibility ?? null,
      tour: viewer?.getAttribute('data-xploder-tour') ?? null,
      tweening: viewer?.getAttribute('data-xploder-tweening') ?? null,
      heroLoop: heroLoop?.getAttribute('data-hero-loop') ?? null,
      backgroundRgb,
      readyAttribute: viewer !== null,
    };
  });
}

function parseRgb(value: string | null): [number, number, number, number] | null {
  if (value === null) return null;
  const numbers = value.match(/[\d.]+/g)?.map(Number) ?? [];
  if (numbers.length < 3) return null;
  return [numbers[0] ?? 0, numbers[1] ?? 0, numbers[2] ?? 0, numbers[3] ?? 1];
}

export function evaluateCanvasPixels(
  image: { readonly width: number; readonly height: number; readonly data: Uint8Array },
  backgroundRgb: string | null,
): { colours: number; nonBlank: boolean } {
  const background = parseRgb(backgroundRgb);
  const colours = new Set<number>();
  let uniformBackground = true;

  for (let offset = 0; offset < image.data.byteLength; offset += 4) {
    const red = image.data[offset] ?? 0;
    const green = image.data[offset + 1] ?? 0;
    const blue = image.data[offset + 2] ?? 0;
    const alpha = image.data[offset + 3] ?? 0;
    colours.add((red << 24) | (green << 16) | (blue << 8) | alpha);
    if (
      background !== null &&
      (red !== background[0] ||
        green !== background[1] ||
        blue !== background[2] ||
        alpha !== Math.round(background[3] * 255))
    ) {
      uniformBackground = false;
    }
  }

  return { colours: colours.size, nonBlank: colours.size > 1 && !uniformBackground };
}

function liveStatesEqual(
  left: readonly EagerProbeLiveState[],
  right: readonly EagerProbeLiveState[],
): boolean {
  return (
    left.length === right.length &&
    left.every((value, index) => value.value === right[index]?.value && value.t === right[index]?.t)
  );
}

function check(name: string, pass: boolean, expected: unknown, actual: unknown): EagerProbeCheck {
  return { name, pass, expected, actual };
}

export function evaluateEagerProbe(
  motion: EagerProbeMotion,
  atDeadline: EagerProbeSnapshot,
  afterRest: EagerProbeSnapshot | null,
  screenshot: EagerProbeScreenshot | null,
  expect: 'live' | 'live-loop' = 'live',
): EagerProbeVerdict {
  const checks: EagerProbeCheck[] = [];
  const noTrustedEvents = atDeadline.trustedEvents === 0;

  if (motion === 'normal') {
    const canvasPresent =
      atDeadline.canvasCount > 0 &&
      atDeadline.canvasRect !== null &&
      atDeadline.canvasRect.width > 0 &&
      atDeadline.canvasRect.height > 0;
    const readyByDeadline =
      atDeadline.readyAtMs !== null && atDeadline.readyAtMs <= EAGER_PROBE_DEADLINE_MS;
    const revealedByDeadline = atDeadline.liveStates.some(
      (state) => state.value === 'revealed' && state.t <= EAGER_PROBE_DEADLINE_MS,
    );
    const restSettled =
      afterRest !== null && liveStatesEqual(atDeadline.liveStates, afterRest.liveStates);
    const restIdle = restSettled && (afterRest.tour === null || afterRest.tour === 'idle');
    const ambientIdle = restIdle && (afterRest.tweening === null || afterRest.tweening === 'false');
    const loopRunning = restSettled && afterRest?.heroLoop === 'running';

    checks.push(
      check('canvas-present', canvasPresent, true, atDeadline.canvasRect),
      check('ready-by-deadline', readyByDeadline, EAGER_PROBE_DEADLINE_MS, atDeadline.readyAtMs),
      check(
        'revealed-by-deadline',
        revealedByDeadline,
        EAGER_PROBE_DEADLINE_MS,
        atDeadline.liveStates,
      ),
      check('live-opacity', atDeadline.liveOpacity === '1', '1', atDeadline.liveOpacity),
      check(
        'poster-hidden',
        atDeadline.posterPresent && atDeadline.posterVisibility === 'hidden',
        'hidden',
        atDeadline.posterVisibility,
      ),
      check('no-trusted-events', noTrustedEvents, 0, atDeadline.trustedEvents),
      check('canvas-non-blank', screenshot?.nonBlank === true, true, screenshot),
      expect === 'live-loop'
        ? check('loop-running', loopRunning, true, {
            heroLoop: afterRest?.heroLoop ?? null,
            tour: afterRest?.tour ?? null,
            liveStates: afterRest?.liveStates ?? null,
          })
        : check('ambient-idle', ambientIdle, true, afterRest),
    );
  } else {
    const posterVisible =
      atDeadline.posterPresent &&
      atDeadline.posterOpacity === '1' &&
      atDeadline.posterVisibility === 'visible';

    checks.push(
      check('canvas-absent', atDeadline.canvasCount === 0, 0, atDeadline.canvasCount),
      check('ready-absent', atDeadline.readyAtMs === null && !atDeadline.readyAttribute, null, {
        readyAtMs: atDeadline.readyAtMs,
        readyAttribute: atDeadline.readyAttribute,
      }),
      check(
        'poster-visible',
        posterVisible,
        { opacity: '1', visibility: 'visible' },
        { opacity: atDeadline.posterOpacity, visibility: atDeadline.posterVisibility },
      ),
      check('no-trusted-events', noTrustedEvents, 0, atDeadline.trustedEvents),
    );
  }

  return { pass: checks.every((entry) => entry.pass), checks };
}

export function evaluateGatedProbe(snapshot: EagerProbeSnapshot): EagerProbeVerdict {
  const posterVisible =
    snapshot.posterPresent &&
    snapshot.posterOpacity === '1' &&
    snapshot.posterVisibility === 'visible';
  const checks = [
    check('canvas-absent', snapshot.canvasCount === 0, 0, snapshot.canvasCount),
    check('ready-absent', snapshot.readyAtMs === null && !snapshot.readyAttribute, null, {
      readyAtMs: snapshot.readyAtMs,
      readyAttribute: snapshot.readyAttribute,
    }),
    check(
      'poster-visible',
      posterVisible,
      { opacity: '1', visibility: 'visible' },
      { opacity: snapshot.posterOpacity, visibility: snapshot.posterVisibility },
    ),
    check('no-trusted-events', snapshot.trustedEvents === 0, 0, snapshot.trustedEvents),
  ];
  return { pass: checks.every((entry) => entry.pass), checks };
}

export function evaluateSaveDataProbe(snapshot: EagerProbeSnapshot): EagerProbeVerdict {
  const posterVisible =
    snapshot.posterPresent &&
    snapshot.posterOpacity === '1' &&
    snapshot.posterVisibility === 'visible';
  const liveStateSkipped =
    snapshot.liveState === 'skipped' && snapshot.liveStates.at(-1)?.value === 'skipped';
  const checks = [
    check('canvas-absent', snapshot.canvasCount === 0, 0, snapshot.canvasCount),
    check('ready-absent', snapshot.readyAtMs === null && !snapshot.readyAttribute, null, {
      readyAtMs: snapshot.readyAtMs,
      readyAttribute: snapshot.readyAttribute,
    }),
    check(
      'poster-visible',
      posterVisible,
      { opacity: '1', visibility: 'visible' },
      { opacity: snapshot.posterOpacity, visibility: snapshot.posterVisibility },
    ),
    check('live-state-skipped', liveStateSkipped, 'skipped', snapshot.liveStates),
    check('no-trusted-events', snapshot.trustedEvents === 0, 0, snapshot.trustedEvents),
  ];
  return { pass: checks.every((entry) => entry.pass), checks };
}

export function eagerProbeRouteName(route: string): string {
  if (route === '/') return 'home';
  if (route === '/projects/websocket-inspector') return 'project';
  const name = basename(route.replace(/\/+$/, ''));
  return name.length === 0 ? 'home' : name.replace(/[^a-z0-9-]+/gi, '-').toLowerCase();
}

export function eagerProbeFileName(
  routeName: string,
  condition: EagerProbeMotion | 'save-data',
  run: number,
  extension: 'json' | 'png',
): string {
  const suffix = extension === 'json' ? 'json' : 'deadline.png';
  return `eager-probe-${routeName}-${condition}-r${run}.${suffix}`;
}

async function captureScreenshot(
  page: Page,
  path: string,
  motion: EagerProbeMotion,
  snapshot: EagerProbeSnapshot,
): Promise<EagerProbeScreenshot> {
  const screenshot =
    motion === 'normal' && snapshot.canvasRect !== null
      ? await page.locator('[data-site-live] canvas').first().screenshot({
          type: 'png',
          animations: 'allow',
          caret: 'hide',
          timeout: EAGER_PROBE_WAIT_MS,
        })
      : await page.screenshot({
          type: 'png',
          fullPage: false,
          animations: 'allow',
          caret: 'hide',
          timeout: EAGER_PROBE_WAIT_MS,
        });
  await writeFile(path, screenshot);
  const image = decodePng(screenshot);
  const pixels = evaluateCanvasPixels(image, snapshot.backgroundRgb);
  return {
    file: basename(path),
    width: image.width,
    height: image.height,
    colours: pixels.colours,
    nonBlank: pixels.nonBlank,
  };
}

export async function runEagerProbe(options: EagerProbeRunOptions): Promise<EagerProbeRun> {
  const profile = PROFILES.mobile;
  const reduced = options.motion === 'reduce';
  const expect = options.expect ?? 'live';
  const gated = expect === 'gated';
  const saveData = options.saveData === true;
  const condition = saveData ? 'save-data' : options.motion;
  const context = await options.browser.newContext({
    viewport: {
      width: profile.screenEmulation.width,
      height: profile.screenEmulation.height,
    },
    deviceScaleFactor: profile.screenEmulation.deviceScaleFactor,
    isMobile: profile.formFactor === 'mobile',
    hasTouch: profile.formFactor === 'mobile',
    userAgent: profile.userAgent,
    colorScheme: 'light',
    reducedMotion: reduced ? 'reduce' : 'no-preference',
  });

  try {
    const page = await context.newPage();
    page.setDefaultTimeout(EAGER_PROBE_WAIT_MS);
    await page.addInitScript(installProbe);
    if (saveData) {
      await page.addInitScript(() => {
        Object.defineProperty(navigator, 'connection', { value: { saveData: true } });
      });
    }

    const requestedChunks = new Set<string>();
    page.on('request', (request) => {
      if (request.resourceType() !== 'script') return;
      try {
        requestedChunks.add(new URL(request.url()).pathname);
      } catch {
        // Ignore non-URL requests; the probe only needs static script paths.
      }
    });

    const url = new URL(options.route, options.base).href;
    const response = await page.goto(url, {
      waitUntil: 'commit',
      timeout: EAGER_PROBE_WAIT_MS,
    });
    if (response === null || response.status() >= 400) {
      throw new Error(
        `navigation returned ${response === null ? 'no response' : `HTTP ${response.status()}`}`,
      );
    }

    let atDeadline: EagerProbeSnapshot;
    let afterRest: EagerProbeSnapshot | null = null;
    let screenshot: EagerProbeScreenshot | null = null;
    const routeName = eagerProbeRouteName(options.route);
    await mkdir(options.outDir, { recursive: true });

    if (reduced || gated || saveData) {
      await page.waitForFunction(
        () => (window as unknown as EagerProbeWindow).__eagerProbe?.loadAtMs !== null,
        undefined,
        { timeout: EAGER_PROBE_WAIT_MS },
      );
      await page.waitForFunction(
        (settleMs) =>
          performance.now() >=
          ((window as unknown as EagerProbeWindow).__eagerProbe?.loadAtMs ?? 0) + settleMs,
        EAGER_PROBE_REDUCED_SETTLE_MS,
        { timeout: EAGER_PROBE_WAIT_MS },
      );
      atDeadline = await readSnapshot(page);
      screenshot = await captureScreenshot(
        page,
        join(options.outDir, eagerProbeFileName(routeName, condition, options.run, 'png')),
        options.motion,
        atDeadline,
      );
    } else {
      await page.waitForFunction(
        (deadlineMs) => performance.now() >= deadlineMs,
        EAGER_PROBE_DEADLINE_MS,
        { timeout: EAGER_PROBE_WAIT_MS },
      );
      atDeadline = await readSnapshot(page);
      screenshot = await captureScreenshot(
        page,
        join(options.outDir, eagerProbeFileName(routeName, condition, options.run, 'png')),
        options.motion,
        atDeadline,
      );
      await page.waitForFunction(
        ({ deadlineMs, restMs }) => performance.now() >= deadlineMs + restMs,
        { deadlineMs: EAGER_PROBE_DEADLINE_MS, restMs: EAGER_PROBE_REST_MS },
        { timeout: EAGER_PROBE_WAIT_MS },
      );
      afterRest = await readSnapshot(page);
    }

    const knownChunks = [...(options.threeChunkPaths ?? [])]
      .filter((path) => requestedChunks.has(path))
      .sort();
    const threeRequested = {
      requested: knownChunks.length > 0,
      chunks: knownChunks,
    };
    const verdict = gated
      ? evaluateGatedProbe(atDeadline)
      : saveData
        ? evaluateSaveDataProbe(atDeadline)
        : evaluateEagerProbe(
            options.motion,
            atDeadline,
            afterRest,
            screenshot,
            expect === 'live-loop' ? 'live-loop' : 'live',
          );

    return {
      kind: 'eager-probe',
      version: 1,
      route: options.route,
      routeName,
      motion: options.motion,
      ...(saveData ? { saveData: true as const } : {}),
      ...(gated ? { expect: 'gated' as const } : {}),
      ...(expect === 'live-loop' ? { expect: 'live-loop' as const } : {}),
      run: options.run,
      url,
      chromium: chromiumVersion(options.browser),
      profile: 'mobile',
      reducedMotion: reduced ? 'reduce' : 'no-preference',
      deadlineMs:
        reduced || gated || saveData ? EAGER_PROBE_REDUCED_SETTLE_MS : EAGER_PROBE_DEADLINE_MS,
      restWindowMs: reduced || gated || saveData ? null : EAGER_PROBE_REST_MS,
      reducedSettleMs: reduced || saveData ? EAGER_PROBE_REDUCED_SETTLE_MS : null,
      atDeadline,
      afterRest,
      screenshot,
      threeRequested,
      verdict,
      pass: verdict.pass,
    };
  } finally {
    await context.close();
  }
}

export function eagerProbeExitCode(runs: readonly EagerProbeRun[]): number {
  return runs.every((result) => result.pass) ? EXIT.OK : EXIT.BUDGET;
}
