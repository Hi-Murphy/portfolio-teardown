import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';

const [, , repoArg, baseUrlArg] = process.argv;
if (!repoArg || !baseUrlArg) {
  console.error('usage: node event-log.mjs <repo> <baseUrl>');
  process.exit(2);
}

const repo = resolve(repoArg);
const baseUrl = baseUrlArg.replace(/\/$/, '');
const require = createRequire(resolve(repo, 'tools/perf/package.json'));
const { chromium } = require('playwright');
const browser = await chromium.launch();
const commit =
  process.env.S15_COMMIT ??
  execFileSync('git', ['-C', repo, 'rev-parse', '--short', 'HEAD'], {
    encoding: 'utf8',
  }).trim();

function round(value) {
  return Math.round(value * 10) / 10;
}

async function installEventLog(page) {
  await page.addInitScript(() => {
    const storageKey = '__s15EventLog';
    const stored = sessionStorage.getItem(storageKey);
    const state = stored ? JSON.parse(stored) : { events: [], support: false };
    window.__s15EventLog = state;
    const persist = () => sessionStorage.setItem(storageKey, JSON.stringify(state));
    for (const name of ['xploder:ready', 'xploder:settled', 'xploder:tour-ended']) {
      document.addEventListener(
        name,
        (event) => {
          state.support = true;
          state.events.push({
            path: location.pathname,
            type: name.slice('xploder:'.length),
            detail: event instanceof CustomEvent ? event.detail : null,
            at: performance.now(),
          });
          persist();
        },
        true,
      );
    }
  });
}

async function waitForSettled(page) {
  await page.waitForFunction(
    () => {
      const viewers = [...document.querySelectorAll('[data-xploder-ready="true"]')];
      const viewer = viewers.at(-1);
      const state = viewer?.getAttribute('data-xploder-state');
      return state === 'exploded' || state === 'imploded';
    },
    undefined,
    { timeout: 15_000 },
  );
}

async function playFirstTour(page) {
  await page.getByRole('tab', { name: 'Flows', exact: true }).click();
  const options = page.locator('[data-site-tour-flow-option]');
  if ((await options.count()) > 0) {
    const first = options.first();
    const flowId = await first.getAttribute('data-site-tour-flow-option');
    await first.click();
    await page.waitForFunction(
      (id) =>
        [...document.querySelectorAll('[data-site-tour-flow-option]')].some(
          (candidate) =>
            candidate.getAttribute('data-site-tour-flow-option') === id &&
            candidate.getAttribute('aria-pressed') === 'true',
        ),
      flowId,
    );
  }

  await page.waitForFunction(
    () =>
      document
        .querySelector('[data-xploder-ready="true"]')
        ?.getAttribute('data-xploder-tour') === 'idle',
  );
  await page.locator('[data-site-tour-transport] button[aria-label="Start tour"]').click();
  await page.waitForFunction(
    () =>
      document
        .querySelector('[data-xploder-ready="true"]')
        ?.getAttribute('data-xploder-tour') === 'ended',
    undefined,
    { timeout: 120_000 },
  );
}

console.log(
  `# command: node event-log.mjs <repo> <baseUrl> | base: ${baseUrl} | chromium: ${browser.version()} | cpu: 1 | commit: ${commit}`,
);

try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  await installEventLog(page);

  try {
    await page.goto(`${baseUrl}/`);
    await page.locator('[data-xploder-ready="true"]').waitFor({ state: 'visible', timeout: 60_000 });
    await page.locator('[data-hero-phase="explode"]').waitFor({ timeout: 90_000 });
    const support = await page.evaluate(() => window.__s15EventLog.support);
    const clock = await page.evaluate(
      () => document.querySelector('[data-xploder-clock]') !== null,
    );
    console.log(
      support
        ? `# signals: events${clock ? ' + clock' : ''} + attributes (S15)`
        : clock
          ? '# signals: clock + attributes (events absent)'
          : '# signals: attributes (pre-S15)',
    );
    if (!support) {
      console.log('# events: none (pre-E5)');
      await context.close();
      await browser.close();
      process.exit(0);
    }
    console.log('# events: present (S15)');

    await page.waitForFunction(
      () =>
        document.querySelector('[data-hero-phase]')?.getAttribute('data-hero-phase') === 'turn',
      undefined,
      { timeout: 120_000 },
    );
    await page.waitForFunction(
      () =>
        document.querySelector('[data-hero-phase]')?.getAttribute('data-hero-phase') === 'implode',
      undefined,
      { timeout: 30_000 },
    );

    for (const project of ['websocket-inspector', 'jev-toolkit']) {
      await page.goto(`${baseUrl}/projects/${project}`);
      await page.locator('[data-site-control="explore-3d"]').click();
      await page.locator('[data-xploder-ready="true"]').waitFor({ state: 'visible', timeout: 60_000 });
      await page.locator('[data-xploder-state]').first().focus();
      await waitForSettled(page);

      await page.locator('[data-site-control="toggle"]').click();
      await waitForSettled(page);
      await page.locator('[data-site-control="toggle"]').click();
      await waitForSettled(page);
      await page.locator('[data-xploder-state]').first().focus();
      await page.keyboard.press('=');
      await waitForSettled(page);
      await page.locator('[data-xploder-state]').first().focus();
      await page.keyboard.press('ArrowRight');
      await waitForSettled(page);
      await playFirstTour(page);
    }

    const events = await page.evaluate(() => window.__s15EventLog.events);
    console.log('');
    console.log('| path | type | detail | at ms |');
    console.log('|---|---|---|---:|');
    for (const event of events) {
      console.log(
        `| ${event.path} | ${event.type} | ${JSON.stringify(event.detail)} | ${round(event.at)} |`,
      );
    }

    const paths = ['/', '/projects/websocket-inspector', '/projects/jev-toolkit'];
    const counts = [];
    let orderPass = true;
    for (const path of paths) {
      const routeEvents = events.filter((event) => event.path === path);
      const ready = routeEvents.filter((event) => event.type === 'ready');
      const settled = routeEvents.filter((event) => event.type === 'settled');
      const ended = routeEvents.filter((event) => event.type === 'tour-ended');
      if (ready.length !== 1 || routeEvents[0]?.type !== 'ready') orderPass = false;
      counts.push({
        path,
        ready: ready.length,
        settled: settled.length,
        tourEnded: ended.length,
        orderReadyFirst: routeEvents[0]?.type === 'ready',
      });
    }
    const home = counts.find((count) => count.path === '/');
    if (home?.tourEnded !== 2) orderPass = false;
    if (counts.filter((count) => count.path !== '/').some((count) => count.tourEnded !== 1)) {
      orderPass = false;
    }

    console.log('');
    console.log('| path | ready | settled | tour-ended | ready first |');
    console.log('|---|---:|---:|---:|---|');
    for (const count of counts) {
      console.log(
        `| ${count.path} | ${count.ready} | ${count.settled} | ${count.tourEnded} | ${count.orderReadyFirst ? 'yes' : 'no'} |`,
      );
    }
    console.log(`ORDER ${orderPass ? 'PASS' : 'FAIL'}`);
    console.log(`SUMMARY_JSON ${JSON.stringify({ counts, orderPass })}`);
  } finally {
    await context.close();
  }
} finally {
  await browser.close();
}
