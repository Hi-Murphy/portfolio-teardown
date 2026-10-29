import { describe, expect, test } from 'vitest';

import { ProjectSchema } from '../src/index';
import { minimalProject } from './helpers';

describe('project schema', () => {
  test('parses a minimal project and applies every documented default', () => {
    const project = ProjectSchema.parse(minimalProject());

    expect(project).toEqual({
      schemaVersion: 1,
      meta: { slug: 'demo', name: 'Demo', links: [] },
      story: { metrics: [] },
      layers: [
        {
          id: 'core',
          name: 'Core',
          components: [
            {
              id: 'app',
              name: 'App',
              kind: 'module',
              status: 'shipped',
              techs: [],
              links: [],
              metrics: [],
            },
          ],
        },
      ],
      flows: [],
    });
  });

  test('NEGATIVE: missing meta.name is rejected at meta.name', () => {
    const result = ProjectSchema.safeParse({
      schemaVersion: 1,
      meta: { slug: 'demo' },
      layers: [{ id: 'core', name: 'Core' }],
    });

    expect(result.success).toBe(false);
    if (result.success) throw new Error('Expected a missing meta.name to be rejected');

    expect(result.error.issues[0]?.path).toEqual(['meta', 'name']);
  });

  test('rejects a project without schemaVersion', () => {
    const result = ProjectSchema.safeParse({
      meta: { slug: 'demo', name: 'Demo' },
      layers: [{ id: 'core', name: 'Core' }],
    });

    expect(result.success).toBe(false);
  });

  test('rejects schemaVersion 2', () => {
    const result = ProjectSchema.safeParse({ ...minimalProject(), schemaVersion: 2 });

    expect(result.success).toBe(false);
  });

  test('rejects an empty layers array', () => {
    const result = ProjectSchema.safeParse({ ...minimalProject(), layers: [] });

    expect(result.success).toBe(false);
  });

  test('rejects a duplicate component id across layers', () => {
    const result = ProjectSchema.safeParse({
      ...minimalProject(),
      layers: [
        { id: 'first', name: 'First', components: [{ id: 'duplicate', name: 'One' }] },
        { id: 'second', name: 'Second', components: [{ id: 'duplicate', name: 'Two' }] },
      ],
    });

    expect(result.success).toBe(false);
  });

  test('rejects a flow path with one entry', () => {
    const result = ProjectSchema.safeParse({
      ...minimalProject(),
      flows: [{ path: ['app'] }],
    });

    expect(result.success).toBe(false);
  });

  test('rejects a flow path naming a missing component', () => {
    const result = ProjectSchema.safeParse({
      ...minimalProject(),
      flows: [{ path: ['app', 'missing'] }],
    });

    expect(result.success).toBe(false);
    if (result.success) throw new Error('Expected a missing flow component to be rejected');

    expect(result.error.issues[0]?.path).toEqual(['flows', 0, 'path', 1]);
  });

  test('rejects an unknown key on a layer', () => {
    const result = ProjectSchema.safeParse({
      ...minimalProject(),
      layers: [{ id: 'core', name: 'Core', colour: 'blue' }],
    });

    expect(result.success).toBe(false);
  });

  test('defaults a flow id to flow-1', () => {
    const project = ProjectSchema.parse({
      ...minimalProject(),
      layers: [
        {
          id: 'core',
          name: 'Core',
          components: [
            { id: 'app', name: 'App' },
            { id: 'database', name: 'Database' },
          ],
        },
      ],
      flows: [{ path: ['app', 'database'] }],
    });

    expect(project.flows[0]?.id).toBe('flow-1');
  });
});
