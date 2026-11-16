#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';

function usage() {
  console.error('usage: node label-passes.mjs <repo> <baseUrl> [--churn]');
  process.exit(2);
}

const argv = process.argv.slice(2);
const positional = [];
let churn = false;
for (const argument of argv) {
  if (argument === '--churn') {
    if (churn) usage();
    churn = true;
  } else if (argument.startsWith('--')) {
    usage();
  } else {
    positional.push(argument);
  }
}

const [repoArg, baseUrlArg] = positional;
if (!repoArg || !baseUrlArg || positional.length !== 2) usage();

const repo = resolve(repoArg);
const baseUrl = baseUrlArg.replace(/\/$/, '');
const require = createRequire(resolve(repo, 'tools/perf/package.json'));
const { chromium } = require('playwright');
const commit =
  process.env.S16_COMMIT ??
  execFileSync('git', ['-C', repo, 'rev-parse', '--short', 'HEAD'], { encoding: 'utf8' }).trim();

const WRAPPER = '[data-xploder-lettering-on]';
const TASKS = [
  {
    route: '/projects/websocket-inspector',
    width: 390,
    height: 844,
    mobile: true,
  },
  {
    route: '/projects/websocket-inspector',
    width: 1440,
    height: 900,
    mobile: false,
  },
  {
    route: '/projects/jev-toolkit',
    width: 390,
    height: 844,
    mobile: true,
  },
  {
    route: '/projects/jev-toolkit',
    width: 1440,
    height: 900,
    mobile: false,
  },
];

// Copied from label-matrix.mjs so --churn observes the same rectangles as the parity matrix.
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

  return entries;
};

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

const counters = (page) =>
  page.evaluate(() => {
    const wrapper = document.querySelector('[data-xploder-lettering-on]');
    return {
      settles: window.__xploderSettleCount ?? 0,
      passes: Number(wrapper?.dataset.xploderLabelPasses),
    };
  });

async function openViewer(page, task) {
  await page.goto(`${baseUrl}${task.route}`, { waitUntil: 'domcontentloaded' });
  await page.locator('[data-site-control="explore-3d"]').first().click();
  await page.locator(WRAPPER).first().waitFor({ state: 'visible' });
  await page.locator('[data-xploder-ready="true"]').first().waitFor({ state: 'attached' });
  await page.evaluate(() => document.fonts?.ready);
  await waitForAnimations(page);
}

async function runChurn(page) {
  const quadSource = geometry.toString();
  return page.evaluate(
    async ({ quadSource, frameCount }) => {
      const collect = new Function(`return (${quadSource})`)();
      const wrapper = document.querySelector('[data-xploder-lettering-on]');
      const counterBefore = Number(wrapper?.dataset.xploderLabelPasses);
      const samples = [];

      for (let frame = 0; frame < frameCount; frame += 1) {
        await new Promise((done) => requestAnimationFrame(done));
        samples.push(JSON.stringify(collect()));
      }

      const counterAfter = Number(wrapper?.dataset.xploderLabelPasses);
      let firstDifferingFrame = null;
      for (let index = 1; index < samples.length; index += 1) {
        if (samples[index] !== samples[0]) {
          firstDifferingFrame = index + 1;
          break;
        }
      }

      return {
        frames: samples.length,
        firstDifferingFrame,
        counterBefore,
        counterAfter,
      };
    },
    { quadSource, frameCount: 60 },
  );
}

const rows = [];
const churnRows = [];
let rePasses = 0;
let failed = false;

async function measure(page, task, name, expected, action, options = {}) {
  const before = await counters(page);
  let actionFailure = null;
  try {
    actionFailure = await action();
  } catch (error) {
    actionFailure = error instanceof Error ? error.message : String(error);
  }

  let settleTimedOut = false;
  if (options.waitForSettle === true) {
    settleTimedOut = await waitForSettled(page, before.settles);
  }

  await waitForAnimations(page);
  const after = await counters(page);
  const settles = after.settles - before.settles;
  const passes = after.passes - before.passes;
  const countPass =
    options.waitForSettle === true
      ? passes === settles && settles >= 1
      : passes === 0 && settles === 0;
  const pass = countPass && actionFailure === null;

  if (!pass) failed = true;
  if (options.motion === true && Number.isFinite(passes - settles) && passes > settles) {
    rePasses += passes - settles;
  }

  rows.push({
    route: task.route,
    viewport: `${task.width}x${task.height}`,
    name,
    settles,
    passes,
    expected,
    pass,
  });

  if (options.motion === true && churn) {
    const sample = await runChurn(page);
    const churnPass = sample.firstDifferingFrame === null && sample.counterBefore === sample.counterAfter;
    if (!churnPass) failed = true;
    churnRows.push({
      route: task.route,
      viewport: `${task.width}x${task.height}`,
      name,
      sample,
      pass: churnPass,
    });
  }

  if (settleTimedOut) {
    console.log(`note [${task.route} ${task.width}x${task.height}] ${name}: settle timed out`);
  }
  if (actionFailure !== null) {
    console.log(`note [${task.route} ${task.width}x${task.height}] ${name}: ${actionFailure}`);
  }
}

