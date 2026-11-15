import ReactThreeTestRenderer from '@react-three/test-renderer';
import { createElement } from 'react';
import { Color, InstancedMesh, MeshLambertMaterial } from 'three';
import { describe, expect, test } from 'vitest';

import { INITIAL_RIG } from '../src/engine/camera';
import { emphasisTargets } from '../src/interaction/emphasis';
import { layoutProject } from '../src/layout';
import { motion } from '../src/motion';
import { emphasis } from '../src/motion/emphasis';
import { parseProject, parseTechRegistry } from '../src/index';
import type { EmphasisState } from '../src/react/scene/Emphasis';
import { Scene, type SceneProps } from '../src/react/scene/Scene';
import { blueprint } from '../src/theme';
import { projectAJson, techRegistryJson } from './fixtures';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const registry = parseTechRegistry(techRegistryJson);
const projectA = parseProject(projectAJson, { registry });
const layoutA = layoutProject(projectA);
const A = 'tide-view-model';
const B = 'tide-repository';
const input = {
  focusLayerId: null,
  focusSuspended: false,
  tourComponentId: null,
} as const;

function indexOf(id: string): number {
  const index = layoutA.components.findIndex((component) => component.id === id);

  if (index === -1) throw new Error(`Missing component ${id}`);
  return index;
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
  if (!(mesh.material instanceof MeshLambertMaterial)) {
    throw new Error('Expected a MeshLambertMaterial');
  }

  return mesh.material.color.clone().multiply(instanceColor(mesh, index));
}

function expectColor(actual: Color, expected: Color, message: string): void {
  expect(actual.r, `${message} red`).toBeCloseTo(expected.r, 6);
  expect(actual.g, `${message} green`).toBeCloseTo(expected.g, 6);
  expect(actual.b, `${message} blue`).toBeCloseTo(expected.b, 6);
}

function sceneProps(emphasisState: EmphasisState, now: () => number): SceneProps {
  return {
    layout: layoutA,
    palette: blueprint.light,
    tokens: motion,
    target: 'imploded',
    rig: INITIAL_RIG,
    now,
    slug: projectA.meta.slug,
    emphasis: emphasisState,
  };
}

describe('selected emphasis', () => {
  test('lights highlight and selected together', () => {
    const targets = emphasisTargets(layoutA, { ...input, highlight: B, selected: A });

    expect(targets.hover[indexOf(A)]).toBe(1);
    expect(targets.hover[indexOf(B)]).toBe(1);
    expect(targets.hover.reduce((sum, value) => sum + value, 0)).toBe(2);
  });

  test('lights selected without a highlight', () => {
    const targets = emphasisTargets(layoutA, { ...input, highlight: null, selected: A });

    expect(targets.hover[indexOf(A)]).toBe(1);
  });

  test('lights one component when selected equals highlight', () => {
    const targets = emphasisTargets(layoutA, { ...input, highlight: A, selected: A });
    const lit = Array.from(targets.hover).flatMap((value, index) => (value === 1 ? [index] : []));

    expect(lit).toEqual([indexOf(A)]);
  });

  test('keeps the existing targets when selected is undefined', () => {
    const without = emphasisTargets(layoutA, { ...input, highlight: B });
    const explicit = emphasisTargets(layoutA, { ...input, highlight: B, selected: undefined });

    expect(Array.from(explicit.hover)).toEqual(Array.from(without.hover));
    expect(Array.from(explicit.tour)).toEqual(Array.from(without.tour));
    expect(Array.from(explicit.dim)).toEqual(Array.from(without.dim));
    expect(without.hover[indexOf(B)]).toBe(1);
  });

  test('drives both component colours through the emphasis driver', async () => {
    let seconds = 0;
    const state: EmphasisState = {
      highlight: B,
      selected: A,
      focusLayerId: null,
      focusSuspended: false,
      tourComponentId: null,
    };
    const renderer = await ReactThreeTestRenderer.create(
      createElement(
        Scene,
        sceneProps(state, () => seconds),
      ),
      { orthographic: true },
    );

    try {
      const components = renderer.scene
        .findAll((node) => node.instance instanceof InstancedMesh)
        .map((node) => node.instance as InstancedMesh)
        .find((mesh) => mesh.count === layoutA.components.length);

      if (components === undefined) throw new Error('Missing component instances');

      seconds = motion.durations.hoverLift;
      await renderer.advanceFrames(1, 0.05);

      const expected = new Color(blueprint.light[emphasis.highlight.role]);

      expectColor(effectiveColor(components, indexOf(A)), expected, 'selected');
      expectColor(effectiveColor(components, indexOf(B)), expected, 'highlight');
    } finally {
      await renderer.unmount();
    }
  });
});
