import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';

const [, , repoArg, baseUrlArg] = process.argv;
if (!repoArg || !baseUrlArg) {
  console.error('usage: node storyboard-timing.mjs <repo> <baseUrl>');
  process.exit(2);
}

const repo = resolve(repoArg);
const baseUrl = baseUrlArg.replace(/\/$/, '');
const require = createRequire(resolve(repo, 'tools/perf/package.json'));
const { chromium } = require('playwright');
const browser = await chromium.launch();
const repoCommit = execFileSync('git', ['-C', repo, 'rev-parse', '--short', 'HEAD'], {
  encoding: 'utf8',
}).trim();
const dirty = execFileSync('git', ['-C', repo, 'status', '--porcelain'], {
  encoding: 'utf8',
}).trim().length > 0;
const commit =
  process.env.S14_COMMIT ?? `${repoCommit}${dirty ? '+working-tree' : ''}`;

const LABEL_SELECTOR =
  '[data-xploder-label],[data-xploder-lettering],[data-xploder-lettering-layer-label]';
const EXPECTED_PHASES = ['implode', 'explode', 'zoomin', 'capture', 'inspect', 'turn'];
const LOOP_TIMEOUT_MS = 90_000;

function round(value) {
  return Math.round(value * 10) / 10;
}

function seconds(value) {
  return (value / 1000).toFixed(2);
}

function visibleMs(events, from, to) {
  let visible = false;
  let cursor = from;
  let total = 0;

  for (const event of events) {
    if (event.kind !== 'lettering') continue;

    if (event.t <= from) {
      visible = event.value === 'shown';
      continue;
    }
    if (event.t >= to) break;

    if (visible) total += event.t - cursor;
    visible = event.value === 'shown';
    cursor = event.t;
  }

  if (visible) total += to - cursor;
  return Math.max(0, total);
}

function phaseRows(events) {
  const phases = events.filter((event) => event.kind === 'phase');
  const firstImplode = phases.findIndex((event) => event.value === 'implode');
  if (firstImplode < 0) throw new Error('initial implode phase was not observed');

  const loop = phases.slice(firstImplode);
  const returned = loop.findIndex((event, index) => index > 0 && event.value === 'implode');
  if (returned < 0) throw new Error('loop did not return to implode after turn');

  const circle = loop.slice(0, returned + 1);
  const rows = circle.slice(0, -1).map((event, index) => {
    const next = circle[index + 1];
    return {
      phase: event.value,
      start: event.t,
      end: next.t,
      duration: next.t - event.t,
      labelsVisible: visibleMs(events, event.t, next.t),
      labelElements:
        events.filter((candidate) => candidate.kind === 'labels' && candidate.t <= event.t).at(-1)
          ?.value ?? 0,
    };
  });

  return { rows, loopStart: circle[0].t, loopEnd: circle.at(-1).t };
}

