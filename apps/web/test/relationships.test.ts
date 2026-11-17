import { expect, test } from 'vitest';

import { PROJECTS } from '../content/projects';
import { jevToolkitRelationships } from '../content/projects/jev-toolkit.relationships';
import {
  createRelationshipsSchema,
  RelationshipValidationError,
  resolveConnections,
  type RelationshipsSource,
} from '../content/projects/relationships';
import { websocketInspectorRelationships } from '../content/projects/websocket-inspector.relationships';

interface MutableRelationship {
  to: string;
  kind: string;
  note: string;
  [key: string]: unknown;
}

interface MutableRelationshipsSource {
  relationships?: MutableRelationship[];
}

const REAL_SOURCES: Readonly<Record<string, RelationshipsSource>> = {
  'websocket-inspector': websocketInspectorRelationships,
  'jev-toolkit': jevToolkitRelationships,
};

const PROJECT_NAMES = new Map(
  PROJECTS.map((project) => [project.meta.slug, project.meta.name] as const),
);

function cloneSources(): Record<string, MutableRelationshipsSource> {
  return structuredClone(REAL_SOURCES) as unknown as Record<string, MutableRelationshipsSource>;
}

function asSources(
  sources: Record<string, MutableRelationshipsSource>,
): Readonly<Record<string, RelationshipsSource>> {
  return sources as unknown as Readonly<Record<string, RelationshipsSource>>;
}

function thrownBy(callback: () => unknown): unknown {
  try {
    callback();
  } catch (error) {
    return error;
  }

  throw new Error('Expected callback to throw.');
}

function expectRelationshipError(callback: () => unknown): RelationshipValidationError {
  const error = thrownBy(callback);

  expect(error).toBeInstanceOf(RelationshipValidationError);
  expect((error as RelationshipValidationError).name).toBe('RelationshipValidationError');

  return error as RelationshipValidationError;
}

test('1. an unknown target names the target, the owner and every known project', () => {
  const sources = cloneSources();
  sources['jev-toolkit']!.relationships![0]!.to = 'no-such-project';

  const error = expectRelationshipError(() => resolveConnections(asSources(sources), PROJECTS));

  expect(error.message).toContain(
    'Unknown relationship target "no-such-project" in project "jev-toolkit". Known projects: websocket-inspector, jev-toolkit.',
  );
  expect(error.message).toContain('relationships[0].to');
});

test('2. a self-reference is rejected by the schema and the resolver', () => {
  const sources = cloneSources();
  const relationships = sources['jev-toolkit']!.relationships!;
  relationships[0]!.to = 'jev-toolkit';

  const result = createRelationshipsSchema({
    self: 'jev-toolkit',
    projects: PROJECT_NAMES,
  }).safeParse(relationships);

  expect(result.success).toBe(false);
  if (result.success) throw new Error('Expected the self-reference to be rejected.');
  expect(result.error.issues.map((issue) => issue.message)).toContain(
    'Project "jev-toolkit" cannot have a relationship to itself.',
  );

  const error = expectRelationshipError(() => resolveConnections(asSources(sources), PROJECTS));

  expect(error.message).toContain('Project "jev-toolkit" cannot have a relationship to itself.');
});

const INVALID_RELATIONSHIPS = [
  {
    name: 'duplicate target',
    relationships: [
      { to: 'websocket-inspector', kind: 'measured-on', note: 'First valid note.' },
      { to: 'websocket-inspector', kind: 'same-engine', note: 'Second valid note.' },
    ],
    message: 'Duplicate relationship to "websocket-inspector" in project "jev-toolkit".',
  },
  {
    name: 'bad kind',
    relationships: [{ to: 'websocket-inspector', kind: 'unknown-kind', note: 'A valid note.' }],
  },
  {
    name: 'extra key',
    relationships: [
      {
        to: 'websocket-inspector',
        kind: 'measured-on',
        note: 'A valid note.',
        extra: 'not allowed',
      },
    ],
  },
  {
    name: 'empty note',
    relationships: [{ to: 'websocket-inspector', kind: 'measured-on', note: '' }],
  },
  {
    name: 'whitespace note',
    relationships: [{ to: 'websocket-inspector', kind: 'measured-on', note: '   ' }],
  },
  {
    name: 'non-slug target',
    relationships: [{ to: 'Not A Slug', kind: 'measured-on', note: 'A valid note.' }],
  },
] as const satisfies readonly {
  readonly name: string;
  readonly relationships: readonly MutableRelationship[];
  readonly message?: string;
}[];

test.each(INVALID_RELATIONSHIPS)('3. $name is rejected by the schema and the resolver', (row) => {
  const relationships = row.relationships as unknown as MutableRelationship[];
  const result = createRelationshipsSchema({
    self: 'jev-toolkit',
    projects: PROJECT_NAMES,
  }).safeParse(relationships);

  expect(result.success).toBe(false);
  if (result.success) throw new Error(`Expected ${row.name} to be rejected.`);
  if ('message' in row) {
    expect(result.error.issues.map((issue) => issue.message)).toContain(row.message);
  }

  const error = expectRelationshipError(() =>
    resolveConnections(asSources({ 'jev-toolkit': { relationships } }), PROJECTS),
  );

  if ('message' in row) expect(error.message).toContain(row.message);
});

test.each([
  ['missing field', undefined],
  ['empty array', []],
] as const)('4. %s produces no connections for its project', (_name, relationships) => {
  const sources = cloneSources();

  if (relationships === undefined) {
    delete sources['jev-toolkit']!.relationships;
  } else {
    sources['jev-toolkit']!.relationships = [];
  }

  const connections = resolveConnections(asSources(sources), PROJECTS);

  expect(connections.get('jev-toolkit')).toEqual([]);
});

test('5. a relationships file with no matching project is rejected', () => {
  const sources = cloneSources();
  sources['no-such-project'] = { relationships: [] };

  const error = expectRelationshipError(() => resolveConnections(asSources(sources), PROJECTS));

  expect(error.message).toContain('Relationships file "no-such-project" has no matching project.');
});
