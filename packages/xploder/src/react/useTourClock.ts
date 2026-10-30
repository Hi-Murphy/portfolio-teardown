import { useEffect, type Dispatch } from 'react';

import { positionAt, type TourAction, type TourFlow, type TourState } from '../interaction/tour';
import { motion } from '../motion';

const MILLISECONDS_PER_SECOND = 1_000;

export function useTourClock(
  state: TourState,
  flows: readonly TourFlow[],
  now: () => number,
  dispatch: Dispatch<TourAction>,
): void {
  useEffect(() => {
    if (state.status !== 'playing') return;

    const timestamp = now();
    const { nextBoundary } = positionAt(state, timestamp, flows, motion.durations.tourBeat);

    if (nextBoundary === null) return;

    const delay = Math.max(0, nextBoundary - timestamp) * MILLISECONDS_PER_SECOND;
    const timer = setTimeout(() => dispatch({ type: 'tick', now: now() }), delay);

    return () => clearTimeout(timer);
  }, [dispatch, flows, now, state]);
}
