import { describe, expect, test } from 'vitest';

import { TECH_CATEGORIES, type TechCategory } from '../src/schema/constants';
import {
  blueprint,
  paletteCss,
  techColor,
  type Palette,
  type PaletteRole,
} from '../src/theme/index';

const THEMES = ['light', 'dark'] as const;
const PALETTE_ROLES = [
  'paper',
  'surface',
  'grid',
  'line',
  'lineMuted',
  'ink',
  'label',
  'accent',
  'steel',
] as const satisfies readonly PaletteRole[];
const TEXT_ROLES = [
  'ink',
  'label',
  'accent',
  'steel',
  'line',
] as const satisfies readonly PaletteRole[];
const HEX_COLOUR = /^#[0-9A-F]{6}$/;

const EXPECTED = {
  light: {
    paper: '#F6F3EA',
    surface: '#FCFAF4',
    grid: '#D9E1EA',
    line: '#1E4D8C',
    lineMuted: '#6F89AE',
    ink: '#22262B',
    label: '#4A5059',
    accent: '#0A6E87',
    steel: '#56677A',
    tech: {
      language: '#1F5FAD',
      platform: '#4A5D73',
      framework: '#7A3E9D',
      library: '#0F766E',
      storage: '#97560F',
      network: '#0A6E87',
      tooling: '#5A691C',
      ai: '#B0336A',
    },
  },
  dark: {
    paper: '#0B1A2E',
    surface: '#112540',
    grid: '#1B3354',
    line: '#8CC4EE',
    lineMuted: '#4E78A3',
    ink: '#E6EDF5',
    label: '#A7B8CB',
    accent: '#4FD0E6',
    steel: '#8FA3B8',
    tech: {
      language: '#7FB2F0',
      platform: '#A3B5C9',
      framework: '#C9A2E8',
      library: '#5FD3C2',
      storage: '#E8B36A',
      network: '#5ED3EE',
      tooling: '#C2CF7A',
      ai: '#F08BB4',
    },
  },
} as const satisfies Record<
  (typeof THEMES)[number],
  Omit<Palette, 'tech'> & { tech: Record<TechCategory, string> }
>;

