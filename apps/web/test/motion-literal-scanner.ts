import { readdirSync, readFileSync } from 'node:fs';
import { basename, extname, join, relative, resolve, sep } from 'node:path';

export const RULE_IDS = [
  'css-time',
  'css-easing',
  'gsap-ease',
  'motion-key',
  'tw-utility',
  'timer',
] as const;

export type MotionLiteralRule = (typeof RULE_IDS)[number];

export interface Hit {
  readonly file: string;
  readonly line: number;
  readonly rule: MotionLiteralRule;
  readonly snippet: string;
}

export interface ScanOptions {
  readonly exclude?: readonly string[];
}

const SOURCE_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.mjs', '.css']);
const DEFAULT_EXCLUDED_SEGMENTS = new Set(['node_modules', '.next', 'out', 'test']);

const CSS_DECLARATION = /\b(?:transition(?:-[a-z-]+)?|animation(?:-[a-z-]+)?)\s*:\s*([^;{}]+)/gi;
const CSS_TIME = /\d*\.?\d+m?s\b/gi;
const CSS_EASING =
  /(?<![\w-])(?:cubic-bezier\(|steps\()|(?<![\w-])(?:ease(?:-in-out|-in|-out)?|linear)(?![\w-])/gi;
const GSAP_EASE =
  /\b(?:power[0-4]|expo|sine|circ|back|elastic|bounce|quad|cubic|quart|quint|strong)\.(?:in|out|inOut)\b/g;
const MOTION_KEY =
  /(?<![\w$-])(?:duration|delay|ease|easing|stagger|repeatDelay|transition|animation|animationDuration|transitionDuration)\s*:\s*(?:-?(?:\d+(?:\.\d+)?|\.\d+)(?:e[+-]?\d+)?(?![\w.])|'[^'\n]*'|"[^"\n]*"|`[^`\n]*`)/g;
const TW_UTILITY =
  /(?<![\w-])(?:(?:duration|delay)-\d+|(?:duration|delay)-\[|ease-(?:in-out|in|out|linear)|ease-\[|animate-(?:spin|ping|pulse|bounce)|animate-\[)/g;
const TIMER = /\bset(?:Timeout|Interval)\([^,]+,\s*\d/g;

function lineNumber(text: string, index: number): number {
  let line = 1;

  for (let position = 0; position < index; position += 1) {
    if (text.charCodeAt(position) === 10) {
      line += 1;
    }
  }

  return line;
}

function lineSnippet(text: string, index: number): string {
  const start = text.lastIndexOf('\n', index - 1) + 1;
  const end = text.indexOf('\n', index);

  return text.slice(start, end === -1 ? text.length : end).trim();
}

function visitMatches(
  text: string,
  file: string,
  rule: MotionLiteralRule,
  pattern: RegExp,
  hits: Hit[],
): void {
  for (const match of text.matchAll(pattern)) {
    if (match.index === undefined) {
      continue;
    }

    hits.push({
      file,
      line: lineNumber(text, match.index),
      rule,
      snippet: lineSnippet(text, match.index),
    });
  }
}

function visitCssDeclarations(text: string, file: string, hits: Hit[]): void {
  for (const declaration of text.matchAll(CSS_DECLARATION)) {
    if (declaration.index === undefined) {
      continue;
    }

    const value = declaration[1];

    if (value === undefined) {
      continue;
    }

    const valueOffset = declaration.index + declaration[0].indexOf(value);

    for (const match of value.matchAll(CSS_TIME)) {
      if (match.index === undefined) {
        continue;
      }

      const index = valueOffset + match.index;
      hits.push({
        file,
        line: lineNumber(text, index),
        rule: 'css-time',
        snippet: lineSnippet(text, index),
      });
    }

    for (const match of value.matchAll(CSS_EASING)) {
      if (match.index === undefined) {
        continue;
      }

      const index = valueOffset + match.index;
      hits.push({
        file,
        line: lineNumber(text, index),
        rule: 'css-easing',
        snippet: lineSnippet(text, index),
      });
    }
  }
}

function normalizeExclusion(exclusion: string): string {
  return exclusion.replaceAll('\\', '/').replace(/^\.\//, '').replace(/\/+$/, '');
}

function isExcluded(relativePath: string, exclusions: readonly string[]): boolean {
  const normalized = relativePath.split(sep).join('/');
  const segments = normalized.split('/');

  if (segments.some((segment) => DEFAULT_EXCLUDED_SEGMENTS.has(segment))) {
    return true;
  }

  if (basename(normalized) === 'next-env.d.ts') {
    return true;
  }

  return exclusions.some((exclusion) => {
    const normalizedExclusion = normalizeExclusion(exclusion);

    return (
      normalizedExclusion.length > 0 &&
      (normalized === normalizedExclusion || normalized.startsWith(`${normalizedExclusion}/`))
    );
  });
}

function collectFiles(
  root: string,
  directory: string,
  exclusions: readonly string[],
  files: string[],
): void {
  const entries = readdirSync(directory, { withFileTypes: true }).sort((left, right) =>
    left.name.localeCompare(right.name),
  );

  for (const entry of entries) {
    const absolutePath = join(directory, entry.name);
    const relativePath = relative(root, absolutePath);

    if (isExcluded(relativePath, exclusions)) {
      continue;
    }

    if (entry.isDirectory()) {
      collectFiles(root, absolutePath, exclusions, files);
    } else if (entry.isFile() && SOURCE_EXTENSIONS.has(extname(entry.name))) {
      files.push(absolutePath);
    }
  }
}

export function scanText(text: string, file: string): Hit[] {
  const hits: Hit[] = [];

  visitCssDeclarations(text, file, hits);
  visitMatches(text, file, 'gsap-ease', GSAP_EASE, hits);
  visitMatches(text, file, 'motion-key', MOTION_KEY, hits);
  visitMatches(text, file, 'tw-utility', TW_UTILITY, hits);
  visitMatches(text, file, 'timer', TIMER, hits);

  const seen = new Set<string>();

  return hits
    .filter((hit) => {
      const key = `${hit.line}:${hit.rule}`;

      if (seen.has(key)) {
        return false;
      }

      seen.add(key);
      return true;
    })
    .sort((left, right) => left.line - right.line || left.rule.localeCompare(right.rule));
}

export function scanDir(root: string, options: ScanOptions = {}): Hit[] {
  const absoluteRoot = resolve(root);
  const files: string[] = [];
  const hits: Hit[] = [];

  collectFiles(absoluteRoot, absoluteRoot, options.exclude ?? [], files);

  for (const file of files) {
    hits.push(...scanText(readFileSync(file, 'utf8'), file));
  }

  return hits.sort(
    (left, right) =>
      left.file.localeCompare(right.file) ||
      left.line - right.line ||
      left.rule.localeCompare(right.rule),
  );
}
