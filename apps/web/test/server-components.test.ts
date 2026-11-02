import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, test } from 'vitest';

const SERVER_COMPONENTS = [
  '../components/project-card.tsx',
  '../components/tech-chip-list.tsx',
  '../components/project-outline.tsx',
  '../components/about-strip.tsx',
  '../components/teardown-poster.tsx',
] as const;

const CLIENT_DIRECTIVE = /^\s*['"]use client['"]\s*;?/m;

describe('server content components', () => {
  test.each(SERVER_COMPONENTS)('%s does not opt into the client runtime', (relativePath) => {
    const source = readFileSync(fileURLToPath(new URL(relativePath, import.meta.url)), 'utf8');

    expect(source).not.toMatch(CLIENT_DIRECTIVE);
  });
});
