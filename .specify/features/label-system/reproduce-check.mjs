#!/usr/bin/env node
// RFC R12: a deterministic code change gives the same output for the same input, so a head cell
// that is byte-identical to SOME base run proves the head can produce the S15 output there.
// usage: node reproduce-check.mjs --stable <stable.json> --base <run> [--base <run> ...] --head <run> [--head <run> ...]
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const repo = resolve(scriptDirectory, '../../..');
const { compareRgba, decodePng } = await import(
  pathToFileURL(resolve(repo, 'tools/perf/src/png.ts')).href
);

const argv = process.argv.slice(2);
const bases = [];
const heads = [];
let stableFile = null;

for (let index = 0; index < argv.length; index += 2) {
  const value = argv[index + 1];

  if (value === undefined) break;
  if (argv[index] === '--base') bases.push(resolve(value));
  else if (argv[index] === '--head') heads.push(resolve(value));
  else if (argv[index] === '--stable') stableFile = resolve(value);
}

if (stableFile === null || bases.length === 0 || heads.length === 0) {
  console.error(
    'usage: node reproduce-check.mjs --stable <stable.json> --base <run>... --head <run>...',
  );
  process.exit(2);
}

const stable = JSON.parse(readFileSync(stableFile, 'utf8'));

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

const baseCells = bases.map(readCells);
const headCells = heads.map(readCells);
const images = new Map();

function image(run, cellId) {
  const key = `${run}\0${cellId}`;

  if (!images.has(key)) images.set(key, decodePng(readFileSync(join(run, `${cellId}.png`))));
  return images.get(key);
}

function same(baseIndex, headIndex, cellId, domStable) {
  const base = baseCells[baseIndex].get(cellId);
  const head = headCells[headIndex].get(cellId);

  if (base === undefined || head === undefined) return false;
  if (domStable && base.dom !== head.dom) return false;

  return compareRgba(image(bases[baseIndex], cellId), image(heads[headIndex], cellId)) === 0;
}

let gated = 0;
let reproduced = 0;
const failures = [];
const rows = [];

for (const [cellId, status] of Object.entries(stable.cells)) {
  if (!status.px && !status.dom) continue;
  gated += 1;

  // First head run against the first base run: the T005 comparison.
  if (same(0, 0, cellId, status.dom)) {
    reproduced += 1;
    continue;
  }

  let match = null;

  for (let headIndex = 0; headIndex < heads.length && match === null; headIndex += 1) {
    for (let baseIndex = 0; baseIndex < bases.length && match === null; baseIndex += 1) {
      if (same(baseIndex, headIndex, cellId, status.dom)) match = [baseIndex, headIndex];
    }
  }

  if (match === null) {
    failures.push(cellId);
    rows.push(`| \`${cellId}\` | ${status.px ? 'px' : '—'}${status.dom ? ' + dom' : ''} | none | FAIL |`);
  } else {
    reproduced += 1;
    rows.push(
      `| \`${cellId}\` | ${status.px ? 'px' : '—'}${status.dom ? ' + dom' : ''} | head \`${heads[match[1]].split('/').pop()}\` = base \`${bases[match[0]].split('/').pop()}\` | PASS |`,
    );
  }
}

console.log(
  `# reproduce-check | base runs: ${bases.map((run) => run.split('/').pop()).join(', ')} | head runs: ${heads.map((run) => run.split('/').pop()).join(', ')}`,
);
console.log('\nCells that differed in the first head run vs the first base run:\n');
console.log('| cell | gated on | identical pair found | verdict |');
console.log('|---|---|---|---|');
for (const row of rows) console.log(row);
console.log(
  `\nreproduce: ${failures.length === 0 ? 'PASS' : 'FAIL'} (${gated} gated cells, ${reproduced} reproduced, ${failures.length} never matched)`,
);
process.exit(failures.length === 0 ? 0 : 6);
