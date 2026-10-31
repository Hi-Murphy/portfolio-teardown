import type { MotionTokens } from '../motion';

export interface OverlayTiming {
  readonly fadeMs: number;
}

export interface TraceTiming {
  readonly drawMs: number;
  readonly delayMs: number;
  readonly dotPeriodMs: number;
}

const MILLISECONDS_PER_SECOND = 1_000;
const TOUR_PULSE_PERIODS = 2;

export function milliseconds(seconds: number): number {
  return seconds * MILLISECONDS_PER_SECOND;
}

export function overlayTiming(tokens: MotionTokens): OverlayTiming {
  return { fadeMs: milliseconds(tokens.durations.hoverSettle) };
}

export function traceTiming(tokens: MotionTokens): TraceTiming {
  return {
    drawMs: milliseconds(tokens.durations.tourPulse),
    delayMs: milliseconds(tokens.staggers.tourStep),
    dotPeriodMs: milliseconds(TOUR_PULSE_PERIODS * tokens.durations.tourPulse),
  };
}
