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
  const projects = new Map();
  for (const cell of cells) {
    if (!projects.has(cell.project)) projects.set(cell.project, { pooled: [], motions: new Map() });
    const project = projects.get(cell.project);
    const samples = (cell.settleSamples ?? []).filter((value) => Number.isFinite(value));
    project.pooled.push(...samples);
    project.motions.set(cell.motion, median(samples));
  }

  let cache = false;
  for (const [name, project] of projects) {
    const projectMedian = median(project.pooled);
    if (projectMedian !== null && projectMedian > threshold) cache = true;
    const motionMedians = [...project.motions]
      .map(([motion, value]) => `${motion} ${value === null ? 'missing' : value.toFixed(1)}`)
      .join(', ');
    console.log(
      `${name}: pooled ${projectMedian === null ? 'missing' : projectMedian.toFixed(1)} ms median settle delay at CPU x${cpu} (${project.pooled.length} valid samples)`,
    );
    console.log(`${name}: per-motion ${motionMedians || 'missing'}`);
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

function motionDurationMs(kind, shape) {
  if (kind === 'explode') {
    return (
      (motion.durations.explode +
        Math.max(0, shape.layerCount - 1) * motion.staggers.explodeLayer +
        Math.max(0, shape.maxSlot) * motion.staggers.explodeComponent) *
      1000
    );
  }
  return motion.durations.implode * 1000;
}

async function readShape(page) {
  const shape = await page.evaluate(() => {
    const componentsPerLayer = [...document.querySelectorAll('[data-xploder-navigator] ul')]
      .map((group) => group.querySelectorAll('[data-xploder-proxy]').length)
      .filter((count) => count > 0);
    return {
      layerCount: componentsPerLayer.length,
      maxSlot: componentsPerLayer.length === 0 ? 0 : Math.max(...componentsPerLayer) - 1,
      componentsPerLayer,
    };
  });
  if (shape.layerCount === 0) throw new Error('rendered layer proxies were not found');
  return shape;
}

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

function firstFrameAtOrAfter(frames, timeMs) {
  return frames.find((frame) => frame.t >= timeMs) ?? null;
}

console.log(
  `# command: node settle-timing.mjs <repo> <baseUrl> [--cpu ${cpuProfiles.join(',')}] [--runs ${runs}] | base: ${baseUrl} | chromium: ${browser.version()} | cpu: ${cpuProfiles.join(',')} | commit: ${commit}`,
);
console.log('# viewport: 412x823 DPR 1.75, hasTouch, isMobile');
if (options['rest-method'] === 'attributes') console.log('# rest method forced: attributes (events ignored, comparable with the pre-S15 base)');
console.log('# visibility: effective opacity (ancestor product) > 0 = fade started (fade-in excluded)');

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
          };
          window.__s15TimingTrace = trace;
          const labelSelector =
            '[data-xploder-label],[data-xploder-lettering-kind],[data-xploder-lettering-layer-label]';

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

          const visible = (element) => {
            if (element.getClientRects().length === 0) return false;
            let opacity = 1;
            let node = element;
            while (node instanceof Element) {
              const style = getComputedStyle(node);
              if (style.display === 'none' || style.visibility !== 'visible') return false;
              opacity *= Number(style.opacity);
              if (node === document.body) return opacity > 0;
              node = node.parentElement;
            }
            return false;
          };
          const visibleCount = () =>
            [...document.querySelectorAll(labelSelector)].filter(visible).length;
          const frame = (t) => {
            const viewer = document.querySelector('[data-xploder-ready="true"]');
            const visibleLabels = visibleCount();
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
              if (event.key === expected && trace.actionAt === null) trace.actionAt = performance.now();
            },
            true,
          );
        });

        await page.goto(`${baseUrl}/projects/${project}`);
        await page.locator('[data-site-control="explore-3d"]').click();
        await page.locator('[data-xploder-ready="true"]').waitFor({ state: 'visible', timeout: 60_000 });
        await page.waitForTimeout(1000);
        const shape = await readShape(page);
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
            '| project | cpu | motion | settle delay ms median / p95 / max | task time ms median / p95 / max | placement self ms median / p95 / max | rest method | labels | invalid | runs |',
          );
          console.log('|---|---:|---|---|---|---|---|---|---:|---:|');
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
              },
              { motionKind: kind },
            );
            await cdp.send('Profiler.enable');
            await cdp.send('Profiler.setSamplingInterval', { interval: 100 });
            await cdp.send('Profiler.start');
            await triggerMotion(page, kind);
            await page.waitForFunction(() => window.__s15TimingTrace.actionAt !== null, undefined, {
              timeout: 10_000,
            });
            const start = await page.evaluate(() => window.__s15TimingTrace.actionAt);
            const firstFrameAt = await page.evaluate(
              (actionStart) =>
                new Promise((resolveFrame) => {
                  const tick = (timestamp) => {
                    if (timestamp < actionStart) requestAnimationFrame(tick);
                    else resolveFrame(timestamp);
                  };
                  requestAnimationFrame(tick);
                }),
              start,
            );
            const expectedDuration = motionDurationMs(kind, shape);
            const expectedEnd = firstFrameAt + expectedDuration + 800;

            await page
              .waitForFunction(
                ({ actionStart, minimumEnd }) => {
                  const trace = window.__s15TimingTrace;
                  if (trace.support) {
                    return trace.events.some(
                      (event) => event.kind === 'settled' && event.t >= actionStart,
                    );
                  }
                  return performance.now() >= minimumEnd;
                },
                { actionStart: start, minimumEnd: expectedEnd },
                { timeout: 15_000 },
              )
              .catch(() => undefined);
            await page.waitForTimeout(350);
            const perfStopUs = await page.evaluate(() => performance.now() * 1000);
            const profiled = await cdp.send('Profiler.stop');
            await cdp.send('Profiler.disable').catch(() => undefined);

            const trace = await page.evaluate(() => window.__s15TimingTrace);
            // --rest-method attributes: ignore the S15 events so a run is comparable with a pre-S15 base.
            if (options['rest-method'] === 'attributes') trace.support = false;
            if (run === 0) continue;
            const frames = trace.frames;
            if (start === null || frames.length === 0) {
              console.log(`# invalid ${project} x${cpu} ${kind} run ${run}: no action/frames`);
              measured.push({ valid: false, reason: 'no-frames', labelBehavior: 'missing' });
              continue;
            }
            const before = frames.filter((frame) => frame.t < start).at(-1) ?? null;
            const firstFrame = frames.find((frame) => frame.t >= start) ?? null;
            const settleEvent = trace.events.find(
              (event) => event.kind === 'settled' && event.t >= start,
            );
            let restFrame = null;
            let restMethod = null;
            if (trace.support) {
              if (settleEvent === undefined) {
                console.log(`# invalid ${project} x${cpu} ${kind} run ${run}: settled event missing`);
                measured.push({ valid: false, reason: 'event-missing', labelBehavior: 'missing' });
                continue;
              }
              const atMs = Number(settleEvent.detail?.at) * 1000;
              restFrame = frameContaining(frames, atMs);
              restMethod = 'event';
            } else if (kind === 'explode') {
              restFrame = frames.find((frame) => frame.state === 'exploded') ?? null;
              restMethod = 'attribute-state';
            } else if (kind === 'zoom') {
              const finalZoom = frames.at(-1)?.zoom ?? null;
              restFrame =
                finalZoom === null || finalZoom === before?.zoom
                  ? null
                  : (frames.find((frame) => frame.t >= start && frame.zoom === finalZoom) ?? null);
              restMethod = 'attribute-zoom';
            } else {
              restFrame =
                firstFrame === null
                  ? null
                  : firstFrameAtOrAfter(frames, firstFrame.t + motion.durations.implode * 1000);
              restMethod = 'tween-duration';
            }
            if (restFrame === null) {
              console.log(`# invalid ${project} x${cpu} ${kind} run ${run}: rest frame missing`);
              measured.push({ valid: false, reason: 'rest-missing', labelBehavior: 'missing' });
              continue;
            }

            const labelHidden = frames.some(
              (frame) =>
                frame.t >= start && frame.t <= restFrame.t && frame.visibleLabels === 0,
            );
            const labelBehavior = labelHidden ? 'hidden' : 'no-hide';
            const visibleAfterRest = frames.find(
              (frame) => frame.t >= restFrame.t && frame.visibleLabels > 0,
            );
            // The frame whose rAF already sees the placed labels (fade started) is the frame that paints them.
            const paintedFrame = visibleAfterRest ?? null;
            if (paintedFrame === null) {
              console.log(`# invalid ${project} x${cpu} ${kind} run ${run}: paint frame missing`);
              measured.push({ valid: false, reason: 'paint-missing', labelBehavior });
              continue;
            }
            const settleDelay = paintedFrame.t - restFrame.t;
            if (settleDelay < 0) {
              console.log(
                `# invalid ${project} x${cpu} ${kind} run ${run}: negative delay ${round(settleDelay)} ms`,
              );
              measured.push({ valid: false, reason: 'negative-delay', labelBehavior });
              continue;
            }

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
              valid: true,
              settleDelay,
              taskMs,
              placementMs,
              restMethod,
              paintMethod: 'effective-label-dom',
              labelBehavior,
            });
          }

          const valid = measured.filter((entry) => entry.valid);
          const invalid = measured.filter((entry) => !entry.valid);
          const delays = valid.map((entry) => entry.settleDelay);
          const tasks = valid.map((entry) => entry.taskMs);
          const placements = valid
            .map((entry) => entry.placementMs)
            .filter((value) => value !== null);
          const hiddenRuns = valid.filter((entry) => entry.labelBehavior === 'hidden').length;
          const noHideRuns = valid.filter((entry) => entry.labelBehavior === 'no-hide').length;
          const cell = {
            project,
            cpu,
            motion: kind,
            runs: valid.length,
            attempts: measured.length,
            invalidRuns: invalid.length,
            invalidReasons: invalid.map((entry) => entry.reason),
            noHideRuns,
            restMethods: [...new Set(valid.map((entry) => entry.restMethod))],
            paintMethods: [...new Set(valid.map((entry) => entry.paintMethod))],
            settleSamples: delays.map(round),
            settleDelay: {
              median: round(median(delays)),
              p95: round(p95(delays)),
              max: delays.length === 0 ? null : round(Math.max(...delays)),
            },
            taskTime: {
              median: round(median(tasks)),
              p95: round(p95(tasks)),
              max: tasks.length === 0 ? null : round(Math.max(...tasks)),
            },
            placementSelf: {
              median: round(median(placements)),
              p95: round(p95(placements)),
              max: placements.length === 0 ? null : round(Math.max(...placements)),
            },
          };
          cells.push(cell);
          console.log(
            `| ${project} | x${cpu} | ${kind} | ${cell.settleDelay.median ?? 'n/a'} / ${cell.settleDelay.p95 ?? 'n/a'} / ${cell.settleDelay.max ?? 'n/a'} | ${cell.taskTime.median ?? 'n/a'} / ${cell.taskTime.p95 ?? 'n/a'} / ${cell.taskTime.max ?? 'n/a'} | ${placements.length === 0 ? 'n/a' : `${cell.placementSelf.median} / ${cell.placementSelf.p95} / ${cell.placementSelf.max}`} | ${cell.restMethods.join(',')} | ${noHideRuns === 0 ? 'hidden' : hiddenRuns === 0 ? 'no-hide' : `mixed (${noHideRuns} no-hide)`} | ${cell.invalidRuns} | ${cell.runs}/${cell.attempts} |`,
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
