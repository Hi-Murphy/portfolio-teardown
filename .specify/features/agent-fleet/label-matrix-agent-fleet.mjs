#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import {
  appendFileSync,
  mkdirSync,
  readFileSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';

import { sweepEntries } from '../label-system/label-sweep.mjs';

function usage() {
  console.error(
    'usage: node label-matrix.mjs <repo> <baseUrl> --out <dir> [--routes projects,fixtures,home] [--workers 4] [--only <cellIdPrefix>] [--control]',
  );
  process.exit(2);
}

const numberList = (value) =>
  value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

const argv = process.argv.slice(2);
const positional = [];
const options = {};
const flagOptions = new Set(['control']);
for (let index = 0; index < argv.length; index += 1) {
  const argument = argv[index];
  if (!argument.startsWith('--')) {
    positional.push(argument);
    continue;
  }
  const name = argument.slice(2);
  if (flagOptions.has(name)) {
    options[name] = true;
    continue;
  }
  const value = argv[index + 1];
  if (value === undefined || value.startsWith('--')) usage();
  options[name] = value;
  index += 1;
}

const [repoArg, baseUrlArg] = positional;
if (!repoArg || !baseUrlArg || options.out === undefined) usage();

const repo = resolve(repoArg);
const baseUrl = baseUrlArg.replace(/\/$/, '');
const out = resolve(options.out);
const routes = numberList(options.routes ?? 'projects,fixtures,home');
const workers = Number(options.workers ?? 4);
const only = options.only;
const control = options.control === true;
if (!Number.isSafeInteger(workers) || workers < 1) usage();
for (const route of routes) {
  if (!['projects', 'fixtures', 'home'].includes(route)) usage();
}

const require = createRequire(resolve(repo, 'tools/perf/package.json'));
const { chromium } = require('playwright');
const commit =
  process.env.S16_COMMIT ??
  execFileSync('git', ['-C', repo, 'rev-parse', '--short', 'HEAD'], { encoding: 'utf8' }).trim();

const WRAPPER = '[data-xploder-lettering-on]';
const ZOOMS = [1, 1.25, 1.5625, 1.953125, 2.44140625, 3];
const WIDTHS = [
  { width: 390, height: 844, mobile: true },
  { width: 768, height: 1024, mobile: false },
  { width: 1440, height: 900, mobile: false },
];

const projectRoutes = ['agent-fleet'];
const fixtureRoutes = ['a', 'b', 'c'];
const tasks = [];

for (const scheme of ['light', 'dark']) {
  for (const width of WIDTHS) {
    if (routes.includes('projects')) {
      for (const slug of projectRoutes) {
        tasks.push({
          kind: 'project',
          route: `/projects/${slug}`,
          routeSlug: slug,
          scheme,
          ...width,
        });
      }
    }
    if (routes.includes('fixtures')) {
      for (const fixture of fixtureRoutes) {
        tasks.push({
          kind: 'fixture',
          route: `/dev/engine?fixture=${fixture}&state=exploded`,
          routeSlug: `fixture-${fixture}`,
          scheme,
          ...width,
        });
      }
    }
    if (routes.includes('home')) {
      tasks.push({
        kind: 'home',
        route: '/',
        routeSlug: 'home',
        scheme,
        ...width,
      });
    }
  }
}

const selectedTasks = tasks.filter((task) => {
  if (only === undefined) return true;
  const pagePrefix = `${task.routeSlug}-${task.width}-${task.scheme}`;
  return pagePrefix.startsWith(only) || only.startsWith(pagePrefix);
});
if (selectedTasks.length === 0) usage();

const controlTasks = [];
if (control && routes.includes('projects')) {
  controlTasks.push(
    tasks.find(
      (task) =>
        task.kind === 'project' &&
        task.routeSlug === projectRoutes[0] &&
        task.width === 1440 &&
        task.height === 900 &&
        task.scheme === 'light',
    ),
  );
}
if (control && routes.includes('fixtures')) {
  controlTasks.push(
    tasks.find(
      (task) =>
        task.kind === 'fixture' &&
        task.routeSlug === 'fixture-a' &&
        task.width === 390 &&
        task.height === 844 &&
        task.scheme === 'dark',
    ),
  );
}
if (control && routes.includes('home')) {
  controlTasks.push(
    tasks.find(
      (task) =>
        task.kind === 'home' &&
        task.width === 1440 &&
        task.height === 900 &&
        task.scheme === 'light',
    ),
  );
}
if (controlTasks.some((task) => task === undefined)) usage();