async function clickStep(page, task, name, selector, expectedState) {
  await measure(page, task, name, 'passes == settles >= 1', async () => {
    await page.locator(selector).first().click();
    if (expectedState !== undefined) {
      await page.waitForFunction(
        ({ selector, expected }) =>
          document.querySelector(selector)?.getAttribute('data-xploder-state') === expected,
        { selector: WRAPPER, expected: expectedState },
        { timeout: 8000 },
      );
    }
    return null;
  }, { waitForSettle: true, motion: true });
}

async function resizeStep(page, task, name, width) {
  await measure(page, task, name, 'passes == settles >= 1', async () => {
    await page.setViewportSize({ width, height: task.height });
    return null;
  }, { waitForSettle: true, motion: true });
}

async function noPassStep(page, task, name, action) {
  await measure(page, task, name, 'passes == settles == 0', action);
}

async function runTask(browser, task) {
  const context = await browser.newContext({
    viewport: { width: task.width, height: task.height },
    isMobile: task.mobile,
    hasTouch: task.mobile,
    deviceScaleFactor: 1,
    colorScheme: 'light',
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
    await openViewer(page, task);

    await clickStep(page, task, 'toggle to imploded', '[data-site-control="toggle"]', 'imploded');
    await clickStep(page, task, 'toggle to exploded', '[data-site-control="toggle"]', 'exploded');
    for (let index = 1; index <= 5; index += 1) {
      await clickStep(page, task, `zoom-in ${index}/5`, '[data-site-control="zoom-in"]');
    }
    for (let index = 1; index <= 4; index += 1) {
      await clickStep(page, task, `rotate-right ${index}/4`, '[data-site-control="rotate-right"]');
    }
    await clickStep(page, task, 'zoom-reset', '[data-site-control="zoom-reset"]');

    const resizedWidth = task.mobile ? 360 : 1280;
    await resizeStep(page, task, `resize ${task.width} to ${resizedWidth}`, resizedWidth);
    await resizeStep(page, task, `resize ${resizedWidth} to ${task.width}`, task.width);

    if (task.mobile) {
      console.log(`note [${task.route} ${task.width}x${task.height}] hover slab: skipped on touch`);
    } else {
      await noPassStep(page, task, 'hover slab on/off', async () => {
        const rect = await page.locator('[data-xploder-stage]').first().boundingBox();
        if (rect === null) throw new Error('stage rectangle missing');
        await page.mouse.move(rect.x + rect.width / 2, rect.y + rect.height / 2);
        await page.evaluate(
          () => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done))),
        );
        await page.mouse.move(0, 0);
        return null;
      });
    }

    await noPassStep(page, task, 'open and close part detail', async () => {
      const candidates = await page.evaluate(() =>
        [...document.querySelectorAll('[data-xploder-proxy]')]
          .map((proxy) => proxy.getBoundingClientRect())
          .filter((rect) => rect.width >= 4 && rect.height >= 4)
          .map((rect) => ({
            x: rect.left + rect.width / 2,
            y: rect.top + rect.height / 2,
            area: rect.width * rect.height,
          }))
          .sort((left, right) => right.area - left.area)
          .slice(0, 8),
      );

      let opened = false;
      for (const candidate of candidates) {
        await page.mouse.click(candidate.x, candidate.y);
        opened = await page
          .locator('[data-xploder-panel-surface]')
          .first()
          .waitFor({ state: 'visible', timeout: 1200 })
          .then(() => true)
          .catch(() => false);
        if (opened) break;
      }
      if (!opened) throw new Error('detail panel did not open from a slab click');

      await waitForAnimations(page);
      await page.keyboard.press('Escape');
      await page
        .locator('[data-xploder-panel-surface]')
        .first()
        .waitFor({ state: 'detached', timeout: 8000 });
      return null;
    });

    const extentBeforeZoom = await page.evaluate(() =>
      Number(
        document
          .querySelector('[data-xploder-lettering-on] [data-xploder-stage]')
          ?.getAttribute('data-xploder-scroll-extent') ?? 0,
      ),
    );
    if (extentBeforeZoom <= 0) {
      const beforeZoom = await counters(page);
      await page.locator('[data-site-control="zoom-in"]').first().click();
      await waitForSettled(page, beforeZoom.settles);
      await waitForAnimations(page);
    }

    const extent = await page.evaluate(() =>
      Number(
        document
          .querySelector('[data-xploder-lettering-on] [data-xploder-stage]')
          ?.getAttribute('data-xploder-scroll-extent') ?? 0,
      ),
    );
    if (extent > 0) {
      await noPassStep(page, task, 'scroll stage middle and back', async () => {
        await page.evaluate(() => {
          const stage = document.querySelector('[data-xploder-lettering-on] [data-xploder-stage]');
          const extent = Number(stage?.getAttribute('data-xploder-scroll-extent') ?? 0);
          if (stage === null || extent <= 0) throw new Error('scroll extent unavailable');
          stage.scrollTop = Math.round(extent / 2);
          stage.dispatchEvent(new Event('scroll'));
        });
        await waitForAnimations(page);
        await page.evaluate(() => {
          const stage = document.querySelector('[data-xploder-lettering-on] [data-xploder-stage]');
          if (stage === null) throw new Error('viewer stage missing');
          stage.scrollTop = 0;
          stage.dispatchEvent(new Event('scroll'));
        });
        return null;
      });
    } else {
      console.log(
        `note [${task.route} ${task.width}x${task.height}] scroll stage middle and back: skipped (extent 0 after zoom-in)`,
      );
    }

    await noPassStep(page, task, 'palette dark and back', async () => {
      await page.emulateMedia({ colorScheme: 'dark' });
      await page.waitForFunction(() => document.documentElement.classList.contains('dark'));
      await waitForAnimations(page);
      await page.emulateMedia({ colorScheme: 'light' });
      await page.waitForFunction(() => document.documentElement.classList.contains('light'));
      return null;
    });

    await noPassStep(page, task, 'keyboard focus moves', async () => {
      await page.locator('[data-site-outline]').first().focus();
      await page.keyboard.press('Tab');
      await page.waitForFunction(
        () => document.activeElement?.matches('[data-xploder-proxy]') === true,
        null,
        { timeout: 8000 },
      );
      const firstProxy = await page.evaluate(
        () => document.activeElement?.getAttribute('data-xploder-proxy') ?? null,
      );
      await page.keyboard.press('Tab');
      await page.waitForFunction(
        (first) => {
          const active = document.activeElement;
          return active !== null && active.getAttribute('data-xploder-proxy') !== first;
        },
        firstProxy,
        { timeout: 8000 },
      );
      return null;
    });

    await noPassStep(page, task, '2 s idle', async () => {
      await page.waitForTimeout(2000);
      return null;
    });
  } finally {
    await context.close();
  }
}

