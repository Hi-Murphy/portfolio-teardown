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
const drawMidMs = ms(motion.staggers.tourStep) + ms(motion.durations.tourPulse) / 2;
const SETTLED_STATES = new Set(['exploded', 'imploded']);

function round(value) {
  return Math.round(value * 10) / 10;
}

function installTrace() {
  const trace = {
    frames: [],
    events: [],
    eventSupport: false,
    clockSupport: false,
    lastClick: null,
  };
  window.__s15PauseTrace = trace;
  const labelSelector =
    '[data-xploder-label],[data-xploder-lettering-kind],[data-xploder-lettering-layer-label]';
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
  let lastStep = null;
  let lastAzimuth = null;
  new MutationObserver((records) => {
    for (const mutation of records) {
      if (mutation.type !== 'attributes') continue;
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
      if (mutation.attributeName === 'data-xploder-azimuth') {
        const value = target.getAttribute('data-xploder-azimuth');
        if (value !== null && value !== lastAzimuth) {
          lastAzimuth = value;
          record('azimuth', value);
        }
      }
    }
  }).observe(document, {
    subtree: true,
    attributes: true,
    attributeFilter: [
      'data-hero-phase',
      'data-hero-tour-step',
      'data-xploder-state',
      'data-xploder-clock',
      'data-xploder-azimuth',
    ],
  });

  const effectiveVisible = (element) => {
    if (element.getClientRects().length === 0) return false;
    let opacity = 1;
    let node = element;
    while (node instanceof Element) {
      const style = getComputedStyle(node);
      if (style.display === 'none' || style.visibility !== 'visible') return false;
      opacity *= Number(style.opacity);
      if (node === document.body) return opacity > 0.01;
      node = node.parentElement;
    }
    return false;
  };
  window.__s15EffectiveVisibleCount = () =>
    [...document.querySelectorAll(labelSelector)].filter(effectiveVisible).length;

  let previousVisible = 0;
  const frame = (t) => {
    const visibleLabels = window.__s15EffectiveVisibleCount();
    if (previousVisible === 0 && visibleLabels > 0) record('visible', 'revealed', { count: visibleLabels });
    previousVisible = visibleLabels;
    trace.frames.push({ t, visibleLabels });
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);

  window.addEventListener(
    'click',
    (event) => {
      if (!(event.target instanceof Element)) return;
      if (event.target.closest('[data-hero-loop-slot] button') === null) return;
      trace.lastClick = {
        at: performance.now(),
        phase: document.querySelector('[data-hero-phase]')?.getAttribute('data-hero-phase') ?? null,
      };
    },
    true,
  );
}

function installScheduledClick({ phase, offsetMs }) {
  let scheduled = false;
  const schedule = () => {
    const current = document.querySelector('[data-hero-phase]')?.getAttribute('data-hero-phase');
    if (scheduled || current !== phase) return;
    scheduled = true;
    const click = () => {
      const button = document.querySelector('[data-hero-loop-slot] button');
      if (button === null) {
        setTimeout(click, 16);
        return;
      }
      button.click();
    };
    setTimeout(click, offsetMs);
  };
  new MutationObserver(schedule).observe(document, {
    subtree: true,
    attributes: true,
    attributeFilter: ['data-hero-phase'],
  });
  schedule();
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
    { timeout: 120_000 },
  );
  const trace = await readTrace(page);
  return trace.events.find(
    (event) =>
      event.kind === kind && (value === null || event.value === value) && event.t >= after,
  );
}