const geometry = () => {
  const wrapper = document.querySelector('[data-xploder-lettering-on]');
  if (wrapper === null) throw new Error('viewer wrapper missing');

  const effectiveOpacity = (element) => {
    let opacity = 1;
    for (let current = element; current !== null; current = current.parentElement) {
      const style = getComputedStyle(current);
      if (style.visibility === 'hidden' || style.display === 'none') return 0;
      opacity *= Number(style.opacity === '' ? 1 : style.opacity);
    }
    return opacity;
  };

  const painted = (element) =>
    effectiveOpacity(element) > 0 && element.getClientRects().length > 0;

  const transformedBox = (element) => {
    const rect = element.getBoundingClientRect();
    const style = getComputedStyle(element);
    if (style.transform === 'none') {
      return [
        [rect.left, rect.top],
        [rect.right, rect.top],
        [rect.right, rect.bottom],
        [rect.left, rect.bottom],
      ];
    }
    const matrix = new DOMMatrix(style.transform);
    const width = element.offsetWidth;
    const height = element.offsetHeight;
    const parent = element.offsetParent?.getBoundingClientRect() ?? { left: 0, top: 0 };
    const originX = parent.left + element.offsetLeft;
    const originY = parent.top + element.offsetTop;
    return [
      [0, 0],
      [width, 0],
      [width, height],
      [0, height],
    ].map(([x, y]) => {
      const point = matrix.transformPoint(new DOMPoint(x, y));
      return [originX + point.x, originY + point.y];
    });
  };

  const rowQuad = (element) => {
    const range = document.createRange();
    range.selectNodeContents(element);
    const rects = [...range.getClientRects()].filter(
      (rect) => rect.width > 0 && rect.height > 0,
    );
    if (rects.length === 0) return transformedBox(element);
    const left = Math.min(...rects.map((rect) => rect.left));
    const top = Math.min(...rects.map((rect) => rect.top));
    const right = Math.max(...rects.map((rect) => rect.right));
    const bottom = Math.max(...rects.map((rect) => rect.bottom));
    return [
      [left, top],
      [right, top],
      [right, bottom],
      [left, bottom],
    ];
  };

  const entries = [];
  const add = (element, marker, key, kind, quad) => {
    entries.push({
      marker,
      key,
      kind,
      quad,
      painted: painted(element),
    });
  };

  for (const element of wrapper.querySelectorAll('[data-xploder-label]')) {
    const key = element.getAttribute('data-xploder-label');
    add(element, 'data-xploder-label', key, key?.split(':')[0] ?? null, transformedBox(element));
  }
  for (const element of wrapper.querySelectorAll('[data-xploder-titleblock-box]')) {
    add(element, 'data-xploder-titleblock-box', 'titleblock', 'titleblock', transformedBox(element));
  }
  for (const element of wrapper.querySelectorAll('[data-xploder-lettering]')) {
    add(
      element,
      'data-xploder-lettering',
      element.getAttribute('data-xploder-lettering'),
      element.getAttribute('data-xploder-lettering-kind'),
      transformedBox(element),
    );
  }
  for (const element of wrapper.querySelectorAll('[data-xploder-lettering-layer-label]')) {
    add(
      element,
      'data-xploder-lettering-layer-label',
      element.getAttribute('data-xploder-lettering-layer-label'),
      element.getAttribute('data-xploder-lettering-layer-kind'),
      transformedBox(element),
    );
  }
  for (const element of wrapper.querySelectorAll('[data-xploder-column-row]')) {
    add(
      element,
      'data-xploder-column-row',
      element.getAttribute('data-xploder-column-row'),
      'column',
      rowQuad(element),
    );
  }

  const overlay = wrapper.querySelector('[data-xploder-overlay]');
  const lettering = wrapper.querySelector('[data-xploder-lettering-layer]');
  const stage = wrapper.querySelector('[data-xploder-stage]');
  return {
    quads: entries,
    dom: `${overlay?.outerHTML ?? ''}${lettering?.outerHTML ?? ''}`,
    callouts: overlay?.getAttribute('data-xploder-callouts') ?? 'none',
    azimuth: Number(wrapper.getAttribute('data-xploder-azimuth')),
    zoom: Number(wrapper.getAttribute('data-xploder-zoom')),
    state: wrapper.getAttribute('data-xploder-state'),
    scrollTop: stage?.scrollTop ?? 0,
    extent: Number(stage?.getAttribute('data-xploder-scroll-extent') ?? 0),
  };
};

