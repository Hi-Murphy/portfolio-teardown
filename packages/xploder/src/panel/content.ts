import type {
  ComponentKind,
  ComponentStatus,
  TechCategory,
  TechColorRef,
} from '../schema/constants';
import type { Link, Metric } from '../schema/primitives';
import type { TechRegistry } from '../schema/tech';

export interface PanelComponentInput {
  readonly id: string;
  readonly name: string;
  readonly summary?: string;
  readonly description?: string;
  readonly kind?: ComponentKind;
  readonly status?: ComponentStatus;
  readonly techs?: readonly string[];
  readonly links?: readonly Link[];
  readonly metrics?: readonly Metric[];
}

export interface PanelProjectInput {
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
    readonly metrics?: readonly Metric[];
  };
  readonly layers: readonly {
    readonly components: readonly PanelComponentInput[];
  }[];
}

export interface ChipModel {
  readonly id: string;
  readonly label: string;
  readonly category?: TechCategory;
  readonly colorRef?: TechColorRef;
}

export interface DetailLink {
  readonly label: string;
  readonly url: string;
  readonly rel: 'noopener noreferrer';
  readonly target: '_blank';
}

export interface DetailModel {
  readonly id: string;
  readonly name: string;
  readonly meta: {
    readonly kind: ComponentKind;
    readonly status: ComponentStatus;
  };
  readonly summary?: string;
  readonly description?: string;
  readonly chips: readonly ChipModel[];
  readonly metrics: readonly Metric[];
  readonly links: readonly DetailLink[];
}

export interface CaseStudySection {
  readonly key: 'problem' | 'approach' | 'outcome';
  readonly title: 'Problem' | 'Approach' | 'Outcome';
  readonly body: string;
}

export interface CaseStudyModel {
  readonly name: string;
  readonly tagline?: string;
  readonly headline?: string;
  readonly sections: readonly CaseStudySection[];
  readonly metrics: readonly Metric[];
}

export const PANEL_SECTION_TITLES = {
  problem: 'Problem',
  approach: 'Approach',
  outcome: 'Outcome',
  metrics: 'Metrics',
  tech: 'Tech',
  links: 'Links',
} as const;

export function chipModels(techIds: readonly string[], registry?: TechRegistry): ChipModel[] {
  const techs = new Map(registry?.techs.map((tech) => [tech.id, tech]));

  return techIds.map((id) => {
    const tech = techs.get(id);

    if (tech === undefined) return { id, label: id };

    return {
      id,
      label: tech.label,
      category: tech.category,
      colorRef: tech.color,
    };
  });
}

export function detailModel(
  project: PanelProjectInput,
  id: string,
  registry?: TechRegistry,
): DetailModel | null {
  const component = project.layers
    .flatMap((layer) => layer.components)
    .find((candidate) => candidate.id === id);

  if (component === undefined) return null;

  return {
    id: component.id,
    name: component.name,
    meta: {
      kind: component.kind ?? 'module',
      status: component.status ?? 'shipped',
    },
    ...(component.summary === undefined ? {} : { summary: component.summary }),
    ...(component.description === undefined ? {} : { description: component.description }),
    chips: chipModels(component.techs ?? [], registry),
    metrics: [...(component.metrics ?? [])],
    links: (component.links ?? []).map((link) => ({
      ...link,
      rel: 'noopener noreferrer',
      target: '_blank',
    })),
  };
}

export function caseStudyModel(project: PanelProjectInput): CaseStudyModel {
  const story = project.story;
  const sections: CaseStudySection[] = [];

  if (story?.problem !== undefined) {
    sections.push({
      key: 'problem',
      title: PANEL_SECTION_TITLES.problem,
      body: story.problem,
    });
  }

  if (story?.approach !== undefined) {
    sections.push({
      key: 'approach',
      title: PANEL_SECTION_TITLES.approach,
      body: story.approach,
    });
  }

  if (story?.outcome !== undefined) {
    sections.push({
      key: 'outcome',
      title: PANEL_SECTION_TITLES.outcome,
      body: story.outcome,
    });
  }

  return {
    name: project.meta.name ?? project.meta.slug,
    ...(project.meta.tagline === undefined ? {} : { tagline: project.meta.tagline }),
    ...(story?.headline === undefined ? {} : { headline: story.headline }),
    sections,
    metrics: [...(story?.metrics ?? [])],
  };
}
