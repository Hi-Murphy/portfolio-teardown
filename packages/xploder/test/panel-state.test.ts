import { describe, expect, test } from 'vitest';

import {
  CLOSED,
  consumesEscape,
  panelReducer,
  type PanelEvent,
  type PanelState,
} from '../src/panel/state';

const A = 'component-a';
const B = 'component-b';
const DETAIL_A: PanelState = { kind: 'detail', componentId: A };
const CASE_STUDY: PanelState = { kind: 'caseStudy' };

interface TransitionCase {
  readonly stateName: 'closed' | 'detail A' | 'caseStudy';
  readonly eventName: string;
  readonly state: PanelState;
  readonly event: PanelEvent;
  readonly expected: PanelState;
}

const TRANSITIONS: readonly TransitionCase[] = [
  {
    stateName: 'closed',
    eventName: 'slab(X)',
    state: CLOSED,
    event: { type: 'slab', hit: B },
    expected: { kind: 'detail', componentId: B },
  },
  {
    stateName: 'closed',
    eventName: 'slab(same)',
    state: CLOSED,
    event: { type: 'slab', hit: A },
    expected: DETAIL_A,
  },
  {
    stateName: 'closed',
    eventName: 'slab(null)',
    state: CLOSED,
    event: { type: 'slab', hit: null },
    expected: CLOSED,
  },
  {
    stateName: 'closed',
    eventName: 'outside',
    state: CLOSED,
    event: { type: 'outside' },
    expected: CLOSED,
  },
  {
    stateName: 'closed',
    eventName: 'escape',
    state: CLOSED,
    event: { type: 'escape' },
    expected: CLOSED,
  },
  {
    stateName: 'closed',
    eventName: 'closeControl',
    state: CLOSED,
    event: { type: 'closeControl' },
    expected: CLOSED,
  },
  {
    stateName: 'closed',
    eventName: 'toggleCaseStudy',
    state: CLOSED,
    event: { type: 'toggleCaseStudy' },
    expected: CASE_STUDY,
  },
  {
    stateName: 'closed',
    eventName: 'openCaseStudy',
    state: CLOSED,
    event: { type: 'openCaseStudy' },
    expected: CASE_STUDY,
  },
  {
    stateName: 'closed',
    eventName: 'openDetail',
    state: CLOSED,
    event: { type: 'openDetail', id: B },
    expected: { kind: 'detail', componentId: B },
  },
  {
    stateName: 'closed',
    eventName: 'reset',
    state: CLOSED,
    event: { type: 'reset' },
    expected: CLOSED,
  },
  {
    stateName: 'detail A',
    eventName: 'slab(X)',
    state: DETAIL_A,
    event: { type: 'slab', hit: B },
    expected: { kind: 'detail', componentId: B },
  },
  {
    stateName: 'detail A',
    eventName: 'slab(same)',
    state: DETAIL_A,
    event: { type: 'slab', hit: A },
    expected: CLOSED,
  },
  {
    stateName: 'detail A',
    eventName: 'slab(null)',
    state: DETAIL_A,
    event: { type: 'slab', hit: null },
    expected: CLOSED,
  },
  {
    stateName: 'detail A',
    eventName: 'outside',
    state: DETAIL_A,
    event: { type: 'outside' },
    expected: CLOSED,
  },
  {
    stateName: 'detail A',
    eventName: 'escape',
    state: DETAIL_A,
    event: { type: 'escape' },
    expected: CLOSED,
  },
  {
    stateName: 'detail A',
    eventName: 'closeControl',
    state: DETAIL_A,
    event: { type: 'closeControl' },
    expected: CLOSED,
  },
  {
    stateName: 'detail A',
    eventName: 'toggleCaseStudy',
    state: DETAIL_A,
    event: { type: 'toggleCaseStudy' },
    expected: CASE_STUDY,
  },
  {
    stateName: 'detail A',
    eventName: 'openCaseStudy',
    state: DETAIL_A,
    event: { type: 'openCaseStudy' },
    expected: CASE_STUDY,
  },
  {
    stateName: 'detail A',
    eventName: 'openDetail',
    state: DETAIL_A,
    event: { type: 'openDetail', id: B },
    expected: { kind: 'detail', componentId: B },
  },
  {
    stateName: 'detail A',
    eventName: 'reset',
    state: DETAIL_A,
    event: { type: 'reset' },
    expected: CLOSED,
  },
  {
    stateName: 'caseStudy',
    eventName: 'slab(X)',
    state: CASE_STUDY,
    event: { type: 'slab', hit: B },
    expected: { kind: 'detail', componentId: B },
  },
  {
    stateName: 'caseStudy',
    eventName: 'slab(same)',
    state: CASE_STUDY,
    event: { type: 'slab', hit: A },
    expected: DETAIL_A,
  },
  {
    stateName: 'caseStudy',
    eventName: 'slab(null)',
    state: CASE_STUDY,
    event: { type: 'slab', hit: null },
    expected: CLOSED,
  },
  {
    stateName: 'caseStudy',
    eventName: 'outside',
    state: CASE_STUDY,
    event: { type: 'outside' },
    expected: CLOSED,
  },
  {
    stateName: 'caseStudy',
    eventName: 'escape',
    state: CASE_STUDY,
    event: { type: 'escape' },
    expected: CLOSED,
  },
  {
    stateName: 'caseStudy',
    eventName: 'closeControl',
    state: CASE_STUDY,
    event: { type: 'closeControl' },
    expected: CLOSED,
  },
  {
    stateName: 'caseStudy',
    eventName: 'toggleCaseStudy',
    state: CASE_STUDY,
    event: { type: 'toggleCaseStudy' },
    expected: CLOSED,
  },
  {
    stateName: 'caseStudy',
    eventName: 'openCaseStudy',
    state: CASE_STUDY,
    event: { type: 'openCaseStudy' },
    expected: CASE_STUDY,
  },
  {
    stateName: 'caseStudy',
    eventName: 'openDetail',
    state: CASE_STUDY,
    event: { type: 'openDetail', id: B },
    expected: { kind: 'detail', componentId: B },
  },
  {
    stateName: 'caseStudy',
    eventName: 'reset',
    state: CASE_STUDY,
    event: { type: 'reset' },
    expected: CLOSED,
  },
];

