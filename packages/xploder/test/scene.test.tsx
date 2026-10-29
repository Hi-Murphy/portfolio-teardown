import ReactThreeTestRenderer from '@react-three/test-renderer';
import { InstancedMesh, MeshLambertMaterial, type OrthographicCamera } from 'three';
import { describe, expect, test } from 'vitest';

import { INITIAL_RIG, type RigState } from '../src/engine/camera';
import { layoutProject, type ProjectLayout } from '../src/layout';
import { motion, resolveMotion } from '../src/motion';
import { parseProject, parseTechRegistry, type Project } from '../src/index';
import { Scene, type SceneProps } from '../src/react/scene/Scene';
import type { ViewerStats } from '../src/react/scene/Stats';
import { blueprint, type Palette } from '../src/theme';
import { projectAJson, projectBJson, techRegistryJson } from './fixtures';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const registry = parseTechRegistry(techRegistryJson);
const projectA = parseProject(projectAJson, { registry });
const projectB = parseProject(projectBJson, { registry });
const layoutA = layoutProject(projectA);
const layoutB = layoutProject(projectB);
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

function materialColor(renderer: TestRenderer, count: number): string {
  const material = meshWithCount(renderer, count).material;

  if (!(material instanceof MeshLambertMaterial)) {
    throw new Error('Expected a MeshLambertMaterial');
  }

  return material.color.getHexString();
}

function normalize(angle: number): number {
  const fullTurn = Math.PI * 2;
  return ((angle % fullTurn) + fullTurn) % fullTurn;
}

function cameraAzimuth(renderer: TestRenderer): number {
  const camera = renderer.scene.fiber.root.getState().camera;
  return normalize(Math.atan2(camera.position.x, camera.position.z));
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

describe('Scene', () => {
  test.each([
    ['A', projectA, layoutA, 4, 8],
    ['B', projectB, layoutB, 4, 5],
  ] as const)(
    'renders fixture %s with two instanced meshes',
    async (_, project, layout, layers, components) => {
      const renderer = await renderScene(project, layout);

      try {
        expect(instancedMeshes(renderer)).toHaveLength(2);
        expect(meshWithCount(renderer, layers)).toBeDefined();
        expect(meshWithCount(renderer, components)).toBeDefined();
      } finally {
        await renderer.unmount();
      }
    },
  );

  test('reports changed renderer stats with layout instance counts', async () => {
    const stats: ViewerStats[] = [];
    const renderer = await renderScene(projectA, layoutA, {
      onStats: (value) => stats.push(value),
    });

    try {
      await renderer.advanceFrames(1, 0.1);
      expect(stats.length).toBeGreaterThan(0);
      expect(stats.at(-1)?.instances).toEqual({
        layers: layoutA.layers.length,
        components: layoutA.components.length,
      });

      const frame = stats.at(-1)?.frame ?? 0;

      await renderer.advanceFrames(1, 0.1);
      expect(stats.at(-1)?.frame).toBeGreaterThan(frame);
    } finally {
      await renderer.unmount();
    }
  });

  test('uses an orthographic camera, no controls, and the initial azimuth', async () => {
    const renderer = await renderScene(projectA, layoutA);

    try {
      const state = renderer.scene.fiber.root.getState();

      expect((state.camera as OrthographicCamera).isOrthographicCamera).toBe(true);
      expect(state.controls).toBeNull();
      expect(cameraAzimuth(renderer)).toBeCloseTo(Math.PI / 4, 9);
    } finally {
      await renderer.unmount();
    }
  });

  test('animates a right turn from 45 to 135 degrees on the injected clock', async () => {
    let seconds = 0;
    const now = () => seconds;
    const renderer = await renderScene(projectA, layoutA, { now });

    try {
      const turned: RigState = { ...INITIAL_RIG, step: 1, turns: 1 };

      await renderer.update(<Scene {...sceneProps(projectA, layoutA, { now, rig: turned })} />);
      seconds = 1;
      await renderer.advanceFrames(1, 0.1);

      expect(cameraAzimuth(renderer)).toBeCloseTo((Math.PI * 3) / 4, 9);
    } finally {
      await renderer.unmount();
    }
  });

  test('reports phases once per settle and cuts under reduced motion', async () => {
    let seconds = 0;
    const phases: string[] = [];
    const settled: string[] = [];
    const now = () => seconds;
    const renderer = await renderScene(projectA, layoutA, {
      now,
      onPhase: (phase) => phases.push(phase),
      onSettled: (state) => settled.push(state),
    });

    try {
      expect(phases).toEqual(['imploded']);
      expect(settled).toEqual(['imploded']);

      await renderer.update(
        <Scene
          {...sceneProps(projectA, layoutA, {
            now,
            target: 'exploded',
            onPhase: (phase) => phases.push(phase),
            onSettled: (state) => settled.push(state),
          })}
        />,
      );
      expect(phases.at(-1)).toBe('exploding');

      seconds = 2;
      await renderer.advanceFrames(1, 0.1);
      expect(phases.at(-1)).toBe('exploded');
      expect(settled).toEqual(['imploded', 'exploded']);
    } finally {
      await renderer.unmount();
    }

    const staticTokens = resolveMotion(true);
    const reducedPhases: string[] = [];
    const reducedSettled: string[] = [];
    const reducedRenderer = await renderScene(projectA, layoutA, {
      now,
      tokens: staticTokens,
      onPhase: (phase) => reducedPhases.push(phase),
      onSettled: (state) => reducedSettled.push(state),
    });

    try {
      await reducedRenderer.update(
        <Scene
          {...sceneProps(projectA, layoutA, {
            now,
            tokens: staticTokens,
            target: 'exploded',
            onPhase: (phase) => reducedPhases.push(phase),
            onSettled: (state) => reducedSettled.push(state),
          })}
        />,
      );

      expect(reducedPhases.at(-1)).toBe('exploded');
      expect(reducedSettled).toEqual(['imploded', 'exploded']);
    } finally {
      await reducedRenderer.unmount();
    }
  });

  test.each([
    ['light', blueprint.light],
    ['dark', blueprint.dark],
  ] as const)('uses the %s palette material colors', async (_, palette: Palette) => {
    const renderer = await renderScene(projectA, layoutA, { palette });

    try {
      expect(materialColor(renderer, layoutA.layers.length)).toBe(
        palette.lineMuted.slice(1).toLowerCase(),
      );
      expect(materialColor(renderer, layoutA.components.length)).toBe(
        palette.line.slice(1).toLowerCase(),
      );
    } finally {
      await renderer.unmount();
    }
  });
});
