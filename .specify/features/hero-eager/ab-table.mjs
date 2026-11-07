#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const NAMED = ['renderer-constructor', 'program-compile', 'first-content-frame'];
const PLACEMENT = new Set(['G', 'Y', 'N', 'O', 'q', 'U']);
const PROGRAM_SETUP = new Set([
  'acquireProgram',
  'getProgramInfoLog',
  'getShaderInfoLog',
  'getUniforms',
]);

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function median(values) {
  if (values.length === 0) return null;
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[middle];
  return (sorted[middle - 1] + sorted[middle]) / 2;
}

function spread(values) {
  if (values.length === 0) return null;
  return Math.max(...values) - Math.min(...values);
}

function format(value) {
  return value === null || value === undefined ? 'n/a' : value.toFixed(2);
}

function invocationMedian(summary) {
  return median(summary.runs.map((run) => run.tbtMs));
}

function tbtValues(dir) {
  return [1, 2].map((run) =>
    invocationMedian(readJson(join(dir, `lh-home-r${run}`, 'lighthouse-summary.json'))),
  );
}

function fpsReports(dir, prefix = 'fps-home') {
  return [1, 2].map((run) => readJson(join(dir, `${prefix}-r${run}`, 'fps.json')));
}

function optionalFpsReports(dir, prefix) {
  try {
    return fpsReports(dir, prefix).filter((report) => Array.isArray(report.names));
  } catch {
    return [];
  }
}

function namedValue(report, name) {
  return report.names.find((task) => task.name === name)?.durMs ?? null;
}

function namedValues(dir, name) {
  return fpsReports(dir).map((report) => namedValue(report, name));
}

function probeValues(dir, metric) {
  return [1, 2].map((run) => {
    const report = readJson(join(dir, 'probe-home', `eager-probe-home-normal-r${run}.json`));
    if (metric === 'readyMs') return report.atDeadline.readyAtMs;
    const revealed = report.atDeadline.liveStates.find((state) => state.value === 'revealed');
    return revealed?.t ?? null;
  });
}

function verdict(before, after) {
  const beforeMedian = median(before);
  const afterMedian = median(after);
  if (beforeMedian === null || afterMedian === null) {
    return { beforeMedian, afterMedian, delta: null, limit: null, keep: null };
  }
  const delta = beforeMedian - afterMedian;
  const limit = Math.max(spread(before), spread(after));
  return { beforeMedian, afterMedian, delta, limit, keep: delta > limit };
}

function row(metric, before, after) {
  const result = verdict(before, after);
  const decision = result.keep === null ? 'NO DATA' : result.keep ? 'KEEP' : 'no measurable win';
  return `| ${metric} | ${format(result.beforeMedian)} | ${format(spread(before))} | ${format(
    result.afterMedian,
  )} | ${format(spread(after))} | ${format(result.delta)} | ${format(result.limit)} | ${decision} |`;
}

function classify(fn) {
  if (PLACEMENT.has(fn)) return 'placement';
  if (PROGRAM_SETUP.has(fn)) return 'program setup';
  if (fn === '(garbage collector)') return 'GC';
  return 'other';
}

function split(task) {
  const totals = { placement: 0, 'program setup': 0, GC: 0, other: 0 };
  for (const entry of task.topFunctions) totals[classify(entry.fn)] += entry.selfMs;
  const total = Object.values(totals).reduce((sum, value) => sum + value, 0);
  return { totals, total };
}

function splitRow(label, task) {
  const { totals, total } = split(task);
  const cells = ['placement', 'program setup', 'GC', 'other'].map((name) => {
    const value = totals[name];
    return `${format(value)} (${format(total === 0 ? null : (value / total) * 100)}%)`;
  });
  return `| ${label} | ${format(task.durMs)} | ${cells.join(' | ')} |`;
}

function splitRows(label, reports) {
  const lines = [];
  for (const [index, report] of reports.entries()) {
    const frame = report.names.find((task) => task.name === 'first-content-frame');
    if (frame === undefined) {
      lines.push(`| ${label} r${index + 1} first-content-frame | n/a | n/a | n/a | n/a | n/a |`);
      continue;
    }
    lines.push(splitRow(`${label} r${index + 1} first-content-frame`, frame));
    // Neighbours within 120 ms on either side: the scene-mount commit before (E2), the
    // overlay placement task after (E1a).
    const windowStart = frame.startMs - 120;
    const windowEnd = frame.startMs + frame.durMs + 120;
    for (const task of report.names) {
      if (task.name !== 'unnamed' || task.durMs < 16.7) continue;
      if (task.startMs + task.durMs < windowStart || task.startMs > windowEnd) continue;
      lines.push(splitRow(`${label} r${index + 1} unnamed @ ${format(task.startMs)} ms`, task));
    }
  }
  return lines;
}

const beforeDir = resolve(process.argv[2] ?? '');
const afterDir = resolve(process.argv[3] ?? '');
if (!process.argv[2] || !process.argv[3]) {
  console.error('usage: node ab-table.mjs <before-dir> <after-dir>');
  process.exit(2);
}

const beforeFps = fpsReports(beforeDir);
const afterFps = fpsReports(afterDir);
const lines = [
  '# Local A/B',
  '',
  `Before: ${beforeDir}`,
  `After: ${afterDir}`,
  '',
  'Local emulation only. The keep rule is `before median - after median > the larger run spread`.',
  '',
  '| Metric | Before median | Before spread | After median | After spread | Delta | Spread limit | Keep rule |',
  '| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |',
  row('eager simulated TBT /home (ms)', tbtValues(beforeDir), tbtValues(afterDir)),
];

for (const name of NAMED) {
  lines.push(row(`${name} /home (ms)`, namedValues(beforeDir, name), namedValues(afterDir, name)));
}
lines.push(
  row(
    'unnamedMaxMs /home (ms)',
    beforeFps.map((report) => report.unnamedMaxMs),
    afterFps.map((report) => report.unnamedMaxMs),
  ),
  row(
    'dropped frames trace-only /home',
    beforeFps.map((report) => report.droppedFrames),
    afterFps.map((report) => report.droppedFrames),
  ),
  row('probe ready /home (ms)', probeValues(beforeDir, 'readyMs'), probeValues(afterDir, 'readyMs')),
  row(
    'probe revealed /home (ms)',
    probeValues(beforeDir, 'revealedMs'),
    probeValues(afterDir, 'revealedMs'),
  ),
  '',
  '## First-content-frame self-time split',
  '',
  'Shares use the captured self time in the `--names` report (its top eight entries).',
  '',
  '| Task | Duration ms | Placement | Program setup | GC | Other |',
  '| --- | ---: | ---: | ---: | ---: | ---: |',
  ...splitRows('before cpu1', beforeFps),
  ...splitRows('after cpu1', afterFps),
  ...splitRows('before cpu4', optionalFpsReports(beforeDir, 'fps-home-cpu4')),
  ...splitRows('after cpu4', optionalFpsReports(afterDir, 'fps-home-cpu4')),
);

console.log(lines.join('\n'));
