import { useEffect, useState, type Dispatch } from 'react';

import { positionAt, type TourAction, type TourFlow, type TourState } from '../interaction/tour';
import { motion } from '../motion';
import type { ClockReader } from '../time/clock';

export function useTourClock(
  state: TourState,
  flows: readonly TourFlow[],
  clock: ClockReader,
  dispatch: Dispatch<TourAction>,
): void {
  const [wake, setWake] = useState(0);

  useEffect(() => {
    if (state.status !== 'playing') return;

    const timestamp = clock.now();
    const position = positionAt(state, timestamp, flows, motion.durations.tourBeat);

    if (position.status !== state.status) {
      dispatch({ type: 'tick', now: timestamp });
      return;
    }

    const { nextBoundary } = position;

    if (nextBoundary === null) return;

    const cancel = clock.schedule(
      Math.max(0, nextBoundary - timestamp),
      () => {
        dispatch({ type: 'tick', now: clock.now() });
        setWake((current) => current + 1);
      },
      timestamp,
    );

    return cancel;
  }, [clock, dispatch, flows, state, wake]);
}
