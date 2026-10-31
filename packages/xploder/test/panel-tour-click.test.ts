import { describe, expect, test } from 'vitest';

import { parseProject } from '../src/index';
import {
  initialTour,
  positionAt,
  tourReducer,
  type TourState,
  type TourStatus,
} from '../src/interaction/tour';
import { motion } from '../src/motion';
import {
  jumpSequence,
  resolveSlabClick,
  stepForComponent,
  type TourCommand,
} from '../src/panel/tourClick';
import { projectAJson } from './fixtures';

const projectA = parseProject(projectAJson);
const FLOW = projectA.flows.find((flow) => flow.id === 'live-update');

if (FLOW === undefined) throw new Error('Fixture A is missing the live-update flow.');

const FLOWS = projectA.flows;
const PATH = FLOW.path;
const BEAT = motion.durations.tourBeat;
const IN_PATH = 'tide-repository';
const OUT_OF_PATH = 'tide-cache';

function stateAt(step: number, status: 'playing' | 'paused'): TourState {
  let state = tourReducer(initialTour(FLOWS), { type: 'play', now: 0 }, FLOWS, BEAT);

  for (let index = 0; index < step; index += 1) {
    state = tourReducer(state, { type: 'step', now: 0 }, FLOWS, BEAT);
  }

  if (status === 'paused') {
    return tourReducer(state, { type: 'pause', now: 0 }, FLOWS, BEAT);
  }

  return tourReducer(state, { type: 'play', now: 0 }, FLOWS, BEAT);
}

function endedTour(): TourState {
  return tourReducer(stateAt(PATH.length - 1, 'playing'), { type: 'tick', now: BEAT }, FLOWS, BEAT);
}

const STATES: Readonly<Record<TourStatus, TourState>> = {
  idle: initialTour(FLOWS),
  playing: stateAt(1, 'playing'),
  paused: stateAt(1, 'paused'),
  ended: endedTour(),
};

const IN_PATH_JUMP = PATH.indexOf(IN_PATH);

interface ClickCase {
  readonly status: TourStatus;
  readonly hit: string | null;
  readonly panelEvent: ReturnType<typeof resolveSlabClick>['panelEvent'];
  readonly tour: TourCommand | null;
}

const CLICK_CASES: readonly ClickCase[] = [
  {
    status: 'idle',
    hit: IN_PATH,
    panelEvent: { type: 'slab', hit: IN_PATH },
    tour: null,
  },
  {
    status: 'playing',
    hit: IN_PATH,
    panelEvent: { type: 'closeControl' },
    tour: { type: 'jump', step: IN_PATH_JUMP, resume: true },
  },
  {
    status: 'paused',
    hit: IN_PATH,
    panelEvent: { type: 'closeControl' },
    tour: { type: 'jump', step: IN_PATH_JUMP, resume: false },
  },
  {
    status: 'ended',
    hit: IN_PATH,
    panelEvent: { type: 'closeControl' },
    tour: { type: 'jump', step: IN_PATH_JUMP, resume: false },
  },
  {
    status: 'idle',
    hit: OUT_OF_PATH,
    panelEvent: { type: 'slab', hit: OUT_OF_PATH },
    tour: null,
  },
  {
    status: 'playing',
    hit: OUT_OF_PATH,
    panelEvent: { type: 'slab', hit: OUT_OF_PATH },
    tour: { type: 'pause' },
  },
  {
    status: 'paused',
    hit: OUT_OF_PATH,
    panelEvent: { type: 'slab', hit: OUT_OF_PATH },
    tour: null,
  },
  {
    status: 'ended',
    hit: OUT_OF_PATH,
    panelEvent: { type: 'slab', hit: OUT_OF_PATH },
    tour: null,
  },
  {
    status: 'idle',
    hit: null,
    panelEvent: { type: 'slab', hit: null },
    tour: null,
  },
  {
    status: 'playing',
    hit: null,
    panelEvent: { type: 'slab', hit: null },
    tour: null,
  },
  {
    status: 'paused',
    hit: null,
    panelEvent: { type: 'slab', hit: null },
    tour: null,
  },
  {
    status: 'ended',
    hit: null,
    panelEvent: { type: 'slab', hit: null },
    tour: null,
  },
];

