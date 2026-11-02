import { readFileSync } from 'node:fs';
import { dirname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, test } from 'vitest';

import { collectSourceFiles } from './source-scan';

const APP_ROOT = fileURLToPath(new URL('../app/', import.meta.url));
const COMPONENTS_ROOT = fileURLToPath(new URL('../components/', import.meta.url));
const SEO_ROOT = fileURLToPath(new URL('../seo/', import.meta.url)).replace(/\/+$/, '');
const USE_CLIENT = /^\s*['"]use client['"];?/;
const IMPORT_SPECIFIER = /(?:\bfrom\s*|\bimport\s*(?:\(\s*)?|\brequire\s*\(\s*)['"]([^'"]+)['"]/g;

function hasUseClient(source: string): boolean {
  return USE_CLIENT.test(source);
}

function resolvesToSeo(file: string, specifier: string): boolean {
  if (!specifier.startsWith('.')) {
    return specifier === 'seo' || specifier.startsWith('seo/');
  }

  const resolved = resolve(dirname(file), specifier);
  return resolved === SEO_ROOT || resolved.startsWith(`${SEO_ROOT}${sep}`);
}

function seoImportsIn(file: string): string[] {
  const source = readFileSync(file, 'utf8');

  return [...source.matchAll(IMPORT_SPECIFIER)]
    .map((match) => match[1])
    .filter((specifier): specifier is string => specifier !== undefined)
    .filter((specifier) => resolvesToSeo(file, specifier));
}

describe('SEO server-only boundary', () => {
  test('seo/ contains no client component directive', () => {
    const offenders = collectSourceFiles(SEO_ROOT).filter((file) =>
      hasUseClient(readFileSync(file, 'utf8')),
    );

    expect(offenders).toEqual([]);
  });

  test('client components do not import seo/', () => {
    const clientFiles = [...collectSourceFiles(APP_ROOT), ...collectSourceFiles(COMPONENTS_ROOT)]
      .filter((file) => hasUseClient(readFileSync(file, 'utf8')))
      .filter((file) => seoImportsIn(file).length > 0);

    expect(clientFiles).toEqual([]);
  });

  test('the relative import check resolves into seo/', () => {
    const clientFile = resolve(COMPONENTS_ROOT, 'example-client.tsx');

    expect(resolvesToSeo(clientFile, '../seo/metadata')).toBe(true);
    expect(resolvesToSeo(clientFile, '../content/site')).toBe(false);
  });
});
