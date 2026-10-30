import ReactThreeTestRenderer from '@react-three/test-renderer';
import {
  Color,
  InstancedMesh,
  Matrix4,
  MeshLambertMaterial,
  Quaternion,
  Vector3,
  type OrthographicCamera,
} from 'three';
import { describe, expect, test } from 'vitest';

import { INITIAL_RIG, type RigState } from '../src/engine/camera';
import { liftWorld } from '../src/interaction/emphasis';
import { layoutProject, VIEW, type ProjectLayout } from '../src/layout';
import { motion } from '../src/motion';
import { emphasis } from '../src/motion/emphasis';
import { parseProject, parseTechRegistry, type Project } from '../src/index';
import type { EmphasisState } from '../src/react/scene/Emphasis';
import { Scene, type SceneProps } from '../src/react/scene/Scene';
import { blueprint, type Palette } from '../src/theme';
import { projectAJson, techRegistryJson } from './fixtures';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const registry = parseTechRegistry(techRegistryJson);
const projectA = parseProject(projectAJson, { registry });
const layoutA = layoutProject(projectA);
type TestRenderer = Awaited<ReturnType<typeof ReactThreeTestRenderer.create>>;

function sceneProps(
  project: Project,
  layout: ProjectLayout,
  overrides: Partial<SceneProps> = {},
): SceneProps {
  return {
    layout,
    palette: blueprint.light,
    tokens: motion,
    target: 'imploded',
    rig: INITIAL_RIG,
    now: () => 0,
    slug: project.meta.slug,
    ...overrides,
  };
}

function instancedMeshes(renderer: TestRenderer): InstancedMesh[] {
  return renderer.scene
    .findAll((node) => node.instance instanceof InstancedMesh)
    .map((node) => node.instance as InstancedMesh);
}

function meshWithCount(renderer: TestRenderer, count: number): InstancedMesh {
  const mesh = instancedMeshes(renderer).find((candidate) => candidate.count === count);

  if (mesh === undefined) throw new Error(`Missing InstancedMesh with count ${count}`);
  return mesh;
}

function materialOf(mesh: InstancedMesh): MeshLambertMaterial {
  if (!(mesh.material instanceof MeshLambertMaterial)) {
    throw new Error('Expected a MeshLambertMaterial');
  }

  return mesh.material;
}

function instanceColor(mesh: InstancedMesh, index: number): Color {
  const attribute = mesh.instanceColor;

  if (attribute === null) throw new Error('Expected instanceColor');

  return new Color(
    attribute.array[index * 3] ?? 0,
    attribute.array[index * 3 + 1] ?? 0,
    attribute.array[index * 3 + 2] ?? 0,
  );
}

function effectiveColor(mesh: InstancedMesh, index: number): Color {
  return materialOf(mesh).color.clone().multiply(instanceColor(mesh, index));
}

function expectColor(actual: Color, expected: Color, message: string): void {
  expect(actual.r, `${message} red`).toBeCloseTo(expected.r, 6);
  expect(actual.g, `${message} green`).toBeCloseTo(expected.g, 6);
  expect(actual.b, `${message} blue`).toBeCloseTo(expected.b, 6);
}

function renderScene(
  project: Project,
  layout: ProjectLayout,
  overrides: Partial<SceneProps> = {},
): Promise<TestRenderer> {
  return ReactThreeTestRenderer.create(<Scene {...sceneProps(project, layout, overrides)} />, {
    orthographic: true,
  });
}

