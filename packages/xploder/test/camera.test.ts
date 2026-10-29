import { describe, expect, expectTypeOf, test } from 'vitest';

import {
  azimuthOf,
  cameraReducer,
  createTurnTween,
  INITIAL_RIG,
  keyToAction,
  RIG_ACTION_TYPES,
  ZOOM_BOUNDS,
  type RigAction,
  type RigState,
} from '../src/engine/camera';
import { VIEW } from '../src/layout/index';
import { motion, resolveMotion } from '../src/motion/index';

const EPSILON = 1e-9;
const FULL_TURN = Math.PI * 2;
const SNAPS = [Math.PI / 4, (Math.PI * 3) / 4, (Math.PI * 5) / 4, (Math.PI * 7) / 4] as const;

type ExpectedRigActionType = 'rotateLeft' | 'rotateRight' | 'zoomIn' | 'zoomOut' | 'zoomReset';

function normalizeAzimuth(azimuth: number): number {
  return ((azimuth % FULL_TURN) + FULL_TURN) % FULL_TURN;
}

function distanceToNearestSnap(azimuth: number): number {
  return Math.min(...SNAPS.map((snap) => Math.abs(azimuth - snap)));
}

function mulberry32(seed: number): () => number {
  let state = seed >>> 0;

  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;

    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);

    return ((value ^ (value >>> 14)) >>> 0) / 4_294_967_296;
  };
}

function randomAction(random: () => number): RigAction {
  const type = RIG_ACTION_TYPES[Math.floor(random() * RIG_ACTION_TYPES.length)];

  if (type === undefined) throw new Error('RIG_ACTION_TYPES is empty');

  return { type };
}

function expectSnapped(azimuth: number): void {
  expect(distanceToNearestSnap(normalizeAzimuth(azimuth))).toBeLessThanOrEqual(EPSILON);
}

describe('cameraReducer', () => {
  test('exposes the exact action union', () => {
    expect(RIG_ACTION_TYPES).toEqual([
      'rotateLeft',
      'rotateRight',
      'zoomIn',
      'zoomOut',
      'zoomReset',
    ]);
    expectTypeOf<RigAction['type']>().toEqualTypeOf<ExpectedRigActionType>();
  });

  test('starts at 45 degrees with fit zoom', () => {
    expect(INITIAL_RIG).toEqual({ step: 0, turns: 0, zoomFactor: 1 });
    expect(azimuthOf(INITIAL_RIG.turns)).toBe(VIEW.baseAzimuth);
    expect(azimuthOf(INITIAL_RIG.turns)).toBe(Math.PI / 4);
  });

  test('keeps azimuth snapped and zoom bounded through 10,000 random actions', () => {
    const random = mulberry32(0x5eed1234);
    let rig = INITIAL_RIG;

    for (let index = 0; index < 10_000; index += 1) {
      rig = cameraReducer(rig, randomAction(random));

      expectSnapped(azimuthOf(rig.turns));
      expect(rig.zoomFactor).toBeGreaterThanOrEqual(ZOOM_BOUNDS.min);
      expect(rig.zoomFactor).toBeLessThanOrEqual(ZOOM_BOUNDS.max);
      expect(rig.step).toBe((((rig.turns % 4) + 4) % 4) as RigState['step']);
    }
  });

  test('clamps repeated zoom actions and resets to fit', () => {
    let zoomedIn = INITIAL_RIG;
    let zoomedOut = INITIAL_RIG;

    for (let index = 0; index < 20; index += 1) {
      zoomedIn = cameraReducer(zoomedIn, { type: 'zoomIn' });
      zoomedOut = cameraReducer(zoomedOut, { type: 'zoomOut' });
    }

    expect(zoomedIn.zoomFactor).toBe(ZOOM_BOUNDS.max);
    expect(zoomedOut.zoomFactor).toBe(ZOOM_BOUNDS.min);
    expect(cameraReducer(zoomedIn, { type: 'zoomReset' }).zoomFactor).toBe(ZOOM_BOUNDS.min);
  });

  test('rotates in signed turns without changing zoom', () => {
    const right = cameraReducer(INITIAL_RIG, { type: 'rotateRight' });
    const left = cameraReducer(INITIAL_RIG, { type: 'rotateLeft' });

    expect(right).toEqual({ step: 1, turns: 1, zoomFactor: INITIAL_RIG.zoomFactor });
    expect(left).toEqual({ step: 3, turns: -1, zoomFactor: INITIAL_RIG.zoomFactor });
  });
});

