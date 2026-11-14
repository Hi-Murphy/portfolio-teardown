import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, test } from 'vitest';

import { collectSourceFiles, type Hit } from './source-scan';

const JEV_JSON_PATH = fileURLToPath(
  new URL('../../../.specify/content/jev-toolkit.json', import.meta.url),
);
const JEV_SOURCE_PATH = fileURLToPath(
  new URL('../content/projects/jev-toolkit.source.ts', import.meta.url),
);
const EXPORT_HTML_PATH = fileURLToPath(
  new URL('../out/projects/jev-toolkit.html', import.meta.url),
);
const EXPORT_ROOT = fileURLToPath(new URL('../out/', import.meta.url));
const WEB_TEXT_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.mjs', '.css', '.md', '.txt']);
const EXPORT_EXTENSIONS = new Set(['.html', '.txt']);
const FRAMING_START = 'the JEV decision model';
const DENY_RULES = [
  { rule: 'built-jev', pattern: /\bbuilt\s+(the\s+)?JEV\b/i },
  { rule: 'jev-built-by', pattern: /\bJEV,?\s+built\s+by\b/i },
  { rule: 'possessive-jev', pattern: /\b(my|our)\s+JEV\b/i },
  { rule: 'first-person-jev', pattern: /\bI\s+(built|created|made|wrote)\s+(the\s+)?JEV\b/i },
] as const;
const SCAN_ROOTS = [
  fileURLToPath(new URL('../app/', import.meta.url)),
  fileURLToPath(new URL('../components/', import.meta.url)),
  fileURLToPath(new URL('../content/', import.meta.url)),
  fileURLToPath(new URL('../seo/', import.meta.url)),
] as const;

interface JevContent {
  readonly story: {
    readonly approach: string;
  };
}

function extractFramingPhrase(approach: string): string {
  const start = approach.indexOf(FRAMING_START);

  if (start === -1) return '';

  const end = approach.indexOf(')', start);

  return end === -1 ? '' : approach.slice(start, end + 1);
}

function decodeHtmlEntities(value: string): string {
  const entities: Record<string, string> = {
    '&amp;': '&',
    '&#x27;': "'",
    '&quot;': '"',
    '&lt;': '<',
    '&gt;': '>',
    '&#39;': "'",
  };

  return value.replace(/&(amp|quot|lt|gt|#x27|#39);/gi, (entity) => {
    return entities[entity.toLowerCase()] ?? entity;
  });
}

function exportedPageText(markup: string): string {
  const withoutScripts = markup.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, ' ');
  const withoutTags = withoutScripts.replace(/<[^>]*>/g, ' ');

  return decodeHtmlEntities(withoutTags).replace(/\s+/g, ' ').trim();
}

function scanDeniedFraming(text: string, file: string): Hit[] {
  return text.split('\n').flatMap((line, index) =>
    DENY_RULES.filter(({ pattern }) => pattern.test(line)).map(({ rule }) => ({
      file,
      line: index + 1,
      rule,
      snippet: line.trim(),
    })),
  );
}

function scanFiles(files: readonly string[]): Hit[] {
  return files.flatMap((file) => scanDeniedFraming(readFileSync(file, 'utf8'), file));
}

function formatHitLocations(hits: readonly Hit[]): string {
  return hits.map((hit) => `${hit.file}:${hit.line} ${hit.rule}`).join('\n');
}

describe('third-party framing', () => {
  const content = JSON.parse(readFileSync(JEV_JSON_PATH, 'utf8')) as JevContent;
  const approach = content.story.approach;
  const framingPhrase = extractFramingPhrase(approach);
  const hasExport = existsSync(EXPORT_HTML_PATH);

  test('extracts the framing phrase from the canonical approach', () => {
    expect(framingPhrase).not.toBe('');
    expect(framingPhrase.startsWith(FRAMING_START)).toBe(true);
    expect(framingPhrase.endsWith(')')).toBe(true);
    expect(framingPhrase.toLowerCase()).toContain('third-party');
  });

  test('the generated source carries the framing phrase verbatim', () => {
    expect(readFileSync(JEV_SOURCE_PATH, 'utf8')).toContain(framingPhrase);
  });

  test.skipIf(!hasExport)(
    'the exported page text carries the framing phrase (run pnpm build first)',
    () => {
      expect(exportedPageText(readFileSync(EXPORT_HTML_PATH, 'utf8'))).toContain(framingPhrase);
    },
  );

  test('web sources contain no built-by or first-person JEV framing', () => {
    const files = SCAN_ROOTS.flatMap((root) =>
      collectSourceFiles(root, { extensions: WEB_TEXT_EXTENSIONS }),
    );
    const hits = scanFiles(files);

    expect(
      hits.map((hit) => `${hit.file}:${hit.line} ${hit.rule}`),
      formatHitLocations(hits),
    ).toEqual([]);
  });

  test.skipIf(!hasExport)('the export contains no built-by or first-person JEV framing', () => {
    const files = collectSourceFiles(EXPORT_ROOT, { extensions: EXPORT_EXTENSIONS });
    const hits = scanFiles(files);

    expect(
      hits.map((hit) => `${hit.file}:${hit.line} ${hit.rule}`),
      formatHitLocations(hits),
    ).toEqual([]);
  });

  test('the deny-list does not flag the canonical approach', () => {
    const hits = scanDeniedFraming(approach, 'approach.txt');

    expect(
      hits.map((hit) => `${hit.file}:${hit.line} ${hit.rule}`),
      formatHitLocations(hits),
    ).toEqual([]);
  });

  test('negative control catches synthetic JEV framing', () => {
    const firstPersonHits = scanDeniedFraming('I built JEV last year', 'fixture.txt');
    const possessiveHits = scanDeniedFraming('our JEV model', 'fixture.txt');

    expect(firstPersonHits.map((hit) => hit.rule)).toContain('first-person-jev');
    expect(possessiveHits.map((hit) => hit.rule)).toContain('possessive-jev');
  });
});
