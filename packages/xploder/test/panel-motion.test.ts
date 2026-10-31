import { describe, expect, test } from 'vitest';

import { motion, resolveMotion, type MotionTokens } from '../src/motion';
import { panelMotion } from '../src/panel/motion';

const MILLISECONDS_PER_SECOND = 1_000;
const DOCKS = ['left', 'right', 'top', 'bottom'] as const;

type RawImportMeta = ImportMeta & {
  glob(
    pattern: string,
    options: { query: '?raw'; import: 'default'; eager: true },
  ): Record<string, string>;
};

const CUSTOM_TOKENS: MotionTokens = {
  ...motion,
  durations: {
    ...motion.durations,
    panelEnter: 0.45,
    panelExit: 0.3,
  },
  easings: {
    ...motion.easings,
    panelEnter: { ...motion.easings.panelEnter, css: 'cubic-bezier(0.1, 0.2, 0.3, 0.4)' },
    panelExit: { ...motion.easings.panelExit, css: 'cubic-bezier(0.4, 0.3, 0.2, 0.1)' },
  },
  distances: {
    ...motion.distances,
    panelOffset: 24,
  },
};

function offsetTransform(dock: (typeof DOCKS)[number]): string {
  const distance = CUSTOM_TOKENS.distances.panelOffset;

  switch (dock) {
    case 'left':
      return `translate(-${distance}px, 0px)`;
    case 'right':
      return `translate(${distance}px, 0px)`;
    case 'top':
      return `translate(0px, -${distance}px)`;
    case 'bottom':
      return `translate(0px, ${distance}px)`;
  }
}

describe('panel motion', () => {
  for (const dock of DOCKS) {
    test(`${dock} enter starts offset toward its edge and settles`, () => {
      const result = panelMotion(CUSTOM_TOKENS, dock, 'enter');

      expect(result?.keyframes).toStrictEqual([
        { opacity: 0, transform: offsetTransform(dock) },
        { opacity: 1, transform: 'none' },
      ]);
      expect(result?.options).toStrictEqual({
        duration: CUSTOM_TOKENS.durations.panelEnter * MILLISECONDS_PER_SECOND,
        easing: CUSTOM_TOKENS.easings.panelEnter.css,
        fill: 'backwards',
      });
    });

    test(`${dock} exit reverses the enter keyframes`, () => {
      const result = panelMotion(CUSTOM_TOKENS, dock, 'exit');

      expect(result?.keyframes).toStrictEqual([
        { opacity: 1, transform: 'none' },
        { opacity: 0, transform: offsetTransform(dock) },
      ]);
      expect(result?.options).toStrictEqual({
        duration: CUSTOM_TOKENS.durations.panelExit * MILLISECONDS_PER_SECOND,
        easing: CUSTOM_TOKENS.easings.panelExit.css,
        fill: 'both',
      });
    });
  }

  test('the reduced-motion twin returns no animation for either phase', () => {
    const reduced = resolveMotion(true);

    for (const dock of DOCKS) {
      expect(panelMotion(reduced, dock, 'enter')).toBeNull();
      expect(panelMotion(reduced, dock, 'exit')).toBeNull();
    }
  });

  test('the source has no duration or easing literals beyond the milliseconds constant', () => {
    const [source] = Object.values(
      (import.meta as RawImportMeta).glob('../src/panel/motion.ts', {
        query: '?raw',
        import: 'default',
        eager: true,
      }),
    );

    if (source === undefined) throw new Error('panel motion source was not loaded');

    expect(source).toContain('const MILLISECONDS_PER_SECOND = 1_000;');
    expect(source).not.toMatch(/\b(?:duration|delay)\s*:\s*(?:\d|['"`])/);
    expect(source).not.toMatch(/\b(?:easing|ease)\s*:\s*['"`]/);
    expect(source).not.toMatch(/\b\d+(?:\.\d+)?\s*(?:ms|s)\b/);
    expect(source).not.toMatch(/\b(?:cubic-bezier|steps)\(/);
    expect(source).not.toMatch(
      /\b(?:power[0-4]|expo|sine|circ|back|elastic|bounce|quad|cubic|quart|quint|strong)\.(?:in|out|inOut)\b/,
    );
  });
});
