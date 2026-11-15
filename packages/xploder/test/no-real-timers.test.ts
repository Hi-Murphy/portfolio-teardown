import { describe, expect, test } from 'vitest';

interface TestFile {
  readonly path: string;
  readonly text: string;
}

interface Violation {
  readonly path: string;
  readonly line: number;
  readonly rule: string;
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
const { join, relative } = nodeProcess.getBuiltinModule('node:path') as PathModule;
const { fileURLToPath } = nodeProcess.getBuiltinModule('node:url') as UrlModule;

const REPO_ROOT = fileURLToPath(new URL('../../..', import.meta.url));
const TEST_ROOT = join(REPO_ROOT, 'packages/xploder/test');
const HERO_LOOP_TEST = join(REPO_ROOT, 'apps/web/test/home-hero-loop.test.tsx');
const EXCLUDED = new Set([
  'no-real-timers.test.ts',
  'no-time-reads.test.ts',
  // A placement benchmark, not an animation test.
  'overlay-place-equivalence.test.ts',
]);
const ALWAYS_RULE_SET_TIMEOUT = 'new Promise with setTimeout';
const ALWAYS_RULE_REAL_TIMERS = 'vi.useRealTimers outside afterEach';
const FAKE_ONLY_RULES = [
  { pattern: /performance\.now\(/, rule: 'performance.now without vi.useFakeTimers' },
  { pattern: /Date\.now\(/, rule: 'Date.now without vi.useFakeTimers' },
  { pattern: /new Date\(/, rule: 'new Date without vi.useFakeTimers' },
  { pattern: /setTimeout\(/, rule: 'setTimeout without vi.useFakeTimers' },
  { pattern: /setInterval\(/, rule: 'setInterval without vi.useFakeTimers' },
] as const;

function lineOf(text: string, index: number): number {
  let line = 1;

  for (let position = 0; position < index; position += 1) {
    if (text.charCodeAt(position) === 10) line += 1;
  }

  return line;
}

function matchingParen(text: string, openIndex: number): number {
  let depth = 0;

  for (let index = openIndex; index < text.length; index += 1) {
    const character = text[index];

    if (character === '(') depth += 1;
    else if (character === ')') {
      depth -= 1;
      if (depth === 0) return index;
    }
  }

  return -1;
}

function promiseWaitViolations(file: TestFile): Violation[] {
  const violations: Violation[] = [];
  let searchFrom = 0;

  while (true) {
    const promiseIndex = file.text.indexOf('new Promise(', searchFrom);

    if (promiseIndex === -1) break;

    const openIndex = promiseIndex + 'new Promise'.length;
    const closeIndex = matchingParen(file.text, openIndex);
    const argument = file.text.slice(
      openIndex + 1,
      closeIndex === -1 ? file.text.length : closeIndex,
    );

    if (/\bsetTimeout\s*\(/.test(argument)) {
      violations.push({
        path: file.path,
        line: lineOf(file.text, promiseIndex),
        rule: ALWAYS_RULE_SET_TIMEOUT,
      });
    }

    searchFrom = openIndex + 1;
  }

  return violations;
}

function insideAfterEach(text: string, targetIndex: number): boolean {
  let searchFrom = 0;

  while (true) {
    const afterEachIndex = text.indexOf('afterEach(', searchFrom);

    if (afterEachIndex === -1) return false;

    const openIndex = afterEachIndex + 'afterEach'.length;
    const closeIndex = matchingParen(text, openIndex);

    if (closeIndex !== -1 && targetIndex > openIndex && targetIndex < closeIndex) return true;

    searchFrom = openIndex + 1;
  }
}

function useRealTimersViolations(file: TestFile): Violation[] {
  const violations: Violation[] = [];
  let searchFrom = 0;

  while (true) {
    const index = file.text.indexOf('vi.useRealTimers(', searchFrom);

    if (index === -1) return violations;
    if (!insideAfterEach(file.text, index)) {
      violations.push({
        path: file.path,
        line: lineOf(file.text, index),
        rule: ALWAYS_RULE_REAL_TIMERS,
      });
    }

    searchFrom = index + 1;
  }
}

function scanTestFile(file: TestFile): Violation[] {
  const violations = [...promiseWaitViolations(file), ...useRealTimersViolations(file)];
  const lines = file.text.split('\n');
  const fakeTimers = file.text.includes('vi.useFakeTimers(');

  for (const [index, line] of lines.entries()) {
    if (fakeTimers) continue;

    for (const { pattern, rule } of FAKE_ONLY_RULES) {
      if (pattern.test(line)) violations.push({ path: file.path, line: index + 1, rule });
    }
  }

  return violations.sort((left, right) => left.line - right.line);
}

function formatViolations(violations: readonly Violation[]): string[] {
  return violations.map((violation) => `${violation.path}:${violation.line}: ${violation.rule}`);
}

function collectTestFiles(directory: string): string[] {
  const files: string[] = [];

  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const absolutePath = join(directory, entry.name);

    if (entry.isDirectory()) {
      files.push(...collectTestFiles(absolutePath));
    } else if (entry.isFile() && /\.test\.tsx?$/.test(entry.name) && !EXCLUDED.has(entry.name)) {
      files.push(absolutePath);
    }
  }

  return files;
}

function animationTestFiles(): string[] {
  return [...collectTestFiles(TEST_ROOT), HERO_LOOP_TEST].sort((left, right) =>
    left.localeCompare(right),
  );
}

function readTestFile(path: string): TestFile {
  return { path: relative(REPO_ROOT, path), text: readFileSync(path, 'utf8') };
}

const PLANTED_RULES = [
  {
    name: 'real wait in a Promise',
    path: 'planted/real-wait.test.ts',
    text: 'vi.useFakeTimers();\nconst wait = new Promise((resolve) => setTimeout(resolve, 10));\n',
    line: 2,
    rule: ALWAYS_RULE_SET_TIMEOUT,
  },
  {
    name: 'vi.useRealTimers outside afterEach',
    path: 'planted/real-timers.test.ts',
    text: 'vi.useFakeTimers();\nvi.useRealTimers();\n',
    line: 2,
    rule: ALWAYS_RULE_REAL_TIMERS,
  },
  {
    name: 'performance.now without fake timers',
    path: 'planted/performance.test.ts',
    text: 'const started = performance.now();\n',
    line: 1,
    rule: 'performance.now without vi.useFakeTimers',
  },
  {
    name: 'Date.now without fake timers',
    path: 'planted/date-now.test.ts',
    text: 'const started = Date.now();\n',
    line: 1,
    rule: 'Date.now without vi.useFakeTimers',
  },
  {
    name: 'new Date without fake timers',
    path: 'planted/new-date.test.ts',
    text: 'const started = new Date();\n',
    line: 1,
    rule: 'new Date without vi.useFakeTimers',
  },
  {
    name: 'setTimeout without fake timers',
    path: 'planted/set-timeout.test.ts',
    text: 'setTimeout(run, 10);\n',
    line: 1,
    rule: 'setTimeout without vi.useFakeTimers',
  },
  {
    name: 'setInterval without fake timers',
    path: 'planted/set-interval.test.ts',
    text: 'setInterval(run, 10);\n',
    line: 1,
    rule: 'setInterval without vi.useFakeTimers',
  },
] as const;

describe('AC1 real-timer scan', () => {
  test('every animation test uses the engine clock or fake timers', () => {
    const hits = animationTestFiles().flatMap((path) =>
      formatViolations(scanTestFile(readTestFile(path))),
    );

    expect(hits, hits.join('\n')).toEqual([]);
  });

  for (const planted of PLANTED_RULES) {
    test(`the scanner reports ${planted.name}`, () => {
      const violations = formatViolations(scanTestFile({ path: planted.path, text: planted.text }));

      expect(violations).toContain(`${planted.path}:${planted.line}: ${planted.rule}`);
    });
  }

  test('vi.useFakeTimers permits time reads and timers', () => {
    const planted: TestFile = {
      path: 'planted/fake.test.ts',
      text: [
        'vi.useFakeTimers();',
        'const started = performance.now();',
        'const wall = Date.now();',
        'const date = new Date();',
        'setTimeout(run, 10);',
        'setInterval(run, 10);',
      ].join('\n'),
    };

    expect(formatViolations(scanTestFile(planted))).toEqual([]);
  });

  test('vi.useRealTimers is accepted in afterEach', () => {
    const planted: TestFile = {
      path: 'planted/after-each.test.ts',
      text: 'afterEach(() => {\n  vi.useRealTimers();\n});\n',
    };

    expect(formatViolations(scanTestFile(planted))).toEqual([]);
  });
});
