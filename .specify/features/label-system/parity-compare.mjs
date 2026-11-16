#!/usr/bin/env node
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const repo = resolve(scriptDirectory, '../../..');
const { compareRgba, decodePng, diffRgbaMask, encodeGrayscalePng } = await import(
  pathToFileURL(resolve(repo, 'tools/perf/src/png.ts')).href
);

function usage() {
  console.error(
    'usage: node parity-compare.mjs <runA> <runB> [--base-sweep <sweep.json>] [--stable <stable.json>]',
  );
  process.exit(2);
}

const argv = process.argv.slice(2);
const positional = [];
let baseSweepFile = null;
let stableFile = null;
for (let index = 0; index < argv.length; index += 1) {
  if (argv[index] === '--base-sweep') {
    baseSweepFile = argv[index + 1];
    if (baseSweepFile === undefined || baseSweepFile.startsWith('--')) usage();
    index += 1;
  } else if (argv[index] === '--stable') {
    stableFile = argv[index + 1];
    if (stableFile === undefined || stableFile.startsWith('--')) usage();
    index += 1;
  } else if (argv[index].startsWith('--')) {
    usage();
  } else {
    positional.push(argv[index]);
  }
}

const [runAArg, runBArg] = positional;
if (!runAArg || !runBArg) usage();
const runA = resolve(runAArg);
const runB = resolve(runBArg);
const baseSweep =
  baseSweepFile === null ? null : JSON.parse(readFileSync(resolve(baseSweepFile), 'utf8'));
// RFC R11: with --stable, 0 px / DOM identity is required only where the base itself is stable
// across its repeated runs; base-unstable cells are listed, never counted as PASS evidence.
const stable =
  stableFile === null ? null : JSON.parse(readFileSync(resolve(stableFile), 'utf8'));

function readCells(directory) {
  const lines = readFileSync(join(directory, 'cells.jsonl'), 'utf8')
    .split('\n')
    .filter(Boolean);
  return new Map(lines.map((line) => {
    const cell = JSON.parse(line);
    return [cell.cellId, cell];
  }));
}

function normaliseUseIds(value) {
  return value.replace(/«[rR][^»]*»|:[rR]\d[0-9a-zA-Z]*:/g, '«react-id»');
}

function sameQuad(left, right, epsilon = 1e-6) {
  if (!Array.isArray(left) || !Array.isArray(right) || left.length !== right.length) return false;
  return left.every((point, index) =>
    point.length === 2 &&
    right[index]?.length === 2 &&
    Math.abs(point[0] - right[index][0]) <= epsilon &&
    Math.abs(point[1] - right[index][1]) <= epsilon,
  );
}

function bounds(quad) {
  const xs = quad.map((point) => point[0]);
  const ys = quad.map((point) => point[1]);
  return {
    left: Math.min(...xs),
    top: Math.min(...ys),
    right: Math.max(...xs),
    bottom: Math.max(...ys),
  };
}

function overlapsBox(left, right) {
  return left.left < right.right && left.right > right.left && left.top < right.bottom && left.bottom > right.top;
}

function clusters(image, mask) {
  const visited = new Uint8Array(mask.byteLength);
  const found = [];
  const width = image.width;
  const height = image.height;
  for (let start = 0; start < mask.byteLength; start += 1) {
    if (mask[start] === 0 || visited[start] !== 0) continue;
    const stack = [start];
    visited[start] = 1;
    let count = 0;
    let left = width;
    let top = height;
    let right = -1;
    let bottom = -1;
    while (stack.length > 0) {
      const pixel = stack.pop();
      const x = pixel % width;
      const y = Math.floor(pixel / width);
      count += 1;
      left = Math.min(left, x);
      top = Math.min(top, y);
      right = Math.max(right, x);
      bottom = Math.max(bottom, y);
      for (let dy = -1; dy <= 1; dy += 1) {
        for (let dx = -1; dx <= 1; dx += 1) {
          if (dx === 0 && dy === 0) continue;
          const nextX = x + dx;
          const nextY = y + dy;
          if (nextX < 0 || nextY < 0 || nextX >= width || nextY >= height) continue;
          const next = nextY * width + nextX;
          if (mask[next] !== 0 && visited[next] === 0) {
            visited[next] = 1;
            stack.push(next);
          }
        }
      }
    }
    found.push({ bbox: [left, top, right, bottom], pixels: count });
  }
  return found;
}

function quadKey(entry) {
  return `${entry.marker}\0${entry.key ?? ''}`;
}

function changedLabels(oldCell, newCell) {
  const oldEntries = (oldCell?.quads ?? []).filter((entry) => entry.painted && entry.quad !== null);
  const newEntries = new Map(
    (newCell?.quads ?? [])
      .filter((entry) => entry.quad !== null)
      .map((entry) => [quadKey(entry), entry]),
  );
  return oldEntries.flatMap((oldEntry) => {
    const newEntry = newEntries.get(quadKey(oldEntry));
    if (newEntry === undefined) return [{ key: oldEntry.key, marker: oldEntry.marker, oldQuad: oldEntry.quad, newQuad: null }];
    if (newEntry.painted !== oldEntry.painted || !sameQuad(oldEntry.quad, newEntry.quad)) {
      return [{ key: oldEntry.key, marker: oldEntry.marker, oldQuad: oldEntry.quad, newQuad: newEntry.quad }];
    }
    return [];
  });
}

const cellsA = readCells(runA);
const cellsB = readCells(runB);
let totalPixels = 0;
let compared = 0;
let pass = true;
const rows = [];
const clusterDetails = [];
const sweepOnly = [];
const unstable = [];

mkdirSync(join(runB, 'diff'), { recursive: true });

