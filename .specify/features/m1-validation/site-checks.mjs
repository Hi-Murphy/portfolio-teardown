#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = execFileSync('git', ['rev-parse', '--show-toplevel'], {
  cwd: SCRIPT_DIR,
  encoding: 'utf8',
}).trim();
const PERF_PACKAGE = join(REPO_ROOT, 'tools', 'perf', 'package.json');
const perfRequire = createRequire(PERF_PACKAGE);
const { JSDOM } = perfRequire('jsdom');

const EXIT = {
  OK: 0,
  INTERNAL: 1,
  USAGE: 2,
  UNREACHABLE: 3,
  BROWSER: 4,
  BUDGET: 6,
};

const EMPLOYER_BASE = 'b52fc06';
const REDACTION_BLOCK = '\u2588'.repeat(8);
const EXPECTED_MAILTO = 'mailto:vibing.murphy@gmail.com';
const TODO_PATTERN = /\b(todo|fixme|tbd|xxx|lorem|ipsum|placeholder)\b/i;
const LINK_ATTRIBUTES = ['alt', 'title', 'aria-label', 'content', 'placeholder'];
const PROJECT_PATH = '/projects/websocket-inspector';
const UNKNOWN_PROJECT_PATH = '/projects/unknown-slug';
const DESKTOP_VIEWPORT = { width: 1440, height: 900 };
const MOBILE_VIEWPORT = { width: 390, height: 844 };
const WAIT_MS = 15_000;

class CliFailure extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}

function usage(message = '') {
  if (message !== '') console.error(message);
  console.error(
    'Usage: node .specify/features/m1-validation/site-checks.mjs --part content|degraded|devices ' +
      '[--serve apps/web/out] [--base-url <url>] [--preview <url>] ' +
      '[--cell D3|D5|D2] [--out <dir>] [--out-dir <export-dir>]',
  );
}

function parseArgs(argv) {
  const values = {};
  const allowed = new Set([
    '--part',
    '--serve',
    '--base-url',
    '--preview',
    '--cell',
    '--out',
    '--out-dir',
  ]);

  for (let index = 0; index < argv.length; index += 1) {
    const flag = argv[index];
    if (!allowed.has(flag)) throw new CliFailure(EXIT.USAGE, `unknown option: ${flag}`);
    const value = argv[index + 1];
    if (value === undefined || value.startsWith('--')) {
      throw new CliFailure(EXIT.USAGE, `missing value for ${flag}`);
    }
    values[flag.slice(2)] = value;
    index += 1;
  }

  if (!['content', 'degraded', 'devices'].includes(values.part)) {
    throw new CliFailure(EXIT.USAGE, '--part must be content, degraded, or devices');
  }
  const hasServe = values.serve !== undefined;
  const hasBase = values['base-url'] !== undefined;
  if (hasServe === hasBase) {
    throw new CliFailure(EXIT.USAGE, 'provide exactly one of --serve or --base-url');
  }
  if (values.part === 'devices' && !['D3', 'D5', 'D2'].includes(values.cell)) {
    throw new CliFailure(EXIT.USAGE, '--part devices requires --cell D3, D5, or D2');
  }
  if (values.part !== 'devices' && values.cell !== undefined) {
    throw new CliFailure(EXIT.USAGE, '--cell is only valid with --part devices');
  }

  return values;
}

function parseHttpUrl(raw, label) {
  let url;
  try {
    url = new URL(raw);
  } catch {
    throw new CliFailure(EXIT.USAGE, `${label} must be a valid URL`);
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new CliFailure(EXIT.USAGE, `${label} must use http or https`);
  }
  return url;
}

function normaliseBase(raw, label) {
  const url = parseHttpUrl(raw, label);
  if (!url.pathname.endsWith('/')) url.pathname += '/';
  return url;
}

function targetUrl(base, path) {
  return new URL(path.replace(/^\/+/, ''), base).href;
}

function walkFiles(root, predicate = () => true) {
  const files = [];
  const visit = (directory) => {
    const entries = readdirSync(directory, { withFileTypes: true }).sort((left, right) =>
      left.name.localeCompare(right.name),
    );
    for (const entry of entries) {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) visit(path);
      else if (entry.isFile() && predicate(path)) files.push(path);
    }
  };
  visit(root);
  return files;
}

function relativePath(from, path) {
  return relative(from, path).split(sep).join('/');
}

function routeForHtml(exportDir, file) {
  const path = relativePath(exportDir, file);
  if (path === 'index.html') return '/';
  if (path.endsWith('/index.html')) return `/${path.slice(0, -'/index.html'.length)}`;
  return `/${path}`;
}

function compact(value, limit = 220) {
  const text = typeof value === 'string' ? value : JSON.stringify(value);
  return text.length <= limit ? text : `${text.slice(0, limit - 1)}…`;
}

function check(id, pass, expected, actual) {
  return { id, pass, expected, actual };
}

function printChecks(checks) {
  for (const entry of checks) {
    console.log(`${entry.pass ? 'PASS' : 'FAIL'} ${entry.id} ${compact(entry.actual)}`);
  }
}

function countOccurrences(haystack, needle) {
  if (needle === '') return 0;
  let count = 0;
  let index = 0;
  while ((index = haystack.indexOf(needle, index)) !== -1) {
    count += 1;
    index += needle.length;
  }
  return count;
}

function writeReport(outDir, part, cell, report) {
  mkdirSync(outDir, { recursive: true });
  const suffix = cell === undefined ? '' : `-${cell}`;
  const path = join(outDir, `${part}${suffix}.json`);
  writeFileSync(path, `${JSON.stringify(report, null, 2)}\n`);
  return path;
}

