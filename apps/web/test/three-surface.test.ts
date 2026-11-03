import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, test } from 'vitest';

import { collectSourceFiles } from './source-scan';

const WEB_ROOT = fileURLToPath(new URL('..', import.meta.url));
const CONFIG_PATH = fileURLToPath(new URL('../next.config.ts', import.meta.url));
const SHIM_PATH = fileURLToPath(new URL('../build/three-surface.ts', import.meta.url));
const XPLODER_SRC_ROOT = fileURLToPath(new URL('../../../packages/xploder/src/', import.meta.url));
const R3F_DIST_ROOT = fileURLToPath(
  new URL('../node_modules/@react-three/fiber/dist/', import.meta.url),
);
const R3F_TYPES_PATH = fileURLToPath(
  new URL(
    '../node_modules/@react-three/fiber/dist/declarations/src/three-types.d.ts',
    import.meta.url,
  ),
);
const THREE_ROOT = fileURLToPath(new URL('../node_modules/three/src/', import.meta.url));
const CHUNKS_ROOT = fileURLToPath(new URL('../out/_next/static/chunks/', import.meta.url));
const THREE_REFERENCE = /\bTHREE\.([A-Za-z0-9_]+)\b/g;
const THREE_IMPORT = /import\s*\{([^}]*)\}\s*from\s*['"]three['"]/g;
const SHIM_EXPORT = /export\s*\{([^}]*)\}\s*from\s*['"]three\/src\/[^'"]+['"]/g;
const THREE_EXPORT = /export\s*(?:\{([^}]*)\}|(?:const|let|var|function|class)\s+([A-Za-z0-9_]+))/g;
const JSX_TAG = /<([a-z][A-Za-z0-9]*)\b/g;

function namesFrom(specifiers: string): string[] {
  return specifiers
    .split(',')
    .map((specifier) => specifier.trim())
    .filter((specifier) => specifier.length > 0 && !specifier.startsWith('type '))
    .map((specifier) => specifier.split(/\s+as\s+/, 1)[0]?.trim() ?? '');
}

function r3fNames(): Set<string> {
  const names = new Set<string>();

  for (const file of readdirSync(R3F_DIST_ROOT)) {
    if (!file.endsWith('.js')) continue;

    const text = readFileSync(join(R3F_DIST_ROOT, file), 'utf8');
    for (const match of text.matchAll(THREE_REFERENCE)) {
      if (match[1] !== undefined) names.add(match[1]);
    }
  }

  return names;
}

function xploderValueImports(): Set<string> {
  const names = new Set<string>();

  for (const file of collectSourceFiles(XPLODER_SRC_ROOT)) {
    const text = readFileSync(file, 'utf8');
    for (const match of text.matchAll(THREE_IMPORT)) {
      for (const name of namesFrom(match[1] ?? '')) names.add(name);
    }
  }

  return names;
}

function threeExports(): Set<string> {
  const names = new Set<string>();

  for (const file of ['Three.Core.js', 'Three.js']) {
    const text = readFileSync(join(THREE_ROOT, file), 'utf8');
    for (const match of text.matchAll(THREE_EXPORT)) {
      const listed = match[1];
      if (listed !== undefined) {
        for (const name of namesFrom(listed)) names.add(name);
      } else if (match[2] !== undefined) {
        names.add(match[2]);
      }
    }
  }

  return names;
}

function jsxConstructors(): Set<string> {
  const types = readFileSync(R3F_TYPES_PATH, 'utf8');
  const omitMatch = /Omit<ThreeElementsImpl,([^>]+)>/.exec(types);
  const excluded = new Set(
    [...(omitMatch?.[1] ?? '').matchAll(/'([^']+)'/g)].map((match) => match[1] ?? ''),
  );
  const three = threeExports();
  const names = new Set<string>();
  const files = collectSourceFiles(XPLODER_SRC_ROOT, {
    extensions: new Set(['.tsx']),
  });

  for (const file of files) {
    const text = readFileSync(file, 'utf8');
    for (const match of text.matchAll(JSX_TAG)) {
      const tag = match[1];
      if (tag === undefined || excluded.has(tag)) continue;

      const constructor = `${tag[0]?.toUpperCase() ?? ''}${tag.slice(1)}`;
      if (three.has(constructor)) names.add(constructor);
    }
  }

  return names;
}

function shimExports(): Set<string> {
  const text = readFileSync(SHIM_PATH, 'utf8');
  const names = new Set<string>();

  for (const match of text.matchAll(SHIM_EXPORT)) {
    for (const name of namesFrom(match[1] ?? '')) names.add(name);
  }

  return names;
}

function sorted(values: Iterable<string>): string[] {
  return [...values].sort((left, right) => left.localeCompare(right));
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

describe('three surface shim', () => {
  test('exports exactly the surface required by R3F, xploder and xploder JSX', () => {
    const expected = new Set([
      ...r3fNames(),
      ...xploderValueImports(),
      ...jsxConstructors(),
      'REVISION',
    ]);
    const actual = shimExports();

    expect(sorted(expected).filter((name) => !actual.has(name))).toEqual([]);
    expect(sorted(actual).filter((name) => !expected.has(name))).toEqual([]);
  });

  test('is referenced only by next.config.ts', () => {
    const files = [...collectSourceFiles(WEB_ROOT), ...collectSourceFiles(XPLODER_SRC_ROOT)];
    const references = files.filter((file) => readFileSync(file, 'utf8').includes('three-surface'));

    expect(references).toEqual([CONFIG_PATH]);
    expect(readFileSync(CONFIG_PATH, 'utf8')).toContain(`three: './build/${basename(SHIM_PATH)}'`);
  });

  test.skipIf(!existsSync(CHUNKS_ROOT))('emits one REVISION value after build', () => {
    const chunks = readdirSync(CHUNKS_ROOT)
      .filter((file) => file.endsWith('.js'))
      .map((file) => readFileSync(join(CHUNKS_ROOT, file), 'utf8'))
      .join('\n');
    const constants = readFileSync(join(THREE_ROOT, 'constants.js'), 'utf8');
    const revisionValue = /export const REVISION = '([^']+)'/.exec(constants)?.[1];
    expect(revisionValue).toBeDefined();

    const revision = escapeRegExp(revisionValue ?? '');
    const matches = chunks.match(new RegExp(`["']${revision}["']`, 'g')) ?? [];

    expect(matches).toHaveLength(1);
  });
});
