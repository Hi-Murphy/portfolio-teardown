import { VIEW } from '../layout';
import type { MotionTokens } from '../motion';
import { easeFromToken } from '../motion/ease';

export type RigAction =
  | { type: 'rotateLeft' }
  | { type: 'rotateRight' }
  | { type: 'zoomIn' }
  | { type: 'zoomOut' }
  | { type: 'zoomReset' };

export const RIG_ACTION_TYPES = [
  'rotateLeft',
  'rotateRight',
  'zoomIn',
  'zoomOut',
  'zoomReset',
] as const satisfies readonly RigAction['type'][];

export interface RigState {
  readonly step: 0 | 1 | 2 | 3;
  readonly turns: number;
  readonly zoomFactor: number;
}

export const ZOOM_BOUNDS = {
  min: 1,
  max: 3,
  step: 1.25,
} as const;

export const INITIAL_RIG: RigState = {
  step: 0,
  turns: 0,
  zoomFactor: ZOOM_BOUNDS.min,
};

function stepOf(turns: number): RigState['step'] {
  return (((turns % 4) + 4) % 4) as RigState['step'];
}

export function cameraReducer(state: RigState, action: RigAction): RigState {
  switch (action.type) {
    case 'rotateLeft':
    case 'rotateRight': {
      const turns = state.turns + (action.type === 'rotateRight' ? 1 : -1);

      return { ...state, turns, step: stepOf(turns) };
    }
    case 'zoomIn':
      return {
        ...state,
        zoomFactor: Math.min(ZOOM_BOUNDS.max, state.zoomFactor * ZOOM_BOUNDS.step),
      };
    case 'zoomOut':
      return {
        ...state,
        zoomFactor: Math.max(ZOOM_BOUNDS.min, state.zoomFactor / ZOOM_BOUNDS.step),
      };
    case 'zoomReset':
      return { ...state, zoomFactor: ZOOM_BOUNDS.min };
  }
}

export interface ZoomAvailability {
  readonly zoomIn: boolean;
  readonly zoomOut: boolean;
  readonly zoomReset: boolean;
}

// A zoom control is available exactly when pressing it would change the zoom.
export function zoomAvailability(state: RigState): ZoomAvailability {
  return {
    zoomIn: state.zoomFactor < ZOOM_BOUNDS.max,
    zoomOut: state.zoomFactor > ZOOM_BOUNDS.min,
    zoomReset: state.zoomFactor !== ZOOM_BOUNDS.min,
  };
}

export function azimuthOf(turns: number): number {
  return VIEW.baseAzimuth + turns * VIEW.snap;
}

export function keyToAction(key: string): RigAction | null {
  switch (key) {
    case 'ArrowLeft':
      return { type: 'rotateLeft' };
    case 'ArrowRight':
      return { type: 'rotateRight' };
    case '+':
    case '=':
      return { type: 'zoomIn' };
    case '-':
    case '_':
      return { type: 'zoomOut' };
    case '0':
      return { type: 'zoomReset' };
    default:
      return null;
  }
}

export interface TurnTween {
  setTarget(azimuth: number, now: number): void;
  sample(now: number): { azimuth: number; settled: boolean };
}

export function createTurnTween(tokens: MotionTokens): TurnTween {
  const ease = easeFromToken(tokens.easings.implode);
  const duration = tokens.durations.implode;
  let displayed = VIEW.baseAzimuth;
  let target = VIEW.baseAzimuth;
  let from = VIEW.baseAzimuth;
  let start = 0;
  let hasTarget = false;
  let settled = true;

  function sample(now: number): { azimuth: number; settled: boolean } {
    if (!hasTarget || settled || duration <= 0 || now - start >= duration) {
      displayed = target;
      settled = true;
      return { azimuth: displayed, settled: true };
    }

    const progress = Math.min(1, Math.max(0, (now - start) / duration));

    displayed = from + (target - from) * ease(progress);
    settled = false;

    return { azimuth: displayed, settled: false };
  }

  function setTarget(azimuth: number, now: number): void {
    if (!hasTarget) {
      displayed = azimuth;
      target = azimuth;
      from = azimuth;
      start = now;
      hasTarget = true;
      settled = true;
      return;
    }

    displayed = sample(now).azimuth;
    from = displayed;
    target = azimuth;
    start = now;
    settled = false;
  }

  return { setTarget, sample };
}
