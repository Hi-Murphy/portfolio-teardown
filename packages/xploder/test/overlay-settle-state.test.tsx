import ReactThreeTestRenderer from '@react-three/test-renderer';
import { act } from 'react';
import { describe, expect, test } from 'vitest';

import { INITIAL_RIG, ZOOM_BOUNDS, azimuthOf, type RigState } from '../src/engine/camera';
import { fitZoom, layoutProject, type ProjectLayout } from '../src/layout';
import { motion, resolveMotion } from '../src/motion';
import { parseProject, parseTechRegistry } from '../src/index';
import * as overlayProjector from '../src/react/scene/OverlayProjector';
import type { OverlayEvent } from '../src/react/scene/OverlayProjector';
import { Scene, type SceneProps } from '../src/react/scene/Scene';
import { blueprint } from '../src/theme';
import { createFakeClock, projectAJson, techRegistryJson, type FakeClock } from './fixtures';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const registry = parseTechRegistry(techRegistryJson);
const projectA = parseProject(projectAJson, { registry });
const layoutA = layoutProject(projectA);
const VIEWPORT = { width: 390, height: 844 } as const;
const FRAME_SECONDS = 1 / 60;
const EXPLODE_HOLD_SECONDS = 0.2;
const HELD_FRAMES = [1, 2, 5] as const;
type TestRenderer = Awaited<ReturnType<typeof ReactThreeTestRenderer.create>>;
type Target = 'imploded' | 'exploded';
type SettlePhase = 'imploded' | 'exploded' | 'zoomed' | 'turned';

interface RestKey {
  readonly layout: ProjectLayout;
  readonly width: number;
  readonly height: number;
  readonly target: Target;
  readonly turns: number;
  readonly zoomFactor: number;
}

interface RestStateInput {
  readonly progress: ArrayLike<number> | null;
  readonly target: Target;
  readonly azimuth: number | null;
  readonly turns: number;
  readonly cameraZoom: number;
  readonly fitZoom: number;
  readonly zoomFactor: number;
}

interface SettleHelpers {
  restKeyOf(input: RestKey): RestKey;
  isAtRest(input: RestStateInput): boolean;
  settlePhase(previous: RestKey | null, next: RestKey): SettlePhase;
}

// Namespace access keeps the red run behavioural while the helpers do not exist yet.
const { restKeyOf, isAtRest, settlePhase } = overlayProjector as unknown as SettleHelpers;

function sceneProps(overrides: Partial<SceneProps> = {}): SceneProps {
  return {
    layout: layoutA,
    palette: blueprint.light,
    tokens: motion,
    target: 'imploded',
    rig: INITIAL_RIG,
    slug: projectA.meta.slug,
    ...overrides,
  };
}

function renderScene(overrides: Partial<SceneProps> = {}): Promise<TestRenderer> {
  return ReactThreeTestRenderer.create(<Scene {...sceneProps(overrides)} />, {
    orthographic: true,
    width: VIEWPORT.width,
    height: VIEWPORT.height,
  });
}

async function advanceClockFrame(
  renderer: TestRenderer,
  clock: FakeClock,
  seconds = FRAME_SECONDS,
): Promise<void> {
  await act(async () => {
    clock.advance(seconds);
    await renderer.advanceFrames(1, seconds);
  });
}

async function advanceClockTo(
  renderer: TestRenderer,
  clock: FakeClock,
  seconds: number,
): Promise<void> {
  while (clock.now() < seconds) {
    const before = clock.now();

    await advanceClockFrame(renderer, clock, Math.min(FRAME_SECONDS, seconds - clock.now()));
    if (clock.now() === before) break;
  }
}

async function holdFrames(renderer: TestRenderer, count: number): Promise<void> {
  for (let frame = 0; frame < count; frame += 1) {
    await renderer.advanceFrames(1, FRAME_SECONDS);
  }
}

function settledEvents(
  events: readonly OverlayEvent[],
): Extract<OverlayEvent, { kind: 'settled' }>[] {
  return events.filter(
    (event): event is Extract<OverlayEvent, { kind: 'settled' }> => event.kind === 'settled',
  );
}

