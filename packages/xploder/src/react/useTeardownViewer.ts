import { useCallback, useMemo, useReducer, useState, type KeyboardEvent } from 'react';

import {
  cameraReducer,
  INITIAL_RIG,
  keyToAction,
  type RigAction,
  type RigState,
} from '../engine/camera';
import { usePrefersReducedMotion } from './useReducedMotion';

export type TeardownTarget = 'imploded' | 'exploded';

export interface TeardownViewerActions {
  toggle(): void;
  explode(): void;
  implode(): void;
  rotateLeft(): void;
  rotateRight(): void;
  zoomIn(): void;
  zoomOut(): void;
  zoomReset(): void;
}

export interface TeardownViewerHandle {
  readonly target: TeardownTarget;
  readonly rig: RigState;
  readonly actions: TeardownViewerActions;
  readonly onKeyDown: (event: KeyboardEvent) => void;
}

export function useTeardownViewer(opts: { initial?: TeardownTarget } = {}): TeardownViewerHandle {
  const prefersReducedMotion = usePrefersReducedMotion();
  const [target, setTarget] = useState<TeardownTarget>(
    () => opts.initial ?? (prefersReducedMotion ? 'exploded' : 'imploded'),
  );
  const [rig, dispatch] = useReducer(cameraReducer, INITIAL_RIG);

  const dispatchAction = useCallback((action: RigAction) => dispatch(action), []);

  const actions = useMemo<TeardownViewerActions>(
    () => ({
      toggle: () => setTarget((current) => (current === 'imploded' ? 'exploded' : 'imploded')),
      explode: () => setTarget('exploded'),
      implode: () => setTarget('imploded'),
      rotateLeft: () => dispatchAction({ type: 'rotateLeft' }),
      rotateRight: () => dispatchAction({ type: 'rotateRight' }),
      zoomIn: () => dispatchAction({ type: 'zoomIn' }),
      zoomOut: () => dispatchAction({ type: 'zoomOut' }),
      zoomReset: () => dispatchAction({ type: 'zoomReset' }),
    }),
    [dispatchAction],
  );

  const onKeyDown = useCallback(
    (event: KeyboardEvent) => {
      const action = keyToAction(event.key);

      if (action === null) return;

      event.preventDefault();
      dispatch(action);
    },
    [dispatch],
  );

  return useMemo(() => ({ target, rig, actions, onKeyDown }), [target, rig, actions, onKeyDown]);
}
