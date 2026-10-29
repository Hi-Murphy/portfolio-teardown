import { describe, expect, test } from 'vitest';

import {
  distances,
  durations,
  easings,
  motion,
  motionCss,
  reducedMotion,
  resolveMotion,
  staggers,
  type MotionTokens,
} from '../src/motion/index';

const rfcD9Tokens: MotionTokens = {
  durations: {
    explode: 0.9,
    implode: 0.6,
    hoverLift: 0.18,
    hoverSettle: 0.24,
    tourPulse: 0.5,
    tourBeat: 1.6,
    panelEnter: 0.32,
    panelExit: 0.2,
  },
  easings: {
    explode: { gsap: 'expo.out', css: 'cubic-bezier(0.16, 1, 0.3, 1)' },
    implode: { gsap: 'power3.inOut', css: 'cubic-bezier(0.76, 0, 0.24, 1)' },
    hover: { gsap: 'power3.out', css: 'cubic-bezier(0.25, 1, 0.5, 1)' },
    tourPulse: { gsap: 'sine.inOut', css: 'cubic-bezier(0.37, 0, 0.63, 1)' },
    panelEnter: { gsap: 'expo.out', css: 'cubic-bezier(0.16, 1, 0.3, 1)' },
    panelExit: { gsap: 'power2.in', css: 'cubic-bezier(0.32, 0, 0.67, 0)' },
  },
  staggers: {
    explodeLayer: 0.06,
    explodeComponent: 0.02,
    implodeLayer: 0.04,
    tourStep: 0.15,
  },
  distances: {
    hoverLift: 4,
    panelOffset: 16,
  },
  reducedMotion: {
    policy: 'static-twin',
    query: '(prefers-reduced-motion: reduce)',
  },
};

describe('xploder motion tokens', () => {
  test('matches the RFC D9 seed table', () => {
    expect(durations).toEqual(rfcD9Tokens.durations);
    expect(easings).toEqual(rfcD9Tokens.easings);
    expect(staggers).toEqual(rfcD9Tokens.staggers);
    expect(distances).toEqual(rfcD9Tokens.distances);
    expect(reducedMotion).toEqual(rfcD9Tokens.reducedMotion);
    expect(motion).toEqual(rfcD9Tokens);
  });

  test('resolveMotion returns the static twin only when reduced motion is requested', () => {
    expect(resolveMotion(false)).toEqual(motion);

    const resolved = resolveMotion(true);

    expect(resolved.easings).toEqual(motion.easings);
    expect(resolved.reducedMotion).toEqual(motion.reducedMotion);
    expect(Object.values(resolved.durations).every((value) => value === 0)).toBe(true);
    expect(Object.values(resolved.staggers).every((value) => value === 0)).toBe(true);
    expect(Object.values(resolved.distances).every((value) => value === 0)).toBe(true);
    expect(motion).toEqual(rfcD9Tokens);
  });

  test('motionCss emits the contract units and reduced-motion static twin', () => {
    const css = motionCss();

    expect(css).toContain('--motion-duration-explode:900ms;');
    expect(css).toContain('--motion-ease-explode:cubic-bezier(0.16, 1, 0.3, 1);');
    expect(css).toContain('--motion-stagger-explode-layer:60ms;');
    expect(css).toContain('--motion-distance-hover-lift:4px;');
    expect(css).toContain(
      '@media (prefers-reduced-motion: reduce){:root{--motion-duration-explode:0ms;',
    );
    expect(css).toContain('--motion-stagger-explode-layer:0ms;');
    expect(css).toContain('--motion-distance-hover-lift:0px;');
  });
});
