import { describe, expect, test } from 'vitest';

import { motion, resolveMotion, type MotionTokens } from '../src/motion';
import matrix from './a11y-motion-matrix.json';

interface MatrixSite {
  readonly file: string;
  readonly symbol: string;
}

interface MatrixRow {
  readonly id: string;
  readonly slice: string;
  readonly site: MatrixSite;
  readonly trigger: string;
  readonly tokens: readonly string[];
  readonly twin: string;
  readonly browserCheck: string;
}

interface AnimationHit {
  readonly file: string;
  readonly line: number;
  readonly rule: string;
  readonly snippet: string;
}

interface ScanRule {
  readonly rule: string;
  readonly pattern: RegExp;
}

type RawImportMeta = ImportMeta & {
  glob(
    pattern: string,
    options: { query: '?raw'; import: 'default'; eager: true },
  ): Record<string, unknown>;
};

const SOURCE_FILES = {
  ...(import.meta as RawImportMeta).glob('../../../packages/xploder/src/**/*.{ts,tsx,js,mjs,css}', {
    query: '?raw',
    import: 'default',
    eager: true,
  }),
  ...(import.meta as RawImportMeta).glob('../../../apps/web/app/**/*.{ts,tsx,js,mjs,css}', {
    query: '?raw',
    import: 'default',
    eager: true,
  }),
};
const SOURCE_CONTENT = new Map(
  Object.entries(SOURCE_FILES).map(([key, value]) => [
    modulePath(key),
    typeof value === 'string' ? value : '',
  ]),
);
const KNOWN_SOURCE_FILES = new Set(SOURCE_CONTENT.keys());
const MOTION_IMPORT = /\bfrom\s+['"][^'"]*\/motion(?:\/[^'"]*)?['"]/;
const TOKEN_GROUPS = ['durations', 'staggers', 'distances'] as const;
const SCAN_RULES: readonly ScanRule[] = [
  { rule: 'web-animate', pattern: /\.animate\(/g },
  { rule: 'transition-property', pattern: /\btransition\s*:/g },
  { rule: 'transition-template', pattern: /`[^`\n]*\btransition\b[^`\n]*`/g },
  { rule: 'keyframes', pattern: /@keyframes\b/g },
  { rule: 'request-animation-frame', pattern: /requestAnimationFrame\s*\(/g },
  { rule: 'tween-factory', pattern: /create\w*Tween\s*\(/g },
  { rule: 'use-frame', pattern: /useFrame\s*\(/g },
];

const rows: readonly MatrixRow[] = matrix;

function modulePath(key: string): string {
  const normalized = key.replace(/^(?:\.\.\/)+/, '');

  return normalized.startsWith('src/') ? `packages/xploder/${normalized}` : normalized;
}

function stripComments(text: string): string {
  return text
    .replace(/\/\*[\s\S]*?\*\//g, (comment) => comment.replace(/[^\n]/g, ' '))
    .replace(/(?<!:)\/\/[^\n]*/g, (comment) => ' '.repeat(comment.length));
}

function lineOf(text: string, index: number): number {
  let line = 1;

  for (let position = 0; position < index; position += 1) {
    if (text.charCodeAt(position) === 10) {
      line += 1;
    }
  }

  return line;
}

function snippetAt(text: string, index: number): string {
  const start = text.lastIndexOf('\n', index - 1) + 1;
  const end = text.indexOf('\n', index);

  return text.slice(start, end === -1 ? text.length : end).trim();
}

export function scanText(text: string, file: string): AnimationHit[] {
  const stripped = stripComments(text);
  const hits: AnimationHit[] = [];

  for (const { rule, pattern } of SCAN_RULES) {
    for (const match of stripped.matchAll(pattern)) {
      if (match.index === undefined) continue;

      hits.push({
        file,
        line: lineOf(stripped, match.index),
        rule,
        snippet: snippetAt(stripped, match.index),
      });
    }
  }

  return hits.sort((left, right) => left.line - right.line || left.rule.localeCompare(right.rule));
}

export function scanAnimationSites(): readonly string[] {
  return [...SOURCE_CONTENT.entries()]
    .map(([file, text]) => ({ file, text }))
    .filter(
      ({ file, text }) =>
        MOTION_IMPORT.test(stripComments(text)) && scanText(text, file).length > 0,
    )
    .map(({ file }) => file)
    .sort((left, right) => left.localeCompare(right));
}

function tokenValue(tokens: MotionTokens, path: string): number | undefined {
  const parts = path.split('.');

  if (parts.length !== 2) return undefined;

  const [group, key] = parts;

  if (group === undefined || key === undefined || !isTokenGroup(group)) {
    return undefined;
  }

  const values =
    group === 'durations'
      ? tokens.durations
      : group === 'staggers'
        ? tokens.staggers
        : tokens.distances;

  return Object.entries(values).find(([name]) => name === key)?.[1];
}

function isTokenGroup(value: string): value is (typeof TOKEN_GROUPS)[number] {
  return TOKEN_GROUPS.some((group) => group === value);
}

function missingSites(files: readonly string[]): readonly string[] {
  const matrixFiles = new Set(rows.map((row) => row.site.file));

  return files.filter((file) => !matrixFiles.has(file));
}

describe('reduced-motion coverage matrix', () => {
  test('contains 12 complete RFC D9 rows with existing source sites', () => {
    expect(rows).toHaveLength(12);
    expect(new Set(rows.map((row) => row.id)).size).toBe(rows.length);

    for (const row of rows) {
      expect(row.id.trim()).not.toBe('');
      expect(row.slice.trim()).not.toBe('');
      expect(row.trigger.trim()).not.toBe('');
      expect(row.twin.trim()).not.toBe('');
      expect(row.browserCheck.trim()).not.toBe('');
      expect(row.site.symbol.trim()).not.toBe('');
      expect(row.site.file.startsWith('/')).toBe(false);
      expect(row.site.file.split('/')).not.toContain('..');
      expect(KNOWN_SOURCE_FILES.has(row.site.file), row.site.file).toBe(true);
    }

    console.log('Motion matrix rows:');
    for (const row of rows) {
      console.log(
        `${row.id}\t${row.slice}\t${row.site.file}#${row.site.symbol}\t${row.tokens.join(',')}`,
      );
    }
  });

  test('every row token is a motion key and resolves to zero under reduced motion', () => {
    for (const row of rows) {
      expect(row.tokens.length, row.id).toBeGreaterThan(0);

      for (const token of row.tokens) {
        if (token === 'none') continue;

        const fullValue = tokenValue(motion, token);
        const reducedValue = tokenValue(resolveMotion(true), token);

        expect(typeof fullValue, `${row.id}: ${token}`).toBe('number');
        expect(reducedValue, `${row.id}: ${token}`).toBe(0);
      }
    }
  });

  test('every scanned animation site appears in the matrix', () => {
    const scanned = scanAnimationSites();
    const missing = missingSites(scanned);

    console.log(`Scanned animation sites (${scanned.length}):`);
    for (const file of scanned) {
      const source = SOURCE_CONTENT.get(file) ?? '';
      const rules = [...new Set(scanText(source, file).map((hit) => hit.rule))];
      console.log(`${file}\t${rules.join(',')}`);
    }

    expect(scanned.length).toBeGreaterThan(0);
    expect(missing, `missing matrix rows for: ${missing.join(', ')}`).toEqual([]);
  });

  test('negative control: an unlisted synthetic .animate( is reported as missing', () => {
    const file = 'src/react/__unlisted__.tsx';
    const hits = scanText(
      'export const run = (element: Element) => element.animate([], {});',
      file,
    );
    const missing = missingSites([file]);

    console.log(
      `Negative control: ${hits.map((hit) => `${hit.file}:${hit.line}:${hit.rule}`).join(', ')}`,
    );
    console.log(`Negative control missing rows: ${missing.join(', ')}`);

    expect(hits.map((hit) => hit.rule)).toContain('web-animate');
    expect(missing).toEqual([file]);
  });
});
