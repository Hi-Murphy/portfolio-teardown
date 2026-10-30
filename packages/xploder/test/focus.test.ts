import { describe, expect, test } from 'vitest';

import { cameraReducer, INITIAL_RIG, type RigAction, type RigState } from '../src/engine/camera';
import {
  escapeTarget,
  focusReducer,
  type FocusAction,
  type FocusState,
  type TourStatus,
} from '../src/interaction/focus';

const LAYER_IDS = ['client', 'edge', 'services'] as const;
const TOUR_STATUSES: readonly TourStatus[] = ['idle', 'playing', 'paused', 'ended'];
const UNFOCUSED: FocusState = { layerId: null };

function mulberry32(seed: number): () => number {
  let state = seed >>> 0;

  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;

    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);

    return ((value ^ (value >>> 14)) >>> 0) / 4_294_967_296;
  };
}

function referenceFocus(state: FocusState, action: FocusAction): FocusState {
  if (action.type !== 'toggle') return UNFOCUSED;
  if (!LAYER_IDS.includes(action.layerId as (typeof LAYER_IDS)[number])) return state;
  return { layerId: state.layerId === action.layerId ? null : action.layerId };
}

type PropertyAction =
  | { kind: 'focus'; action: FocusAction }
  | { kind: 'camera'; action: RigAction }
  | { kind: 'target'; action: 'explode' | 'implode' | 'toggle' };

function randomPropertyAction(random: () => number): PropertyAction {
  const index = Math.floor(random() * 13);

  switch (index) {
    case 0:
      return { kind: 'focus', action: { type: 'toggle', layerId: 'client' } };
    case 1:
      return { kind: 'focus', action: { type: 'toggle', layerId: 'edge' } };
    case 2:
      return { kind: 'focus', action: { type: 'toggle', layerId: 'services' } };
    case 3:
      return { kind: 'focus', action: { type: 'toggle', layerId: 'missing' } };
    case 4:
      return { kind: 'focus', action: { type: 'release' } };
    case 5:
      return { kind: 'focus', action: { type: 'reset' } };
    case 6:
      return { kind: 'camera', action: { type: 'rotateLeft' } };
    case 7:
      return { kind: 'camera', action: { type: 'rotateRight' } };
    case 8:
      return { kind: 'camera', action: { type: 'zoomIn' } };
    case 9:
      return { kind: 'camera', action: { type: 'zoomOut' } };
    case 10:
      return { kind: 'target', action: 'explode' };
    case 11:
      return { kind: 'target', action: 'implode' };
    default:
      return { kind: 'target', action: 'toggle' };
  }
}

describe('focusReducer', () => {
  test('toggles focus on and off', () => {
    const focused = focusReducer(UNFOCUSED, { type: 'toggle', layerId: 'edge' }, LAYER_IDS);

    expect(focused).toEqual({ layerId: 'edge' });
    expect(focusReducer(focused, { type: 'toggle', layerId: 'edge' }, LAYER_IDS)).toEqual(
      UNFOCUSED,
    );
  });

  test('switches directly to another layer', () => {
    const state: FocusState = { layerId: 'client' };

    expect(focusReducer(state, { type: 'toggle', layerId: 'services' }, LAYER_IDS)).toEqual({
      layerId: 'services',
    });
  });

  test('ignores unknown layers', () => {
    const state: FocusState = { layerId: 'client' };

    expect(focusReducer(state, { type: 'toggle', layerId: 'missing' }, LAYER_IDS)).toBe(state);
  });

  test('releases and resets focus', () => {
    const state: FocusState = { layerId: 'edge' };

    expect(focusReducer(state, { type: 'release' }, LAYER_IDS)).toEqual(UNFOCUSED);
    expect(focusReducer(state, { type: 'reset' }, LAYER_IDS)).toEqual(UNFOCUSED);
  });
});

describe('escapeTarget', () => {
  const cases = TOUR_STATUSES.flatMap((tour) =>
    [UNFOCUSED, { layerId: 'edge' }].map((focus) => ({
      tour,
      focus,
      result: tour !== 'idle' ? 'stopTour' : focus.layerId === null ? null : 'releaseFocus',
    })),
  );

  test.each(cases)('$tour tour with focus $focus.layerId', ({ tour, focus, result }) => {
    expect(escapeTarget(tour, focus)).toBe(result);
  });
});

describe('focus independence', () => {
  test('matches the focus-only reference model through 2,000 x 50 mixed actions', () => {
    const random = mulberry32(0x50c05);
    let focusActions = 0;
    let viewerActions = 0;
    let changedCameraStates = 0;
    let changedTargets = 0;

    for (let sequence = 0; sequence < 2_000; sequence += 1) {
      let focus: FocusState = UNFOCUSED;
      let reference: FocusState = UNFOCUSED;
      let rig: RigState = INITIAL_RIG;
      let target: 'imploded' | 'exploded' = 'imploded';

      for (let step = 0; step < 50; step += 1) {
        const action = randomPropertyAction(random);

        if (action.kind === 'focus') {
          focus = focusReducer(focus, action.action, LAYER_IDS);
          reference = referenceFocus(reference, action.action);
          focusActions += 1;
        } else {
          viewerActions += 1;

          if (action.kind === 'camera') {
            const next = cameraReducer(rig, action.action);

            if (next !== rig) changedCameraStates += 1;
            rig = next;
          } else {
            const next: 'imploded' | 'exploded' =
              action.action === 'toggle'
                ? target === 'imploded'
                  ? 'exploded'
                  : 'imploded'
                : action.action === 'explode'
                  ? 'exploded'
                  : 'imploded';

            if (next !== target) changedTargets += 1;
            target = next;
          }
        }

        expect(focus, `sequence ${sequence}, step ${step}`).toEqual(reference);
      }
    }

    expect(focusActions).toBeGreaterThan(0);
    expect(viewerActions).toBeGreaterThan(0);
    expect(changedCameraStates).toBeGreaterThan(0);
    expect(changedTargets).toBeGreaterThan(0);
  });
});
