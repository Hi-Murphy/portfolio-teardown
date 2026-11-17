import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, test } from 'vitest';

import { PROJECTS } from '../content/projects';
import { RELATIONSHIP_SOURCES } from '../content/projects/connections';
import {
  createRelationshipsSchema,
  RelationshipValidationError,
  resolveConnections,
  type Connection,
  type RelationshipsSource,
} from '../content/projects/relationships';
import { Connections } from '../components/connections';

interface MutableRelationship {
  to: string;
  kind: string;
  note: string;
  [key: string]: unknown;
}

interface MutableRelationshipsSource {
  relationships?: MutableRelationship[];
}

const REAL_SOURCES: Readonly<Record<string, RelationshipsSource>> = RELATIONSHIP_SOURCES;

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

function renderConnections(connections: readonly Connection[]): string {
  return renderToStaticMarkup(createElement(Connections, { connections }));
}

function stripCount(markup: string): number {
  return markup.match(/data-site-connections/g)?.length ?? 0;
}

function decodeHtmlText(text: string): string {
  const entities: Readonly<Record<string, string>> = {
    '&amp;': '&',
    '&quot;': '"',
    '&#39;': "'",
    '&#x27;': "'",
    '&lt;': '<',
    '&gt;': '>',
  };

  return text.replace(/&(?:amp|quot|lt|gt|#39|#x27);/g, (entity) => entities[entity]!);
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
    'Unknown relationship target "no-such-project" in project "jev-toolkit". Known projects: websocket-inspector, jev-toolkit, agent-fleet.',
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

test('5. removing a relationship entry removes exactly that Connections strip', () => {
  const connections = resolveConnections(REAL_SOURCES, PROJECTS);
  const slugs = ['jev-toolkit', 'websocket-inspector'] as const;

  for (const slug of slugs) {
    expect(stripCount(renderConnections(connections.get(slug) ?? []))).toBe(1);
  }

  const withoutJev = cloneSources();
  withoutJev['jev-toolkit']!.relationships = [];
  const jevRemoved = resolveConnections(asSources(withoutJev), PROJECTS);

  expect(stripCount(renderConnections(jevRemoved.get('jev-toolkit') ?? []))).toBe(0);
  expect(stripCount(renderConnections(jevRemoved.get('websocket-inspector') ?? []))).toBe(1);

  const withoutWebsocketInspector = cloneSources();
  withoutWebsocketInspector['websocket-inspector']!.relationships = [];
  const websocketInspectorRemoved = resolveConnections(
    asSources(withoutWebsocketInspector),
    PROJECTS,
  );

  expect(stripCount(renderConnections(websocketInspectorRemoved.get('jev-toolkit') ?? []))).toBe(1);
  expect(
    stripCount(renderConnections(websocketInspectorRemoved.get('websocket-inspector') ?? [])),
  ).toBe(0);

  for (const slug of slugs) {
    const relationship = REAL_SOURCES[slug]!.relationships[0]!;
    const markup = renderConnections(connections.get(slug) ?? []);
    const linkText = markup.match(
      new RegExp(`<a [^>]*href="/projects/${relationship.to}"[^>]*>([^<]*)</a>`),
    )?.[1];
    const noteText = markup.match(/<p[^>]*>([^<]*)<\/p>/)?.[1];

    expect(linkText).toBe(PROJECT_NAMES.get(relationship.to));
    expect(noteText === undefined ? undefined : decodeHtmlText(noteText)).toBe(relationship.note);
  }

  expect(renderConnections([])).toBe('');
});

test('6. a relationships file with no matching project is rejected', () => {
  const sources = cloneSources();
  sources['no-such-project'] = { relationships: [] };

  const error = expectRelationshipError(() => resolveConnections(asSources(sources), PROJECTS));

  expect(error.message).toContain('Relationships file "no-such-project" has no matching project.');
});
