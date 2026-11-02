import { defineProject, type Project } from 'xploder';
import { describe, expect, test } from 'vitest';

import { getProject, cardModel, PROJECT_SLUGS, PROJECTS } from '../content/projects';
import { websocketInspector } from '../content/projects/websocket-inspector';
import { SITE_REGISTRY } from '../content/tech-registry';

function registryTech(id: string) {
  const tech = SITE_REGISTRY.techs.find((candidate) => candidate.id === id);

  if (tech === undefined) {
    throw new Error(`Missing test tech: ${id}`);
  }

  return tech;
}

function expectedChips(ids: readonly string[]) {
  return ids.map((id) => {
    const tech = registryTech(id);

    return {
      id: tech.id,
      label: tech.label,
      category: tech.category,
      color: tech.color,
    };
  });
}

function syntheticProject(componentTechs: string[][]): Project {
  return defineProject(
    {
      schemaVersion: 1,
      meta: {
        slug: 'synthetic',
        name: 'Synthetic project',
      },
      story: {},
      layers: componentTechs.map((techs, index) => ({
        id: `layer-${index}`,
        name: `Layer ${index}`,
        components: [
          {
            id: `component-${index}`,
            name: `Component ${index}`,
            techs,
          },
        ],
      })),
    },
    { registry: SITE_REGISTRY, source: 'content-model-test' },
  );
}

describe('project card model', () => {
  test('maps the websocket-inspector meta and top four registry chips', () => {
    const model = cardModel(websocketInspector);

    expect(model).toMatchObject({
      slug: websocketInspector.meta.slug,
      name: websocketInspector.meta.name,
      tagline: websocketInspector.meta.tagline,
    });
    expect(model.chips).toStrictEqual(
      expectedChips(['kotlin', 'android', 'coroutines', 'jetpack-compose']),
    );
  });

  test('ranks by count before first appearance', () => {
    const model = cardModel(
      syntheticProject([
        ['room'],
        ['kotlin'],
        ['kotlin'],
        ['websocket'],
        ['websocket'],
        ['websocket'],
      ]),
    );

    expect(model.chips).toStrictEqual(expectedChips(['websocket', 'kotlin', 'room']));
  });

  test('breaks equal counts by first appearance', () => {
    const model = cardModel(
      syntheticProject([
        ['websocket', 'room'],
        ['jetpack-compose', 'android'],
        ['coroutines', 'kotlin'],
      ]),
    );

    expect(model.chips.map((chip) => chip.id)).toEqual([
      'websocket',
      'room',
      'jetpack-compose',
      'android',
    ]);
  });

  test('caps the chips at four when a project has six technologies', () => {
    const model = cardModel(
      syntheticProject([
        ['websocket', 'room'],
        ['jetpack-compose', 'android'],
        ['coroutines', 'kotlin'],
      ]),
    );

    expect(model.chips).toHaveLength(4);
  });

  test('returns fewer than four chips when the project has fewer technologies', () => {
    const model = cardModel(syntheticProject([['room', 'kotlin']]));

    expect(model.chips).toStrictEqual(expectedChips(['room', 'kotlin']));
  });
});

describe('project index', () => {
  test('exposes the websocket-inspector project and slug', () => {
    expect(PROJECTS).toEqual([websocketInspector]);
    expect(PROJECT_SLUGS).toEqual(['websocket-inspector']);
  });

  test('resolves a project by slug', () => {
    expect(getProject('websocket-inspector')).toBe(websocketInspector);
    expect(getProject('nope')).toBeUndefined();
  });
});