const browser = await chromium.launch();
console.log(
  `# command: node label-passes.mjs <repo> <baseUrl>${churn ? ' --churn' : ''} | base: ${baseUrl} | chromium: ${browser.version()} | commit: ${commit}`,
);

try {
  for (const task of TASKS) {
    await runTask(browser, task);
  }
} finally {
  await browser.close();
}

console.log('| route | viewport | step | settles | passes | expected | verdict |');
console.log('|---|---|---|---:|---:|---|---|');
for (const row of rows) {
  console.log(
    `| \`${row.route}\` | \`${row.viewport}\` | ${row.name} | ${row.settles} | ${row.passes} | ${row.expected} | ${row.pass ? 'PASS' : 'FAIL'} |`,
  );
}

console.log('\nProject switch: skipped — not available on project pages.');

if (churn) {
  console.log('\n| route | viewport | step | 60-frame quads | counter | verdict |');
  console.log('|---|---|---|---|---|---|');
  for (const row of churnRows) {
    const quads =
      row.sample.firstDifferingFrame === null
        ? 'identical 60/60'
        : `first differing frame ${row.sample.firstDifferingFrame}`;
    const counter = `${row.sample.counterBefore} to ${row.sample.counterAfter}`;
    console.log(
      `| \`${row.route}\` | \`${row.viewport}\` | ${row.name} | ${quads} | ${counter} | ${row.pass ? 'PASS' : 'FAIL'} |`,
    );
  }
}

console.log(
  `\nR3 re-pass count: ${rePasses} (expected 0) | ${rePasses === 0 ? 'PASS' : 'FAIL'}`,
);
if (rePasses !== 0) failed = true;

console.log(`\npasses: ${failed ? 'FAIL' : 'PASS'}`);
process.exit(failed ? 6 : 0);