for (const [cellId, cellA] of cellsA) {
  if (cellA.sweepOnly === true) {
    sweepOnly.push(cellId);
    rows.push(`| \`${cellId}\` | sweep-only | sweep-only | - |`);
    continue;
  }
  compared += 1;
  const cellB = cellsB.get(cellId);
  if (cellB === undefined) {
    pass = false;
    rows.push(`| \`${cellId}\` | missing | FAIL | - |`);
    continue;
  }

  let differing = 0;
  let cellClusters = [];
  let image = null;
  let mask = null;
  try {
    const imageA = decodePng(readFileSync(join(runA, `${cellId}.png`)));
    const imageB = decodePng(readFileSync(join(runB, `${cellId}.png`)));
    differing = compareRgba(imageA, imageB);
    totalPixels += differing;
    if (differing > 0) {
      image = imageA;
      mask = diffRgbaMask(imageA, imageB);
      cellClusters = clusters(image, mask);
      writeFileSync(join(runB, 'diff', `${cellId}.png`), encodeGrayscalePng(image.width, image.height, mask));
    }
  } catch (error) {
    differing = -1;
    pass = false;
    console.error(`# ${cellId}: ${error instanceof Error ? error.message : String(error)}`);
  }

  const rawDom = cellA.dom === cellB.dom;
  const normalisedDom =
    normaliseUseIds(cellA.dom ?? '') === normaliseUseIds(cellB.dom ?? '');
  const hits = Number(baseSweep?.cells?.[cellId]?.hits ?? 0);
  const stableCell = stable === null ? { px: true, dom: true } : stable.cells?.[cellId];
  if (stableCell === undefined) {
    pass = false;
    console.error(`# ${cellId}: missing from the stable set`);
  }
  const pxStable = stableCell?.px === true;
  const domStable = stableCell?.dom === true;
  if (!pxStable || !domStable) unstable.push({ cellId, px: differing, pxStable, domStable });

  if (baseSweep === null) {
    if ((pxStable && differing !== 0) || (domStable && !normalisedDom)) pass = false;
  } else {
    if (pxStable && hits === 0 && differing !== 0) pass = false;
    if (cellClusters.length > 0) {
      const changed = changedLabels(cellA, cellB);
      for (const cluster of cellClusters) {
        const box = {
          left: cluster.bbox[0],
          top: cluster.bbox[1],
          right: cluster.bbox[2] + 1,
          bottom: cluster.bbox[3] + 1,
        };
        const candidates = changed.filter((label) => {
          const oldBox = bounds(label.oldQuad);
          const newBox = label.newQuad === null ? null : bounds(label.newQuad);
          return overlapsBox(box, oldBox) || (newBox !== null && overlapsBox(box, newBox));
        });
        if (candidates.length === 0 && pxStable) pass = false;
        const pairs = (baseSweep?.cells?.[cellId]?.pairs ?? []).filter((pair) =>
          candidates.some((candidate) => JSON.stringify(pair).includes(String(candidate.key))),
        );
        clusterDetails.push({
          cellId,
          bbox: cluster.bbox,
          pixels: cluster.pixels,
          hits,
          candidates,
          basePair: pairs.length === 0 ? null : pairs.slice(0, 2),
        });
      }
    }
  }

  const pixelText = differing < 0 ? 'decode-error' : String(differing);
  const stability = pxStable && domStable ? 'stable' : `base-unstable (${pxStable ? 'px ok' : 'px'}${domStable ? '' : ', dom'})`;
  rows.push(
    `| \`${cellId}\` | ${pixelText} | ${rawDom ? 'PASS' : 'FAIL'} / ${normalisedDom ? 'PASS' : 'FAIL'} | ${cellClusters.length} | ${stability} |`,
  );
}

console.log('| cell | px | DOM raw / normalised | clusters | base stability |');
console.log('|---|---:|---|---:|---|');
for (const row of rows) console.log(row);

if (sweepOnly.length > 0) {
  console.log(`\nSweep-only cells (${sweepOnly.length}): ${sweepOnly.map((id) => `\`${id}\``).join(', ')}`);
}

if (stable !== null) {
  const pxUnstable = unstable.filter((cell) => !cell.pxStable);
  const domOnly = unstable.filter((cell) => cell.pxStable && !cell.domStable);
  console.log(
    `\nBase-unstable cells (RFC R11): ${pxUnstable.length} pixel-unstable (not decidable by pixels; covered by the T002 oracle), ${domOnly.length} DOM-number-unstable only (pixels still required 0 px).`,
  );
  for (const cell of pxUnstable) console.log(`- \`${cell.cellId}\`: ${cell.px} px vs base`);
}

if (baseSweep !== null && clusterDetails.length > 0) {
  console.log('\n## Cluster attribution\n');
  for (const cluster of clusterDetails) {
    if (cluster.candidates.length === 0) {
      console.log(
        `- \`${cluster.cellId}\` bbox ${JSON.stringify(cluster.bbox)} (${cluster.pixels} px, base hits ${cluster.hits}): UNATTRIBUTED`,
      );
      continue;
    }
    for (const candidate of cluster.candidates) {
      console.log(
        `- \`${cluster.cellId}\` bbox ${JSON.stringify(cluster.bbox)} (${cluster.pixels} px, base hits ${cluster.hits}): \`${candidate.key}\` old ${JSON.stringify(candidate.oldQuad)} new ${candidate.newQuad === null ? 'hidden' : JSON.stringify(candidate.newQuad)} base pair ${cluster.basePair === null ? 'none' : JSON.stringify(cluster.basePair)}`,
      );
    }
  }
}

console.log(
  `\nparity: ${pass ? 'PASS' : 'FAIL'} (${compared} cells, ${totalPixels} px)`,
);
process.exit(pass ? 0 : 6);
