/**
 * xploder motion tokens — the ONLY source of easings, durations and staggers
 * for apps/web and xploder. Import via `xploder/motion`; never write literal
 * motion values elsewhere.
 *
 * No animation number literal may exist outside this module. Time values are
 * seconds (GSAP-native; `motionCss()` emits integer milliseconds), and
 * distances are CSS pixels.
 *
 * These tokens assume transform/opacity-only animation so motion stays
 * compositor-friendly on mid-range Android phones.
 *
 * `reducedMotion` defines the static-twin policy: `resolveMotion(true)` zeroes
 * every duration, stagger and distance while preserving easings, and
 * `motionCss()` mirrors that policy in a prefers-reduced-motion block.
 */

export interface MotionDurations {
  readonly explode: number;
  readonly implode: number;
  readonly hoverLift: number;
  readonly hoverSettle: number;
  readonly tourPulse: number;
  readonly tourBeat: number;
  readonly panelEnter: number;
  readonly panelExit: number;
}

export interface MotionEasing {
  readonly gsap: string;
  readonly css: string;
}

export interface MotionEasings {
  readonly explode: MotionEasing;
  readonly implode: MotionEasing;
  readonly hover: MotionEasing;
  readonly tourPulse: MotionEasing;
  readonly panelEnter: MotionEasing;
  readonly panelExit: MotionEasing;
}

export interface MotionStaggers {
  readonly explodeLayer: number;
  readonly explodeComponent: number;
  readonly implodeLayer: number;
  readonly tourStep: number;
}

export interface MotionDistances {
  readonly hoverLift: number;
  readonly panelOffset: number;
}

export interface ReducedMotionPolicy {
  readonly policy: 'static-twin';
  readonly query: '(prefers-reduced-motion: reduce)';
}

export interface MotionTokens {
  readonly durations: MotionDurations;
  readonly easings: MotionEasings;
  readonly staggers: MotionStaggers;
  readonly distances: MotionDistances;
  readonly reducedMotion: ReducedMotionPolicy;
}

export const durations = {
  explode: 0.9,
  implode: 0.6,
  hoverLift: 0.18,
  hoverSettle: 0.24,
  tourPulse: 0.5,
  tourBeat: 1.6,
  panelEnter: 0.32,
  panelExit: 0.2,
} as const satisfies MotionDurations;

export const easings = {
  explode: { gsap: 'expo.out', css: 'cubic-bezier(0.16, 1, 0.3, 1)' },
  implode: { gsap: 'power3.inOut', css: 'cubic-bezier(0.76, 0, 0.24, 1)' },
  hover: { gsap: 'power3.out', css: 'cubic-bezier(0.25, 1, 0.5, 1)' },
  tourPulse: { gsap: 'sine.inOut', css: 'cubic-bezier(0.37, 0, 0.63, 1)' },
  panelEnter: { gsap: 'expo.out', css: 'cubic-bezier(0.16, 1, 0.3, 1)' },
  panelExit: { gsap: 'power2.in', css: 'cubic-bezier(0.32, 0, 0.67, 0)' },
} as const satisfies MotionEasings;

export const staggers = {
  explodeLayer: 0.06,
  explodeComponent: 0.02,
  implodeLayer: 0.04,
  tourStep: 0.15,
} as const satisfies MotionStaggers;

export const distances = {
  hoverLift: 4,
  panelOffset: 16,
} as const satisfies MotionDistances;

export const reducedMotion = {
  policy: 'static-twin',
  query: '(prefers-reduced-motion: reduce)',
} as const satisfies ReducedMotionPolicy;

export const motion = {
  durations,
  easings,
  staggers,
  distances,
  reducedMotion,
} as const satisfies MotionTokens;

const staticTwin: MotionTokens = {
  durations: {
    explode: 0,
    implode: 0,
    hoverLift: 0,
    hoverSettle: 0,
    tourPulse: 0,
    tourBeat: 0,
    panelEnter: 0,
    panelExit: 0,
  },
  easings,
  staggers: {
    explodeLayer: 0,
    explodeComponent: 0,
    implodeLayer: 0,
    tourStep: 0,
  },
  distances: {
    hoverLift: 0,
    panelOffset: 0,
  },
  reducedMotion,
};

export function resolveMotion(prefersReduced: boolean): MotionTokens {
  return prefersReduced ? staticTwin : motion;
}

type CssVariable = readonly [name: string, value: string];

function kebabCase(value: string): string {
  return value.replace(/[A-Z]/g, (character) => `-${character.toLowerCase()}`);
}

function toMilliseconds(seconds: number): string {
  return `${Math.round(seconds * 1000)}ms`;
}

function declarations(variables: readonly CssVariable[]): string {
  return variables.map(([name, value]) => `${name}:${value};`).join('');
}

function durationVariables(tokens: MotionDurations): CssVariable[] {
  return Object.entries(tokens).map(([name, value]) => [
    `--motion-duration-${kebabCase(name)}`,
    toMilliseconds(value),
  ]);
}

function easingVariables(tokens: MotionEasings): CssVariable[] {
  return Object.entries(tokens).map(([name, easing]) => [
    `--motion-ease-${kebabCase(name)}`,
    easing.css,
  ]);
}

function staggerVariables(tokens: MotionStaggers): CssVariable[] {
  return Object.entries(tokens).map(([name, value]) => [
    `--motion-stagger-${kebabCase(name)}`,
    toMilliseconds(value),
  ]);
}

function distanceVariables(tokens: MotionDistances): CssVariable[] {
  return Object.entries(tokens).map(([name, value]) => [
    `--motion-distance-${kebabCase(name)}`,
    `${value}px`,
  ]);
}

export function motionCss(): string {
  const defaults = declarations([
    ...durationVariables(durations),
    ...easingVariables(easings),
    ...staggerVariables(staggers),
    ...distanceVariables(distances),
  ]);
  const reduced = declarations([
    ...durationVariables(staticTwin.durations),
    ...staggerVariables(staticTwin.staggers),
    ...distanceVariables(staticTwin.distances),
  ]);

  return `:root{${defaults}}@media ${reducedMotion.query}{:root{${reduced}}}`;
}