function scanContentTokens(exportDir) {
  const files = walkFiles(exportDir, (path) => path.endsWith('.html'));
  const hits = [];

  for (const file of files) {
    const html = readFileSync(file, 'utf8');
    let dom;
    try {
      dom = new JSDOM(html);
    } catch (error) {
      throw new CliFailure(
        EXIT.INTERNAL,
        `could not parse ${relativePath(exportDir, file)}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
    const document = dom.window.document;
    const body = document.body?.cloneNode(true) ?? null;
    if (body !== null) {
      for (const element of body.querySelectorAll('script,style')) element.remove();
      const text = body.textContent ?? '';
      for (const match of text.matchAll(new RegExp(TODO_PATTERN.source, 'gi'))) {
        hits.push({ file: relativePath(exportDir, file), where: 'text', match: match[0] });
      }
    }

    for (const element of document.querySelectorAll('*')) {
      for (const name of LINK_ATTRIBUTES) {
        const value = element.getAttribute(name);
        if (value === null) continue;
        for (const match of value.matchAll(new RegExp(TODO_PATTERN.source, 'gi'))) {
          hits.push({
            file: relativePath(exportDir, file),
            where: `attr:${name}`,
            match: match[0],
          });
        }
      }
    }
    dom.window.close();
  }

  return { files: files.length, hits };
}

function deriveEmployerNeedles() {
  let base;
  let current;
  try {
    base = JSON.parse(
      execFileSync('git', ['show', `${EMPLOYER_BASE}:.specify/content/site.json`], {
        cwd: REPO_ROOT,
        encoding: 'utf8',
      }),
    );
    current = JSON.parse(readFileSync(join(REPO_ROOT, '.specify/content/site.json'), 'utf8'));
  } catch {
    throw new CliFailure(EXIT.INTERNAL, 'could not read frozen content for the redaction check');
  }

  const oldParagraph = base?.about?.paragraphs?.[0];
  const newParagraph = current?.about?.paragraphs?.[0];
  if (typeof oldParagraph !== 'string' || typeof newParagraph !== 'string') {
    throw new CliFailure(EXIT.INTERNAL, 'about.paragraphs[0] is missing');
  }

  const start = newParagraph.indexOf(REDACTION_BLOCK);
  const blockCount = [...newParagraph].filter((character) => character === '\u2588').length;
  if (
    start < 0 ||
    blockCount !== 8 ||
    newParagraph.indexOf(REDACTION_BLOCK, start + REDACTION_BLOCK.length) >= 0
  ) {
    throw new CliFailure(EXIT.INTERNAL, 'about.paragraphs[0] has no single redaction bar');
  }

  const prefix = newParagraph.slice(0, start);
  const suffix = newParagraph.slice(start + REDACTION_BLOCK.length);
  if (!oldParagraph.startsWith(prefix) || !oldParagraph.endsWith(suffix)) {
    throw new CliFailure(EXIT.INTERNAL, 'about.paragraphs[0] changed outside the redaction');
  }

  const phrase = oldParagraph.slice(prefix.length, oldParagraph.length - suffix.length);
  const word = phrase.split(' ')[0] ?? '';
  if (phrase.length !== 19 || word.length !== 8 || oldParagraph !== `${prefix}${phrase}${suffix}`) {
    throw new CliFailure(EXIT.INTERNAL, 'the redacted content span is not the expected shape');
  }

  return { word, phrase };
}

function scanForRedactedEmployer(exportDir) {
  const { word, phrase } = deriveEmployerNeedles();
  const wordBytes = Buffer.from(word, 'utf8');
  const phraseBytes = Buffer.from(phrase, 'utf8');
  const loweredWord = word.toLocaleLowerCase('en-US');
  const loweredPhrase = phrase.toLocaleLowerCase('en-US');
  const files = walkFiles(exportDir);
  const wordFiles = [];
  const phraseFiles = [];
  let wordOccurrences = 0;
  let phraseOccurrences = 0;
  let caseInsensitiveOccurrences = 0;

  for (const file of files) {
    const buffer = readFileSync(file);
    const wordHits = countBufferOccurrences(buffer, wordBytes);
    const phraseHits = countBufferOccurrences(buffer, phraseBytes);
    if (wordHits > 0) {
      wordOccurrences += wordHits;
      wordFiles.push(relativePath(exportDir, file));
    }
    if (phraseHits > 0) {
      phraseOccurrences += phraseHits;
      phraseFiles.push(relativePath(exportDir, file));
    }
    const latin = buffer.toString('latin1').toLocaleLowerCase('en-US');
    caseInsensitiveOccurrences +=
      countOccurrences(latin, loweredWord) + countOccurrences(latin, loweredPhrase);
  }

  return {
    files: files.length,
    wordOccurrences,
    phraseOccurrences,
    wordFiles,
    phraseFiles,
    caseInsensitiveOccurrences,
  };
}

function countBufferOccurrences(buffer, needle) {
  if (needle.length === 0) return 0;
  let count = 0;
  let index = 0;
  while ((index = buffer.indexOf(needle, index)) !== -1) {
    count += 1;
    index += needle.length;
  }
  return count;
}

function readRedaction(exportDir) {
  const indexPath = join(exportDir, 'index.html');
  if (!existsSync(indexPath)) {
    throw new CliFailure(EXIT.INTERNAL, `missing exported page: ${relativePath(REPO_ROOT, indexPath)}`);
  }
  const dom = new JSDOM(readFileSync(indexPath, 'utf8'));
  const about = dom.window.document.querySelector('[data-home-section="about"]');
  const aboutText = about?.textContent ?? '';
  dom.window.close();

  const payloadPath = join(exportDir, 'index.txt');
  const payloadPresent = existsSync(payloadPath);
  const payloadText = payloadPresent ? readFileSync(payloadPath, 'utf8') : '';
  const aboutBar = aboutText.includes(REDACTION_BLOCK);
  const payloadBar = payloadPresent ? payloadText.includes(REDACTION_BLOCK) : true;
  return { aboutBar, payloadPresent, payloadBar };
}

function collectLinks(exportDir) {
  const files = walkFiles(exportDir, (path) => path.endsWith('.html'));
  const internal = new Map();
  const external = new Map();
  const mailto = new Set();
  const syntheticOrigin = 'https://export.invalid';

  for (const file of files) {
    const dom = new JSDOM(readFileSync(file, 'utf8'));
    const route = routeForHtml(exportDir, file);
    const documentUrl = new URL(route, syntheticOrigin);
    for (const anchor of dom.window.document.querySelectorAll('a[href]')) {
      const href = anchor.getAttribute('href');
      if (href === null || href.trim() === '') continue;
      let resolved;
      try {
        resolved = new URL(href, documentUrl);
      } catch {
        continue;
      }

      if (resolved.protocol === 'mailto:') {
        mailto.add(href);
      } else if (resolved.protocol === 'http:' || resolved.protocol === 'https:') {
        if (resolved.origin === syntheticOrigin) {
          const path = `${resolved.pathname}${resolved.search}`;
          internal.set(path, href);
        } else {
          external.set(resolved.href, href);
        }
      }
    }
    dom.window.close();
  }

  for (const path of ['/', '/projects', PROJECT_PATH, UNKNOWN_PROJECT_PATH]) {
    if (!internal.has(path)) internal.set(path, path);
  }
  return { internal, external, mailto };
}

async function fetchStatus(url) {
  let response;
  try {
    response = await fetch(url, {
      redirect: 'follow',
      signal: AbortSignal.timeout(20_000),
      headers: { 'user-agent': 'Portfolio-Teardown-M1-Validation/1.0' },
    });
  } catch (error) {
    throw new CliFailure(
      EXIT.UNREACHABLE,
      `unreachable target ${new URL(url).origin}: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
  return response.status;
}

function expectedInternalStatus(path) {
  return path.split('?', 1)[0] === UNKNOWN_PROJECT_PATH ? 404 : 200;
}

async function probeInternalLinks(internal, bases) {
  const records = [];
  const failures = [];
  const uniqueBases = [...new Map(bases.map((base) => [base.origin, base])).values()];

  for (const base of uniqueBases) {
    for (const [path, sourceHref] of internal) {
      const url = targetUrl(base, path);
      const status = await fetchStatus(url);
      const expected = expectedInternalStatus(path);
      const record = { href: sourceHref, path, host: base.origin, status, expected };
      records.push(record);
      if (status !== expected) failures.push(record);
    }
  }

  return { records, failures };
}

function desktopUserAgent(browser) {
  const version = browser.version().split(' ').at(-1) ?? '141.0.0.0';
  return `Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${version} Safari/537.36`;
}

async function probeExternalLinks(browser, external) {
  const context = await browser.newContext({
    viewport: DESKTOP_VIEWPORT,
    userAgent: desktopUserAgent(browser),
  });
  const records = [];
  try {
    for (const href of external.keys()) {
      const page = await context.newPage();
      try {
        const response = await page.goto(href, {
          waitUntil: 'domcontentloaded',
          timeout: 30_000,
        });
        records.push({
          href,
          host: new URL(href).origin,
          status: response?.status() ?? 0,
          finalUrl: page.url(),
        });
      } catch (error) {
        records.push({
          href,
          host: new URL(href).origin,
          status: 0,
          error: error instanceof Error ? error.message.split('\n', 1)[0] : String(error),
        });
      } finally {
        await page.close();
      }
    }
  } finally {
    await context.close();
  }

  const failures = records.filter((record) => record.status !== 200);
  return { records, failures };
}

async function launchBrowser(type) {
  const { chromium, firefox } = perfRequire('playwright');
  const factory = type === 'firefox' ? firefox : chromium;
  try {
    return await factory.launch({ headless: true });
  } catch (error) {
    const install =
      type === 'firefox'
        ? 'pnpm --filter perf-tools exec playwright install firefox'
        : 'pnpm --filter perf-tools exec playwright install chromium';
    throw new CliFailure(
      EXIT.BROWSER,
      `failed to launch ${type}: ${error instanceof Error ? error.message.split('\n', 1)[0] : String(error)}\nrun: ${install}`,
    );
  }
}

function readFlowStepCount() {
  const path = join(REPO_ROOT, '.specify/content/websocket-inspector.json');
  const project = JSON.parse(readFileSync(path, 'utf8'));
  const count = project?.flows?.[0]?.path?.length;
  if (!Number.isInteger(count) || count < 1) {
    throw new CliFailure(EXIT.INTERNAL, 'websocket-inspector.json flows[0].path has no steps');
  }
  return count;
}

function readHeroLabels() {
  const site = JSON.parse(readFileSync(join(REPO_ROOT, '.specify/content/site.json'), 'utf8'));
  const pause = site?.hero?.loopPause;
  const play = site?.hero?.loopPlay;
  if (typeof pause !== 'string' || typeof play !== 'string') {
    throw new CliFailure(EXIT.INTERNAL, 'site.json is missing the hero loop labels');
  }
  return { pause, play };
}

function installClsObserver() {
  const state = { entries: [], ready: false };
  window.__m1ValidationCls = state;
  try {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        state.entries.push({
          value: entry.value,
          hadRecentInput: entry.hadRecentInput,
          startTime: entry.startTime,
        });
      }
    });
    observer.observe({ type: 'layout-shift', buffered: true });
    state.ready = true;
  } catch {
    state.ready = false;
  }
}

