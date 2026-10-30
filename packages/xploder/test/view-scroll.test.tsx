import ReactThreeTestRenderer from '@react-three/test-renderer';
import { InstancedMesh, Matrix4, OrthographicCamera, Raycaster, Vector2, Vector3 } from 'three';
import { describe, expect, test } from 'vitest';

import { INITIAL_RIG, type RigState } from '../src/engine/camera';
import { pick, type Ray } from '../src/interaction/pick';
import { offsetFor } from '../src/interaction/scroll';
import {
  fitZoom,
  layoutProject,
  VIEW,
  type Box,
  type ProjectLayout,
  type Vec3,
} from '../src/layout';
import { motion } from '../src/motion';
import { parseProject, parseTechRegistry } from '../src/index';
import { Scene, type SceneProps } from '../src/react/scene/Scene';
import { blueprint } from '../src/theme';
import { projectAJson, techRegistryJson } from './fixtures';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const registry = parseTechRegistry(techRegistryJson);
const projectA = parseProject(projectAJson, { registry });
const layoutA = layoutProject(projectA);
const CAMERA_DISTANCE_MULTIPLIER = 4;
const VIEWPORT = { width: 1280, height: 720 } as const;
type TestRenderer = Awaited<ReturnType<typeof ReactThreeTestRenderer.create>>;

class FakeScrollStage {
  scrollTop = 0;
  clientHeight = VIEWPORT.height;
  readonly dataset: DOMStringMap = {} as DOMStringMap;
  private readonly listeners = new Set<EventListener>();

  addEventListener(type: string, listener: EventListener): void {
    if (type === 'scroll') this.listeners.add(listener);
  }

  removeEventListener(type: string, listener: EventListener): void {
    if (type === 'scroll') this.listeners.delete(listener);
  }

  dispatchEvent(event: Event): boolean {
    for (const listener of this.listeners) listener(event);
    return true;
  }
}

function add(left: Vec3, right: Vec3): Vec3 {
  return [left[0] + right[0], left[1] + right[1], left[2] + right[2]];
}

function scale(value: Vec3, factor: number): Vec3 {
  return [value[0] * factor, value[1] * factor, value[2] * factor];
}

function cameraDistance(bounds: Box): number {
  const width = bounds.max[0] - bounds.min[0];
  const height = bounds.max[1] - bounds.min[1];
  const depth = bounds.max[2] - bounds.min[2];

  return CAMERA_DISTANCE_MULTIPLIER * (Math.hypot(width, height, depth) / 2);
}

function modelRayThrough(center: Vec3, azimuth: number, distance: number): Ray {
  const radius = distance * Math.cos(VIEW.elevation);
  const position: Vec3 = [
    radius * Math.sin(azimuth),
    distance * Math.sin(VIEW.elevation),
    radius * Math.cos(azimuth),
  ];

  return {
    origin: add(center, position),
    direction: scale(position, -1 / distance),
  };
}

function progressFor(layout: ProjectLayout, value: number): Float32Array {
  return new Float32Array(layout.layers.length + layout.components.length).fill(value);
}

function sceneProps(overrides: Partial<SceneProps> = {}): SceneProps {
  return {
    layout: layoutA,
    palette: blueprint.light,
    tokens: motion,
    target: 'exploded',
    rig: INITIAL_RIG,
    now: () => 0,
    slug: projectA.meta.slug,
    ...overrides,
  };
}

function instancedMeshes(renderer: TestRenderer): InstancedMesh[] {
  return renderer.scene
    .findAll((node) => node.instance instanceof InstancedMesh)
    .map((node) => node.instance as InstancedMesh);
}

