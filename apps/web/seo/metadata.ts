import type { Metadata, Viewport } from 'next';
import { blueprint } from 'xploder/theme';

import { SITE } from '../content/site';
import { NOT_FOUND_ROUTE, type SeoRoute } from './routes';
import { absoluteUrl, SITE_ORIGIN } from './site-url';

const OG_IMAGE_WIDTH = 1200;
const OG_IMAGE_HEIGHT = 630;

function routeTitle(route: SeoRoute): string {
  switch (route.kind) {
    case 'home':
    case 'not-found':
      return SITE.meta.title;
    case 'projects':
      return `${SITE.projects.title} · ${SITE.meta.siteName}`;
    case 'project':
      if (route.project === undefined) {
        throw new Error('A project route must include its project.');
      }

      return `${route.project.meta.name} · ${SITE.meta.siteName}`;
  }
}

function routeDescription(route: SeoRoute): string {
  if (route.kind !== 'project') return SITE.meta.description;

  if (route.project === undefined) {
    throw new Error('A project route must include its project.');
  }

  return route.project.meta.tagline ?? route.project.meta.summary ?? SITE.meta.description;
}

export function routeMetadata(route: SeoRoute): Metadata {
  const title = routeTitle(route);
  const description = routeDescription(route);
  const isNotFound = route.kind === 'not-found';
  const canonical = isNotFound ? {} : { canonical: absoluteUrl(route.path) };
  const openGraphUrl = isNotFound ? {} : { url: absoluteUrl(route.path) };

  return {
    title: { absolute: title },
    description,
    alternates: canonical,
    openGraph: {
      title,
      description,
      siteName: SITE.meta.siteName,
      locale: SITE.meta.locale,
      type: 'website',
      images: [
        {
          url: route.ogImagePath,
          width: OG_IMAGE_WIDTH,
          height: OG_IMAGE_HEIGHT,
          type: 'image/png',
          alt: title,
        },
      ],
      ...openGraphUrl,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [route.ogImagePath],
    },
  };
}

export function baseMetadata(): Metadata {
  return {
    ...routeMetadata(NOT_FOUND_ROUTE),
    metadataBase: new URL(SITE_ORIGIN),
    icons: {
      icon: [{ url: '/icon.svg', type: 'image/svg+xml' }],
      apple: '/apple-touch-icon.png',
    },
    title: {
      default: SITE.meta.title,
      template: `%s · ${SITE.meta.siteName}`,
    },
  };
}

export const SITE_VIEWPORT = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: blueprint.light.paper },
    { media: '(prefers-color-scheme: dark)', color: blueprint.dark.paper },
  ],
} satisfies Viewport;
