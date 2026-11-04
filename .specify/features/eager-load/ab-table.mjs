#!/usr/bin/env node
import { readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

const ROUTES = ['home', 'project'];

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

function invocationMedian(summary) {
  return median(summary.runs.map((run) => run.tbtMs));
}

function tbtValues(dir, route) {
  return [1, 2].map((run) =>
    invocationMedian(readJson(join(dir, `lh-${route}-r${run}`, 'lighthouse-summary.json'))),
  );
}

function fpsValues(dir, route, metric) {
  return [1, 2].map((run) => {
    const report = readJson(join(dir, `fps-${route}-r${run}`, 'fps.json'));
    if (report.frames !== 'trace-only') throw new Error(`${route} r${run}: fps mode is not trace-only`);
    return report[metric];
  });
}

function probeValues(dir, route, metric) {
  const probeDir = join(dir, `probe-${route}`);
  const files = readdirSync(probeDir)
    .filter((name) => name.endsWith('.json'))
    .sort();
  return files.map((name) => {
    const report = readJson(join(probeDir, name));
    if (metric === 'readyMs') return report.atDeadline.readyAtMs;
    const revealed = report.atDeadline.liveStates.find((state) => state.value === 'revealed');
    return revealed?.t ?? null;
  });
}

function format(value) {
  return value === null ? 'n/a' : value.toFixed(2);
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

const beforeDir = resolve(process.argv[2] ?? '');
const afterDir = resolve(process.argv[3] ?? '');
if (!process.argv[2] || !process.argv[3]) {
  console.error('usage: node ab-table.mjs <before-dir> <after-dir>');
  process.exit(2);
}

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
];

for (const route of ROUTES) {
  lines.push(row(`eager simulated TBT /${route} (ms)`, tbtValues(beforeDir, route), tbtValues(afterDir, route)));
  lines.push(row(`max long task /${route} (ms)`, fpsValues(beforeDir, route, 'maxLongTaskMs'), fpsValues(afterDir, route, 'maxLongTaskMs')));
  lines.push(row(`dropped frames trace-only /${route}`, fpsValues(beforeDir, route, 'droppedFrames'), fpsValues(afterDir, route, 'droppedFrames')));
  lines.push(row(`probe ready /${route} (ms)`, probeValues(beforeDir, route, 'readyMs'), probeValues(afterDir, route, 'readyMs')));
  lines.push(row(`probe revealed /${route} (ms)`, probeValues(beforeDir, route, 'revealedMs'), probeValues(afterDir, route, 'revealedMs')));
}

console.log(lines.join('\n'));