function progressFor(layout: ProjectLayout, value: number): Float32Array {
  return new Float32Array(layout.layers.length + layout.components.length).fill(value);
}

function largestExplodeDelay(layout: ProjectLayout): number {
  let largest = 0;

  layout.layers.forEach((_, layerIndex) => {
    largest = Math.max(largest, layerIndex * motion.staggers.explodeLayer);
  });
  layout.components.forEach((component) => {
    const delay =
      component.layerIndex * motion.staggers.explodeLayer +
      component.slot * motion.staggers.explodeComponent;

    largest = Math.max(largest, delay);
  });

  return largest;
}

function explodeEnd(layout: ProjectLayout): number {
  return motion.durations.explode + largestExplodeDelay(layout);
}

function key(overrides: Partial<RestKey> = {}): RestKey {
  return restKeyOf({
    layout: layoutA,
    width: VIEWPORT.width,
    height: VIEWPORT.height,
    target: 'imploded',
    turns: 0,
    zoomFactor: ZOOM_BOUNDS.min,
    ...overrides,
  });
}

describe('overlay settle state', () => {
  test('holds extra frames mid-explode without settling until the tween end (C4)', async () => {
    const clock = createFakeClock();
    const events: OverlayEvent[] = [];
    const progressRef = { current: null as Float32Array | null };
    const onOverlay = (event: OverlayEvent): void => {
      events.push(event);
    };
    const renderer = await renderScene({ clock, progressRef, onOverlay });

    try {
      await advanceClockFrame(renderer, clock, 0);
      expect(settledEvents(events)).toHaveLength(1);

      const before = settledEvents(events).length;

      await renderer.update(
        <Scene
          {...sceneProps({ clock, target: 'exploded', progressRef, onOverlay })}
        />,
      );
      await advanceClockTo(renderer, clock, EXPLODE_HOLD_SECONDS);

      expect(progressRef.current?.some((value) => value > 0 && value < 1)).toBe(true);
      expect(settledEvents(events)).toHaveLength(before);

      for (const count of HELD_FRAMES) {
        await holdFrames(renderer, count);
        expect(settledEvents(events)).toHaveLength(before);
      }

      const end = explodeEnd(layoutA);

      await advanceClockTo(renderer, clock, end);
      await advanceClockFrame(renderer, clock, 0);

      const settled = settledEvents(events).slice(before);

      expect(settled).toHaveLength(1);
      expect(settled[0]?.phase).toBe('exploded');
      expect(settled[0]?.at).toBeGreaterThanOrEqual(end);
      expect((settled[0]?.at ?? Infinity) - end).toBeLessThan(FRAME_SECONDS);
    } finally {
      await renderer.unmount();
    }
  });

  test('holds extra frames mid-turn without settling until the tween end', async () => {
    const clock = createFakeClock();
    const events: OverlayEvent[] = [];
    const onOverlay = (event: OverlayEvent): void => {
      events.push(event);
    };
    const renderer = await renderScene({ clock, onOverlay });

    try {
      await advanceClockFrame(renderer, clock, 0);
      expect(settledEvents(events)).toHaveLength(1);

      const before = settledEvents(events).length;
      const turned: RigState = { ...INITIAL_RIG, step: 1, turns: 1 };

      await renderer.update(<Scene {...sceneProps({ clock, rig: turned, onOverlay })} />);
      await advanceClockFrame(renderer, clock, 0);
      await advanceClockTo(renderer, clock, motion.durations.implode / 2);

      expect(settledEvents(events)).toHaveLength(before);

      for (const count of HELD_FRAMES) {
        await holdFrames(renderer, count);
        expect(settledEvents(events)).toHaveLength(before);
      }

      const end = motion.durations.implode;

      await advanceClockTo(renderer, clock, end);
      await advanceClockFrame(renderer, clock, 0);

      const settled = settledEvents(events).slice(before);

      expect(settled).toHaveLength(1);
      expect(settled[0]?.phase).toBe('turned');
      expect(settled[0]?.at).toBeGreaterThanOrEqual(end);
      expect((settled[0]?.at ?? Infinity) - end).toBeLessThan(FRAME_SECONDS);
    } finally {
      await renderer.unmount();
    }
  });

  test('holds extra frames mid smooth zoom without settling until the tween end', async () => {
    const clock = createFakeClock();
    const events: OverlayEvent[] = [];
    const onOverlay = (event: OverlayEvent): void => {
      events.push(event);
    };
    const renderer = await renderScene({
      clock,
      rig: { ...INITIAL_RIG, smoothZoom: true },
      onOverlay,
    });

    try {
      await advanceClockFrame(renderer, clock, 0);
      expect(settledEvents(events)).toHaveLength(1);

      const before = settledEvents(events).length;
      const zoomed: RigState = {
        ...INITIAL_RIG,
        smoothZoom: true,
        zoomFactor: ZOOM_BOUNDS.min * ZOOM_BOUNDS.step,
      };

      await renderer.update(<Scene {...sceneProps({ clock, rig: zoomed, onOverlay })} />);
      await advanceClockFrame(renderer, clock, 0);
      await advanceClockTo(renderer, clock, motion.durations.implode / 2);

      expect(settledEvents(events)).toHaveLength(before);

      for (const count of HELD_FRAMES) {
        await holdFrames(renderer, count);
        expect(settledEvents(events)).toHaveLength(before);
      }

      const end = motion.durations.implode;

      await advanceClockTo(renderer, clock, end);
      await advanceClockFrame(renderer, clock, 0);

      const settled = settledEvents(events).slice(before);

      expect(settled).toHaveLength(1);
      expect(settled[0]?.phase).toBe('zoomed');
      expect(settled[0]?.at).toBeGreaterThanOrEqual(end);
      expect((settled[0]?.at ?? Infinity) - end).toBeLessThan(FRAME_SECONDS);
    } finally {
      await renderer.unmount();
    }
  });

  test('emits moving and settled in the same frame after a resize at rest', async () => {
    const clock = createFakeClock();
    const events: OverlayEvent[] = [];
    const onOverlay = (event: OverlayEvent): void => {
      events.push(event);
    };
    const renderer = await renderScene({ clock, onOverlay });

    try {
      await advanceClockFrame(renderer, clock, 0);

      const before = events.length;
      const width = VIEWPORT.width - 40;
      const height = VIEWPORT.height + 20;

      await act(async () => {
        renderer.scene.fiber.root.getState().setSize(width, height);
      });
      await renderer.advanceFrames(1, 0);

      const emitted = events.slice(before);

      expect(emitted.map((event) => event.kind)).toEqual(['moving', 'settled']);

      const settled = settledEvents(emitted)[0];

      expect(settled?.phase).toBe('imploded');
      expect(settled?.width).toBe(width);
      expect(settled?.height).toBe(height);
    } finally {
      await renderer.unmount();
    }
  });

  test('emits moving and settled in the same frame for a reduced-motion turn', async () => {
    const clock = createFakeClock();
    const tokens = resolveMotion(true);
    const events: OverlayEvent[] = [];
    const onOverlay = (event: OverlayEvent): void => {
      events.push(event);
    };
    const renderer = await renderScene({ clock, tokens: motion, onOverlay });

    try {
      await advanceClockFrame(renderer, clock, 0);

      const before = events.length;
      const turned: RigState = { ...INITIAL_RIG, step: 1, turns: 1 };

      await renderer.update(
        <Scene {...sceneProps({ clock, tokens, rig: turned, onOverlay })} />,
      );
      await renderer.advanceFrames(1, 0);

      const emitted = events.slice(before);

      expect(emitted.map((event) => event.kind)).toEqual(['moving', 'settled']);
      expect(settledEvents(emitted)[0]?.phase).toBe('turned');
    } finally {
      await renderer.unmount();
    }
  });

  test('gives an explode target precedence over a simultaneous zoom change', async () => {
    const clock = createFakeClock();
    const events: OverlayEvent[] = [];
    const onOverlay = (event: OverlayEvent): void => {
      events.push(event);
    };
    const renderer = await renderScene({ clock, onOverlay });

    try {
      await advanceClockFrame(renderer, clock, 0);

      const before = settledEvents(events).length;
      const zoomed: RigState = {
        ...INITIAL_RIG,
        zoomFactor: ZOOM_BOUNDS.min * ZOOM_BOUNDS.step,
      };

      await renderer.update(
        <Scene {...sceneProps({ clock, target: 'exploded', rig: zoomed, onOverlay })} />,
      );
      await advanceClockFrame(renderer, clock, 0);
      await advanceClockTo(renderer, clock, explodeEnd(layoutA));
      await advanceClockFrame(renderer, clock, 0);

      const settled = settledEvents(events).slice(before);

      expect(settled).toHaveLength(1);
      expect(settled[0]?.phase).toBe('exploded');
    } finally {
      await renderer.unmount();
    }
  });

  test('reports the target on the first rest after mount', async () => {
    const clock = createFakeClock();
    const events: OverlayEvent[] = [];
    const onOverlay = (event: OverlayEvent): void => {
      events.push(event);
    };
    const renderer = await renderScene({ clock, target: 'exploded', onOverlay });

    try {
      await advanceClockFrame(renderer, clock, 0);

      const settled = settledEvents(events);

      expect(settled).toHaveLength(1);
      expect(settled[0]?.phase).toBe('exploded');
    } finally {
      await renderer.unmount();
    }
  });
});