const settleCount = (page) => page.evaluate(() => window.__xploderSettleCount ?? 0);

const domSignature = (page) =>
  page.evaluate(() => {
    const wrapper = document.querySelector('[data-xploder-lettering-on]');
    const overlay = wrapper?.querySelector('[data-xploder-overlay]');
    const lettering = wrapper?.querySelector('[data-xploder-lettering-layer]');
    return `${overlay?.outerHTML ?? ''}${lettering?.outerHTML ?? ''}`;
  });

async function waitForSettled(page, before) {
  try {
    await page.waitForFunction(
      (count) => (window.__xploderSettleCount ?? 0) > count,
      before,
      { timeout: 8000 },
    );
    return false;
  } catch {
    return true;
  }
}

async function waitForAnimations(page) {
  await page
    .waitForFunction(
      () =>
        typeof document.getAnimations !== 'function' ||
        document
          .getAnimations()
          .every((animation) => animation.playState === 'finished' || animation.playState === 'idle'),
      null,
      { timeout: 8000 },
    )
    .catch(() => {});
  await page.evaluate(
    () => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done))),
  );
  await page.evaluate(
    () =>
      new Promise((done, reject) => {
        let previous = null;
        let stable = 0;
        let frames = 0;
        const tick = () => {
          const wrapper = document.querySelector('[data-xploder-lettering-on]');
          const overlay = wrapper?.querySelector('[data-xploder-overlay]');
          const lettering = wrapper?.querySelector('[data-xploder-lettering-layer]');
          const stage = wrapper?.querySelector('[data-xploder-stage]');
          const signature = JSON.stringify([
            wrapper?.dataset,
            stage?.scrollTop ?? 0,
            stage?.scrollHeight ?? 0,
            stage?.clientHeight ?? 0,
            stage?.getAttribute('data-xploder-scroll-extent') ?? '',
            overlay?.outerHTML ?? '',
            lettering?.outerHTML ?? '',
          ]);
          const animationsDone =
            typeof document.getAnimations !== 'function' ||
            document
              .getAnimations()
              .every(
                (animation) =>
                  animation.playState === 'finished' || animation.playState === 'idle',
              );
          if (signature === previous && animationsDone) stable += 1;
          else {
            previous = signature;
            stable = 0;
          }
          frames += 1;
          if (stable >= 6) done();
          else if (frames >= 480) reject(new Error('DOM did not stabilise'));
          else requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      }),
  );
}

async function clickAndSettle(page, selector) {
  const before = await settleCount(page);
  const beforeDom = await domSignature(page);
  await page.locator(selector).first().click();
  const timedOut = await waitForSettled(page, before);
  await page.waitForFunction(
    (previous) => {
      const wrapper = document.querySelector('[data-xploder-lettering-on]');
      const overlay = wrapper?.querySelector('[data-xploder-overlay]');
      const lettering = wrapper?.querySelector('[data-xploder-lettering-layer]');
      return `${overlay?.outerHTML ?? ''}${lettering?.outerHTML ?? ''}` !== previous;
    },
    beforeDom,
    { timeout: 8000 },
  );
  await waitForAnimations(page);
  return timedOut;
}

async function ensureState(page, target, toggleSelector) {
  const state = await page.locator(WRAPPER).first().getAttribute('data-xploder-state');
  if (state === target) return false;
  const timedOut = await clickAndSettle(page, toggleSelector);
  const next = await page.locator(WRAPPER).first().getAttribute('data-xploder-state');
  if (next !== target) throw new Error(`expected ${target}, got ${next}`);
  return timedOut;
}

