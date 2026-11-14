import { readFile, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

import { describe, expect, test } from 'vitest';

import { jevToolkitSource } from '../../../apps/web/content/projects/jev-toolkit.source.ts';
import { websocketInspectorSource } from '../../../apps/web/content/projects/websocket-inspector.source.ts';
import { PROJECT_SOURCES } from '../src/project-sources.ts';

const CONTENT_DIR = fileURLToPath(new URL('../../../.specify/content/', import.meta.url));
const PROJECT_INDEX = fileURLToPath(
  new URL('../../../apps/web/content/projects/index.ts', import.meta.url),
);

function projectOrderFromIndex(indexText: string): string[] {
  const imports = new Map<string, string>();

  for (const match of indexText.matchAll(
    /import\s*\{\s*([A-Za-z_$][\w$]*)\s*\}\s*from\s*['"]\.\/([^'"]+)['"];?/g,
  )) {
    imports.set(match[1] ?? '', match[2] ?? '');
  }

  const array = /export\s+const\s+PROJECTS\s*=\s*\[([^\]]*)\]\s*as\s+const/.exec(indexText);
  if (array === null) throw new Error('PROJECTS array not found');

  return (array[1] ?? '')
    .split(',')
    .map((identifier) => identifier.trim())
    .filter((identifier) => identifier.length > 0)
    .map((identifier) => {
      const slug = imports.get(identifier);
      if (slug === undefined) throw new Error(`no project import for ${identifier}`);
      return slug;
    });
}

async function contentSlugs(): Promise<string[]> {
  return (await readdir(CONTENT_DIR))
    .filter((name) => name.endsWith('.json') && name !== 'site.json')
    .map((name) => name.slice(0, -'.json'.length));
}

describe('PROJECT_SOURCES', () => {
  test('matches the content set in the app PROJECTS order', async () => {
    const indexText = await readFile(PROJECT_INDEX, 'utf8');
    const appOrder = projectOrderFromIndex(indexText);
    const sourceSlugs = PROJECT_SOURCES.map((source) => source.meta.slug);

    expect(sourceSlugs).toEqual(appOrder);
    expect(new Set(sourceSlugs)).toEqual(new Set(await contentSlugs()));
  });

  test('holds the same source objects imported by slug', () => {
    const sourcesBySlug: Record<string, unknown> = {
      'jev-toolkit': jevToolkitSource,
      'websocket-inspector': websocketInspectorSource,
    };

    for (const source of PROJECT_SOURCES) {
      expect(source).toBe(sourcesBySlug[source.meta.slug]);
    }
  });

  test('negative control: a missing project does not equal the content set', async () => {
    const indexText = await readFile(PROJECT_INDEX, 'utf8');
    const missingProject = indexText.replace(
      'PROJECTS = [websocketInspector, jevToolkit] as const',
      'PROJECTS = [websocketInspector] as const',
    );

    expect(projectOrderFromIndex(missingProject)).not.toEqual(await contentSlugs());
    expect(new Set(projectOrderFromIndex(missingProject))).not.toEqual(
      new Set(await contentSlugs()),
    );
  });
});
