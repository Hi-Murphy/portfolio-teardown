import type { MotionTokens } from '../motion';

type Dock = 'left' | 'right' | 'top' | 'bottom';

const MILLISECONDS_PER_SECOND = 1_000;

function milliseconds(seconds: number): number {
  return seconds * MILLISECONDS_PER_SECOND;
}

function offsetTransform(dock: Dock, distance: number): string {
  switch (dock) {
    case 'left':
      return `translate(-${distance}px, 0px)`;
    case 'right':
      return `translate(${distance}px, 0px)`;
    case 'top':
      return `translate(0px, -${distance}px)`;
    case 'bottom':
      return `translate(0px, ${distance}px)`;
  }
}

export function panelMotion(
  tokens: MotionTokens,
  dock: Dock,
  phase: 'enter' | 'exit',
): { keyframes: Keyframe[]; options: KeyframeAnimationOptions } | null {
  const enter = phase === 'enter';
  const duration = milliseconds(enter ? tokens.durations.panelEnter : tokens.durations.panelExit);

  if (duration <= 0) return null;

  const offset: Keyframe = {
    opacity: 0,
    transform: offsetTransform(dock, tokens.distances.panelOffset),
  };
  const settled: Keyframe = { opacity: 1, transform: 'none' };

  return {
    keyframes: enter ? [offset, settled] : [settled, offset],
    options: {
      duration,
      easing: (enter ? tokens.easings.panelEnter : tokens.easings.panelExit).css,
      fill: enter ? 'backwards' : 'both',
    },
  };
}
