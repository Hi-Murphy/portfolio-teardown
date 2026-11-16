#!/usr/bin/env node
// RFC R11: classify every matrix cell by whether repeated base runs agree with each other.
// usage: node stable-cells.mjs <run1> <run2> [<run3> ...] --out <stable.json>
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const repo = resolve(scriptDirectory, '../../..');
const { compareRgba, decodePng } = await import(
  pathToFileURL(resolve(repo, 'tools/perf/src/png.ts')).href
);

const argv = process.argv.slice(2);
const outIndex = argv.indexOf('--out');
const out = outIndex < 0 ? undefined : argv[outIndex + 1];
const runs = argv.filter((_, index) => index !== outIndex && index !== outIndex + 1).map((run) => resolve(run));

if (out === undefined || runs.length < 2) {
  console.error('usage: node stable-cells.mjs <run1> <run2> [<run3> ...] --out <stable.json>');
  process.exit(2);
}

function readCells(directory) {
  return new Map(
    readFileSync(join(directory, 'cells.jsonl'), 'utf8')
      .split('\n')
      .filter(Boolean)
      .map((line) => {
        const cell = JSON.parse(line);
        return [cell.cellId, cell];
      }),
  );
}

const cellMaps = runs.map(readCells);
const [first, ...rest] = cellMaps;
const cells = {};
let pxStableCount = 0;
let domStableCount = 0;
let compared = 0;

for (const [cellId, reference] of first) {
  if (reference.sweepOnly === true) continue;
  compared += 1;

  const referenceImage = decodePng(readFileSync(join(runs[0], `${cellId}.png`)));
  let maxPx = 0;
  let px = true;
  let dom = true;

  rest.forEach((cellMap, index) => {
    const other = cellMap.get(cellId);

    if (other === undefined) {
      px = false;
      dom = false;
      return;
    }

    const differing = compareRgba(
      referenceImage,
      decodePng(readFileSync(join(runs[index + 1], `${cellId}.png`))),
    );

    maxPx = Math.max(maxPx, differing);
    if (differing !== 0) px = false;
    if (other.dom !== reference.dom) dom = false;
  });

  if (px) pxStableCount += 1;
  if (dom) domStableCount += 1;
  cells[cellId] = { px, dom, maxPx };
}

writeFileSync(
  resolve(out),
  `${JSON.stringify({ runs: runs.map((run) => run.split('/').pop()), compared, pxStable: pxStableCount, domStable: domStableCount, cells }, null, 2)}\n`,
);
console.log(
  `stable-cells: ${compared} cells over ${runs.length} runs; pixel-stable ${pxStableCount}, DOM-stable ${domStableCount}, pixel-unstable ${compared - pxStableCount}`,
);
