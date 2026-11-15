import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const argv = process.argv.slice(2);
const decideIndex = argv.indexOf('--decide');
const options = {};
const positional = [];
for (let index = 0; index < argv.length; index += 1) {
  const argument = argv[index];
  if (argument === '--decide') continue;
  if (!argument.startsWith('--')) {
    positional.push(argument);
    continue;
  }
  const name = argument.slice(2);
  const value = argv[index + 1];
  if (value === undefined || value.startsWith('--')) throw new Error(`missing value for --${name}`);
  options[name] = value;
  index += 1;
}

function median(values) {
  if (values.length === 0) return null;
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[middle - 1] + sorted[middle]) / 2
    : sorted[middle];
}

function p95(values) {
  if (values.length === 0) return null;
  const sorted = [...values].sort((left, right) => left - right);
  return sorted[Math.max(0, Math.ceil(sorted.length * 0.95) - 1)];
}

function round(value) {
  return value === null ? null : Math.round(value * 10) / 10;
}

if (decideIndex >= 0) {
  const timingFile = argv[decideIndex + 1];
  if (timingFile === undefined || timingFile.startsWith('--')) {
    console.error('usage: node settle-timing.mjs --decide <timingFile> --cpu 4 --threshold-ms 50');
    process.exit(2);
  }
  const cpu = Number(options.cpu ?? 4);
  const threshold = Number(options['threshold-ms'] ?? 50);
  const text = readFileSync(resolve(timingFile), 'utf8');
  const line = text.split('\n').findLast((candidate) => candidate.startsWith('SUMMARY_JSON '));
  if (line === undefined) throw new Error(`${timingFile}: SUMMARY_JSON missing`);
  const summary = JSON.parse(line.slice('SUMMARY_JSON '.length));
  const cells = (summary.cells ?? []).filter((cell) => Number(cell.cpu) === cpu);
  const medians = new Map();
  for (const cell of cells) {
    if (!medians.has(cell.project)) medians.set(cell.project, []);
    if (cell.settleDelay?.median !== null && cell.settleDelay?.median !== undefined) {
      medians.get(cell.project).push(cell.settleDelay.median);
    }
  }

  let cache = false;
  for (const [project, values] of medians) {
    const projectMedian = median(values);
    if (projectMedian !== null && projectMedian > threshold) cache = true;
    console.log(
      `${project}: ${projectMedian === null ? 'missing' : projectMedian.toFixed(1)} ms median settle delay at CPU x${cpu}`,
    );
  }
  console.log(`rule: cache iff any project median > ${threshold.toFixed(1)} ms`);
  console.log(`DECISION ${cache ? 'CACHE' : 'NO-CACHE'}`);
  process.exit(0);
}

const [repoArg, baseUrlArg] = positional;
if (!repoArg || !baseUrlArg) {
  console.error(
    'usage: node settle-timing.mjs <repo> <baseUrl> [--cpu 1,4,6] [--runs 10] | --decide <timingFile> --cpu 4 --threshold-ms 50',
  );
  process.exit(2);
}

const repo = resolve(repoArg);
const baseUrl = baseUrlArg.replace(/\/$/, '');
const cpuProfiles = (options.cpu ?? '1,4,6').split(',').map(Number);
const runs = Number(options.runs ?? 10);
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

const durations = {
  explode: motion.durations.explode * 1000,
  zoom: motion.durations.implode * 1000,
  turn: motion.durations.implode * 1000,
};

async function prepareMotion(page, kind) {
  if (kind === 'explode') {
    const state = await page.locator('[data-xploder-ready="true"]').getAttribute('data-xploder-state');
    if (state !== 'imploded') {
      await page.locator('[data-site-control="toggle"]').click();
      await page.waitForFunction(
        () =>
          document.querySelector('[data-xploder-ready="true"]')?.getAttribute('data-xploder-state') ===
          'imploded',
        undefined,
        { timeout: 10_000 },
      );
      await page.waitForTimeout(500);
    }
  }
  if (kind === 'zoom') {
    await page.locator('[data-xploder-state]').first().focus();
    await page.keyboard.press('0');
    await page.waitForTimeout(1200);
  }
  await page.locator('[data-xploder-state]').first().focus();
}

