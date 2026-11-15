import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
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
  console.error(
    'usage: node pause-freeze.mjs <repo> <baseUrl> [--cpu 1,4] [--viewports 1440x900,390x844] [--phases ...] [--out <dir>]',
  );
  process.exit(2);
}

const repo = resolve(repoArg);
const baseUrl = baseUrlArg.replace(/\/$/, '');
const cpuProfiles = (options.cpu ?? '1,4').split(',').map(Number);
const viewports = (options.viewports ?? '1440x900,390x844').split(',').map((value) => {
  const [width, height] = value.split('x').map(Number);
  return { width, height, mobile: width <= 500 };
});
const outDir = resolve(options.out ?? '/tmp/s15-checks/pause-freeze');
const allPhases = [
  'implode-mid',
  'explode@50',
  'explode@300',
  'explode@600',
  'explode@850',
  'zoomin-mid',
  'capture-mid-step',
  'capture-mid-draw',
  'inspect-mid-step',
  'turn-mid',
];
const requested = new Set((options.phases ?? allPhases.join(',')).split(',').filter(Boolean));
for (const phase of requested) {
  if (!allPhases.includes(phase)) throw new Error(`unknown phase: ${phase}`);
}

const require = createRequire(resolve(repo, 'tools/perf/package.json'));
const { chromium } = require('playwright');
const { motion } = await import(
  pathToFileURL(resolve(repo, 'packages/xploder/src/motion/index.ts')).href
);
const { compareRgba, decodePng } = await import(
  pathToFileURL(resolve(repo, 'tools/perf/src/png.ts')).href
);
const browser = await chromium.launch();
const commit =
  process.env.S15_COMMIT ??
  execFileSync('git', ['-C', repo, 'rev-parse', '--short', 'HEAD'], {
    encoding: 'utf8',
  }).trim();

mkdirSync(outDir, { recursive: true });

const ms = (seconds) => seconds * 1000;
const halfImplodeMs = ms(motion.durations.implode) / 2;
const halfBeatMs = ms(motion.durations.tourBeat) / 2;
const drawMidMs =
  ms(motion.staggers.tourStep) + ms(motion.durations.tourPulse) / 2;
const LABEL_SELECTOR =
  '[data-xploder-label],[data-xploder-lettering],[data-xploder-lettering-layer-label]';
const SETTLED_STATES = new Set(['exploded', 'imploded']);

function round(value) {
  return Math.round(value * 10) / 10;
}

function eventTime(trace, kind, value, after = -Infinity) {
  return (
    trace.events.find(
      (event) => event.kind === kind && event.value === value && event.t >= after,
    )?.t ?? null
  );
}

async function readTrace(page) {
  return await page.evaluate(() => window.__s15PauseTrace);
}

async function waitUntil(page, target) {
  await page.waitForFunction((time) => performance.now() >= time, target, { timeout: 30_000 });
}

async function waitForEvent(page, kind, value = null, after = -Infinity) {
  await page.waitForFunction(
    ({ eventKind, eventValue, minimum }) =>
      window.__s15PauseTrace.events.some(
        (event) =>
          event.kind === eventKind &&
          (eventValue === null || event.value === eventValue) &&
          event.t >= minimum,
      ),
    { eventKind: kind, eventValue: value, minimum: after },
    { timeout: 90_000 },
  );
  const trace = await readTrace(page);
  return trace.events.find(
    (event) =>
      event.kind === kind && (value === null || event.value === value) && event.t >= after,
  );
}

async function armClick(page) {
  await page.evaluate(() => {
    const button = document.querySelector('[data-hero-loop-slot] button');
    if (button === null) throw new Error('hero pause/play control missing');
    button.addEventListener(
      'click',
      () => {
        window.__s15PauseTrace.lastClickAt = performance.now();
      },
      { once: true, capture: true },
    );
  });
}

async function clickControl(page) {
  await armClick(page);
  await page.locator('[data-hero-loop-slot] button').click();
  return await page.evaluate(() => window.__s15PauseTrace.lastClickAt);
}

async function settleSignalsWhilePaused(trace, pauseAt, playAt) {
  const events = trace.events.filter((event) => event.t >= pauseAt && event.t < playAt);
  if (trace.eventSupport) {
    return events.filter((event) => event.kind === 'event' && event.value === 'settled').length;
  }
  return events.filter((event) => {
    if (event.kind === 'state') return SETTLED_STATES.has(event.value);
    if (event.kind === 'lettering') return event.value === 'shown';
    if (event.kind === 'labels') return event.added > 0;
    return false;
  }).length;
}

