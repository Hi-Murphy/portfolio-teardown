#!/usr/bin/env node
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';

function usage() {
  console.error('usage: node label-emphasis.mjs <repo> <baseUrl> [--shots <dir>]');
  process.exit(2);
}

const argv = process.argv.slice(2);
const positional = [];
let shots = null;

for (let index = 0; index < argv.length; index += 1) {
  const argument = argv[index];

  if (argument === '--shots') {
    const value = argv[index + 1];

    if (value === undefined || value.startsWith('--')) usage();
    shots = resolve(value);
    index += 1;
  } else if (argument.startsWith('--')) {
    usage();
  } else {
    positional.push(argument);
  }
}

const [repoArg, baseUrlArg] = positional;

if (repoArg === undefined || baseUrlArg === undefined || positional.length !== 2) usage();

const repo = resolve(repoArg);
const baseUrl = baseUrlArg.replace(/\/$/, '');
const require = createRequire(resolve(repo, 'tools/perf/package.json'));
const { chromium } = require('playwright');
const commit =
  process.env.S16_COMMIT ??
  execFileSync('git', ['-C', repo, 'rev-parse', '--short', 'HEAD'], { encoding: 'utf8' }).trim();
const A = 'bench-cli';
const B = 'jev-client';
const ROUTE = '/projects/jev-toolkit';
const WRAPPER = '[data-xploder-lettering-on]';
const VIEWPORTS = [
  { width: 390, height: 844, touch: true },
  { width: 1440, height: 900, touch: false },
];

if (shots !== null) mkdirSync(shots, { recursive: true });

const browser = await chromium.launch();
const rows = [];
let failed = false;

console.log(
  `# command: node label-emphasis.mjs <repo> <baseUrl> --shots <dir> | target: ${baseUrl}${ROUTE} | chromium: ${browser.version()} | commit: ${commit}`,
);
console.log(`# parts: A=${A}, B=${B}; zoom 1; light/dark x 390x844 touch and 1440x900; CPU throttling n/a`);

function readState({ a: partA, b: partB }) {
  const wrapper = document.querySelector('[data-xploder-lettering-on]');

  if (wrapper === null) throw new Error('viewer wrapper missing');

  const slot = (selector) => {
    const element = document.querySelector(selector);

    return element === null
      ? { present: false, slot: null }
      : { present: true, slot: element.getAttribute('data-xploder-emphasis-slot') };
  };
  const label = (id) => slot(`[data-xploder-label="part:${id}"]`);
  const lettering = (id) => slot(`[data-xploder-lettering="${id}"]`);
  const row = (id) => slot(`[data-xploder-column-row="${id}"]`);

  return {
    highlight: wrapper.getAttribute('data-xploder-highlight'),
    selected: wrapper.getAttribute('data-xploder-selected'),
    panel: wrapper.getAttribute('data-xploder-panel'),
    zoom: wrapper.getAttribute('data-xploder-zoom'),
    state: wrapper.getAttribute('data-xploder-state'),
    a: { label: label(partA), lettering: lettering(partA), row: row(partA) },
    b: { label: label(partB), lettering: lettering(partB), row: row(partB) },
  };
}

const read = (page) => page.evaluate(readState, { a: A, b: B });

async function settle(page) {
  await page.evaluate(
    () =>
      new Promise((done) => {
        const finish = () => requestAnimationFrame(() => requestAnimationFrame(done));

        if (typeof document.getAnimations !== 'function') {
          finish();
          return;
        }

        Promise.all(
          document
            .getAnimations()
            .filter((animation) => animation.playState !== 'finished' && animation.playState !== 'idle')
            .map((animation) => animation.finished.catch(() => undefined)),
        ).then(finish);
      }),
  );
}

async function waitFor(page, predicate, argument, message) {
  await page.waitForFunction(predicate, argument, { timeout: 15_000 }).catch(() => {
    throw new Error(message);
  });
}

async function openA(page, touch) {
  const point = await page.evaluate((id) => {
    const proxy = document.querySelector(`[data-xploder-proxy="${id}"]`);

    if (proxy === null) throw new Error(`missing proxy ${id}`);

    const rect = proxy.getBoundingClientRect();

    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
  }, A);

  if (touch) await page.touchscreen.tap(point.x, point.y);
  else await page.mouse.click(point.x, point.y);

  await waitFor(
    page,
    (input) => {
      const wrapper = document.querySelector('[data-xploder-lettering-on]');

      return (
        wrapper?.getAttribute('data-xploder-panel') === 'detail' &&
        wrapper.getAttribute('data-xploder-selected') === input.a &&
        document.querySelector('[data-xploder-panel-surface]') !== null
      );
    },
    { a: A },
    `clicking slab ${A} did not open its detail panel`,
  );
  await settle(page);
}

