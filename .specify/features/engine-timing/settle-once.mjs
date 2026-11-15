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
const { HERO_STORYBOARD_MS } = await import(
  pathToFileURL(resolve(repo, 'apps/web/components/hero/hero-loop.ts')).href
);
const browser = await chromium.launch();
const commit =
  process.env.S15_COMMIT ??
  execFileSync('git', ['-C', repo, 'rev-parse', '--short', 'HEAD'], {
    encoding: 'utf8',
  }).trim();

mkdirSync(outDir, { recursive: true });

function installTrace() {
  const trace = { frames: [], events: [], eventSupport: false, motion: null };
  window.__s15SettleTrace = trace;
  const labelSelector =
    '[data-xploder-label],[data-xploder-lettering-kind],[data-xploder-lettering-layer-label]';

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

  let lastPhase = null;
  new MutationObserver((records) => {
    for (const record of records) {
      if (record.type !== 'attributes' || record.attributeName !== 'data-hero-phase') continue;
      const phase = record.target.getAttribute('data-hero-phase');
      if (phase !== null && phase !== lastPhase) {
        lastPhase = phase;
        trace.events.push({ t: performance.now(), kind: 'phase', value: phase });
      }
    }
  }).observe(document, {
    subtree: true,
    attributes: true,
    attributeFilter: ['data-hero-phase'],
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

  const frame = (t) => {
    const viewer = document.querySelector('[data-xploder-ready="true"]');
    trace.frames.push({
      t,
      visibleLabels: window.__s15EffectiveVisibleCount(),
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
}

function round(value) {
  return Math.round(value * 10) / 10;
}

function motionDurationMs(kind, shape) {
  if (kind === 'explode') {
    return (
      (motion.durations.explode +
        Math.max(0, shape.layerCount - 1) * motion.staggers.explodeLayer +
        Math.max(0, shape.maxSlot) * motion.staggers.explodeComponent) *
      1000
    );
  }
  if (kind === 'implode') {
    return (
      (motion.durations.implode +
        Math.max(0, shape.layerCount - 1) * motion.staggers.implodeLayer) *
      1000
    );
  }
  return kind === 'turn' ? motion.durations.implode * 1000 : 0;
}

async function firstFrameAtOrAfter(page, time) {
  return await page.evaluate(
    (target) =>
      new Promise((resolveFrame) => {
        const tick = (timestamp) => {
          if (timestamp < target) requestAnimationFrame(tick);
          else resolveFrame(timestamp);
        };
        requestAnimationFrame(tick);
      }),
    time,
  );
}

async function captureAt(page, time) {
  return await page.evaluate(
    (target) =>
      new Promise((resolveFrame) => {
        const tick = (timestamp) => {
          if (timestamp < target) requestAnimationFrame(tick);
          else
            resolveFrame({
              t: timestamp,
              visibleLabels: window.__s15EffectiveVisibleCount(),
            });
        };
        requestAnimationFrame(tick);
      }),
    time,
  );
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

async function beginMotion(page, kind, trigger) {
  await page.evaluate(
    ({ motionKind, waitFor }) => {
      window.__s15SettleTrace.motion = { kind: motionKind, awaiting: waitFor, actionAt: null };
      window.__s15SettleTrace.events.length = 0;
    },
    { motionKind: kind, waitFor: trigger },
  );
}

async function actionAt(page, action) {
  await action();
  await page.waitForFunction(() => window.__s15SettleTrace.motion?.actionAt !== null, undefined, {
    timeout: 10_000,
  });
  return await page.evaluate(() => window.__s15SettleTrace.motion.actionAt);
}

function summarizeMotion(allFrames, trace, kind, start, end, targetState) {
  const before = allFrames.filter((frame) => frame.t < start).at(-1) ?? null;
  const frames = allFrames.filter((frame) => frame.t >= start && frame.t <= end);
  const events = trace.events.filter((event) => event.t >= start && event.t <= end);
  let settles;

  if (trace.eventSupport) {
    settles = events.filter((event) => event.kind === 'settled');
  } else if (kind === 'explode' || kind === 'implode') {
    const settle = frames.find((frame) => frame.state === targetState);
    settles = settle === undefined ? [] : [settle];
  } else if (kind === 'zoom') {
    const settle = frames.find((frame) => frame.zoom !== before?.zoom);
    settles = settle === undefined ? [] : [settle];
  } else {
    // data-xploder-azimuth is the target, so the turn's rest is the tween end (implode duration).
    const first = frames.find((frame) => frame.t >= start);
    const settle =
      first === undefined
        ? undefined
        : frames.find((frame) => frame.t >= first.t + motion.durations.implode * 1000);
    settles = settle === undefined ? [] : [settle];
  }

  let revealCount = 0;
  let previous = before?.visibleLabels ?? 0;
  let previousT = -Infinity;
  for (const frame of frames) {
    if (frame.t === previousT) continue;
    if (previous === 0 && frame.visibleLabels > 0) revealCount += 1;
    previous = frame.visibleLabels;
    previousT = frame.t;
  }
  const endVisible = frames.at(-1)?.visibleLabels ?? 0;
  return { settles, revealCount, endVisible };
}

// Hidden → visible transitions in traced frames that start inside the tween window
// [from, from + durationMs). Labels still on screen in the first frame(s) of a motion (before the
// overlay's moving event hides them) are a carry-over, not an appearance; only a reappearance
// before the tween ends is mid-animation flicker.
function midTweenReveals(frames, from, durationMs) {
  let previous = frames.filter((frame) => frame.t < from).at(-1)?.visibleLabels ?? 0;
  let reveals = 0;
  for (const frame of frames) {
    if (frame.t < from || frame.t >= from + durationMs) continue;
    if (previous === 0 && frame.visibleLabels > 0) reveals += 1;
    previous = frame.visibleLabels;
  }
  return reveals;
}

// One settle per motion; one reveal per settle when the rest pose shows labels, none when it
// shows none (the imploded pose has no tags); zero labels in every mid-tween capture.
function onceVerdict({ settleCount, expectedSettles, revealCount, endVisible, captures }) {
  const expectedReveals = endVisible > 0 ? expectedSettles : 0;
  const settlesOk = settleCount === null || settleCount === expectedSettles;
  const revealsOk = endVisible > 0 ? revealCount === expectedReveals : revealCount === 0;
  return settlesOk && revealsOk && captures.every((capture) => capture.visibleLabels === 0)
    ? 'ONCE'
    : 'NOT-ONCE';
}

async function waitForPhase(page, name, after = -Infinity) {
  await page.waitForFunction(
    ({ phaseName, minimum }) =>
      window.__s15SettleTrace.events.some(
        (event) => event.kind === 'phase' && event.value === phaseName && event.t >= minimum,
      ),
    { phaseName: name, minimum: after },
    { timeout: 120_000 },
  );
  const trace = await page.evaluate(() => window.__s15SettleTrace);
  return trace.events.find(
    (event) => event.kind === 'phase' && event.value === name && event.t >= after,
  );
}

// The turn phase holds three motions: zoom reset at the phase start, then a rotation after each
// turn step (hero-loop.ts beginTurn/turn). Every other judged phase holds one.
const TURN_MOTIONS = 3;

async function runHeroPhase(page, phase, nextPhase, durationMs, cpu) {
  const startEvent = await waitForPhase(page, phase);
  const start = startEvent.t;
  const captures = [];
  const motionStarts =
    phase === 'turn'
      ? Array.from({ length: TURN_MOTIONS }, (_, index) => start + index * HERO_STORYBOARD_MS.turnStep)
      : [start];
  const captureTimes = motionStarts.flatMap((motionStart, index) =>
    [0.25, 0.5, 0.75].map((fraction) => ({
      at: motionStart + durationMs * fraction,
      label: `${phase === 'turn' ? `m${index + 1}-` : ''}${Math.round(fraction * 100)}`,
    })),
  );

  for (const { at, label } of captureTimes) {
    const capture = await captureAt(page, at);
    const percent = label;
    await page.locator('[data-xploder-ready="true"]').screenshot({
      path: resolve(outDir, `home-cpu${cpu}-${phase}-${percent}.png`),
    });
    captures.push({ percent, visibleLabels: capture.visibleLabels });
  }

  const endEvent = await waitForPhase(page, nextPhase, start + 1);
  const trace = await page.evaluate(() => window.__s15SettleTrace);
  const analysisEnd =
    phase === 'turn' ? endEvent.t : Math.min(endEvent.t, start + durationMs + 800);
  const before = trace.frames.filter((frame) => frame.t < start).at(-1) ?? null;
  const frames = trace.frames.filter((frame) => frame.t >= start && frame.t <= analysisEnd);
  const settledEvents = trace.events.filter(
    (event) => event.t >= start && event.t <= analysisEnd && event.kind === 'settled',
  );
  const firstFrame = frames.find((frame) => frame.t >= start);
  let settles;

  if (trace.eventSupport) {
    settles = settledEvents;
  } else if (phase === 'explode') {
    const settle = frames.find((frame) => frame.state === 'exploded');
    settles = settle === undefined ? [] : [settle];
  } else if (phase === 'turn') {
    settles = null; // no attribute marks a camera settle before S15 events
  } else {
    const settle =
      firstFrame === undefined
        ? null
        : (frames.find((frame) => frame.t >= firstFrame.t + durationMs) ?? null);
    settles = settle === null ? [] : [settle];
  }

  let revealCount = 0;
  let previous = before?.visibleLabels ?? 0;
  let previousT = -Infinity;
  for (const frame of frames) {
    if (frame.t === previousT) continue;
    if (previous === 0 && frame.visibleLabels > 0) revealCount += 1;
    previous = frame.visibleLabels;
    previousT = frame.t;
  }

  return {
    project: '/',
    midTweenFrameMax: motionStarts.reduce((sum, motionStart) => sum + midTweenReveals(frames, motionStart, durationMs), 0),
    cpu,
    motion: phase,
    settleCount: settles === null ? 'n/a' : settles.length,
    expectedSettles: phase === 'turn' ? TURN_MOTIONS : 1,
    revealCount,
    midVisibleLabels: captures.map((capture) => ({
      percent: capture.percent,
      visible: capture.visibleLabels,
    })),
    verdict: onceVerdict({
      settleCount: settles === null ? null : settles.length,
      expectedSettles: phase === 'turn' ? TURN_MOTIONS : 1,
      revealCount,
      // The next phase may already hide the labels in the last frame, so a hero phase's rest pose
      // counts as labelled when any frame in the window showed labels.
      endVisible: Math.max(0, ...frames.map((frame) => frame.visibleLabels)),
      captures: motionStarts.map((motionStart) => ({
        visibleLabels: midTweenReveals(frames, motionStart, durationMs),
      })),
    }),
  };
}

function printRow(result) {
  const mid =
    result.midTween === 'instant'
      ? 'instant'
      : result.midVisibleLabels
          .map((capture) => `${capture.percent}%:${capture.visible}`)
          .join(' ');
  console.log(
    `| ${result.project} | x${result.cpu} | ${result.motion} | ${result.settleCount} | ${result.revealCount} | ${mid} | ${result.midTween === 'instant' ? 'instant' : (result.midTweenFrameMax ?? 'n/a')} | ${result.verdict} |`,
  );
}

console.log(
  `# command: node settle-once.mjs <repo> <baseUrl> [--cpu ${cpuProfiles.join(',')}] | base: ${baseUrl} | chromium: ${browser.version()} | cpu: ${cpuProfiles.join(',')} | commit: ${commit}`,
);

const results = [];
let headerPrinted = false;

try {
  for (const cpu of cpuProfiles) {
    for (const project of ['websocket-inspector', 'jev-toolkit']) {
      const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
      const page = await context.newPage();
      try {
        if (cpu > 1) {
          const cdp = await context.newCDPSession(page);
          await cdp.send('Emulation.setCPUThrottlingRate', { rate: cpu });
        }
        await page.addInitScript(installTrace);
        await page.goto(`${baseUrl}/projects/${project}`);
        await page.locator('[data-site-control="explore-3d"]').click();
        await page.locator('[data-xploder-ready="true"]').waitFor({ state: 'visible', timeout: 60_000 });
        await page.locator('[data-xploder-state]').first().focus();
        await page.waitForTimeout(1000);
        const shape = await readShape(page);

        if (!headerPrinted) {
          const initial = await page.evaluate(() => ({
            events: window.__s15SettleTrace.eventSupport,
            clock: document.querySelector('[data-xploder-clock]') !== null,
          }));
          console.log(
            initial.events
              ? `# signals: events${initial.clock ? ' + clock' : ''} + attributes (S15)`
              : initial.clock
                ? '# signals: clock + attributes (events absent)'
                : '# signals: attributes (pre-S15)',
          );
          console.log('# visibility: effective opacity (ancestor product)');
          console.log(
            '| project | cpu | motion | settles | label reveals | visible labels at 25/50/75% (screenshots) | mid-tween reveals (every frame) | verdict |',
          );
          console.log('|---|---:|---|---:|---:|---|---:|---|');
          headerPrinted = true;
        }

        for (const motionSpec of [
          { kind: 'implode', trigger: 'click', target: 'imploded' },
          { kind: 'explode', trigger: 'click', target: 'exploded' },
          { kind: 'zoom', trigger: 'key', target: null },
          { kind: 'turn', trigger: 'key', target: null },
        ]) {
          await beginMotion(page, motionSpec.kind, motionSpec.trigger);
          const start = await actionAt(page, async () => {
            if (motionSpec.trigger === 'click') {
              await page.locator('[data-site-control="toggle"]').click();
            } else {
              await page.locator('[data-xploder-state]').first().focus();
              await page.keyboard.press(motionSpec.kind === 'turn' ? 'ArrowRight' : '=');
            }
          });
          const firstFrame = await firstFrameAtOrAfter(page, start);
          const duration = motionDurationMs(motionSpec.kind, shape);
          const captures = [];

          if (motionSpec.kind !== 'zoom') {
            for (const fraction of [0.25, 0.5, 0.75]) {
              const capture = await captureAt(page, firstFrame + duration * fraction);
              const percent = Math.round(fraction * 100);
              await page.locator('[data-xploder-ready="true"]').screenshot({
                path: resolve(outDir, `${project}-cpu${cpu}-${motionSpec.kind}-${percent}.png`),
              });
              captures.push({ percent, visibleLabels: capture.visibleLabels });
            }
          }

          const minimumEnd = Math.max(firstFrame + duration + 700, firstFrame + 1000);
          await page.waitForFunction(
            ({ actionStart, expectedEnd }) => {
              const trace = window.__s15SettleTrace;
              if (
                trace.eventSupport &&
                trace.events.some((event) => event.kind === 'settled' && event.t >= actionStart)
              ) {
                return true;
              }
              return performance.now() >= expectedEnd;
            },
            { actionStart: start, expectedEnd: minimumEnd },
            { timeout: 15_000 },
          );
          await page.waitForTimeout(250);

          const end = await page.evaluate(() => performance.now());
          const trace = await page.evaluate(() => window.__s15SettleTrace);
          const summary = summarizeMotion(
            trace.frames,
            trace,
            motionSpec.kind,
            start,
            end,
            motionSpec.target,
          );
          const result = {
            project,
            cpu,
            motion: motionSpec.kind,
            settleCount: summary.settles.length,
            revealCount: summary.revealCount,
            midVisibleLabels: captures.map((capture) => ({
              percent: capture.percent,
              visible: capture.visibleLabels,
            })),
            midTween: motionSpec.kind === 'zoom' ? 'instant' : 'sampled',
            tweenMs: round(duration),
            shape,
            endVisible: summary.endVisible,
            midTweenFrameMax:
              motionSpec.kind === 'zoom' ? 0 : midTweenReveals(trace.frames, start, duration),
            verdict: onceVerdict({
              settleCount: summary.settles.length,
              expectedSettles: 1,
              revealCount: summary.revealCount,
              endVisible: summary.endVisible,
              // Every traced frame inside the tween counts, not only the three screenshots: a
              // screenshot at CPU x6 can land after the tween has ended. A reappearance fails.
              captures: [
                {
                  visibleLabels:
                    motionSpec.kind === 'zoom' ? 0 : midTweenReveals(trace.frames, start, duration),
                },
              ],
            }),
          };
          results.push(result);
          printRow(result);
        }
      } finally {
        await context.close();
      }
    }

    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();
    try {
      if (cpu > 1) {
        const cdp = await context.newCDPSession(page);
        await cdp.send('Emulation.setCPUThrottlingRate', { rate: cpu });
      }
      await page.addInitScript(installTrace);
      await page.goto(`${baseUrl}/`);
      await page.locator('[data-xploder-ready="true"]').waitFor({ state: 'visible', timeout: 60_000 });
      await page.locator('[data-hero-phase="explode"]').waitFor({ timeout: 90_000 });
      const shape = await readShape(page);
      const explodeDuration = motionDurationMs('explode', shape);
      const implodeDuration = motionDurationMs('turn', shape);

      for (const result of [
        await runHeroPhase(page, 'explode', 'zoomin', explodeDuration, cpu),
        await runHeroPhase(page, 'zoomin', 'capture', implodeDuration, cpu),
      ]) {
        results.push(result);
        printRow(result);
      }
      await waitForPhase(page, 'turn');
      const turn = await runHeroPhase(page, 'turn', 'implode', implodeDuration, cpu);
      results.push(turn);
      printRow(turn);
    } finally {
      await context.close();
    }
  }
} finally {
  await browser.close();
}

console.log(
  `SUMMARY_JSON ${JSON.stringify(results.map((result) => ({ ...result, cpu: `x${result.cpu}` })))}`,
);
