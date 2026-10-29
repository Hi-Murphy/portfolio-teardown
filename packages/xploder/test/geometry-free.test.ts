import { describe, expect, test } from 'vitest';
import { z } from 'zod';

import {
  ProjectSchema,
  ProjectValidationError,
  parseProject,
  safeParseProject,
} from '../src/index';
import { minimalProject } from './helpers';

const BANNED_EXACT_NAMES = [
  'x',
  'y',
  'z',
  'w',
  'h',
  'top',
  'left',
  'right',
  'bottom',
  'row',
  'col',
  'column',
  'span',
  'order',
  'index',
  'zindex',
  'depth',
] as const;

const BANNED_SUBSTRINGS = [
  'pos',
  'coord',
  'geom',
  'layout',
  'width',
  'height',
  'size',
  'offset',
  'rotat',
  'scale',
  'transform',
  'anchor',
  'align',
  'grid',
  'bounds',
  'rect',
  'margin',
  'padding',
] as const;

type GeometryRule = 'banned-name' | 'open-object' | 'untyped-node';

type GeometryIssue = {
  rule: GeometryRule;
  path: string;
  detail: string;
};

function isSchemaNode(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hasSchemaType(node: Record<string, unknown>): boolean {
  return (
    typeof node.type === 'string' ||
    Object.hasOwn(node, 'const') ||
    Array.isArray(node.enum) ||
    ['anyOf', 'oneOf', 'allOf'].some((keyword) => Array.isArray(node[keyword])) ||
    typeof node.$ref === 'string'
  );
}

function bannedPropertyReason(name: string): string | undefined {
  const lowerName = name.toLowerCase();

  if (BANNED_EXACT_NAMES.some((bannedName) => lowerName === bannedName)) {
    return `property "${name}" is an exact banned name`;
  }

  const bannedSubstring = BANNED_SUBSTRINGS.find((candidate) => lowerName.includes(candidate));
  return bannedSubstring
    ? `property "${name}" contains banned substring "${bannedSubstring}"`
    : undefined;
}

function findGeometryIssues(schema: unknown): GeometryIssue[] {
  const issues: GeometryIssue[] = [];

  function visit(value: unknown, path: string): void {
    if (!isSchemaNode(value)) return;

    if (!hasSchemaType(value)) {
      issues.push({
        rule: 'untyped-node',
        path,
        detail: 'schema node has no type, const, enum, anyOf/oneOf/allOf, or $ref',
      });
    }

    if (value.type === 'object' && value.additionalProperties !== false) {
      issues.push({
        rule: 'open-object',
        path,
        detail: 'object schema must set additionalProperties: false',
      });
    }

    if (isSchemaNode(value.properties)) {
      for (const [name, child] of Object.entries(value.properties)) {
        const reason = bannedPropertyReason(name);
        if (reason) {
          issues.push({ rule: 'banned-name', path: `${path}.properties.${name}`, detail: reason });
        }
        visit(child, `${path}.properties.${name}`);
      }
    }

    if (Array.isArray(value.items)) {
      value.items.forEach((item, index) => visit(item, `${path}.items[${index}]`));
    } else {
      visit(value.items, `${path}.items`);
    }

    if (Array.isArray(value.prefixItems)) {
      value.prefixItems.forEach((item, index) => visit(item, `${path}.prefixItems[${index}]`));
    }

    for (const keyword of ['anyOf', 'oneOf', 'allOf'] as const) {
      const alternatives = value[keyword];
      if (Array.isArray(alternatives)) {
        alternatives.forEach((alternative, index) =>
          visit(alternative, `${path}.${keyword}[${index}]`),
        );
      }
    }

    if (isSchemaNode(value.$defs)) {
      for (const [name, definition] of Object.entries(value.$defs)) {
        visit(definition, `${path}.$defs.${name}`);
      }
    }

    visit(value.additionalProperties, `${path}.additionalProperties`);
  }

  visit(schema, '$');
  return issues;
}

describe('geometry-free project schema', () => {
  const projectJsonSchema = z.toJSONSchema(ProjectSchema, { io: 'input' });

  test('has no banned property name in the input JSON Schema', () => {
    const issues = findGeometryIssues(projectJsonSchema).filter(
      (issue) => issue.rule === 'banned-name',
    );

    expect(issues).toEqual([]);
  });

  test('closes every object node with additionalProperties: false', () => {
    const issues = findGeometryIssues(projectJsonSchema).filter(
      (issue) => issue.rule === 'open-object',
    );

    expect(issues).toEqual([]);
  });

  test('has no untyped schema nodes', () => {
    const issues = findGeometryIssues(projectJsonSchema).filter(
      (issue) => issue.rule === 'untyped-node',
    );

    expect(issues).toEqual([]);
  });

  test('NEGATIVE: flags strict objects containing geometry names', () => {
    const issues = findGeometryIssues(
      z.toJSONSchema(
        z.strictObject({
          position: z.strictObject({ x: z.number(), y: z.number() }),
        }),
      ),
    );

    expect(issues).toContainEqual({
      rule: 'banned-name',
      path: '$.properties.position',
      detail: 'property "position" contains banned substring "pos"',
    });
    expect(issues).toContainEqual({
      rule: 'banned-name',
      path: '$.properties.position.properties.x',
      detail: 'property "x" is an exact banned name',
    });
    expect(issues).toContainEqual({
      rule: 'banned-name',
      path: '$.properties.position.properties.y',
      detail: 'property "y" is an exact banned name',
    });
  });

  test('NEGATIVE: flags an open object', () => {
    const issues = findGeometryIssues(z.toJSONSchema(z.object({ a: z.string() }), { io: 'input' }));

    expect(issues).toEqual([
      {
        rule: 'open-object',
        path: '$',
        detail: 'object schema must set additionalProperties: false',
      },
    ]);
  });

  test('NEGATIVE: rejects x on a component at runtime', () => {
    const project = minimalProject();
    const layer = project.layers[0];
    expect(layer).toBeDefined();
    if (!layer) throw new Error('Expected minimalProject to contain a layer');

    const component = layer.components?.[0];
    expect(component).toBeDefined();
    if (!component) throw new Error('Expected minimalProject to contain a component');

    const projectWithGeometry = {
      ...project,
      layers: [{ ...layer, components: [{ ...component, x: 12 }] }],
    };
    const result = safeParseProject(projectWithGeometry);

    expect(result.success).toBe(false);
    if (result.success) throw new Error('Expected x on a component to be rejected');

    expect(result.error.issues).toContainEqual(
      expect.objectContaining({
        code: 'unrecognized_keys',
        keys: ['x'],
        path: ['layers', 0, 'components', 0],
      }),
    );
    expect(() => parseProject(projectWithGeometry)).toThrow(ProjectValidationError);
  });
});
