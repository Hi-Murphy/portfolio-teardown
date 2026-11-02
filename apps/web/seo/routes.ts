import type { Project } from 'xploder';

import { PROJECTS } from '../content/projects';

export type SeoRouteKind = 'home' | 'projects' | 'project' | 'not-found';

export interface SeoRoute {
  readonly kind: SeoRouteKind;
  readonly path: string;
  readonly ogImagePath: string;
  readonly project?: Project;
}

export const HOME_ROUTE: SeoRoute = {
  kind: 'home',
  path: '/',
  ogImagePath: '/og/home.png',
};

export const PROJECTS_ROUTE: SeoRoute = {
  kind: 'projects',
  path: '/projects',
  ogImagePath: '/og/projects.png',
};

const PROJECT_ROUTES: readonly SeoRoute[] = PROJECTS.map((project) => ({
  kind: 'project',
  path: `/projects/${project.meta.slug}`,
  ogImagePath: `/og/projects/${project.meta.slug}.png`,
  project,
}));

export const INDEXABLE_ROUTES: readonly SeoRoute[] = [
  HOME_ROUTE,
  PROJECTS_ROUTE,
  ...PROJECT_ROUTES,
];

export const NOT_FOUND_ROUTE: SeoRoute = {
  kind: 'not-found',
  path: '/404',
  ogImagePath: '/og/home.png',
};

export function routeForSlug(slug: string): SeoRoute | undefined {
  return PROJECT_ROUTES.find((route) => route.project?.meta.slug === slug);
}
