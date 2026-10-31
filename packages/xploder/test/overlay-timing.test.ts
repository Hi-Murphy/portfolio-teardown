import { describe, expect, test } from 'vitest';

import { motion, resolveMotion, type MotionTokens } from '../src/motion';
import { milliseconds, overlayTiming, traceTiming } from '../src/overlay/timing';

const CUSTOM_TOKENS: MotionTokens = {
  ...motion,
  durations: {
    ...motion.durations,
    hoverSettle: 0.4,
    tourPulse: 0.25,
  },
  staggers: {
    ...motion.staggers,
    tourStep: 0.05,
  },
};

describe('overlay timing', () => {
  test('converts seconds to milliseconds', () => {
    expect(milliseconds(0)).toBe(0);
    expect(milliseconds(0.5)).toBe(500);
    expect(milliseconds(1.25)).toBe(1_250);
  });

  test('derives fade and trace timings from the motion tokens', () => {
    expect(overlayTiming(CUSTOM_TOKENS)).toStrictEqual({ fadeMs: 400 });
    expect(traceTiming(CUSTOM_TOKENS)).toStrictEqual({
      drawMs: 250,
      delayMs: 50,
      dotPeriodMs: 500,
    });
  });

  test('matches the product token values', () => {
    expect(overlayTiming(motion).fadeMs).toBe(motion.durations.hoverSettle * 1_000);
    expect(traceTiming(motion)).toStrictEqual({
      drawMs: motion.durations.tourPulse * 1_000,
      delayMs: motion.staggers.tourStep * 1_000,
      dotPeriodMs: 2 * motion.durations.tourPulse * 1_000,
    });
  });

  test('zeroes every overlay timing under the static twin', () => {
    const reduced = resolveMotion(true);

    expect(overlayTiming(reduced)).toStrictEqual({ fadeMs: 0 });
    expect(traceTiming(reduced)).toStrictEqual({
      drawMs: 0,
      delayMs: 0,
      dotPeriodMs: 0,
    });
  });
});