function installSaveData() {
  Object.defineProperty(navigator, 'connection', {
    configurable: true,
    value: { saveData: true },
  });
}

function degradedContextOptions(mode, viewport, scheme) {
  const mobile = viewport.width === MOBILE_VIEWPORT.width;
  return {
    viewport,
    deviceScaleFactor: mobile ? 2 : 1,
    isMobile: mobile,
    hasTouch: mobile,
    colorScheme: scheme,
    reducedMotion: mode === 'reduced' ? 'reduce' : 'no-preference',
    ...(mode === 'nojs' ? { javaScriptEnabled: false } : {}),
    ...(mode === 'savedata' ? { extraHTTPHeaders: { 'Save-Data': 'on' } } : {}),
  };
}

function readPosterSnapshot() {
  const rendered = (element) => {
    if (!(element instanceof Element)) return false;
    const style = getComputedStyle(element);
    if (
      style.display === 'none' ||
      style.visibility === 'hidden' ||
      Number.parseFloat(style.opacity) === 0
    ) {
      return false;
    }
    const rect = element.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  };
  const boxOf = (element) => {
    if (element === null) return null;
    const rect = element.getBoundingClientRect();
    return {
      x: rect.x + scrollX,
      y: rect.y + scrollY,
      width: rect.width,
      height: rect.height,
      left: rect.left + scrollX,
      right: rect.right + scrollX,
      top: rect.top + scrollY,
      bottom: rect.bottom + scrollY,
    };
  };

  const posters = [...document.querySelectorAll('[data-site-poster]')];
  const poster = posters.find(rendered) ?? null;
  const flow = poster?.querySelector('[data-site-poster-flow]') ?? null;
  const lines = flow?.querySelectorAll('polyline[data-site-poster-flow-line]').length ?? 0;
  const steps = [...(poster?.querySelectorAll('[data-site-poster-step]') ?? [])].map((step) => ({
    value: step.getAttribute('data-site-poster-step'),
    text: (step.textContent ?? '').trim(),
  }));
  const hero = document.querySelector('[data-home-section="hero"]');
  const heroBox = boxOf(hero);
  const posterBox = boxOf(poster);
  const inside =
    heroBox !== null &&
    posterBox !== null &&
    posterBox.left >= heroBox.left - 1 &&
    posterBox.right <= heroBox.right + 1 &&
    posterBox.top >= heroBox.top - 1 &&
    posterBox.bottom <= heroBox.bottom + 1;
  const runningHero =
    typeof document.getAnimations === 'function'
      ? document.getAnimations().filter((animation) => {
          if (animation.playState !== 'running') return false;
          const target = animation.effect?.target;
          return !(target instanceof Element) || target.closest('[data-home-section="hero"]') !== null;
        }).length
      : 0;

  return {
    posters: posters.length,
    posterFound: poster !== null,
    flowFound: flow !== null,
    lines,
    steps,
    canvases: document.querySelectorAll('canvas').length,
    heroBox,
    posterBox,
    inside,
    runningHero,
    loop: document.querySelector('[data-hero-loop]')?.getAttribute('data-hero-loop') ?? null,
    document: {
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    },
  };
}

async function readCls(page) {
  return await page.evaluate(() => {
    const state = window.__m1ValidationCls;
    if (state === undefined || state.ready !== true) return { ready: false, total: null };
    const total = state.entries
      .filter((entry) => entry.hadRecentInput !== true)
      .reduce((sum, entry) => sum + entry.value, 0);
    return { ready: true, total, entries: state.entries.length };
  });
}

