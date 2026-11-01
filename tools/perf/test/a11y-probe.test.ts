import { describe, expect, test } from 'vitest';

import {
  evaluateAxPartNumberNodes,
  evaluatePixelContrast,
  evaluatePresentationDiff,
  evaluateReducedMotion,
  evaluateTabWalk,
  type FocusStep,
  type ReducedMotionSample,
} from '../src/a11y-probe.ts';
import {
  diffPresentation,
  type PresentationEntry,
  type PresentationStyles,
} from '../src/presentation-snapshot.ts';

function step(key: string): FocusStep {
  return { key, role: 'button', name: key, panel: 'closed' };
}

function backwards(expected: readonly string[]): readonly FocusStep[] {
  return expected.slice(0, -1).reverse().map(step);
}

describe('evaluateTabWalk', () => {
  const expected = ['skip', 'viewer', 'proxy:one', 'control:tour-stop'];

  test('passes an expected forward and backward order', () => {
    const verdict = evaluateTabWalk(expected.map(step), backwards(expected), expected);

    expect(verdict.pass).toBe(true);
    expect(verdict.trap).toBe(false);
    expect(verdict.reachedLast).toBe(true);
    expect(verdict.forwardMatches).toBe(true);
    expect(verdict.backwardMatches).toBe(true);
  });

  test('fails a repeated cycle that never reaches the last control', () => {
    const forward = ['skip', 'viewer', 'proxy:one', 'skip', 'viewer', 'proxy:one'].map(step);
    const verdict = evaluateTabWalk(forward, [], expected);

    expect(verdict.pass).toBe(false);
    expect(verdict.trap).toBe(true);
    expect(verdict.reachedLast).toBe(false);
    expect(verdict.repeated).toBe('skip');
  });

  test('fails when the forward order differs from the expected order', () => {
    const verdict = evaluateTabWalk(
      ['skip', 'viewer', 'control:tour-stop'].map(step),
      backwards(expected),
      expected,
    );

    expect(verdict.pass).toBe(false);
    expect(verdict.forwardMatches).toBe(false);
    expect(verdict.trap).toBe(false);
  });

  test('fails when Shift+Tab does not retrace the forward walk', () => {
    const verdict = evaluateTabWalk(expected.map(step), expected.slice(0, -1).map(step), expected);

    expect(verdict.pass).toBe(false);
    expect(verdict.backwardMatches).toBe(false);
  });
});

describe('evaluateAxPartNumberNodes', () => {
  test('fails a part number outside the allowed roots', () => {
    const verdict = evaluateAxPartNumberNodes([
      { role: 'StaticText', text: '3.1', allowedRoot: null },
    ]);

    expect(verdict.pass).toBe(false);
    expect(verdict.offenders).toHaveLength(1);
  });

  test('passes part numbers inside an allowed root', () => {
    const verdict = evaluateAxPartNumberNodes([
      { role: 'StaticText', text: '3.1', allowedRoot: 'navigator' },
      { role: 'StaticText', text: '1.0.0', allowedRoot: null },
    ]);

    expect(verdict).toEqual({ pass: true, offenders: [] });
  });
});

describe('evaluatePixelContrast', () => {
  const black = { r: 0, g: 0, b: 0, a: 1 };
  const white = { r: 255, g: 255, b: 255, a: 1 };
  const grey100 = { r: 100, g: 100, b: 100, a: 1 };
  const grey128 = { r: 128, g: 128, b: 128, a: 1 };

  test('reports the worst and median background pixels', () => {
    const verdict = evaluatePixelContrast([white, grey100, grey128], black);

    expect(verdict.sampleCount).toBe(3);
    expect(verdict.worst).toBeCloseTo(3.55, 2);
    expect(verdict.median).toBeCloseTo(5.32, 2);
    expect(verdict.worstBackground).toEqual(grey100);
    expect(verdict.medianBackground).toEqual(grey128);
    expect(verdict.pass).toBe(false);
  });

  test('passes a patch that clears AA', () => {
    const verdict = evaluatePixelContrast([white, white], black);

    expect(verdict.pass).toBe(true);
    expect(verdict.worst).toBeCloseTo(21, 0);
  });

  test('fails an empty patch', () => {
    const verdict = evaluatePixelContrast([], black);

    expect(verdict.pass).toBe(false);
    expect(verdict.sampleCount).toBe(0);
  });
});

describe('evaluateReducedMotion', () => {
  function samples(overrides: Partial<ReducedMotionSample>[] = []): ReducedMotionSample[] {
    return [10, 11, 11].map((frame, index) => ({
      animations: 0,
      tweening: false,
      frame,
      ...overrides[index],
    }));
  }

  test('passes all-zero animation samples and a still 3D scene', () => {
    const verdict = evaluateReducedMotion(samples(), true);

    expect(verdict).toMatchObject({
      pass: true,
      maxAnimations: 0,
      tweeningSeen: false,
      frameDelta: 1,
    });
  });

  test('fails when any sampled frame has a running animation', () => {
    const verdict = evaluateReducedMotion(samples([{}, { animations: 1 }]), false);

    expect(verdict.pass).toBe(false);
    expect(verdict.maxAnimations).toBe(1);
  });

  test('fails when tweening or more than two 3D frames are observed', () => {
    expect(evaluateReducedMotion(samples([{ tweening: true }]), false).pass).toBe(false);
    expect(evaluateReducedMotion(samples([{ frame: 10 }, {}, { frame: 13 }]), true).pass).toBe(
      false,
    );
  });
});

describe('evaluatePresentationDiff', () => {
  const styles: PresentationStyles = {
    color: 'rgb(1, 2, 3)',
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
  };

  function entry(overrides: Partial<PresentationEntry> = {}): PresentationEntry {
    return {
      state: 'a-select-tide-repository/light/desktop',
      path: 'lettering-layer/div:nth-child(1)',
      tag: 'div',
      rect: { x: 10, y: 10, width: 20, height: 20 },
      styles,
      ...overrides,
    };
  }

  test('allows the highlighted-face ink change and the hidden chip span', () => {
    const before = [entry()];
    const hiddenSpan = entry({
      path: 'panel-layer/ul:nth-child(1)/li:nth-child(1)/span:nth-child(3)',
      tag: 'span',
      rect: { x: 10, y: 10, width: 1, height: 1 },
      styles: { ...styles, 'background-color': 'rgba(0, 0, 0, 0)' },
    });
    const after = [entry({ styles: { ...styles, color: 'rgb(4, 5, 6)' } }), hiddenSpan];
    const changes = diffPresentation(before, after);
    const allowed = evaluatePresentationDiff(changes, after);

    expect(allowed.pass).toBe(true);
    expect(allowed.allowed).toHaveLength(2);
  });

  test('fails a presentation change outside the allowlist', () => {
    const after = [entry({ styles: { ...styles, 'font-size': '18px' } })];
    const verdict = evaluatePresentationDiff(diffPresentation([entry()], after), after);

    expect(verdict.pass).toBe(false);
    expect(verdict.failing[0]?.property).toBe('styles.font-size');
  });
});
