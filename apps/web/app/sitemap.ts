import type { MetadataRoute } from 'next';

import { INDEXABLE_ROUTES } from '../seo/routes';
import { absoluteUrl } from '../seo/site-url';

export const dynamic = 'force-static';

export default function sitemap(): MetadataRoute.Sitemap {
  return INDEXABLE_ROUTES.map((route) => ({ url: absoluteUrl(route.path) }));
}
