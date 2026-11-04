import { describe, expect, test } from 'vitest';

import { parityShotsForRoute } from '../src/cli/parity.ts';
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

describe('parity route filter', () => {
  test('selects one route without changing the default capture set', () => {
    const all = parityShotsForRoute();
    const home = parityShotsForRoute('home');
    const project = parityShotsForRoute('project');

    expect(all).toHaveLength(8);
    expect(home.map((shot) => shot.id)).toEqual([
      'home-mobile-light',
      'home-mobile-dark',
      'home-desktop-light',
      'home-desktop-dark',
    ]);
    expect(project.map((shot) => shot.id)).toEqual([
      'project-mobile-light',
      'project-mobile-dark',
      'project-desktop-light',
      'project-desktop-dark',
    ]);
    expect([...home, ...project].map((shot) => shot.id)).toEqual(all.map((shot) => shot.id));
  });
});
