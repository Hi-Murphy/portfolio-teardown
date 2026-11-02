import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import ts from 'typescript';
import { describe, expect, test } from 'vitest';

import type { SiteCopy } from '../content/site-copy';
import { collectSourceFiles, formatHits, lineOf, snippetAt, type Hit } from './source-scan';

const APP_ROOT = fileURLToPath(new URL('../app/', import.meta.url));
const COMPONENTS_ROOT = fileURLToPath(new URL('../components/', import.meta.url));
const CONTENT_ROOT = fileURLToPath(new URL('../content/', import.meta.url));
const PROJECT_JSON_PATH = fileURLToPath(
  new URL('../../../.specify/content/websocket-inspector.json', import.meta.url),
);
const SITE_JSON_PATH = fileURLToPath(
  new URL('../../../.specify/content/site.json', import.meta.url),
);
const PROJECT_SOURCE_PATH = fileURLToPath(
  new URL('../content/projects/websocket-inspector.source.ts', import.meta.url),
);
const SITE_SOURCE_PATH = fileURLToPath(new URL('../content/site.source.ts', import.meta.url));
const MIN_COPY_LENGTH = 12;

interface ProjectCopy {
  readonly meta: {
    readonly name: string;
    readonly tagline?: string;
    readonly summary?: string;
  };
  readonly story?: {
    readonly headline?: string;
    readonly problem?: string;
    readonly approach?: string;
    readonly outcome?: string;
    readonly metrics?: readonly {
      readonly label: string;
      readonly value: string;
    }[];
  };
  readonly layers: readonly {
    readonly name: string;
    readonly components: readonly {
      readonly name: string;
      readonly summary?: string;
    }[];
  }[];
}

type CopyRule = 'project-copy' | 'site-copy';

interface SourceCopy {
  readonly value: string;
  readonly start: number;
}

function longStrings(values: readonly (string | undefined)[]): string[] {
  return [
    ...new Set(
      values.filter(
        (value): value is string => typeof value === 'string' && value.length >= MIN_COPY_LENGTH,
      ),
    ),
  ];
}

function collectProjectStrings(project: ProjectCopy): string[] {
  return longStrings([
    project.meta.name,
    project.meta.tagline,
    project.meta.summary,
    project.story?.headline,
    project.story?.problem,
    project.story?.approach,
    project.story?.outcome,
    ...(project.story?.metrics ?? []).flatMap((metric) => [metric.label, metric.value]),
    ...project.layers.flatMap((layer) => [
      layer.name,
      ...layer.components.flatMap((component) => [component.name, component.summary]),
    ]),
  ]);
}

function collectSiteStrings(site: SiteCopy): string[] {
  return longStrings([
    site.identity.name,
    site.identity.role,
    site.hero.eyebrow,
    site.hero.headline,
    site.hero.subline,
    site.hero.primaryCta.label,
    site.hero.secondaryCta.label,
    ...site.about.paragraphs,
    site.about.skillsNote,
    site.footer.line,
    site.meta.title,
    site.meta.description,
  ]);
}

function scriptKindFor(file: string): ts.ScriptKind {
  if (file.endsWith('.tsx')) return ts.ScriptKind.TSX;
  if (file.endsWith('.jsx') || file.endsWith('.js') || file.endsWith('.mjs')) {
    return ts.ScriptKind.JSX;
  }

  return ts.ScriptKind.TS;
}

