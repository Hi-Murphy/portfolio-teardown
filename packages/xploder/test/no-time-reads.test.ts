import { describe, expect, test } from 'vitest';

interface SourceFile {
  readonly path: string;
  readonly text: string;
}

interface Dirent {
  readonly name: string;
  isDirectory(): boolean;
  isFile(): boolean;
}

interface FileSystem {
  readdirSync(path: string, options: { withFileTypes: true }): Dirent[];
  readFileSync(path: string, encoding: 'utf8'): string;
}

interface PathModule {
  readonly sep: string;
  join(...parts: string[]): string;
  relative(from: string, to: string): string;
}

interface UrlModule {
  fileURLToPath(url: URL): string;
}

const nodeProcess = (
  globalThis as typeof globalThis & {
    readonly process: { getBuiltinModule(id: string): unknown };
  }
).process;
const { readdirSync, readFileSync } = nodeProcess.getBuiltinModule('node:fs') as FileSystem;
const { join, relative, sep } = nodeProcess.getBuiltinModule('node:path') as PathModule;
const { fileURLToPath } = nodeProcess.getBuiltinModule('node:url') as UrlModule;

const SOURCE_ROOT = fileURLToPath(new URL('../src/', import.meta.url));
const TIME_READ = /performance\.now\(|Date\.now\(/;

function lineOf(text: string, index: number): number {
  let line = 1;

  for (let position = 0; position < index; position += 1) {
    if (text.charCodeAt(position) === 10) line += 1;
  }

  return line;
}

function collectSourceFiles(directory: string = SOURCE_ROOT): SourceFile[] {
  const files: SourceFile[] = [];

  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const absolutePath = join(directory, entry.name);

    if (entry.isDirectory()) {
      files.push(...collectSourceFiles(absolutePath));
    } else if (entry.isFile() && /\.tsx?$/.test(entry.name)) {
      files.push({
        path: `src/${relative(SOURCE_ROOT, absolutePath).split(sep).join('/')}`,
        text: readFileSync(absolutePath, 'utf8'),
      });
    }
  }

  return files.sort((left, right) => left.path.localeCompare(right.path));
}

function scanTimeReads(files: readonly SourceFile[]): string[] {
  const hits: string[] = [];

  for (const file of files) {
    if (file.path.startsWith('src/time/')) continue;

    const lines = file.text.split('\n');

    for (const [index, line] of lines.entries()) {
      if (TIME_READ.test(line)) hits.push(`${file.path}:${index + 1}: ${line.trim()}`);
    }
  }

  return hits;
}

describe('AC1 host-time scan', () => {
  test('xploder source outside src/time contains no host-time reads', () => {
    const hits = scanTimeReads(collectSourceFiles());

    expect(hits, hits.join('\n')).toEqual([]);
  });

  test('the scanner reports a planted host-time read', () => {
    const planted: SourceFile = {
      path: 'src/react/x.ts',
      text: 'const started = performance.now();\n',
    };

    expect(scanTimeReads([planted])).toEqual([
      'src/react/x.ts:1: const started = performance.now();',
    ]);
  });

  test('lineOf points at the matching line', () => {
    expect(lineOf('one\ntwo\nthree', 8)).toBe(3);
  });
});
