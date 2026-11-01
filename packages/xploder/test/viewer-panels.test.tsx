import ReactThreeTestRenderer from '@react-three/test-renderer';
import { Raycaster, Vector2, Vector3, type OrthographicCamera } from 'three';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { INITIAL_RIG, type RigState } from '../src/engine/camera';
import { pick, type Ray } from '../src/interaction/pick';
import { layoutProject, type ProjectLayout, type SlabPlacement, type Vec3 } from '../src/layout';
import { motion } from '../src/motion';
import { parseProject, parseTechRegistry } from '../src/index';
import { CLOSED } from '../src/panel/state';
import { resolveSlabClick } from '../src/panel/tourClick';
import { executeTourCommand } from '../src/react/panel/executeTourCommand';
import { pickAt } from '../src/react/panel/pickAt';
import {
  panelsMetadataOf,
  useViewerPanels,
  type ViewerPanelsHandle,
} from '../src/react/panel/useViewerPanels';
import { Scene } from '../src/react/scene/Scene';
import {
  useTeardownViewer,
  type TeardownViewerHandle,
  type ViewerProject,
} from '../src/react/useTeardownViewer';
import { blueprint } from '../src/theme';
import { projectAJson, techRegistryJson } from './fixtures';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const registry = parseTechRegistry(techRegistryJson);
const projectA = parseProject(projectAJson, { registry });
const layoutA = layoutProject(projectA);
const LIVE_UPDATE = projectA.flows.find((flow) => flow.id === 'live-update');

if (LIVE_UPDATE === undefined) throw new Error('Fixture A is missing the live-update flow.');

class FakeMediaQueryList {
  matches = false;
  private readonly listeners = new Set<() => void>();

  addEventListener(type: string, listener: () => void): void {
    if (type === 'change') this.listeners.add(listener);
  }

  removeEventListener(type: string, listener: () => void): void {
    if (type === 'change') this.listeners.delete(listener);
  }
}

class FakeWindow {
  readonly media = new FakeMediaQueryList();

  matchMedia(): MediaQueryList {
    return this.media as unknown as MediaQueryList;
  }

  addEventListener(): void {}

  removeEventListener(): void {}
}

interface PanelsCapture {
  readonly viewer: TeardownViewerHandle;
  readonly panels: ViewerPanelsHandle;
}

interface ViewerProbeProps {
  readonly project: ViewerProject;
  readonly now: () => number;
  readonly capture: (capture: PanelsCapture) => void;
}

function ViewerProbe({ project, now, capture }: ViewerProbeProps) {
  const viewer = useTeardownViewer({ project, now });
  const panels = useViewerPanels();

  capture({ viewer, panels });
  return null;
}

interface PanelsProbeProps {
  readonly capture: (panels: ViewerPanelsHandle) => void;
}

function PanelsProbe({ capture }: PanelsProbeProps) {
  capture(useViewerPanels());
  return null;
}

let browser: FakeWindow;

beforeEach(() => {
  browser = new FakeWindow();
  Object.defineProperty(globalThis, 'window', { configurable: true, value: browser });
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  Reflect.deleteProperty(globalThis, 'window');
});

async function run(action: () => void): Promise<void> {
  await ReactThreeTestRenderer.act(async () => action());
}

async function mountPanels() {
  let panels: ViewerPanelsHandle | null = null;
  const capture = (next: ViewerPanelsHandle) => {
    panels = next;
  };
  const renderer = await ReactThreeTestRenderer.create(<PanelsProbe capture={capture} />);
  const current = (): ViewerPanelsHandle => {
    if (panels === null) throw new Error('panel handle was not captured');
    return panels;
  };

  return { renderer, current };
}

async function mountViewer() {
  let capture: PanelsCapture | null = null;
  const captureNext = (next: PanelsCapture) => {
    capture = next;
  };
  const renderer = await ReactThreeTestRenderer.create(
    <ViewerProbe project={projectA} now={() => 0} capture={captureNext} />,
  );
  const current = (): PanelsCapture => {
    if (capture === null) throw new Error('viewer and panel handles were not captured');
    return capture;
  };

  return { renderer, current };
}

async function stepOnePlaying(current: () => PanelsCapture): Promise<void> {
  await run(() => {
    const { actions } = current().viewer;

    actions.play();
    actions.step();
    actions.play();
  });

  expect(current().viewer.tour).toMatchObject({ status: 'playing', step: 1 });
}

async function stepOnePaused(current: () => PanelsCapture): Promise<void> {
  await stepOnePlaying(current);
  await run(() => current().viewer.actions.pause());
  expect(current().viewer.tour).toMatchObject({ status: 'paused', step: 1 });
}

function clickSlab(current: PanelsCapture, hit: string): void {
  const decision = resolveSlabClick({
    hit,
    tour: {
      status: current.viewer.tour.status,
      flowId: current.viewer.tour.flowId,
      step: current.viewer.tour.step,
    },
    flows: projectA.flows,
  });

  if (decision.tour !== null) executeTourCommand(current.viewer.actions, decision.tour);
  if (decision.panelEvent !== null) panelsMetadataOf(current.panels).dispatch(decision.panelEvent);
}

