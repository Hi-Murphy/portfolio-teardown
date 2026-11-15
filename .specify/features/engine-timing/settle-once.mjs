import { execFileSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const positional = [];
const options = {};
for (let index = 2; index < process.argv.length; index += 1) {
  const argument = process.argv[index];
  if (!argument.startsWith('--')) {
    positional.push(argument);
    continue;
  }
  const name = argument.slice(2);
  const value = process.argv[index + 1];
  if (value === undefined || value.startsWith('--')) throw new Error(`missing value for --${name}`);
  options[name] = value;
  index += 1;
}

const [repoArg, baseUrlArg] = positional;
if (!repoArg || !baseUrlArg) {
  console.error('usage: node settle-once.mjs <repo> <baseUrl> [--cpu 4,6] [--out <dir>]');
  process.exit(2);
}

const repo = resolve(repoArg);
const baseUrl = baseUrlArg.replace(/\/$/, '');
const cpuProfiles = (options.cpu ?? '4,6').split(',').map(Number);
const outDir = resolve(options.out ?? '/tmp/s15-checks/settle-once');
const require = createRequire(resolve(repo, 'tools/perf/package.json'));
const { chromium } = require('playwright');
const { motion } = await import(
  pathToFileURL(resolve(repo, 'packages/xploder/src/motion/index.ts')).href
);
const browser = await chromium.launch();
const commit =
  process.env.S15_COMMIT ??
  execFileSync('git', ['-C', repo, 'rev-parse', '--short', 'HEAD'], {
    encoding: 'utf8',
  }).trim();

mkdirSync(outDir, { recursive: true });
const durationMs = {
  explode: motion.durations.explode * 1000,
  implode: motion.durations.implode * 1000,
  zoom: motion.durations.implode * 1000,
  turn: motion.durations.implode * 1000,
};

function round(value) {
  return Math.round(value * 10) / 10;
}

async function waitUntil(page, time) {
  await page.waitForFunction((target) => performance.now() >= target, time, { timeout: 30_000 });
}

async function beginMotion(page, kind, trigger) {
  await page.evaluate(
    ({ motionKind, waitFor }) => {
      window.__s15SettleTrace.motion = {
        kind: motionKind,
        awaiting: waitFor,
        actionAt: null,
      };
      window.__s15SettleTrace.events.length = 0;
    },
    { motionKind: kind, waitFor: trigger },
  );
}

async function actionAt(page, action, kind) {
  await action();
  await page.waitForFunction(() => window.__s15SettleTrace.motion?.actionAt !== null, undefined, {
    timeout: 10_000,
  });
  return await page.evaluate(() => {
    const value = window.__s15SettleTrace.motion.actionAt;
    window.__s15SettleTrace.motion.actionAt = value;
    return value;
  });
}

function firstStableFrame(frames, field, initial, start) {
  let changed = false;
  for (let index = 0; index < frames.length; index += 1) {
    const frame = frames[index];
    if (frame.t < start) continue;
    if (!changed && frame[field] !== initial) changed = true;
    if (changed && frame[field] === frames[index + 1]?.[field]) return frame;
  }
  return null;
}

function summarizeMotion(allFrames, trace, kind, start, end, targetState) {
  const before = allFrames.filter((frame) => frame.t < start).at(-1) ?? null;
  const frames = allFrames.filter((frame) => frame.t >= start && frame.t <= end);
  const events = trace.events.filter((event) => event.t >= start && event.t <= end);
  const initial = before;
  let settles;

  if (trace.eventSupport) {
    settles = events.filter((event) => event.kind === 'settled');
  } else if (kind === 'explode' || kind === 'implode') {
    const settle = frames.find((frame) => frame.state === targetState);
    settles = settle === undefined ? [] : [settle];
  } else {
    const settle =
      kind === 'zoom'
        ? firstStableFrame(frames, 'zoom', initial?.zoom, start)
        : firstStableFrame(frames, 'azimuth', initial?.azimuth, start);
    settles = settle === null ? [] : [settle];
  }

  let revealCount = 0;
  let previous = 0;
  let previousT = -Infinity;
  for (const frame of frames) {
    if (frame.t === previousT) continue;
    if (previous === 0 && frame.visibleLabels > 0) revealCount += 1;
    previous = frame.visibleLabels;
    previousT = frame.t;
  }

  return { settles, revealCount };
}

console.log(
  `# command: node settle-once.mjs <repo> <baseUrl> [--cpu ${cpuProfiles.join(',')}] | base: ${baseUrl} | chromium: ${browser.version()} | cpu: ${cpuProfiles.join(',')} | commit: ${commit}`,
);

const results = [];
let signalLinePrinted = false;
let tablePrinted = false;

try {
  for (const cpu of cpuProfiles) {
    for (const project of ['websocket-inspector', 'jev-toolkit']) {
      const route = `/projects/${project}`;
      const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
      const page = await context.newPage();

      try {
        if (cpu > 1) {
          const cdp = await context.newCDPSession(page);
          await cdp.send('Emulation.setCPUThrottlingRate', { rate: cpu });
        }

        await page.addInitScript(() => {
          const trace = { frames: [], events: [], eventSupport: false, motion: null };
          window.__s15SettleTrace = trace;
          const labelSelector =
            '[data-xploder-label],[data-xploder-lettering],[data-xploder-lettering-layer-label]';

          for (const name of ['xploder:ready', 'xploder:settled', 'xploder:tour-ended']) {
            document.addEventListener(
              name,
              (event) => {
                trace.eventSupport = true;
                trace.events.push({
                  t: performance.now(),
                  kind: name.slice('xploder:'.length),
                  detail: event instanceof CustomEvent ? event.detail : null,
                });
              },
              true,
            );
          }

          const visible = (element) => {
            const style = getComputedStyle(element);
            return (
              style.visibility !== 'hidden' &&
              style.display !== 'none' &&
              Number(style.opacity) > 0.01 &&
              element.getClientRects().length > 0
            );
          };
          const visibleCount = () =>
            [...document.querySelectorAll(labelSelector)].filter(visible).length;

          const frame = (t) => {
            const viewer = document.querySelector('[data-xploder-ready="true"]');
            trace.frames.push({
              t,
              visibleLabels: visibleCount(),
              state: viewer?.getAttribute('data-xploder-state') ?? null,
              zoom: viewer?.getAttribute('data-xploder-zoom') ?? null,
              azimuth: viewer?.getAttribute('data-xploder-azimuth') ?? null,
            });
            requestAnimationFrame(frame);
          };
          requestAnimationFrame(frame);

          window.addEventListener(
            'click',
            (event) => {
              if (trace.motion?.awaiting !== 'click') return;
              if (!(event.target instanceof Element)) return;
              if (event.target.closest('[data-site-control="toggle"]') === null) return;
              trace.motion.actionAt = performance.now();
            },
            true,
          );
          window.addEventListener(
            'keydown',
            (event) => {
              if (trace.motion?.awaiting !== 'key') return;
              const expected = trace.motion.kind === 'turn' ? 'ArrowRight' : '=';
              if (event.key !== expected) return;
              trace.motion.actionAt = performance.now();
            },
            true,
          );
        });

        await page.goto(`${baseUrl}${route}`);
        await page.locator('[data-site-control="explore-3d"]').click();
        await page.locator('[data-xploder-ready="true"]').waitFor({ state: 'visible', timeout: 60_000 });
        await page.locator('[data-xploder-state]').first().focus();
        await page.waitForTimeout(1000);

        const initial = await page.evaluate(() => window.__s15SettleTrace.eventSupport);
        if (!signalLinePrinted) {
          const clock = await page.evaluate(
            () => document.querySelector('[data-xploder-clock]') !== null,
          );
          console.log(
            initial
              ? `# signals: events${clock ? ' + clock' : ''} + attributes (S15)`
              : clock
                ? '# signals: clock + attributes (events absent)'
                : '# signals: attributes (pre-S15)',
          );
          signalLinePrinted = true;
        }
        if (!tablePrinted) {
          console.log(
            '| project | cpu | motion | settles | label reveals | visible labels at 25/50/75% | verdict |',
          );
          console.log('|---|---:|---|---:|---:|---|---|');
          tablePrinted = true;
        }

        const motions = [
          { kind: 'implode', trigger: 'click', target: 'imploded' },
          { kind: 'explode', trigger: 'click', target: 'exploded' },
          { kind: 'zoom', trigger: 'key', target: null },
          { kind: 'turn', trigger: 'key', target: null },
        ];

        for (const motion of motions) {
          await beginMotion(page, motion.kind, motion.trigger);
          const start = await actionAt(
            page,
            async () => {
              if (motion.trigger === 'click') {
                await page.locator('[data-site-control="toggle"]').click();
              } else {
                await page.locator('[data-xploder-state]').first().focus();
                await page.keyboard.press(motion.kind === 'turn' ? 'ArrowRight' : '=');
              }
            },
            motion.kind,
          );

          const duration = durationMs[motion.kind];
          const captures = [];
          for (const fraction of [0.25, 0.5, 0.75]) {
            await waitUntil(page, start + duration * fraction);
            const visibleLabels = await page.evaluate(() => {
              const selector =
                '[data-xploder-label],[data-xploder-lettering],[data-xploder-lettering-layer-label]';
              return [...document.querySelectorAll(selector)].filter((element) => {
                const style = getComputedStyle(element);
                return (
                  style.visibility !== 'hidden' &&
                  style.display !== 'none' &&
                  Number(style.opacity) > 0.01 &&
                  element.getClientRects().length > 0
                );
              }).length;
            });
            const percent = Math.round(fraction * 100);
            const path = resolve(
              outDir,
              `${project}-cpu${cpu}-${motion.kind}-${percent}.png`,
            );
            await page.locator('[data-xploder-ready="true"]').screenshot({ path });
            captures.push({ percent, visibleLabels });
          }

          await page.waitForFunction(
            ({ actionStart, expectedDuration }) => {
              const trace = window.__s15SettleTrace;
              if (trace.eventSupport && trace.events.some((event) => event.kind === 'settled' && event.t >= actionStart)) {
                return true;
              }
              return performance.now() >= actionStart + expectedDuration + 1000;
            },
            { actionStart: start, expectedDuration: duration },
            { timeout: 15_000 },
          );
          await page.waitForTimeout(300);

          const end = await page.evaluate(() => performance.now());
          const trace = await page.evaluate(() => window.__s15SettleTrace);
          const summary = summarizeMotion(trace.frames, trace, motion.kind, start, end, motion.target);
          const verdict =
            summary.settles.length === 1 &&
            summary.revealCount === 1 &&
            captures.every((capture) => capture.visibleLabels === 0)
              ? 'ONCE'
              : 'NOT-ONCE';
          results.push({
            project,
            cpu,
            motion: motion.kind,
            settleCount: summary.settles.length,
            revealCount: summary.revealCount,
            midVisibleLabels: captures.map((capture) => ({
              percent: capture.percent,
              visible: capture.visibleLabels,
            })),
            verdict,
          });
          console.log(
            `| ${project} | x${cpu} | ${motion.kind} | ${summary.settles.length} | ${summary.revealCount} | ${captures.map((capture) => `${capture.percent}%:${capture.visibleLabels}`).join(' ')} | ${verdict} |`,
          );
        }
      } finally {
        await context.close();
      }
    }
  }
} finally {
  await browser.close();
}

console.log(
  `SUMMARY_JSON ${JSON.stringify(results.map((result) => ({ ...result, cpu: `x${result.cpu}` })))}`,
);
