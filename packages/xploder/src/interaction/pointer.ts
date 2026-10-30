export type PointerSource = 'none' | 'mouse' | 'touch' | 'program';

export interface PointerState {
  readonly highlight: string | null;
  readonly source: PointerSource;
}

export type PointerInput =
  | { type: 'move'; hit: string | null }
  | { type: 'leave' }
  | { type: 'tap'; hit: string | null }
  | { type: 'outsideTap' }
  | { type: 'set'; id: string | null }
  | { type: 'reset' };

export const INITIAL_POINTER: PointerState = { highlight: null, source: 'none' };

function clear(state: PointerState): PointerState {
  return state.highlight === null && state.source === 'none' ? state : INITIAL_POINTER;
}

export function pointerReducer(state: PointerState, input: PointerInput): PointerState {
  switch (input.type) {
    case 'move':
      if (input.hit !== null) return { highlight: input.hit, source: 'mouse' };
      return state.source === 'mouse' ? clear(state) : state;
    case 'leave':
      return state.source === 'mouse' ? clear(state) : state;
    case 'tap':
      if (input.hit === null || input.hit === state.highlight) return clear(state);
      return { highlight: input.hit, source: 'touch' };
    case 'outsideTap':
      return state.source === 'touch' ? clear(state) : state;
    case 'set':
      return input.id === null ? clear(state) : { highlight: input.id, source: 'program' };
    case 'reset':
      return clear(state);
  }
}