function nextSignal(trace, playAt) {
  return trace.events.find((event) => {
    if (event.t < playAt) return false;
    if (trace.eventSupport) return event.kind === 'event' && event.value === 'settled';
    if (event.kind === 'state') return SETTLED_STATES.has(event.value);
    if (event.kind === 'lettering') return event.value === 'shown';
    return event.kind === 'labels' && event.added > 0;
  });
}

async function pauseAndMeasure(page, point, viewport, cpu, targetTime, pausedMs) {
  console.log(`# ${point} ${viewport} x${cpu}: approaching ${round(targetTime)} ms active`);
  await waitUntil(page, targetTime);
  const pauseAt = await clickControl(page);
  if (pauseAt === null) throw new Error(`${point}: pause click was not observed`);

  const hero = page.locator('[data-hero-loop]');
  const clip = await hero.boundingBox();
  if (clip === null) throw new Error(`${point}: hero figure has no bounding box`);
  const baseName = `${point}-${viewport}-cpu${cpu}`;
  const bank = (suffix, bytes) => {
    const path = resolve(outDir, `${baseName}-${suffix}.png`);
    writeFileSync(path, bytes);
    return { bytes, path };
  };

  await page.evaluate(
    () =>
      new Promise((resolveFrame) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolveFrame())),
      ),
  );
  const p1f = bank('p1f', await hero.screenshot({ clip }));
  await waitUntil(page, pauseAt + 500);
  const p05 = bank('p05', await hero.screenshot({ clip }));
  await waitUntil(page, pauseAt + 3000);
  const p3 = bank('p3', await hero.screenshot({ clip }));

  const beforePlay = await readTrace(page);
  const signalCount = await settleSignalsWhilePaused(beforePlay, pauseAt, Number.POSITIVE_INFINITY);
  const clockAt = beforePlay.events.find(
    (event) => event.kind === 'clock' && event.value === 'paused' && event.t >= pauseAt,
  )?.t;
  const freezeLatency = clockAt === undefined ? 'n/a' : round(clockAt - pauseAt);

  const playAt = await clickControl(page);
  if (playAt === null) throw new Error(`${point}: play click was not observed`);
  await page.evaluate(
    () =>
      new Promise((resolveFrame) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolveFrame())),
      ),
  );
  const afterPlay = bank('after-play', await hero.screenshot({ clip }));

  await page
    .waitForFunction(
      ({ minimum }) =>
        window.__s15PauseTrace.events.some((event) => {
          if (event.t < minimum) return false;
          if (window.__s15PauseTrace.eventSupport) {
            return event.kind === 'event' && event.value === 'settled';
          }
          if (event.kind === 'state') {
            return event.value === 'exploded' || event.value === 'imploded';
          }
          if (event.kind === 'lettering') return event.value === 'shown';
          return event.kind === 'labels' && event.added > 0;
        }),
      { minimum: playAt },
      { timeout: 15_000 },
    )
    .catch(() => undefined);
  await page
    .waitForFunction(
      (minimum) =>
        window.__s15PauseTrace.events.some(
          (event) => event.kind === 'phase' && event.t >= minimum,
        ),
      playAt,
      { timeout: 15_000 },
    )
    .catch(() => undefined);

  const after = await readTrace(page);
  const nextSettle = nextSignal(after, playAt);
  const nextPhase = after.events.find((event) => event.kind === 'phase' && event.t >= playAt);
  const decode = (file) => decodePng(file.bytes);
  const result = {
    point,
    viewport,
    cpu,
    diffP1fP05: compareRgba(decode(p1f), decode(p05)),
    diffP05P3: compareRgba(decode(p05), decode(p3)),
    settlesWhilePaused: signalCount,
    freezeLatencyMs: freezeLatency,
    playToSettleMs: nextSettle === undefined ? 'n/a' : round(nextSettle.t - playAt),
    playToNextPhaseMs: nextPhase === undefined ? 'n/a' : round(nextPhase.t - playAt),
    firstFrameAfterPlayDiff: compareRgba(decode(p3), decode(afterPlay)),
    pausedMs: round(playAt - pauseAt),
    pauseAt,
    playAt,
  };
  return result;
}

console.log(
  `# command: node pause-freeze.mjs <repo> <baseUrl> [--cpu ${cpuProfiles.join(',')}] [--viewports ${viewports.map(({ width, height }) => `${width}x${height}`).join(',')}] | base: ${baseUrl} | chromium: ${browser.version()} | cpu: ${cpuProfiles.join(',')} | commit: ${commit}`,
);

