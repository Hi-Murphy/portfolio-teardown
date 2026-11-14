import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';

const TOLERANCE_MS = 1000 / 60;

function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[middle - 1] + sorted[middle]) / 2
    : sorted[middle];
}

function readRecords(path) {
  return readFileSync(path, 'utf8')
    .split('\n')
    .filter((line) => line.trimStart().startsWith('{'))
    .map((line) => JSON.parse(line));
}

function compare(baseFile, afterFile) {
  const base = readRecords(baseFile);
  const after = readRecords(afterFile);
  const projects = [...new Set([...base, ...after].map((record) => record.project))].sort();
  let pass = true;

  console.log('| project | boundary | base median (ms) | after median (ms) | delta (ms) | verdict |');
  console.log('|---|---:|---:|---:|---:|---|');

  for (const project of projects) {
    const baseRuns = base.filter((record) => record.project === project);
    const afterRuns = after.filter((record) => record.project === project);
    const count = Math.max(
      ...baseRuns.map((record) => record.boundariesMs.length),
      ...afterRuns.map((record) => record.boundariesMs.length),
    );

    for (let index = 0; index < count; index += 1) {
      const baseValues = baseRuns
        .map((record) => record.boundariesMs[index])
        .filter((value) => value !== undefined);
      const afterValues = afterRuns
        .map((record) => record.boundariesMs[index])
        .filter((value) => value !== undefined);
      const baseMedian = baseValues.length === 0 ? null : median(baseValues);
      const afterMedian = afterValues.length === 0 ? null : median(afterValues);
      const delta =
        baseMedian === null || afterMedian === null ? null : afterMedian - baseMedian;
      const cellPass = delta !== null && Math.abs(delta) <= TOLERANCE_MS;
      if (!cellPass) pass = false;

      const show = (value) => (value === null ? 'missing' : value.toFixed(2));
      console.log(
        `| ${project} | ${index + 1} | ${show(baseMedian)} | ${show(afterMedian)} | ${show(delta)} | ${cellPass ? 'PASS' : 'FAIL'} |`,
      );
    }
  }

  console.log(`VERDICT ${pass ? 'PASS' : 'FAIL'}`);
  process.exitCode = pass ? 0 : 1;
}

function round(value) {
  return Math.round(value * 1000) / 1000;
}

async function measure(repo, baseUrl) {
  const require = createRequire(resolve(repo, 'tools/perf/package.json'));
  const { chromium } = require('playwright');
  const browser = await chromium.launch();
  const commit =
    process.env.S14_COMMIT ??
    execFileSync('git', ['-C', repo, 'rev-parse', '--short', 'HEAD'], {
      encoding: 'utf8',
    }).trim();

  console.log(
    `# command: node tour-timing.mjs <repo> <baseUrl> | base: ${baseUrl} | chromium: ${browser.version()} | commit: ${commit}`,
  );

  try {
    for (const project of ['websocket-inspector', 'jev-toolkit']) {
      for (let run = 1; run <= 5; run += 1) {
        const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
        const page = await context.newPage();

        try {
          await page.goto(`${baseUrl}/projects/${project}`);
          await page.locator('[data-site-control="explore-3d"]').click();
          await page.locator('[data-xploder-ready="true"]').waitFor({ state: 'visible' });
          await page.getByRole('tab', { name: 'Flows', exact: true }).click();

          const options = page.locator('[data-site-tour-flow-option]');
          let flowId = null;
          if ((await options.count()) > 0) {
            const first = options.first();
            flowId = await first.getAttribute('data-site-tour-flow-option');
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
          } else if ((await page.locator('[data-site-tour-flow-header]').count()) !== 1) {
            throw new Error(`${project}: first flow has neither an option nor a single-flow header`);
          }

          await page.waitForFunction(
            () =>
              document
                .querySelector('[data-xploder-ready="true"]')
                ?.getAttribute('data-xploder-tour') === 'idle',
          );
          flowId ??= await page
            .locator('[data-xploder-ready="true"]')
            .getAttribute('data-xploder-tour-flow');

          await page.evaluate(() => {
            const viewer = document.querySelector('[data-xploder-ready="true"]');
            if (viewer === null) throw new Error('viewer missing');
            let previousStep = viewer.getAttribute('data-xploder-tour-step');
            const trace = { playAt: null, boundariesMs: [], endedAt: null };

            new MutationObserver((records) => {
              const now = performance.now();
              for (const record of records) {
                if (record.attributeName === 'data-xploder-tour-step') {
                  const step = viewer.getAttribute('data-xploder-tour-step');
                  if (step !== previousStep) {
                    previousStep = step;
                    if (trace.playAt !== null) trace.boundariesMs.push(now - trace.playAt);
                  }
                }
                if (
                  record.attributeName === 'data-xploder-tour' &&
                  viewer.getAttribute('data-xploder-tour') === 'ended' &&
                  trace.endedAt === null
                ) {
                  trace.endedAt = now;
                }
              }
            }).observe(viewer, {
              attributes: true,
              attributeFilter: ['data-xploder-tour', 'data-xploder-tour-step'],
            });

            const start = document.querySelector(
              '[data-site-tour-transport] button[aria-label="Start tour"]',
            );
            if (start === null) throw new Error('start control missing');
            start.addEventListener(
              'click',
              () => {
                trace.playAt = performance.now();
              },
              { once: true, capture: true },
            );
            window.__s14TourTrace = trace;
          });

          await page
            .locator('[data-site-tour-transport] button[aria-label="Start tour"]')
            .click();
          await page.waitForFunction(
            () =>
              document
                .querySelector('[data-xploder-ready="true"]')
                ?.getAttribute('data-xploder-tour') === 'ended',
            undefined,
            { timeout: 120_000 },
          );

          const trace = await page.evaluate(() => window.__s14TourTrace);
          if (trace.playAt === null || trace.endedAt === null || flowId === null) {
            throw new Error(`${project} run ${run}: incomplete tour trace`);
          }

          console.log(
            JSON.stringify({
              project,
              flow: flowId,
              run,
              boundariesMs: trace.boundariesMs.map(round),
              totalMs: round(trace.endedAt - trace.playAt),
            }),
          );
        } finally {
          await context.close();
        }
      }
    }
  } finally {
    await browser.close();
  }
}

if (process.argv[2] === '--compare') {
  if (process.argv.length !== 5) {
    console.error('usage: node tour-timing.mjs --compare <baseFile> <afterFile>');
    process.exit(2);
  }
  compare(process.argv[3], process.argv[4]);
} else {
  const [, , repo, baseUrl] = process.argv;
  if (!repo || !baseUrl) {
    console.error('usage: node tour-timing.mjs <repo> <baseUrl> | --compare <baseFile> <afterFile>');
    process.exit(2);
  }
  await measure(repo, baseUrl.replace(/\/$/, ''));
}