async function waitForEventOffset(page, kind, value = null, offset = 0, after = -Infinity) {
  return await page.evaluate(
    ({ eventKind, eventValue, delayMs, minimum }) =>
      new Promise((resolveEvent) => {
        const tick = () => {
          const event = window.__s15PauseTrace.events.find(
            (candidate) =>
              candidate.kind === eventKind &&
              (eventValue === null || candidate.value === eventValue) &&
              candidate.t >= minimum,
          );
          if (event !== undefined && performance.now() >= event.t + delayMs) resolveEvent(event.t);
          else requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      }),
    { eventKind: kind, eventValue: value, delayMs: offset, minimum: after },
  );
}

async function clickControl(page) {
  const click = await page.evaluate(() => {
    const button = document.querySelector('[data-hero-loop-slot] button');
    if (button === null) throw new Error('hero pause/play control missing');
    window.__s15PauseTrace.lastClick = null;
    button.click();
    return window.__s15PauseTrace.lastClick;
  });
  if (click === null) throw new Error('pause/play click was not observed');
  return click;
}

function settleSignalsWhilePaused(trace, pauseAt, playAt) {
  const events = trace.events.filter((event) => event.t >= pauseAt && event.t < playAt);
  if (trace.eventSupport) {
    return events.filter((event) => event.kind === 'event' && event.value === 'settled').length;
  }
  return events.filter(
    (event) =>
      (event.kind === 'state' && SETTLED_STATES.has(event.value)) ||
      (event.kind === 'visible' && event.value === 'revealed'),
  ).length;
}

function nextSignal(trace, playAt) {
  return trace.events.find((event) => {
    if (event.t < playAt) return false;
    if (trace.eventSupport) return event.kind === 'event' && event.value === 'settled';
    return (
      (event.kind === 'state' && SETTLED_STATES.has(event.value)) ||
      (event.kind === 'visible' && event.value === 'revealed')
    );
  });
}

function resolvePlayMetrics(trace, result) {
  const nextSettle = nextSignal(trace, result.playAt);
  const nextPhase = trace.events.find(
    (event) => event.kind === 'phase' && event.t >= result.playAt,
  );
  return {
    ...result,
    playToSettleMs: nextSettle === undefined ? 'n/a' : round(nextSettle.t - result.playAt),
    playToNextPhaseMs: nextPhase === undefined ? 'n/a' : round(nextPhase.t - result.playAt),
  };
}

async function waitForNextSignal(page, playAt) {
  await page.waitForFunction(
    (minimum) =>
      window.__s15PauseTrace.events.some((event) => {
        if (event.t < minimum) return false;
        if (window.__s15PauseTrace.eventSupport) {
          return event.kind === 'event' && event.value === 'settled';
        }
        return (
          (event.kind === 'state' && (event.value === 'exploded' || event.value === 'imploded')) ||
          (event.kind === 'visible' && event.value === 'revealed')
        );
      }),
    playAt,
    { timeout: 15_000 },
  );
}

async function pauseAndMeasure(
  page,
  point,
  intendedPhase,
  viewport,
  cpu,
  targetTime,
  preClick = null,
  deferMetrics = false,
) {
  if (targetTime !== null) await waitUntil(page, targetTime);
  const click = preClick ?? (await clickControl(page));
  const pauseAt = click.at;
  const traceAtClick = await readTrace(page);
  const phaseEvent = traceAtClick.events
    .filter((event) => event.kind === 'phase' && event.t <= pauseAt)
    .at(-1);
  const phaseAtClick = phaseEvent?.value ?? click.phase;
  const msSincePhaseStart = phaseEvent === undefined ? 'n/a' : round(pauseAt - phaseEvent.t);
  const status = phaseAtClick === intendedPhase ? 'OK' : 'MISSED';
  console.log(
    `# ${point} ${viewport} x${cpu}: click at ${round(pauseAt)} ms, phase ${phaseAtClick ?? 'unknown'} +${msSincePhaseStart} ms (${status})`,
  );

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
  const signalCount = settleSignalsWhilePaused(beforePlay, pauseAt, Number.POSITIVE_INFINITY);
  const clockAt = beforePlay.events.find(
    (event) => event.kind === 'clock' && event.value === 'paused' && event.t >= pauseAt,
  )?.t;
  const freezeLatency = clockAt === undefined ? 'n/a' : round(clockAt - pauseAt);

  const play = await clickControl(page);
  const playAt = play.at;
  await page.evaluate(
    () =>
      new Promise((resolveFrame) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolveFrame())),
      ),
  );
  const afterPlay = bank('after-play', await hero.screenshot({ clip }));
  const decode = (file) => decodePng(file.bytes);
  const result = {
    point,
    intendedPhase,
    phaseAtClick,
    msSincePhaseStart,
    status,
    viewport,
    cpu,
    diffP1fP05: compareRgba(decode(p1f), decode(p05)),
    diffP05P3: compareRgba(decode(p05), decode(p3)),
    settlesWhilePaused: signalCount,
    freezeLatencyMs: freezeLatency,
    playToSettleMs: 'deferred',
    playToNextPhaseMs: 'deferred',
    firstFrameAfterPlayDiff: compareRgba(decode(p3), decode(afterPlay)),
    pausedMs: round(playAt - pauseAt),
    pauseAt,
    playAt,
  };
  if (deferMetrics) return result;

  await waitForNextSignal(page, playAt).catch(() => undefined);
  await page
    .waitForFunction(
      (minimum) =>
        window.__s15PauseTrace.events.some((event) => event.kind === 'phase' && event.t >= minimum),
      playAt,
      { timeout: 15_000 },
    )
    .catch(() => undefined);

  const after = await readTrace(page);
  return resolvePlayMetrics(after, result);
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

      const makePage = async () => {
        const page = await context.newPage();
        if (cpu > 1) {
          const cdp = await context.newCDPSession(page);
          await cdp.send('Emulation.setCPUThrottlingRate', { rate: cpu });
        }
        await page.addInitScript(installTrace);
        return page;
      };

      try {
        for (const offset of [50, 300, 600, 850]) {
          const point = `explode@${offset}`;
          if (!requested.has(point)) continue;
          const explodePage = await makePage();
          await explodePage.addInitScript(installScheduledClick, {
            phase: 'explode',
            offsetMs: offset,
          });
          await explodePage.goto(`${baseUrl}/`);
          await explodePage.locator('[data-hero-loop-slot] button').waitFor({ timeout: 60_000 });

          if (!signalLinePrinted) {
            const initial = await readTrace(explodePage);
            const hasClock = await explodePage.evaluate(
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
            console.log('# visibility: effective opacity (ancestor product)');
            signalLinePrinted = true;
          }

          await explodePage.waitForFunction(
            () => window.__s15PauseTrace.lastClick !== null,
            undefined,
            { timeout: 90_000 },
          );
          const click = await explodePage.evaluate(() => window.__s15PauseTrace.lastClick);
          const result = await pauseAndMeasure(
            explodePage,
            point,
            'explode',
            viewport,
            cpu,
            null,
            click,
          );
          results.push(result);
          await explodePage.close();
        }

        const sequentialPoints = [
          'zoomin-mid',
          'capture-mid-step',
          'capture-mid-draw',
          'inspect-mid-step',
          'turn-mid',
          'implode-mid',
        ];
        if (!sequentialPoints.some((point) => requested.has(point))) continue;

        const sequentialResults = [];
        const page = await makePage();
        await page.goto(`${baseUrl}/`);
        await page.locator('[data-hero-loop-slot] button').waitFor({ timeout: 60_000 });
        if (!signalLinePrinted) {
          const initial = await readTrace(page);
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
          console.log('# visibility: effective opacity (ancestor product)');
          signalLinePrinted = true;
        }
        const explodeStart = await waitForEvent(page, 'phase', 'explode');

        const zoomStart = requested.has('zoomin-mid')
          ? await waitForEventOffset(page, 'phase', 'zoomin', halfImplodeMs, explodeStart.t)
          : (await waitForEvent(page, 'phase', 'zoomin', explodeStart.t)).t;
        if (requested.has('zoomin-mid')) {
          const result = await pauseAndMeasure(
            page,
            'zoomin-mid',
            'zoomin',
            viewport,
            cpu,
            null,
            null,
            true,
          );
          results.push(result);
          sequentialResults.push(result);
        }

        const captureStart = await waitForEvent(page, 'phase', 'capture', zoomStart);
        let stepAfterPlay = null;
        if (requested.has('capture-mid-step')) {
          await waitForEventOffset(page, 'step', null, halfBeatMs, captureStart.t);
          const result = await pauseAndMeasure(
            page,
            'capture-mid-step',
            'capture',
            viewport,
            cpu,
            null,
            null,
            true,
          );
          stepAfterPlay = result.playAt;
          results.push(result);
          sequentialResults.push(result);
        }

        if (requested.has('capture-mid-draw')) {
          await waitForEventOffset(
            page,
            'step',
            null,
            drawMidMs,
            stepAfterPlay ?? captureStart.t,
          );
          const result = await pauseAndMeasure(
            page,
            'capture-mid-draw',
            'capture',
            viewport,
            cpu,
            null,
            null,
            true,
          );
          results.push(result);
          sequentialResults.push(result);
        }

        const inspectStart = await waitForEvent(page, 'phase', 'inspect', captureStart.t);
        if (requested.has('inspect-mid-step')) {
          await waitForEventOffset(page, 'step', null, halfBeatMs, inspectStart.t);
          const result = await pauseAndMeasure(
            page,
            'inspect-mid-step',
            'inspect',
            viewport,
            cpu,
            null,
            null,
            true,
          );
          results.push(result);
          sequentialResults.push(result);
        }

        const turnStart = await waitForEvent(page, 'phase', 'turn', inspectStart.t);
        if (requested.has('turn-mid')) {
          await waitForEventOffset(page, 'phase', 'turn', halfImplodeMs, inspectStart.t);
          const result = await pauseAndMeasure(
            page,
            'turn-mid',
            'turn',
            viewport,
            cpu,
            null,
            null,
            true,
          );
          results.push(result);
          sequentialResults.push(result);
        }

        if (requested.has('implode-mid')) {
          const secondImplode = await waitForEvent(page, 'phase', 'implode', turnStart.t);
          await waitForEventOffset(
            page,
            'phase',
            'implode',
            halfImplodeMs,
            secondImplode.t,
          );
          const result = await pauseAndMeasure(
            page,
            'implode-mid',
            'implode',
            viewport,
            cpu,
            null,
            null,
            true,
          );
          results.push(result);
          sequentialResults.push(result);
        }
        if (sequentialResults.length > 0) {
          const lastPlayAt = sequentialResults.at(-1).playAt;
          await page
            .waitForFunction(
              (minimum) =>
                window.__s15PauseTrace.events.some(
                  (event) => event.kind === 'phase' && event.t >= minimum,
                ),
              lastPlayAt,
              { timeout: 30_000 },
            )
            .catch(() => undefined);
          const finalTrace = await readTrace(page);
          for (const result of sequentialResults) {
            Object.assign(result, resolvePlayMetrics(finalTrace, result));
          }
        }
        await page.close();
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
  '| point | phase at click | ms since phase start | status | viewport | cpu | diff px +1f↔+0.5s | diff px +0.5s↔+3s | settles while paused | freeze latency ms | play→settle ms | play→next phase ms | first frame after play diff px |',
);
console.log('|---|---|---:|---|---|---:|---:|---:|---:|---:|---:|---:|---:|');
for (const result of results) {
  console.log(
    `| ${result.point} | ${result.phaseAtClick ?? 'unknown'} | ${result.msSincePhaseStart} | ${result.status} | ${result.viewport} | x${result.cpu} | ${result.diffP1fP05} | ${result.diffP05P3} | ${result.settlesWhilePaused} | ${result.freezeLatencyMs} | ${result.playToSettleMs} | ${result.playToNextPhaseMs} | ${result.firstFrameAfterPlayDiff} |`,
  );
}
console.log(
  `SUMMARY_JSON ${JSON.stringify(
    results.map(
      ({ pauseAt: _pauseAt, playAt: _playAt, pausedMs: _pausedMs, ...result }) => result,
    ),
  )}`,
);
