import { describe, expect, test } from 'vitest';

import { metadata as rootMetadata } from '../app/layout';
import { metadata as projectsMetadata } from '../app/(site)/projects/page';
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

  test.todo('project route generateMetadata uses the project meta name and tagline (T010)');
});