async function triggerMotion(page, kind) {
  if (kind === 'explode') {
    await page.locator('[data-site-control="toggle"]').click();
    return;
  }
  await page.locator('[data-xploder-state]').first().focus();
  if (kind === 'zoom') {
    for (let press = 0; press < 3; press += 1) await page.keyboard.press('=');
  } else {
    await page.keyboard.press('ArrowRight');
  }
}

function samplesBetween(profile, startUs, endUs) {
  const nodes = new Map(profile.nodes.map((node) => [node.id, node]));
  const samples = profile.samples ?? [];
  const deltas = profile.timeDeltas ?? [];
  const output = [];
  let timeUs = profile.startTime;
  for (let index = 0; index < samples.length; index += 1) {
    const delta = deltas[index];
    if (!Number.isFinite(delta) || delta < 0) continue;
    const sampleStart = timeUs;
    const sampleEnd = timeUs + delta;
    timeUs = sampleEnd;
    const overlap = Math.min(sampleEnd, endUs) - Math.max(sampleStart, startUs);
    if (overlap <= 0) continue;
    const node = nodes.get(samples[index]);
    if (node === undefined) continue;
    output.push({ node, overlapUs: overlap });
  }
  return output;
}

function frameContaining(frames, timeMs) {
  for (let index = 0; index < frames.length; index += 1) {
    const frame = frames[index];
    const next = frames[index + 1];
    if (timeMs >= frame.t && (next === undefined || timeMs < next.t)) return frame;
  }
  return frames.find((frame) => frame.t >= timeMs) ?? null;
}

console.log(
  `# command: node settle-timing.mjs <repo> <baseUrl> [--cpu ${cpuProfiles.join(',')}] [--runs ${runs}] | base: ${baseUrl} | chromium: ${browser.version()} | cpu: ${cpuProfiles.join(',')} | commit: ${commit}`,
);
console.log('# viewport: 412x823 DPR 1.75, hasTouch, isMobile');

const cells = [];
let sawPlacementSamples = false;
let signalLinePrinted = false;
let tablePrinted = false;

