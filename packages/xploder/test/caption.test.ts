import { describe, expect, test } from 'vitest';

import { captionAnchor } from '../src/interaction/caption';

describe('captionAnchor', () => {
  test('anchors away from the target layer', () => {
    expect(captionAnchor(0, 5)).toBe('bottom');
    expect(captionAnchor(1, 5)).toBe('bottom');
    expect(captionAnchor(2, 5)).toBe('bottom');
    expect(captionAnchor(3, 5)).toBe('top');
    expect(captionAnchor(4, 5)).toBe('top');
    expect(captionAnchor(0, 4)).toBe('bottom');
    expect(captionAnchor(1, 4)).toBe('bottom');
    expect(captionAnchor(2, 4)).toBe('top');
    expect(captionAnchor(0, 1)).toBe('bottom');
  });

  test('anchors at the top when there is no target', () => {
    expect(captionAnchor(null, 5)).toBe('top');
    expect(captionAnchor(-1, 5)).toBe('top');
  });
});
