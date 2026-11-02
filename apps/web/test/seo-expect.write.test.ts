import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import type { Metadata, Viewport } from 'next';
import { test } from 'vitest';

import { personLd, projectLd } from '../seo/json-ld';
import { baseMetadata, routeMetadata, SITE_VIEWPORT } from '../seo/metadata';
import { INDEXABLE_ROUTES, type SeoRoute } from '../seo/routes';
import { absoluteUrl } from '../seo/site-url';

interface ExpectedTag {
  tag: 'title' | 'meta' | 'link';
  attribute?: 'name' | 'property' | 'rel';
  key?: string;
  value: string;
}

interface ExpectedLink {
  rel: string;
  href: string;
  type?: string;
}

interface ExpectedThemeColor {
  media: string;
  content: string;
}

interface ExpectedRoute {
  path: string;
  kind: 'home' | 'projects' | 'project';
  canonical: string;
  ogImagePath: string;
  title: string;
  description: string;
  tags: ExpectedTag[];
  jsonLd?: Record<string, unknown>;
}

interface SeoExpectation {
  schemaVersion: 1;
  siteUrl: string;
  routes: ExpectedRoute[];
  everyPage: {
    links: ExpectedLink[];
    themeColors: ExpectedThemeColor[];
  };
}

interface OpenGraphMetadata {
  title?: unknown;
  description?: unknown;
  siteName?: unknown;
  locale?: unknown;
  type?: unknown;
  images?: unknown;
}

interface TwitterMetadata {
  card?: unknown;
  title?: unknown;
  description?: unknown;
  images?: unknown;
}

interface IconMetadata {
  icon?: unknown;
  apple?: unknown;
}

interface ImageMetadata {
  url?: unknown;
  width?: unknown;
  height?: unknown;
  type?: unknown;
  alt?: unknown;
}

function valueOf(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`Expected metadata ${field} to be a non-empty string.`);
  }

  return value;
}

function numberString(value: unknown, field: string): string {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`Expected metadata ${field} to be a finite number.`);
  }

  return String(value);
}

function firstImage(value: unknown): ImageMetadata {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error('Expected at least one metadata image.');
  }

  const image = value[0];
  if (typeof image !== 'object' || image === null) {
    throw new Error('Expected metadata image details.');
  }

  return image as ImageMetadata;
}

function firstImageUrl(value: unknown): string {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error('Expected at least one Twitter image.');
  }

  const image = value[0];
  if (typeof image === 'string') return image;
  if (typeof image === 'object' && image !== null && 'url' in image) {
    return valueOf(image.url, 'twitter.images[0].url');
  }

  throw new Error('Expected a Twitter image URL.');
}

function titleOf(metadata: Metadata): string {
  const title = metadata.title;
  if (typeof title === 'object' && title !== null && 'absolute' in title) {
    return valueOf(title.absolute, 'title.absolute');
  }

  return valueOf(title, 'title');
}

function canonicalOf(metadata: Metadata): string {
  const alternates = metadata.alternates;
  if (typeof alternates !== 'object' || alternates === null) {
    throw new Error('Expected metadata alternates.');
  }

  return valueOf(alternates.canonical, 'alternates.canonical');
}

