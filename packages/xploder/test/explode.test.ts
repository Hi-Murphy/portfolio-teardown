import { describe, expect, test } from 'vitest';

import { createExplodeTimeline } from '../src/engine/explode';
import { layoutProject, type ProjectLayout } from '../src/layout/index';
import { motion, resolveMotion, type MotionTokens } from '../src/motion/index';

type InstanceKind = 'layer' | 'component';

interface InstanceSpec {
  readonly kind: InstanceKind;
  readonly layerIndex: number;
  readonly slot: number;
}

interface FullTiming extends InstanceSpec {
  readonly index: number;
  readonly delay: number;
  readonly duration: number;
  readonly end: number;
}

function fixtureLayout(): ProjectLayout {
  return layoutProject({
    layers: [
      { id: 'layer-0', components: [{ id: 'component-0-0' }, { id: 'component-0-1' }] },
      { id: 'layer-1', components: [{ id: 'component-1-0' }, { id: 'component-1-1' }] },
      { id: 'layer-2', components: [{ id: 'component-2-0' }, { id: 'component-2-1' }] },
    ],
  });
}

function instanceSpecs(layout: ProjectLayout): InstanceSpec[] {
  const specs: InstanceSpec[] = [];

  layout.layers.forEach((_, layerIndex) => {
    specs.push({ kind: 'layer', layerIndex, slot: 0 });
  });

  for (const component of layout.components) {
    specs.push({ kind: 'component', layerIndex: component.layerIndex, slot: component.slot });
  }

  return specs;
}

function indexOf(
  specs: readonly InstanceSpec[],
  kind: InstanceKind,
  layerIndex: number,
  slot: number,
): number {
  const index = specs.findIndex(
    (spec) => spec.kind === kind && spec.layerIndex === layerIndex && spec.slot === slot,
  );

  if (index < 0) throw new Error(`Missing ${kind} ${layerIndex}:${slot}`);
  return index;
}

function staggerFor(
  spec: InstanceSpec,
  tokens: MotionTokens,
  target: 0 | 1,
  layerCount: number,
): number {
  return target === 1
    ? spec.layerIndex * tokens.staggers.explodeLayer + spec.slot * tokens.staggers.explodeComponent
    : (layerCount - 1 - spec.layerIndex) * tokens.staggers.implodeLayer;
}

function fullTimings(
  layout: ProjectLayout,
  tokens: MotionTokens,
  target: 0 | 1,
  start: number,
): FullTiming[] {
  return instanceSpecs(layout).map((spec, index) => {
    const delay = staggerFor(spec, tokens, target, layout.layers.length);
    const duration = target === 1 ? tokens.durations.explode : tokens.durations.implode;

    return { ...spec, index, delay, duration, end: start + delay + duration };
  });
}

function valueAt(out: Float32Array, index: number): number {
  const value = out[index];

  if (value === undefined) throw new Error(`Missing sample ${index}`);
  return value;
}

function assertAll(out: Float32Array, expected: number): void {
  for (let index = 0; index < out.length; index += 1) {
    expect(valueAt(out, index)).toBe(expected);
  }
}

function settleWindow(layout: ProjectLayout, tokens: MotionTokens, target: 0 | 1): number {
  return Math.max(...fullTimings(layout, tokens, target, 0).map((timing) => timing.end));
}

function scaledTokens(tokens: MotionTokens): MotionTokens {
  return {
    ...tokens,
    durations: {
      explode: tokens.durations.explode * 2,
      implode: tokens.durations.implode * 2,
      hoverLift: tokens.durations.hoverLift * 2,
      hoverSettle: tokens.durations.hoverSettle * 2,
      tourPulse: tokens.durations.tourPulse * 2,
      tourBeat: tokens.durations.tourBeat * 2,
      panelEnter: tokens.durations.panelEnter * 2,
      panelExit: tokens.durations.panelExit * 2,
    },
    easings: {
      ...tokens.easings,
      explode: { ...tokens.easings.explode, css: 'cubic-bezier(0, 0, 1, 1)' },
      implode: { ...tokens.easings.implode, css: 'cubic-bezier(0, 0, 1, 1)' },
    },
    staggers: {
      explodeLayer: tokens.staggers.explodeLayer * 3,
      explodeComponent: tokens.staggers.explodeComponent * 3,
      implodeLayer: tokens.staggers.implodeLayer * 3,
      tourStep: tokens.staggers.tourStep * 3,
    },
  };
}

