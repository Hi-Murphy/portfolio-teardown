import { describe, expect, test } from 'vitest';
import { ZodError } from 'zod';

import {
  TechRegistrySchema,
  TechRegistryValidationError,
  defineTechRegistry,
  parseTechRegistry,
} from '../src/index';
import { techRegistryJson } from './fixtures';

const okhttp = {
  id: 'okhttp',
  label: 'OkHttp',
  category: 'network',
} as const;

describe('tech registry', () => {
  test('parses the seed registry and defaults okhttp to its category color', () => {
    const registry = parseTechRegistry(techRegistryJson);

    expect(registry.techs).toHaveLength(12);
    expect(registry.techs.find((tech) => tech.id === 'okhttp')).toMatchObject({
      color: 'tech-network',
    });
  });

  test('rejects a duplicate id at the duplicate entry', () => {
    const result = TechRegistrySchema.safeParse({
      schemaVersion: 1,
      techs: [okhttp, okhttp],
    });

    expect(result.success).toBe(false);
    if (result.success) throw new Error('Expected duplicate id to be rejected');

    expect(result.error.issues[0]?.path).toEqual(['techs', 1, 'id']);
    expect(result.error.issues[0]?.message).toBe('Duplicate tech id "okhttp".');
  });

  test('rejects an unknown category', () => {
    const result = TechRegistrySchema.safeParse({
      schemaVersion: 1,
      techs: [{ ...okhttp, category: 'unknown' }],
    });

    expect(result.success).toBe(false);
    if (result.success) throw new Error('Expected category to be rejected');

    expect(result.error.issues[0]?.path).toEqual(['techs', 0, 'category']);
  });

  test('rejects a hex color', () => {
    const result = TechRegistrySchema.safeParse({
      schemaVersion: 1,
      techs: [{ ...okhttp, color: '#ff0000' }],
    });

    expect(result.success).toBe(false);
    if (result.success) throw new Error('Expected hex color to be rejected');

    expect(result.error.issues[0]?.path).toEqual(['techs', 0, 'color']);
  });

  test('defineTechRegistry throws a registry validation error with the path', () => {
    let thrown: unknown;

    try {
      defineTechRegistry({ schemaVersion: 1, techs: [okhttp, okhttp] });
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBeInstanceOf(TechRegistryValidationError);
    if (!(thrown instanceof TechRegistryValidationError)) {
      throw new Error('Expected TechRegistryValidationError');
    }

    expect(thrown.message).toContain('Invalid tech registry:');
    expect(thrown.message).toContain('techs[1].id');
    expect(thrown.cause).toBeInstanceOf(ZodError);
    expect(thrown.issues.length).toBeGreaterThan(0);
  });
});
