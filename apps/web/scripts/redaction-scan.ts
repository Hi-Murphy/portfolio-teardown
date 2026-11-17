import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { extname, join, relative, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export interface Pattern {
  id: string;
  cls: 'F1' | 'F2' | 'F3' | 'F4' | 'F5' | 'F6' | 'F8' | 'F9';
  source: string;
  flags: string;
  scope: 'all' | 'content';
}

export interface Hit {
  cls: Pattern['cls'];
  patternId: string;
  file: string;
  offset: number;
  match: string;
  jsonPath?: string;
  ruleId?: string;
}

export interface BuildReport {
  raw: number;
  exempted: Record<string, number>;
  unexempted: Hit[];
  byRoute: Record<string, { raw: number; exempted: Record<string, number>; unexempted: number }>;
}

export interface LedgerEntry {
  cls: Pattern['cls'];
  patternId: string;
  match: string;
  reason: string;
}

export const PATTERNS: readonly Pattern[] = [
  {
    id: 'ipv4',
    cls: 'F1',
    source: String.raw`\b\d{1,3}(\.\d{1,3}){3}\b`,
    flags: 'g',
    scope: 'all',
  },
  {
    id: 'ipv6',
    cls: 'F1',
    source: String.raw`\b[0-9a-f]{2,}(?::[0-9a-f]{0,4}){2,}\b`,
    flags: 'gi',
    scope: 'all',
  },
  {
    id: 'host',
    cls: 'F2',
    source: String.raw`\b[a-z0-9-]+\.(local|internal|lan)\b`,
    flags: 'g',
    scope: 'all',
  },
  { id: 'ssh', cls: 'F2', source: 'ssh [a-z]', flags: 'g', scope: 'all' },
  { id: 'ghp_', cls: 'F3', source: 'ghp_', flags: 'g', scope: 'all' },
  { id: 'github_pat_', cls: 'F3', source: 'github_pat_', flags: 'g', scope: 'all' },
  { id: 'sk-', cls: 'F3', source: 'sk-[A-Za-z0-9]', flags: 'g', scope: 'all' },
  { id: 'AKIA', cls: 'F3', source: 'AKIA', flags: 'g', scope: 'all' },
  { id: 'xox', cls: 'F3', source: 'xox[bp]-', flags: 'g', scope: 'all' },
  { id: 'BEGIN', cls: 'F3', source: '-----BEGIN', flags: 'g', scope: 'all' },
  { id: 'eyJ', cls: 'F3', source: 'eyJ', flags: 'g', scope: 'all' },
  {
    id: 'Bearer',
    cls: 'F3',
    source: 'Bearer [A-Za-z0-9._~+/-]+=*',
    flags: 'g',
    scope: 'all',
  },
  {
    id: 'github-url',
    cls: 'F4',
    source: String.raw`github\.com[/:][\w.-]+/[\w.-]+`,
    flags: 'g',
    scope: 'all',
  },
  { id: 'bare', cls: 'F4', source: String.raw`\b[\w-]+/[\w.-]+\b`, flags: 'g', scope: 'content' },
  { id: 'snowflake', cls: 'F5', source: String.raw`\b\d{17,19}\b`, flags: 'g', scope: 'all' },
  {
    id: 'discord-token',
    cls: 'F5',
    source: String.raw`\b[MNO][\w-]{23,25}\.[\w-]{6}\.[\w-]{27,}\b`,
    flags: 'g',
    scope: 'all',
  },
  {
    id: 'telegram-token',
    cls: 'F5',
    source: String.raw`\b\d{8,10}:[\w-]{35}\b`,
    flags: 'g',
    scope: 'all',
  },
  { id: 'home', cls: 'F6', source: String.raw`/home/\w+/`, flags: 'g', scope: 'all' },
  { id: 'users', cls: 'F6', source: String.raw`/Users/\w+/`, flags: 'g', scope: 'all' },
  { id: 'tilde', cls: 'F6', source: '~/[A-Za-z]', flags: 'g', scope: 'all' },
  {
    id: 'account-id',
    cls: 'F8',
    source: String.raw`\b(?:org|proj|prj|team|acct|cus|sub)[-_][A-Za-z0-9]{8,}\b`,
    flags: 'g',
    scope: 'all',
  },
  {
    id: 'email',
    cls: 'F9',
    source: String.raw`[\w.%+-]+@[\w.-]+\.[A-Za-z]{2,}`,
    flags: 'g',
    scope: 'all',
  },
  {
    id: 'phone',
    cls: 'F9',
    source: String.raw`(?:\+\d{1,3}[ .-]?)?\(?\d{2,4}\)?[ .-]\d{3,4}[ .-]\d{3,4}\b`,
    flags: 'g',
    scope: 'all',
  },
];

export const LEDGER: readonly LedgerEntry[] = [
  {
    cls: 'F4',
    patternId: 'github-url',
    match: 'github.com/KhronosGroup/glTF-Sample-Viewer',
    reason: 'three.js glTF sample viewer source reference',
  },
  {
    cls: 'F4',
    patternId: 'github-url',
    match: 'github.com/google/filament',
    reason: 'three.js Filament shader reference',
  },
  {
    cls: 'F4',
    patternId: 'github-url',
    match: 'github.com/react-spring/react-use-measure',
    reason: 'react-use-measure source reference',
  },
  {
    cls: 'F4',
    patternId: 'github-url',
    match: 'github.com/selfshadow/ltc_code',
    reason: 'three.js LTC source reference',
  },
  {
    cls: 'F4',
    patternId: 'github-url',
    match: 'github.com/zloirock/core-js',
    reason: 'core-js license reference',
  },
  {
    cls: 'F5',
    patternId: 'snowflake',
    match: '1377183786949959682',
    reason: 'three.js source comment',
  },
  {
    cls: 'F6',
    patternId: 'tilde',
    match: '~/g',
    reason: 'zod JSON-pointer escape',
  },
];

const F4_ALLOWLIST = new Set(
  ['Hi-Murphy/portfolio-teardown', 'TimurHaryo/websocket-inspector', 'TimurHaryo/jev-toolkit'].map(
    (repo) => repo.toLowerCase(),
  ),
);

const PUBLIC_CONTACT_PATH = fileURLToPath(
  new URL('../../../.specify/content/site.json', import.meta.url),
);
const NUMERIC_CONSTANTS = new Set([
  '9223372036854775807',
  '9223372036854775808',
  '18446744073709551615',
]);
const RULE_IDS = ['X1', 'X2', 'X3', 'X4', 'X5', 'X6', 'X7'] as const;
const GEOMETRY_OPENERS = [
  ' d="',
  ' points="',
  ' transform="',
  ' viewBox="',
  '"d":"',
  '"points":"',
  '"transform":"',
  '"viewBox":"',
  '\\"d\\":\\"',
  '\\"points\\":\\"',
];

let publicContactEmails: Set<string> | undefined;

export function scanText(
  text: string,
  file: string,
  scope: 'content' | 'build',
  patterns: readonly Pattern[] = PATTERNS,
): Hit[] {
  const hits: Hit[] = [];

  for (const pattern of patterns) {
    if (scope === 'build' && pattern.scope === 'content') continue;

    const expression = new RegExp(pattern.source, pattern.flags);
    for (const match of text.matchAll(expression)) {
      if (match.index === undefined) continue;
      hits.push({
        cls: pattern.cls,
        patternId: pattern.id,
        file,
        offset: match.index,
        match: match[0],
      });
    }
  }

  const urlHits = hits.filter((hit) => hit.patternId === 'github-url');
  return hits.filter((hit) => {
    if (hit.patternId === 'github-url') {
      return !isAllowlistedRepo(hit.match);
    }
    if (hit.patternId !== 'bare') return true;
    if (isAllowlistedRepo(hit.match)) return false;
    return !urlHits.some((url) => overlaps(hit, url));
  });
}

export function scanContent(path: string): Hit[] {
  const text = readFileSync(path, 'utf8');
  if (extname(path).toLowerCase() !== '.json') {
    return scanText(text, path, 'content');
  }

  const hits: Hit[] = [];
  walkStrings(JSON.parse(text) as unknown, '', (value, jsonPath) => {
    for (const hit of scanText(value, path, 'content')) {
      hits.push({ ...hit, jsonPath: jsonPath || '$' });
    }
  });
  return hits;
}

export function scanBuild(outDir: string): BuildReport {
  const report: BuildReport = {
    raw: 0,
    exempted: emptyCounts(),
    unexempted: [],
    byRoute: {},
  };

  for (const path of collectBuildFiles(outDir)) {
    const file = relative(outDir, path).split(sep).join('/');
    const route = routeGroup(file);
    const routeReport = (report.byRoute[route] ??= {
      raw: 0,
      exempted: emptyCounts(),
      unexempted: 0,
    });
    const text = readFileSync(path, 'utf8');

    for (const hit of scanText(text, file, 'build')) {
      report.raw += 1;
      routeReport.raw += 1;
      const ruleId = exemptionFor(hit, text);
      if (ruleId === undefined) {
        report.unexempted.push(hit);
        routeReport.unexempted += 1;
      } else {
        report.exempted[ruleId] = (report.exempted[ruleId] ?? 0) + 1;
        routeReport.exempted[ruleId] = (routeReport.exempted[ruleId] ?? 0) + 1;
      }
    }
  }

  return report;
}

export function exemptionFor(hit: Hit, text: string): string | undefined {
  const before = hit.offset > 0 ? (text[hit.offset - 1] ?? '') : '';
  const after = text[hit.offset + hit.match.length] ?? '';
  const afterNext = text[hit.offset + hit.match.length + 1] ?? '';
  const isJavaScript = hit.file.toLowerCase().endsWith('.js');

  if (
    (hit.cls === 'F1' && hit.patternId === 'ipv4') ||
    (hit.cls === 'F5' && hit.patternId === 'snowflake')
  ) {
    if (
      before === '.' ||
      before === '-' ||
      /\d/.test(before) ||
      /\d/.test(after) ||
      (after === '.' && /\d/.test(afterNext)) ||
      insideGeometryValue(hit, text)
    ) {
      return 'X1';
    }
  }

  if (
    hit.cls === 'F1' &&
    hit.patternId === 'ipv6' &&
    isJavaScript &&
    /^[\d:]+$/.test(hit.match) &&
    (before === '?' || before === ':')
  ) {
    return 'X2';
  }

  if (hit.cls === 'F3' && hit.patternId === 'sk-' && /[A-Za-z]/.test(before)) {
    return 'X3';
  }

  if (
    hit.cls === 'F2' &&
    hit.patternId === 'host' &&
    isJavaScript &&
    !['"', "'", '`', '/', '@', ':'].includes(before) &&
    ['.', '&', ')', ',', ';', '}', '?', '|', '='].includes(after)
  ) {
    return 'X4';
  }

  if (hit.cls === 'F9' && hit.patternId === 'email' && contactEmails().has(hit.match)) {
    return 'X5';
  }

  if (hit.cls === 'F5' && hit.patternId === 'snowflake' && NUMERIC_CONSTANTS.has(hit.match)) {
    return 'X6';
  }

  if (
    isJavaScript &&
    LEDGER.some(
      (entry) =>
        entry.cls === hit.cls && entry.patternId === hit.patternId && entry.match === hit.match,
    )
  ) {
    return 'X7';
  }

  return undefined;
}

function isAllowlistedRepo(match: string): boolean {
  let repo = match.replace(/^.*github\.com[/:]/i, '');
  repo = repo.replace(/\.+$/, '');
  repo = repo.replace(/\.git$/i, '');
  return F4_ALLOWLIST.has(repo.toLowerCase());
}

function overlaps(left: Hit, right: Hit): boolean {
  const leftEnd = left.offset + left.match.length;
  const rightEnd = right.offset + right.match.length;
  return left.offset < rightEnd && right.offset < leftEnd;
}

function insideGeometryValue(hit: Hit, text: string): boolean {
  const start = Math.max(0, hit.offset - 200);
  const prefix = text.slice(start, hit.offset);
  let nearest = -1;
  let nearestToken = '';

  for (const opener of GEOMETRY_OPENERS) {
    const index = prefix.lastIndexOf(opener);
    if (index > nearest) {
      nearest = index;
      nearestToken = opener;
    }
  }

  if (nearest < 0) return false;
  const valueStart = start + nearest + nearestToken.length;
  return !text.slice(valueStart, hit.offset).includes('"');
}

function contactEmails(): Set<string> {
  if (publicContactEmails !== undefined) return publicContactEmails;

  const site = JSON.parse(readFileSync(PUBLIC_CONTACT_PATH, 'utf8')) as {
    identity?: { email?: unknown; links?: { url?: unknown }[] };
  };
  const emails = new Set<string>();
  if (typeof site.identity?.email === 'string') emails.add(site.identity.email);
  for (const link of site.identity?.links ?? []) {
    if (typeof link.url !== 'string') continue;
    const email = link.url.replace(/^mailto:/i, '');
    if (email.includes('@')) emails.add(email);
  }
  publicContactEmails = emails;
  return emails;
}

function walkStrings(
  value: unknown,
  path: string,
  visit: (value: string, path: string) => void,
): void {
  if (typeof value === 'string') {
    visit(value, path);
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((entry, index) => walkStrings(entry, `${path}[${index}]`, visit));
    return;
  }
  if (value !== null && typeof value === 'object') {
    for (const [key, entry] of Object.entries(value)) {
      walkStrings(entry, path === '' ? key : `${path}.${key}`, visit);
    }
  }
}

function collectBuildFiles(outDir: string): string[] {
  const files: string[] = [];
  const extensions = new Set(['.html', '.txt', '.js', '.css', '.xml', '.json']);

  function walk(directory: string): void {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) {
        walk(path);
      } else if (entry.isFile() && extensions.has(extname(entry.name).toLowerCase())) {
        files.push(path);
      }
    }
  }

  walk(outDir);
  return files;
}