describe('emphasis scene', () => {
  test.each([
    ['light', blueprint.light],
    ['dark', blueprint.dark],
  ] as const)('mounts neutral instance colours in the %s palette', async (_, palette: Palette) => {
    const renderer = await renderScene(projectA, layoutA, { palette });

    try {
      const meshes = instancedMeshes(renderer);

      expect(meshes).toHaveLength(2);

      for (const mesh of meshes) {
        expect(mesh.instanceColor).not.toBeNull();
        expect(Array.from(mesh.instanceColor?.array ?? [])).toEqual(
          Array.from({ length: mesh.count * 3 }, () => 1),
        );
      }

      expect(materialOf(meshWithCount(renderer, layoutA.layers.length)).color.getHexString()).toBe(
        palette.lineMuted.slice(1).toLowerCase(),
      );
      expect(
        materialOf(meshWithCount(renderer, layoutA.components.length)).color.getHexString(),
      ).toBe(palette.line.slice(1).toLowerCase());
    } finally {
      await renderer.unmount();
    }
  });

  test.each([
    ['light', blueprint.light],
    ['dark', blueprint.dark],
  ] as const)(
    'highlights a component and lifts it in the %s palette',
    async (_, palette: Palette) => {
      let seconds = 0;
      const now = () => seconds;
      const state: EmphasisState = {
        highlight: 'tide-view-model',
        focusLayerId: null,
        focusSuspended: false,
        tourComponentId: null,
      };
      const renderer = await renderScene(projectA, layoutA, { palette, now, emphasis: state });

      try {
        const components = meshWithCount(renderer, layoutA.components.length);
        const index = layoutA.components.findIndex((component) => component.id === state.highlight);
        const placement = layoutA.components[index];

        expect(index).toBeGreaterThanOrEqual(0);
        expect(placement).toBeDefined();

        seconds = motion.durations.hoverLift;
        await renderer.advanceFrames(1, 0.05);

        expectColor(
          effectiveColor(components, index),
          new Color(palette[emphasis.highlight.role]),
          'highlight',
        );

        const matrix = new Matrix4();
        const position = new Vector3();
        const quaternion = new Quaternion();
        const scale = new Vector3();

        components.getMatrixAt(index, matrix);
        matrix.decompose(position, quaternion, scale);

        const camera = renderer.scene.fiber.root.getState().camera as OrthographicCamera;
        const expectedLift = liftWorld(motion.distances.hoverLift, camera.zoom, VIEW.elevation);

        expect(position.y - (placement?.imploded[1] ?? 0)).toBeCloseTo(expectedLift, 7);
        expect(instancedMeshes(renderer)).toHaveLength(2);
      } finally {
        await renderer.unmount();
      }
    },
  );

  test.each([
    ['light', blueprint.light],
    ['dark', blueprint.dark],
  ] as const)(
    'dims every layer outside focus and keeps it through explode and rotation in the %s palette',
    async (_, palette: Palette) => {
      let seconds = 0;
      const now = () => seconds;
      const state: EmphasisState = {
        highlight: null,
        focusLayerId: 'data',
        focusSuspended: false,
        tourComponentId: null,
      };
      const renderer = await renderScene(projectA, layoutA, { palette, now, emphasis: state });

      try {
        seconds = motion.durations.hoverSettle;
        await renderer.advanceFrames(1, 0.05);

        const assertDimmed = (): void => {
          const layers = meshWithCount(renderer, layoutA.layers.length);
          const components = meshWithCount(renderer, layoutA.components.length);

          layoutA.layers.forEach((layer, index) => {
            const weight = layer.id === state.focusLayerId ? 0 : 1 - emphasis.dim.level;
            const expected = new Color(palette.lineMuted).lerp(new Color(palette.paper), weight);

            expectColor(effectiveColor(layers, index), expected, `layer ${layer.id}`);
          });

          layoutA.components.forEach((component, index) => {
            const weight = component.layerId === state.focusLayerId ? 0 : 1 - emphasis.dim.level;
            const expected = new Color(palette.line).lerp(new Color(palette.paper), weight);

            expectColor(effectiveColor(components, index), expected, `component ${component.id}`);
          });
        };

        assertDimmed();

        const rig: RigState = { ...INITIAL_RIG, step: 1, turns: 1 };

        await renderer.update(
          <Scene
            {...sceneProps(projectA, layoutA, {
              palette,
              now,
              emphasis: state,
              target: 'exploded',
              rig,
            })}
          />,
        );

        seconds = motion.durations.explode + motion.staggers.explodeLayer * layoutA.layers.length;
        await renderer.advanceFrames(1, 0.1);

        assertDimmed();
        expect(instancedMeshes(renderer)).toHaveLength(2);
      } finally {
        await renderer.unmount();
      }
    },
  );
});
