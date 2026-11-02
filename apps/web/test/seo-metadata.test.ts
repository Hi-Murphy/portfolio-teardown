import type { Metadata } from 'next';
import { blueprint } from 'xploder/theme';
import { describe, expect, test } from 'vitest';

import { PROJECTS } from '../content/projects';
import { SITE } from '../content/site';
import { baseMetadata, routeMetadata, SITE_VIEWPORT } from '../seo/metadata';
import { INDEXABLE_ROUTES, NOT_FOUND_ROUTE, type SeoRoute } from '../seo/routes';
import { absoluteUrl, SITE_ORIGIN } from '../seo/site-url';

interface ExpectedMetadata {
  readonly title: string;
  readonly description: string;
  readonly canonical?: string;
  readonly ogImagePath: string;
}

function expectedFromContent(route: SeoRoute): ExpectedMetadata {
  if (route.kind === 'home' || route.kind === 'not-found') {
    return {
      title: SITE.meta.title,
      description: SITE.meta.description,
      canonical: route.kind === 'not-found' ? undefined : absoluteUrl(route.path),
      ogImagePath: route.ogImagePath,
    };
  }

  if (route.kind === 'projects') {
    return {
      title: `${SITE.projects.title} · ${SITE.meta.siteName}`,
      description: SITE.meta.description,
      canonical: absoluteUrl(route.path),
      ogImagePath: route.ogImagePath,
    };
  }

  const project = route.project;
  if (project === undefined) throw new Error('Expected a project route.');

  return {
    title: `${project.meta.name} · ${SITE.meta.siteName}`,
    description: project.meta.tagline ?? project.meta.summary ?? SITE.meta.description,
    canonical: absoluteUrl(route.path),
    ogImagePath: route.ogImagePath,
  };
}

function expectedMetadata(route: SeoRoute): Metadata {
  const expected = expectedFromContent(route);
  const canonical = expected.canonical === undefined ? {} : { canonical: expected.canonical };
  const openGraphUrl = expected.canonical === undefined ? {} : { url: absoluteUrl(route.path) };

  return {
    title: { absolute: expected.title },
    description: expected.description,
    alternates: canonical,
    openGraph: {
      title: expected.title,
      description: expected.description,
      siteName: SITE.meta.siteName,
      locale: SITE.meta.locale,
      type: 'website',
      images: [
        {
          url: expected.ogImagePath,
          width: 1200,
          height: 630,
          type: 'image/png',
          alt: expected.title,
        },
      ],
      ...openGraphUrl,
    },
    twitter: {
      card: 'summary_large_image',
      title: expected.title,
      description: expected.description,
      images: [expected.ogImagePath],
    },
  };
}

describe('route metadata', () => {
  for (const route of [...INDEXABLE_ROUTES, NOT_FOUND_ROUTE]) {
    test(`${route.path} matches every D3 cell`, () => {
      expect(routeMetadata(route)).toEqual(expectedMetadata(route));
    });
  }

  test('project descriptions fall back from tagline to summary to the site description', () => {
    const project = PROJECTS[0];
    if (project === undefined) throw new Error('Expected at least one project.');

    const route = INDEXABLE_ROUTES.find(
      (candidate) => candidate.kind === 'project' && candidate.project === project,
    );
    if (route === undefined) throw new Error('Expected a project route.');

    const withoutTagline = {
      ...route,
      project: { ...project, meta: { ...project.meta, tagline: undefined } },
    };
    expect(routeMetadata(withoutTagline).description).toBe(
      project.meta.summary ?? SITE.meta.description,
    );

    const withoutSummary = {
      ...route,
      project: {
        ...project,
        meta: { ...project.meta, tagline: undefined, summary: undefined },
      },
    };
    expect(routeMetadata(withoutSummary).description).toBe(SITE.meta.description);
  });

  test('the not-found metadata has no canonical or og:url', () => {
    const metadata = routeMetadata(NOT_FOUND_ROUTE);

    expect(metadata.alternates).toEqual({});
    expect(metadata.openGraph).not.toHaveProperty('url');
  });
});

describe('base metadata and viewport', () => {
  test('base metadata is the safe not-found payload plus the production base, icons and template', () => {
    expect(baseMetadata()).toEqual({
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
    });
  });

  test('viewport theme colors come from the light and dark blueprint paper roles', () => {
    expect(SITE_VIEWPORT).toEqual({
      themeColor: [
        { media: '(prefers-color-scheme: light)', color: blueprint.light.paper },
        { media: '(prefers-color-scheme: dark)', color: blueprint.dark.paper },
      ],
    });
  });
});
