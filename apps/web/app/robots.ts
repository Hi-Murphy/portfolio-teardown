import type { MetadataRoute } from 'next';

import { absoluteUrl } from '../seo/site-url';

export const dynamic = 'force-static';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: '/dev/',
    },
    sitemap: absoluteUrl('/sitemap.xml'),
  };
}
