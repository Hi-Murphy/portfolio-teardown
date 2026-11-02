import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, test } from 'vitest';
import type { Project } from 'xploder';

import { JsonLd } from '../components/json-ld';
import { PROJECTS } from '../content/projects';
import { SITE } from '../content/site';
import type { SiteCopy } from '../content/site-copy';
import { personLd, projectLd } from '../seo/json-ld';
import { absoluteUrl } from '../seo/site-url';

const project = PROJECTS[0];
if (project === undefined) throw new Error('Expected at least one project.');

const projectPath = `/projects/${project.meta.slug}`;

function contentSameAs(identity: SiteCopy['identity']): string[] {
  const urls: string[] = [];

  for (const link of identity.links) {
    if (link.url !== null) urls.push(link.url);
  }

  return urls;
}

function stringLeaves(
  value: unknown,
  path: readonly string[] = [],
): Array<{ readonly path: readonly string[]; readonly value: string }> {
  if (typeof value === 'string') return [{ path, value }];

  if (Array.isArray(value)) {
    return value.flatMap((entry, index) => stringLeaves(entry, [...path, String(index)]));
  }

  if (value !== null && typeof value === 'object') {
    return Object.entries(value).flatMap(([key, entry]) => stringLeaves(entry, [...path, key]));
  }

  return [];
}

function allStrings(value: unknown): string[] {
  return stringLeaves(value).map((leaf) => leaf.value);
}

describe('JSON-LD mappers', () => {
  test('home matches the D7 Person table from content', () => {
    expect(personLd()).toEqual({
      '@context': 'https://schema.org',
      '@type': 'Person',
      name: SITE.identity.name,
      jobTitle: SITE.identity.role,
      url: absoluteUrl('/'),
      sameAs: contentSameAs(SITE.identity),
    });
  });

  test('project matches the D7 software table from content', () => {
    expect(projectLd(project)).toEqual({
      '@context': 'https://schema.org',
      '@type': ['SoftwareApplication', 'SoftwareSourceCode'],
      name: project.meta.name,
      description: project.meta.summary ?? project.meta.tagline,
      url: absoluteUrl(projectPath),
      author: {
        '@type': 'Person',
        name: SITE.identity.name,
        url: absoluteUrl('/'),
      },
      codeRepository: project.meta.links.find((link) => link.label === 'Source')?.url,
    });
  });

  test('sameAs keeps content order and skips null URLs', () => {
    const identity: SiteCopy['identity'] = {
      ...SITE.identity,
      links: [
        { label: 'Missing', url: null },
        { label: 'First', url: 'https://example.com/first' },
        { label: 'Second', url: 'https://example.com/second' },
      ],
    };

    expect(personLd(identity).sameAs).toEqual([
      'https://example.com/first',
      'https://example.com/second',
    ]);
  });

  test('project description falls back from summary to tagline', () => {
    const withoutSummary: Project = {
      ...project,
      meta: { ...project.meta, summary: undefined },
    };

    expect(projectLd(withoutSummary).description).toBe(project.meta.tagline);
  });

  test('a project without a Source link omits codeRepository', () => {
    const withoutSource: Project = {
      ...project,
      meta: {
        ...project.meta,
        links: project.meta.links.filter((link) => link.label !== 'Source'),
      },
    };

    expect(projectLd(withoutSource)).not.toHaveProperty('codeRepository');
  });

  test('every leaf traces to content or an absolute self URL', () => {
    const contentStrings = new Set(allStrings({ site: SITE, project }));
    const selfUrls = new Set([absoluteUrl('/'), absoluteUrl(projectPath)]);
    const documents = [
      ['person', personLd()],
      ['project', projectLd(project)],
    ] as const;

    for (const [name, document] of documents) {
      for (const leaf of stringLeaves(document)) {
        if (leaf.path.some((segment) => segment.startsWith('@'))) continue;

        expect(
          contentStrings.has(leaf.value) || selfUrls.has(leaf.value),
          `${name}.${leaf.path.join('.')} = ${leaf.value}`,
        ).toBe(true);
      }
    }
  });
});

describe('<JsonLd>', () => {
  test('renders JSON in an application/ld+json script', () => {
    const data = personLd();
    const html = renderToStaticMarkup(createElement(JsonLd, { data }));
    const open = '<script type="application/ld+json">';

    expect(html.startsWith(open)).toBe(true);
    expect(html.endsWith('</script>')).toBe(true);
    expect(html.slice(open.length, -'</script>'.length)).toBe(
      JSON.stringify(data).replace(/</g, '\\u003c'),
    );
  });

  test('escapes a synthetic </script> string', () => {
    const hostile = '</script><script>alert(1)</script>';
    const data = personLd({ ...SITE.identity, name: hostile });
    const html = renderToStaticMarkup(createElement(JsonLd, { data }));

    expect(html).toContain('\\u003c/script>');
    expect(html).not.toContain(hostile);
    expect(html.match(/<\/script>/g)).toHaveLength(1);
  });
});
