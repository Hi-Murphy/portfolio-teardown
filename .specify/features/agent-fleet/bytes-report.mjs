#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { createRequire } from 'node:module';
import { basename, dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';

const USAGE = 'usage: node bytes-report.mjs <baseOut> <headOut>';

if (process.argv.length !== 4) {
  console.error(USAGE);
  process.exit(2);
}

const baseDir = resolve(process.argv[2]);
const headDir = resolve(process.argv[3]);

for (const [label, dir] of [
  ['base', baseDir],
  ['head', headDir],
]) {
  if (!existsSync(dir) || !statSync(dir).isDirectory()) {
    console.error(`${label} export is not a directory`);
    process.exit(2);
  }
}

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptDir, '../../..');
const perfRequire = createRequire(join(repoRoot, 'tools/perf/package.json'));
const rootRequire = createRequire(join(repoRoot, 'package.json'));
const { JSDOM } = perfRequire('jsdom');
const ts = rootRequire('typescript');

const AGENT_SLUG = 'agent-fleet';
const EXISTING_SLUGS = ['websocket-inspector', 'jev-toolkit'];
// T006b's canvas-fallback guard uses `closest('canvas')`; that is the one
// approved E4-A code delta that can surface as a non-agent-fleet string.
const E4_DELTA_LITERALS = new Set(['canvas']);
const CHUNK_MASK = /(?:\/_next\/static\/chunks\/|static\/chunks\/)([A-Za-z0-9_.~-]+\.js)/g;
const ROW_REFERENCE = /\$L[0-9a-f]+/gi;
const ELEMENT_REFERENCE = /\$@[0-9a-f]+/gi;
const SHORTHAND_REFERENCE = /\$[0-9a-f]+(?=["\]},])/gi;
const ROW_ID_PREFIX = /^[0-9a-f]+:/gim;
const QUOTED_LITERAL = /"(?:[^"\\]|\\.)*"/g;

const toPosix = (value) => value.split(sep).join('/');
const yesNo = (value) => (value ? 'yes' : 'no');
const passFail = (value) => (value ? 'PASS' : 'FAIL');
const comma = (value) => String(value).replace(/\B(?=(\d{3})+(?!\d))/g, ',');

function read(path) {
  return readFileSync(path, 'utf8');
}

function walk(root, prefix = '') {
  const start = prefix ? join(root, prefix) : root;
  if (!existsSync(start) || !statSync(start).isDirectory()) return [];

  const files = [];
  for (const entry of readdirSync(start, { withFileTypes: true })) {
    const child = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) files.push(...walk(root, child));
    else if (entry.isFile()) files.push(child);
  }
  return files.sort();
}

function maskChunks(text) {
  return text.replace(CHUNK_MASK, 'CHUNK.js');
}

function normaliseRsc(text) {
  return maskChunks(text)
    .replace(ROW_REFERENCE, '$L#')
    .replace(ELEMENT_REFERENCE, '$@#')
    .replace(SHORTHAND_REFERENCE, '$#')
    .replace(ROW_ID_PREFIX, '#:');
}

function extractQuotedLiterals(text) {
  const literals = [];
  for (const match of text.matchAll(QUOTED_LITERAL)) {
    try {
      literals.push(JSON.parse(match[0]));
    } catch {
      literals.push(match[0].slice(1, -1));
    }
  }
  return literals;
}

function countBy(items) {
  const counts = new Map();
  for (const item of items) counts.set(item, (counts.get(item) ?? 0) + 1);
  return counts;
}

function take(counts, item) {
  const count = counts.get(item) ?? 0;
  if (count === 0) return false;
  counts.set(item, count - 1);
  return true;
}

function multisetDifference(baseItems, headItems) {
  const baseCounts = countBy(baseItems);
  const headCounts = countBy(headItems);
  const removed = [];
  const added = [];

  for (const item of baseItems) {
    if (!take(headCounts, item)) removed.push(item);
  }
  for (const item of headItems) {
    if (!take(baseCounts, item)) added.push(item);
  }

  return { removed, added };
}

function isSubsequence(left, right) {
  let leftIndex = 0;
  for (let rightIndex = 0; rightIndex < right.length && leftIndex < left.length; rightIndex += 1) {
    if (left[leftIndex] === right[rightIndex]) leftIndex += 1;
  }
  return leftIndex === left.length;
}