describe('keyToAction', () => {
  test.each([
    ['ArrowLeft', 'rotateLeft'],
    ['ArrowRight', 'rotateRight'],
    ['+', 'zoomIn'],
    ['=', 'zoomIn'],
    ['-', 'zoomOut'],
    ['_', 'zoomOut'],
    ['0', 'zoomReset'],
  ] as const)('maps %s to %s', (key, type) => {
    expect(keyToAction(key)).toEqual({ type });
  });

  test.each(['ArrowUp', 'a', 'Enter', ' '])('ignores %j', (key) => {
    expect(keyToAction(key)).toBeNull();
  });
});

describe('createTurnTween', () => {
  test('turns from 45 to 135 degrees, settles exactly at the token duration', () => {
    const tween = createTurnTween(motion);
    const start = 0;
    const target = azimuthOf(1);
    const duration = motion.durations.implode;

    tween.setTarget(azimuthOf(0), start);
    expect(tween.sample(start)).toEqual({ azimuth: azimuthOf(0), settled: true });

    tween.setTarget(target, start);
    let beforeEnd = tween.sample(start);

    for (let index = 0; index <= 100; index += 1) {
      const sample = tween.sample(start + (duration * index) / 100);

      expect(sample.azimuth).toBeGreaterThanOrEqual(azimuthOf(0) - EPSILON);
      expect(sample.azimuth).toBeLessThanOrEqual(target + EPSILON);

      if (index === 50) {
        expect(sample.azimuth).toBeGreaterThan(azimuthOf(0));
        expect(sample.azimuth).toBeLessThan(target);
      }
      if (index === 99) beforeEnd = sample;
      if (index === 100) {
        expect(sample).toEqual({ azimuth: target, settled: true });
      }
    }

    expect(beforeEnd.settled).toBe(false);
    expect(tween.sample(start + duration * 2)).toEqual({ azimuth: target, settled: true });
  });

  test('retargets from the displayed angle without a jump', () => {
    const tween = createTurnTween(motion);
    const duration = motion.durations.implode;
    const retargetAt = duration * 0.4;
    const nextTarget = azimuthOf(2);

    tween.setTarget(azimuthOf(0), 0);
    tween.setTarget(azimuthOf(1), 0);

    const beforeRetarget = tween.sample(retargetAt);
    tween.setTarget(nextTarget, retargetAt);
    const afterRetarget = tween.sample(retargetAt);

    expect(afterRetarget.azimuth).toBe(beforeRetarget.azimuth);

    for (let index = 0; index <= 100; index += 1) {
      const sample = tween.sample(retargetAt + (duration * index) / 100);

      expect(sample.azimuth).toBeGreaterThanOrEqual(beforeRetarget.azimuth - EPSILON);
      expect(sample.azimuth).toBeLessThanOrEqual(nextTarget + EPSILON);
    }

    expect(tween.sample(retargetAt + duration)).toEqual({
      azimuth: nextTarget,
      settled: true,
    });
  });

  test('cuts to the target with the static twin', () => {
    const tween = createTurnTween(resolveMotion(true));
    const target = azimuthOf(2);

    tween.setTarget(azimuthOf(0), 0);
    tween.setTarget(target, 0);

    expect(tween.sample(0)).toEqual({ azimuth: target, settled: true });
    expect(tween.sample(motion.durations.implode)).toEqual({ azimuth: target, settled: true });
  });
});
