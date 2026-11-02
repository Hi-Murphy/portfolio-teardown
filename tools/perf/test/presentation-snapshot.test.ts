import { describe, expect, test } from 'vitest';

import {
  diffPresentation,
  type PresentationEntry,
  type PresentationStyles,
} from '../src/presentation-snapshot.ts';

function styles(overrides: Partial<PresentationStyles> = {}): PresentationStyles {
  return {
    color: 'canvastext',
    'background-color': 'transparent',
    'font-family': 'sans-serif',
    'font-size': '16px',
    'font-weight': '400',
    'letter-spacing': 'normal',
    'text-transform': 'none',
    'border-top-color': 'transparent',
    'border-right-color': 'transparent',
    'border-bottom-color': 'transparent',
    'border-left-color': 'transparent',
    'border-top-width': '0px',
    'border-right-width': '0px',
    'border-bottom-width': '0px',
    'border-left-width': '0px',
    opacity: '1',
    transform: 'none',
    visibility: 'visible',
    display: 'block',
    ...overrides,
  };
}

function entry(overrides: Partial<PresentationEntry> = {}): PresentationEntry {
  return {
    state: 'a-exploded-idle/light/desktop',
    path: 'lettering-layer',
    tag: 'div',
    rect: { x: 0, y: 0, width: 1280, height: 480 },
    styles: styles(),
    ...overrides,
  };
}

describe('diffPresentation', () => {
  test('returns no entries for equal snapshots', () => {
    expect(diffPresentation([entry()], [entry()])).toEqual([]);
  });

  test('returns one entry for one changed property', () => {
    expect(
      diffPresentation([entry()], [entry({ styles: styles({ 'background-color': 'canvas' }) })]),
    ).toEqual([
      {
        state: 'a-exploded-idle/light/desktop',
        path: 'lettering-layer',
        kind: 'changed',
        property: 'styles.background-color',
        before: 'transparent',
        after: 'canvas',
      },
    ]);
  });

  test('returns one entry for a missing node', () => {
    const child = entry({ path: 'lettering-layer/span:nth-child(1)' });

    expect(diffPresentation([entry(), child], [entry()])).toEqual([
      {
        state: 'a-exploded-idle/light/desktop',
        path: 'lettering-layer/span:nth-child(1)',
        kind: 'removed',
      },
    ]);
  });
});
