import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, test } from 'vitest';

import { collectSourceFiles, formatHits, lineOf, snippetAt, type Hit } from './source-scan';

const WEB_ROOT = fileURLToPath(new URL('..', import.meta.url));
const XPLODER_SRC = fileURLToPath(new URL('../../../packages/xploder/src/', import.meta.url));
const WEB_MANIFEST = fileURLToPath(new URL('../package.json', import.meta.url));
const XPLODER_MANIFEST = fileURLToPath(
  new URL('../../../packages/xploder/package.json', import.meta.url),
);
const ENGINE_EXPLODE = fileURLToPath(
  new URL('../../../packages/xploder/src/engine/explode.ts', import.meta.url),
);
const SLABS = fileURLToPath(
  new URL('../../../packages/xploder/src/react/scene/Slabs.tsx', import.meta.url),
);
const PLAYGROUND = fileURLToPath(
  new URL('../app/dev/engine/engine-playground.tsx', import.meta.url),
);

const FORBIDDEN_IMPORT =
  /(?:\bfrom\s*|\bimport\s*\(\s*)['"](?:@react-three\/drei|three\/examples|three\/addons|three-stdlib|camera-controls)(?:\/[^'"]*)?['"]/g;
const FORBIDDEN_IDENTIFIER =
  /\b(?:OrbitControls|MapControls|TrackballControls|ArcballControls|FlyControls|FirstPersonControls|PointerLockControls|CameraControls|TransformControls|DragControls)\b/g;
const FORBIDDEN_DEPENDENCIES = new Set(['@react-three/drei', 'camera-controls', 'three-stdlib']);
const DEPENDENCY_SECTIONS = ['dependencies', 'devDependencies', 'peerDependencies'] as const;

interface PackageManifest {
  readonly dependencies?: Record<string, string>;
  readonly devDependencies?: Record<string, string>;
  readonly peerDependencies?: Record<string, string>;
}

function scanText(text: string, file: string): Hit[] {
  const hits: Hit[] = [];

  for (const [rule, pattern] of [
    ['forbidden-import', FORBIDDEN_IMPORT],
    ['forbidden-identifier', FORBIDDEN_IDENTIFIER],
  ] as const) {
    for (const match of text.matchAll(pattern)) {
      if (match.index === undefined) continue;

      hits.push({
        file,
        line: lineOf(text, match.index),
        rule,
        snippet: snippetAt(text, match.index),
      });
    }
  }

  return hits;
}

function scanManifest(text: string, file: string): Hit[] {
  const manifest = JSON.parse(text) as PackageManifest;
  const hits: Hit[] = [];

  for (const section of DEPENDENCY_SECTIONS) {
    const dependencies = manifest[section];

    if (dependencies === undefined) continue;

    for (const dependency of Object.keys(dependencies).sort()) {
      if (!FORBIDDEN_DEPENDENCIES.has(dependency)) continue;

      const index = text.indexOf(`"${dependency}"`);

      hits.push({
        file,
        line: lineOf(text, index),
        rule: 'forbidden-dependency',
        snippet: snippetAt(text, index),
      });
    }
  }

  return hits;
}

function scanFiles(files: readonly string[]): Hit[] {
  return files.flatMap((file) => scanText(readFileSync(file, 'utf8'), file));
}

function expectNoHits(hits: readonly Hit[]): void {
  expect(hits, formatHits(hits)).toEqual([]);
}

describe('free-orbit scanner', () => {
  test('apps/web and xploder source contain no free-orbit controls', () => {
    const hits = [
      ...scanFiles(collectSourceFiles(WEB_ROOT)),
      ...scanFiles(collectSourceFiles(XPLODER_SRC)),
      ...scanManifest(readFileSync(WEB_MANIFEST, 'utf8'), WEB_MANIFEST),
      ...scanManifest(readFileSync(XPLODER_MANIFEST, 'utf8'), XPLODER_MANIFEST),
    ];

    expectNoHits(hits);
  });

  test('scanner roots include engine sources', () => {
    const sourceFiles = collectSourceFiles(XPLODER_SRC);

    expect(sourceFiles).toContain(ENGINE_EXPLODE);
    expect(sourceFiles).toContain(SLABS);
    expect(collectSourceFiles(WEB_ROOT).length).toBeGreaterThan(0);
  });

  test.skipIf(!existsSync(PLAYGROUND))('scanner root includes the engine playground', () => {
    expect(collectSourceFiles(WEB_ROOT)).toContain(PLAYGROUND);
  });

  test.each([
    "import { OrbitControls } from 'three/addons/controls/OrbitControls.js';",
    "export { MapControls } from '@react-three/drei';",
    "const controls = await import('camera-controls');",
    "const controls = await import('three/examples/jsm/controls/OrbitControls.js');",
  ])('catches forbidden import: %s', (sample) => {
    const hits = scanText(sample, 'fixture-import.ts');

    expect(
      hits.map((hit) => hit.rule),
      formatHits(hits),
    ).toContain('forbidden-import');
  });

  test('catches a forbidden control identifier', () => {
    const sample = 'const controls = new ArcballControls(camera, element);';
    const hits = scanText(sample, 'fixture-identifier.ts');

    expect(
      hits.map((hit) => hit.rule),
      formatHits(hits),
    ).toContain('forbidden-identifier');
  });

  test.each(['@react-three/drei', 'three-stdlib', 'camera-controls'])(
    'catches forbidden dependency: %s',
    (dependency) => {
      const manifest = JSON.stringify({ dependencies: { [dependency]: '1.0.0' } });
      const hits = scanManifest(manifest, 'fixture-package.json');

      expect(
        hits.map((hit) => hit.rule),
        formatHits(hits),
      ).toContain('forbidden-dependency');
    },
  );

  test('accepts allowed dependencies and engine imports', () => {
    expectNoHits(scanManifest('{"dependencies":{"zod":"^4.0.0"}}', 'good-package.json'));
    expectNoHits(
      scanText(
        "import { useThree } from '@react-three/fiber';\nimport { BoxGeometry } from 'three';",
        'good-sample.ts',
      ),
    );
  });
});
