import { describe, expect, test } from 'vitest';

import robots from '../app/robots';
import sitemap from '../app/sitemap';
import { INDEXABLE_ROUTES } from '../seo/routes';
import { absoluteUrl } from '../seo/site-url';

const FORBIDDEN_ROUTE_FRAGMENTS = ['/dev/engine', 'fixtures', 'fps-calibration'];

describe('SEO sitemap and robots', () => {
  test('the sitemap contains exactly the indexable routes', () => {
    const entries = sitemap();

    expect(entries).toEqual(INDEXABLE_ROUTES.map((route) => ({ url: absoluteUrl(route.path) })));

    const serialized = JSON.stringify(entries);
    for (const fragment of FORBIDDEN_ROUTE_FRAGMENTS) {
      expect(serialized).not.toContain(fragment);
    }
  });

  test('robots allows the site, blocks dev routes and points to the sitemap', () => {
    const config = robots();

    expect(config).toEqual({
      rules: {
        userAgent: '*',
        allow: '/',
        disallow: '/dev/',
      },
      sitemap: absoluteUrl('/sitemap.xml'),
    });

    const serialized = JSON.stringify(config);
    for (const fragment of FORBIDDEN_ROUTE_FRAGMENTS) {
      expect(serialized).not.toContain(fragment);
    }
  });
});