function sameBox(left, right, tolerance = 1) {
  if (left === null || right === null) return left === right;
  return (
    Math.abs(left.x - right.x) <= tolerance &&
    Math.abs(left.y - right.y) <= tolerance &&
    Math.abs(left.width - right.width) <= tolerance &&
    Math.abs(left.height - right.height) <= tolerance
  );
}

async function screenshotHero(page, path) {
  return await page.locator('[data-home-section="hero"]').screenshot({
    path,
    animations: 'allow',
    caret: 'hide',
  });
}

async function probeDegradedCell(browser, base, mode, viewport, scheme, expectedSteps, outDir) {
  const context = await browser.newContext(degradedContextOptions(mode, viewport, scheme));
  const page = await context.newPage();
  const suffix = `${mode}-${viewport.width}-${scheme}`;
  const checks = [];
  const screenshots = [];

  try {
    if (mode !== 'nojs') await page.addInitScript(installClsObserver);
    if (mode === 'savedata') await page.addInitScript(installSaveData);
    let response;
    try {
      response = await page.goto(targetUrl(base, '/'), {
        waitUntil: 'load',
        timeout: WAIT_MS,
      });
    } catch (error) {
      throw new CliFailure(
        EXIT.UNREACHABLE,
        `unreachable ${base.origin}: ${error instanceof Error ? error.message.split('\n', 1)[0] : String(error)}`,
      );
    }
    if (response === null || response.status() >= 400) {
      throw new CliFailure(
        EXIT.UNREACHABLE,
        `unreachable ${base.origin}: HTTP ${response?.status() ?? 'no response'}`,
      );
    }

    await page.waitForTimeout(200);
    const initial = await page.evaluate(readPosterSnapshot);
    const firstPath = join(outDir, `degraded-${suffix}-motion-a.png`);
    const first = await screenshotHero(page, firstPath);
    screenshots.push(relativePath(outDir, firstPath));
    await page.waitForTimeout(2_000);
    const afterTwo = await page.evaluate(readPosterSnapshot);
    const secondPath = join(outDir, `degraded-${suffix}-motion-b.png`);
    const second = await screenshotHero(page, secondPath);
    screenshots.push(relativePath(outDir, secondPath));
    await page.waitForTimeout(900);
    const afterThree = await page.evaluate(readPosterSnapshot);
    const cls = mode === 'nojs' ? { ready: false, total: null } : await readCls(page);
    const fullPath = join(outDir, `degraded-${suffix}.png`);
    await page.screenshot({ path: fullPath, fullPage: true, animations: 'allow', caret: 'hide' });
    screenshots.push(relativePath(outDir, fullPath));

    checks.push(
      check(
        `degraded-${suffix}-poster`,
        initial.posterFound && initial.flowFound && initial.lines === 1,
        { poster: true, flow: true, lines: 1 },
        { poster: initial.posterFound, flow: initial.flowFound, lines: initial.lines },
      ),
    );

    const stepValues = initial.steps.map((step) => step.value);
    const expectedValues = Array.from({ length: expectedSteps }, (_, index) => String(index + 1));
    const stepsPass =
      stepValues.length === expectedSteps &&
      stepValues.every((value, index) => value === expectedValues[index]) &&
      initial.steps.every((step, index) => step.text === String(index + 1));
    checks.push(
      check(
        `degraded-${suffix}-steps`,
        stepsPass,
        expectedValues,
        initial.steps.map((step) => `${step.value}:${step.text}`),
      ),
    );
    checks.push(
      check(`degraded-${suffix}-canvas`, initial.canvases === 0, 0, initial.canvases),
    );

    const sameScreenshots = first.equals(second);
    const noRunning = afterThree.runningHero === 0;
    const noLoop = afterThree.loop === null || afterThree.loop !== 'running';
    checks.push(
      check(
        `degraded-${suffix}-animation`,
        sameScreenshots && noRunning && noLoop,
        { screenshots: 'identical', runningHero: 0, loop: 'not running' },
        { screenshots: sameScreenshots, runningHero: afterThree.runningHero, loop: afterThree.loop },
      ),
    );

    const noHScroll =
      afterThree.document.scrollWidth <= afterThree.document.clientWidth &&
      initial.document.scrollWidth <= initial.document.clientWidth;
    const clsPass = mode === 'nojs' ? true : cls.total === 0;
    const nojsBoxPass = mode === 'nojs' ? sameBox(initial.posterBox, afterThree.posterBox) : true;
    checks.push(
      check(
        `degraded-${suffix}-layout`,
        noHScroll && initial.posterBox !== null && initial.inside && clsPass && nojsBoxPass,
        { noHorizontalScroll: true, posterInsideHero: true, cls: 0, stableNoJsPoster: true },
        {
          noHorizontalScroll: noHScroll,
          posterBox: initial.posterBox,
          posterInsideHero: initial.inside,
          cls: mode === 'nojs' ? 'n/a (no JS)' : cls.total,
          stableNoJsPoster: mode === 'nojs' ? nojsBoxPass : null,
        },
      ),
    );
  } finally {
    await context.close();
  }

  return { checks, screenshots };
}

async function installTabHelpers(page) {
  await page.evaluate(() => {
    const keys = new WeakMap();
    let nextKey = 0;
    const firstHeader = document.querySelector('header');
    const main = document.querySelector('main');
    const mainBlocks = main === null ? [] : [...main.children];
    const footer = document.querySelector('footer');
    const sectionIndexFor = (element) => {
      if (firstHeader?.contains(element) === true) return 0;
      if (main?.contains(element) === true) {
        const block = mainBlocks.find((candidate) => candidate.contains(element));
        return 1 + (block === undefined ? 0 : mainBlocks.indexOf(block));
      }
      if (footer?.contains(element) === true) return 1 + mainBlocks.length;
      return -1;
    };
    const textOf = (element) =>
      (element.getAttribute('aria-label') ?? element.innerText ?? element.textContent ?? '')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 80);
    const visible = (element) => {
      if (element.closest('[inert],[aria-hidden="true"],script,style,template,noscript,.sr-only')) {
        return false;
      }
      if (element.hasAttribute('disabled')) return false;
      const style = getComputedStyle(element);
      if (style.display === 'none' || style.visibility === 'hidden') return false;
      const rect = element.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    };
    const tabbable = (element) =>
      element.tabIndex >= 0 && visible(element) && element.getClientRects().length > 0;
    const keyFor = (element) => {
      let key = keys.get(element);
      if (key === undefined) {
        const tag = element.tagName.toLowerCase();
        key = `tab:${nextKey}:${tag}:${textOf(element)}`;
        nextKey += 1;
        keys.set(element, key);
      }
      return key;
    };
    const descriptor = (element) => {
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      return {
        key: keyFor(element),
        tag: element.tagName.toLowerCase(),
        name: textOf(element),
        sectionIndex: sectionIndexFor(element),
        rect: {
          x: rect.x + scrollX,
          y: rect.y + scrollY,
          width: rect.width,
          height: rect.height,
        },
        focusVisible:
          element.matches(':focus-visible') &&
          (style.outlineStyle !== 'none' || style.boxShadow !== 'none'),
        isBody: false,
      };
    };
    const candidates = () =>
      [...document.querySelectorAll('a[href],button,[tabindex]')].filter(tabbable);
    window.__m1Tab = {
      expected: () => candidates().map(descriptor),
      active: () => {
        const active = document.activeElement;
        if (!(active instanceof HTMLElement) || active === document.body) {
          return {
            key: 'body',
            tag: 'body',
            name: 'body',
            sectionIndex: -1,
            rect: { x: 0, y: 0, width: 0, height: 0 },
            focusVisible: true,
            isBody: true,
          };
        }
        return descriptor(active);
      },
    };
  });
}

