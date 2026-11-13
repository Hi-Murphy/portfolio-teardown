import { describe, expect, test, vi } from 'vitest';

import {
  EMPTY_HERO_LABEL_STATE,
  HERO_LABEL_EXIT_FALLBACK_MS,
  createHeroLabelController,
  type HeroStepLabel,
} from '../components/hero/hero-label';

function label(step: number): HeroStepLabel {
  return {
    key: `capture:${step}:component-${step}`,
    flowLabel: 'Frames in',
    step,
    total: 7,
    componentId: `component-${step}`,
    componentName: `Component ${step}`,
    componentSummary: `Summary ${step}`,
  };
}

function setup() {
  let scheduled: (() => void) | null = null;
  const cancel = vi.fn();
  const onChange = vi.fn();
  const controller = createHeroLabelController({
    schedule: (callback) => {
      scheduled = callback;
      return 1;
    },
    cancel,
    onChange,
  });
  return {
    controller,
    cancel,
    onChange,
    finishExit: () => scheduled?.(),
  };
}

describe('hero step label controller', () => {
  test('fades the old label to zero before the new one enters', () => {
    const { controller, finishExit } = setup();
    const first = label(0);
    const second = label(1);

    controller.update(first, false);
    expect(controller.state).toEqual({
      display: first,
      pending: null,
      stage: 'enter',
      opacity: 0,
    });

    controller.entered();
    expect(controller.state.stage).toBe('visible');
    expect(controller.state.opacity).toBe(1);

    controller.update(second, false);
    expect(controller.state).toEqual({
      display: first,
      pending: second,
      stage: 'exit',
      opacity: 0,
    });

    finishExit();
    expect(controller.state).toEqual({
      display: second,
      pending: null,
      stage: 'enter',
      opacity: 0,
    });

    controller.entered();
    expect(controller.state.stage).toBe('visible');
    expect(controller.state.opacity).toBe(1);
  });

  test('uses the panel-exit token as the fallback timer and cancels it on transition end', () => {
    const scheduled: { callback: () => void; delayMs: number }[] = [];
    const cancel = vi.fn();
    const controller = createHeroLabelController({
      schedule: (callback, delayMs) => {
        scheduled.push({ callback, delayMs });
        return scheduled.length;
      },
      cancel,
    });

    controller.update(label(0), false);
    controller.entered();
    controller.update(label(1), false);
    expect(scheduled[0]?.delayMs).toBe(HERO_LABEL_EXIT_FALLBACK_MS);

    controller.transitionEnd();
    expect(cancel).toHaveBeenCalledWith(1);
    expect(controller.state.display?.step).toBe(1);
    expect(controller.state.stage).toBe('enter');
  });

  test('switches instantly for reduced motion and clears the label outside the tour', () => {
    const { controller, onChange } = setup();

    controller.update(label(2), true);
    expect(controller.state).toEqual({
      display: label(2),
      pending: null,
      stage: 'visible',
      opacity: 1,
    });

    controller.update(null, true);
    expect(controller.state).toEqual(EMPTY_HERO_LABEL_STATE);
    expect(onChange).toHaveBeenLastCalledWith(EMPTY_HERO_LABEL_STATE);
  });
});
