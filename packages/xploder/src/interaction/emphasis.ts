import type { ProjectLayout } from '../layout';
import type { MotionEasing, MotionTokens } from '../motion';
import { easeFromToken } from '../motion/ease';

export interface ChannelTiming {
  readonly rise: number;
  readonly fall: number;
  readonly ease: (t: number) => number;
}

export interface Channels {
  readonly count: number;
  setTargets(targets: ArrayLike<number>, now: number): void;
  sample(now: number, out: Float32Array): boolean;
}

interface Channel {
  from: number;
  target: number;
  start: number;
  span: number;
}

function channelValue(channel: Channel, now: number, ease: (t: number) => number): number {
  if (channel.span <= 0 || now >= channel.start + channel.span) return channel.target;

  const progress = Math.min(1, Math.max(0, (now - channel.start) / channel.span));

  return channel.from + (channel.target - channel.from) * ease(progress);
}

export function createChannels(count: number, timing: ChannelTiming): Channels {
  const channels: Channel[] = Array.from({ length: count }, () => ({
    from: 0,
    target: 0,
    start: 0,
    span: 0,
  }));

  function setTargets(targets: ArrayLike<number>, now: number): void {
    channels.forEach((channel, index) => {
      const target = targets[index] ?? channel.target;

      if (target === channel.target) return;

      const from = channelValue(channel, now, timing.ease);
      const distance = Math.abs(target - from);

      channel.from = from;
      channel.target = target;
      channel.start = now;
      channel.span = (target > from ? timing.rise : timing.fall) * distance;
    });
  }

  function sample(now: number, out: Float32Array): boolean {
    let settled = true;

    channels.forEach((channel, index) => {
      const value = channelValue(channel, now, timing.ease);

      out[index] = value;
      if (value !== channel.target) settled = false;
    });

    return settled;
  }

  return { count, setTargets, sample };
}

export interface EmphasisInput {
  readonly highlight: string | null;
  readonly focusLayerId: string | null;
  readonly focusSuspended: boolean;
  readonly tourComponentId: string | null;
}

export interface EmphasisTargets {
  readonly hover: Float32Array;
  readonly tour: Float32Array;
  readonly dim: Float32Array;
}

export function emphasisTargets(layout: ProjectLayout, input: EmphasisInput): EmphasisTargets {
  const hover = new Float32Array(layout.components.length);
  const tour = new Float32Array(layout.components.length);
  const dim = new Float32Array(layout.layers.length);

  if (input.highlight !== null) {
    const index = layout.components.findIndex((component) => component.id === input.highlight);

    if (index !== -1) hover[index] = 1;
  }

  if (input.tourComponentId !== null) {
    const index = layout.components.findIndex(
      (component) => component.id === input.tourComponentId,
    );

    if (index !== -1) tour[index] = 1;
  }

  if (!input.focusSuspended && input.focusLayerId !== null) {
    const focused = layout.layers.findIndex((layer) => layer.id === input.focusLayerId);

    if (focused !== -1) {
      dim.fill(1);
      dim[focused] = 0;
    }
  }

  return { hover, tour, dim };
}

const pulseEases = new WeakMap<MotionEasing, (t: number) => number>();

function pulseEase(easing: MotionEasing): (t: number) => number {
  const cached = pulseEases.get(easing);

  if (cached !== undefined) return cached;

  const ease = easeFromToken(easing);

  pulseEases.set(easing, ease);
  return ease;
}

export function pulseAt(
  now: number,
  stepStartedAt: number,
  tokens: MotionTokens,
  floor: number,
): number {
  const pulseDuration = tokens.durations.tourPulse;

  if (!(pulseDuration > 0)) return 1;

  const elapsed = Math.max(0, now - stepStartedAt);
  const phase = elapsed % (pulseDuration * 2);
  const yoyo = phase <= pulseDuration ? phase / pulseDuration : 2 - phase / pulseDuration;
  const eased = pulseEase(tokens.easings.tourPulse)(yoyo);

  return 1 - (1 - floor) * eased;
}

export function componentWeights(
  h: number,
  t: number,
  pulse: number,
  d: number,
  level: number,
): { tint: number; toPaper: number } {
  return {
    tint: Math.max(h, t * pulse),
    toPaper: (1 - level) * d * (1 - h),
  };
}

export function layerWeight(d: number, level: number): number {
  return (1 - level) * d;
}

export function liftWorld(px: number, zoom: number, elevation: number): number {
  return px / (zoom * Math.cos(elevation));
}
