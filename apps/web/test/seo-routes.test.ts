import { describe, expect, test } from 'vitest';

import { PROJECTS } from '../content/projects';
import {
  HOME_ROUTE,
  INDEXABLE_ROUTES,
  NOT_FOUND_ROUTE,
  PROJECTS_ROUTE,
  routeForSlug,
} from '../seo/routes';

describe('SEO route registry', () => {
  test('indexable routes are home, projects and every content project', () => {
    const expected = [
      { kind: 'home', path: '/', ogImagePath: '/og/home.png' },
      { kind: 'projects', path: '/projects', ogImagePath: '/og/projects.png' },
      ...PROJECTS.map((project) => ({
        kind: 'project',
        path: `/projects/${project.meta.slug}`,
        ogImagePath: `/og/projects/${project.meta.slug}.png`,
        project,
      })),
    ];

    expect(INDEXABLE_ROUTES).toEqual(expected);
    expect(INDEXABLE_ROUTES[0]).toBe(HOME_ROUTE);
    expect(INDEXABLE_ROUTES[1]).toBe(PROJECTS_ROUTE);
  });

  test('the not-found route is not indexable and uses the safe home card', () => {
    expect(INDEXABLE_ROUTES).not.toContain(NOT_FOUND_ROUTE);
    expect(NOT_FOUND_ROUTE).toEqual({
      kind: 'not-found',
      path: '/404',
      ogImagePath: '/og/home.png',
    });
  });

  test('routeForSlug returns only the matching content project', () => {
    for (const project of PROJECTS) {
      expect(routeForSlug(project.meta.slug)).toEqual({
        kind: 'project',
        path: `/projects/${project.meta.slug}`,
        ogImagePath: `/og/projects/${project.meta.slug}.png`,
        project,
      });
    }

    expect(routeForSlug('not-a-project')).toBeUndefined();
    expect(routeForSlug('dev/engine')).toBeUndefined();
    expect(routeForSlug('fixtures/fps-calibration')).toBeUndefined();
  });

  test('dev and fixture routes are absent from the indexable registry', () => {
    const paths = INDEXABLE_ROUTES.map((route) => route.path);

    expect(paths).not.toEqual(expect.arrayContaining([expect.stringMatching(/^\/dev\//)]));
    expect(paths).not.toEqual(expect.arrayContaining([expect.stringMatching(/^\/fixtures\//)]));
  });
});