async function setScroll(page, top) {
  await page.evaluate((scrollTop) => {
    const stage = document.querySelector('[data-xploder-lettering-on] [data-xploder-stage]');
    if (stage === null) throw new Error('viewer stage missing');
    stage.scrollTop = scrollTop;
    stage.dispatchEvent(new Event('scroll'));
  }, top);
  await waitForAnimations(page);
}

async function applyScrollPosition(page, task, position) {
  const current = await page.evaluate(geometry);
  if (position.top === null) {
    if (current.extent > 0) {
      throw new Error(`${task.routeSlug}: scroll extent changed from zero`);
    }
    return;
  }
  const target =
    position.top === 'middle'
      ? Math.round(current.extent / 2)
      : position.top === 'bottom'
        ? current.extent
        : position.top;
  await setScroll(page, target);
}

function cellId(task, details) {
  const scroll = details.scroll === 'n/a' ? 'n-a' : details.scroll;
  const state = details.state.replace(/[^a-z0-9-]/gi, '-').toLowerCase();
  return `${task.routeSlug}-${task.width}-${task.scheme}-${state}-z${details.zoomIndex}-${scroll}-t${details.turn}`;
}

async function captureCell(page, task, details, appendLine, seen, timeout) {
  const id = cellId(task, details);
  if (seen.has(id)) throw new Error(`duplicate cell id: ${id}`);
  seen.add(id);
  if (only !== undefined && !id.startsWith(only)) {
    return { id, labelCount: 0, paintedCount: 0, settleTimeout: false, sweepOnly: false };
  }
  const expectedLettering = details.state === 'imploded' ? 'hidden' : 'shown';
  await page.waitForFunction(
    (expected) => document.querySelector('[data-xploder-lettering-on]')?.dataset.xploderLettering === expected,
    expectedLettering,
    { timeout: 8000 },
  );
  await waitForAnimations(page);
  await page.locator(WRAPPER).first().screenshot({ path: resolve(out, `${id}.png`) });
  const measured = await page.evaluate(geometry);
  if (Math.abs(measured.zoom - details.zoom) > 1e-6) {
    throw new Error(`${id}: expected zoom ${details.zoom}, got ${measured.zoom}`);
  }
  const cell = {
    cellId: id,
    route: task.route,
    width: `${task.width}x${task.height}`,
    scheme: task.scheme,
    state: details.state,
    zoomIndex: details.zoomIndex,
    zoom: measured.zoom,
    scroll: details.scroll,
    scrollTop: measured.scrollTop,
    extent: measured.extent,
    turn: details.turn,
    azimuth: measured.azimuth,
    callouts: measured.callouts,
    settleTimeout: timeout,
    sweepOnly: details.sweepOnly === true,
    quads: measured.quads,
    dom: measured.dom,
  };
  appendLine(`${JSON.stringify(cell)}\n`);
  return {
    id,
    labelCount: cell.quads.length,
    paintedCount: cell.quads.filter((entry) => entry.painted).length,
    settleTimeout: cell.settleTimeout,
    sweepOnly: cell.sweepOnly,
  };
}

