import { describe, expect, test } from 'vitest';

import { ProjectValidationError, parseProject, parseTechRegistry } from '../src/index';
import { caseStudyModel, chipModels, detailModel } from '../src/panel/content';
import { projectAJson, projectBJson, projectCJson, techRegistryJson } from './fixtures';

interface FixtureComponent {
  readonly id: string;
  readonly name: string;
  readonly summary?: string;
  readonly description?: string;
  readonly kind?: 'module' | 'service' | 'store' | 'external' | 'actor';
  readonly status?: 'shipped' | 'wip' | 'planned';
  readonly techs?: readonly string[];
  readonly links?: readonly { readonly label: string; readonly url: string }[];
  readonly metrics?: readonly { readonly label: string; readonly value: string }[];
}

interface FixtureProject {
  readonly meta: {
    readonly slug: string;
    readonly name?: string;
    readonly tagline?: string;
  };
  readonly story?: {
    readonly headline?: string;
    readonly problem?: string;
    readonly approach?: string;
    readonly outcome?: string;
    readonly metrics?: readonly { readonly label: string; readonly value: string }[];
  };
  readonly layers: readonly {
    readonly components: readonly FixtureComponent[];
  }[];
}

const registry = parseTechRegistry(techRegistryJson);
const fixtures = [
  { label: 'A', json: projectAJson },
  { label: 'B', json: projectBJson },
  { label: 'C', json: projectCJson },
] as const;
const projects = fixtures.map((fixture) => ({
  ...fixture,
  fixture: fixture.json as FixtureProject,
  project: parseProject(fixture.json, { registry }),
}));

function expectedChips(techIds: readonly string[] = []) {
  return techIds.map((id) => {
    const tech = registry.techs.find((candidate) => candidate.id === id);

    if (tech === undefined) throw new Error(`Fixture uses unknown tech "${id}"`);

    return {
      id,
      label: tech.label,
      category: tech.category,
      colorRef: tech.color,
    };
  });
}

function expectedDetail(component: FixtureComponent) {
  return {
    id: component.id,
    name: component.name,
    meta: {
      kind: component.kind ?? 'module',
      status: component.status ?? 'shipped',
    },
    ...(component.summary === undefined ? {} : { summary: component.summary }),
    ...(component.description === undefined ? {} : { description: component.description }),
    chips: expectedChips(component.techs),
    metrics: component.metrics ?? [],
    links: (component.links ?? []).map((link) => ({
      ...link,
      rel: 'noopener noreferrer',
      target: '_blank',
    })),
  };
}

function expectedSections(story: FixtureProject['story']) {
  return [
    ['problem', 'Problem'],
    ['approach', 'Approach'],
    ['outcome', 'Outcome'],
  ].flatMap(([key, title]) => {
    const body = story?.[key as 'problem' | 'approach' | 'outcome'];
    return body === undefined ? [] : [{ key, title, body }];
  });
}

describe('detailModel', () => {
  for (const { label, fixture, project } of projects) {
    for (const component of fixture.layers.flatMap((layer) => layer.components)) {
      test(`${label}/${component.id} equals the fixture and registry content`, () => {
        expect(detailModel(project, component.id, registry)).toEqual(expectedDetail(component));
      });
    }
  }

  test('omits every empty optional section for beachgoer', () => {
    const project = projects.find(({ label }) => label === 'A')?.project;
    if (project === undefined) throw new Error('Missing fixture A');

    const model = detailModel(project, 'beachgoer', registry);

    expect(model?.chips).toEqual([]);
    expect(model?.metrics).toEqual([]);
    expect(model?.links).toEqual([]);
  });

  test('returns null for a missing component id', () => {
    const project = projects.find(({ label }) => label === 'A')?.project;
    if (project === undefined) throw new Error('Missing fixture A');

    expect(detailModel(project, 'missing', registry)).toBeNull();
  });
});

describe('caseStudyModel', () => {
  for (const { label, fixture, project } of projects) {
    test(`${label} keeps the story order and project metrics`, () => {
      expect(caseStudyModel(project)).toEqual({
        name: fixture.meta.name ?? fixture.meta.slug,
        ...(fixture.meta.tagline === undefined ? {} : { tagline: fixture.meta.tagline }),
        ...(fixture.story?.headline === undefined ? {} : { headline: fixture.story.headline }),
        sections: expectedSections(fixture.story),
        metrics: fixture.story?.metrics ?? [],
      });
    });
  }

  test('fixture C has no story metrics', () => {
    const project = projects.find(({ label }) => label === 'C')?.project;
    if (project === undefined) throw new Error('Missing fixture C');

    expect(caseStudyModel(project).metrics).toEqual([]);
  });
});

describe('chipModels', () => {
  test('uses raw labels without a registry and omits category metadata', () => {
    expect(chipModels(['kotlin', 'nope'])).toEqual([
      { id: 'kotlin', label: 'kotlin' },
      { id: 'nope', label: 'nope' },
    ]);
  });

  test('uses registry labels, categories and colour references in tech order', () => {
    expect(chipModels(['kotlin', 'nope'], registry)).toEqual([
      {
        id: 'kotlin',
        label: 'Kotlin',
        category: 'language',
        colorRef: 'tech-language',
      },
      { id: 'nope', label: 'nope' },
    ]);
  });

  test('parsing with the registry rejects an unknown tech id', () => {
    expect(() =>
      parseProject(
        {
          schemaVersion: 1,
          meta: { slug: 'unknown-tech' },
          layers: [
            {
              id: 'core',
              name: 'Core',
              components: [{ id: 'app', name: 'App', techs: ['nope'] }],
            },
          ],
        },
        { registry },
      ),
    ).toThrow(ProjectValidationError);
  });
});