function orderValue(step) {
  return [step.sectionIndex, Math.round(step.rect.y / 8), step.rect.x];
}

function isVisualOrder(left, right) {
  const a = orderValue(left);
  const b = orderValue(right);
  return (
    a[0] < b[0] ||
    (a[0] === b[0] && (a[1] < b[1] || (a[1] === b[1] && a[2] <= b[2])))
  );
}

async function probeTabWalk(browser, base, mode, viewport, route) {
  const context = await browser.newContext(degradedContextOptions(mode, viewport, 'light'));
  const page = await context.newPage();
  try {
    await page.goto(targetUrl(base, route), { waitUntil: 'load', timeout: WAIT_MS });
    await page.waitForTimeout(150);
    await installTabHelpers(page);
    const before = await page.evaluate(() => window.__m1Tab.expected());
    const steps = [];
    let repeated = null;
    let returned = false;
    for (let index = 0; index < 80; index += 1) {
      await page.keyboard.press('Tab');
      const step = await page.evaluate(() => window.__m1Tab.active());
      if (step.isBody) {
        returned = true;
        break;
      }
      if (steps.some((candidate) => candidate.key === step.key)) {
        repeated = step.key;
        break;
      }
      steps.push(step);
    }
    const after = await page.evaluate(() => window.__m1Tab.expected());
    const expected = after.length >= before.length ? after : before;
    const reached = new Set(steps.map((step) => step.key));
    const missing = expected.filter((step) => !reached.has(step.key)).map((step) => step.key);
    const invisibleFocus = steps
      .filter((step) => !step.focusVisible)
      .map((step) => step.key);
    const backwards = [];
    for (let index = 1; index < steps.length; index += 1) {
      if (!isVisualOrder(steps[index - 1], steps[index])) {
        const before = steps[index - 1];
        const after = steps[index];
        backwards.push(
          `${before.key}@${before.sectionIndex}:${Math.round(before.rect.y)}/${Math.round(before.rect.x)} -> ` +
            `${after.key}@${after.sectionIndex}:${Math.round(after.rect.y)}/${Math.round(after.rect.x)}`,
        );
      }
    }
    const pass =
      returned &&
      missing.length === 0 &&
      repeated === null &&
      invisibleFocus.length === 0 &&
      backwards.length === 0;
    const routeName = route === '/' ? 'home' : 'project';
    return check(
      `degraded-tab-${mode}-${viewport.width}-${routeName}`,
      pass,
      {
        reached: 'all visible controls',
        repeats: 0,
        visualOrder: 'nondecreasing',
        focusVisible: true,
        returnedToBody: true,
      },
      {
        reached: reached.size,
        expected: expected.length,
        missing,
        repeated,
        backwards: backwards.slice(0, 5),
        invisibleFocus,
        returnedToBody: returned,
        steps: steps.map(({ key, tag, name, sectionIndex, rect, focusVisible }) => ({
          key,
          tag,
          name,
          sectionIndex,
          rect,
          focusVisible,
        })),
      },
    );
  } finally {
    await context.close();
  }
}

async function runContent(options, base) {
  const exportDir = resolve(options['out-dir'] ?? join(REPO_ROOT, 'apps/web/out'));
  if (!existsSync(exportDir) || !statSync(exportDir).isDirectory()) {
    throw new CliFailure(EXIT.UNREACHABLE, 'export directory is missing');
  }
  const outDir = resolve(options.out ?? join(REPO_ROOT, '.evidence/m1/site-checks'));
  mkdirSync(outDir, { recursive: true });

  const tokenScan = scanContentTokens(exportDir);
  const redaction = readRedaction(exportDir);
  const employerScan = scanForRedactedEmployer(exportDir);
  const links = collectLinks(exportDir);
  const internal = await probeInternalLinks(
    links.internal,
    options.preview === undefined ? [base] : [base, normaliseBase(options.preview, '--preview')],
  );
  const browser = await launchBrowser('chromium');
  let external;
  try {
    external = await probeExternalLinks(browser, links.external);
  } finally {
    await browser.close();
  }
  const mailto = [...links.mailto];
  const mailtoFailures = mailto.filter((href) => href !== EXPECTED_MAILTO);
  const redactionPass =
    redaction.aboutBar &&
    redaction.payloadBar &&
    employerScan.wordOccurrences === 0 &&
    employerScan.phraseOccurrences === 0;

  const checks = [
    check('C2', tokenScan.hits.length === 0, [], tokenScan.hits),
    check(
      'C3',
      redactionPass,
      { aboutBar: true, payloadBar: true, employerHits: 0, phraseHits: 0 },
      {
        aboutBar: redaction.aboutBar,
        payloadPresent: redaction.payloadPresent,
        payloadBar: redaction.payloadBar,
        scannedFiles: employerScan.files,
        employerHits: employerScan.wordOccurrences,
        phraseHits: employerScan.phraseOccurrences,
        files: [...new Set([...employerScan.wordFiles, ...employerScan.phraseFiles])],
        caseInsensitiveEmployerOccurrences: employerScan.caseInsensitiveOccurrences,
      },
    ),
    check(
      'C4-internal',
      internal.failures.length === 0,
      { records: links.internal.size, status: 'expected' },
      { records: internal.records.length, failures: internal.failures },
    ),
    check(
      'C4-external',
      external.failures.length === 0,
      { links: links.external.size, status: 200 },
      { records: external.records, failures: external.failures },
    ),
    check(
      'C4-mailto',
      mailto.length > 0 && mailtoFailures.length === 0,
      { hrefs: [EXPECTED_MAILTO] },
      { hrefs: mailto, failures: mailtoFailures },
    ),
  ];

  const report = {
    kind: 'm1-site-checks-content',
    version: 1,
    generatedAt: new Date().toISOString(),
    exportDir: relativePath(REPO_ROOT, exportDir),
    baseUrl: base.origin,
    preview: options.preview ?? null,
    checks,
  };
  return { checks, report: { ...report, links: { ...internal, external: external.records } } };
}

