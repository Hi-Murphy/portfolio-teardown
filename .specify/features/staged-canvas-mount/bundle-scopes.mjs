#!/usr/bin/env node
import { readFile, readdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { gzipSync } from 'node:zlib';

const SCOPE_ORDER = ['home initial', 'project initial', 'total', 'non-initial 3D'];
const ROUTES = [
  ['home initial', '/'],
  ['project initial', '/projects/websocket-inspector'],
];

function normalizePath(path) {
  return path.replace(/^\/+/, '');
}

function diskPath(outDir, buildId, path) {
  return resolve(outDir, normalizePath(path).replace('<build-id>', buildId));
}

async function findBuildId(outDir) {
  const staticDir = resolve(outDir, '_next', 'static');
  const entries = await readdir(staticDir, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const files = await readdir(join(staticDir, entry.name));
    if (files.includes('_buildManifest.js')) return entry.name;
  }

  throw new Error(`could not find a Next.js build id under ${staticDir}`);
}

async function sizes(outDir, buildId, paths) {
  let raw = 0;
  let gzip = 0;

  for (const path of paths) {
    const contents = await readFile(diskPath(outDir, buildId, path));
    raw += contents.length;
    gzip += gzipSync(contents, { level: 9 }).length;
  }

  return { files: paths.length, raw, gzip };
}

async function readScopes(manifestPath, outDir) {
  const manifest = JSON.parse(await readFile(resolve(manifestPath), 'utf8'));
  const buildId = await findBuildId(outDir);
  const emitted = new Map(manifest.files.map((file) => [normalizePath(file.path), file]));
  const routeScripts = new Map(manifest.routes.map((route) => [route.route, route.scripts]));

  const initial = [];
  for (const [label, route] of ROUTES) {
    const scripts = routeScripts.get(route);
    if (scripts === undefined) throw new Error(`manifest has no route ${route}`);
    initial.push([label, scripts.map(normalizePath)]);
  }

  const initialUnion = new Set(initial.flatMap(([, scripts]) => scripts));
  const nonInitial = [...emitted.keys()].filter((path) => !initialUnion.has(path));
  const scopes = new Map();

  for (const [label, scripts] of initial) {
    scopes.set(label, await sizes(outDir, buildId, scripts));
  }
  scopes.set('total', await sizes(outDir, buildId, [...emitted.keys()]));
  scopes.set('non-initial 3D', await sizes(outDir, buildId, nonInitial));

  return scopes;
}

function formatSizes(label, value) {
  return `${label.padEnd(17)} ${String(value.files).padStart(5)} ${String(value.raw).padStart(11)} ${String(
    value.gzip,
  ).padStart(11)}`;
}

function printScopes(scopes, manifestPath, outDir) {
  console.log(`Bundle scopes: ${manifestPath} + ${outDir}`);
  console.log(`${'Scope'.padEnd(17)} ${'Files'.padStart(5)} ${'Raw'.padStart(11)} ${'Gzip'.padStart(11)}`);
  for (const label of SCOPE_ORDER) console.log(formatSizes(label, scopes.get(label)));
}

function printDelta(before, after, beforeManifest, beforeOut, afterManifest, afterOut) {
  console.log(`Bundle scope delta: ${beforeManifest} + ${beforeOut} -> ${afterManifest} + ${afterOut}`);
  console.log(
    `${'Scope'.padEnd(17)} ${'Before raw'.padStart(11)} ${'After raw'.padStart(11)} ${'Raw delta'.padStart(
      11,
    )} ${'Before gzip'.padStart(11)} ${'After gzip'.padStart(11)} ${'Gzip delta'.padStart(11)}`,
  );

  let grew = false;
  for (const label of SCOPE_ORDER) {
    const oldScope = before.get(label);
    const newScope = after.get(label);
    const rawDelta = newScope.raw - oldScope.raw;
    const gzipDelta = newScope.gzip - oldScope.gzip;
    if (rawDelta > 0 || gzipDelta > 0) grew = true;
    console.log(
      `${label.padEnd(17)} ${String(oldScope.raw).padStart(11)} ${String(newScope.raw).padStart(
        11,
      )} ${String(rawDelta).padStart(11)} ${String(oldScope.gzip).padStart(11)} ${String(
        newScope.gzip,
      ).padStart(11)} ${String(gzipDelta).padStart(11)}`,
    );
  }

  console.log(
    grew
      ? 'RESULT: FAIL (at least one scope grew in raw or gzip bytes)'
      : 'RESULT: PASS (no scope grew in raw or gzip bytes)',
  );
  return grew;
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length !== 2 && args.length !== 4) {
    console.error('usage: node bundle-scopes.mjs <manifest.json> <out-dir> [<manifest.json> <out-dir>]');
    return 2;
  }

  const before = await readScopes(args[0], args[1]);
  if (args.length === 2) {
    printScopes(before, args[0], args[1]);
    return 0;
  }

  const after = await readScopes(args[2], args[3]);
  return printDelta(before, after, args[0], args[1], args[2], args[3]) ? 1 : 0;
}

try {
  process.exitCode = await main();
} catch (error) {
  console.error(`error: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
}
