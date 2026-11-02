import { describe, expect, test } from 'vitest';

import { generateMetadata as generateProjectMetadata } from '../app/(site)/projects/[slug]/page';
import { metadata as rootMetadata } from '../app/layout';
import { metadata as projectsMetadata } from '../app/(site)/projects/page';
import { PROJECTS } from '../content/projects';
import { SITE } from '../content/site';

describe('site metadata', () => {
  test('root metadata uses the site title, template and description', () => {
    expect(rootMetadata).toEqual({
      title: {
        default: SITE.meta.title,
        template: `%s · ${SITE.meta.siteName}`,
      },
      description: SITE.meta.description,
    });
  });

  test('/projects metadata uses the projects title and site description', () => {
    expect(projectsMetadata).toEqual({
      title: SITE.projects.title,
      description: SITE.meta.description,
    });
  });

  test('project route generateMetadata uses the project meta name and tagline', async () => {
    const project = PROJECTS[0];

    if (project === undefined) throw new Error('Expected at least one project.');

    await expect(
      generateProjectMetadata({ params: Promise.resolve({ slug: project.meta.slug }) }),
    ).resolves.toEqual({
      title: project.meta.name,
      description: project.meta.tagline,
    });
  });
});