function sourceCopy(file: string, text: string): SourceCopy[] {
  if (!/\.[cm]?[jt]sx?$/.test(file)) return [];

  const sourceFile = ts.createSourceFile(
    file,
    text,
    ts.ScriptTarget.Latest,
    true,
    scriptKindFor(file),
  );
  const copies: SourceCopy[] = [];

  function visit(node: ts.Node): void {
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
      copies.push({ value: node.text, start: node.getStart(sourceFile) });
    } else if (ts.isJsxText(node)) {
      const value = node.text.replace(/\s+/g, ' ').trim();

      if (value.length > 0) {
        copies.push({ value, start: node.getStart(sourceFile) });
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);

  return copies;
}

function scanTextForCopy(
  text: string,
  file: string,
  strings: readonly string[],
  rule: CopyRule,
): Hit[] {
  const wanted = new Set(strings);

  return sourceCopy(file, text)
    .filter((copy) => wanted.has(copy.value))
    .map((copy) => ({
      file,
      line: lineOf(text, copy.start),
      rule,
      snippet: snippetAt(text, copy.start),
    }));
}

function sourceFiles(root: string): string[] {
  return existsSync(root) ? collectSourceFiles(root) : [];
}

function scanForbiddenCopy(files: readonly string[]): Hit[] {
  const projectJson = JSON.parse(readFileSync(PROJECT_JSON_PATH, 'utf8')) as ProjectCopy;
  const siteJson = JSON.parse(readFileSync(SITE_JSON_PATH, 'utf8')) as SiteCopy;
  const projectStrings = collectProjectStrings(projectJson);
  const siteStrings = collectSiteStrings(siteJson);

  return files.flatMap((file) => {
    const text = readFileSync(file, 'utf8');
    const hits: Hit[] = [];

    if (file !== PROJECT_SOURCE_PATH) {
      hits.push(...scanTextForCopy(text, file, projectStrings, 'project-copy'));
    }

    if (file !== SITE_SOURCE_PATH) {
      hits.push(...scanTextForCopy(text, file, siteStrings, 'site-copy'));
    }

    return hits;
  });
}

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, 'utf8')) as T;
}

function firstString(values: readonly string[], label: string): string {
  const value = values[0];

  if (value === undefined) throw new Error(`No ${label} copy collected.`);

  return value;
}

describe('hand-copied content scanner', () => {
  const project = readJson<ProjectCopy>(PROJECT_JSON_PATH);
  const site = readJson<SiteCopy>(SITE_JSON_PATH);
  const projectStrings = collectProjectStrings(project);
  const siteStrings = collectSiteStrings(site);

  test('ignores canonical strings shorter than twelve characters', () => {
    expect(longStrings(['About', 'Projects', 'More teardowns in progress.'])).toEqual([
      'More teardowns in progress.',
    ]);
  });

  test('the generated project source carries every collected project string', () => {
    const text = readFileSync(PROJECT_SOURCE_PATH, 'utf8');
    const missing = projectStrings.filter((value) => !text.includes(value));

    expect(missing).toEqual([]);
  });

  test('the generated site source carries every collected site string', () => {
    const text = readFileSync(SITE_SOURCE_PATH, 'utf8');
    const missing = siteStrings.filter((value) => !text.includes(value));

    expect(missing).toEqual([]);
  });

  test('app and components contain no hand-copied project or site content', () => {
    const hits = scanForbiddenCopy([...sourceFiles(APP_ROOT), ...sourceFiles(COMPONENTS_ROOT)]);

    expect(hits, formatHits(hits)).toEqual([]);
  });

  test('content copy appears only in its generated source module', () => {
    const hits = scanForbiddenCopy(sourceFiles(CONTENT_ROOT));

    expect(hits, formatHits(hits)).toEqual([]);
  });

  test('negative control catches hand-copied project content', () => {
    const sample = firstString(projectStrings, 'project');
    const hits = scanTextForCopy(
      `const copied = ${JSON.stringify(sample)};`,
      'fixture.tsx',
      [sample],
      'project-copy',
    );

    expect(
      hits.map((hit) => hit.rule),
      formatHits(hits),
    ).toEqual(['project-copy']);
  });

  test('negative control catches hand-copied site content', () => {
    const sample = firstString(siteStrings, 'site');
    const hits = scanTextForCopy(`<p>${sample}</p>`, 'fixture.tsx', [sample], 'site-copy');

    expect(
      hits.map((hit) => hit.rule),
      formatHits(hits),
    ).toEqual(['site-copy']);
  });
});
