import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, test, vi } from 'vitest';

vi.mock('../components/hero/hero-live', () => ({
  HeroLive: () => null,
}));

const FEATURE_ROOT = fileURLToPath(
  new URL('../../../.specify/features/home-composition/', import.meta.url),
);

function pageSectionIds(sections: readonly string[], layoutSections: readonly string[]): string[] {
  return sections.filter((id) => !layoutSections.includes(id));
}

function renderedSectionOrder(html: string): string[] {
  return [...html.matchAll(/<section\b[^>]*\bdata-home-section="([^"]+)"/g)].map(
    (match) => match[1] ?? '',
  );
}

describe('home section data', () => {
  afterEach(() => {
    vi.doUnmock('../content/home-sections');
    vi.resetModules();
  });

  test('the registry has one component for every page-owned id', async () => {
    const { HOME_SECTIONS, LAYOUT_SECTIONS } = await import('../content/home-sections');
    const { HOME_SECTION_REGISTRY } = await import('../components/home/registry');

    expect(Object.keys(HOME_SECTION_REGISTRY).sort()).toEqual(
      pageSectionIds(HOME_SECTIONS, LAYOUT_SECTIONS).sort(),
    );
  });

  test('HOME_SECTIONS starts with nav and ends with footer', async () => {
    const { HOME_SECTIONS } = await import('../content/home-sections');

    expect(HOME_SECTIONS[0]).toBe('nav');
    expect(HOME_SECTIONS.at(-1)).toBe('footer');
  });

  test('the page follows a permuted HOME_SECTIONS list', async () => {
    vi.resetModules();
    vi.doMock('../content/home-sections', () => ({
      HOME_SECTIONS: ['nav', 'hero', 'about', 'projects', 'footer'],
      LAYOUT_SECTIONS: ['nav', 'footer'],
    }));

    const { default: HomePage } = await import('../app/(site)/page');
    const html = renderToStaticMarkup(createElement(HomePage));

    expect(renderedSectionOrder(html)).toEqual(['hero', 'about', 'projects']);
  });

  test('the unmocked list matches the approved list', async () => {
    const { HOME_SECTIONS } = await import('../content/home-sections');
    const approved = readFileSync(`${FEATURE_ROOT}/g1-approved.txt`, 'utf8')
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);

    expect([...HOME_SECTIONS]).toEqual(approved);
  });
});
