import { describe, expect, test } from 'vitest';

import { evaluateCls, type ClsEntry, type ClsSource } from '../src/site-probe.ts';

function source(text: string): ClsSource {
  return {
    node: {
      tag: 'div',
      dataAttributes: {},
      parentTag: 'section',
      text,
    },
    previousRect: { x: 10, y: 10, width: 44, height: 44 },
    currentRect: { x: 10, y: 7, width: 44, height: 44 },
  };
}

function shift(value: number, sources: ClsSource[] = []): ClsEntry {
  return { value, startTime: 100, hadRecentInput: false, sources };
}

describe('evaluateCls', () => {
  test('passes recorded entries whose total is zero', () => {
    const verdict = evaluateCls([shift(0)]);

    expect(verdict).toEqual({ total: 0, pass: true, sources: [] });
  });

  test('fails any positive total and reports its sources', () => {
    const moved = source('Theme toggle');
    const verdict = evaluateCls([shift(0.000637, [moved])]);

    expect(verdict.pass).toBe(false);
    expect(verdict.total).toBeCloseTo(0.000637, 12);
    expect(verdict.sources).toEqual([moved]);
  });

  test('counts shifts with recent input', () => {
    const verdict = evaluateCls([{ ...shift(0.000043), hadRecentInput: true }]);

    expect(verdict.pass).toBe(false);
    expect(verdict.total).toBeCloseTo(0.000043, 12);
  });
});
