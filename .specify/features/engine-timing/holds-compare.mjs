import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const TOLERANCE_MS = 1000 / 60;
const separator = process.argv.indexOf('--');
if (separator < 0 || separator === 2 || separator === process.argv.length - 1) {
  console.error('usage: node holds-compare.mjs <baseFile...> -- <afterFile...>');
  process.exit(2);
}

const baseFiles = process.argv.slice(2, separator).map((path) => resolve(path));
const afterFiles = process.argv.slice(separator + 1).map((path) => resolve(path));

function median(values) {
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[middle - 1] + sorted[middle]) / 2
    : sorted[middle];
}

function spread(values) {
  return values.length === 0 ? null : Math.max(...values) - Math.min(...values);
}

function readRuns(path) {
  const text = readFileSync(path, 'utf8');
  const summaryLine = text
    .split('\n')
    .findLast((line) => line.startsWith('SUMMARY_JSON '));
  if (summaryLine === undefined) throw new Error(`${path}: SUMMARY_JSON missing`);
  const summaries = JSON.parse(summaryLine.slice('SUMMARY_JSON '.length));
  const tables = new Map();

  for (const line of text.split('\n')) {
    if (!line.startsWith('| ') || line.includes('---')) continue;
    const cells = line
      .split('|')
      .slice(1, -1)
      .map((cell) => cell.trim());
    if (cells.length < 4 || cells[0] === 'viewport') continue;
    const [viewport, phase, startText, endText] = cells;
    if (!/^\d+$/.test(phase) && !/^\d+(?:\.\d+)?$/.test(startText)) continue;
    const start = Number(startText);
    const end = Number(endText);
    if (!Number.isFinite(start) || !Number.isFinite(end)) continue;
    if (!tables.has(viewport)) tables.set(viewport, new Map());
    tables.get(viewport).set(phase, { start, end });
  }

  return summaries.map((summary) => ({
    ...summary,
    phases: tables.get(summary.viewport) ?? new Map(),
  }));
}

function metricsFor(run) {
  const metrics = [];
  for (const [phase, times] of run.phases) {
    metrics.push([`${phase} start`, times.start]);
    metrics.push([`${phase} end`, times.end]);
  }
  metrics.push(['explodedLabelsMs', run.explodedLabelsMs]);
  metrics.push(['zoomedLabelsMs', run.zoomedLabelsMs]);
  run.holdsMs.forEach((hold, index) => metrics.push([`hold ${index + 1}`, hold]));
  metrics.push(['loopMs', run.loopMs]);
  return metrics;
}

const base = baseFiles.flatMap(readRuns);
const after = afterFiles.flatMap(readRuns);
const viewports = [...new Set([...base, ...after].map((run) => run.viewport))].sort();
let pass = true;

console.log(
  '| viewport | metric | base median (ms) | after median (ms) | delta (ms) | base spread (ms) | after spread (ms) | verdict |',
);
console.log('|---|---|---:|---:|---:|---:|---:|---|');

for (const viewport of viewports) {
  const baseRuns = base.filter((run) => run.viewport === viewport);
  const afterRuns = after.filter((run) => run.viewport === viewport);
  const names = new Set([
    ...baseRuns.flatMap((run) => metricsFor(run).map(([name]) => name)),
    ...afterRuns.flatMap((run) => metricsFor(run).map(([name]) => name)),
  ]);

  for (const name of names) {
    const baseValues = baseRuns
      .map((run) => metricsFor(run).find(([metric]) => metric === name)?.[1])
      .filter((value) => value !== undefined);
    const afterValues = afterRuns
      .map((run) => metricsFor(run).find(([metric]) => metric === name)?.[1])
      .filter((value) => value !== undefined);
    const baseMedian = baseValues.length === 0 ? null : median(baseValues);
    const afterMedian = afterValues.length === 0 ? null : median(afterValues);
    const delta =
      baseMedian === null || afterMedian === null ? null : afterMedian - baseMedian;
    const cellPass = delta !== null && Math.abs(delta) <= TOLERANCE_MS;
    if (!cellPass) pass = false;
    const show = (value) => (value === null ? 'missing' : value.toFixed(2));
    const showSpread = (values) => {
      const value = spread(values);
      return value === null ? 'missing' : value.toFixed(2);
    };
    console.log(
      `| ${viewport} | ${name} | ${show(baseMedian)} | ${show(afterMedian)} | ${show(delta)} | ${showSpread(baseValues)} | ${showSpread(afterValues)} | ${cellPass ? 'PASS' : 'FAIL'} |`,
    );
  }
}

console.log(`HOLDS ${pass ? 'PASS' : 'FAIL'}`);
if (!pass) process.exitCode = 6;
