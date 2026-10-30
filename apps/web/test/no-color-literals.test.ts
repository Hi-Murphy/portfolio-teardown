import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, test } from 'vitest';

import { collectSourceFiles, formatHits, lineOf, snippetAt, type Hit } from './source-scan';

const WEB_ROOT = fileURLToPath(new URL('..', import.meta.url));
const XPLODER_SRC = fileURLToPath(new URL('../../../packages/xploder/src/', import.meta.url));
const ENGINE_EXPLODE = fileURLToPath(
  new URL('../../../packages/xploder/src/engine/explode.ts', import.meta.url),
);
const SLABS = fileURLToPath(
  new URL('../../../packages/xploder/src/react/scene/Slabs.tsx', import.meta.url),
);
const PLAYGROUND = fileURLToPath(
  new URL('../app/dev/engine/engine-playground.tsx', import.meta.url),
);
const S05_SOURCE_FILES = [
  'interaction/pick.ts',
  'interaction/pointer.ts',
  'interaction/focus.ts',
  'interaction/tour.ts',
  'interaction/emphasis.ts',
  'react/scene/Emphasis.tsx',
  'react/scene/PickBridge.tsx',
  'react/overlay/TourCaption.tsx',
  'react/useTourClock.ts',
  'react/usePointerPick.ts',
].map((path) => fileURLToPath(new URL(`../../../packages/xploder/src/${path}`, import.meta.url)));

const RULES = [
  ['hex-color', /(?<![\w&])#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})\b/g],
  ['hex-number', /\b0x[0-9a-fA-F]{6}\b/g],
  ['css-color-fn', /\b(?:rgba?|hsla?)\(/g],
  ['named-three-color', /new\s+Color\(\s*['"][a-zA-Z]+['"]/g],
] as const satisfies readonly (readonly [string, RegExp])[];

type ColorLiteralRule = (typeof RULES)[number][0];

function scanText(text: string, file: string): Hit[] {
  const hits: Hit[] = [];

  for (const [rule, pattern] of RULES) {
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

  return hits.sort((left, right) => left.line - right.line || left.rule.localeCompare(right.rule));
}

function scanFiles(files: readonly string[]): Hit[] {
  return files.flatMap((file) => scanText(readFileSync(file, 'utf8'), file));
}

function expectNoHits(hits: readonly Hit[]): void {
  expect(hits, formatHits(hits)).toEqual([]);
}

const BAD_SAMPLES = {
  'hex-color': "const color = '#ff0000';",
  'hex-number': 'const color = 0xff0000;',
  'css-color-fn': "const color = 'rgb(0 0 0)';",
  'named-three-color': "const color = new Color('red');",
} satisfies Record<ColorLiteralRule, string>;

describe('color-literal scanner', () => {
  test('apps/web and xploder source outside theme/ contain no color literals', () => {
    const hits = [
      ...scanFiles(collectSourceFiles(WEB_ROOT)),
      ...scanFiles(collectSourceFiles(XPLODER_SRC, { exclude: ['theme/'] })),
    ];

    expectNoHits(hits);
  });

  test('scanner roots include engine sources', () => {
    const sourceFiles = collectSourceFiles(XPLODER_SRC, { exclude: ['theme/'] });

    expect(sourceFiles).toContain(ENGINE_EXPLODE);
    expect(sourceFiles).toContain(SLABS);
    expect(sourceFiles).toEqual(expect.arrayContaining(S05_SOURCE_FILES));
    expect(collectSourceFiles(WEB_ROOT).length).toBeGreaterThan(0);
  });

  test.skipIf(!existsSync(PLAYGROUND))('scanner root includes the engine playground', () => {
    expect(collectSourceFiles(WEB_ROOT)).toContain(PLAYGROUND);
  });

  for (const rule of Object.keys(BAD_SAMPLES) as ColorLiteralRule[]) {
    test(`${rule} catches its negative control`, () => {
      const hits = scanText(BAD_SAMPLES[rule], `fixture-${rule}.ts`);

      expect(
        hits.map((hit) => hit.rule),
        formatHits(hits),
      ).toContain(rule);
    });
  }

  test.each(["href='#main'", 'palette.line', 'var(--bp-line)', 'issue #12'])(
    'accepts non-color references: %s',
    (sample) => {
      expectNoHits(scanText(sample, 'good-sample.ts'));
    },
  );
});
