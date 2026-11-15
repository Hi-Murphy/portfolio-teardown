import { execFileSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const [, , repoArg, baseUrlArg, screenshotArg = '/tmp/s14-checks/pause-frames'] = process.argv;
if (!repoArg || !baseUrlArg) {
  console.error('usage: node pause-events.mjs <repo> <baseUrl> [screenshotDir]');
  process.exit(2);
}

const repo = resolve(repoArg);
const baseUrl = baseUrlArg.replace(/\/$/, '');
const screenshotDir = resolve(screenshotArg);
const require = createRequire(resolve(repo, 'tools/perf/package.json'));
const { HERO_STORYBOARD_MS } = await import(
  pathToFileURL(resolve(repo, 'apps/web/components/hero/hero-loop.ts')).href
);
const { chromium } = require('playwright');
const browser = await chromium.launch();
const commit =
  process.env.S14_COMMIT ??
  execFileSync('git', ['-C', repo, 'rev-parse', '--short', 'HEAD'], {
    encoding: 'utf8',
  }).trim();

mkdirSync(screenshotDir, { recursive: true });

function round(value) {
  return Math.round(value * 10) / 10;
}

async function waitUntil(page, time) {
  await page.waitForFunction((target) => performance.now() >= target, time);
}

console.log(
  `# command: node pause-events.mjs <repo> <baseUrl> [screenshotDir] | base: ${baseUrl} | chromium: ${browser.version()} | commit: ${commit}`,
);
console.log(
  '| width | offset | cpu | midExplode | stateSettles | labelBatches | expectedRemainingMs | resumeToNextPhaseMs | resumeDeltaMs | frameEqual |',
);
console.log('|---|---:|---:|---|---:|---:|---:|---:|---:|---|');

try {
  let firstCell = true;
  const results = [];
  for (const [width, height, mobile] of [
    [1440, 900, false],
    [390, 844, true],
  ]) {
    for (const offset of [50, 300, 600, 850]) {
      for (const cpu of [1, 4]) {
        const context = await browser.newContext({
          viewport: { width, height },
          isMobile: mobile,
          hasTouch: mobile,
        });
        const page = await context.newPage();

        try {
          if (cpu > 1) {
            const session = await context.newCDPSession(page);
            await session.send('Emulation.setCPUThrottlingRate', { rate: cpu });
          }

          await page.addInitScript(() => {
            const trace = { events: [], pauseAt: null, playAt: null };
            let lastState = null;
            let lastPhase = null;
            window.__s14PauseTrace = trace;

            new MutationObserver((records) => {
              const now = performance.now();
              let added = 0;
              let removed = 0;

              for (const record of records) {
                if (record.type === 'attributes') {
                  if (record.attributeName === 'data-xploder-state') {
                    const state = record.target.getAttribute('data-xploder-state');
                    if (state !== lastState) {
                      lastState = state;
                      trace.events.push({ t: now, kind: 'state', value: state });
                    }
                  }
                  if (record.attributeName === 'data-hero-phase') {
                    const phase = record.target.getAttribute('data-hero-phase');
                    if (phase !== lastPhase) {
                      lastPhase = phase;
                      trace.events.push({ t: now, kind: 'phase', value: phase });
                    }
                  }
                }
                for (const node of record.addedNodes) {
                  if (!(node instanceof Element)) continue;
                  const selector =
                    '[data-xploder-label],[data-xploder-lettering],[data-xploder-lettering-layer-label]';
                  added += node.matches(selector) ? 1 : node.querySelectorAll(selector).length;
                }
                for (const node of record.removedNodes) {
                  if (!(node instanceof Element)) continue;
                  const selector =
                    '[data-xploder-label],[data-xploder-lettering],[data-xploder-lettering-layer-label]';
                  removed += node.matches(selector) ? 1 : node.querySelectorAll(selector).length;
                }
              }

              if (added > 0 || removed > 0) {
                trace.events.push({ t: now, kind: 'labels', value: `+${added}-${removed}` });
              }
            }).observe(document, {
              subtree: true,
              attributes: true,
              childList: true,
              attributeFilter: [
                'data-xploder-state',
                'data-hero-phase',
                'data-hero-loop',
                'data-xploder-zoom',
              ],
            });
          });

          await page.goto(`${baseUrl}/`);
          await page.locator('[data-hero-phase="explode"]').waitFor({ timeout: 60_000 });
          await page.waitForTimeout(offset);
          await page.evaluate(() => {
            const pause = [...document.querySelectorAll('button')].find((button) =>
              /pause/i.test(button.getAttribute('aria-label') ?? ''),
            );
            if (pause === undefined) throw new Error('pause control missing');
            pause.addEventListener(
              'click',
              () => {
                window.__s14PauseTrace.pauseAt = performance.now();
              },
              { once: true, capture: true },
            );
          });
          await page.getByRole('button', { name: /pause/i }).click();
          const pauseAt = await page.evaluate(() => window.__s14PauseTrace.pauseAt);
          if (pauseAt === null) throw new Error('pause click was not observed');

          const hero = page.locator('[data-home-section="hero"]');
          if (firstCell) {
            await waitUntil(page, pauseAt + 500);
            await hero.screenshot({ path: resolve(screenshotDir, 'pause-500.png') });
            await waitUntil(page, pauseAt + 1500);
            await hero.screenshot({ path: resolve(screenshotDir, 'pause-1500.png') });
            await waitUntil(page, pauseAt + 3500);
            await hero.screenshot({ path: resolve(screenshotDir, 'pause-3500.png') });
          }

          await waitUntil(page, pauseAt + 2000);
          const frameA = await hero.screenshot();
          await waitUntil(page, pauseAt + 4500);
          const frameB = await hero.screenshot();
          const frameEqual = frameA.equals(frameB);

          await waitUntil(page, pauseAt + 5000);
          await page.evaluate(() => {
            const play = [...document.querySelectorAll('button')].find((button) =>
              /play/i.test(button.getAttribute('aria-label') ?? ''),
            );
            if (play === undefined) throw new Error('play control missing');
            play.addEventListener(
              'click',
              () => {
                window.__s14PauseTrace.playAt = performance.now();
              },
              { once: true, capture: true },
            );
          });
          await page.getByRole('button', { name: /play/i }).click();
          const playAt = await page.evaluate(() => window.__s14PauseTrace.playAt);
          if (playAt === null) throw new Error('play click was not observed');

          await page.locator('[data-hero-phase="capture"]').waitFor({ timeout: 30_000 });
          const events = await page.evaluate(() => window.__s14PauseTrace.events);
          const paused = events.filter((event) => event.t >= pauseAt && event.t < playAt);
          const stateSettles = paused.filter(
            (event) => event.kind === 'state' && event.value === 'exploded',
          ).length;
          const labelBatches = paused.filter(
            (event) => event.kind === 'labels' && /^\+[1-9]/.test(event.value),
          ).length;
          const nextPhase = events.find((event) => event.t >= playAt && event.kind === 'phase');
          const resumeToNextPhaseMs =
            nextPhase === undefined ? null : round(nextPhase.t - playAt);
          const explodePhase = events.find(
            (event) => event.kind === 'phase' && event.value === 'explode',
          );
          if (explodePhase === undefined) throw new Error('explode phase start was not observed');
          if (resumeToNextPhaseMs === null) throw new Error('next phase was not observed');
          const stateAtPause =
            events
              .filter((event) => event.kind === 'state' && event.t <= pauseAt)
              .at(-1)?.value ?? null;
          const midExplode = stateAtPause !== 'exploded';
          const expectedRemainingMs = round(
            HERO_STORYBOARD_MS.explode - (pauseAt - explodePhase.t),
          );
          const resumeDeltaMs = round(resumeToNextPhaseMs - expectedRemainingMs);
          results.push({ frameEqual, midExplode, resumeDeltaMs, stateSettles });

          console.log(
            `| ${width}x${height} | ${offset} | x${cpu} | ${midExplode} | ${stateSettles} | ${labelBatches} | ${expectedRemainingMs} | ${resumeToNextPhaseMs} | ${resumeDeltaMs} | ${frameEqual} |`,
          );
        } finally {
          await context.close();
        }

        firstCell = false;
      }
    }
  }

  const midExplodeCells = results.filter((result) => result.midExplode);
  const maxResumeDeltaMs = round(
    Math.max(...results.map((result) => Math.abs(result.resumeDeltaMs))),
  );
  const yesNo = (value) => (value ? 'yes' : 'no');
  console.log('');
  console.log(
    `settle count = 1 in every mid-explode cell: ${yesNo(midExplodeCells.every((result) => result.stateSettles === 1))}`,
  );
  console.log(
    `frames equal while paused in every cell: ${yesNo(results.every((result) => result.frameEqual))}`,
  );
  console.log(
    `max |resumeDeltaMs| over cells: ${maxResumeDeltaMs} ms (one frame = 16.7 ms)`,
  );
} finally {
  await browser.close();
}