describe('createExplodeTimeline', () => {
  const layout = fixtureLayout();
  const specs = instanceSpecs(layout);

  test('orders layer slabs first and reaches each target at its computed end', () => {
    const start = 3;
    const timeline = createExplodeTimeline(layout, motion, 0);
    const out = new Float32Array(timeline.count);

    expect(timeline.count).toBe(layout.layers.length + layout.components.length);
    timeline.setTarget(1, start);
    expect(timeline.target).toBe(1);

    const timings = fullTimings(layout, motion, 1, start);

    for (const timing of timings) {
      const before = new Float32Array(timeline.count);
      const atEnd = new Float32Array(timeline.count);

      timeline.sample(timing.end - 0.01, before);
      timeline.sample(timing.end, atEnd);
      expect(valueAt(before, timing.index)).toBeLessThan(1);
      expect(valueAt(atEnd, timing.index)).toBe(1);
    }

    const lastEnd = Math.max(...timings.map((timing) => timing.end));
    expect(timeline.sample(lastEnd - 0.001, out)).toBe(false);
    expect(timeline.sample(lastEnd, out)).toBe(true);
    assertAll(out, 1);
  });

  test('staggers layers from zero and components by slot during explode', () => {
    const timeline = createExplodeTimeline(layout, motion, 0);
    const early = new Float32Array(timeline.count);
    const componentStagger = new Float32Array(timeline.count);

    timeline.setTarget(1, 0);
    timeline.sample(0.001, early);
    timeline.sample(0.021, componentStagger);

    expect(valueAt(early, indexOf(specs, 'layer', 0, 0))).toBeGreaterThan(0);
    expect(valueAt(early, indexOf(specs, 'layer', 1, 0))).toBe(0);
    expect(valueAt(early, indexOf(specs, 'layer', 2, 0))).toBe(0);
    expect(valueAt(early, indexOf(specs, 'component', 0, 0))).toBeGreaterThan(0);
    expect(valueAt(early, indexOf(specs, 'component', 0, 1))).toBe(0);
    expect(valueAt(early, indexOf(specs, 'component', 1, 0))).toBe(0);

    expect(valueAt(componentStagger, indexOf(specs, 'component', 0, 1))).toBeGreaterThan(0);
    expect(valueAt(componentStagger, indexOf(specs, 'component', 1, 0))).toBe(0);
  });

  test('reverses the layer order during implode without component slot stagger', () => {
    const timeline = createExplodeTimeline(layout, motion, 1);
    const early = new Float32Array(timeline.count);
    const nextLayer = new Float32Array(timeline.count);

    timeline.setTarget(0, 0);
    timeline.sample(0.001, early);
    timeline.sample(0.041, nextLayer);

    expect(valueAt(early, indexOf(specs, 'layer', 2, 0))).toBeLessThan(1);
    expect(valueAt(early, indexOf(specs, 'layer', 1, 0))).toBe(1);
    expect(valueAt(early, indexOf(specs, 'layer', 0, 0))).toBe(1);
    expect(valueAt(early, indexOf(specs, 'component', 2, 0))).toBe(
      valueAt(early, indexOf(specs, 'component', 2, 1)),
    );
    expect(valueAt(early, indexOf(specs, 'component', 0, 0))).toBe(1);

    expect(valueAt(nextLayer, indexOf(specs, 'layer', 1, 0))).toBeLessThan(1);
    expect(valueAt(nextLayer, indexOf(specs, 'layer', 0, 0))).toBe(1);
  });

  test('transitions phases as each direction settles', () => {
    const timeline = createExplodeTimeline(layout, motion, 0);
    const out = new Float32Array(timeline.count);
    const explodeEnd = settleWindow(layout, motion, 1);

    expect(timeline.phase(0)).toBe('imploded');

    timeline.setTarget(1, 0);
    expect(timeline.phase(0)).toBe('exploding');
    expect(timeline.sample(explodeEnd - 0.001, out)).toBe(false);
    expect(timeline.phase(explodeEnd - 0.001)).toBe('exploding');
    expect(timeline.sample(explodeEnd, out)).toBe(true);
    expect(timeline.phase(explodeEnd)).toBe('exploded');

    timeline.setTarget(0, explodeEnd);
    expect(timeline.phase(explodeEnd)).toBe('imploding');

    const implodeEnd = explodeEnd + settleWindow(layout, motion, 0);
    expect(timeline.sample(implodeEnd, out)).toBe(true);
    expect(timeline.phase(implodeEnd)).toBe('imploded');
  });

  test('preserves position at a 40% interruption and reverses without a jump', () => {
    const start = 0;
    const timeline = createExplodeTimeline(layout, motion, 0);
    const explodeEnd = settleWindow(layout, motion, 1);
    const toggleMilliseconds = Math.round((explodeEnd - start) * 0.4 * 1000);
    const toggleAt = start + toggleMilliseconds / 1000;
    const runLimit =
      toggleAt +
      (layout.layers.length - 1) * motion.staggers.implodeLayer +
      motion.durations.implode;

    timeline.setTarget(1, start);

    const previous = new Float32Array(timeline.count);
    let beforeToggle = new Float32Array(timeline.count);
    let afterToggle = new Float32Array(timeline.count);
    let maxStep = 0;

    timeline.sample(start, previous);

    for (
      let milliseconds = 1;
      milliseconds <= Math.ceil((runLimit - start) * 1000);
      milliseconds += 1
    ) {
      const now = start + milliseconds / 1000;
      const current = new Float32Array(timeline.count);

      if (milliseconds === toggleMilliseconds) {
        beforeToggle = new Float32Array(timeline.count);
        timeline.sample(now, beforeToggle);
        timeline.setTarget(0, now);
      }

      timeline.sample(now, current);

      if (milliseconds === toggleMilliseconds) afterToggle = current;

      for (let index = 0; index < timeline.count; index += 1) {
        maxStep = Math.max(maxStep, Math.abs(valueAt(current, index) - valueAt(previous, index)));
      }

      previous.set(current);
    }

    for (let index = 0; index < timeline.count; index += 1) {
      expect(
        Math.abs(valueAt(afterToggle, index) - valueAt(beforeToggle, index)),
      ).toBeLessThanOrEqual(1e-9);
    }
    expect(maxStep).toBeLessThanOrEqual(0.02);

    const reverseEnds = specs.map((spec, index) => {
      const distance = valueAt(beforeToggle, index);
      const delay = distance * staggerFor(spec, motion, 0, layout.layers.length);
      const duration = distance * motion.durations.implode;

      return { index, end: toggleAt + delay + duration };
    });
    const finalEnd = Math.max(...reverseEnds.map((timing) => timing.end));

    for (const timing of reverseEnds) {
      const end = new Float32Array(timeline.count);

      timeline.sample(timing.end, end);
      expect(valueAt(end, timing.index)).toBe(0);
    }

    const final = new Float32Array(timeline.count);
    expect(timeline.sample(finalEnd, final)).toBe(true);
    assertAll(final, 0);
    expect(timeline.phase(finalEnd)).toBe('imploded');
  });

  test('settles on the last target after 50 random toggles in two seconds', () => {
    const timeline = createExplodeTimeline(layout, motion, 0);
    const window = Math.max(settleWindow(layout, motion, 1), settleWindow(layout, motion, 0));
    let seed = 0x5eed1234;
    let lastAt = 0;
    let lastTarget: 0 | 1 = 0;

    const random = (): number => {
      seed = (Math.imul(seed, 1_664_525) + 1_013_904_223) >>> 0;
      return seed / 4_294_967_296;
    };

    for (let index = 0; index < 50; index += 1) {
      lastAt = ((index + random()) / 50) * 2;
      lastTarget = random() < 0.5 ? 0 : 1;
      timeline.setTarget(lastTarget, lastAt);
    }

    const out = new Float32Array(timeline.count);
    expect(timeline.target).toBe(lastTarget);
    expect(timeline.sample(lastAt + window + 0.001, out)).toBe(true);
    assertAll(out, lastTarget);
    expect(timeline.phase(lastAt + window + 0.001)).toBe(
      lastTarget === 1 ? 'exploded' : 'imploded',
    );
  });

  test('cuts to the target with the static twin tokens', () => {
    const now = 42;
    const timeline = createExplodeTimeline(layout, resolveMotion(true), 0);
    const out = new Float32Array(timeline.count);

    timeline.setTarget(1, now);

    expect(timeline.sample(now, out)).toBe(true);
    assertAll(out, 1);
    expect(timeline.phase(now)).toBe('exploded');
  });

  test('scales settle time and mid-curve samples with duration and stagger tokens', () => {
    const start = 7;
    const scaled = scaledTokens(motion);
    const timeline = createExplodeTimeline(layout, scaled, 0);
    const timings = fullTimings(layout, scaled, 1, start);
    const expectedEnd = Math.max(...timings.map((timing) => timing.end));
    const baseTimings = fullTimings(layout, motion, 1, start);
    const maxBaseDelay = Math.max(...baseTimings.map((timing) => timing.delay));
    const baseDuration = motion.durations.explode;

    timeline.setTarget(1, start);
    expect(expectedEnd - start).toBeCloseTo(maxBaseDelay * 3 + baseDuration * 2, 12);
    expect(timeline.phase(expectedEnd - 0.001)).toBe('exploding');
    expect(timeline.phase(expectedEnd)).toBe('exploded');

    const out = new Float32Array(timeline.count);
    timeline.sample(start + baseDuration, out);
    expect(valueAt(out, indexOf(specs, 'layer', 0, 0))).toBeCloseTo(0.5, 6);

    const middle = start + (expectedEnd - start) / 2;
    timeline.sample(middle, out);

    for (const timing of timings) {
      const expected = Math.min(1, Math.max(0, (middle - start - timing.delay) / timing.duration));

      expect(valueAt(out, timing.index)).toBeCloseTo(expected, 6);
    }
  });
});