try {
  for (const cpu of cpuProfiles) {
    for (const project of ['websocket-inspector', 'jev-toolkit']) {
      const context = await browser.newContext({
        viewport: { width: 412, height: 823 },
        deviceScaleFactor: 1.75,
        isMobile: true,
        hasTouch: true,
      });
      const page = await context.newPage();
      const cdp = await context.newCDPSession(page);
      if (cpu > 1) await cdp.send('Emulation.setCPUThrottlingRate', { rate: cpu });

      try {
        await page.addInitScript(() => {
          const trace = {
            frames: [],
            events: [],
            support: false,
            actionAt: null,
            pendingKind: null,
            labelVisibleAt: null,
          };
          window.__s15TimingTrace = trace;
          const labelSelector =
            '[data-xploder-label],[data-xploder-lettering],[data-xploder-lettering-layer-label]';

          for (const name of ['xploder:ready', 'xploder:settled', 'xploder:tour-ended']) {
            document.addEventListener(
              name,
              (event) => {
                trace.support = true;
                trace.events.push({
                  t: performance.now(),
                  kind: name.slice('xploder:'.length),
                  detail: event instanceof CustomEvent ? event.detail : null,
                });
              },
              true,
            );
          }

          let previousVisible = 0;
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
            const visibleLabels = visibleCount();
            if (previousVisible === 0 && visibleLabels > 0 && trace.labelVisibleAt === null) {
              trace.labelVisibleAt = t;
            }
            previousVisible = visibleLabels;
            trace.frames.push({
              t,
              visibleLabels,
              state: viewer?.getAttribute('data-xploder-state') ?? null,
              zoom: viewer?.getAttribute('data-xploder-zoom') ?? null,
              azimuth: viewer?.getAttribute('data-xploder-azimuth') ?? null,
            });
            requestAnimationFrame(frame);
          };
          requestAnimationFrame(frame);

          new MutationObserver((records) => {
            for (const record of records) {
              if (record.type !== 'attributes') continue;
              if (
                record.attributeName === 'data-xploder-lettering' &&
                record.target.getAttribute('data-xploder-lettering') === 'shown' &&
                trace.labelVisibleAt === null
              ) {
                trace.labelVisibleAt = performance.now();
              }
            }
            for (const record of records) {
              for (const node of record.addedNodes) {
                if (!(node instanceof Element)) continue;
                if (node.matches(labelSelector) || node.querySelector(labelSelector) !== null) {
                  if (trace.labelVisibleAt === null) trace.labelVisibleAt = performance.now();
                }
              }
            }
          }).observe(document, {
            subtree: true,
            attributes: true,
            childList: true,
            attributeFilter: ['data-xploder-lettering'],
          });

          window.addEventListener(
            'click',
            (event) => {
              if (trace.pendingKind !== 'explode') return;
              if (!(event.target instanceof Element)) return;
              if (event.target.closest('[data-site-control="toggle"]') === null) return;
              trace.actionAt = performance.now();
            },
            true,
          );
          window.addEventListener(
            'keydown',
            (event) => {
              if (trace.pendingKind !== 'zoom' && trace.pendingKind !== 'turn') return;
              const expected = trace.pendingKind === 'turn' ? 'ArrowRight' : '=';
              if (event.key === expected) trace.actionAt = performance.now();
            },
            true,
          );
        });

        await page.goto(`${baseUrl}/projects/${project}`);
        await page.locator('[data-site-control="explore-3d"]').click();
        await page.locator('[data-xploder-ready="true"]').waitFor({ state: 'visible', timeout: 60_000 });
        await page.waitForTimeout(1000);
        if (!signalLinePrinted) {
          const detected = await page.evaluate(() => ({
            events: window.__s15TimingTrace.support,
            clock: document.querySelector('[data-xploder-clock]') !== null,
          }));
          console.log(
            detected.events
              ? `# signals: events${detected.clock ? ' + clock' : ''} + attributes (S15)`
              : detected.clock
                ? '# signals: clock + attributes (events absent)'
                : '# signals: attributes (pre-S15)',
          );
          signalLinePrinted = true;
        }
        if (!tablePrinted) {
          console.log(
            '| project | cpu | motion | settle delay ms median / p95 / max | task time ms median / p95 / max | placement self ms median / p95 / max | rest method | runs |',
          );
          console.log('|---|---:|---|---|---|---|---|---:|');
          tablePrinted = true;
        }

        for (const kind of ['explode', 'zoom', 'turn']) {
          const measured = [];
          for (let run = 0; run <= runs; run += 1) {
            await prepareMotion(page, kind);
            await page.evaluate(
              ({ motionKind }) => {
                const trace = window.__s15TimingTrace;
                trace.frames.length = 0;
                trace.events.length = 0;
                trace.actionAt = null;
                trace.pendingKind = motionKind;
                trace.labelVisibleAt = null;
              },
              { motionKind: kind },
            );
            const perfBefore = await page.evaluate(() => performance.now() * 1000);
            await cdp.send('Profiler.enable');
            await cdp.send('Profiler.setSamplingInterval', { interval: 100 });
            await cdp.send('Profiler.start');
            await triggerMotion(page, kind);
            await page.waitForFunction(() => window.__s15TimingTrace.actionAt !== null, undefined, {
              timeout: 10_000,
            });

            await page
              .waitForFunction(
                ({ minimum, expected }) => {
                  const trace = window.__s15TimingTrace;
                  if (trace.support) {
                    return trace.events.some((event) => event.kind === 'settled' && event.t >= minimum);
                  }
                  return performance.now() >= expected;
                },
                { minimum: perfBefore / 1000, expected: perfBefore / 1000 + durations[kind] + 800 },
                { timeout: 15_000 },
              )
              .catch(() => undefined);
            await page
              .waitForFunction(
                () =>
                  window.__s15TimingTrace.labelVisibleAt !== null ||
                  window.__s15TimingTrace.frames.at(-1)?.visibleLabels > 0,
                undefined,
                { timeout: 8_000 },
              )
              .catch(() => undefined);
            await page.waitForTimeout(200);
            const perfStopUs = await page.evaluate(() => performance.now() * 1000);
            const profiled = await cdp.send('Profiler.stop');
            await cdp.send('Profiler.disable').catch(() => undefined);

            const trace = await page.evaluate(() => window.__s15TimingTrace);
            if (run === 0) continue;
            const frames = trace.frames;
            const start = trace.actionAt;
            if (start === null || frames.length === 0) continue;
            const settleEvent = trace.events.find(
              (event) => event.kind === 'settled' && event.t >= start,
            );
            let restFrame = null;
            let restMethod = null;
            if (trace.support && settleEvent !== undefined) {
              const atMs = Number(settleEvent.detail?.at) * 1000;
              restFrame = frameContaining(frames, atMs);
              restMethod = 'event';
            } else if (kind === 'explode') {
              restFrame = frames.find((frame) => frame.state === 'exploded') ?? null;
              restMethod = 'attribute-state';
            } else {
              const atEnd = frames.at(-1);
              const target = kind === 'zoom' ? atEnd?.zoom : atEnd?.azimuth;
              restFrame = frames.find(
                (frame) => (kind === 'zoom' ? frame.zoom : frame.azimuth) === target,
              );
              restMethod = kind === 'zoom' ? 'attribute-zoom' : 'attribute-azimuth';
            }

            const visibleFrame = frames.find((frame) => frame.visibleLabels > 0) ?? null;
            const paintedFrame =
              trace.labelVisibleAt === null
                ? visibleFrame
                : frames.find((frame) => frame.t >= trace.labelVisibleAt) ?? null;
            if (restFrame === null || paintedFrame === null) continue;
            const settleDelay = paintedFrame.t - restFrame.t;

            const profile = profiled.profile;
            const profileEnd =
              profile.startTime +
              (profile.timeDeltas ?? []).reduce(
                (total, delta) => total + (Number.isFinite(delta) && delta > 0 ? delta : 0),
                0,
              );
            const offsetUs = profileEnd - perfStopUs;
            const profileWindowStartUs = restFrame.t * 1000 + offsetUs;
            const profileWindowEndUs = paintedFrame.t * 1000 + offsetUs;
            const samples = samplesBetween(profile, profileWindowStartUs, profileWindowEndUs);
            let taskMs = 0;
            let placementMs = null;
            for (const sample of samples) {
              const name = sample.node.callFrame.functionName;
              if (name === '(idle)' || name === '(program)' || name === '(garbage collector)') continue;
              taskMs += sample.overlapUs / 1000;
              const url = sample.node.callFrame.url;
              if (
                /(?:overlay|lettering)\/place/.test(url) ||
                /^(?:placeLabels|letterPart|letteringModel|faceLettering|markLettering)$/.test(name)
              ) {
                placementMs = (placementMs ?? 0) + sample.overlapUs / 1000;
                sawPlacementSamples = true;
              }
            }

            measured.push({
              settleDelay,
              taskMs,
              placementMs,
              restMethod,
              paintMethod: trace.labelVisibleAt === null ? 'already-visible' : 'label-dom',
            });
          }

          const delays = measured.map((entry) => entry.settleDelay);
          const tasks = measured.map((entry) => entry.taskMs);
          const placements = measured
            .map((entry) => entry.placementMs)
            .filter((value) => value !== null);
          const cell = {
            project,
            cpu,
            motion: kind,
            runs: measured.length,
            restMethods: [...new Set(measured.map((entry) => entry.restMethod))],
            paintMethods: [...new Set(measured.map((entry) => entry.paintMethod))],
            settleDelay: { median: round(median(delays)), p95: round(p95(delays)), max: round(Math.max(...delays)) },
            taskTime: { median: round(median(tasks)), p95: round(p95(tasks)), max: round(Math.max(...tasks)) },
            placementSelf: {
              median: round(median(placements)),
              p95: round(p95(placements)),
              max: placements.length === 0 ? null : round(Math.max(...placements)),
            },
          };
          cells.push(cell);
          console.log(
            `| ${project} | x${cpu} | ${kind} | ${cell.settleDelay.median} / ${cell.settleDelay.p95} / ${cell.settleDelay.max} | ${cell.taskTime.median} / ${cell.taskTime.p95} / ${cell.taskTime.max} | ${placements.length === 0 ? 'n/a' : `${cell.placementSelf.median} / ${cell.placementSelf.p95} / ${cell.placementSelf.max}`} | ${cell.restMethods.join(',')} | ${cell.runs} |`,
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

if (!sawPlacementSamples) console.log('placement self time: not attributable (minified)');
console.log(
  `SUMMARY_JSON ${JSON.stringify({ viewport: '412x823@1.75', runs, placementAttribution: sawPlacementSamples, cells })}`,
);
