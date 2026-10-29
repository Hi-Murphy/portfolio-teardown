import { fileURLToPath } from 'node:url';

import { describe, expect, test } from 'vitest';

import {
  RULE_IDS,
  scanDir,
  scanText,
  type Hit,
  type MotionLiteralRule,
} from './motion-literal-scanner';

const WEB_ROOT = fileURLToPath(new URL('..', import.meta.url));
const XPLODER_SOURCE_ROOT = fileURLToPath(
  new URL('../../../packages/xploder/src/', import.meta.url),
);

function formatHits(hits: readonly Hit[]): string {
  return hits.map((hit) => `${hit.file}:${hit.line} ${hit.rule} ${hit.snippet}`).join('\n');
}

function expectNoHits(hits: readonly Hit[]): void {
  expect(hits, formatHits(hits)).toEqual([]);
}

const BAD_SAMPLES = {
  'css-time': 'const style = `transition: color 200ms;`;',
  'css-easing': 'const style = `transition: opacity ease-in;`;',
  'gsap-ease': "const tween = { ease: 'power2.out' };",
  'motion-key': "const style = { transitionDuration: '1s' };",
  'tw-utility': "const className = 'transition duration-200 ease-in animate-pulse';",
  timer: 'setTimeout(callback, 120);',
} satisfies Record<MotionLiteralRule, string>;

describe('motion-literal scanner', () => {
  test('apps/web contains no motion literals', () => {
    expectNoHits(scanDir(WEB_ROOT));
  });

  test('xploder source outside motion/ contains no motion literals', () => {
    expectNoHits(scanDir(XPLODER_SOURCE_ROOT, { exclude: ['motion/'] }));
  });

  for (const rule of RULE_IDS) {
    test(`${rule} catches its negative control`, () => {
      const hits = scanText(BAD_SAMPLES[rule], `fixture-${rule}.ts`);

      expect(
        hits.map((hit) => hit.rule),
        formatHits(hits),
      ).toContain(rule);
    });
  }

  test.each([
    'motion.durations.explode',
    'transition-duration: var(--motion-duration-hover-lift)',
    'className="ease-explode transition-colors"',
    '<p>the 1990s</p>',
    "{ label: 'p95', value: '120 ms' }",
  ])('accepts content, tokens and token-backed utilities: %s', (sample) => {
    expectNoHits(scanText(sample, 'good-sample.ts'));
  });
});