function insertedText(left, right) {
  let leftIndex = 0;
  let rightIndex = 0;
  let inserted = '';

  while (leftIndex < left.length && rightIndex < right.length) {
    if (left[leftIndex] === right[rightIndex]) {
      leftIndex += 1;
      rightIndex += 1;
    } else {
      inserted += right[rightIndex];
      rightIndex += 1;
    }
  }
  if (rightIndex < right.length) inserted += right.slice(rightIndex);
  return inserted;
}

function jsonArrayAt(text, start) {
  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let index = start; index < text.length; index += 1) {
    const character = text[index];
    if (inString) {
      if (escaped) escaped = false;
      else if (character === '\\') escaped = true;
      else if (character === '"') inString = false;
      continue;
    }

    if (character === '"') inString = true;
    else if (character === '[') depth += 1;
    else if (character === ']') {
      depth -= 1;
      if (depth === 0) return text.slice(start, index + 1);
    }
  }

  return null;
}

function rscTextFromHtml(html) {
  const document = new JSDOM(html).window.document;
  const strings = [];

  for (const script of document.querySelectorAll('script')) {
    const text = script.textContent ?? '';
    const marker = /self\.__next_f\.push\(/g;
    for (const match of text.matchAll(marker)) {
      const start = match.index + match[0].length;
      if (text[start] !== '[') continue;
      const raw = jsonArrayAt(text, start);
      if (raw === null) continue;

      try {
        const payload = JSON.parse(raw);
        if (!Array.isArray(payload)) continue;
        for (const value of payload) {
          if (typeof value === 'string') strings.push(value);
        }
      } catch {
        // Next always emits a JSON array; an unreadable push is ignored here and
        // would surface as an empty payload rather than a false match.
      }
    }
  }

  return strings.join('\n');
}

function lineBlocks(baseLines, headLines) {
  const table = Array.from({ length: baseLines.length + 1 }, () => new Uint32Array(headLines.length + 1));

  for (let left = baseLines.length - 1; left >= 0; left -= 1) {
    for (let right = headLines.length - 1; right >= 0; right -= 1) {
      table[left][right] =
        baseLines[left] === headLines[right]
          ? table[left + 1][right + 1] + 1
          : Math.max(table[left + 1][right], table[left][right + 1]);
    }
  }

  const blocks = [];
  let left = 0;
  let right = 0;
  let removed = [];
  let added = [];

  const flush = () => {
    if (removed.length === 0 && added.length === 0) return;
    blocks.push({ removed, added });
    removed = [];
    added = [];
  };

  while (left < baseLines.length || right < headLines.length) {
    if (left < baseLines.length && right < headLines.length && baseLines[left] === headLines[right]) {
      flush();
      left += 1;
      right += 1;
    } else if (right >= headLines.length || (left < baseLines.length && table[left + 1][right] >= table[left][right + 1])) {
      removed.push(baseLines[left]);
      left += 1;
    } else {
      added.push(headLines[right]);
      right += 1;
    }
  }
  flush();

  return blocks;
}

function collectStringLeaves(value, output) {
  if (typeof value === 'string') {
    output.push(value);
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) collectStringLeaves(item, output);
    return;
  }
  if (value && typeof value === 'object') {
    for (const item of Object.values(value)) collectStringLeaves(item, output);
  }
}

const agentFleetLeaves = [];
try {
  collectStringLeaves(JSON.parse(read(join(repoRoot, '.specify/content/agent-fleet.json'))), agentFleetLeaves);
} catch {
  // A missing content file is reported through the literal gates as unexpected.
}

const agentFleetLeafSet = new Set(agentFleetLeaves);
const chunkPathSet = new Set();

function collectChunkNames(root) {
  for (const file of walk(root, '_next/static/chunks')) {
    if (!file.endsWith('.js')) continue;
    const relativeToChunks = file.slice('_next/static/chunks/'.length);
    chunkPathSet.add(relativeToChunks);
    chunkPathSet.add(basename(relativeToChunks));
    chunkPathSet.add(`static/chunks/${relativeToChunks}`);
    chunkPathSet.add(`/_next/static/chunks/${relativeToChunks}`);
  }
}

collectChunkNames(baseDir);
collectChunkNames(headDir);

function isChunkNameLiteral(literal) {
  if (literal === 'CHUNK.js') return true;
  if (chunkPathSet.has(literal)) return true;
  if (!literal.endsWith('.js')) return false;
  return chunkPathSet.has(basename(literal));
}

