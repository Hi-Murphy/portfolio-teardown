import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { expect, test } from 'vitest';

import { collectSourceFiles } from './source-scan';

const APP_ROOT = fileURLToPath(new URL('../app/', import.meta.url));
const COMPONENTS_ROOT = fileURLToPath(new URL('../components/', import.meta.url));
const COMPONENT_FILE = fileURLToPath(new URL('../components/connections.tsx', import.meta.url));
const CLASS_NAME_PATTERN =
  /\bclassName\s*=\s*(?:"([^"]*)"|'([^']*)'|\{\s*"([^"]*)"\s*\}|\{\s*'([^']*)'\s*\}|\{\s*`([^`]*)`\s*\})/g;

function classNameTokens(source: string): string[] {
  return [...source.matchAll(CLASS_NAME_PATTERN)].flatMap((match) =>
    (match.slice(1).find((value) => value !== undefined) ?? '').split(/\s+/).filter(Boolean),
  );
}

function containsToken(source: string, token: string): boolean {
  const escaped = token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  return new RegExp(`(?:^|[\\s"'\`])${escaped}(?=$|[\\s"'\`])`).test(source);
}

test('every Connections class token already appears in another app or component source file', () => {
  const componentTokens = [...new Set(classNameTokens(readFileSync(COMPONENT_FILE, 'utf8')))];
  const otherSources = [
    ...new Set([...collectSourceFiles(APP_ROOT), ...collectSourceFiles(COMPONENTS_ROOT)]),
  ]
    .filter((file) => file !== COMPONENT_FILE)
    .map((file) => readFileSync(file, 'utf8'));
  const missing = componentTokens.filter(
    (token) => !otherSources.some((source) => containsToken(source, token)),
  );

  expect(missing, `Missing class tokens: ${missing.join(', ')}`).toEqual([]);
});
