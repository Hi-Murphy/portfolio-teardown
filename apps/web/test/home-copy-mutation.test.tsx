// @ts-expect-error jsdom does not ship its own TypeScript declarations.
import { JSDOM } from 'jsdom';
import type { ComponentType } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, test, vi } from 'vitest';

import { siteSource } from '../content/site.source';

vi.mock('../components/hero/hero-boot', () => ({ bootHeroStage: vi.fn() }));
vi.mock('next/navigation', () => ({ usePathname: () => '/' }));
vi.mock('../content/site', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../content/site')>();
  return { SITE: cloneWithSuffix(actual.SITE) };
});

const SENTINEL = ' ⟦S⟧';

interface CopyEntry {
  readonly label: string;
  readonly value: string;
}

interface HomeComponents {
  readonly HomePage: ComponentType;
  readonly SiteFooter: ComponentType;
  readonly SiteNav: ComponentType;
}

function cloneWithSuffix<T>(value: T): T {
  if (typeof value === 'string') return `${value} ⟦S⟧` as T;
  if (Array.isArray(value)) return value.map((item) => cloneWithSuffix(item)) as T;
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, cloneWithSuffix(item)]),
    ) as T;
  }

  return value;
}

function collectStrings(label: string, value: unknown): CopyEntry[] {
  if (typeof value === 'string') return [{ label, value }];
  if (Array.isArray(value)) {
    return value.flatMap((item, index) => collectStrings(`${label}[${index}]`, item));
  }
  if (value !== null && typeof value === 'object') {
    return Object.entries(value).flatMap(([key, item]) => collectStrings(`${label}.${key}`, item));
  }

  return [];
}

function homeStrings(): CopyEntry[] {
  return [
    ...collectStrings('identity.name', siteSource.identity.name),
    ...collectStrings('identity.role', siteSource.identity.role),
    ...collectStrings('identity.location', siteSource.identity.location),
    ...collectStrings('identity.email', siteSource.identity.email),
    ...siteSource.identity.links.map((link, index) => ({
      label: `identity.links[${index}].label`,
      value: link.label,
    })),
    // hero.loopPause / hero.loopPlay label a client-only control that mounts after the live
    // hero's first frame (R7); home-hero-loop.test.tsx covers them.
    ...collectStrings('hero', siteSource.hero).filter(
      (entry) => entry.label !== 'hero.loopPause' && entry.label !== 'hero.loopPlay',
    ),
    ...collectStrings('about.title', siteSource.about.title),
    ...collectStrings('about.paragraphs', siteSource.about.paragraphs),
    ...collectStrings('about.skillsNote', siteSource.about.skillsNote),
    ...collectStrings('projects.title', siteSource.projects.title),
    ...collectStrings('projects.emptyNote', siteSource.projects.emptyNote),
    ...collectStrings('contact.title', siteSource.contact.title),
    ...collectStrings('footer.line', siteSource.footer.line),
    ...collectStrings('footer.contactLabel', siteSource.footer.contactLabel),
    ...collectStrings('meta.siteName', siteSource.meta.siteName),
  ];
}

function escapeHtml(value: string): string {
  const escapes: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
  };

  return value.replace(/[&<>"']/g, (character) => escapes[character] ?? character);
}

function normaliseText(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function standaloneTextNodes(markup: string): string[] {
  const document = new JSDOM(markup).window.document;
  const walker = document.createTreeWalker(document.body, 4);
  const values: string[] = [];

  for (let node = walker.nextNode(); node !== null; node = walker.nextNode()) {
    if (node.parentElement?.closest('script,style,template,noscript') !== null) continue;
    const value = normaliseText(node.textContent ?? '');
    if (value !== '') values.push(value);
  }

  return values;
}

async function loadHomeComponents(): Promise<HomeComponents> {
  const [{ default: HomePage }, { SiteFooter }, { SiteNav }] = await Promise.all([
    import('../app/(site)/page'),
    import('../components/site-footer'),
    import('../components/site-nav'),
  ]);

  return { HomePage, SiteFooter, SiteNav };
}

function renderHome({ HomePage, SiteFooter, SiteNav }: HomeComponents): string {
  return renderToStaticMarkup(
    <>
      <SiteNav />
      <main id="main">
        <HomePage />
      </main>
      <SiteFooter />
    </>,
  );
}

function enableSsrHero(): void {
  vi.stubGlobal('__XP_EAGER_HERO__', true);
  vi.stubGlobal('__XP_EAGER_3D__', false);
}

describe('home copy mutation', () => {
  afterEach(() => vi.unstubAllGlobals());

  test('every home string comes from SITE', async () => {
    enableSsrHero();
    const components = await loadHomeComponents();
    const entries = homeStrings();
    const markup = renderHome(components);
    const textNodes = standaloneTextNodes(markup);
    const missing = entries.filter(
      ({ value }) => !markup.includes(escapeHtml(`${value}${SENTINEL}`)),
    );
    const unmutated = entries.filter(({ value }) => textNodes.includes(normaliseText(value)));
    const sentinelCount = markup.split(SENTINEL).length - 1;

    console.log(
      `home-copy mutation: ${entries.length} strings, ${sentinelCount} sentinel occurrences, ${textNodes.length} standalone text nodes`,
    );
    expect(
      missing.map((entry) => entry.label),
      missing.map((entry) => entry.label).join('\n'),
    ).toEqual([]);
    expect(
      unmutated.map((entry) => entry.label),
      unmutated.map((entry) => entry.label).join('\n'),
    ).toEqual([]);
  });

  test('negative control: an unmocked render has no sentinel', async () => {
    enableSsrHero();
    vi.resetModules();
    vi.doMock('../content/site', async (importOriginal) => {
      const actual = await importOriginal<typeof import('../content/site')>();
      return { SITE: actual.SITE };
    });
    const { SITE } = await import('../content/site');
    expect(SITE.identity.name).not.toContain(SENTINEL);
    const components = await loadHomeComponents();
    const markup = renderHome(components);

    console.log(
      `home-copy negative control: unmocked sentinel count ${markup.split(SENTINEL).length - 1}`,
    );
    expect(markup).not.toContain(SENTINEL);
  });
});