async function runDegraded(options, base) {
  const expectedSteps = readFlowStepCount();
  const browser = await launchBrowser('chromium');
  const outDir = resolve(options.out ?? join(REPO_ROOT, '.evidence/m1/site-checks'));
  mkdirSync(outDir, { recursive: true });
  const checks = [];
  const screenshots = [];

  try {
    for (const mode of ['nojs', 'reduced', 'savedata']) {
      for (const viewport of [MOBILE_VIEWPORT, DESKTOP_VIEWPORT]) {
        for (const scheme of ['light', 'dark']) {
          const result = await probeDegradedCell(
            browser,
            base,
            mode,
            viewport,
            scheme,
            expectedSteps,
            outDir,
          );
          checks.push(...result.checks);
          screenshots.push(...result.screenshots);
        }
      }
    }
    for (const mode of ['nojs', 'reduced', 'savedata']) {
      for (const viewport of [MOBILE_VIEWPORT, DESKTOP_VIEWPORT]) {
        for (const route of ['/', PROJECT_PATH]) {
          checks.push(await probeTabWalk(browser, base, mode, viewport, route));
        }
      }
    }
  } finally {
    await browser.close();
  }

  return {
    checks,
    report: {
      kind: 'm1-site-checks-degraded',
      version: 1,
      generatedAt: new Date().toISOString(),
      baseUrl: base.origin,
      expectedSteps,
      checks,
      screenshots,
    },
  };
}

function diagnosticRecorder(cell, browser) {
  const lines = [];
  const stats = {
    consoleErrors: 0,
    warnings: 0,
    pageErrors: 0,
    requestFailed: 0,
    requestAborted: 0,
    httpErrors: 0,
  };
  const stamp = () => new Date().toISOString();
  const add = (line) => lines.push(line);

  const attach = (page, label) => {
    page.on('console', (message) => {
      const type = message.type();
      if (type === 'error') stats.consoleErrors += 1;
      if (type === 'warning') stats.warnings += 1;
      const location = message.location();
      add(
        `${stamp()} ${label} console.${type} ${message.text()} ${location.url || ''}:${location.lineNumber ?? 0}`,
      );
    });
    page.on('pageerror', (error) => {
      stats.pageErrors += 1;
      add(`${stamp()} ${label} pageerror ${error.stack ?? error.message}`);
    });
    page.on('requestfailed', (request) => {
      // A cancelled request (prefetch dropped on navigation) logs no console error; it is
      // recorded, not failed (S12 orchestrator review of T002).
      const errorText = request.failure()?.errorText ?? '';
      if (/ERR_ABORTED|NS_BINDING_ABORTED|cancelled/i.test(errorText)) stats.requestAborted += 1;
      else stats.requestFailed += 1;
      add(
        `${stamp()} ${label} requestfailed ${request.method()} ${request.url()} ${request.failure()?.errorText ?? ''}`,
      );
    });
    page.on('response', (response) => {
      if (response.status() < 400) return;
      stats.httpErrors += 1;
      add(`${stamp()} ${label} response ${response.status()} ${response.request().method()} ${response.url()}`);
    });
  };

  const write = (outDir) => {
    mkdirSync(outDir, { recursive: true });
    const path = join(outDir, `console-${cell}.txt`);
    const header = [
      `# M1 validation console capture ${cell}`,
      `# generated ${stamp()}`,
      `# browser ${browser.browserType().name()} ${browser.version()}`,
      '',
    ];
    writeFileSync(path, `${[...header, ...lines].join('\n')}\n`);
    return path;
  };

  return { attach, write, lines, stats };
}

async function gotoPage(page, url) {
  let response;
  try {
    response = await page.goto(url, { waitUntil: 'load', timeout: 30_000 });
  } catch (error) {
    throw new CliFailure(
      EXIT.UNREACHABLE,
      `unreachable ${new URL(url).origin}: ${error instanceof Error ? error.message.split('\n', 1)[0] : String(error)}`,
    );
  }
  if (response === null || response.status() >= 400) {
    throw new CliFailure(
      EXIT.UNREACHABLE,
      `unreachable ${new URL(url).origin}: HTTP ${response?.status() ?? 'no response'}`,
    );
  }
  return response;
}

async function changesWithin(capture, windowMs = 8_000, stepMs = 500) {
  const first = await capture();
  for (let elapsed = 0; elapsed < windowMs; elapsed += stepMs) {
    await new Promise((resolve) => setTimeout(resolve, stepMs));
    if (!(await capture()).equals(first)) return { changed: true, afterMs: elapsed + stepMs };
  }
  return { changed: false, afterMs: windowMs };
}

async function waitForHeroLoop(page) {
  await page.waitForSelector('[data-hero-loop="running"]', { timeout: WAIT_MS });
  await page.waitForFunction(() => document.querySelectorAll('canvas').length > 0, undefined, {
    timeout: WAIT_MS,
  });
}

async function scrollByWheelOrTouch(page, delta) {
  const touch = await page.evaluate(() => ({
    maxTouchPoints: navigator.maxTouchPoints,
    width: innerWidth,
    height: innerHeight,
  }));
  if (touch.maxTouchPoints > 0 && page.context().browser()?.browserType().name() === 'chromium') {
    const session = await page.context().newCDPSession(page);
    const x = Math.round(touch.width / 2);
    let y = Math.round(delta > 0 ? touch.height * 0.9 : touch.height * 0.1);
    await session.send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: [{ x, y, radiusX: 8, radiusY: 8, force: 1, id: 1 }],
    });
    for (let index = 0; index < 10; index += 1) {
      y -= Math.round(delta / 10);
      await session.send('Input.dispatchTouchEvent', {
        type: 'touchMove',
        touchPoints: [{ x, y, radiusX: 8, radiusY: 8, force: 1, id: 1 }],
      });
      await page.waitForTimeout(20);
    }
    await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    return 'cdp-touch';
  }
  await page.mouse.move(Math.round(touch.width / 2), Math.round(touch.height / 2));
  await page.mouse.wheel(0, delta);
  return 'mouse.wheel';
}

function visiblePosterState() {
  const rendered = (element) => {
    if (!(element instanceof Element)) return false;
    const style = getComputedStyle(element);
    if (style.display === 'none' || style.visibility === 'hidden') return false;
    const rect = element.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  };
  const posters = [...document.querySelectorAll('[data-site-poster]')];
  return {
    live: posters.some(rendered),
    canvases: document.querySelectorAll('canvas').length,
  };
}

