import { describe, expect, test } from 'vitest';

import { compareRgba, diffRgbaMask } from '../src/png.ts';

function image(width: number, height: number, data: number[]) {
  return { width, height, data: Uint8Array.from(data) };
}

describe('RGBA parity', () => {
  test('identical images have zero differing pixels', () => {
    const left = image(2, 1, [1, 2, 3, 4, 5, 6, 7, 8]);
    const right = image(2, 1, [1, 2, 3, 4, 5, 6, 7, 8]);

    expect(compareRgba(left, right)).toBe(0);
    expect(Array.from(diffRgbaMask(left, right))).toEqual([0, 0]);
  });

  test('a one-pixel change has one differing pixel', () => {
    const left = image(2, 1, [1, 2, 3, 4, 5, 6, 7, 8]);
    const right = image(2, 1, [1, 2, 3, 4, 5, 6, 7, 9]);

    expect(compareRgba(left, right)).toBe(1);
    expect(Array.from(diffRgbaMask(left, right))).toEqual([0, 0xff]);
  });

  test('a size mismatch is an error', () => {
    const left = image(2, 1, [1, 2, 3, 4, 5, 6, 7, 8]);
    const right = image(1, 1, [1, 2, 3, 4]);

    expect(() => compareRgba(left, right)).toThrow(/size mismatch/);
    expect(() => diffRgbaMask(left, right)).toThrow(/size mismatch/);
  });
});
