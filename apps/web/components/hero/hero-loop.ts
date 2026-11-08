import { motion } from 'xploder/motion';

export const MS_PER_SECOND = 1_000;

export const HERO_LOOP_STEP_MS =
  (Math.max(motion.durations.explode, motion.durations.implode) + motion.durations.tourBeat) *
  MS_PER_SECOND;

export type HeroLoopState = 'running' | 'paused';

export interface HeroLoopActions {
  explode(): void;
  implode(): void;
  rotateRight(): void;
}

export interface HeroLoopOptions {
  readonly actions: HeroLoopActions;
  readonly schedule: (callback: () => void, delayMs: number) => unknown;
  readonly cancel: (handle: unknown) => void;
  readonly onStep?: (step: 'implode' | 'explode') => void;
}

export interface HeroLoop {
  start(): void;
  pause(): void;
  resume(): void;
  dispose(): void;
  readonly state: HeroLoopState;
}

export function createHeroLoop({ actions, schedule, cancel, onStep }: HeroLoopOptions): HeroLoop {
  let state: HeroLoopState = 'paused';
  let disposed = false;
  let scheduled = false;
  let handle: unknown;
  let next: 'implode' | 'explode' = 'implode';

  const cancelPending = (): void => {
    if (!scheduled) return;

    cancel(handle);
    scheduled = false;
  };

  const scheduleNext = (): void => {
    scheduled = true;
    handle = schedule(() => {
      scheduled = false;
      if (disposed || state !== 'running') return;

      const step = next;

      actions.rotateRight();
      if (step === 'implode') actions.implode();
      else actions.explode();
      next = step === 'implode' ? 'explode' : 'implode';
      scheduleNext();
      onStep?.(step);
    }, HERO_LOOP_STEP_MS);
  };

  const resume = (): void => {
    if (disposed || state === 'running') return;

    state = 'running';
    scheduleNext();
  };

  return {
    start: resume,
    resume,
    pause: () => {
      if (disposed) return;

      cancelPending();
      state = 'paused';
    },
    dispose: () => {
      if (disposed) return;

      disposed = true;
      cancelPending();
      state = 'paused';
    },
    get state() {
      return state;
    },
  };
}

export type HeroSequencePhase = 'idle' | 'capture' | 'inspect' | 'turn';

export type HeroTourStatus = 'idle' | 'playing' | 'paused' | 'ended';

export interface HeroTourState {
  readonly status: HeroTourStatus;
  readonly flowId: string | null;
  readonly step: number;
  readonly total: number;
}

export const EMPTY_HERO_TOUR_STATE: HeroTourState = {
  status: 'idle',
  flowId: null,
  step: -1,
  total: 0,
};

export interface HeroSequenceActions extends HeroLoopActions {
  selectFlow(flowId: string): void;
  playTour(): void;
  pauseTour(): void;
  stopTour(): void;
}

export interface HeroSequenceOptions extends Omit<HeroLoopOptions, 'actions'> {
  readonly actions: HeroSequenceActions;
  readonly captureFlow: string;
  readonly inspectFlow: string;
  readonly onChange?: (state: HeroSequenceState) => void;
}

export interface HeroSequenceState {
  readonly phase: HeroSequencePhase;
  readonly status: HeroLoopState;
  readonly started: boolean;
  readonly tour: HeroTourState;
}

export interface HeroSequence {
  start(): void;
  pause(): void;
  resume(): void;
  updateTour(tour: HeroTourState): void;
  dispose(): void;
  readonly state: HeroSequenceState;
}

const TURN_STEPS = 2;

export const INITIAL_HERO_SEQUENCE_STATE: HeroSequenceState = {
  phase: 'idle',
  status: 'paused',
  started: false,
  tour: EMPTY_HERO_TOUR_STATE,
};

export function createHeroSequence({
  actions,
  captureFlow,
  inspectFlow,
  onChange,
  schedule,
  cancel,
}: HeroSequenceOptions): HeroSequence {
  let phase: HeroSequencePhase = 'idle';
  let started = false;
  let suspended = false;
  let disposed = false;
  let turnSteps = 0;
  let tour = EMPTY_HERO_TOUR_STATE;

  const snapshot = (): HeroSequenceState => ({
    phase,
    status: !started || suspended ? 'paused' : 'running',
    started,
    tour,
  });

  const notify = (): void => onChange?.(snapshot());

  const beginFlow = (next: Extract<HeroSequencePhase, 'capture' | 'inspect'>): void => {
    phase = next;
    turnSteps = 0;
    loop.pause();
    actions.selectFlow(next === 'capture' ? captureFlow : inspectFlow);
    actions.playTour();
    notify();
  };

  const enterTurn = (): void => {
    phase = 'turn';
    turnSteps = 0;
    actions.stopTour();
    loop.resume();
    notify();
  };

  const onTurnStep = (): void => {
    if (disposed || suspended || phase !== 'turn') return;

    turnSteps += 1;
    if (turnSteps < TURN_STEPS) return;

    beginFlow('capture');
  };

  const loop = createHeroLoop({
    actions,
    schedule,
    cancel,
    onStep: onTurnStep,
  });

  const advanceTour = (): void => {
    if (!started || disposed || suspended) return;

    if (phase === 'turn') return;

    const expectedPhase: Extract<HeroSequencePhase, 'capture' | 'inspect'> =
      phase === 'capture' ? 'capture' : 'inspect';
    const expectedFlow = expectedPhase === 'capture' ? captureFlow : inspectFlow;
    if (tour.flowId !== expectedFlow) {
      beginFlow(expectedPhase);
      return;
    }

    if (tour.status === 'ended') {
      if (phase === 'capture') beginFlow('inspect');
      else enterTurn();
      return;
    }

    if (tour.status === 'idle' || tour.status === 'paused') {
      actions.playTour();
    }
  };

  return {
    start: () => {
      if (disposed || started) return;

      started = true;
      suspended = false;
      beginFlow('capture');
    },
    pause: () => {
      if (disposed || !started || suspended) return;

      suspended = true;
      if (phase !== 'turn') actions.pauseTour();
      loop.pause();
      notify();
    },
    resume: () => {
      if (disposed || !started || !suspended) return;

      suspended = false;
      if (phase === 'turn') loop.resume();
      else if (tour.status === 'ended') advanceTour();
      else actions.playTour();
      notify();
    },
    updateTour: (next) => {
      tour = next;
      if (suspended && phase !== 'turn' && tour.status === 'playing') actions.pauseTour();
      advanceTour();
      notify();
    },
    dispose: () => {
      if (disposed) return;

      disposed = true;
      loop.dispose();
    },
    get state() {
      return snapshot();
    },
  };
}
