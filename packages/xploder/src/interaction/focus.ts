// T005 will re-point this type at './tour'.
export type TourStatus = 'idle' | 'playing' | 'paused' | 'ended';

export interface FocusState {
  readonly layerId: string | null;
}

export type FocusAction =
  { type: 'toggle'; layerId: string } | { type: 'release' } | { type: 'reset' };

export function focusReducer(
  state: FocusState,
  action: FocusAction,
  layerIds: readonly string[],
): FocusState {
  switch (action.type) {
    case 'toggle':
      if (!layerIds.includes(action.layerId)) return state;
      return { layerId: state.layerId === action.layerId ? null : action.layerId };
    case 'release':
    case 'reset':
      return state.layerId === null ? state : { layerId: null };
  }
}

export function escapeTarget(
  tour: TourStatus,
  focus: FocusState,
): 'stopTour' | 'releaseFocus' | null {
  if (tour !== 'idle') return 'stopTour';
  return focus.layerId === null ? null : 'releaseFocus';
}