async function hoverB(page) {
  const point = await page.evaluate((id) => {
    const proxy = document.querySelector(`[data-xploder-proxy="${id}"]`);

    if (proxy === null) throw new Error(`missing proxy ${id}`);

    const rect = proxy.getBoundingClientRect();

    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
  }, B);

  await page.mouse.move(point.x, point.y);
  await waitFor(
    page,
    (id) =>
      document
        .querySelector('[data-xploder-lettering-on]')
        ?.getAttribute('data-xploder-highlight') === id,
    B,
    `hovering ${B} did not set the highlight`,
  );
  await settle(page);
}

async function leaveB(page) {
  await page.locator('[data-site-control="toggle"]').first().hover();
  await waitFor(
    page,
    (id) =>
      document
        .querySelector('[data-xploder-lettering-on]')
        ?.getAttribute('data-xploder-highlight') !== id,
    B,
    `leaving ${B} did not clear the highlight`,
  );
  await settle(page);
}

async function closeWithEscape(page) {
  await page.keyboard.press('Escape');
  await waitFor(
    page,
    () =>
      document
        .querySelector('[data-xploder-lettering-on]')
        ?.getAttribute('data-xploder-panel') === 'closed',
    null,
    'Escape did not close the detail panel',
  );
  await settle(page);
}

async function focusA(page) {
  if (await page.evaluate((id) => document.activeElement?.getAttribute('data-xploder-proxy') === id, A)) {
    return;
  }

  if (!(await page.evaluate(() => document.activeElement?.hasAttribute('data-xploder-lettering-on')))) {
    await page.locator(WRAPPER).first().focus();
  }

  for (let attempt = 0; attempt < 16; attempt += 1) {
    await page.keyboard.press('Tab');

    if (
      await page.evaluate((id) => document.activeElement?.getAttribute('data-xploder-proxy') === id, A)
    ) {
      await waitFor(
        page,
        (id) =>
          document
            .querySelector('[data-xploder-lettering-on]')
            ?.getAttribute('data-xploder-selected') === id,
        A,
        `focusing proxy ${A} did not select it`,
      );
      await settle(page);
      return;
    }
  }

  throw new Error(`Tab did not reach proxy ${A}`);
}

function expectedFor(step, touch) {
  if (step === 'open') {
    return touch
      ? { highlight: A, selected: A, a: 'hover selected', b: null }
      : { highlight: A, selected: A, a: 'hover selected', b: null };
  }
  if (step === 'hover') return { highlight: B, selected: A, a: 'selected', b: 'hover' };
  if (step === 'leave') return { highlight: null, selected: A, a: 'selected', b: null };
  if (step === 'closed') return { highlight: null, selected: null, a: null, b: null };
  if (step === 'focus') return { highlight: A, selected: A, a: 'hover selected', b: null };
  if (step === 'focus-hover') {
    return { highlight: B, selected: A, a: 'selected', b: 'hover' };
  }
  throw new Error(`unknown step ${step}`);
}

function record(state, expected, meta) {
  const row = {
    ...meta,
    aExpected: expected.a,
    aActual: state.a.label.slot,
    bExpected: expected.b,
    bActual: state.b.label.slot,
    wrapper: `${state.highlight ?? 'null'} / ${state.selected ?? 'null'}`,
    verdict: 'PASS',
  };

  try {
    assert.equal(state.zoom, '1', 'zoom must stay at 1');
    assert.equal(state.state, 'exploded', 'viewer must stay exploded');
    assert.equal(state.highlight, expected.highlight, 'wrapper highlight');
    assert.equal(state.selected, expected.selected, 'wrapper selected');
    assert.equal(state.a.label.slot, expected.a, 'A S6 label slot');
    assert.equal(state.b.label.slot, expected.b, 'B S6 label slot');
    assert.equal(state.a.lettering.slot, expected.a, 'A lettering slot');
    assert.equal(state.b.lettering.slot, expected.b, 'B lettering slot');

    for (const [name, value] of [
      ['A S6 label', state.a.label],
      ['B S6 label', state.b.label],
      ['A lettering', state.a.lettering],
      ['B lettering', state.b.lettering],
    ]) {
      assert.equal(value.present, true, `${name} must exist`);
    }

    for (const [name, value] of [
      ['A column row', state.a.row],
      ['B column row', state.b.row],
    ]) {
      if (value.present) assert.equal(value.slot, expected[name.startsWith('A') ? 'a' : 'b'], name);
    }
  } catch (error) {
    row.verdict = 'FAIL';
    row.error = error instanceof Error ? error.message : String(error);
    failed = true;
  }

  rows.push(row);
}

