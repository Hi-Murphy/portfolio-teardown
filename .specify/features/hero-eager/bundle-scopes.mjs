#!/usr/bin/env node
import { readFile, readdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { gzipSync } from 'node:zlib';

const SCOPE_ORDER = ['home initial', 'project initial', 'total', 'non-initial 3D'];
const ROUTES = [
  ['home initial', '/'],
  ['project initial', '/projects/websocket-inspector'],
];
const INITIAL_GZIP_LIMIT = 2000;
const TOTAL_LIMIT_PERCENT = 1;
const TOTAL_LIMIT_PERCENT_S11_8 = 0.5;

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

function withinTotalBudget(delta, beforeBytes, totalLimitPercent) {
  return delta * 100 <= beforeBytes * totalLimitPercent;
}

function printBudget(
  before,
  after,
  beforeManifest,
  beforeOut,
  afterManifest,
  afterOut,
  totalLimitPercent = TOTAL_LIMIT_PERCENT,
) {
  console.log(`Bundle scope budget: ${beforeManifest} + ${beforeOut} -> ${afterManifest} + ${afterOut}`);
  console.log(
    `${'Metric'.padEnd(24)} ${'Before'.padStart(11)} ${'After'.padStart(11)} ${'Delta'.padStart(
      11,
    )} ${'Limit'.padStart(11)} Result`,
  );

  const rows = [
    ['home initial raw', 'home initial', 'raw', null],
    ['home initial gzip', 'home initial', 'gzip', 'initial gzip'],
    ['project initial raw', 'project initial', 'raw', null],
    ['project initial gzip', 'project initial', 'gzip', 'initial gzip'],
    ['total raw', 'total', 'raw', totalLimitPercent === TOTAL_LIMIT_PERCENT ? 'total' : null],
    ['total gzip', 'total', 'gzip', 'total'],
    ['non-initial 3D raw', 'non-initial 3D', 'raw', null],
    ['non-initial 3D gzip', 'non-initial 3D', 'gzip', null],
  ];

  let failed = false;
  for (const [label, scopeName, metric, budget] of rows) {
    const beforeBytes = before.get(scopeName)[metric];
    const afterBytes = after.get(scopeName)[metric];
    const delta = afterBytes - beforeBytes;
    let limit = '-';
    let result = 'INFO';

    if (budget === 'initial gzip') {
      limit = `${INITIAL_GZIP_LIMIT} B`;
      result = delta <= INITIAL_GZIP_LIMIT ? 'PASS' : 'FAIL';
      if (result === 'FAIL') failed = true;
    } else if (budget === 'total') {
      limit = `${totalLimitPercent}%`;
      result = withinTotalBudget(delta, beforeBytes, totalLimitPercent) ? 'PASS' : 'FAIL';
      if (result === 'FAIL') failed = true;
    }

    console.log(
      `${label.padEnd(24)} ${String(beforeBytes).padStart(11)} ${String(afterBytes).padStart(
        11,
      )} ${String(delta).padStart(11)} ${limit.padStart(11)} ${result}`,
    );
  }

  console.log(
    failed
      ? 'RESULT: FAIL (a budgeted scope exceeded its byte budget)'
      : `RESULT: PASS (initial gzip delta <= ${INITIAL_GZIP_LIMIT} B; total delta <= ${totalLimitPercent}% of before)`,
  );
  return failed;
}

async function main() {
  const args = process.argv.slice(2);
  const budget = args[0] === '--budget';
  const budgetMode = budget && args[1] === 's11.8' ? 's11.8' : 'default';
  const paths = budget ? args.slice(budgetMode === 's11.8' ? 2 : 1) : args;
  const valid = budget ? paths.length === 4 : paths.length === 2 || paths.length === 4;
  if (!valid) {
    console.error(
      'usage: node bundle-scopes.mjs [--budget] <manifest.json> <out-dir> [<manifest.json> <out-dir>]',
    );
    return 2;
  }

  const before = await readScopes(paths[0], paths[1]);
  if (paths.length === 2) {
    printScopes(before, paths[0], paths[1]);
    return 0;
  }

  const after = await readScopes(paths[2], paths[3]);
  if (budget) {
    const totalLimitPercent = budgetMode === 's11.8' ? TOTAL_LIMIT_PERCENT_S11_8 : TOTAL_LIMIT_PERCENT;
    return printBudget(
      before,
      after,
      paths[0],
      paths[1],
      paths[2],
      paths[3],
      totalLimitPercent,
    )
      ? 1
      : 0;
  }
  return printDelta(before, after, paths[0], paths[1], paths[2], paths[3]) ? 1 : 0;
}

try {
  process.exitCode = await main();
} catch (error) {
  console.error(`error: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
}