describe('panelReducer', () => {
  test.each(TRANSITIONS)('$stateName + $eventName', ({ state, event, expected }) => {
    const result = panelReducer(state, event);

    expect(result).toEqual(expected);
    if (expected === state) expect(result).toBe(state);
  });

  test('openDetail for the current component is a no-op', () => {
    expect(panelReducer(DETAIL_A, { type: 'openDetail', id: A })).toBe(DETAIL_A);
  });
});

describe('consumesEscape', () => {
  test.each([
    { state: CLOSED, expected: false },
    { state: DETAIL_A, expected: true },
    { state: CASE_STUDY, expected: true },
  ])('$state.kind returns $expected', ({ state, expected }) => {
    expect(consumesEscape(state)).toBe(expected);
  });
});

describe('panel state sequence', () => {
  test('opens, switches, closes on the same slab, and toggles the case study', () => {
    let state = CLOSED;

    state = panelReducer(state, { type: 'slab', hit: A });
    expect(state).toEqual(DETAIL_A);

    state = panelReducer(state, { type: 'slab', hit: B });
    expect(state).toEqual({ kind: 'detail', componentId: B });

    state = panelReducer(state, { type: 'slab', hit: B });
    expect(state).toEqual(CLOSED);

    state = panelReducer(state, { type: 'slab', hit: A });
    expect(state).toEqual(DETAIL_A);

    state = panelReducer(state, { type: 'escape' });
    expect(state).toEqual(CLOSED);

    state = panelReducer(state, { type: 'toggleCaseStudy' });
    expect(state).toEqual(CASE_STUDY);

    state = panelReducer(state, { type: 'toggleCaseStudy' });
    expect(state).toEqual(CLOSED);

    const outside = panelReducer(state, { type: 'outside' });
    expect(outside).toEqual(CLOSED);
    expect(outside).toBe(state);
  });
});