async function runDevices(options, base) {
  const cell = options.cell;
  const { chromium } = perfRequire('playwright');
  let browser;
  let context;
  let page;
  let browserLabel;

  if (cell === 'D2') {
    try {
      browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
    } catch {
      throw new CliFailure(EXIT.UNREACHABLE, 'no Android device: run adb forward first');
    }
    context = browser.contexts()[0];
    if (context === undefined) {
      throw new CliFailure(EXIT.UNREACHABLE, 'no Android device: run adb forward first');
    }
    page = context.pages()[0] ?? (await context.newPage());
    browserLabel = 'android-cdp';
  } else {
    browser = await launchBrowser(cell === 'D5' ? 'firefox' : 'chromium');
    context = await browser.newContext({ viewport: DESKTOP_VIEWPORT });
    page = await context.newPage();
    browserLabel = browser.browserType().name();
  }

  const outDir = resolve(options.out ?? join(REPO_ROOT, '.evidence/m1/site-checks'));
  mkdirSync(outDir, { recursive: true });
  const recorder = diagnosticRecorder(cell, browser);
  recorder.attach(page, 'main');
  const labels = readHeroLabels();
  const checks = [];
  const screenshots = [];
  const shot = async (name, locator = null, targetPage = page) => {
    const path = join(outDir, `device-${cell}-${name}.png`);
    if (locator === null) await targetPage.screenshot({ path, animations: 'allow', caret: 'hide' });
    else await locator.screenshot({ path, animations: 'allow', caret: 'hide' });
    screenshots.push(relativePath(outDir, path));
    return readFileSync(path);
  };

  try {
    await gotoPage(page, targetUrl(base, '/'));
    await waitForHeroLoop(page);
    const hero = page.locator('[data-home-section="hero"]');
    const loopState = () => page.locator('[data-hero-loop]').getAttribute('data-hero-loop');
    // The storyboard has hold beats, so "moving" = the hero changes within an 8 s window,
    // not between two fixed frames (S12 orchestrator review of T002).
    const m1Frames = [];
    const m1Change = await changesWithin(async () => {
      const frame = await shot(`m1-${m1Frames.length}`, hero);
      m1Frames.push(frame);
      return frame;
    });
    const m1Loop = await loopState();
    const m1Canvases = await page.locator('canvas').count();
    checks.push(
      check(
        'M1',
        m1Change.changed && m1Loop === 'running' && m1Canvases > 0,
        { loop: 'running', canvas: true, heroChangesWithinMs: 8_000 },
        { loop: m1Loop, canvases: m1Canvases, ...m1Change },
      ),
    );

    const pauseButton = page.getByRole('button', { name: labels.pause, exact: true });
    await pauseButton.click({ timeout: WAIT_MS });
    await page.waitForTimeout(500);
    const pausedLoop = await loopState();
    const m2a = await shot('m2-paused-a', hero);
    await page.waitForTimeout(3_000);
    const m2b = await shot('m2-paused-b', hero);
    const playButton = page.getByRole('button', { name: labels.play, exact: true });
    const pausedVisible = await playButton.isVisible();
    await playButton.click({ timeout: WAIT_MS });
    await page.waitForTimeout(500);
    const resumedLoop = await loopState();
    let resumedIndex = 0;
    const m2Change = await changesWithin(() => shot(`m2-resumed-${resumedIndex++}`, hero));
    checks.push(
      check(
        'M2',
        pausedLoop === 'paused' &&
          m2a.equals(m2b) &&
          pausedVisible &&
          resumedLoop === 'running' &&
          m2Change.changed,
        {
          paused: { loop: 'paused', framesOver3sIdentical: true, playLabel: true },
          resumed: { loop: 'running', heroChangesWithinMs: 8_000 },
        },
        {
          pausedLoop,
          pausedIdentical: m2a.equals(m2b),
          playLabelVisible: pausedVisible,
          resumedLoop,
          resumed: m2Change,
        },
      ),
    );

    await gotoPage(page, targetUrl(base, '/'));
    await waitForHeroLoop(page);
    await page.evaluate(() => window.scrollTo(0, 0));
    // S11.9 T011i snap method: scroll (viewport - 100) down → lands on Projects;
    // the same distance up → back to the hero at 0.
    const snapState = () =>
      page.evaluate(() => {
        const projects = document.querySelector('[data-home-section="projects"]');
        const rect = projects?.getBoundingClientRect();
        const scrollPadding = Number.parseFloat(
          getComputedStyle(document.documentElement).scrollPaddingTop,
        );
        return {
          scrollY,
          top: rect?.top ?? null,
          scrollPadding: Number.isFinite(scrollPadding) ? scrollPadding : 0,
        };
      });
    const snapDelta = (await page.evaluate(() => innerHeight)) - 100;
    const m3Method = await scrollByWheelOrTouch(page, snapDelta);
    await page.waitForTimeout(1_500);
    const m3Down = await snapState();
    await shot('m3-down');
    await scrollByWheelOrTouch(page, -snapDelta);
    await page.waitForTimeout(1_500);
    const m3Up = await snapState();
    await shot('m3-up');
    const m3Pass =
      m3Down.top !== null && Math.abs(m3Down.top - m3Down.scrollPadding) <= 2 && m3Up.scrollY <= 2;
    checks.push(
      check(
        'M3',
        m3Pass,
        {
          down: { delta: snapDelta, projectsTop: 'scroll-padding ±2' },
          up: { delta: -snapDelta, scrollY: '0 ±2' },
        },
        { method: m3Method, down: m3Down, up: m3Up },
      ),
    );

    let m4Emulated = false;
    let m4Page = page;
    let m4Context = null;
    let m4Session = null;
    if (cell === 'D2') {
      m4Session = await context.newCDPSession(page);
      await m4Session.send('Emulation.setEmulatedMedia', {
        media: 'screen',
        features: [{ name: 'prefers-reduced-motion', value: 'reduce' }],
      });
      m4Emulated = true;
    } else {
      m4Context = await browser.newContext({
        viewport: DESKTOP_VIEWPORT,
        reducedMotion: 'reduce',
      });
      m4Page = await m4Context.newPage();
      recorder.attach(m4Page, 'm4');
    }
    try {
      await gotoPage(m4Page, targetUrl(base, '/'));
      await m4Page.evaluate(() => window.scrollTo(0, 0));
      const m4Method = await scrollByWheelOrTouch(m4Page, 180);
      await m4Page.waitForTimeout(1_500);
      const m4 = await m4Page.evaluate(() => {
        const projects = document.querySelector('[data-home-section="projects"]');
        const rect = projects?.getBoundingClientRect();
        const scrollPadding = Number.parseFloat(
          getComputedStyle(document.documentElement).scrollPaddingTop,
        );
        const rendered = (element) => {
          const style = getComputedStyle(element);
          if (style.display === 'none' || style.visibility === 'hidden') return false;
          const box = element.getBoundingClientRect();
          return box.width > 0 && box.height > 0;
        };
        return {
          scrollY,
          top: rect?.top ?? null,
          scrollPadding: Number.isFinite(scrollPadding) ? scrollPadding : 0,
          poster: [...document.querySelectorAll('[data-site-poster]')].some(rendered),
          canvases: document.querySelectorAll('canvas').length,
        };
      });
      await shot('m4', null, m4Page);
      const m4Pass =
        m4.top !== null &&
        Math.abs(m4.top - m4.scrollPadding) > 2 &&
        Math.abs(m4.scrollY - 180) <= 20 &&
        m4.poster &&
        m4.canvases === 0;
      checks.push(
        check(
          'M4',
          m4Pass,
          { snap: false, scrollY: '180 ±20 (S11.9 T011i)', poster: true, canvas: 0 },
          {
            method: m4Method,
            emulated: m4Emulated,
            scrollY: m4.scrollY,
            top: m4.top,
            scrollPadding: m4.scrollPadding,
            poster: m4.poster,
            canvases: m4.canvases,
          },
        ),
      );
    } finally {
      await m4Context?.close();
      if (m4Session !== null) {
        await m4Session.send('Emulation.setEmulatedMedia', {
          media: 'screen',
          features: [{ name: 'prefers-reduced-motion', value: 'no-preference' }],
        });
      }
    }

    await gotoPage(page, targetUrl(base, PROJECT_PATH));
    const gate = page.locator('[data-site-control="explore-3d"]');
    await gate.waitFor({ state: 'visible', timeout: WAIT_MS });
    await gate.click({ timeout: WAIT_MS });
    await page.waitForSelector('[data-xploder-ready="true"]', { timeout: 30_000 });
    const proxy = page.locator('[data-xploder-proxy]').first();
    await proxy.waitFor({ state: 'attached', timeout: 30_000 });
    await proxy.focus();
    await page.keyboard.press('Enter');
    await page.waitForSelector('[data-xploder-panel-surface]', { timeout: WAIT_MS });
    await page.waitForFunction(
      () => document.querySelector('[data-xploder-panel-surface]')?.getBoundingClientRect().height > 0,
      undefined,
      { timeout: WAIT_MS },
    );
    const openVisible = await page.locator('[data-xploder-panel-surface]').first().isVisible();
    await shot('m5-open');
    let closeMethod = 'close-control';
    const close = page.locator('[data-xploder-panel-close]').first();
    if (await close.isVisible()) await close.click({ timeout: WAIT_MS });
    await page.waitForTimeout(1_500);
    let closed =
      (await page.locator('[data-xploder-panel-surface]').count()) === 0 ||
      !(await page.locator('[data-xploder-panel-surface]').first().isVisible());
    if (!closed) {
      closeMethod = 'escape';
      await page.keyboard.press('Escape');
      await page.waitForTimeout(1_000);
      closed =
        (await page.locator('[data-xploder-panel-surface]').count()) === 0 ||
        !(await page.locator('[data-xploder-panel-surface]').first().isVisible());
    }
    await shot('m5-closed');
    checks.push(
      check(
        'M5',
        openVisible && closed,
        { panelOpen: true, panelClosed: true },
        { panelOpen: openVisible, panelClosed: closed, closeMethod },
      ),
    );

    const m6Stats = { ...recorder.stats };
    const m6Pass =
      m6Stats.consoleErrors === 0 &&
      m6Stats.pageErrors === 0 &&
      m6Stats.requestFailed === 0 &&
      m6Stats.httpErrors === 0;
    checks.push(
      check(
        'M6',
        m6Pass,
        { consoleErrors: 0, pageErrors: 0, requestFailed: 0, httpErrors: 0 },
        m6Stats,
      ),
    );

    await gotoPage(page, targetUrl(base, '/'));
    const m7Home = await page.evaluate(() => {
      const doc = document.documentElement;
      const before = doc.scrollWidth <= doc.clientWidth;
      window.scrollTo(500, window.scrollY);
      return { before, after: window.scrollX };
    });
    await gotoPage(page, targetUrl(base, PROJECT_PATH));
    const m7Project = await page.evaluate(() => {
      const doc = document.documentElement;
      const before = doc.scrollWidth <= doc.clientWidth;
      window.scrollTo(500, window.scrollY);
      return { before, after: window.scrollX };
    });
    checks.push(
      check(
        'M7',
        m7Home.before && m7Home.after === 0 && m7Project.before && m7Project.after === 0,
        { home: true, project: true, scrollX: 0 },
        { home: m7Home, project: m7Project },
      ),
    );
  } finally {
    const consolePath = recorder.write(outDir);
    const browserMeta = {
      name: browser.browserType().name(),
      version: browser.version(),
      label: browserLabel,
      userAgent:
        cell === 'D2'
          ? await page.evaluate(() => navigator.userAgent).catch(() => null)
          : null,
    };
    await browser.close();
    const ua =
      browserMeta.userAgent;
    const report = {
      kind: 'm1-site-checks-devices',
      version: 1,
      generatedAt: new Date().toISOString(),
      baseUrl: base.origin,
      cell,
      browser: { ...browserMeta, userAgent: ua },
      consoleLog: relativePath(outDir, consolePath),
      checks,
      screenshots,
    };
    return { checks, report };
  }
}