describe('useViewerPanels', () => {
  test('opens details, toggles the case study twice, and closes through the public actions', async () => {
    const { renderer, current } = await mountPanels();

    try {
      expect(current().state).toEqual(CLOSED);
      expect(current().ids.caseStudy).not.toBe(current().ids.detail);

      await run(() => current().actions.openDetail('tide-repository'));
      expect(current().state).toEqual({ kind: 'detail', componentId: 'tide-repository' });

      await run(() => current().actions.toggleCaseStudy());
      expect(current().state).toEqual({ kind: 'caseStudy' });

      await run(() => current().actions.toggleCaseStudy());
      expect(current().state).toEqual(CLOSED);

      await run(() => current().actions.openDetail('beachgoer'));
      expect(current().state).toEqual({ kind: 'detail', componentId: 'beachgoer' });

      await run(() => current().actions.close());
      expect(current().state).toEqual(CLOSED);

      await run(() => panelsMetadataOf(current()).dispatch({ type: 'slab', hit: 'tide-cache' }));
      expect(current().state).toEqual({ kind: 'detail', componentId: 'tide-cache' });
    } finally {
      await renderer.unmount();
    }
  });
});

describe('tour command executor with the real viewer handle', () => {
  test('clicking a later path step while playing jumps there and keeps playing', async () => {
    const { renderer, current } = await mountViewer();

    try {
      await stepOnePlaying(current);

      await run(() => clickSlab(current(), 'tide-repository'));

      expect(current().viewer.tour).toMatchObject({ status: 'playing', step: 3 });
      expect(current().panels.state).toEqual(CLOSED);
    } finally {
      await renderer.unmount();
    }
  });

  test('clicking a later path step while paused jumps there and stays paused', async () => {
    const { renderer, current } = await mountViewer();

    try {
      await stepOnePaused(current);

      const target = LIVE_UPDATE.path[4];

      if (target === undefined) throw new Error('Fixture A flow is shorter than expected.');

      await run(() => clickSlab(current(), target));

      expect(current().viewer.tour).toMatchObject({ status: 'paused', step: 4 });
      expect(current().panels.state).toEqual(CLOSED);
    } finally {
      await renderer.unmount();
    }
  });

  test('clicking outside the flow pauses, opens the detail, and Play resumes the same step', async () => {
    const { renderer, current } = await mountViewer();

    try {
      await stepOnePlaying(current);

      await run(() => clickSlab(current(), 'forecast-details-panel'));

      expect(current().viewer.tour).toMatchObject({ status: 'paused', step: 1 });
      expect(current().panels.state).toEqual({
        kind: 'detail',
        componentId: 'forecast-details-panel',
      });

      await run(() => current().viewer.actions.play());

      expect(current().viewer.tour).toMatchObject({ status: 'playing', step: 1 });
      expect(current().panels.state).toEqual({
        kind: 'detail',
        componentId: 'forecast-details-panel',
      });
    } finally {
      await renderer.unmount();
    }
  });
});

function centerAt(placement: SlabPlacement, progress: number): Vec3 {
  return [
    placement.imploded[0] + (placement.exploded[0] - placement.imploded[0]) * progress,
    placement.imploded[1] + (placement.exploded[1] - placement.imploded[1]) * progress,
    placement.imploded[2] + (placement.exploded[2] - placement.imploded[2]) * progress,
  ];
}

function progressFor(layout: ProjectLayout, value: number): Float32Array {
  return new Float32Array(layout.layers.length + layout.components.length).fill(value);
}

function sceneFor(target: 'imploded' | 'exploded', step: RigState['step']) {
  const rig: RigState = { ...INITIAL_RIG, step, turns: step };

  return (
    <Scene
      layout={layoutA}
      palette={blueprint.light}
      tokens={motion}
      target={target}
      rig={rig}
      now={() => 0}
      slug={projectA.meta.slug}
    />
  );
}

function rayOf(raycaster: Raycaster): Ray {
  return {
    origin: [raycaster.ray.origin.x, raycaster.ray.origin.y, raycaster.ray.origin.z],
    direction: [raycaster.ray.direction.x, raycaster.ray.direction.y, raycaster.ray.direction.z],
  };
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

describe('pickAt', () => {
  test('matches the S5 picker on 20 seeded rays through the real camera', async () => {
    const renderer = await ReactThreeTestRenderer.create(sceneFor('exploded', 3), {
      orthographic: true,
    });

    try {
      const camera = renderer.scene.fiber.root.getState().camera as OrthographicCamera;
      const progress = progressFor(layoutA, 1);
      const random = mulberry32(0x5eed1234);
      const actualRaycaster = new Raycaster();
      const actualNdc = new Vector2();
      const expectedRaycaster = new Raycaster();
      const expectedNdc = new Vector2();
      const stageRect = { left: 31, top: 17, width: 917, height: 551 };
      const stage = { getBoundingClientRect: () => stageRect };
      const bridge = { camera, progress, onFrame: null };
      let hits = 0;

      camera.updateMatrixWorld(true);
      camera.updateProjectionMatrix();

      for (let index = 0; index < 20; index += 1) {
        const component = layoutA.components[index % layoutA.components.length];

        if (component === undefined) throw new Error('Fixture A has no components.');

        const center = centerAt(component, 1);
        const projected = new Vector3(center[0], center[1], center[2]).project(camera);
        const x = projected.x + (random() - 0.5) * 0.24;
        const y = projected.y + (random() - 0.5) * 0.24;

        expectedNdc.set(x, y);
        expectedRaycaster.setFromCamera(expectedNdc, camera);

        const expectedIndex = pick(rayOf(expectedRaycaster), layoutA, progress);
        const expectedId =
          expectedIndex === null ? null : (layoutA.components[expectedIndex]?.id ?? null);
        const clientX = stageRect.left + ((x + 1) / 2) * stageRect.width;
        const clientY = stageRect.top + ((1 - y) / 2) * stageRect.height;
        const actual = pickAt(stage, bridge, layoutA, actualRaycaster, actualNdc, clientX, clientY);

        expect(actual, `seeded ray ${index}`).toBe(expectedId);
        if (actual !== null) hits += 1;
      }

      expect(hits).toBeGreaterThan(0);
    } finally {
      await renderer.unmount();
    }
  });
});
