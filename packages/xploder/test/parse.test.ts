import { describe, expect, test } from 'vitest';
import { ZodError } from 'zod';

import {
  ProjectValidationError,
  XploderValidationError,
  defineProject,
  parseProject,
  parseTechRegistry,
  safeParseProject,
} from '../src/index';
import { techRegistryJson } from './fixtures';
import { minimalProject } from './helpers';

function projectWithUnknownTech() {
  return {
    ...minimalProject(),
    layers: [
      {
        id: 'core',
        name: 'Core',
        components: [{ id: 'app', name: 'App', techs: ['okhtp'] }],
      },
    ],
  };
}

describe('project parsing', () => {
  const registry = parseTechRegistry(techRegistryJson);

  test('NEGATIVE: an unknown tech id is rejected with the seed registry', () => {
    const result = safeParseProject(projectWithUnknownTech(), { registry });

    expect(result.success).toBe(false);
    if (result.success) throw new Error('Expected an unknown tech id to be rejected');

    expect(result.error.issues[0]?.path).toEqual(['layers', 0, 'components', 0, 'techs', 0]);
    expect(result.error.issues[0]?.message).toContain('okhtp');
  });

  test('accepts the same tech id when no registry is passed', () => {
    expect(() => parseProject(projectWithUnknownTech())).not.toThrow();
  });

  test('parseProject throws a ProjectValidationError with the zod cause and issues', () => {
    let thrown: unknown;

    try {
      parseProject({
        schemaVersion: 1,
        meta: { slug: 'demo' },
        layers: [{ id: 'core', name: 'Core' }],
      });
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBeInstanceOf(ProjectValidationError);
    expect(thrown).toBeInstanceOf(XploderValidationError);
    if (!(thrown instanceof ProjectValidationError)) {
      throw new Error('Expected ProjectValidationError');
    }

    expect(thrown.cause).toBeInstanceOf(ZodError);
    expect(thrown.issues.length).toBeGreaterThan(0);
  });

  test('safeParseProject returns a failure without throwing', () => {
    const result = safeParseProject({ schemaVersion: 1 });

    expect(result.success).toBe(false);
  });

  test('defineProject includes the source and issue path in its message', () => {
    let thrown: unknown;

    try {
      defineProject(projectWithUnknownTech(), {
        registry,
        source: 'content/demo.ts',
      });
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBeInstanceOf(ProjectValidationError);
    if (!(thrown instanceof ProjectValidationError)) {
      throw new Error('Expected ProjectValidationError');
    }

    expect(thrown.message).toContain('content/demo.ts');
    expect(thrown.message).toContain('layers[0].components[0].techs[0]');
  });

  test('error classes keep readable names after minification', () => {
    const error = new ProjectValidationError('x', new ZodError([]));

    expect(error.name).toBe('ProjectValidationError');
    expect(String(error)).toMatch(/^ProjectValidationError: /);
  });
});
