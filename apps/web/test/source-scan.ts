import { readdirSync } from 'node:fs';
import { basename, extname, join, relative, resolve, sep } from 'node:path';

export interface Hit {
  readonly file: string;
  readonly line: number;
  readonly rule: string;
  readonly snippet: string;
}

export interface CollectSourceFilesOptions {
  readonly exclude?: string[];
  readonly extensions?: Set<string>;
}

const SOURCE_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.mjs', '.css']);
const DEFAULT_EXCLUDED_SEGMENTS = new Set(['node_modules', '.next', 'out', 'test']);

export function lineOf(text: string, index: number): number {
  let line = 1;

  for (let position = 0; position < index; position += 1) {
    if (text.charCodeAt(position) === 10) {
      line += 1;
    }
  }

  return line;
}

export function snippetAt(text: string, index: number): string {
  const start = text.lastIndexOf('\n', index - 1) + 1;
  const end = text.indexOf('\n', index);

  return text.slice(start, end === -1 ? text.length : end).trim();
}

export function formatHits(hits: readonly Hit[]): string {
  return hits.map((hit) => `${hit.file}:${hit.line} ${hit.rule} ${hit.snippet}`).join('\n');
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
  extensions: ReadonlySet<string>,
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
      collectFiles(root, absolutePath, exclusions, extensions, files);
    } else if (entry.isFile() && extensions.has(extname(entry.name))) {
      files.push(absolutePath);
    }
  }
}

export function collectSourceFiles(
  root: string,
  options: CollectSourceFilesOptions = {},
): string[] {
  const absoluteRoot = resolve(root);
  const files: string[] = [];

  collectFiles(
    absoluteRoot,
    absoluteRoot,
    options.exclude ?? [],
    options.extensions ?? SOURCE_EXTENSIONS,
    files,
  );

  return files.sort((left, right) => left.localeCompare(right));
}