try {
  console.log(
    `# command: node storyboard-timing.mjs <repo> <baseUrl> | base: ${baseUrl} | chromium: ${browser.version()} | commit: ${commit}`,
  );
  console.log(
    '# labels: data-xploder-lettering=shown from MutationObserver; elements: [data-xploder-label], [data-xploder-lettering], [data-xploder-lettering-layer-label]',
  );
  console.log(
    '# tour-end hold: data-xploder-tour=ended to the next data-hero-phase change in the same flow',
  );
  console.log('');
  console.log(
    '| viewport | phase | start ms | end ms | duration ms | labels visible ms | label elements |',
  );
  console.log('|---|---|---:|---:|---:|---:|---:|');

  const summaries = [];
  for (const [width, height, mobile] of [
    [1440, 900, false],
    [390, 844, true],
  ]) {
    const context = await browser.newContext({
      viewport: { width, height },
      isMobile: mobile,
      hasTouch: mobile,
    });
    const page = await context.newPage();

    try {
      await page.addInitScript(({ labelSelector }) => {
        const trace = { events: [], complete: false };
        const labels = new Set();
        let labelCount = 0;
        let phase = null;
        let lettering = 'hidden';
        let tour = null;
        let sawTurn = false;

        const isLabel = (node) =>
          node instanceof Element &&
          (node.matches(labelSelector) || node.querySelector(labelSelector) !== null);

        const addLabels = (node) => {
          if (!(node instanceof Element)) return;
          if (node.matches(labelSelector)) labels.add(node);
          for (const child of node.querySelectorAll(labelSelector)) labels.add(child);
        };

        const removeLabels = (node) => {
          if (!(node instanceof Element)) return;
          if (node.matches(labelSelector)) labels.delete(node);
          for (const child of node.querySelectorAll(labelSelector)) labels.delete(child);
        };

        const record = (t, kind, value) => {
          trace.events.push({ t, kind, value });
        };

        new MutationObserver((records) => {
          const now = performance.now();
          let labelsChanged = false;

          for (const mutation of records) {
            if (mutation.type === 'attributes') {
              if (mutation.attributeName === 'data-hero-phase') {
                const next = mutation.target.getAttribute('data-hero-phase');
                if (next !== null && next !== phase) {
                  phase = next;
                  if (phase === 'turn') sawTurn = true;
                  record(now, 'phase', phase);
                  if (phase === 'implode' && sawTurn) {
                    trace.complete = true;
                  }
                }
              }

              if (mutation.attributeName === 'data-xploder-tour') {
                const next = mutation.target.getAttribute('data-xploder-tour');
                if (next !== null && next !== tour) {
                  tour = next;
                  record(now, 'tour', tour);
                }
              }
            }

            for (const node of mutation.addedNodes) {
              if (!isLabel(node)) continue;
              addLabels(node);
              labelsChanged = true;
            }
            for (const node of mutation.removedNodes) {
              if (!isLabel(node)) continue;
              removeLabels(node);
              labelsChanged = true;
            }
          }

          const phaseNode = document.querySelector('[data-hero-phase]');
          const nextPhase = phaseNode?.getAttribute('data-hero-phase') ?? null;
          if (nextPhase !== null && nextPhase !== phase) {
            phase = nextPhase;
            if (phase === 'turn') sawTurn = true;
            record(now, 'phase', phase);
            if (phase === 'implode' && sawTurn) {
              trace.complete = true;
            }
          }

          const tourNode = document.querySelector('[data-xploder-tour]');
          const nextTour = tourNode?.getAttribute('data-xploder-tour') ?? null;
          if (nextTour !== null && nextTour !== tour) {
            tour = nextTour;
            record(now, 'tour', tour);
          }

          const letteringNode = document.querySelector('[data-xploder-lettering]');
          const nextLettering = letteringNode?.getAttribute('data-xploder-lettering') ?? 'hidden';
          if (nextLettering !== lettering) {
            lettering = nextLettering;
            record(now, 'lettering', lettering);
          }

          if (labelsChanged && labels.size !== labelCount) {
            labelCount = labels.size;
            record(now, 'labels', labelCount);
          }
        }).observe(document, {
          subtree: true,
          attributes: true,
          childList: true,
          attributeFilter: ['data-hero-phase', 'data-xploder-lettering', 'data-xploder-tour'],
        });

        window.__s14StoryboardTrace = trace;
      }, { labelSelector: LABEL_SELECTOR });

      await page.goto(`${baseUrl}/`);
      await page.waitForFunction(() => window.__s14StoryboardTrace?.complete === true, undefined, {
        timeout: LOOP_TIMEOUT_MS,
      });

      const trace = await page.evaluate(() => window.__s14StoryboardTrace);
      const { rows, loopStart, loopEnd } = phaseRows(trace.events);
      const observed = rows.map((row) => row.phase);
      if (JSON.stringify(observed) !== JSON.stringify(EXPECTED_PHASES)) {
        throw new Error(`unexpected phase order: ${observed.join(' -> ')}`);
      }

      for (const row of rows) {
        console.log(
          `| ${width}x${height} | ${row.phase} | ${round(row.start - loopStart)} | ${round(row.end - loopStart)} | ${round(row.duration)} | ${round(row.labelsVisible)} | ${row.labelElements} |`,
        );
      }

      const tourEnds = trace.events.filter((event) => event.kind === 'tour' && event.value === 'ended');
      const holds = tourEnds.map((ended) => {
        const nextPhase = trace.events.find((event) => event.kind === 'phase' && event.t >= ended.t);
        return nextPhase === undefined ? null : nextPhase.t - ended.t;
      });
      if (holds.some((hold) => hold === null)) throw new Error('tour-end hold end was not observed');

      summaries.push({
        viewport: `${width}x${height}`,
        loopMs: loopEnd - loopStart,
        explodedLabelsMs: rows.find((row) => row.phase === 'explode')?.labelsVisible ?? 0,
        zoomedLabelsMs: rows.find((row) => row.phase === 'zoomin')?.labelsVisible ?? 0,
        holdsMs: holds,
      });
    } finally {
      await context.close();
    }
  }

  console.log('');
  for (const summary of summaries) {
    console.log(
      `summary ${summary.viewport}: labelled exploded view visible ${seconds(summary.explodedLabelsMs)} s; zoomed view visible ${seconds(summary.zoomedLabelsMs)} s; tour-end holds ${summary.holdsMs.map((hold) => `${seconds(hold)} s`).join(' + ')}; loop ${seconds(summary.loopMs)} s`,
    );
  }
  console.log(`SUMMARY_JSON ${JSON.stringify(summaries)}`);
} finally {
  await browser.close();
}