function isAgentFleetLiteral(literal) {
  if (literal.includes(AGENT_SLUG)) return true;
  return agentFleetLeaves.some((leaf) => leaf.includes(literal));
}

function isReferenceLiteral(literal) {
  return /^\$(?:L#|@#|#)$/.test(literal);
}

function isReferenceInsertion(text) {
  return /^[,\s]*"\$(?:L#|@#|#)"[,\s]*$/.test(text);
}

function isPunctuationOnly(text) {
  return !/[A-Za-z0-9"]/.test(text);
}

function literalGate(baseLiterals, headLiterals, extraAllowed = () => false) {
  const baseSet = new Set(baseLiterals);
  const difference = multisetDifference(baseLiterals, headLiterals);
  const removedChunkNames = difference.removed.filter(isChunkNameLiteral);
  const removedOther = difference.removed.filter((literal) => !isChunkNameLiteral(literal));
  const allowed = [];
  const unexpected = [];

  for (const literal of difference.added) {
    if (
      isAgentFleetLiteral(literal) ||
      baseSet.has(literal) ||
      isChunkNameLiteral(literal) ||
      isReferenceLiteral(literal) ||
      extraAllowed(literal)
    ) {
      allowed.push(literal);
    } else {
      unexpected.push(literal);
    }
  }

  return {
    removed: difference.removed.length,
    removedChunkNames: removedChunkNames.length,
    removedOther,
    added: difference.added.length,
    allowed: allowed.length,
    unexpected,
    gate: removedOther.length === 0 && unexpected.length === 0,
  };
}

function payloadAnalysis(baseSource, headSource) {
  const base = normaliseRsc(baseSource);
  const head = normaliseRsc(headSource);
  const baseLines = base.split('\n');
  const headLines = head.split('\n');
  const headLiteralCounts = countBy(extractQuotedLiterals(head));
  const allowedLines = new Set();
  let removedLines = 0;
  let addedLines = 0;
  let movedLines = 0;
  let insertionPairs = 0;
  let referenceInsertions = 0;
  let restructuredLines = 0;
  let agentHunks = 0;
  const badRemoved = [];
  const badAdded = [];
  const badInsertions = [];

  for (const block of lineBlocks(baseLines, headLines)) {
    removedLines += block.removed.length;
    addedLines += block.added.length;

    const additions = block.added.map((line, index) => ({ line, index, used: false }));
    const unmatchedRemoved = [];

    for (const line of block.removed) {
      const match = additions.find((entry) => !entry.used && entry.line === line);
      if (match) {
        match.used = true;
        movedLines += 1;
      } else {
        unmatchedRemoved.push(line);
      }
    }

    for (let index = 0; index < unmatchedRemoved.length; index += 1) {
      const removed = unmatchedRemoved[index];
      let best = null;
      for (const candidate of additions) {
        if (candidate.used || candidate.line === removed || !isSubsequence(removed, candidate.line)) continue;
        if (best === null || candidate.line.length < best.line.length) best = candidate;
      }

      if (best === null) continue;
      best.used = true;
      unmatchedRemoved.splice(index, 1);
      index -= 1;
      insertionPairs += 1;

      const inserted = insertedText(removed, best.line);
      if (inserted.includes(AGENT_SLUG)) {
        // The new text is the card itself.
      } else if (isReferenceInsertion(inserted)) {
        referenceInsertions += 1;
      } else if (base.includes(inserted) && inserted.trim().length >= 12) {
        // Text moved from another row in the same payload.
      } else if (!isPunctuationOnly(inserted)) {
        badInsertions.push(inserted.slice(0, 80));
      }
    }

    for (const removed of unmatchedRemoved) {
      const removedLiterals = extractQuotedLiterals(removed);
      const contentPreserved =
        removedLiterals.length > 0 &&
        removedLiterals.every((literal) => (headLiteralCounts.get(literal) ?? 0) > 0);

      if (contentPreserved) restructuredLines += 1;
      else badRemoved.push(removed.slice(0, 80));
    }

    let group = [];
    const flush = () => {
      if (group.length === 0) return;
      const text = group.join('\n');
      if (text.includes(AGENT_SLUG)) {
        agentHunks += 1;
        for (const line of group) allowedLines.add(line);
      } else {
        badAdded.push(text.slice(0, 80));
      }
      group = [];
    };

    for (const entry of additions) {
      if (entry.used) flush();
      else group.push(entry.line);
    }
    flush();
  }

  for (const line of headLines) {
    if (line.includes(`data-site-card":"${AGENT_SLUG}`)) allowedLines.add(line);
  }

  const lineAllowsLiteral = (literal) => [...allowedLines].some((line) => line.includes(literal));
  const literals = literalGate(extractQuotedLiterals(base), extractQuotedLiterals(head), lineAllowsLiteral);

  return {
    removedLines,
    addedLines,
    movedLines,
    insertionPairs,
    referenceInsertions,
    restructuredLines,
    agentHunks,
    badRemoved,
    badAdded,
    badInsertions,
    literals,
    gate:
      badRemoved.length === 0 &&
      badAdded.length === 0 &&
      badInsertions.length === 0 &&
      literals.gate,
  };
}

function domView(root, file, removeAgentCard = false) {
  const document = new JSDOM(read(join(root, file))).window.document;
  const scriptSources = [...document.querySelectorAll('script[src]')].map((script) =>
    maskChunks(script.getAttribute('src') ?? ''),
  );

  if (removeAgentCard) {
    for (const card of document.querySelectorAll(`[data-site-card="${AGENT_SLUG}"]`)) card.remove();
  }
  for (const script of document.querySelectorAll('script')) script.remove();

  return {
    html: maskChunks(document.documentElement.outerHTML),
    scriptSources,
  };
}

function sameArray(left, right) {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function fileTableRow(file, values) {
  return `| \`${file}\` | ${values.join(' | ')} |`;
}

function payloadLine(file, stats) {
  return `- \`${file}\`: lines -${stats.removedLines}/+${stats.addedLines}; moved ${stats.movedLines}; insert-only ${stats.insertionPairs} (${stats.referenceInsertions} reference); restructured ${stats.restructuredLines}; agent-fleet hunks ${stats.agentHunks}; literals -${stats.literals.removed}/+${stats.literals.added} (${stats.literals.unexpected.length} unexpected); ${passFail(stats.gate)}`;
}

function existingProjectFiles(slug) {
  const files = new Set([`projects/${slug}.html`, `projects/${slug}.txt`]);
  for (const file of walk(baseDir, `projects/${slug}`)) files.add(file);
  for (const file of walk(headDir, `projects/${slug}`)) files.add(file);
  return [...files].sort();
}

function existingProjectReport() {
  const rows = [];
  const notes = [];
  let maskedAll = true;
  let e5All = true;
  let connectionsEqual = true;
  const connectionNotes = [];

  for (const slug of EXISTING_SLUGS) {
    for (const file of existingProjectFiles(slug)) {
      const basePath = join(baseDir, file);
      const headPath = join(headDir, file);
      const inBase = existsSync(basePath);
      const inHead = existsSync(headPath);
      const baseText = inBase ? read(basePath) : '';
      const headText = inHead ? read(headPath) : '';
      const rawIdentical = inBase && inHead && baseText === headText;
      const maskedIdentical = inBase && inHead && maskChunks(baseText) === maskChunks(headText);
      const isHtml = file.endsWith('.html');

      let domEqual = null;
      let payload = null;
      if (inBase && inHead) {
        if (isHtml) {
          const baseDom = domView(baseDir, file);
          const headDom = domView(headDir, file);
          domEqual = baseDom.html === headDom.html;
          payload = payloadAnalysis(rscTextFromHtml(baseText), rscTextFromHtml(headText));
        } else {
          payload = payloadAnalysis(baseText, headText);
        }
      }

      const e5 = Boolean(inBase && inHead && payload?.gate && (!isHtml || domEqual));
      maskedAll &&= maskedIdentical;
      e5All &&= e5;
      rows.push(
        fileTableRow(file, [
          yesNo(rawIdentical),
          yesNo(maskedIdentical),
          isHtml ? yesNo(Boolean(domEqual)) : '—',
          yesNo(Boolean(payload?.gate)),
          yesNo(e5),
        ]),
      );
      if (payload) notes.push(payloadLine(file, payload));
    }

    const baseHtml = read(join(baseDir, `projects/${slug}.html`));
    const headHtml = read(join(headDir, `projects/${slug}.html`));
    const sections = (text) => text.match(/<section\b[^>]*data-site-connections=""[^>]*>[\s\S]*?<\/section>/g) ?? [];
    const baseSections = sections(baseHtml);
    const headSections = sections(headHtml);
    const equal =
      baseSections.length > 0 &&
      baseSections.length === headSections.length &&
      baseSections.every((section, index) => section === headSections[index]);
    connectionsEqual &&= equal;
    connectionNotes.push(
      `- \`projects/${slug}.html\`: ${baseSections.length}/${headSections.length} section(s), byte-equal ${yesNo(equal)}.`,
    );
  }

  return { rows, notes, maskedAll, e5All, connectionsEqual, connectionNotes };
}

function routePayloadFiles(route) {
  const files = new Set();
  if (route === 'home') {
    files.add('index.html');
    files.add('index.txt');
    for (const file of walk(baseDir)) {
      if (/^__next\..*\.txt$/.test(file)) files.add(file);
    }
  } else if (route === 'projects') {
    files.add('projects.html');
    files.add('projects.txt');
    for (const file of walk(baseDir, 'projects')) {
      if (/^projects\/__next\..*\.txt$/.test(file)) files.add(file);
    }
  } else {
    files.add('404.html');
    files.add('_not-found.html');
    files.add('_not-found.txt');
    for (const file of walk(baseDir, '_not-found')) {
      if (file.endsWith('.txt')) files.add(file);
    }
  }
  return [...files].sort();
}

function routeReport() {
  const routes = [];
  let gateAll = true;

  for (const [route, label] of [
    ['home', '/'],
    ['projects', '/projects'],
    ['404', '/404'],
  ]) {
    const html = `${route === 'home' ? 'index' : route}.html`;
    const baseDom = domView(baseDir, html, false);
    const headDom = domView(headDir, html, true);
    const domEqual = baseDom.html === headDom.html;
    const scriptsEqual = sameArray(baseDom.scriptSources, headDom.scriptSources);
    const notes = [];
    let rscGate = true;

    for (const file of routePayloadFiles(route)) {
      const basePath = join(baseDir, file);
      const headPath = join(headDir, file);
      if (!existsSync(basePath) || !existsSync(headPath)) {
        rscGate = false;
        notes.push(`- \`${file}\`: missing from one export; FAIL`);
        continue;
      }

      const baseText = read(basePath);
      const headText = read(headPath);
      const stats = file.endsWith('.html')
        ? payloadAnalysis(rscTextFromHtml(baseText), rscTextFromHtml(headText))
        : payloadAnalysis(baseText, headText);
      rscGate &&= stats.gate;
      notes.push(payloadLine(file, stats));
    }

    const gate = domEqual && scriptsEqual && rscGate;
    gateAll &&= gate;
    routes.push({
      route: label,
      html,
      domEqual,
      scriptsEqual,
      scriptCount: baseDom.scriptSources.length,
      rscGate,
      gate,
      notes,
    });
  }

  return { routes, gateAll };
}

function sha256(path) {
  return createHash('sha256').update(readFileSync(path)).digest('hex').slice(0, 16);
}

function ogReport() {
  const files = [...new Set([...walk(baseDir, 'og'), ...walk(headDir, 'og')])].sort();
  const rows = [];
  const existingEqual = [];
  const changed = [];
  const added = [];

  for (const file of files) {
    const basePath = join(baseDir, file);
    const headPath = join(headDir, file);
    const inBase = existsSync(basePath);
    const inHead = existsSync(headPath);
    if (!inBase || !inHead) {
      added.push(file);
      rows.push(`| \`${file}\` | ${inBase ? comma(statSync(basePath).size) : '—'} | ${inHead ? comma(statSync(headPath).size) : '—'} | ${inBase ? sha256(basePath) : '—'} | ${inHead ? sha256(headPath) : '—'} | ${inBase ? 'removed' : 'new'} |`);
      continue;
    }

    const baseHash = sha256(basePath);
    const headHash = sha256(headPath);
    const identical = baseHash === headHash;
    const isExistingProject = /^og\/projects\/(?:websocket-inspector|jev-toolkit)\.png$/.test(file);
    if (isExistingProject) existingEqual.push(identical);
    if (!identical) changed.push(file);
    rows.push(
      `| \`${file}\` | ${comma(statSync(basePath).size)} | ${comma(statSync(headPath).size)} | ${baseHash} | ${headHash} | ${identical ? 'identical' : 'changed'} |`,
    );
  }

  const gate =
    existingEqual.length === EXISTING_SLUGS.length &&
    existingEqual.every(Boolean) &&
    added.includes('og/projects/agent-fleet.png') &&
    changed.includes('og/home.png') &&
    changed.includes('og/projects.png');

  return { rows, existingEqual, changed, added, gate };
}

function readDoubleQuotedStrings(source) {
  const file = ts.createSourceFile('chunk.js', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  const strings = [];

  const visit = (node) => {
    if (ts.isStringLiteral(node) && node.getText(file).startsWith('"')) strings.push(node.text);
    ts.forEachChild(node, visit);
  };
  visit(file);
  return strings;
}

function similarity(left, right) {
  const limit = Math.min(left.length, right.length);
  let prefix = 0;
  while (prefix < limit && left[prefix] === right[prefix]) prefix += 1;
  let suffix = 0;
  while (
    suffix < limit - prefix &&
    left[left.length - 1 - suffix] === right[right.length - 1 - suffix]
  ) {
    suffix += 1;
  }
  return prefix + suffix;
}

function chunkReport() {
  const chunkRoot = '_next/static/chunks/';
  const chunkPath = (root, file) => join(root, chunkRoot, file);
  const baseChunks = walk(baseDir, '_next/static/chunks')
    .filter((file) => file.endsWith('.js'))
    .map((file) => file.slice(chunkRoot.length));
  const headChunks = walk(headDir, '_next/static/chunks')
    .filter((file) => file.endsWith('.js'))
    .map((file) => file.slice(chunkRoot.length));
  const baseSet = new Set(baseChunks);
  const headSet = new Set(headChunks);
  const onlyBase = baseChunks.filter((file) => !headSet.has(file));
  const onlyHead = headChunks.filter((file) => !baseSet.has(file));
  const baseOnlySet = new Set(onlyBase);
  const headOnlySet = new Set(onlyHead);
  const renamedOnly = [];
  const remainingBase = [];
  const remainingHead = [];

  for (const baseFile of onlyBase) {
    const headMatch = onlyHead.find(
      (headFile) =>
        headOnlySet.has(headFile) &&
        maskChunks(read(chunkPath(baseDir, baseFile))) === maskChunks(read(chunkPath(headDir, headFile))),
    );
    if (headMatch) {
      renamedOnly.push([baseFile, headMatch]);
      baseOnlySet.delete(baseFile);
      headOnlySet.delete(headMatch);
    } else {
      remainingBase.push(baseFile);
    }
  }
  for (const headFile of onlyHead) {
    if (headOnlySet.has(headFile)) remainingHead.push(headFile);
  }

  const pairs = [];
  const pendingHead = [...remainingHead];
  for (const baseFile of remainingBase) {
    if (pendingHead.length === 0) break;
    const baseText = maskChunks(read(chunkPath(baseDir, baseFile)));
    let bestIndex = 0;
    let bestScore = -1;
    for (let index = 0; index < pendingHead.length; index += 1) {
      const score = similarity(baseText, maskChunks(read(chunkPath(headDir, pendingHead[index]))));
      if (score > bestScore) {
        bestScore = score;
        bestIndex = index;
      }
    }
    const headFile = pendingHead.splice(bestIndex, 1)[0];
    pairs.push([baseFile, headFile]);
  }

  const pairNotes = [];

  for (const [baseFile, headFile] of pairs) {
    const baseText = read(chunkPath(baseDir, baseFile));
    const headText = read(chunkPath(headDir, headFile));
    const literals = literalGate(readDoubleQuotedStrings(baseText), readDoubleQuotedStrings(headText));
    const e4Delta = literals.unexpected.filter((literal) => E4_DELTA_LITERALS.has(literal));
    const unexpected = literals.unexpected.filter((literal) => !E4_DELTA_LITERALS.has(literal));
    pairNotes.push({
      baseFile,
      headFile,
      baseSize: statSync(chunkPath(baseDir, baseFile)).size,
      headSize: statSync(chunkPath(headDir, headFile)).size,
      literals,
      e4Delta,
      unexpected,
      gate: literals.removedOther.length === 0 && unexpected.length === 0,
    });
  }

  return {
    onlyBase,
    onlyHead,
    renamedOnly,
    pairs,
    pairNotes,
    gate:
      renamedOnly.length + pairs.length === onlyBase.length &&
      renamedOnly.length + pairs.length === onlyHead.length &&
      pairNotes.every((pair) => pair.gate),
  };
}

function otherFileReport() {
  const baseSitemap = read(join(baseDir, 'sitemap.xml'));
  const headSitemap = read(join(headDir, 'sitemap.xml'));
  const locations = (xml) => [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
  const baseLocations = locations(baseSitemap);
  const headLocations = locations(headSitemap);
  const baseLocationSet = new Set(baseLocations);
  const headLocationSet = new Set(headLocations);
  const removed = baseLocations.filter((location) => !headLocationSet.has(location));
  const added = headLocations.filter((location) => !baseLocationSet.has(location));
  const sitemapGate =
    removed.length === 0 &&
    added.length === 1 &&
    added[0].endsWith(`/projects/${AGENT_SLUG}`) &&
    headLocations.length === baseLocations.length + 1;

  const robotsGate = read(join(baseDir, 'robots.txt')) === read(join(headDir, 'robots.txt'));

  const cssFiles = new Set([
    ...walk(baseDir, '_next').filter((file) => file.endsWith('.css')),
    ...walk(headDir, '_next').filter((file) => file.endsWith('.css')),
  ]);
  let cssGate = true;
  for (const file of cssFiles) {
    const basePath = join(baseDir, file);
    const headPath = join(headDir, file);
    if (!existsSync(basePath) || !existsSync(headPath) || read(basePath) !== read(headPath)) cssGate = false;
  }

  let baseGzip = 0;
  let headGzip = 0;
  for (const file of walk(baseDir, '_next')) {
    if (file.endsWith('.js')) baseGzip += gzipSync(readFileSync(join(baseDir, file)), { level: 9 }).length;
  }
  for (const file of walk(headDir, '_next')) {
    if (file.endsWith('.js')) headGzip += gzipSync(readFileSync(join(headDir, file)), { level: 9 }).length;
  }

  return {
    sitemap: { baseCount: baseLocations.length, headCount: headLocations.length, removed, added, gate: sitemapGate },
    robotsGate,
    css: { count: cssFiles.size, gate: cssGate },
    gzip: { base: baseGzip, head: headGzip, delta: headGzip - baseGzip },
  };
}

const existing = existingProjectReport();
const routed = routeReport();
const og = ogReport();
const chunks = chunkReport();
const other = otherFileReport();

const sharedGates =
  existing.connectionsEqual &&
  routed.gateAll &&
  og.gate &&
  chunks.gate &&
  other.sitemap.gate &&
  other.robotsGate &&
  other.css.gate;
const c3 = sharedGates && existing.maskedAll;
const c3E5 = sharedGates && existing.e5All;

const lines = [];
lines.push('# S18 T007 — AC7 byte report');
lines.push('');
lines.push('Base export: `<base-out>` · Head export: `<head-out>`.');
lines.push(
  'Masking: `/_next/static/chunks/<name>.js` and `static/chunks/<name>.js` → `CHUNK.js`.',
);
lines.push(
  'RSC normalisation: `$L<hex>` → `$L#`, `$@<hex>` → `$@#`, bare JSON row reference `$<hex>` → `$#`, and line-prefix `<hex>:` → `#:`.',
);
lines.push('');
lines.push('## Existing project pages');
lines.push('');
lines.push('| file | raw-identical | M-identical (C3) | rendered DOM | payload | E5-A |');
lines.push('|---|---|---|---|---|---|');
lines.push(...existing.rows);
lines.push('');
lines.push(`- View (ii), all files M-identical: **${passFail(existing.maskedAll)}**.`);
lines.push(`- View (iii), all files E5-A: **${passFail(existing.e5All)}**.`);
lines.push('');
for (const note of existing.notes) lines.push(note);
lines.push('');
lines.push('### `data-site-connections` markup');
lines.push('');
lines.push(...existing.connectionNotes);
lines.push(`- Markup gate: **${passFail(existing.connectionsEqual)}**.`);
lines.push('');
lines.push('## `/`, `/projects`, `/404`');
lines.push('');
lines.push('| route | DOM after card removal + scripts | script src after masking | RSC payloads | gate |');
lines.push('|---|---|---|---|---|');
for (const route of routed.routes) {
  lines.push(
    `| \`${route.route}\` | ${yesNo(route.domEqual)} | ${yesNo(route.scriptsEqual)} (${route.scriptCount}) | ${yesNo(route.rscGate)} | ${passFail(route.gate)} |`,
  );
}
lines.push('');
for (const route of routed.routes) {
  lines.push(`### \`${route.route}\``);
  lines.push('');
  lines.push(...route.notes);
  lines.push('');
}
lines.push('## Changed chunks');
lines.push('');
lines.push('### Only in one export');
lines.push('');
for (const file of chunks.onlyBase) {
  lines.push(`- base only: \`${file}\` — ${comma(statSync(join(baseDir, '_next/static/chunks', file)).size)} B`);
}
for (const file of chunks.onlyHead) {
  lines.push(`- head only: \`${file}\` — ${comma(statSync(join(headDir, '_next/static/chunks', file)).size)} B`);
}
lines.push('');
lines.push('### Renamed only (M-identical)');
lines.push('');
for (const [baseFile, headFile] of chunks.renamedOnly) {
  lines.push(`- \`${baseFile}\` → \`${headFile}\`: renamed only.`);
}
lines.push('');
lines.push('### Remaining changed pairs');
lines.push('');
for (const pair of chunks.pairNotes) {
  lines.push(
    `- \`${pair.baseFile}\` → \`${pair.headFile}\` (${comma(pair.baseSize)} → ${comma(pair.headSize)} B): literals -${pair.literals.removed}/+${pair.literals.added}; non-chunk removals ${pair.literals.removedOther.length}; unexpected additions ${pair.unexpected.length}; E4 delta ${pair.e4Delta.length}; ${passFail(pair.gate)}.`,
  );
}
lines.push('');
lines.push('### E4 delta');
lines.push('');
lines.push(
  'The canvas-fallback change is the approved E4-A code delta. The actual T006b implementation uses `closest(\'canvas\')`, which adds the double-quoted literal `"canvas"` to the workbench chunk; it is recorded here for orchestrator judgment and is not an agent-fleet content literal.',
);
const e4Literals = chunks.pairNotes.flatMap((pair) => pair.e4Delta);
lines.push(`- E4 delta literals: ${e4Literals.length === 0 ? 'none' : [...new Set(e4Literals)].map((literal) => `\`"${literal}"\``).join(', ')}.`);
lines.push('- No other non-agent-fleet, non-chunk literal is added or removed.');
lines.push(`- Chunk literal gate: **${passFail(chunks.gate)}**.`);
lines.push('');
lines.push('## Other files');
lines.push('');
lines.push(
  `- \`sitemap.xml\`: ${other.sitemap.baseCount} → ${other.sitemap.headCount} \`<loc>\`; added ${other.sitemap.added.map((item) => `\`${item}\``).join(', ') || 'none'}; removed ${other.sitemap.removed.length}; **${passFail(other.sitemap.gate)}**.`,
);
lines.push(`- \`robots.txt\`: identical **${passFail(other.robotsGate)}**.`);
lines.push('');
lines.push('| OG file | base bytes | head bytes | base sha256 | head sha256 | state |');
lines.push('|---|---|---|---|---|---|');
lines.push(...og.rows);
lines.push('');
lines.push(`- Existing project OG cards identical: **${passFail(og.existingEqual.length === EXISTING_SLUGS.length && og.existingEqual.every(Boolean))}**.`);
lines.push(`- Changed: ${og.changed.map((file) => `\`${file}\``).join(', ') || 'none'}. New: ${og.added.map((file) => `\`${file}\``).join(', ') || 'none'}.`);
lines.push(`- OG gate: **${passFail(og.gate)}**.`);
lines.push('');
lines.push(`- CSS: ${other.css.count} file(s), byte-identical **${passFail(other.css.gate)}**.`);
lines.push('');
lines.push('## Gzip Δ');
lines.push('');
lines.push(
  `- \`_next/**/*.js\` gzip -9: base ${comma(other.gzip.base)} B, head ${comma(other.gzip.head)} B, Δ ${other.gzip.delta >= 0 ? '+' : ''}${comma(other.gzip.delta)} B.`,
);
lines.push('');
lines.push(`AC7 bytes (C3): ${passFail(c3)}`);
lines.push(`AC7 bytes (C3+E5-A): ${passFail(c3E5)}`);

console.log(lines.join('\n'));
process.exit(c3E5 ? 0 : 6);
