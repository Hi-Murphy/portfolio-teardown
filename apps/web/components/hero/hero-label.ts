import { durations, staggers } from 'xploder/motion';

import { MS_PER_SECOND } from './hero-loop';

export const HERO_LABEL_EXIT_MS = durations.panelExit * MS_PER_SECOND;
export const HERO_LABEL_EXIT_FALLBACK_MS =
  (durations.panelExit + staggers.tourStep) * MS_PER_SECOND;

export interface HeroStepLabel {
  readonly key: string;
  readonly flowLabel: string;
  readonly step: number;
  readonly total: number;
  readonly componentId: string;
  readonly componentName: string;
  readonly componentSummary: string;
}

export type HeroLabelStage = 'hidden' | 'exit' | 'enter' | 'visible';

export interface HeroLabelState {
  readonly display: HeroStepLabel | null;
  readonly pending: HeroStepLabel | null;
  readonly stage: HeroLabelStage;
  readonly opacity: 0 | 1;
}

export const EMPTY_HERO_LABEL_STATE: HeroLabelState = {
  display: null,
  pending: null,
  stage: 'hidden',
  opacity: 0,
};

export interface HeroLabelControllerOptions {
  readonly schedule: (callback: () => void, delayMs: number) => unknown;
  readonly cancel: (handle: unknown) => void;
  readonly onChange?: (state: HeroLabelState) => void;
}

export interface HeroLabelController {
  update(label: HeroStepLabel | null, instant: boolean): void;
  entered(): void;
  transitionEnd(): void;
  dispose(): void;
  readonly state: HeroLabelState;
}

export function createHeroLabelController({
  schedule,
  cancel,
  onChange,
}: HeroLabelControllerOptions): HeroLabelController {
  let display: HeroStepLabel | null = null;
  let pending: HeroStepLabel | null = null;
  let stage: HeroLabelStage = 'hidden';
  let opacity: 0 | 1 = 0;
  let exitHandle: unknown;
  let disposed = false;

  const snapshot = (): HeroLabelState => ({ display, pending, stage, opacity });

  const notify = (): void => onChange?.(snapshot());

  const cancelExit = (): void => {
    if (exitHandle === undefined) return;

    cancel(exitHandle);
    exitHandle = undefined;
  };

  const finishExit = (): void => {
    cancelExit();
    if (disposed || stage !== 'exit') return;

    if (pending === null) {
      display = null;
      stage = 'hidden';
      opacity = 0;
      notify();
      return;
    }

    display = pending;
    pending = null;
    stage = 'enter';
    opacity = 0;
    notify();
  };

  const beginExit = (next: HeroStepLabel | null): void => {
    cancelExit();
    pending = next;
    stage = 'exit';
    opacity = 0;
    notify();
    exitHandle = schedule(finishExit, HERO_LABEL_EXIT_FALLBACK_MS);
  };

  return {
    update: (label, instant) => {
      if (disposed) return;

      const nextKey = label?.key ?? null;
      if (instant) {
        cancelExit();
        display = label;
        pending = null;
        stage = label === null ? 'hidden' : 'visible';
        opacity = label === null ? 0 : 1;
        notify();
        return;
      }

      if (display === null) {
        if (label === null) return;

        display = label;
        pending = null;
        stage = 'enter';
        opacity = 0;
        notify();
        return;
      }

      if (display.key === nextKey && pending === null) {
        if (label !== null && stage === 'exit') {
          cancelExit();
          stage = 'visible';
          opacity = 1;
          notify();
        }
        return;
      }

      beginExit(label);
    },
    entered: () => {
      if (disposed || stage !== 'enter') return;

      stage = 'visible';
      opacity = 1;
      notify();
    },
    transitionEnd: () => {
      if (stage === 'exit') finishExit();
    },
    dispose: () => {
      disposed = true;
      cancelExit();
    },
    get state() {
      return snapshot();
    },
  };
}
