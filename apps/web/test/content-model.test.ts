import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { defineProject, type Project } from 'xploder';
import { describe, expect, test } from 'vitest';

import { agentFleet } from '../content/projects/agent-fleet';
import { getProject, cardModel, PROJECT_SLUGS, PROJECTS } from '../content/projects';
import { jevToolkit } from '../content/projects/jev-toolkit';
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

  test('maps the jev-toolkit meta and registry chips', () => {
    const model = cardModel(jevToolkit);

    expect(model).toStrictEqual({
      slug: jevToolkit.meta.slug,
      name: jevToolkit.meta.name,
      tagline: jevToolkit.meta.tagline,
      chips: expectedChips(['nodejs']),
    });
    expect(model.chips.length).toBeLessThanOrEqual(4);
  });

  test('maps the agent-fleet meta and four registry chips in rank order (S19)', () => {
    expect(cardModel(agentFleet)).toStrictEqual({
      slug: agentFleet.meta.slug,
      name: agentFleet.meta.name,
      tagline: agentFleet.meta.tagline,
      chips: expectedChips(['infra', 'agent', 'linux', 'git']),
    });
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
  test('exposes the websocket-inspector, jev-toolkit and agent-fleet projects and slugs', () => {
    expect(PROJECTS).toEqual([websocketInspector, jevToolkit, agentFleet]);
    expect(PROJECT_SLUGS).toEqual(['websocket-inspector', 'jev-toolkit', 'agent-fleet']);
  });

  test('resolves a project by slug', () => {
    expect(getProject('websocket-inspector')).toBe(websocketInspector);
    expect(getProject('jev-toolkit')).toBe(jevToolkit);
    expect(getProject('agent-fleet')).toBe(agentFleet);
    expect(getProject('nope')).toBeUndefined();
  });
});

describe('agent-fleet route model (AC1)', () => {
  test('matches the canonical layer, component and flow model', () => {
    const jsonPath = fileURLToPath(
      new URL('../../../.specify/content/agent-fleet.json', import.meta.url),
    );
    const json = JSON.parse(readFileSync(jsonPath, 'utf8')) as {
      meta: { links: readonly unknown[] };
      layers: readonly {
        id: string;
        name: string;
        components: readonly { id: string; name: string }[];
      }[];
      flows: readonly { id: string; path: readonly string[] }[];
    };
    const components = agentFleet.layers.flatMap((layer) => layer.components);
    const componentIds = new Set(components.map((component) => component.id));

    expect(agentFleet.layers).toHaveLength(4);
    expect(components).toHaveLength(14);
    expect(agentFleet.flows).toHaveLength(3);
    expect(agentFleet.layers.map((layer) => layer.id).sort()).toStrictEqual(
      json.layers.map((layer) => layer.id).sort(),
    );
    expect(components.map((component) => component.id).sort()).toStrictEqual(
      json.layers.flatMap((layer) => layer.components.map((component) => component.id)).sort(),
    );
    expect(agentFleet.flows.map((flow) => flow.id).sort()).toStrictEqual(
      json.flows.map((flow) => flow.id).sort(),
    );
    expect(
      agentFleet.layers.map((layer) => layer.components.map((component) => component.id)),
    ).toStrictEqual(json.layers.map((layer) => layer.components.map((component) => component.id)));

    for (const flow of agentFleet.flows) {
      const sourceFlow = json.flows.find((candidate) => candidate.id === flow.id);

      expect(sourceFlow).toBeDefined();
      expect(flow.path).toStrictEqual(sourceFlow?.path);

      for (const step of flow.path) {
        expect(componentIds.has(step)).toBe(true);
      }
    }

    expect(Math.max(...components.map((component) => component.name.length))).toBeLessThanOrEqual(
      14,
    );
    expect(Math.max(...agentFleet.layers.map((layer) => layer.name.length))).toBeLessThanOrEqual(
      16,
    );
    expect(components.reduce((total, component) => total + component.techs.length, 0)).toBe(8);
    expect(components.reduce((total, component) => total + component.links.length, 0)).toBe(0);
    expect(agentFleet.meta.links).toHaveLength(0);
  });
});
