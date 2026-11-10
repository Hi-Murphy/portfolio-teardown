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

export interface HeroProofReference {
  readonly metric: number;
  readonly layer: string | null;
}

export interface HeroProofEntry {
  readonly metric: number;
  readonly label: string;
  readonly value: string;
  readonly layerId: string | null;
}

export const PROJECTS = [websocketInspector] as const;

export const PROJECT_SLUGS = PROJECTS.map((project) => project.meta.slug);

export function heroProofEntries(
  project: Project,
  proof: readonly HeroProofReference[],
): readonly HeroProofEntry[] {
  const layerIds = new Set(project.layers.map((layer) => layer.id));

  return proof.flatMap((reference) => {
    if (
      !Number.isInteger(reference.metric) ||
      reference.metric < 0 ||
      reference.metric >= project.story.metrics.length
    ) {
      return [];
    }
    if (reference.layer !== null && !layerIds.has(reference.layer)) return [];

    const metric = project.story.metrics[reference.metric];
    if (metric === undefined) return [];

    return [
      {
        metric: reference.metric,
        label: metric.label,
        value: metric.value,
        layerId: reference.layer,
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
