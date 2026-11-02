import type { Project } from 'xploder';

import { PROJECTS } from '../../content/projects';
import { posterGeometry, type PosterSlab, type PosterViewBox } from '../../content/poster';
import { SITE } from '../../content/site';
import type { SeoRoute } from '../routes';

export const TITLE_BLOCK_ROW_LIMIT = 6;

export interface OgCardTitleBlock {
  readonly title: string;
  readonly meta: string;
  readonly rows: readonly string[];
}

export interface OgCardSilhouette {
  readonly projectId: string;
  readonly viewBox: PosterViewBox;
  readonly slabs: readonly PosterSlab[];
}

export interface OgCardModel {
  readonly eyebrow: string;
  readonly title: string;
  readonly subtitle: string;
  readonly silhouettes: readonly OgCardSilhouette[];
  readonly titleBlock: OgCardTitleBlock;
}

const PROJECT_SEPARATOR = ' · ';
const OVERFLOW_PREFIX = '+';

function twoDigits(value: number): string {
  return String(value).padStart(2, '0');
}

export function titleBlockRows(names: readonly string[]): readonly string[] {
  const visible = names
    .slice(0, TITLE_BLOCK_ROW_LIMIT)
    .map((name, index) => `${twoDigits(index + 1)} ${name}`);
  const hiddenCount = names.length - TITLE_BLOCK_ROW_LIMIT;

  return hiddenCount > 0 ? [...visible, `${OVERFLOW_PREFIX}${hiddenCount}`] : visible;
}

function silhouette(project: Project): OgCardSilhouette {
  const geometry = posterGeometry(project, 'exploded');

  return {
    projectId: project.meta.slug,
    viewBox: geometry.viewBox,
    slabs: geometry.slabs.filter((slab) => slab.kind === 'layer'),
  };
}

function projectRows(projects: readonly Project[]): readonly string[] {
  return titleBlockRows(projects.map((project) => project.meta.name));
}

function homeCard(): OgCardModel {
  const heroProject = PROJECTS[0];

  return {
    eyebrow: SITE.hero.eyebrow,
    title: SITE.meta.siteName,
    subtitle: SITE.hero.headline,
    silhouettes: heroProject === undefined ? [] : [silhouette(heroProject)],
    titleBlock: {
      title: SITE.meta.siteName,
      meta: SITE.identity.role,
      rows: projectRows(PROJECTS),
    },
  };
}

export function cardModel(route: SeoRoute): OgCardModel {
  switch (route.kind) {
    case 'home':
    case 'not-found':
      return homeCard();

    case 'projects':
      return {
        eyebrow: SITE.meta.siteName,
        title: SITE.projects.title,
        subtitle: PROJECTS.map((project) => project.meta.name).join(PROJECT_SEPARATOR),
        silhouettes: PROJECTS.map(silhouette),
        titleBlock: {
          title: SITE.projects.title,
          meta: twoDigits(PROJECTS.length),
          rows: projectRows(PROJECTS),
        },
      };

    case 'project': {
      if (route.project === undefined) {
        throw new Error('A project route must include its project.');
      }

      return {
        eyebrow: SITE.meta.siteName,
        title: route.project.meta.name,
        subtitle: route.project.meta.tagline ?? '',
        silhouettes: [silhouette(route.project)],
        titleBlock: {
          title: route.project.meta.name,
          meta: route.project.meta.year === undefined ? '' : String(route.project.meta.year),
          rows: titleBlockRows(route.project.layers.map((layer) => layer.name)),
        },
      };
    }
  }
}
