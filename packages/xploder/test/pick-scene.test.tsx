import ReactThreeTestRenderer from '@react-three/test-renderer';
import { Raycaster, Vector2, Vector3, type OrthographicCamera } from 'three';
import { describe, expect, test } from 'vitest';

import { INITIAL_RIG, type RigState } from '../src/engine/camera';
import { pick, type Ray } from '../src/interaction/pick';
import {
  layoutProject,
  VIEW,
  type Box,
  type ProjectLayout,
  type SlabPlacement,
  type Vec3,
} from '../src/layout';
import { motion } from '../src/motion';
import { parseProject, parseTechRegistry } from '../src/index';
import { Scene } from '../src/react/scene/Scene';
import { blueprint } from '../src/theme';
import { projectAJson, techRegistryJson } from './fixtures';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const registry = parseTechRegistry(techRegistryJson);
const projectA = parseProject(projectAJson, { registry });
const layoutA = layoutProject(projectA);
const CAMERA_DISTANCE_MULTIPLIER = 4;

function add(left: Vec3, right: Vec3): Vec3 {
  return [left[0] + right[0], left[1] + right[1], left[2] + right[2]];
}

function scale(value: Vec3, factor: number): Vec3 {
  return [value[0] * factor, value[1] * factor, value[2] * factor];
}

function centerAt(placement: SlabPlacement, progress: number): Vec3 {
  return [
    placement.imploded[0] + (placement.exploded[0] - placement.imploded[0]) * progress,
    placement.imploded[1] + (placement.exploded[1] - placement.imploded[1]) * progress,
    placement.imploded[2] + (placement.exploded[2] - placement.imploded[2]) * progress,
  ];
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

describe('pick scene', () => {
  test.each([
    ['imploded', 0, 0],
    ['imploded', 1, 1],
    ['imploded', 2, 2],
    ['imploded', 3, 3],
    ['exploded', 0, 0],
    ['exploded', 1, 1],
    ['exploded', 2, 2],
    ['exploded', 3, 3],
  ] as const)(
    'the real camera and pure model agree for every component: %s, rig step %i',
    async (target, step, turns) => {
      const renderer = await ReactThreeTestRenderer.create(sceneFor(target, step), {
        orthographic: true,
      });

      try {
        const camera = renderer.scene.fiber.root.getState().camera as OrthographicCamera;
        const progressValue = target === 'exploded' ? 1 : 0;
        const progress = progressFor(layoutA, progressValue);
        const distance = cameraDistance(layoutA.bounds.exploded);
        const azimuth = VIEW.baseAzimuth + turns * VIEW.snap;
        const raycaster = new Raycaster();

        camera.updateMatrixWorld(true);
        camera.updateProjectionMatrix();

        layoutA.components.forEach((component, index) => {
          const center = centerAt(component, progressValue);
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
          const actual = pick(realRay, layoutA, progress);
          const expected = pick(modelRayThrough(center, azimuth, distance), layoutA, progress);

          expect(actual, `${target}, ${component.id}, real camera vs model`).toBe(expected);

          if (component.layerIndex === 0) {
            expect(actual, `${target}, ${component.id}, top layer`).toBe(index);
          }
        });
      } finally {
        await renderer.unmount();
      }
    },
  );
});