function relativeLuminance(hex: string): number {
  const channels = [1, 3, 5].map((offset) => {
    const value = Number.parseInt(hex.slice(offset, offset + 2), 16) / 255;

    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  const [red = 0, green = 0, blue = 0] = channels;

  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

function contrastRatio(foreground: string, background: string): number {
  const foregroundLuminance = relativeLuminance(foreground);
  const backgroundLuminance = relativeLuminance(background);
  const lighter = Math.max(foregroundLuminance, backgroundLuminance);
  const darker = Math.min(foregroundLuminance, backgroundLuminance);

  return (lighter + 0.05) / (darker + 0.05);
}

type SourceModuleMeta = ImportMeta & {
  glob(
    pattern: string,
    options: { query: '?raw'; import: 'default'; eager: true },
  ): Record<string, string>;
};

function normalizePath(path: string): string {
  const segments: string[] = [];

  for (const segment of path.split('/')) {
    if (!segment || segment === '.') continue;
    if (segment === '..') segments.pop();
    else segments.push(segment);
  }

  return segments.join('/');
}

const rawSources = (import.meta as SourceModuleMeta).glob('../src/**/*.ts', {
  query: '?raw',
  import: 'default',
  eager: true,
});
const sourceByPath = Object.fromEntries(
  Object.entries(rawSources).map(([path, source]) => [normalizePath(path), source]),
);

function resolveRelativeImport(fromPath: string, specifier: string): string | undefined {
  const separator = fromPath.lastIndexOf('/');
  const directory = separator === -1 ? '' : fromPath.slice(0, separator);
  const target = normalizePath(`${directory}/${specifier}`);

  return [target, `${target}.ts`, `${target}/index.ts`].find((candidate) =>
    Object.hasOwn(sourceByPath, candidate),
  );
}

function collectImportGraph(roots: readonly string[]): Map<string, string> {
  const graph = new Map<string, string>();
  const queue = [...roots];

  while (queue.length > 0) {
    const path = queue.pop();

    if (!path || graph.has(path)) continue;

    const source = sourceByPath[path];
    if (source === undefined) throw new Error(`Missing source for ${path}`);
    graph.set(path, source);

    for (const match of source.matchAll(/\bfrom\s+['"](\.[^'"]+)['"]/g)) {
      const specifier = match[1];
      if (!specifier) throw new Error(`Missing relative import in ${path}`);

      const resolved = resolveRelativeImport(path, specifier);
      if (!resolved) throw new Error(`Cannot resolve ${specifier} from ${path}`);

      queue.push(resolved);
    }
  }

  return graph;
}

describe('blueprint palette', () => {
  test('defines every role, category and RFC D8 value in both themes', () => {
    for (const themeName of THEMES) {
      const palette = blueprint[themeName];
      const expected = EXPECTED[themeName];

      expect(Object.keys(palette).sort()).toEqual([...PALETTE_ROLES, 'tech'].sort());
      expect(Object.keys(palette.tech).sort()).toEqual([...TECH_CATEGORIES].sort());

      for (const role of PALETTE_ROLES) {
        expect(palette[role]).toBe(expected[role]);
        expect(palette[role]).toMatch(HEX_COLOUR);
      }

      for (const category of TECH_CATEGORIES) {
        expect(palette.tech[category]).toBe(expected.tech[category]);
        expect(palette.tech[category]).toMatch(HEX_COLOUR);
      }

      expect(Object.keys(expected).sort()).toEqual([...PALETTE_ROLES, 'tech'].sort());
      expect(Object.keys(expected.tech).sort()).toEqual([...TECH_CATEGORIES].sort());
    }
  });

  test('meets WCAG contrast thresholds on paper and surface', () => {
    const rows = ['theme  role                   paper   surface'];

    for (const themeName of THEMES) {
      const palette = blueprint[themeName];
      const colours: Array<readonly [string, string]> = [
        ...PALETTE_ROLES.map((role) => [role, palette[role]] as const),
        ...TECH_CATEGORIES.map((category) => [`tech-${category}`, palette.tech[category]] as const),
      ];

      for (const [label, colour] of colours) {
        const paperContrast = contrastRatio(colour, palette.paper);
        const surfaceContrast = contrastRatio(colour, palette.surface);

        rows.push(
          `${themeName.padEnd(6)} ${label.padEnd(22)} ${paperContrast.toFixed(2).padStart(6)}  ${surfaceContrast.toFixed(2).padStart(7)}`,
        );
      }

      for (const role of TEXT_ROLES) {
        expect(
          contrastRatio(palette[role], palette.paper),
          `${themeName}.${role} on paper`,
        ).toBeGreaterThanOrEqual(4.5);
        expect(
          contrastRatio(palette[role], palette.surface),
          `${themeName}.${role} on surface`,
        ).toBeGreaterThanOrEqual(4.5);
      }

      for (const category of TECH_CATEGORIES) {
        expect(
          contrastRatio(palette.tech[category], palette.paper),
          `${themeName}.tech.${category} on paper`,
        ).toBeGreaterThanOrEqual(4.5);
        expect(
          contrastRatio(palette.tech[category], palette.surface),
          `${themeName}.tech.${category} on surface`,
        ).toBeGreaterThanOrEqual(4.5);
      }

      expect(
        contrastRatio(palette.lineMuted, palette.paper),
        `${themeName}.lineMuted on paper`,
      ).toBeGreaterThanOrEqual(3);
      expect(
        contrastRatio(palette.lineMuted, palette.surface),
        `${themeName}.lineMuted on surface`,
      ).toBeGreaterThanOrEqual(3);
    }

    const stderr = (
      globalThis as typeof globalThis & {
        process: { stderr: { write: (text: string) => void } };
      }
    ).process.stderr;

    stderr.write(`${rows.join('\n')}\n`);
  });

  test('emits the three theme blocks and blueprint variables as CSS', () => {
    const css = paletteCss();

    for (const fragment of [
      ':root{',
      '.dark{',
      '@media (prefers-color-scheme: dark)',
      'html:not(.light)',
      'color-scheme:dark',
      '--bp-paper:#F6F3EA',
      '--bp-paper:#0B1A2E',
      '--bp-tech-network:',
    ]) {
      expect(css).toContain(fragment);
    }
  });

  test('resolves tech and accent colour references against a chosen palette', () => {
    expect(techColor('tech-ai', blueprint.dark)).toBe('#F08BB4');
    expect(techColor('accent', blueprint.light)).toBe('#0A6E87');
  });

  test('keeps motion and theme import graphs free of zod', () => {
    const themeEntries = Object.keys(sourceByPath).filter((path) =>
      /^src\/theme\/[^/]+\.ts$/.test(path),
    );
    const graph = collectImportGraph(['src/motion/index.ts', ...themeEntries]);

    expect(themeEntries.length).toBeGreaterThanOrEqual(2);
    expect(graph.has('src/motion/index.ts')).toBe(true);
    expect(graph.has('src/schema/constants.ts')).toBe(true);

    for (const [path, source] of graph) {
      expect(source, path).not.toMatch(/\bfrom\s+['"]zod['"]/);
    }
  });
});
