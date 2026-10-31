import ReactThreeTestRenderer from '@react-three/test-renderer';
import {
  InstancedBufferAttribute,
  InstancedMesh,
  Material,
  MeshLambertMaterial,
  ShaderLib,
} from 'three';
import { describe, expect, test } from 'vitest';

import { INITIAL_RIG } from '../src/engine/camera';
import { kindFill, layerFill, type Rgb } from '../src/look/fills';
import { look } from '../src/look/tokens';
import { layoutProject, type ProjectLayout } from '../src/layout';
import { motion } from '../src/motion';
import { parseProject, parseTechRegistry, type Project } from '../src/index';
import { Scene, type SceneProps } from '../src/react/scene/Scene';
import { BLUEPRINT_PROGRAM_CACHE_KEY } from '../src/react/scene/blueprintMaterial';
import type { ComponentKind } from '../src/schema/constants';
import { blueprint, type Palette } from '../src/theme';
import { projectAJson, techRegistryJson } from './fixtures';

declare global {
  interface ImportMeta {
    glob(
      pattern: string,
      options: { query: string; import: string; eager: true },
    ): Record<string, string>;
  }
}

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const registry = parseTechRegistry(techRegistryJson);
const projectA = parseProject(projectAJson, { registry });
const layoutA = layoutProject(projectA);
const kindsA = projectA.layers.flatMap((layer) =>
  layer.components.map((component) => component.kind),
);
const viewerSource = Object.values(
  import.meta.glob('../src/react/TeardownViewer.tsx', {
    query: '?raw',
    import: 'default',
    eager: true,
  }),
)[0];
type TestRenderer = Awaited<ReturnType<typeof ReactThreeTestRenderer.create>>;

interface FillMesh extends InstancedMesh {
  readonly instanceFill?: InstancedBufferAttribute;
}

interface ShaderSource {
  vertexShader: string;
  fragmentShader: string;
  uniforms: Record<string, { value: unknown }>;
}

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

function fillOf(mesh: InstancedMesh): InstancedBufferAttribute {
  const attribute = (mesh as FillMesh).instanceFill;

  if (attribute === undefined) throw new Error('Expected instanceFill');
  return attribute;
}

function shaderSource(material: MeshLambertMaterial): ShaderSource {
  const shader: ShaderSource = {
    vertexShader: ShaderLib.lambert.vertexShader,
    fragmentShader: ShaderLib.lambert.fragmentShader,
    uniforms: {},
  };

  material.onBeforeCompile(shader as never, {} as never);
  return shader;
}

function expectFill(attribute: InstancedBufferAttribute, index: number, expected: Rgb): void {
  expect(attribute.array[index * 3]).toBeCloseTo(expected[0], 6);
  expect(attribute.array[index * 3 + 1]).toBeCloseTo(expected[1], 6);
  expect(attribute.array[index * 3 + 2]).toBeCloseTo(expected[2], 6);
}

function expectFills(
  renderer: TestRenderer,
  layout: ProjectLayout,
  kinds: readonly ComponentKind[],
  palette: Palette,
): void {
  const layers = fillOf(meshWithCount(renderer, layout.layers.length));
  const components = fillOf(meshWithCount(renderer, layout.components.length));
  const expectedLayer = layerFill(palette);

  layout.layers.forEach((_, index) => expectFill(layers, index, expectedLayer));
  layout.components.forEach((_, index) => {
    expectFill(components, index, kindFill(palette, kinds[index] ?? 'module'));
  });
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

describe('blueprint scene', () => {
  test.each([
    ['light', blueprint.light],
    ['dark', blueprint.dark],
  ] as const)('patches both Lambert materials in the %s palette', async (_, palette: Palette) => {
    const renderer = await renderScene(projectA, layoutA, {
      palette,
      look,
      kinds: kindsA,
    });

    try {
      expect(instancedMeshes(renderer)).toHaveLength(2);

      for (const mesh of instancedMeshes(renderer)) {
        const material = materialOf(mesh);
        const source = shaderSource(material);
        const combined = `${source.vertexShader}\n${source.fragmentShader}`;

        expect(material).toBeInstanceOf(MeshLambertMaterial);
        expect(material.customProgramCacheKey()).toBe(BLUEPRINT_PROGRAM_CACHE_KEY);
        expect(source.uniforms.uBase?.value).toBe(material.color);
        expect(combined).toContain('instanceFill');
        expect(combined).toContain('vEmphasis');
        expect(combined).toContain('fwidth(');
        expect(source.fragmentShader).not.toContain('#include <opaque_fragment>');
        expect(source.fragmentShader).toContain('#include <colorspace_fragment>');
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
  ] as const)('mounts linear instance fills in the %s palette', async (_, palette: Palette) => {
    const renderer = await renderScene(projectA, layoutA, {
      palette,
      look,
      kinds: kindsA,
    });

    try {
      expect(instancedMeshes(renderer)).toHaveLength(2);
      expectFills(renderer, layoutA, kindsA, palette);
    } finally {
      await renderer.unmount();
    }
  });

  test('rewrites instanceFill when the palette changes', async () => {
    const renderer = await renderScene(projectA, layoutA, {
      palette: blueprint.light,
      look,
      kinds: kindsA,
    });

    try {
      expectFills(renderer, layoutA, kindsA, blueprint.light);

      await renderer.update(
        <Scene
          {...sceneProps(projectA, layoutA, {
            palette: blueprint.dark,
            look,
            kinds: kindsA,
          })}
        />,
      );

      expectFills(renderer, layoutA, kindsA, blueprint.dark);
    } finally {
      await renderer.unmount();
    }
  });

  test('leaves the S5 scene path untouched without look', async () => {
    const renderer = await renderScene(projectA, layoutA);

    try {
      const meshes = instancedMeshes(renderer);

      expect(meshes).toHaveLength(2);

      for (const mesh of meshes) {
        const material = materialOf(mesh);

        expect(material.onBeforeCompile).toBe(Material.prototype.onBeforeCompile);
        expect(material.customProgramCacheKey()).not.toBe(BLUEPRINT_PROGRAM_CACHE_KEY);
        expect('instanceFill' in mesh).toBe(false);
        expect(mesh.geometry.getAttribute('instanceFill')).toBeUndefined();
        expect(Array.from(mesh.instanceColor?.array ?? [])).toEqual(
          Array.from({ length: mesh.count * 3 }, () => 1),
        );
      }
    } finally {
      await renderer.unmount();
    }
  });

  test('wires the product layout default through TeardownViewer', () => {
    expect(viewerSource).toContain('resolveViewerLayoutOptions(');
  });
});
