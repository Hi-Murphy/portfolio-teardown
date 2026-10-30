import { useCallback, useEffect, useMemo, useReducer, useState, type KeyboardEvent } from 'react';

import {
  azimuthOf,
  cameraReducer,
  INITIAL_RIG,
  keyToAction,
  zoomAvailability,
  type RigAction,
  type RigState,
  type ZoomAvailability,
} from '../engine/camera';
import { escapeTarget, focusReducer, type FocusAction } from '../interaction/focus';
import {
  INITIAL_POINTER,
  pointerReducer,
  type PointerInput,
  type PointerState,
} from '../interaction/pointer';
import {
  initialTour,
  positionAt,
  showFlowSelector,
  tourReducer,
  type TourAction,
  type TourFlow,
  type TourPosition,
  type TourStatus as InteractionTourStatus,
  type TourState,
} from '../interaction/tour';
import type { LayoutInput } from '../layout';
import { motion } from '../motion';
import { useTourClock } from './useTourClock';
import { usePrefersReducedMotion } from './useReducedMotion';

export type TeardownTarget = 'imploded' | 'exploded';
export type TourStatus = InteractionTourStatus;

export interface ViewerProject extends LayoutInput {
  readonly meta: { readonly slug: string };
  readonly layers: readonly {
    readonly id: string;
    readonly name?: string;
    readonly components: readonly {
      readonly id: string;
      readonly name?: string;
      readonly summary?: string;
    }[];
  }[];
  readonly flows?: readonly {
    readonly id: string;
    readonly label?: string;
    readonly description?: string;
    readonly path: readonly string[];
  }[];
}

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

export interface TeardownViewerInteractionActions {
  highlight(id: string | null): void;
  toggleFocus(layerId: string): void;
  releaseFocus(): void;
  selectFlow(flowId: string): void;
  play(): void;
  pause(): void;
  stop(): void;
  step(): void;
}

export interface TeardownViewerHandle {
  readonly target: TeardownTarget;
  readonly rig: RigState;
  /** Target azimuth in degrees, normalised to [0, 360). */
  readonly azimuthDegrees: number;
  /** Which zoom controls would change the zoom right now (disable the others). */
  readonly can: ZoomAvailability;
  readonly highlight: string | null;
  readonly focus: { readonly layerId: string | null; readonly suspended: boolean };
  readonly tour: {
    readonly flows: readonly { readonly id: string; readonly label: string }[];
    readonly flowId: string | null;
    readonly status: TourStatus;
    readonly step: number;
    readonly total: number;
    readonly showFlowSelector: boolean;
  };
  readonly actions: TeardownViewerActions & TeardownViewerInteractionActions;
  readonly onKeyDown: (event: KeyboardEvent) => void;
  readonly onPointerInput: (input: PointerInput) => void;
}

interface ViewerMetadata {
  readonly project: ViewerProject | undefined;
  readonly pointer: PointerState;
  readonly position: TourPosition;
}

const EMPTY_FLOWS: readonly TourFlow[] = [];
const EMPTY_LAYER_IDS: readonly string[] = [];
const EMPTY_POSITION: TourPosition = {
  status: 'idle',
  step: -1,
  total: 0,
  componentId: null,
  stepStartedAt: null,
  nextBoundary: null,
};
const VIEWER_METADATA = new WeakMap<TeardownViewerHandle, ViewerMetadata>();

const DEFAULT_METADATA: ViewerMetadata = {
  project: undefined,
  pointer: INITIAL_POINTER,
  position: EMPTY_POSITION,
};

export function viewerMetadataOf(viewer: TeardownViewerHandle): ViewerMetadata {
  return VIEWER_METADATA.get(viewer) ?? DEFAULT_METADATA;
}

function defaultNow(): number {
  return performance.now() / 1000;
}

