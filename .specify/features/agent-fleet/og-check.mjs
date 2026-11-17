#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { readFile, readdir, writeFile } from 'node:fs/promises';
import { join, relative } from 'node:path';

const EXPECTED_COUNT = 5;
const EXPECTED_WIDTH = 1200;
const EXPECTED_HEIGHT = 630;
const MAX_BYTES = 307_200;
const BASE_STABLE_PATHS = [
  'og/projects/websocket-inspector.png',
  'og/projects/jev-toolkit.png',
];

function usage() {
  console.error('usage: node og-check.mjs <out1> <out2> <baseOut> <logPath>');
  process.exit(2);
}

async function pngFiles(directory) {
  const files = [];

  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await pngFiles(path)));
    else if (entry.isFile() && entry.name.endsWith('.png')) files.push(path);
  }

  return files.sort();
}

function sha256(buffer) {
  return createHash('sha256').update(buffer).digest('hex');
}

async function main() {
  const [out1, out2, baseOut, logPath] = process.argv.slice(2);
  if ([out1, out2, baseOut, logPath].some((value) => value === undefined)) usage();

  const ogDirectory = join(out1, 'og');
  const files = await pngFiles(ogDirectory);
  const lines = [];
  let pass = files.length === EXPECTED_COUNT;

  lines.push(`count ${files.length} expected=${EXPECTED_COUNT} ${pass ? 'PASS' : 'FAIL'}`);

  for (const file of files) {
    const relativePath = relative(out1, file);
    const buffer = await readFile(file);
    const otherBuffer = await readFile(join(out2, relativePath));
    const width = buffer.readUInt32BE(16);
    const height = buffer.readUInt32BE(20);
    const hash = sha256(buffer);
    const otherHash = sha256(otherBuffer);
    const dimensionsPass = width === EXPECTED_WIDTH && height === EXPECTED_HEIGHT;
    const sizePass = buffer.length <= MAX_BYTES;
    const buildsPass = hash === otherHash;
    pass &&= dimensionsPass && sizePass && buildsPass;
    lines.push(
      `${relativePath} width=${width} height=${height} bytes=${buffer.length} sha256=${hash} out2-sha256=${otherHash} dimensions=${dimensionsPass ? 'PASS' : 'FAIL'} size=${sizePass ? 'PASS' : 'FAIL'} builds=${buildsPass ? 'PASS' : 'FAIL'}`,
    );
  }

  for (const relativePath of BASE_STABLE_PATHS) {
    const head = await readFile(join(out1, relativePath));
    const base = await readFile(join(baseOut, relativePath));
    const headHash = sha256(head);
    const baseHash = sha256(base);
    const identical = headHash === baseHash;
    pass &&= identical;
    lines.push(
      `base ${relativePath} sha256=${headHash} base-sha256=${baseHash} ${identical ? 'PASS' : 'FAIL'}`,
    );
  }

  lines.push(`og ${pass ? 'PASS' : 'FAIL'}`);
  const log = `${lines.join('\n')}\n`;
  await writeFile(logPath, log);
  process.stdout.write(log);
  if (!pass) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
