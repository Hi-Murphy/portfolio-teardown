import { describe, expect, test } from 'vitest';

import {
  INITIAL_POINTER,
  pointerReducer,
  type PointerInput,
  type PointerSource,
  type PointerState,
} from '../src/interaction/pointer';

const SOURCES = ['none', 'mouse', 'touch', 'program'] as const satisfies readonly PointerSource[];
const CLEARED: PointerState = { highlight: null, source: 'none' };

interface TransitionCase {
  readonly name: string;
  readonly input: PointerInput;
  readonly expected: (source: PointerSource, state: PointerState) => PointerState;
}

const CASES: readonly TransitionCase[] = [
  {
    name: 'move onto a component',
    input: { type: 'move', hit: 'component-b' },
    expected: () => ({ highlight: 'component-b', source: 'mouse' }),
  },
  {
    name: 'move over empty space',
    input: { type: 'move', hit: null },
    expected: (source, state) => (source === 'mouse' ? CLEARED : state),
  },
  {
    name: 'leave',
    input: { type: 'leave' },
    expected: (source, state) => (source === 'mouse' ? CLEARED : state),
  },
  {
    name: 'tap empty space',
    input: { type: 'tap', hit: null },
    expected: () => CLEARED,
  },
  {
    name: 'tap the highlighted component',
    input: { type: 'tap', hit: 'component-a' },
    expected: () => CLEARED,
  },
  {
    name: 'tap another component',
    input: { type: 'tap', hit: 'component-b' },
    expected: () => ({ highlight: 'component-b', source: 'touch' }),
  },
  {
    name: 'outside tap',
    input: { type: 'outsideTap' },
    expected: (source, state) => (source === 'touch' ? CLEARED : state),
  },
  {
    name: 'set a programmatic highlight',
    input: { type: 'set', id: 'component-b' },
    expected: () => ({ highlight: 'component-b', source: 'program' }),
  },
  {
    name: 'clear the programmatic highlight',
    input: { type: 'set', id: null },
    expected: () => CLEARED,
  },
  {
    name: 'reset',
    input: { type: 'reset' },
    expected: () => CLEARED,
  },
];

const TRANSITIONS = SOURCES.flatMap((source) => {
  const state: PointerState = { highlight: 'component-a', source };

  return CASES.map((transition) => ({
    ...transition,
    source,
    state,
    result: transition.expected(source, state),
  }));
});

describe('pointerReducer', () => {
  test('starts cleared', () => {
    expect(INITIAL_POINTER).toEqual(CLEARED);
  });

  test.each(TRANSITIONS)('$name from $source', ({ input, state, result }) => {
    expect(pointerReducer(state, input)).toEqual(result);
  });

  test('keeps a programmatic highlight when the mouse moves over empty space', () => {
    const state: PointerState = { highlight: 'component-a', source: 'program' };

    expect(pointerReducer(state, { type: 'move', hit: null })).toBe(state);
  });

  test('keeps a mouse highlight when the pointer moves outside the viewer', () => {
    const state: PointerState = { highlight: 'component-a', source: 'mouse' };

    expect(pointerReducer(state, { type: 'outsideTap' })).toBe(state);
  });
});