export function useTeardownViewer(
  opts: { initial?: TeardownTarget; project?: ViewerProject; now?: () => number } = {},
): TeardownViewerHandle {
  const prefersReducedMotion = usePrefersReducedMotion();
  const project = opts.project;
  const projectSlug = project?.meta.slug ?? null;
  const flows = project?.flows ?? EMPTY_FLOWS;
  const now = opts.now ?? defaultNow;
  const [target, setTarget] = useState<TeardownTarget>(
    () => opts.initial ?? (prefersReducedMotion ? 'exploded' : 'imploded'),
  );
  const [rig, dispatchRig] = useReducer(cameraReducer, INITIAL_RIG);
  const [pointer, dispatchPointer] = useReducer(pointerReducer, INITIAL_POINTER);
  const componentIds = useMemo(
    () =>
      new Set(
        project?.layers.flatMap((layer) => layer.components.map((component) => component.id)),
      ),
    [project],
  );
  const layerIds = useMemo(
    () => project?.layers.map((layer) => layer.id) ?? EMPTY_LAYER_IDS,
    [project],
  );
  const [focus, dispatchFocus] = useReducer(
    (state: { readonly layerId: string | null }, action: FocusAction) =>
      focusReducer(state, action, layerIds),
    { layerId: null },
  );
  const [tour, dispatchTour] = useReducer(
    (state: TourState, action: TourAction) =>
      tourReducer(state, action, flows, motion.durations.tourBeat),
    initialTour(flows),
  );
  const [activeSlug, setActiveSlug] = useState(projectSlug);

  if (activeSlug !== projectSlug) {
    setActiveSlug(projectSlug);
    dispatchPointer({ type: 'reset' });
    dispatchFocus({ type: 'reset' });
    dispatchTour({ type: 'reset', flows });
  }

  useTourClock(tour, flows, now, dispatchTour);

  const dispatchAction = useCallback((action: RigAction) => dispatchRig(action), []);

  const actions = useMemo<TeardownViewerActions & TeardownViewerInteractionActions>(
    () => ({
      toggle: () => setTarget((current) => (current === 'imploded' ? 'exploded' : 'imploded')),
      explode: () => setTarget('exploded'),
      implode: () => setTarget('imploded'),
      rotateLeft: () => dispatchAction({ type: 'rotateLeft' }),
      rotateRight: () => dispatchAction({ type: 'rotateRight' }),
      zoomIn: () => dispatchAction({ type: 'zoomIn' }),
      zoomOut: () => dispatchAction({ type: 'zoomOut' }),
      zoomReset: () => dispatchAction({ type: 'zoomReset' }),
      highlight: (id) => {
        if (id !== null && !componentIds.has(id)) return;
        dispatchPointer({ type: 'set', id });
      },
      toggleFocus: (layerId) => dispatchFocus({ type: 'toggle', layerId }),
      releaseFocus: () => dispatchFocus({ type: 'release' }),
      selectFlow: (flowId) => dispatchTour({ type: 'selectFlow', flowId, now: now() }),
      play: () => {
        setTarget((current) => (current === 'imploded' ? 'exploded' : current));
        dispatchTour({ type: 'play', now: now() });
      },
      pause: () => dispatchTour({ type: 'pause', now: now() }),
      stop: () => dispatchTour({ type: 'stop', now: now() }),
      step: () => dispatchTour({ type: 'step', now: now() }),
    }),
    [componentIds, dispatchAction, dispatchFocus, dispatchPointer, dispatchTour, now],
  );

  const onPointerInput = useCallback(
    (input: PointerInput) => dispatchPointer(input),
    [dispatchPointer],
  );

  const onKeyDown = useCallback(
    (event: KeyboardEvent) => {
      const action = keyToAction(event.key);

      if (action === null) return;

      event.preventDefault();
      dispatchRig(action);
    },
    [dispatchRig],
  );

  const position = positionAt(tour, now(), flows, motion.durations.tourBeat);
  const escape = escapeTarget(position.status, focus);

  useEffect(() => {
    if (typeof window === 'undefined' || escape === null) return;

    const onEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key !== 'Escape' || event.defaultPrevented) return;

      event.preventDefault();

      if (escape === 'stopTour') {
        dispatchTour({ type: 'stop', now: now() });
      } else {
        dispatchFocus({ type: 'release' });
      }
    };

    window.addEventListener('keydown', onEscape);

    return () => window.removeEventListener('keydown', onEscape);
  }, [dispatchFocus, dispatchTour, escape, now]);

  const azimuthDegrees = useMemo(() => {
    const degrees = (azimuthOf(rig.turns) * 180) / Math.PI;

    return Number((((degrees % 360) + 360) % 360).toFixed(3));
  }, [rig.turns]);

  const can = useMemo(() => zoomAvailability(rig), [rig]);
  const tourFlows = useMemo(
    () => project?.flows?.map((flow) => ({ id: flow.id, label: flow.label ?? flow.id })) ?? [],
    [project],
  );
  const suspended = position.status !== 'idle';

  const handle = useMemo<TeardownViewerHandle>(
    () => ({
      target,
      rig,
      azimuthDegrees,
      can,
      highlight: pointer.highlight,
      focus: { layerId: focus.layerId, suspended },
      tour: {
        flows: tourFlows,
        flowId: tour.flowId,
        status: position.status,
        step: position.step,
        total: position.total,
        showFlowSelector: showFlowSelector(flows),
      },
      actions,
      onKeyDown,
      onPointerInput,
    }),
    [
      actions,
      azimuthDegrees,
      can,
      focus.layerId,
      flows,
      onKeyDown,
      onPointerInput,
      pointer.highlight,
      position.status,
      position.step,
      position.total,
      rig,
      suspended,
      target,
      tour.flowId,
      tourFlows,
    ],
  );

  VIEWER_METADATA.set(handle, { project, pointer, position });

  return handle;
}