function applyTourCommand(state: TourState, command: TourCommand): TourState {
  if (command.type === 'pause') {
    return tourReducer(state, { type: 'pause', now: 0 }, FLOWS, BEAT);
  }

  return jumpSequence(command.step, command.resume).reduce(
    (next, action) => tourReducer(next, { type: action, now: 0 }, FLOWS, BEAT),
    state,
  );
}

describe('resolveSlabClick', () => {
  test('fixture A exposes the expected live-update path', () => {
    expect(IN_PATH_JUMP).toBe(3);
    expect(PATH[IN_PATH_JUMP]).toBe(IN_PATH);
    expect(PATH).not.toContain(OUT_OF_PATH);
  });

  test.each(CLICK_CASES)('$status + $hit', ({ status, hit, panelEvent, tour }) => {
    const state = STATES[status];

    expect(
      resolveSlabClick({
        hit,
        tour: { status, flowId: FLOW.id, step: state.step },
        flows: FLOWS,
      }),
    ).toStrictEqual({ panelEvent, tour });
  });
});

describe('stepForComponent', () => {
  test('finds the first occurrence before playback starts', () => {
    expect(stepForComponent(PATH, IN_PATH, -1)).toBe(IN_PATH_JUMP);
  });

  test('finds the next occurrence after the current step', () => {
    expect(stepForComponent(['request', 'request'], 'request', 0)).toBe(1);
  });

  test('wraps to the first occurrence when no later occurrence exists', () => {
    expect(stepForComponent(['request', 'request'], 'request', 1)).toBe(0);
    expect(stepForComponent(['request', 'other', 'request'], 'request', 2)).toBe(0);
  });

  test('returns null when the component is absent', () => {
    expect(stepForComponent(PATH, 'missing', 0)).toBeNull();
  });
});

describe('jumpSequence', () => {
  test('stops, steps to the target, and resumes only when requested', () => {
    expect(jumpSequence(3, true)).toStrictEqual(['stop', 'step', 'step', 'step', 'step', 'play']);
    expect(jumpSequence(0, false)).toStrictEqual(['stop', 'step']);
  });
});

describe('jump sequence with the sealed tour reducer', () => {
  test('jumping while playing lands on the target step and keeps playing', () => {
    const state = applyTourCommand(stateAt(1, 'playing'), {
      type: 'jump',
      step: 3,
      resume: true,
    });

    expect(state).toMatchObject({ status: 'playing', step: 3 });
    expect(positionAt(state, BEAT / 2, FLOWS, BEAT).componentId).toBe('tide-repository');
  });

  test('jumping while paused lands on the target step and stays paused', () => {
    const state = applyTourCommand(stateAt(1, 'paused'), {
      type: 'jump',
      step: 4,
      resume: false,
    });

    expect(state).toMatchObject({ status: 'paused', step: 4 });
    expect(positionAt(state, 0, FLOWS, BEAT).componentId).toBe(PATH[4]);
  });

  test('jumping from ended returns to the first step, paused', () => {
    expect(endedTour().status).toBe('ended');

    const state = applyTourCommand(endedTour(), {
      type: 'jump',
      step: 0,
      resume: false,
    });

    expect(state).toMatchObject({ status: 'paused', step: 0 });
    expect(positionAt(state, 0, FLOWS, BEAT).componentId).toBe(PATH[0]);
  });

  test('pause then play resumes from the current step', () => {
    const paused = tourReducer(
      stateAt(1, 'playing'),
      { type: 'pause', now: BEAT / 4 },
      FLOWS,
      BEAT,
    );
    const playing = tourReducer(paused, { type: 'play', now: BEAT }, FLOWS, BEAT);

    expect(paused).toMatchObject({ status: 'paused', step: 1 });
    expect(playing).toMatchObject({ status: 'playing', step: 1 });
    expect(positionAt(playing, BEAT * 1.25, FLOWS, BEAT).componentId).toBe(PATH[1]);
  });
});
