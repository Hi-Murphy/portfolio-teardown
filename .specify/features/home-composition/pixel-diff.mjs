import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

import { compareRgba, decodePng } from '../../../tools/perf/src/png.ts';

const [leftDirArg, leftPrefix, rightDirArg, rightPrefix] = process.argv.slice(2);

if (
  leftDirArg === undefined ||
  leftPrefix === undefined ||
  rightDirArg === undefined ||
  rightPrefix === undefined
) {
  console.error('Usage: node pixel-diff.mjs <dirA> <prefixA> <dirB> <prefixB>');
  process.exit(2);
}

function pngs(dir, prefix) {
  const files = new Map();

  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.endsWith('.png') || !entry.name.startsWith(prefix)) {
      continue;
    }

    const suffix = entry.name.slice(prefix.length).replace(/^-/, '');
    files.set(suffix, resolve(dir, entry.name));
  }

  return files;
}

const leftDir = resolve(leftDirArg);
const rightDir = resolve(rightDirArg);
const left = pngs(leftDir, leftPrefix);
const right = pngs(rightDir, rightPrefix);
const names = [...new Set([...left.keys(), ...right.keys()])].sort();
let failed = false;
let total = 0;

for (const name of names) {
  const leftPath = left.get(name);
  const rightPath = right.get(name);

  if (leftPath === undefined || rightPath === undefined) {
    console.log(`${name}: missing (${leftPath === undefined ? 'left' : 'right'})`);
    failed = true;
    continue;
  }

  try {
    const differing = compareRgba(
      decodePng(readFileSync(leftPath)),
      decodePng(readFileSync(rightPath)),
    );
    total += differing;
    console.log(`${name}: ${differing} px`);
    if (differing > 0) failed = true;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.log(`${name}: error (${message})`);
    failed = true;
  }
}

if (names.length === 0) {
  console.log('pixel-diff: no matching PNG files');
  failed = true;
}

console.log(
  `pixel-diff: ${failed ? 'FAIL' : 'PASS'} (${names.length} files, ${total} differing px)`,
);
process.exitCode = failed ? 1 : 0;
