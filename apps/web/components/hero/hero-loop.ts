import { motion } from 'xploder/motion';

export const MS_PER_SECOND = 1_000;

const milliseconds = (seconds: number): number => seconds * MS_PER_SECOND;

export const HERO_STORYBOARD_MS = {
  implode: milliseconds(motion.durations.implode + motion.durations.tourBeat),
  explode: milliseconds(motion.durations.explode + motion.durations.tourPulse),
  zoomStep: milliseconds(motion.staggers.tourStep),
  zoomSettle: milliseconds(motion.durations.tourPulse + motion.staggers.tourStep),
  turnStep: milliseconds(motion.durations.tourBeat),
} as const;

export const HERO_WATCHDOG_MS = {
  overdue: milliseconds(motion.durations.tourBeat * 1.5),
} as const;

export type HeroLoopState = 'running' | 'paused';

export type HeroSequencePhase =
  'idle' | 'implode' | 'explode' | 'zoomin' | 'capture' | 'inspect' | 'turn';

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

export interface HeroSequenceActions {
  explode(): void;
  implode(): void;
  zoomIn(): void;
  zoomReset(): void;
  rotateRight(): void;
  selectFlow(flowId: string): void;
  playTour(): void;
  pauseTour(): void;
  stopTour(): void;
}

export interface HeroFollowDriver {
  start(flowId: string): void;
  follow(flowId: string, step: number): void;
  pause(): void;
  resume(): void;
  reset(): void;
  stop(): void;
  dispose(): void;
}

export interface HeroSequenceOptions {
  readonly actions: HeroSequenceActions;
  readonly follow: HeroFollowDriver;
  readonly captureFlow: string;
  readonly inspectFlow: string;
  readonly schedule: (callback: () => void, delayMs: number) => unknown;
  readonly cancel: (handle: unknown) => void;
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

const ZOOM_STEPS = 3;
const TURN_STEPS = 2;

export const INITIAL_HERO_SEQUENCE_STATE: HeroSequenceState = {
  phase: 'idle',
  status: 'paused',
  started: false,
  tour: EMPTY_HERO_TOUR_STATE,
};

function isTourPhase(phase: HeroSequencePhase): phase is 'capture' | 'inspect' {
  return phase === 'capture' || phase === 'inspect';
}

export function createHeroSequence({
  actions,
  follow,
  captureFlow,
  inspectFlow,
  schedule,
  cancel,
  onChange,
}: HeroSequenceOptions): HeroSequence {
  let phase: HeroSequencePhase = 'idle';
  let started = false;
  let suspended = false;
  let disposed = false;
  let tour = EMPTY_HERO_TOUR_STATE;
  let zoomSteps = 0;
  let turnSteps = 0;
  let pending: { readonly run: () => void; readonly delayMs: number } | null = null;
  let pendingHandle: unknown;

  const snapshot = (): HeroSequenceState => ({
    phase,
    status: !started || suspended ? 'paused' : 'running',
    started,
    tour,
  });

  const notify = (): void => onChange?.(snapshot());

  const cancelPending = (): void => {
    if (pendingHandle === undefined) return;

    cancel(pendingHandle);
    pendingHandle = undefined;
  };

  const clearPending = (): void => {
    cancelPending();
    pending = null;
  };

  const wait = (delayMs: number, run: () => void): void => {
    clearPending();
    pending = { delayMs, run };
    pendingHandle = schedule(() => {
      pending = null;
      pendingHandle = undefined;
      if (disposed || suspended) return;
      run();
    }, delayMs);
  };

  const resumePending = (): void => {
    if (pending === null) return;

    const next = pending;
    wait(next.delayMs, next.run);
  };

  const beginFlow = (next: Extract<HeroSequencePhase, 'capture' | 'inspect'>): void => {
    clearPending();
    phase = next;
    turnSteps = 0;
    const flowId = next === 'capture' ? captureFlow : inspectFlow;
    follow.start(flowId);
    actions.selectFlow(flowId);
    actions.playTour();
    notify();
  };

  function beginTurn(): void {
    clearPending();
    phase = 'turn';
    turnSteps = 0;
    actions.stopTour();
    actions.zoomReset();
    follow.reset();
    notify();
    wait(HERO_STORYBOARD_MS.turnStep, turn);
  }

  function beginImplode(): void {
    clearPending();
    phase = 'implode';
    turnSteps = 0;
    follow.stop();
    actions.implode();
    notify();
    wait(HERO_STORYBOARD_MS.implode, beginExplode);
  }

  function turn(): void {
    if (disposed || suspended || phase !== 'turn') return;

    turnSteps += 1;
    actions.rotateRight();
    if (turnSteps < TURN_STEPS) wait(HERO_STORYBOARD_MS.turnStep, turn);
    else wait(HERO_STORYBOARD_MS.turnStep, beginImplode);
  }

  function beginExplode(): void {
    clearPending();
    phase = 'explode';
    actions.explode();
    notify();
    wait(HERO_STORYBOARD_MS.explode, beginZoom);
  }

  function zoom(): void {
    if (disposed || suspended || phase !== 'zoomin') return;

    zoomSteps += 1;
    actions.zoomIn();
    if (zoomSteps < ZOOM_STEPS) wait(HERO_STORYBOARD_MS.zoomStep, zoom);
    else wait(HERO_STORYBOARD_MS.zoomSettle, () => beginFlow('capture'));
  }

  function beginZoom(): void {
    clearPending();
    phase = 'zoomin';
    zoomSteps = 0;
    notify();
    zoom();
  }

  const advanceTour = (): void => {
    if (!started || disposed || suspended) return;

    if (phase === 'capture') beginFlow('inspect');
    else if (phase === 'inspect') beginTurn();
  };

  return {
    start: () => {
      if (disposed || started) return;

      started = true;
      suspended = false;
      actions.zoomReset();
      beginImplode();
    },
    pause: () => {
      if (disposed || !started || suspended) return;

      suspended = true;
      cancelPending();
      if (isTourPhase(phase)) actions.pauseTour();
      follow.pause();
      notify();
    },
    resume: () => {
      if (disposed || !started || !suspended) return;

      suspended = false;
      if (isTourPhase(phase) && tour.status === 'ended') {
        advanceTour();
        return;
      }

      if (isTourPhase(phase)) {
        follow.resume();
        actions.playTour();
      } else {
        follow.resume();
        resumePending();
      }
      notify();
    },
    updateTour: (next) => {
      tour = next;

      if (!isTourPhase(phase)) {
        notify();
        return;
      }

      const expectedFlow = phase === 'capture' ? captureFlow : inspectFlow;
      if (next.flowId !== expectedFlow) {
        beginFlow(phase);
        return;
      }

      if (suspended) {
        if (next.status === 'playing') actions.pauseTour();
        notify();
        return;
      }

      if (next.status === 'playing' && next.step >= 0) {
        follow.follow(next.flowId, next.step);
      } else if (next.status === 'ended') {
        advanceTour();
        return;
      } else if (next.status === 'idle' || next.status === 'paused') {
        actions.playTour();
      }

      notify();
    },
    dispose: () => {
      if (disposed) return;

      disposed = true;
      clearPending();
      follow.dispose();
    },
    get state() {
      return snapshot();
    },
  };
}
