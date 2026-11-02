import { existsSync, readFileSync } from 'node:fs';
import { basename } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, test } from 'vitest';

import { collectSourceFiles, formatHits, lineOf, snippetAt, type Hit } from './source-scan';

const APP_ROOT = fileURLToPath(new URL('../app/', import.meta.url));
const COMPONENTS_ROOT = fileURLToPath(new URL('../components/', import.meta.url));
const CONTENT_ROOT = fileURLToPath(new URL('../content/', import.meta.url));
const SCRIPTS_ROOT = fileURLToPath(new URL('../scripts/', import.meta.url));
const FORBIDDEN_SPECIFIER = 'xploder/fixtures';
const IMPORT_SPECIFIER = /(?:\bfrom\s*|\bimport\s*(?:\(\s*)?|\brequire\s*\(\s*)['"]([^'"]+)['"]/g;

function scanText(text: string, file: string): Hit[] {
  const hits: Hit[] = [];

  for (const match of text.matchAll(IMPORT_SPECIFIER)) {
    if (match.index === undefined || match[1] !== FORBIDDEN_SPECIFIER) continue;

    hits.push({
      file,
      line: lineOf(text, match.index),
      rule: 'forbidden-production-import',
      snippet: snippetAt(text, match.index),
    });
  }

  return hits;
}

function filesUnder(root: string, exclude: string[] = []): string[] {
  if (!existsSync(root)) return [];

  return collectSourceFiles(root, { exclude }).filter(
    (file) => !basename(file).endsWith('.fixture.tsx'),
  );
}

function productionFiles(): string[] {
  return [
    ...filesUnder(APP_ROOT, ['dev', 'fixtures']),
    ...filesUnder(COMPONENTS_ROOT),
    ...filesUnder(CONTENT_ROOT),
    ...filesUnder(SCRIPTS_ROOT),
  ];
}

function scanFiles(files: readonly string[]): Hit[] {
  return files.flatMap((file) => scanText(readFileSync(file, 'utf8'), file));
}

describe('production import scanner', () => {
  test('production source does not import xploder/fixtures', () => {
    const hits = scanFiles(productionFiles());

    expect(hits, formatHits(hits)).toEqual([]);
  });

  test('negative control catches xploder/fixtures', () => {
    const hits = scanText("import { projectAJson } from 'xploder/fixtures';", 'fixture.ts');

    expect(
      hits.map((hit) => hit.rule),
      formatHits(hits),
    ).toEqual(['forbidden-production-import']);
  });
});
