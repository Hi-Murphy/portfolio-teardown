import { readFileSync } from 'node:fs';
import { relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

import ts from 'typescript';
import { describe, expect, test } from 'vitest';

import { collectSourceFiles, formatHits, lineOf, snippetAt, type Hit } from './source-scan';

const WEB_ROOT = fileURLToPath(new URL('..', import.meta.url));
const PROBE_SOURCE_PATH = fileURLToPath(
  new URL('../../../tools/perf/src/home-probe.ts', import.meta.url),
);

const HOME_PAGE = fileURLToPath(new URL('../app/(site)/page.tsx', import.meta.url));
const HOME_COMPONENTS_ROOT = fileURLToPath(new URL('../components/home/', import.meta.url));
const ABOUT_STRIP = fileURLToPath(new URL('../components/about-strip.tsx', import.meta.url));
const HOME_SECTIONS = fileURLToPath(new URL('../content/home-sections.ts', import.meta.url));
const SITE_NAV = fileURLToPath(new URL('../components/site-nav.tsx', import.meta.url));
const NAV_PROJECTS_LINK = fileURLToPath(
  new URL('../components/nav-projects-link.tsx', import.meta.url),
);
const SITE_FOOTER = fileURLToPath(new URL('../components/site-footer.tsx', import.meta.url));

const TEXT_ATTRIBUTES = new Set(['aria-label', 'title', 'alt', 'placeholder']);
const TEXT_BEARING_RULES = {
  attribute: 'text-attribute',
  child: 'jsx-text-literal',
  text: 'jsx-text',
} as const;

export const HOME_COPY_UI_ALLOWLIST = [
  'Skip to content',
  'Back to top ↑',
  'Switch to light theme',
  'Switch to dark theme',
  'Primary',
  'Tech',
] as const;

function scriptKindFor(file: string): ts.ScriptKind {
  if (file.endsWith('.tsx')) return ts.ScriptKind.TSX;
  if (file.endsWith('.jsx') || file.endsWith('.js') || file.endsWith('.mjs')) {
    return ts.ScriptKind.JSX;
  }

  return ts.ScriptKind.TS;
}

function unwrapExpression(node: ts.Expression): ts.Expression {
  let current = node;

  while (
    ts.isAsExpression(current) ||
    ts.isSatisfiesExpression(current) ||
    ts.isParenthesizedExpression(current)
  ) {
    current = current.expression;
  }

  return current;
}

function probeUiAllowlist(): string[] {
  const text = readFileSync(PROBE_SOURCE_PATH, 'utf8');
  const sourceFile = ts.createSourceFile(
    PROBE_SOURCE_PATH,
    text,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
  let values: string[] | null = null;

  function visit(node: ts.Node): void {
    if (values !== null) return;

    if (
      ts.isVariableDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      node.name.text === 'HOME_PROBE_UI_ALLOWLIST' &&
      node.initializer !== undefined
    ) {
      const initializer = unwrapExpression(node.initializer);
      if (!ts.isArrayLiteralExpression(initializer)) {
        throw new Error('HOME_PROBE_UI_ALLOWLIST is not an array literal.');
      }

      values = initializer.elements.map((element) => {
        const value = unwrapExpression(element as ts.Expression);
        if (!ts.isStringLiteral(value) && !ts.isNoSubstitutionTemplateLiteral(value)) {
          throw new Error('HOME_PROBE_UI_ALLOWLIST contains a non-string entry.');
        }
        return value.text;
      });
      return;
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  if (values === null) throw new Error('HOME_PROBE_UI_ALLOWLIST was not found.');

  return values;
}

function hasLetters(value: string): boolean {
  return /\p{L}/u.test(value);
}

function scanSource(
  file: string,
  text: string,
  allowlist: readonly string[] = HOME_COPY_UI_ALLOWLIST,
): Hit[] {
  const sourceFile = ts.createSourceFile(
    file,
    text,
    ts.ScriptTarget.Latest,
    true,
    scriptKindFor(file),
  );
  const hits = new Map<string, Hit>();
  const allowed = (value: string): boolean => !hasLetters(value) || allowlist.includes(value);
  const add = (value: string, start: number, rule: string): void => {
    if (allowed(value)) return;
    const key = `${start}:${rule}`;
    if (hits.has(key)) return;
    hits.set(key, { file, line: lineOf(text, start), rule, snippet: snippetAt(text, start) });
  };
  function scanExpression(expression: ts.Expression): void {
    function visitExpression(node: ts.Node): void {
      if (ts.isJsxElement(node) || ts.isJsxFragment(node) || ts.isJsxSelfClosingElement(node)) {
        return;
      }

      if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
        add(node.text, node.getStart(sourceFile), TEXT_BEARING_RULES.child);
        return;
      }

      if (ts.isTemplateExpression(node)) {
        add(node.head.text, node.head.getStart(sourceFile), TEXT_BEARING_RULES.child);
        for (const span of node.templateSpans) {
          add(span.literal.text, span.literal.getStart(sourceFile), TEXT_BEARING_RULES.child);
        }
        return;
      }

      ts.forEachChild(node, visitExpression);
    }

    visitExpression(expression);
  }

  function visit(node: ts.Node): void {
    if (ts.isJsxText(node)) {
      const value = node.text.replace(/\s+/g, ' ').trim();
      if (value !== '') add(value, node.getStart(sourceFile), TEXT_BEARING_RULES.text);
    }

    if (ts.isJsxAttribute(node) && TEXT_ATTRIBUTES.has(node.name.getText(sourceFile))) {
      const initializer = node.initializer;
      if (initializer !== undefined) {
        if (ts.isStringLiteral(initializer)) {
          add(initializer.text, initializer.getStart(sourceFile), TEXT_BEARING_RULES.attribute);
        } else if (ts.isJsxExpression(initializer) && initializer.expression !== undefined) {
          scanExpression(initializer.expression);
        }
      }
    }

    if (
      ts.isJsxExpression(node) &&
      (ts.isJsxElement(node.parent) || ts.isJsxFragment(node.parent)) &&
      node.expression !== undefined
    ) {
      scanExpression(node.expression);
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return [...hits.values()];
}

function scannedFiles(): string[] {
  return [
    ...new Set([
      HOME_PAGE,
      ...collectSourceFiles(HOME_COMPONENTS_ROOT),
      ABOUT_STRIP,
      HOME_SECTIONS,
      SITE_NAV,
      NAV_PROJECTS_LINK,
      SITE_FOOTER,
    ]),
  ].sort((left, right) => left.localeCompare(right));
}

function displayPath(file: string): string {
  return relative(WEB_ROOT, file).split(sep).join('/');
}

describe('home copy AST scan', () => {
  test('the local UI allowlist equals the rendered-probe allowlist', () => {
    const probeAllowlist = probeUiAllowlist();

    expect(HOME_COPY_UI_ALLOWLIST).toEqual(probeAllowlist);
    expect(HOME_COPY_UI_ALLOWLIST).toEqual(
      expect.arrayContaining([
        'Skip to content',
        'Back to top ↑',
        'Switch to light theme',
        'Switch to dark theme',
        'Primary',
        'Tech',
      ]),
    );
    console.log(`home-copy allowlist: ${HOME_COPY_UI_ALLOWLIST.join(' | ')}`);
  });

  test('the home surface has no hand-typed copy', () => {
    const files = scannedFiles();
    const hits = files.flatMap((file) => scanSource(file, readFileSync(file, 'utf8')));

    console.log(
      [
        `home-copy scanned files (${files.length}):`,
        ...files.map((file) => `  ${displayPath(file)}`),
      ].join('\n'),
    );
    expect(
      hits.map((hit) => ({ ...hit, file: displayPath(hit.file) })),
      formatHits(hits),
    ).toEqual([]);
  });

  test('negative controls catch JSX text, text attributes and expression branches', () => {
    const hits = scanSource(
      'fixture.tsx',
      '<div><p>Hello recruiter</p><a aria-label="Foo" />{cond ? "Hi there" : null}</div>',
    );

    expect(hits.map((hit) => hit.rule)).toEqual([
      TEXT_BEARING_RULES.text,
      TEXT_BEARING_RULES.attribute,
      TEXT_BEARING_RULES.child,
    ]);
    console.log(`negative controls: ${hits.map((hit) => hit.rule).join(', ')}`);
  });

  test('negative controls catch logical branches and template head/middle/tail text', () => {
    const hits = scanSource(
      'fixture.tsx',
      '<div>{ready && `Hello ${name} there`}{cond ? "Hi there" : null}</div>',
    );

    expect(hits).toHaveLength(3);
    expect(hits.map((hit) => hit.rule)).toEqual([
      TEXT_BEARING_RULES.child,
      TEXT_BEARING_RULES.child,
      TEXT_BEARING_RULES.child,
    ]);
  });
});
