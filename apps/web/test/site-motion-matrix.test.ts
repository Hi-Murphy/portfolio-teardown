import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, test } from 'vitest';

import { collectSourceFiles } from './source-scan';

interface MotionRow {
  readonly id: 'hero-reveal' | 'poster-fade' | 'card-hover';
  readonly site: string;
  readonly trigger: string;
  readonly twin: string;
}

const COMPONENTS_ROOT = fileURLToPath(new URL('../components/', import.meta.url));
const PANEL_ENTER_DURATION = 'var(--motion-duration-panel-enter)';
const PANEL_ENTER_EASING = 'var(--motion-ease-panel-enter)';
const ROWS = [
  {
    id: 'hero-reveal',
    site: 'components/hero/hero-live.tsx',
    trigger: 'The first live viewer frame arrives after the load, visibility and idle gates.',
    twin: 'Never mounts the live stage under reduced motion; the poster remains.',
  },
  {
    id: 'poster-fade',
    site: 'components/hero/hero-live.tsx',
    trigger: 'The live layer enters the revealed state.',
    twin: 'None: reduced motion never reaches the revealed state.',
  },
  {
    id: 'card-hover',
    site: 'components/project-card.tsx',
    trigger: 'A project card link is hovered or focused.',
    twin: 'Colour only, with no transform or layout-property transition.',
  },
] as const satisfies readonly MotionRow[];

function transitionSources(source: string): string[] {
  const strings = [...source.matchAll(/(['"`])([^'"`\n]*\btransition[^'"`\n]*)\1/g)].map(
    (match) => match[2] ?? '',
  );
  const declarations = [...source.matchAll(/\btransition(?:-[a-z-]+)?\s*:\s*([^;}\n]+)/g)].map(
    (match) => match[1] ?? '',
  );

  return [...strings, ...declarations];
}

describe('site motion matrix', () => {
  test('every app animation row names its reduced-motion twin', () => {
    expect(ROWS.map((row) => row.id)).toEqual(['hero-reveal', 'poster-fade', 'card-hover']);

    for (const row of ROWS) {
      expect(row.site.trim()).not.toBe('');
      expect(row.trigger.trim()).not.toBe('');
      expect(row.twin.trim()).not.toBe('');
    }
  });

  test('the only transitions in components use the panel-enter variables', () => {
    const files = collectSourceFiles(COMPONENTS_ROOT);
    const transitions = files.flatMap((file) =>
      transitionSources(readFileSync(file, 'utf8')).map((source) => ({ file, source })),
    );

    expect(transitions.length).toBeGreaterThan(0);

    for (const { file, source } of transitions) {
      expect(source, file).toContain(PANEL_ENTER_DURATION);
      expect(source, file).toContain(PANEL_ENTER_EASING);
    }
  });
});