function routeTags(route: SeoRoute, metadata: Metadata): ExpectedTag[] {
  const openGraph = metadata.openGraph as OpenGraphMetadata | undefined;
  const twitter = metadata.twitter as TwitterMetadata | undefined;
  if (openGraph === undefined || twitter === undefined) {
    throw new Error(`Expected Open Graph and Twitter metadata for ${route.path}.`);
  }

  const image = firstImage(openGraph.images);
  const description = valueOf(metadata.description, 'description');
  const canonical = canonicalOf(metadata);

  return [
    { tag: 'title', value: titleOf(metadata) },
    { tag: 'meta', attribute: 'name', key: 'description', value: description },
    { tag: 'link', attribute: 'rel', key: 'canonical', value: canonical },
    {
      tag: 'meta',
      attribute: 'property',
      key: 'og:title',
      value: valueOf(openGraph.title, 'openGraph.title'),
    },
    {
      tag: 'meta',
      attribute: 'property',
      key: 'og:description',
      value: valueOf(openGraph.description, 'openGraph.description'),
    },
    {
      tag: 'meta',
      attribute: 'property',
      key: 'og:site_name',
      value: valueOf(openGraph.siteName, 'openGraph.siteName'),
    },
    {
      tag: 'meta',
      attribute: 'property',
      key: 'og:locale',
      value: valueOf(openGraph.locale, 'openGraph.locale'),
    },
    {
      tag: 'meta',
      attribute: 'property',
      key: 'og:type',
      value: valueOf(openGraph.type, 'openGraph.type'),
    },
    { tag: 'meta', attribute: 'property', key: 'og:url', value: canonical },
    {
      tag: 'meta',
      attribute: 'property',
      key: 'og:image',
      value: new URL(valueOf(image.url, 'openGraph.images[0].url'), canonical).href,
    },
    {
      tag: 'meta',
      attribute: 'property',
      key: 'og:image:width',
      value: numberString(image.width, 'openGraph.images[0].width'),
    },
    {
      tag: 'meta',
      attribute: 'property',
      key: 'og:image:height',
      value: numberString(image.height, 'openGraph.images[0].height'),
    },
    {
      tag: 'meta',
      attribute: 'property',
      key: 'og:image:type',
      value: valueOf(image.type, 'openGraph.images[0].type'),
    },
    {
      tag: 'meta',
      attribute: 'property',
      key: 'og:image:alt',
      value: valueOf(image.alt, 'openGraph.images[0].alt'),
    },
    {
      tag: 'meta',
      attribute: 'name',
      key: 'twitter:card',
      value: valueOf(twitter.card, 'twitter.card'),
    },
    {
      tag: 'meta',
      attribute: 'name',
      key: 'twitter:title',
      value: valueOf(twitter.title, 'twitter.title'),
    },
    {
      tag: 'meta',
      attribute: 'name',
      key: 'twitter:description',
      value: valueOf(twitter.description, 'twitter.description'),
    },
    {
      tag: 'meta',
      attribute: 'name',
      key: 'twitter:image',
      value: new URL(firstImageUrl(twitter.images), canonical).href,
    },
  ];
}

function iconUrl(value: unknown): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'object' && value !== null && 'url' in value) {
    return valueOf(value.url, 'icons.url');
  }

  throw new Error('Expected an icon URL.');
}

function expectedLinks(metadata: Metadata): ExpectedLink[] {
  const icons = metadata.icons as IconMetadata | undefined;
  if (icons === undefined) throw new Error('Expected icon metadata.');

  const icon = Array.isArray(icons.icon) ? icons.icon[0] : icons.icon;
  const iconRecord =
    typeof icon === 'object' && icon !== null
      ? (icon as { url?: unknown; type?: unknown })
      : undefined;
  return [
    {
      rel: 'icon',
      href: iconUrl(icon),
      ...(iconRecord?.type === undefined
        ? {}
        : { type: valueOf(iconRecord.type, 'icons.icon.type') }),
    },
    { rel: 'apple-touch-icon', href: iconUrl(icons.apple) },
  ];
}

function themeColors(viewport: Viewport): ExpectedThemeColor[] {
  if (!Array.isArray(viewport.themeColor)) throw new Error('Expected theme-color metadata array.');

  return viewport.themeColor.map((item, index) => ({
    media: valueOf(item.media, `viewport.themeColor[${index}].media`),
    content: valueOf(item.color, `viewport.themeColor[${index}].color`),
  }));
}

function expectedRoute(route: SeoRoute): ExpectedRoute {
  if (route.kind === 'not-found') {
    throw new Error('The expectation writer only serializes indexable routes.');
  }

  const metadata = routeMetadata(route);
  const common = {
    path: route.path,
    canonical: canonicalOf(metadata),
    ogImagePath: route.ogImagePath,
    title: titleOf(metadata),
    description: valueOf(metadata.description, 'description'),
    tags: routeTags(route, metadata),
  };

  if (route.kind === 'home') {
    return {
      ...common,
      kind: 'home',
      jsonLd: personLd() as unknown as Record<string, unknown>,
    };
  }
  if (route.kind === 'projects') return { ...common, kind: 'projects' };
  if (route.project === undefined) throw new Error(`Expected a project for ${route.path}.`);

  return {
    ...common,
    kind: 'project',
    jsonLd: projectLd(route.project) as unknown as Record<string, unknown>,
  };
}

test.skipIf(!process.env.SEO_EXPECT_OUT)('writes content-derived SEO expectations', async () => {
  const output = process.env.SEO_EXPECT_OUT;
  if (output === undefined) throw new Error('SEO_EXPECT_OUT is required.');

  const expectation: SeoExpectation = {
    schemaVersion: 1,
    siteUrl: absoluteUrl('/'),
    routes: INDEXABLE_ROUTES.map(expectedRoute),
    everyPage: {
      links: expectedLinks(baseMetadata()),
      themeColors: themeColors(SITE_VIEWPORT),
    },
  };

  await writeFile(resolve(process.cwd(), output), `${JSON.stringify(expectation, null, 2)}\n`);
});