async function runStandardPage(page, task, appendLine, seen) {
  const control = task.kind === 'project' ? 'data-site-control' : 'data-engine-control';
  const toggle = `[${control}="toggle"]`;
  const rotate = `[${control}="rotate-right"]`;
  const zoomIn = `[${control}="zoom-in"]`;
  let pendingTimeout = false;
  let summaries = [];

  const initialTargetTimeout = await ensureState(page, 'imploded', toggle);
  pendingTimeout ||= initialTargetTimeout;
  for (let turn = 0; turn < 4; turn += 1) {
    const measured = await page.evaluate(geometry);
    summaries.push(
      await captureCell(
        page,
        task,
        {
          state: 'imploded',
          zoomIndex: 0,
          zoom: measured.zoom,
          scroll: 'n/a',
          turn,
        },
        appendLine,
        seen,
        pendingTimeout,
      ),
    );
    pendingTimeout = false;
    if (turn < 3) {
      const turnTimeout = await clickAndSettle(page, rotate);
      pendingTimeout ||= turnTimeout;
    }
  }

  const explodedTargetTimeout = await ensureState(page, 'exploded', toggle);
  pendingTimeout ||= explodedTargetTimeout;
  const resetTurnTimeout = await clickAndSettle(page, rotate);
  pendingTimeout ||= resetTurnTimeout;

  for (let zoomIndex = 0; zoomIndex < ZOOMS.length; zoomIndex += 1) {
    if (zoomIndex > 0) {
      const zoomTimeout = await clickAndSettle(page, zoomIn);
      pendingTimeout ||= zoomTimeout;
    }
    const current = await page.evaluate(geometry);
    if (Math.abs(current.zoom - ZOOMS[zoomIndex]) > 1e-6) {
      throw new Error(
        `${task.routeSlug}-${task.width}-${task.scheme}: zoom ${current.zoom}, expected ${ZOOMS[zoomIndex]}`,
      );
    }
    const positions =
      current.extent <= 0
        ? [{ scroll: 'n/a', top: null }]
        : [
            { scroll: 'top', top: 0 },
            { scroll: 'middle', top: 'middle' },
            { scroll: 'bottom', top: 'bottom' },
          ];

    for (const position of positions) {
      for (let turn = 0; turn < 4; turn += 1) {
        await applyScrollPosition(page, task, position);
        const measured = await page.evaluate(geometry);
        summaries.push(
          await captureCell(
            page,
            task,
            {
              state: 'exploded',
              zoomIndex,
              zoom: ZOOMS[zoomIndex],
              scroll: position.scroll,
              turn,
            },
            appendLine,
            seen,
            pendingTimeout,
          ),
        );
        pendingTimeout = false;
        if (turn < 3) {
          const turnTimeout = await clickAndSettle(page, rotate);
          pendingTimeout ||= turnTimeout;
        }
      }
      const resetTimeout = await clickAndSettle(page, rotate);
      pendingTimeout ||= resetTimeout;
    }
  }
  return summaries;
}

async function openViewer(page, task) {
  await page.goto(`${baseUrl}${task.route}`, { waitUntil: 'domcontentloaded' });
  if (task.kind === 'project') {
    await page.locator('[data-site-control="explore-3d"]').first().click();
  }
  await page.locator(WRAPPER).first().waitFor({ state: 'visible' });
  await page.locator('[data-xploder-ready="true"]').first().waitFor({ state: 'attached' });
  await page.evaluate(() => document.fonts?.ready);
  await waitForAnimations(page);
}

async function runHomePage(page, task, appendLine, seen) {
  const summaries = [];
  for (const phase of [
    { source: 'explode', state: 'hero-explode', zoomIndex: 0 },
    { source: 'zoomin', state: 'hero-zoom', zoomIndex: 5 },
  ]) {
    await page.goto(`${baseUrl}/`, { waitUntil: 'domcontentloaded' });
    await page.locator('[data-xploder-ready="true"]').first().waitFor({ state: 'attached' });
    await page.evaluate(() => document.fonts?.ready);
    await page.locator(`[data-hero-phase="${phase.source}"]`).waitFor({ timeout: 60_000 });
    const before = await settleCount(page);
    const timedOut = await waitForSettled(page, before);
    await waitForAnimations(page);
    await page.getByRole('button', { name: /pause/i }).click();
    await page.waitForTimeout(2500);
    await page.evaluate(
      () => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done))),
    );
    const measured = await page.evaluate(geometry);
    summaries.push(
      await captureCell(
        page,
        task,
        {
          state: phase.state,
          zoomIndex: phase.zoomIndex,
          zoom: measured.zoom,
          scroll: 'n/a',
          turn: 0,
          sweepOnly: true,
        },
        appendLine,
        seen,
        timedOut,
      ),
    );
  }
  return summaries;
}

const controlPairJson = (pair) => ({
  a: { marker: pair.a.marker, key: pair.a.key, quad: pair.a.quad },
  b: { marker: pair.b.marker, key: pair.b.key, quad: pair.b.quad },
  depth: pair.depth,
});

function controlPairs(entries) {
  return sweepEntries(entries).pairs.map(controlPairJson);
}

function controlPairKey(pair) {
  return [pair.a, pair.b]
    .map((entry) => `${entry.marker}:${entry.key}:${JSON.stringify(entry.quad)}`)
    .sort()
    .join('|');
}

