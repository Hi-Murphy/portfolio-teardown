export type TourStatus = 'idle' | 'playing' | 'paused' | 'ended';

export interface TourFlow {
  readonly id: string;
  readonly path: readonly string[];
}

export interface TourState {
  readonly flowId: string | null;
  readonly status: TourStatus;
  readonly step: number;
  readonly anchor: number;
}

export type TourAction =
  | { type: 'play' | 'pause' | 'stop' | 'step' | 'tick'; now: number }
  | { type: 'selectFlow'; flowId: string; now: number }
  | { type: 'reset'; flows: readonly TourFlow[] };

export interface TourPosition {
  readonly status: TourStatus;
  readonly step: number;
  readonly total: number;
  readonly componentId: string | null;
  readonly stepStartedAt: number | null;
  readonly nextBoundary: number | null;
}

export function initialTour(flows: readonly TourFlow[]): TourState {
  return { flowId: flows[0]?.id ?? null, status: 'idle', step: -1, anchor: 0 };
}

function selectedFlow(state: TourState, flows: readonly TourFlow[]): TourFlow | undefined {
  return state.flowId === null ? undefined : flows.find((flow) => flow.id === state.flowId);
}

function wholeBeats(elapsed: number, beat: number): number {
  const quotient = elapsed / beat;
  const nearest = Math.round(quotient);
  const tolerance = Number.EPSILON * Math.max(1, Math.abs(quotient));

  return Math.abs(quotient - nearest) <= tolerance ? nearest : Math.floor(quotient);
}

function foldElapsed(
  state: TourState,
  now: number,
  flows: readonly TourFlow[],
  beat: number,
): TourState {
  if (state.status !== 'playing' || !(beat > 0)) return state;

  const flow = selectedFlow(state, flows);

  if (flow === undefined || flow.path.length === 0) return state;

  const elapsedBeats = wholeBeats(now - state.anchor, beat);

  if (elapsedBeats <= 0) return state;

  const nextStep = state.step + elapsedBeats;

  if (nextStep < flow.path.length) {
    return {
      flowId: state.flowId,
      status: 'playing',
      step: nextStep,
      anchor: state.anchor + elapsedBeats * beat,
    };
  }

  const lastStep = flow.path.length - 1;

  return {
    flowId: state.flowId,
    status: 'ended',
    step: lastStep,
    anchor: state.anchor + (lastStep - state.step) * beat,
  };
}

export function tourReducer(
  state: TourState,
  action: TourAction,
  flows: readonly TourFlow[],
  beat: number,
): TourState {
  if (action.type === 'reset') return initialTour(action.flows);

  const folded = foldElapsed(state, action.now, flows, beat);

  switch (action.type) {
    case 'play': {
      const flow = selectedFlow(folded, flows);

      if (flow === undefined || flow.path.length === 0) return folded;

      switch (folded.status) {
        case 'idle':
        case 'ended':
          return { ...folded, status: 'playing', step: 0, anchor: action.now };
        case 'paused':
          return { ...folded, status: 'playing', anchor: action.now - folded.anchor };
        case 'playing':
          return folded;
      }
      break;
    }
    case 'pause':
      return folded.status === 'playing'
        ? { ...folded, status: 'paused', anchor: action.now - folded.anchor }
        : folded;
    case 'stop':
      return folded.status === 'idle'
        ? folded
        : { flowId: folded.flowId, status: 'idle', step: -1, anchor: 0 };
    case 'step': {
      const flow = selectedFlow(folded, flows);

      if (flow === undefined || flow.path.length === 0) return folded;

      if (folded.status === 'idle' || folded.status === 'ended') {
        return { ...folded, status: 'paused', step: 0, anchor: 0 };
      }

      const nextStep = folded.step + 1;

      return nextStep < flow.path.length
        ? { ...folded, status: 'paused', step: nextStep, anchor: 0 }
        : { ...folded, status: 'ended', anchor: action.now };
    }
    case 'selectFlow': {
      if (action.flowId === folded.flowId) return folded;
      if (!flows.some((flow) => flow.id === action.flowId)) return folded;
      return { flowId: action.flowId, status: 'idle', step: -1, anchor: 0 };
    }
    case 'tick':
      return folded;
  }
}

export function positionAt(
  state: TourState,
  now: number,
  flows: readonly TourFlow[],
  beat: number,
): TourPosition {
  const current = foldElapsed(state, now, flows, beat);
  const flow = selectedFlow(current, flows);
  const total = flow?.path.length ?? 0;

  if (current.status === 'idle' || flow === undefined) {
    return {
      status: current.status,
      step: current.step,
      total,
      componentId: null,
      stepStartedAt: null,
      nextBoundary: null,
    };
  }

  const stepStartedAt =
    current.status === 'playing'
      ? current.anchor
      : current.status === 'paused'
        ? now - current.anchor
        : current.anchor;

  return {
    status: current.status,
    step: current.step,
    total,
    componentId: flow.path[current.step] ?? null,
    stepStartedAt,
    nextBoundary: current.status === 'playing' ? current.anchor + beat : null,
  };
}

export function showFlowSelector(flows: readonly TourFlow[]): boolean {
  return flows.length > 1;
}