async function screenshot(page, state, width, scheme) {
  if (shots === null) return;

  await page.locator(WRAPPER).first().screenshot({
    path: resolve(shots, `T010-screenshot-emphasis-${state}-${width}-${scheme}.png`),
  });
}

async function run(width, height, touch, scheme) {
  const context = await browser.newContext({
    viewport: { width, height },
    isMobile: touch,
    hasTouch: touch,
    deviceScaleFactor: 1,
    colorScheme: scheme,
    reducedMotion: 'no-preference',
  });

  try {
    const page = await context.newPage();

    await page.goto(`${baseUrl}${ROUTE}`, { waitUntil: 'domcontentloaded' });
    await page.locator('[data-site-control="explore-3d"]').first().click();
    await page.locator(WRAPPER).first().waitFor({ state: 'visible' });
    await page.locator('[data-xploder-ready="true"]').first().waitFor({ state: 'attached' });
    await page.evaluate(() => document.fonts?.ready);
    await settle(page);

    const initial = await read(page);

    if (!initial.a.lettering.present || !initial.b.lettering.present) {
      throw new Error(`parts ${A} and ${B} must both have visible lettering`);
    }

    await openA(page, touch);
    record(await read(page), expectedFor('open', touch), {
      scheme,
      width,
      touch,
      step: 'open A',
    });

    if (touch) {
      rows.push({ scheme, width, touch, step: 'hover B', verdict: 'n/a (touch)' });
    } else {
      await hoverB(page);
      record(await read(page), expectedFor('hover', touch), {
        scheme,
        width,
        touch,
        step: 'hover B',
      });
    }
    await screenshot(page, 'a-open-b-hover', width, scheme);

    if (touch) {
      rows.push({ scheme, width, touch, step: 'leave B', verdict: 'n/a (touch)' });
    } else {
      await leaveB(page);
      record(await read(page), expectedFor('leave', touch), {
        scheme,
        width,
        touch,
        step: 'leave B',
      });
    }
    await screenshot(page, 'b-left', width, scheme);

    await closeWithEscape(page);
    record(await read(page), expectedFor('closed', touch), {
      scheme,
      width,
      touch,
      step: 'close via Escape',
    });
    await screenshot(page, 'closed', width, scheme);

    await focusA(page);
    record(await read(page), expectedFor('focus', touch), {
      scheme,
      width,
      touch,
      step: 'focus A',
    });

    if (touch) {
      rows.push({ scheme, width, touch, step: 'hover B after focus', verdict: 'n/a (touch)' });
    } else {
      await hoverB(page);
      record(await read(page), expectedFor('focus-hover', touch), {
        scheme,
        width,
        touch,
        step: 'focus A + hover B',
      });
    }
    await screenshot(page, 'focus-a-hover-b', width, scheme);
  } catch (error) {
    throw new Error(
      `${scheme} ${width}x${height}: ${error instanceof Error ? error.message : String(error)}`,
    );
  } finally {
    await context.close();
  }
}

try {
  for (const scheme of ['light', 'dark']) {
    for (const viewport of VIEWPORTS) {
      await run(viewport.width, viewport.height, viewport.touch, scheme);
    }
  }
} finally {
  await browser.close();
}

console.log(
  '\n| scheme | width | touch | step | A expected | A actual | B expected | B actual | highlight / selected | verdict |',
);
console.log('|---|---:|---|---|---|---|---|---|---|---|');

for (const row of rows) {
  console.log(
    `| ${row.scheme} | ${row.width} | ${row.touch ? 'yes' : 'no'} | ${row.step} | ${row.aExpected ?? '—'} | ${row.aActual ?? '—'} | ${row.bExpected ?? '—'} | ${row.bActual ?? '—'} | ${row.wrapper ?? '—'} | ${row.verdict}${row.error === undefined ? '' : `: ${row.error}`} |`,
  );
}

console.log(`\nemphasis: ${failed ? 'FAIL' : 'PASS'}`);
process.exit(failed ? 6 : 0);
