import { describe, expect, test } from 'vitest';

import { generateMetadata as generateProjectMetadata } from '../app/(site)/projects/[slug]/page';
import { metadata as homeMetadata } from '../app/(site)/page';
import { metadata as projectsMetadata } from '../app/(site)/projects/page';
import { metadata as rootMetadata } from '../app/layout';
import { viewport } from '../app/layout';
import { PROJECTS } from '../content/projects';
import { baseMetadata, routeMetadata, SITE_VIEWPORT } from '../seo/metadata';
import { HOME_ROUTE, PROJECTS_ROUTE, routeForSlug } from '../seo/routes';

describe('site metadata', () => {
  test('root metadata is the shared 404-safe base', () => {
    expect(rootMetadata).toEqual(baseMetadata());
    expect(viewport).toEqual(SITE_VIEWPORT);
  });

  test('the home page uses the home route metadata', () => {
    expect(homeMetadata).toEqual(routeMetadata(HOME_ROUTE));
  });

  test('/projects uses the projects route metadata', () => {
    expect(projectsMetadata).toEqual(routeMetadata(PROJECTS_ROUTE));
  });

  test('project generateMetadata uses the project route metadata', async () => {
    const project = PROJECTS[0];

    if (project === undefined) throw new Error('Expected at least one project.');

    const route = routeForSlug(project.meta.slug);
    if (route === undefined) throw new Error('Expected a project route.');

    await expect(
      generateProjectMetadata({ params: Promise.resolve({ slug: project.meta.slug }) }),
    ).resolves.toEqual(routeMetadata(route));
  });
});