async function main() {
  let options;
  let server = null;
  try {
    options = parseArgs(process.argv.slice(2));
    let base;
    if (options.serve !== undefined) {
      const exportDir = resolve(options.serve);
      if (!existsSync(exportDir) || !statSync(exportDir).isDirectory()) {
        throw new CliFailure(EXIT.UNREACHABLE, `export directory not found: ${options.serve}`);
      }
      const { serveDir } = await import(
        pathToFileURL(join(REPO_ROOT, 'tools/perf/src/serve.ts')).href
      );
      server = await serveDir(exportDir);
      base = new URL(server.url.href);
    } else {
      base = normaliseBase(options['base-url'], '--base-url');
    }
    if (options.preview !== undefined) parseHttpUrl(options.preview, '--preview');

    const result =
      options.part === 'content'
        ? await runContent(options, base)
        : options.part === 'degraded'
          ? await runDegraded(options, base)
          : await runDevices(options, base);

    const outDir = resolve(options.out ?? join(REPO_ROOT, '.evidence/m1/site-checks'));
    const reportPath = writeReport(outDir, options.part, options.cell, result.report);
    printChecks(result.checks);
    console.log(`artifact ${relativePath(REPO_ROOT, reportPath)}`);
    return result.checks.every((entry) => entry.pass) ? EXIT.OK : EXIT.BUDGET;
  } catch (error) {
    if (error instanceof CliFailure) {
      if (error.code === EXIT.USAGE) usage(error.message);
      else console.error(error.message);
      return error.code;
    }
    console.error(error instanceof Error ? error.message : String(error));
    return EXIT.INTERNAL;
  } finally {
    await server?.close();
  }
}

process.exitCode = await main();