describe('view scroll', () => {
  test('a projected screen point moves by exactly the view offset', () => {
    const bounds = layoutA.bounds.exploded;
    const distance = cameraDistance(bounds);
    const radius = distance * Math.cos(VIEW.elevation);
    const camera = new OrthographicCamera(
      -VIEWPORT.width / 2,
      VIEWPORT.width / 2,
      VIEWPORT.height / 2,
      -VIEWPORT.height / 2,
      0.1,
      2 * distance,
    );
    const point = new Vector3(0, 0, 0);
    const screenY = () => ((1 - point.clone().project(camera).y) * VIEWPORT.height) / 2;

    camera.position.set(
      radius * Math.sin(VIEW.baseAzimuth),
      distance * Math.sin(VIEW.elevation),
      radius * Math.cos(VIEW.baseAzimuth),
    );
    camera.lookAt(0, 0, 0);
    camera.zoom = fitZoom(bounds, VIEWPORT) * 2;
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld(true);

    const baseline = screenY();

    camera.setViewOffset(VIEWPORT.width, VIEWPORT.height, 0, 120, VIEWPORT.width, VIEWPORT.height);
    camera.updateProjectionMatrix();
    expect(baseline - screenY()).toBeCloseTo(120, 8);

    camera.setViewOffset(VIEWPORT.width, VIEWPORT.height, 0, -90, VIEWPORT.width, VIEWPORT.height);
    camera.updateProjectionMatrix();
    expect(screenY() - baseline).toBeCloseTo(90, 8);
  });

  test('the real camera pick still agrees with the pure model under an offset', async () => {
    const renderer = await ReactThreeTestRenderer.create(<Scene {...sceneProps()} />, {
      orthographic: true,
      width: VIEWPORT.width,
      height: VIEWPORT.height,
    });

    try {
      const camera = renderer.scene.fiber.root.getState().camera as OrthographicCamera;
      const progress = progressFor(layoutA, 1);
      const distance = cameraDistance(layoutA.bounds.exploded);
      const azimuth = VIEW.baseAzimuth;
      const raycaster = new Raycaster();

      camera.setViewOffset(
        VIEWPORT.width,
        VIEWPORT.height,
        0,
        160,
        VIEWPORT.width,
        VIEWPORT.height,
      );
      camera.updateProjectionMatrix();
      camera.updateMatrixWorld(true);

      layoutA.components.forEach((component) => {
        const center = component.exploded;
        const ndc = new Vector3(center[0], center[1], center[2]).project(camera);

        raycaster.setFromCamera(new Vector2(ndc.x, ndc.y), camera);

        const realRay: Ray = {
          origin: [raycaster.ray.origin.x, raycaster.ray.origin.y, raycaster.ray.origin.z],
          direction: [
            raycaster.ray.direction.x,
            raycaster.ray.direction.y,
            raycaster.ray.direction.z,
          ],
        };

        expect(pick(realRay, layoutA, progress), component.id).toBe(
          pick(modelRayThrough(center, azimuth, distance), layoutA, progress),
        );
      });
    } finally {
      await renderer.unmount();
    }
  });

  test('clears the view offset at zoom 1 and keeps two instanced meshes', async () => {
    const stage = new FakeScrollStage();
    const extents: number[] = [];
    const scrollRef = { current: stage as unknown as HTMLDivElement };
    let rig: RigState = INITIAL_RIG;
    const element = () => (
      <Scene
        {...sceneProps({
          rig,
          scrollRef,
          onScrollExtent: (extent) => extents.push(extent),
        })}
      />
    );
    const renderer = await ReactThreeTestRenderer.create(element(), {
      orthographic: true,
      width: VIEWPORT.width,
      height: VIEWPORT.height,
    });

    try {
      const camera = renderer.scene.fiber.root.getState().camera as OrthographicCamera;
      const baseline = new Matrix4().copy(camera.projectionMatrix);

      expect(camera.view?.enabled ?? false).toBe(false);
      expect(instancedMeshes(renderer)).toHaveLength(2);

      rig = { ...INITIAL_RIG, zoomFactor: 2 };
      await renderer.update(element());
      await renderer.advanceFrames(1, 0.1);

      const extent = extents.at(-1) ?? 0;

      expect(extent).toBeGreaterThan(0);
      expect(camera.view?.enabled).toBe(true);

      stage.scrollTop = extent;
      stage.dispatchEvent(new Event('scroll'));
      expect(camera.view?.offsetY).toBeCloseTo(offsetFor(extent, extent), 9);

      rig = INITIAL_RIG;
      await renderer.update(element());
      await renderer.advanceFrames(1, 0.1);

      expect(camera.view?.enabled ?? false).toBe(false);
      expect(Array.from(camera.projectionMatrix.elements)).toEqual(Array.from(baseline.elements));
      expect(instancedMeshes(renderer)).toHaveLength(2);
    } finally {
      await renderer.unmount();
    }
  });
});