describe('overlay settle helpers', () => {
  test('restKeyOf records the tween targets', () => {
    expect(key({ target: 'exploded', turns: 2, zoomFactor: ZOOM_BOUNDS.step })).toEqual({
      layout: layoutA,
      width: VIEWPORT.width,
      height: VIEWPORT.height,
      target: 'exploded',
      turns: 2,
      zoomFactor: ZOOM_BOUNDS.step,
    });
  });

  test('isAtRest requires every explode progress to equal the target', () => {
    const fit = fitZoom(layoutA.bounds.exploded, VIEWPORT);
    const rest: RestStateInput = {
      progress: progressFor(layoutA, 1),
      target: 'exploded',
      azimuth: azimuthOf(0),
      turns: 0,
      cameraZoom: fit * ZOOM_BOUNDS.min,
      fitZoom: fit,
      zoomFactor: ZOOM_BOUNDS.min,
    };

    expect(isAtRest(rest)).toBe(true);

    const mid = progressFor(layoutA, 1);
    mid[0] = 0.5;
    expect(isAtRest({ ...rest, progress: mid })).toBe(false);
    expect(isAtRest({ ...rest, progress: null })).toBe(true);
    expect(isAtRest({ ...rest, progress: progressFor(layoutA, 0) })).toBe(false);
  });

  test('isAtRest requires the rig azimuth and the camera fit product', () => {
    const fit = fitZoom(layoutA.bounds.exploded, VIEWPORT);
    const rest: RestStateInput = {
      progress: null,
      target: 'imploded',
      azimuth: azimuthOf(1),
      turns: 1,
      cameraZoom: fit * ZOOM_BOUNDS.step,
      fitZoom: fit,
      zoomFactor: ZOOM_BOUNDS.step,
    };

    expect(isAtRest(rest)).toBe(true);
    expect(isAtRest({ ...rest, azimuth: null })).toBe(true);
    expect(isAtRest({ ...rest, azimuth: azimuthOf(0) })).toBe(false);
    expect(isAtRest({ ...rest, cameraZoom: fit })).toBe(false);
  });

  test('settlePhase applies the target, zoom, turn, target precedence', () => {
    const imploded = key();
    const exploded = key({ target: 'exploded' });

    expect(settlePhase(null, imploded)).toBe('imploded');
    expect(settlePhase(imploded, exploded)).toBe('exploded');
    expect(settlePhase(exploded, imploded)).toBe('imploded');
    expect(settlePhase(exploded, key({ target: 'exploded', zoomFactor: 1.25 }))).toBe('zoomed');
    expect(settlePhase(exploded, key({ target: 'exploded', turns: 1 }))).toBe('turned');
    expect(settlePhase(exploded, key({ target: 'exploded', width: 400 }))).toBe('exploded');
    expect(
      settlePhase(exploded, key({ target: 'exploded', zoomFactor: 1.25, turns: 1 })),
    ).toBe('zoomed');
  });
});
