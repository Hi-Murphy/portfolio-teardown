#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, '../../..');
const require = createRequire(resolve(repo, 'tools/perf/package.json'));
const { chromium } = require('playwright');

const [baseUrlArg, headUrlArg, baseDirArg, headDirArg] = process.argv.slice(2);
if (!baseUrlArg || !headUrlArg || !baseDirArg || !headDirArg) {
  console.error('usage: node home-bytes.mjs <baseUrl> <headUrl> <baseOut> <headOut>');
  process.exit(2);
}

const baseUrl = baseUrlArg.replace(/\/$/, '');
const headUrl = headUrlArg.replace(/\/$/, '');
const baseDir = resolve(baseDirArg);
const headDir = resolve(headDirArg);
const viewports = [
  { name: '390x844', width: 390, height: 844 },
  { name: '1440x900', width: 1440, height: 900 },
];

function localPath(urlPath) {
  const decoded = decodeURIComponent(urlPath);
  if (decoded === '/') return 'index.html';
  const relative = decoded.replace(/^\/+/, '');
  const candidates = relative.endsWith('/')
    ? [`${relative}index.html`]
    : [relative, `${relative}.html`, `${relative}/index.html`];
  const isFile = (candidate) => {
    const path = resolve(baseDir, candidate);
    return existsSync(path) && statSync(path).isFile();
  };
  return candidates.find(isFile) ?? candidates[0];
}

async function capture(browser, base) {
  const origin = new URL(base).origin;
  const responses = new Map();
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    colorScheme: 'light',
    reducedMotion: 'no-preference',
  });

  try {
    for (const viewport of viewports) {
      await context.setDefaultTimeout(30_000);
      const page = await context.newPage();
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      const paths = new Set();
      page.on('response', (response) => {
        const url = new URL(response.url());
        if (url.origin !== origin) return;
        const file = localPath(url.pathname);
        responses.set(url.pathname, file);
        if (url.pathname.startsWith('/_next/static/') || !isNavigationPayload(file)) {
          paths.add(url.pathname);
        }
      });

      await page.goto(`${base}/`, { waitUntil: 'load', timeout: 30_000 });
      await page.waitForSelector('[data-site-live-state="revealed"]', {
        state: 'attached',
        timeout: 30_000,
      });
      await page.waitForTimeout(2_000);
      responses.set(`viewport:${viewport.name}`, [...paths].sort());
      await page.close();
    }
  } finally {
    await context.close();
  }

  return responses;
}

function sha256(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

function stylesheets(html) {
  const hrefs = [];
  for (const match of html.matchAll(/<link\b[^>]*>/gi)) {
    const tag = match[0];
    if (!/\brel=["']stylesheet["']/i.test(tag)) continue;
    const href = /\bhref=["']([^"']+)["']/i.exec(tag)?.[1];
    if (!href) continue;
    const url = new URL(href.replaceAll('&amp;', '&'), 'http://127.0.0.1');
    hrefs.push(localPath(url.pathname));
  }
  return hrefs;
}

function isNavigationPayload(file) {
  return (
    file !== 'index.html' &&
    !file.startsWith('_next/static/') &&
    (/\.html$/.test(file) || /\.txt$/.test(file))
  );
}

function requiredFiles(outDir) {
  const files = [
    'index.html',
    'index.txt',
    'sitemap.xml',
    'robots.txt',
    'og/home.png',
    ...readdirSync(outDir)
      .filter((name) => /^__next\..*\.txt$/.test(name))
      .map((name) => name),
  ];
  const index = readFileSync(resolve(outDir, 'index.html'), 'utf8');
  files.push(...stylesheets(index));
  return files;
}

function fetchSetsEqual(baseResponses, headResponses) {
  const mismatches = [];
  for (const viewport of viewports) {
    const key = `viewport:${viewport.name}`;
    const base = baseResponses.get(key) ?? [];
    const head = headResponses.get(key) ?? [];
    if (base.join('\n') !== head.join('\n')) {
      const missing = base.filter((path) => !head.includes(path));
      const extra = head.filter((path) => !base.includes(path));
      mismatches.push(
        `${viewport.name} base-only=[${missing.join(', ')}] head-only=[${extra.join(', ')}]`,
      );
    }
  }
  return mismatches;
}

const browser = await chromium.launch({ headless: true });
let baseResponses;
let headResponses;
try {
  baseResponses = await capture(browser, baseUrl);
  headResponses = await capture(browser, headUrl);
} finally {
  await browser.close();
}

const fetchMismatches = fetchSetsEqual(baseResponses, headResponses);
const files = new Set(requiredFiles(baseDir));
for (const file of requiredFiles(headDir)) files.add(file);
for (const responses of [baseResponses, headResponses]) {
  for (const [key, value] of responses) {
    if (key.startsWith('viewport:')) continue;
    if (isNavigationPayload(value)) continue;
    files.add(value);
  }
}

const rows = [];
const differing = [];
for (const file of [...files].sort()) {
  const baseFile = resolve(baseDir, file);
  const headFile = resolve(headDir, file);
  const baseBytes = existsSync(baseFile) ? readFileSync(baseFile) : null;
  const headBytes = existsSync(headFile) ? readFileSync(headFile) : null;
  const baseHash = baseBytes === null ? '-' : sha256(baseBytes).slice(0, 12);
  const headHash = headBytes === null ? '-' : sha256(headBytes).slice(0, 12);
  const same = baseBytes !== null && headBytes !== null && baseBytes.equals(headBytes);
  rows.push(`| \`${file}\` | ${baseHash} | ${headHash} | ${same ? 'yes' : 'no'} |`);
  if (!same) differing.push(file);
}

console.log('| path | base sha256 (12) | head sha256 (12) | same |');
console.log('| --- | --- | --- | --- |');
console.log(rows.join('\n'));
if (fetchMismatches.length > 0) {
  for (const mismatch of fetchMismatches) console.log(`FETCH-PATHS DIFFER ${mismatch}`);
}

if (differing.length === 0 && fetchMismatches.length === 0) {
  console.log(`HOME-BYTES IDENTICAL ${rows.length}/${rows.length}`);
  process.exit(0);
}

for (const path of differing) console.log(`DIFF ${path}`);
const failures = Math.max(differing.length, fetchMismatches.length > 0 ? 1 : 0);
console.log(`HOME-BYTES DIFFER ${failures}/${rows.length}`);
process.exit(6);
