#!/usr/bin/env node
// S17 copy of ../label-system/bundle-gzip.mjs; AC5 budget is 1.5 KB.
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { relative, resolve, sep } from 'node:path';
import { gzipSync } from 'node:zlib';

const BUDGET = 1536;

function usage() {
  console.error(
    'usage: node bundle-gzip.mjs [--write <file.json>] <outDir> | --diff <before.json> <outDir>',
  );
  process.exit(2);
}

function javascriptFiles(root) {
  const staticRoot = resolve(root, '_next/static');
  if (!existsSync(staticRoot)) throw new Error(`missing static export directory: ${staticRoot}`);
  const files = [];
  const walk = (directory) => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const absolute = resolve(directory, entry.name);
      if (entry.isDirectory()) walk(absolute);
      else if (entry.isFile() && entry.name.endsWith('.js')) files.push(absolute);
    }
  };
  walk(staticRoot);
  return files.sort((left, right) => {
    const leftPath = relative(root, left).split(sep).join('/');
    const rightPath = relative(root, right).split(sep).join('/');
    return leftPath < rightPath ? -1 : leftPath > rightPath ? 1 : 0;
  });
}

function manifest(root) {
  const files = javascriptFiles(root).map((file) => {
    const bytes = readFileSync(file);
    return {
      path: relative(root, file).split(sep).join('/'),
      bytes: bytes.byteLength,
      gzip: gzipSync(bytes, { level: 9 }).byteLength,
    };
  });
  return {
    outDir: root,
    files,
    totalBytes: files.reduce((total, file) => total + file.bytes, 0),
    totalGzip: files.reduce((total, file) => total + file.gzip, 0),
  };
}

function printTotals(result) {
  console.log(`OUT ${result.outDir}`);
  console.log(`FILES ${result.files.length}`);
  console.log(`RAW-TOTAL ${result.totalBytes} B`);
  console.log(`GZIP-TOTAL ${result.totalGzip} B`);
}

const args = process.argv.slice(2);
if (args.length === 0) usage();

if (args[0] === '--write') {
  if (args.length !== 3) usage();
  const output = resolve(args[1]);
  const root = resolve(args[2]);
  const result = manifest(root);
  writeFileSync(output, `${JSON.stringify(result, null, 2)}\n`);
  printTotals(result);
} else if (args[0] === '--diff') {
  if (args.length !== 3) usage();
  const before = JSON.parse(readFileSync(resolve(args[1]), 'utf8'));
  const beforeFiles = new Map((before.files ?? []).map((file) => [file.path, file]));
  const after = manifest(resolve(args[2]));
  const afterFiles = new Map(after.files.map((file) => [file.path, file]));

  const added = [...afterFiles.keys()].filter((path) => !beforeFiles.has(path)).sort();
  const removed = [...beforeFiles.keys()].filter((path) => !afterFiles.has(path)).sort();
  const changed = [...afterFiles.keys()]
    .filter(
      (path) => beforeFiles.has(path) && beforeFiles.get(path).gzip !== afterFiles.get(path).gzip,
    )
    .sort();

  for (const path of added) console.log(`ADDED ${path}`);
  for (const path of removed) console.log(`REMOVED ${path}`);
  for (const path of changed) {
    console.log(`CHANGED ${path} ${beforeFiles.get(path).gzip} -> ${afterFiles.get(path).gzip} B`);
  }

  const delta = after.totalGzip - Number(before.totalGzip ?? 0);
  const sign = delta >= 0 ? '+' : '';
  const pass = delta <= BUDGET;
  console.log(
    `GZIP-TOTAL ${Number(before.totalGzip ?? 0)} -> ${after.totalGzip} (${sign}${delta} B) budget ${BUDGET}: ${pass ? 'PASS' : 'FAIL'}`,
  );
  if (!pass) process.exit(6);
} else {
  if (args.length !== 1) usage();
  printTotals(manifest(resolve(args[0])));
}
