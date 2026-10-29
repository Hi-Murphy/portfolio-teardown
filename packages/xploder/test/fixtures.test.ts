import { describe, expect, test } from 'vitest';

import { parseProject, parseTechRegistry } from '../src/index';
import { loadJson } from './helpers';

const registry = parseTechRegistry(loadJson('./fixtures/tech-registry.json'));
const project = parseProject(loadJson('./fixtures/project-a-ui-app.json'), { registry });
const components = project.layers.flatMap((layer) => layer.components);

describe('fixture A: Tidewatch', () => {
  test('parses as a UI-centric project with the seed registry', () => {
    expect(project.meta).toMatchObject({
      slug: 'tidewatch',
      name: 'Tidewatch',
    });
    expect(project.layers.length).toBeGreaterThanOrEqual(3);
    expect(components.length).toBeGreaterThanOrEqual(6);
    expect(project.flows.length).toBeGreaterThanOrEqual(1);
  });

  test('uses at least six distinct registry tech ids', () => {
    const techIds = new Set(components.flatMap((component) => component.techs));

    expect(techIds.size).toBeGreaterThanOrEqual(6);
  });

  test('exercises component links, kinds, statuses, metrics, and story metrics', () => {
    const links = components.flatMap((component) => component.links);
    const kinds = new Set(components.map((component) => component.kind));
    const statuses = new Set(components.map((component) => component.status));

    expect(links.length).toBeGreaterThan(0);
    expect(links.every((link) => new URL(link.url).hostname === 'example.com')).toBe(true);
    expect(kinds.size).toBeGreaterThanOrEqual(3);
    expect(kinds).toContain('actor');
    expect(kinds).toContain('external');
    expect(statuses).toContain('wip');
    expect(statuses).toContain('planned');
    expect(components.some((component) => component.metrics.length > 0)).toBe(true);
    expect(project.story.metrics.length).toBeGreaterThan(0);
  });

  test('includes a live update flow of at least four hops', () => {
    const liveFlow = project.flows.find((flow) => flow.id === 'live-update');

    expect(liveFlow).toBeDefined();
    expect(liveFlow?.path.length).toBeGreaterThanOrEqual(4);
  });
});