const results = [];
let signalLinePrinted = false;

try {
  for (const { width, height, mobile } of viewports) {
    const viewport = `${width}x${height}`;
    for (const cpu of cpuProfiles) {
      const context = await browser.newContext({
        viewport: { width, height },
        isMobile: mobile,
        hasTouch: mobile,
      });
      const page = await context.newPage();

      try {
        if (cpu > 1) {
          const cdp = await context.newCDPSession(page);
          await cdp.send('Emulation.setCPUThrottlingRate', { rate: cpu });
        }

        await page.addInitScript(({ labelSelector }) => {
          const trace = {
            events: [],
            eventSupport: false,
            clockSupport: false,
            lastClickAt: null,
          };
          window.__s15PauseTrace = trace;
          const record = (kind, value, extra = {}) => {
            trace.events.push({ t: performance.now(), kind, value, ...extra });
          };

          for (const name of ['xploder:ready', 'xploder:settled', 'xploder:tour-ended']) {
            document.addEventListener(
              name,
              (event) => {
                trace.eventSupport = true;
                record('event', name.slice('xploder:'.length), {
                  detail: event instanceof CustomEvent ? event.detail : null,
                });
              },
              true,
            );
          }

          let lastPhase = null;
          let lastState = null;
          let lastClock = null;
          let lastLettering = null;
          let lastStep = null;
          let lastAzimuth = null;
          new MutationObserver((records) => {
            for (const mutation of records) {
              if (mutation.type === 'attributes') {
                const target = mutation.target;
                if (mutation.attributeName === 'data-hero-phase') {
                  const value = target.getAttribute('data-hero-phase');
                  if (value !== null && value !== lastPhase) {
                    lastPhase = value;
                    record('phase', value);
                  }
                }
                if (mutation.attributeName === 'data-hero-tour-step') {
                  const value = target.getAttribute('data-hero-tour-step');
                  if (value !== null && value !== lastStep) {
                    lastStep = value;
                    record('step', value);
                  }
                }
                if (mutation.attributeName === 'data-xploder-state') {
                  const value = target.getAttribute('data-xploder-state');
                  if (value !== null && value !== lastState) {
                    lastState = value;
                    record('state', value);
                  }
                }
                if (mutation.attributeName === 'data-xploder-clock') {
                  const value = target.getAttribute('data-xploder-clock');
                  if (value !== null && value !== lastClock) {
                    trace.clockSupport = true;
                    lastClock = value;
                    record('clock', value);
                  }
                }
                if (mutation.attributeName === 'data-xploder-lettering') {
                  const value = target.getAttribute('data-xploder-lettering');
                  if (value !== null && value !== lastLettering) {
                    lastLettering = value;
                    record('lettering', value);
                  }
                }
                if (mutation.attributeName === 'data-xploder-azimuth') {
                  const value = target.getAttribute('data-xploder-azimuth');
                  if (value !== null && value !== lastAzimuth) {
                    lastAzimuth = value;
                    record('azimuth', value);
                  }
                }
              }

              let added = 0;
              for (const node of mutation.addedNodes) {
                if (!(node instanceof Element)) continue;
                added += node.matches(labelSelector) ? 1 : node.querySelectorAll(labelSelector).length;
              }
              if (added > 0) record('labels', '+', { added });
            }
          }).observe(document, {
            subtree: true,
            attributes: true,
            childList: true,
            attributeFilter: [
              'data-hero-phase',
              'data-hero-tour-step',
              'data-xploder-state',
              'data-xploder-clock',
              'data-xploder-lettering',
              'data-xploder-azimuth',
            ],
          });
        }, { labelSelector: LABEL_SELECTOR });

        await page.goto(`${baseUrl}/`);
        await page.locator('[data-hero-loop-slot] button').waitFor({ timeout: 60_000 });
        await page.locator('[data-hero-phase="explode"]').waitFor({ timeout: 90_000 });
        const initial = await readTrace(page);
        if (!signalLinePrinted) {
          const hasClock = await page.evaluate(
            () => document.querySelector('[data-xploder-clock]') !== null,
          );
          const clock = initial.clockSupport || hasClock;
          console.log(
            initial.eventSupport
              ? `# signals: events${clock ? ' + clock' : ''} + attributes (S15)`
              : clock
                ? '# signals: clock + attributes (events absent)'
                : '# signals: attributes (pre-S15)',
          );
          signalLinePrinted = true;
        }

        let pausedMs = 0;
        let phaseStart = eventTime(initial, 'phase', 'explode');
        if (phaseStart === null) throw new Error('explode phase start was not observed');

        for (const offset of [50, 300, 600, 850]) {
          const point = `explode@${offset}`;
          if (!requested.has(point)) continue;
          const target = phaseStart + offset + pausedMs;
          const result = await pauseAndMeasure(page, point, viewport, cpu, target, pausedMs);
          pausedMs += result.pausedMs;
          results.push(result);
        }

        const zoomStart = await waitForEvent(page, 'phase', 'zoomin', phaseStart);
        if (requested.has('zoomin-mid')) {
          const result = await pauseAndMeasure(
            page,
            'zoomin-mid',
            viewport,
            cpu,
            zoomStart.t + halfImplodeMs + pausedMs,
            pausedMs,
          );
          pausedMs += result.pausedMs;
          results.push(result);
        }

        const captureStart = await waitForEvent(page, 'phase', 'capture', zoomStart.t);
        let lastStep = null;
        if (requested.has('capture-mid-step')) {
          const step = await waitForEvent(page, 'step', null, captureStart.t);
          lastStep = step.t;
          const result = await pauseAndMeasure(
            page,
            'capture-mid-step',
            viewport,
            cpu,
            step.t + halfBeatMs + pausedMs,
            pausedMs,
          );
          pausedMs += result.pausedMs;
          results.push(result);
        }

        if (requested.has('capture-mid-draw')) {
          const step = await waitForEvent(page, 'step', null, lastStep ?? captureStart.t);
          const result = await pauseAndMeasure(
            page,
            'capture-mid-draw',
            viewport,
            cpu,
            step.t + drawMidMs + pausedMs,
            pausedMs,
          );
          pausedMs += result.pausedMs;
          results.push(result);
        }

        const inspectStart = await waitForEvent(page, 'phase', 'inspect', captureStart.t);
        if (requested.has('inspect-mid-step')) {
          const step = await waitForEvent(page, 'step', null, inspectStart.t);
          const result = await pauseAndMeasure(
            page,
            'inspect-mid-step',
            viewport,
            cpu,
            step.t + halfBeatMs + pausedMs,
            pausedMs,
          );
          pausedMs += result.pausedMs;
          results.push(result);
        }

        const turnStart = await waitForEvent(page, 'phase', 'turn', inspectStart.t);
        if (requested.has('turn-mid')) {
          const turnTrace = await readTrace(page);
          const firstAzimuth = turnTrace.events.find(
            (event) => event.kind === 'azimuth' && event.t >= turnStart.t,
          );
          if (firstAzimuth === undefined) throw new Error('turn azimuth change was not observed');
          const result = await pauseAndMeasure(
            page,
            'turn-mid',
            viewport,
            cpu,
            firstAzimuth.t + halfImplodeMs + pausedMs,
            pausedMs,
          );
          pausedMs += result.pausedMs;
          results.push(result);
        }

        if (requested.has('implode-mid')) {
          const secondImplode = await waitForEvent(page, 'phase', 'implode', turnStart.t);
          const result = await pauseAndMeasure(
            page,
            'implode-mid',
            viewport,
            cpu,
            secondImplode.t + halfImplodeMs + pausedMs,
            pausedMs,
          );
          results.push(result);
        }
      } finally {
        await context.close();
      }
    }
  }
} finally {
  await browser.close();
}

console.log('');
console.log(
  '| point | viewport | cpu | diff px +1f↔+0.5s | diff px +0.5s↔+3s | settles while paused | freeze latency ms | play→settle ms | play→next phase ms | first frame after play diff px |',
);
console.log('|---|---|---:|---:|---:|---:|---:|---:|---:|---:|');
for (const result of results) {
  console.log(
    `| ${result.point} | ${result.viewport} | x${result.cpu} | ${result.diffP1fP05} | ${result.diffP05P3} | ${result.settlesWhilePaused} | ${result.freezeLatencyMs} | ${result.playToSettleMs} | ${result.playToNextPhaseMs} | ${result.firstFrameAfterPlayDiff} |`,
  );
}
console.log(
  `SUMMARY_JSON ${JSON.stringify(
    results.map(({ pauseAt: _pauseAt, playAt: _playAt, pausedMs: _pausedMs, ...result }) => result),
  )}`,
);