function routeGroup(file: string): string {
  if (file.startsWith('_next/')) return 'shared-assets';
  if (file === 'projects.html' || file === 'projects.txt' || file.startsWith('projects/__next')) {
    return '/projects';
  }
  const project = /^projects\/([^/]+?)(?:\.html|\.txt|\/.*)$/.exec(file);
  if (project?.[1] !== undefined) return `/projects/${project[1]}`;
  if (file === '404.html' || file.startsWith('_not-found')) return '/404';
  if (file === 'index.html' || file === 'index.txt' || file.startsWith('__next.')) return '/';
  return 'other';
}

function emptyCounts(): Record<string, number> {
  return Object.fromEntries(RULE_IDS.map((ruleId) => [ruleId, 0]));
}

function prefix(match: string): string {
  return match.slice(0, 4);
}

function main(): void {
  const [command, argument, ...rest] = process.argv.slice(2);

  if (command === 'content' && argument !== undefined && rest.length === 0) {
    try {
      const hits = scanContent(argument);
      for (const hit of hits) {
        console.log(
          `G1 ${hit.cls} ${hit.patternId} ${hit.jsonPath ?? hit.offset} ${prefix(hit.match)}…`,
        );
      }
      console.log(`G1 hits: ${hits.length}`);
      process.exitCode = hits.length === 0 ? 0 : 6;
    } catch (error) {
      console.error(error instanceof Error ? error.message : String(error));
      process.exitCode = 2;
    }
    return;
  }

  if (command === 'build' && argument !== undefined && rest.length === 0) {
    if (process.env.PERF_FIXTURES === '1') {
      console.log('G2 skipped: fixture build');
      process.exitCode = 0;
      return;
    }
    if (!existsSync(argument)) {
      console.error(`build output not found: ${argument}`);
      process.exitCode = 2;
      return;
    }

    const report = scanBuild(argument);
    for (const [route, counts] of Object.entries(report.byRoute).sort(([a], [b]) =>
      a.localeCompare(b),
    )) {
      const exempted = RULE_IDS.filter((ruleId) => counts.exempted[ruleId] > 0)
        .map((ruleId) => `${ruleId}=${counts.exempted[ruleId]}`)
        .join(' ');
      console.log(
        `${route.padEnd(38)} raw=${counts.raw} exempted=${exempted || 'none'} unexempted=${counts.unexempted}`,
      );
    }
    console.log(`G2 unexempted: ${report.unexempted.length}`);
    for (const hit of report.unexempted) {
      console.log(`${hit.cls} ${hit.patternId} ${hit.file}:${hit.offset} ${prefix(hit.match)}…`);
    }
    process.exitCode = report.unexempted.length === 0 ? 0 : 6;
    return;
  }

  console.error('usage: redaction-scan.ts content <file> | build <outDir>');
  process.exitCode = 2;
}

const entry = process.argv[1];
if (entry !== undefined && import.meta.url === pathToFileURL(entry).href) {
  main();
}
