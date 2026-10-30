import type { ProjectLayout } from '../layout';
import type { MotionTokens } from '../motion';
import { easeFromToken } from '../motion/ease';

export type Phase = 'imploded' | 'exploding' | 'exploded' | 'imploding';

export interface ExplodeTimeline {
  readonly count: number;
  readonly target: 0 | 1;
  setTarget(target: 0 | 1, now: number): void;
  sample(now: number, out: Float32Array): boolean;
  phase(now: number): Phase;
}

type Ease = (t: number) => number;

interface TimelineInstance {
  readonly layerIndex: number;
  readonly slot: number;
  from: number;
  start: number;
  delay: number;
  duration: number;
  end: number;
  ease: Ease;
}

function valueAt(instance: TimelineInstance, now: number, target: 0 | 1): number {
  if (instance.duration <= 0 || now >= instance.end) return target;

  const progress = Math.min(
    1,
    Math.max(0, (now - instance.start - instance.delay) / instance.duration),
  );

  return instance.from + (target - instance.from) * instance.ease(progress);
}

export function createExplodeTimeline(
  layout: ProjectLayout,
  tokens: MotionTokens,
  initial: 0 | 1,
): ExplodeTimeline {
  const layerCount = layout.layers.length;
  const count = layerCount + layout.components.length;
  const explodeEase = easeFromToken(tokens.easings.explode);
  const implodeEase = easeFromToken(tokens.easings.implode);
  const initialEase = initial === 1 ? explodeEase : implodeEase;
  const origin = 0;
  const instances: TimelineInstance[] = [];

  for (let layerIndex = 0; layerIndex < layerCount; layerIndex += 1) {
    instances.push({
      layerIndex,
      slot: 0,
      from: initial,
      start: origin,
      delay: origin,
      duration: origin,
      end: origin,
      ease: initialEase,
    });
  }

  for (const component of layout.components) {
    instances.push({
      layerIndex: component.layerIndex,
      slot: component.slot,
      from: initial,
      start: origin,
      delay: origin,
      duration: origin,
      end: origin,
      ease: initialEase,
    });
  }

  let currentTarget = initial;

  function setTarget(target: 0 | 1, now: number): void {
    const previousTarget = currentTarget;
    const targetEase = target === 1 ? explodeEase : implodeEase;

    for (const instance of instances) {
      const from = valueAt(instance, now, previousTarget);
      const distance = Math.abs(target - from);
      const stagger =
        target === 1
          ? instance.layerIndex * tokens.staggers.explodeLayer +
            instance.slot * tokens.staggers.explodeComponent
          : (layerCount - 1 - instance.layerIndex) * tokens.staggers.implodeLayer;
      const delay = distance * stagger;
      const duration =
        distance * (target === 1 ? tokens.durations.explode : tokens.durations.implode);

      instance.from = from;
      instance.start = now;
      instance.delay = delay;
      instance.duration = duration;
      instance.end = now + delay + duration;
      instance.ease = targetEase;
    }

    currentTarget = target;
  }

  function sample(now: number, out: Float32Array): boolean {
    let settled = true;
    let index = 0;

    for (const instance of instances) {
      const value = valueAt(instance, now, currentTarget);

      out[index] = value;
      if (value !== currentTarget) settled = false;
      index += 1;
    }

    return settled;
  }

  function phase(now: number): Phase {
    for (const instance of instances) {
      if (valueAt(instance, now, currentTarget) !== currentTarget) {
        return currentTarget === 1 ? 'exploding' : 'imploding';
      }
    }

    return currentTarget === 1 ? 'exploded' : 'imploded';
  }

  return {
    get count(): number {
      return count;
    },
    get target(): 0 | 1 {
      return currentTarget;
    },
    setTarget,
    sample,
    phase,
  };
}