function includesSeed(pair) {
  return pair.a.key?.startsWith('seed:') === true || pair.b.key?.startsWith('seed:') === true;
}

async function addSeedClone(page) {
  return await page.evaluate(() => {
    const wrapper = document.querySelector('[data-xploder-lettering-on]');
    if (wrapper === null) throw new Error('viewer wrapper missing');

    const effectiveOpacity = (element) => {
      let opacity = 1;
      for (let current = element; current !== null; current = current.parentElement) {
        const style = getComputedStyle(current);
        if (style.visibility === 'hidden' || style.display === 'none') return 0;
        opacity *= Number(style.opacity === '' ? 1 : style.opacity);
      }
      return opacity;
    };
    const painted = (element) =>
      effectiveOpacity(element) > 0 && element.getClientRects().length > 0;
    const candidates = [
      ...wrapper.querySelectorAll('[data-xploder-label], [data-xploder-lettering]'),
    ];
    const source = candidates.find(painted);
    if (source === undefined || source.parentElement === null) {
      throw new Error(
        `no painted label or lettering element to seed (candidates=${candidates.length}, lettering=${wrapper.getAttribute('data-xploder-lettering')})`,
      );
    }

    const sourceKey =
      source.getAttribute('data-xploder-label') ??
      source.getAttribute('data-xploder-lettering') ??
      'label';
    const clone = source.cloneNode(true);
    if (!(clone instanceof HTMLElement)) throw new Error('seeded clone is not an element');
    clone.removeAttribute('id');
    clone.removeAttribute('data-xploder-lettering');
    clone.removeAttribute('data-xploder-lettering-kind');
    clone.setAttribute('data-xploder-label', `seed:${sourceKey}`);
    clone.setAttribute('data-xploder-seed-control', 'true');

    const transform = clone.style.transform || getComputedStyle(source).transform;
    clone.style.transform =
      transform === 'none' ? 'translate(1px, 1px)' : `translate(1px, 1px) ${transform}`;
    source.parentElement.append(clone);
    clone.getBoundingClientRect();
    return clone.getAttribute('data-xploder-label');
  });
}

async function removeSeedClone(page) {
  await page.evaluate(() => {
    document.querySelector('[data-xploder-seed-control="true"]')?.remove();
  });
}

async function prepareControlCell(page, task) {
  if (task.kind === 'home') {
    await page.goto(`${baseUrl}/`, { waitUntil: 'domcontentloaded' });
    await page.locator('[data-xploder-ready="true"]').first().waitFor({ state: 'attached' });
    await page.evaluate(() => document.fonts?.ready);
    await page.locator('[data-hero-phase="explode"]').waitFor({ timeout: 60_000 });
    const before = await settleCount(page);
    const timedOut = await waitForSettled(page, before);
    await waitForAnimations(page);
    await page.getByRole('button', { name: /pause/i }).click();
    await page.waitForTimeout(2500);
    await page.evaluate(
      () => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done))),
    );
    await page.waitForFunction(
      () => document.querySelector('[data-xploder-lettering-on]')?.dataset.xploderLettering === 'shown',
      null,
      { timeout: 8000 },
    );
    await waitForAnimations(page);
    const measured = await page.evaluate(geometry);
    return {
      details: {
        state: 'hero-explode',
        zoomIndex: 0,
        zoom: measured.zoom,
        scroll: 'n/a',
        turn: 0,
      },
      timeout: timedOut,
    };
  }

  await openViewer(page, task);
  const controlName = task.kind === 'project' ? 'data-site-control' : 'data-engine-control';
  const toggle = `[${controlName}="toggle"]`;
  const zoomIn = `[${controlName}="zoom-in"]`;
  let timedOut = await ensureState(page, 'exploded', toggle);
  const zoomIndex = task.kind === 'project' ? 3 : 0;

  for (let index = 0; index < zoomIndex; index += 1) {
    timedOut ||= await clickAndSettle(page, zoomIn);
  }
  const beforeScroll = await page.evaluate(geometry);
  const scroll = beforeScroll.extent <= 0 ? 'n/a' : 'top';
  await applyScrollPosition(
    page,
    task,
    scroll === 'n/a' ? { scroll, top: null } : { scroll, top: 0 },
  );
  const measured = await page.evaluate(geometry);
  return {
    details: {
      state: 'exploded',
      zoomIndex,
      zoom: ZOOMS[zoomIndex],
      scroll,
      turn: 0,
    },
    timeout: timedOut,
  };
}

