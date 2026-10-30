import { describe, expect, test } from 'vitest';

import { parseProject, parseTechRegistry } from '../src/index';
import { layoutProject } from '../src/layout';
import { projectCJson, techRegistryJson } from './fixtures';

const registry = parseTechRegistry(techRegistryJson);
const project = parseProject(projectCJson, { registry });
const components = project.layers.flatMap((layer) => layer.components);

describe('fixture C: Lockerbay', () => {
  test('parses as a locker-booking project with the seed registry', () => {
    expect(project.meta).toMatchObject({
      slug: 'lockerbay',
      name: 'Lockerbay',
    });
    expect(project.layers).toHaveLength(5);
    expect(components).toHaveLength(13);
    expect(project.flows).toHaveLength(2);
  });

  test('lays out the busiest layer on a three by two grid', () => {
    expect(layoutProject(project).footprint).toMatchObject({ cols: 3, rows: 2 });
  });

  test('is deterministic for repeated calls and a structured clone', () => {
    const layout = layoutProject(project);

    expect(layoutProject(project)).toStrictEqual(layout);
    expect(layoutProject(structuredClone(project))).toStrictEqual(layout);
  });

  test('matches the fixture C golden layout', () => {
    expect(layoutProject(project)).toMatchSnapshot();
  });

  test('keeps every flow path on known component ids', () => {
    const componentIds = new Set(components.map((component) => component.id));

    for (const flow of project.flows) {
      expect(flow.path.every((componentId) => componentIds.has(componentId))).toBe(true);
    }
  });

  test('uses all five kinds and the wip and planned statuses', () => {
    const kinds = new Set(components.map((component) => component.kind));
    const statuses = new Set(components.map((component) => component.status));

    expect(kinds).toEqual(new Set(['module', 'service', 'store', 'external', 'actor']));
    expect(statuses).toContain('wip');
    expect(statuses).toContain('planned');
  });

  test('gives every component a one-sentence caption', () => {
    for (const component of components) {
      expect(component.summary).toMatch(/^[^.!?]+\.$/);
    }
  });
});
