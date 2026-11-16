#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs';
import { basename, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

export const DEPTH_PX = 1 / 64;

// This is a deliberate, arithmetic-for-arithmetic mirror of
// packages/xploder/src/labels/sweep.ts quadsIntersect: unit edge normals for both
// quads, projected ranges, and strict overlap only when every axis exceeds 1/64 px.
function axes(quad) {
  const result = [];

  for (let index = 0; index < quad.length; index += 1) {
    const from = quad[index];
    const to = quad[(index + 1) % quad.length];

    if (from === undefined || to === undefined) continue;

    const x = -(to[1] - from[1]);
    const y = to[0] - from[0];
    const length = Math.hypot(x, y);

    if (length === 0) continue;

    result.push([x / length, y / length]);
  }

  return result;
}

function projectedRange(quad, axis) {
  let minimum = Infinity;
  let maximum = -Infinity;

  for (const point of quad) {
    const value = point[0] * axis[0] + point[1] * axis[1];

    minimum = Math.min(minimum, value);
    maximum = Math.max(maximum, value);
  }

  return [minimum, maximum];
}

export function pairOverlap(a, b, depthPx = DEPTH_PX) {
  const axesA = axes(a);
  const axesB = axes(b);

  if (axesA.length === 0 || axesB.length === 0) return null;

  let depth = Infinity;
  for (const axis of [...axesA, ...axesB]) {
    const [aMin, aMax] = projectedRange(a, axis);
    const [bMin, bMax] = projectedRange(b, axis);
    const overlap = Math.min(aMax, bMax) - Math.max(aMin, bMin);

    if (overlap <= depthPx) return null;
    depth = Math.min(depth, overlap);
  }

  return depth;
}

export function quadsIntersect(a, b, depthPx = DEPTH_PX) {
  return pairOverlap(a, b, depthPx) !== null;
}

export function sweepEntries(entries, depthPx = DEPTH_PX) {
  const painted = entries.filter((entry) => entry.painted);
  const pairs = [];

  for (let left = 0; left < painted.length; left += 1) {
    const a = painted[left];
    if (a === undefined) continue;

    for (let right = left + 1; right < painted.length; right += 1) {
      const b = painted[right];
      if (b === undefined) continue;

      const depth = pairOverlap(a.quad, b.quad, depthPx);
      if (depth === null) continue;

      pairs.push({ a, b, depth });
    }
  }

  return { painted, pairs };
}

const pairJson = (pair) => ({
  a: { marker: pair.a.marker, key: pair.a.key, quad: pair.a.quad },
  b: { marker: pair.b.marker, key: pair.b.key, quad: pair.b.quad },
  depth: pair.depth,
});

const pairKey = (pair) => `${pair.a.key ?? '-'} × ${pair.b.key ?? '-'}`;

const kindLabel = (entry) => `${entry.marker}:${entry.kind ?? '-'}`;

function cellTotals(cells) {
  return {
    cells: cells.length,
    labels: cells.reduce((total, cell) => total + cell.painted.length, 0),
    pairsTested: cells.reduce(
      (total, cell) => total + (cell.painted.length * (cell.painted.length - 1)) / 2,
      0,
    ),
    cellsWithHits: cells.filter((cell) => cell.pairs.length > 0).length,
    hitPairs: cells.reduce((total, cell) => total + cell.pairs.length, 0),
  };
}

function markdownCode(value) {
  return `\`${String(value).replaceAll('`', '\\`').replaceAll('|', '\\|')}\``;
}

function totalsTable(cells, title) {
  const totals = cellTotals(cells);
  return [
    `## ${title}`,
    '',
    `- Cells: ${totals.cells}`,
    `- Painted labels: ${totals.labels}`,
    `- Pairs tested: ${totals.pairsTested}`,
    `- Cells with hits: ${totals.cellsWithHits}`,
    `- Hit pairs: ${totals.hitPairs}`,
    '',
  ];
}

function markdownSummary(run, cells) {
  const lines = [`# Label sweep — ${run}`, ''];
  lines.push(...totalsTable(cells, 'Totals'));

  const hitCells = cells.filter((cell) => cell.pairs.length > 0);
  lines.push('| cell | hits | pair keys |', '|---|---:|---|');
  if (hitCells.length === 0) lines.push('| - | 0 | - |');
  for (const cell of hitCells) {
    lines.push(
      `| ${markdownCode(cell.cellId)} | ${cell.pairs.length} | ${cell.pairs
        .map((pair) => markdownCode(pairKey(pair)))
        .join('<br>')} |`,
    );
  }
  lines.push('');

  const kinds = new Map();
  for (const cell of cells) {
    for (const pair of cell.pairs) {
      const kind = `${kindLabel(pair.a)} × ${kindLabel(pair.b)}`;
      kinds.set(kind, (kinds.get(kind) ?? 0) + 1);
    }
  }
  lines.push('## Hit counts by pair kind', '');
  lines.push('| a | b | hits |', '|---|---|---:|');
  if (kinds.size === 0) lines.push('| - | - | 0 |');
  for (const [kind, count] of [...kinds].sort((left, right) => right[1] - left[1])) {
    const [a, b] = kind.split(' × ');
    lines.push(`| ${markdownCode(a)} | ${markdownCode(b)} | ${count} |`);
  }
  lines.push('');

  lines.push('## AC1-named subset (zoom indexes 0, 3, 5)', '');
  lines.push('| zoom index | cells | Painted labels | Pairs tested | Cells with hits | Hit pairs |');
  lines.push('|---:|---:|---:|---:|---:|---:|');
  for (const zoomIndex of [0, 3, 5]) {
    const subset = cells.filter((cell) => cell.zoomIndex === zoomIndex);
    const totals = cellTotals(subset);
    lines.push(
      `| ${zoomIndex} | ${totals.cells} | ${totals.labels} | ${totals.pairsTested} | ${totals.cellsWithHits} | ${totals.hitPairs} |`,
    );
  }
  const named = cells.filter((cell) => [0, 3, 5].includes(cell.zoomIndex));
  const namedTotals = cellTotals(named);
  lines.push(
    `| total | ${namedTotals.cells} | ${namedTotals.labels} | ${namedTotals.pairsTested} | ${namedTotals.cellsWithHits} | ${namedTotals.hitPairs} |`,
  );
  lines.push('');

  const totals = cellTotals(cells);
  lines.push(
    totals.hitPairs === 0
      ? `sweep: PASS (0 intersections in ${totals.cells} cells)`
      : `sweep: FAIL (${totals.hitPairs} intersections in ${totals.cellsWithHits} cells)`,
  );
  return { markdown: `${lines.join('\n')}\n`, totals };
}

function usage() {
  console.error('usage: node label-sweep.mjs <runDir> [--json <out.json>]');
  process.exit(2);
}

function main() {
  const argv = process.argv.slice(2);
  const positional = [];
  let jsonPath = null;

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === '--json') {
      const value = argv[index + 1];
      if (value === undefined || value.startsWith('--')) usage();
      jsonPath = resolve(value);
      index += 1;
    } else if (argument.startsWith('--')) {
      usage();
    } else {
      positional.push(argument);
    }
  }

  if (positional.length !== 1) usage();

  const runDir = resolve(positional[0]);
  const run = basename(runDir);
  const cells = readFileSync(resolve(runDir, 'cells.jsonl'), 'utf8')
    .split('\n')
    .filter(Boolean)
    .map((line) => JSON.parse(line))
    .map((cell) => {
      const { painted, pairs } = sweepEntries(cell.quads);
      return { ...cell, painted, pairs };
    });
  const totals = cellTotals(cells);
  const { markdown } = markdownSummary(run, cells);

  if (jsonPath !== null) {
    const cellRecords = {};
    for (const cell of cells) {
      cellRecords[cell.cellId] = {
        hits: cell.pairs.length,
        sweepOnly: cell.sweepOnly === true,
        pairs: cell.pairs.map(pairJson),
        labels: cell.painted.length,
      };
    }
    writeFileSync(
      jsonPath,
      `${JSON.stringify({ run, cells: cellRecords, totals }, null, 2)}\n`,
    );
  }

  process.stdout.write(markdown);
  if (totals.hitPairs > 0) process.exitCode = 6;
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main();
}