async function runControlMode() {
  mkdirSync(out, { recursive: true });
  const controlPath = resolve(out, 'control.jsonl');
  const records = new Map();
  try {
    for (const line of readFileSync(controlPath, 'utf8').split('\n').filter(Boolean)) {
      const record = JSON.parse(line);
      records.set(record.cellId, line);
    }
  } catch {
    // The first control invocation has no previous records.
  }

  const browser = await chromium.launch();
  let failures = 0;
  console.log(
    `# command: node label-matrix.mjs <repo> <baseUrl> --control --routes ${routes.join(',')} --out <dir> | base: ${baseUrl} | chromium: ${browser.version()} | commit: ${commit}`,
  );

  try {
    for (const task of controlTasks) {
      if (task === undefined) throw new Error('missing control task');
      const context = await browser.newContext({
        viewport: { width: task.width, height: task.height },
        isMobile: task.mobile,
        hasTouch: task.mobile,
        deviceScaleFactor: 1,
        colorScheme: task.scheme,
        reducedMotion: 'no-preference',
      });
      await context.addInitScript(() => {
        window.__xploderSettleCount = 0;
        document.addEventListener(
          'xploder:settled',
          () => {
            window.__xploderSettleCount += 1;
          },
          true,
        );
      });
      const page = await context.newPage();

      try {
        const prepared = await prepareControlCell(page, task);
        const id = cellId(task, prepared.details);
        const before = await page.evaluate(geometry);
        const beforePairs = controlPairs(before.quads);
        const seed = await addSeedClone(page);
        let detected = false;
        let seededPairs = [];
        let cleanedPairs = [];

        try {
          const seeded = await page.evaluate(geometry);
          seededPairs = controlPairs(seeded.quads);
          detected = seededPairs.some(includesSeed);
        } finally {
          await removeSeedClone(page);
          const cleaned = await page.evaluate(geometry);
          cleanedPairs = controlPairs(cleaned.quads);
        }

        const samePairs =
          cleanedPairs.map(controlPairKey).sort().join('\n') ===
          beforePairs.map(controlPairKey).sort().join('\n');
        const record = {
          cellId: id,
          seed,
          hits: seededPairs.length,
          withoutSeedHits: beforePairs.length,
          afterRemovalHits: cleanedPairs.length,
          pairs: seededPairs,
        };
        records.set(id, JSON.stringify(record));

        if (detected) {
          console.log(`control ${id}: seed detected (${seededPairs.length} pairs incl. seed)`);
        } else {
          failures += 1;
          console.log(`control ${id}: SEED NOT DETECTED`);
        }
        if (!samePairs || cleanedPairs.length !== beforePairs.length) {
          failures += 1;
          console.log(
            `control ${id}: SEED CLEANUP FAILED (${beforePairs.length} before, ${cleanedPairs.length} after)`,
          );
        }
      } finally {
        await context.close();
      }
    }
  } finally {
    await browser.close();
    writeFileSync(controlPath, `${[...records.values()].join('\n')}\n`);
  }

  if (failures > 0) process.exitCode = 1;
}

if (control) {
  await runControlMode();
  process.exit(process.exitCode ?? 0);
}

mkdirSync(out, { recursive: true });
const browser = await chromium.launch();
console.log(
  `# command: node label-matrix.mjs <repo> <baseUrl> --out <dir> --routes ${routes.join(',')} --workers ${workers} | base: ${baseUrl} | chromium: ${browser.version()} | commit: ${commit} | workers: ${workers}`,
);

const started = Date.now();
const pageResults = new Array(selectedTasks.length);
const workerFiles = [];
let cursor = 0;

