import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, test } from 'vitest';

import { collectSourceFiles, formatHits, lineOf, snippetAt, type Hit } from './source-scan';

const APP_ROOT = fileURLToPath(new URL('../app/', import.meta.url));
const PAGE = fileURLToPath(new URL('../app/page.tsx', import.meta.url));
const PLAYGROUND = fileURLToPath(
  new URL('../app/dev/engine/engine-playground.tsx', import.meta.url),
);
const XPLODER_MANIFEST = fileURLToPath(
  new URL('../../../packages/xploder/package.json', import.meta.url),
);

interface XploderManifest {
  readonly exports?: Record<string, unknown>;
}

const XPLODER_EXPORTS = new Set(
  Object.keys(
    (JSON.parse(readFileSync(XPLODER_MANIFEST, 'utf8')) as XploderManifest).exports ?? {},
  ),
);
const IMPORT_SPECIFIER = /(?:\bfrom\s*|\bimport\s*\(\s*)['"]([^'"]+)['"]/g;
const ENGINE_IDENTIFIER =
  /\b(?:useFrame|useThree|InstancedMesh|setMatrixAt|Matrix4|OrthographicCamera|BoxGeometry)\b/g;

function ruleForSpecifier(specifier: string): string | null {
  if (
    specifier === 'three' ||
    specifier.startsWith('three/') ||
    specifier.startsWith('@react-three/') ||
    specifier === 'xploder/src' ||
    specifier.startsWith('xploder/src/')
  ) {
    return 'forbidden-import';
  }

  if (specifier.startsWith('xploder/')) {
    const exportKey = `./${specifier.slice('xploder/'.length)}`;

    if (!XPLODER_EXPORTS.has(exportKey)) return 'unexported-subpath';
  }

  return null;
}

function scanText(text: string, file: string): Hit[] {
  const hits: Hit[] = [];

  for (const match of text.matchAll(IMPORT_SPECIFIER)) {
    if (match.index === undefined) continue;

    const specifier = match[1];
    const rule = specifier === undefined ? null : ruleForSpecifier(specifier);

    if (rule === null) continue;

    hits.push({
      file,
      line: lineOf(text, match.index),
      rule,
      snippet: snippetAt(text, match.index),
    });
  }

  for (const match of text.matchAll(ENGINE_IDENTIFIER)) {
    if (match.index === undefined) continue;

    hits.push({
      file,
      line: lineOf(text, match.index),
      rule: 'engine-identifier',
      snippet: snippetAt(text, match.index),
    });
  }

  return hits;
}

function scanFiles(files: readonly string[]): Hit[] {
  return files.flatMap((file) => scanText(readFileSync(file, 'utf8'), file));
}

function expectNoHits(hits: readonly Hit[]): void {
  expect(hits, formatHits(hits)).toEqual([]);
}

describe('package-consumer scanner', () => {
  test('apps/web/app imports xploder only through exported public subpaths', () => {
    expectNoHits(scanFiles(collectSourceFiles(APP_ROOT)));
  });

  test('scanner root contains app sources', () => {
    const appFiles = collectSourceFiles(APP_ROOT);

    expect(appFiles).toContain(PAGE);
    expect(appFiles.length).toBeGreaterThan(0);
  });

  test.skipIf(!existsSync(PLAYGROUND))('scanner root includes the engine playground', () => {
    expect(collectSourceFiles(APP_ROOT)).toContain(PLAYGROUND);
  });

  test.each([
    "import { BoxGeometry } from 'three';",
    "import { Mesh } from 'three/src/objects/Mesh.js';",
    "import { Canvas } from '@react-three/fiber';",
    "import { createExplodeTimeline } from 'xploder/src/engine/explode';",
    "const engine = await import('xploder/src/index');",
  ])('catches forbidden import: %s', (sample) => {
    const hits = scanText(sample, 'fixture-import.ts');

    expect(
      hits.map((hit) => hit.rule),
      formatHits(hits),
    ).toContain('forbidden-import');
  });

  test('catches an unexported xploder subpath', () => {
    const hits = scanText("import { value } from 'xploder/private';", 'fixture-subpath.ts');

    expect(
      hits.map((hit) => hit.rule),
      formatHits(hits),
    ).toContain('unexported-subpath');
  });

  test('catches an engine identifier', () => {
    const hits = scanText(
      'const instances = new InstancedMesh(geometry, material, count);',
      'fixture-identifier.ts',
    );

    expect(
      hits.map((hit) => hit.rule),
      formatHits(hits),
    ).toContain('engine-identifier');
  });

  test('accepts the exported xploder entry points', () => {
    expectNoHits(
      scanText(
        "import { parseProject } from 'xploder';\nimport { motion } from 'xploder/motion';\nimport { TeardownViewer } from 'xploder/react';",
        'good-sample.tsx',
      ),
    );
  });
});
