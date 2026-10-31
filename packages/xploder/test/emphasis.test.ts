import { describe, expect, test } from 'vitest';

import { parseProject, parseTechRegistry } from '../src/index';
import {
  componentWeights,
  createChannels,
  emphasisTargets,
  layerWeight,
  liftWorld,
  pulseAt,
  type ChannelTiming,
} from '../src/interaction/emphasis';
import { layoutProject, VIEW } from '../src/layout';
import { motion, resolveMotion } from '../src/motion';
import { easeFromToken } from '../src/motion/ease';
import { emphasis } from '../src/motion/emphasis';
import { projectAJson, techRegistryJson } from './fixtures';

const registry = parseTechRegistry(techRegistryJson);
const projectA = parseProject(projectAJson, { registry });
const layoutA = layoutProject(projectA);

function oneIndex(values: Float32Array): number | null {
  const indices = Array.from(values).flatMap((value, index) => (value === 1 ? [index] : []));

  return indices.length === 1 ? (indices[0] ?? null) : null;
}

describe('emphasis channels', () => {
  const timing: ChannelTiming = { rise: 2, fall: 1, ease: (t) => t * t };

  test('uses distance-scaled rise and fall durations with the supplied easing', () => {
    const channels = createChannels(2, timing);
    const out = new Float32Array(2);

    channels.setTargets([0.5, 1], 0);

    expect(channels.sample(0, out)).toBe(false);
    expect(Array.from(out)).toEqual([0, 0]);

    expect(channels.sample(0.5, out)).toBe(false);
    expect(out[0]).toBeCloseTo(0.125, 12);
    expect(out[1]).toBeCloseTo(0.0625, 12);

    expect(channels.sample(2, out)).toBe(true);
    expect(Array.from(out)).toEqual([0.5, 1]);
  });

  test('retargets from the current value and uses the fall duration toward zero', () => {
    const channels = createChannels(1, timing);
    const out = new Float32Array(1);

    channels.setTargets([1], 0);
    expect(channels.sample(1, out)).toBe(false);
    expect(out[0]).toBeCloseTo(0.25, 12);

    channels.setTargets([0], 1);
    expect(channels.sample(1, out)).toBe(false);
    expect(out[0]).toBeCloseTo(0.25, 12);

    expect(channels.sample(1.125, out)).toBe(false);
    expect(out[0]).toBeCloseTo(0.1875, 12);

    expect(channels.sample(1.25, out)).toBe(true);
    expect(out[0]).toBe(0);
  });

  test('settles at the target immediately with the static timing', () => {
    const channels = createChannels(1, { rise: 0, fall: 0, ease: (t) => t });
    const out = new Float32Array(1);

    channels.setTargets([1], 7);

    expect(channels.sample(7, out)).toBe(true);
    expect(out[0]).toBe(1);
  });
});

describe('emphasis targets', () => {
  test('isolates hover, tour and layer dim channels', () => {
    const targets = emphasisTargets(layoutA, {
      highlight: 'tide-view-model',
      focusLayerId: 'data',
      focusSuspended: false,
      tourComponentId: 'tide-repository',
    });
    const hoverIndex = layoutA.components.findIndex(
      (component) => component.id === 'tide-view-model',
    );
    const tourIndex = layoutA.components.findIndex(
      (component) => component.id === 'tide-repository',
    );
    const focusedIndex = layoutA.layers.findIndex((layer) => layer.id === 'data');

    expect(oneIndex(targets.hover)).toBe(hoverIndex);
    expect(oneIndex(targets.tour)).toBe(tourIndex);

    layoutA.layers.forEach((_, index) => {
      expect(targets.dim[index], `layer ${index}`).toBe(index === focusedIndex ? 0 : 1);
    });
  });

  test('suspends focus during a tour and ignores unknown ids', () => {
    const suspended = emphasisTargets(layoutA, {
      highlight: 'missing',
      focusLayerId: 'data',
      focusSuspended: true,
      tourComponentId: null,
    });
    const unknown = emphasisTargets(layoutA, {
      highlight: null,
      focusLayerId: 'missing',
      focusSuspended: false,
      tourComponentId: null,
    });

    expect(Array.from(suspended.dim)).toEqual(layoutA.layers.map(() => 0));
    expect(Array.from(suspended.hover)).toEqual(layoutA.components.map(() => 0));
    expect(Array.from(unknown.dim)).toEqual(layoutA.layers.map(() => 0));
  });
});

describe('emphasis weights', () => {
  test('hover reveals a dimmed component and pulses the tour tint', () => {
    expect(componentWeights(0, 1, 0.5, 1, emphasis.dim.level)).toEqual({
      tint: 0.5,
      toPaper: 1 - emphasis.dim.level,
    });
    expect(componentWeights(1, 0, 1, 1, emphasis.dim.level)).toEqual({
      tint: 1,
      toPaper: 0,
    });
    expect(layerWeight(1, emphasis.dim.level)).toBe(1 - emphasis.dim.level);
    expect(layerWeight(0, emphasis.dim.level)).toBe(0);
  });
});

describe('tour pulse', () => {
  test('yoyos from one to the floor and back over two pulse durations', () => {
    const start = 4;
    const duration = motion.durations.tourPulse;
    const floor = emphasis.tourPulse.floor;
    const expectedMid = 1 - (1 - floor) * easeFromToken(motion.easings.tourPulse)(0.5);

    expect(pulseAt(start, start, motion, floor)).toBe(1);
    expect(pulseAt(start + duration * 0.5, start, motion, floor)).toBeCloseTo(expectedMid, 12);
    expect(pulseAt(start + duration, start, motion, floor)).toBeCloseTo(floor, 12);
    expect(pulseAt(start + duration * 2, start, motion, floor)).toBe(1);

    for (let step = 0; step <= 100; step += 1) {
      const value = pulseAt(start + (duration * 2 * step) / 100, start, motion, floor);

      expect(value).toBeGreaterThanOrEqual(floor);
      expect(value).toBeLessThanOrEqual(1);
    }
  });

  test('is one under the static twin', () => {
    const staticTokens = resolveMotion(true);

    expect(pulseAt(100, 0, staticTokens, emphasis.tourPulse.floor)).toBe(1);
  });
});

describe('liftWorld', () => {
  test('converts CSS pixels into world units at the camera zoom and elevation', () => {
    const zoom = 37.5;
    const pixels = motion.distances.hoverLift;

    expect(liftWorld(pixels, zoom, VIEW.elevation)).toBe(
      pixels / (zoom * Math.cos(VIEW.elevation)),
    );
  });
});