async function worker(workerIndex) {
  const workerFile = resolve(out, `.cells-worker-${workerIndex}.jsonl`);
  workerFiles.push(workerFile);
  writeFileSync(workerFile, '');
  while (true) {
    const index = cursor;
    cursor += 1;
    if (index >= selectedTasks.length) return;
    const task = selectedTasks[index];
    const pageStarted = Date.now();
    const context = await browser.newContext({
      viewport: { width: task.width, height: task.height },
      isMobile: task.mobile,
      hasTouch: task.mobile,
      deviceScaleFactor: 1,
      colorScheme: task.scheme,
      reducedMotion: 'no-preference',
    });
    await context.addInitScript(() => {
      window.__xploderSettleCount = 0;
      document.addEventListener(
        'xploder:settled',
        () => {
          window.__xploderSettleCount += 1;
        },
        true,
      );
    });
    const page = await context.newPage();
    const seen = new Set();
    const lines = [];
    try {
      const cells =
        task.kind === 'home'
          ? await runHomePage(page, task, (line) => lines.push(line), seen)
          : await (async () => {
              await openViewer(page, task);
              return runStandardPage(page, task, (line) => lines.push(line), seen);
            })();
      const filtered = only === undefined ? cells : cells.filter((cell) => cell.id.startsWith(only));
      pageResults[index] = {
        task,
        cells: filtered,
        durationMs: Date.now() - pageStarted,
      };
      appendFileSync(workerFile, lines.join(''));
    } finally {
      await context.close();
    }
  }
}

try {
  await Promise.all(
    Array.from({ length: Math.min(workers, selectedTasks.length) }, (_, index) => worker(index)),
  );
} finally {
  await browser.close();
}

const cellsPath = resolve(out, 'cells.jsonl');
const previousCells = new Map();
try {
  for (const line of readFileSync(cellsPath, 'utf8').split('\n').filter(Boolean)) {
    const cell = JSON.parse(line);
    previousCells.set(cell.cellId, line);
  }
} catch {
  // The first invocation has no previous cells.
}
const currentCells = new Map();
for (const workerFile of workerFiles.sort()) {
  for (const line of readFileSync(workerFile, 'utf8').split('\n').filter(Boolean)) {
    currentCells.set(JSON.parse(line).cellId, line);
  }
  unlinkSync(workerFile);
}
const mergedCells = new Map([...previousCells, ...currentCells]);
writeFileSync(cellsPath, `${[...mergedCells.values()].join('\n')}\n`);

let previousSummary = null;
try {
  previousSummary = JSON.parse(readFileSync(resolve(out, 'summary.json'), 'utf8'));
} catch {
  // The first invocation has no previous summary.
}
const cells = [...mergedCells.values()].map((line) => {
  const cell = JSON.parse(line);
  return {
    id: cell.cellId,
    labelCount: cell.quads.length,
    paintedCount: cell.quads.filter((entry) => entry.painted).length,
    settleTimeout: cell.settleTimeout,
    sweepOnly: cell.sweepOnly,
  };
});
const summary = {
  cells: cells.map(({ id, labelCount, paintedCount, settleTimeout }) => ({
    id,
    labelCount,
    paintedCount,
    settleTimeout,
  })),
  totals: {
    cells: cells.length,
    labels: cells.reduce((total, cell) => total + cell.labelCount, 0),
    painted: cells.reduce((total, cell) => total + cell.paintedCount, 0),
    settleTimeouts: cells.filter((cell) => cell.settleTimeout).length,
    sweepOnly: cells.filter((cell) => cell.sweepOnly).length,
  },
  durations: {
    totalMs: Number(previousSummary?.durations?.totalMs ?? 0) + (Date.now() - started),
    pages: [
      ...(previousSummary?.durations?.pages ?? []),
      ...pageResults.map(({ task, durationMs }) => ({
        route: task.route,
        width: `${task.width}x${task.height}`,
        scheme: task.scheme,
        durationMs,
      })),
    ],
  },
};
writeFileSync(resolve(out, 'summary.json'), `${JSON.stringify(summary, null, 2)}\n`);
console.log(
  `CELLS ${summary.totals.cells} | LABELS ${summary.totals.labels} | PAINTED ${summary.totals.painted} | SETTLE-TIMEOUTS ${summary.totals.settleTimeouts} | SWEEP-ONLY ${summary.totals.sweepOnly}`,
);
console.log(`DURATION ${(summary.durations.totalMs / 1000).toFixed(1)} s`);
