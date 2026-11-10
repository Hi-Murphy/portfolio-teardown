import type { Project, Tech } from 'xploder';

import { SITE_REGISTRY } from '../tech-registry';
import { websocketInspector } from './websocket-inspector';

const CARD_CHIP_LIMIT = 4;

type CardChip = Pick<Tech, 'id' | 'label' | 'category' | 'color'>;

export interface ProjectCardModel {
  readonly slug: string;
  readonly name: string;
  readonly tagline: string | undefined;
  readonly chips: readonly CardChip[];
}

export interface HeroProofEntry {
  readonly metric: number;
  readonly label: string;
  readonly value: string;
}

export const PROJECTS = [websocketInspector] as const;

export const PROJECT_SLUGS = PROJECTS.map((project) => project.meta.slug);

export function heroProofEntries(
  project: Project,
  proof: readonly number[],
): readonly HeroProofEntry[] {
  return proof.flatMap((metricIndex) => {
    if (
      !Number.isInteger(metricIndex) ||
      metricIndex < 0 ||
      metricIndex >= project.story.metrics.length
    ) {
      return [];
    }

    const metric = project.story.metrics[metricIndex];
    if (metric === undefined) return [];

    return [
      {
        metric: metricIndex,
        label: metric.label,
        value: metric.value,
      },
    ];
  });
}

export function getProject(slug: string): Project | undefined {
  return PROJECTS.find((project) => project.meta.slug === slug);
}

export function cardModel(project: Project): ProjectCardModel {
  const rankings = new Map<string, { count: number; firstAppearance: number }>();
  let nextAppearance = 0;

  for (const layer of project.layers) {
    for (const component of layer.components) {
      for (const techId of component.techs) {
        const ranking = rankings.get(techId);

        if (ranking === undefined) {
          rankings.set(techId, { count: 1, firstAppearance: nextAppearance });
          nextAppearance += 1;
        } else {
          ranking.count += 1;
        }
      }
    }
  }

  const chips = [...rankings.entries()]
    .sort(
      ([, left], [, right]) =>
        right.count - left.count || left.firstAppearance - right.firstAppearance,
    )
    .slice(0, CARD_CHIP_LIMIT)
    .map(([techId]) => {
      const tech = SITE_REGISTRY.techs.find((candidate) => candidate.id === techId);

      if (tech === undefined) {
        throw new Error(`Unknown tech id "${techId}" in project "${project.meta.slug}".`);
      }

      return {
        id: tech.id,
        label: tech.label,
        category: tech.category,
        color: tech.color,
      };
    });

  return {
    slug: project.meta.slug,
    name: project.meta.name,
    tagline: project.meta.tagline,
    chips,
  };
}
