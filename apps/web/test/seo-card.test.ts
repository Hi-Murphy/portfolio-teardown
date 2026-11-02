import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import type { CSSProperties, ReactElement, ReactNode } from 'react';
import type { Project } from 'xploder';
import { blueprint } from 'xploder/theme';
import { describe, expect, test } from 'vitest';

import { PROJECTS } from '../content/projects';
import { SITE } from '../content/site';
import { INDEXABLE_ROUTES, type SeoRoute } from '../seo/routes';
import { cardElement } from '../seo/og/card';
import { cardModel, TITLE_BLOCK_ROW_LIMIT, type OgCardModel } from '../seo/og/card-model';

const SEPARATOR = ' · ';
const SANS_FONT = 'IBM Plex Sans';
const MONO_FONT = 'IBM Plex Mono';
const FONT_FILES = new Map([
  [SANS_FONT, 'IBMPlexSans-SemiBold.ttf'],
  [MONO_FONT, 'IBMPlexMono-Regular.ttf'],
]);
const COLOR_PATTERN = /(?<![\w&])#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})\b/g;

function twoDigits(value: number): string {
  return String(value).padStart(2, '0');
}

function numberedRows(names: readonly string[]): string[] {
  return names.map((name, index) => `${twoDigits(index + 1)} ${name}`);
}

interface ExpectedCardStrings {
  readonly eyebrow: string;
  readonly title: string;
  readonly subtitle: string;
  readonly silhouetteIds: readonly string[];
  readonly titleBlock: OgCardModel['titleBlock'];
}

function expectedStrings(route: SeoRoute): ExpectedCardStrings {
  if (route.kind === 'home') {
    return {
      eyebrow: SITE.hero.eyebrow,
      title: SITE.meta.siteName,
      subtitle: SITE.hero.headline,
      silhouetteIds: PROJECTS.slice(0, 1).map((project) => project.meta.slug),
      titleBlock: {
        title: SITE.meta.siteName,
        meta: SITE.identity.role,
        rows: numberedRows(PROJECTS.map((project) => project.meta.name)),
      },
    };
  }

  if (route.kind === 'projects') {
    return {
      eyebrow: SITE.meta.siteName,
      title: SITE.projects.title,
      subtitle: PROJECTS.map((project) => project.meta.name).join(SEPARATOR),
      silhouetteIds: PROJECTS.map((project) => project.meta.slug),
      titleBlock: {
        title: SITE.projects.title,
        meta: twoDigits(PROJECTS.length),
        rows: numberedRows(PROJECTS.map((project) => project.meta.name)),
      },
    };
  }

  const project = route.project;
  if (project === undefined) throw new Error('Expected a project route.');

  return {
    eyebrow: SITE.meta.siteName,
    title: project.meta.name,
    subtitle: project.meta.tagline ?? '',
    silhouetteIds: [project.meta.slug],
    titleBlock: {
      title: project.meta.name,
      meta: project.meta.year === undefined ? '' : String(project.meta.year),
      rows: numberedRows(project.layers.map((layer) => layer.name)),
    },
  };
}

function cardStrings(model: OgCardModel): ExpectedCardStrings {
  return {
    eyebrow: model.eyebrow,
    title: model.title,
    subtitle: model.subtitle,
    silhouetteIds: model.silhouettes.map((silhouette) => silhouette.projectId),
    titleBlock: model.titleBlock,
  };
}

interface WalkState {
  readonly colors: Set<string>;
  readonly texts: { text: string; fontFamily: string }[];
}

type HostElement = ReactElement<Record<string, unknown>>;

function isElement(value: unknown): value is HostElement {
  return (
    typeof value === 'object' &&
    value !== null &&
    'type' in value &&
    'props' in value &&
    typeof (value as { props?: unknown }).props === 'object'
  );
}

function collectStrings(value: unknown, strings: string[]): void {
  if (typeof value === 'string') {
    strings.push(value);
    return;
  }

  if (Array.isArray(value)) {
    for (const item of value) collectStrings(item, strings);
    return;
  }

  if (typeof value === 'object' && value !== null) {
    for (const item of Object.values(value)) collectStrings(item, strings);
  }
}

function collectColors(text: string, colors: Set<string>): void {
  for (const match of text.matchAll(COLOR_PATTERN)) {
    colors.add(match[0].toUpperCase());
  }
}

function walk(node: ReactNode, inheritedFont: string, state: WalkState): void {
  if (node === null || node === undefined || typeof node === 'boolean') return;

  if (typeof node === 'string' || typeof node === 'number') {
    const text = String(node);
    collectColors(text, state.colors);
    if (text.length > 0) state.texts.push({ text, fontFamily: inheritedFont });
    return;
  }

  if (Array.isArray(node)) {
    for (const child of node) walk(child, inheritedFont, state);
    return;
  }

  if (!isElement(node)) return;

  const style = node.props.style as CSSProperties | undefined;
  const fontFamily = typeof style?.fontFamily === 'string' ? style.fontFamily : inheritedFont;

  for (const [key, value] of Object.entries(node.props)) {
    if (key === 'children') continue;

    const strings: string[] = [];
    collectStrings(value, strings);

    for (const string of strings) {
      collectColors(string, state.colors);

      if (key === 'src' && string.startsWith('data:image/svg+xml;utf8,')) {
        collectColors(
          decodeURIComponent(string.slice('data:image/svg+xml;utf8,'.length)),
          state.colors,
        );
      }
    }
  }

  walk(node.props.children as ReactNode, fontFamily, state);
}

function inspectCard(tree: ReactElement): WalkState {
  const state: WalkState = { colors: new Set(), texts: [] };
  walk(tree, SANS_FONT, state);

  return state;
}

function allowedLightColors(): Set<string> {
  const values: string[] = [];

  for (const value of Object.values(blueprint.light)) {
    if (typeof value === 'string') values.push(value);
  }
  for (const value of Object.values(blueprint.light.tech)) values.push(value);

  return new Set(values.map((value) => value.toUpperCase()));
}

function elementsWithDirectText(node: ReactNode, text: string): HostElement[] {
  if (node === null || node === undefined || typeof node === 'boolean') return [];

  if (Array.isArray(node)) {
    return node.flatMap((child) => elementsWithDirectText(child, text));
  }

  if (!isElement(node)) return [];

  const children = node.props.children;
  const direct = Array.isArray(children)
    ? children.some((child) => child === text)
    : children === text;

  return [...(direct ? [node] : []), ...elementsWithDirectText(children as ReactNode, text)];
}

function tableOffset(buffer: Buffer, tag: string): number | undefined {
  const tableCount = buffer.readUInt16BE(4);

  for (let index = 0; index < tableCount; index += 1) {
    const recordOffset = 12 + index * 16;

    if (buffer.toString('ascii', recordOffset, recordOffset + 4) === tag) {
      return buffer.readUInt32BE(recordOffset + 8);
    }
  }

  return undefined;
}

function readFormat4(buffer: Buffer, offset: number, codepoints: Set<number>): void {
  const segmentCount = buffer.readUInt16BE(offset + 6) / 2;
  const endCodesOffset = offset + 14;
  const startCodesOffset = endCodesOffset + segmentCount * 2 + 2;
  const deltasOffset = startCodesOffset + segmentCount * 2;
  const rangeOffsetsOffset = deltasOffset + segmentCount * 2;

  for (let segment = 0; segment < segmentCount; segment += 1) {
    const start = buffer.readUInt16BE(startCodesOffset + segment * 2);
    const end = buffer.readUInt16BE(endCodesOffset + segment * 2);
    const delta = buffer.readInt16BE(deltasOffset + segment * 2);
    const rangeOffset = buffer.readUInt16BE(rangeOffsetsOffset + segment * 2);

    if (start === 0xffff && end === 0xffff) continue;

    for (let codepoint = start; codepoint <= end; codepoint += 1) {
      let glyph: number;

      if (rangeOffset === 0) {
        glyph = (codepoint + delta) & 0xffff;
      } else {
        const glyphOffset =
          rangeOffsetsOffset + segment * 2 + rangeOffset + (codepoint - start) * 2;

        if (glyphOffset + 1 >= buffer.length) continue;
        const rawGlyph = buffer.readUInt16BE(glyphOffset);
        glyph = rawGlyph === 0 ? 0 : (rawGlyph + delta) & 0xffff;
      }

      if (glyph !== 0) codepoints.add(codepoint);
    }
  }
}

function readFormat12(buffer: Buffer, offset: number, codepoints: Set<number>): void {
  const groupCount = buffer.readUInt32BE(offset + 12);

  for (let group = 0; group < groupCount; group += 1) {
    const groupOffset = offset + 16 + group * 12;
    const start = buffer.readUInt32BE(groupOffset);
    const end = buffer.readUInt32BE(groupOffset + 4);
    const startGlyph = buffer.readUInt32BE(groupOffset + 8);

    for (let codepoint = start; codepoint <= end; codepoint += 1) {
      if (startGlyph + codepoint - start !== 0) codepoints.add(codepoint);
    }
  }
}

function fontCodepoints(filename: string): Set<number> {
  const path = fileURLToPath(new URL(`../seo/og/fonts/${filename}`, import.meta.url));
  const buffer = readFileSync(path);
  const cmapOffset = tableOffset(buffer, 'cmap');
  const codepoints = new Set<number>();

  if (cmapOffset === undefined) throw new Error(`Missing cmap table in ${filename}.`);

  const subtableCount = buffer.readUInt16BE(cmapOffset + 2);

  for (let index = 0; index < subtableCount; index += 1) {
    const recordOffset = cmapOffset + 4 + index * 8;
    const subtableOffset = cmapOffset + buffer.readUInt32BE(recordOffset + 4);
    const format = buffer.readUInt16BE(subtableOffset);

    if (format === 4) readFormat4(buffer, subtableOffset, codepoints);
    if (format === 12) readFormat12(buffer, subtableOffset, codepoints);
  }

  return codepoints;
}

describe('OG card model', () => {
  for (const route of INDEXABLE_ROUTES) {
    test(`${route.path} uses the D5 content fields`, () => {
      expect(cardStrings(cardModel(route))).toEqual(expectedStrings(route));
    });

    test(`${route.path} draws only layer slabs`, () => {
      const model = cardModel(route);

      for (const silhouette of model.silhouettes) {
        const project = PROJECTS.find((candidate) => candidate.meta.slug === silhouette.projectId);
        if (project === undefined) throw new Error(`Unknown project ${silhouette.projectId}.`);

        expect(silhouette.slabs).toHaveLength(project.layers.length);
        expect(silhouette.slabs.every((slab) => slab.kind === 'layer')).toBe(true);
      }
    });
  }

  test('the project silhouette contains its five layer slabs', () => {
    const route = INDEXABLE_ROUTES.find((candidate) => candidate.kind === 'project');
    if (route === undefined) throw new Error('Expected a project route.');

    expect(cardModel(route).silhouettes[0]?.slabs).toHaveLength(5);
  });
});

describe('OG card element', () => {
  for (const route of INDEXABLE_ROUTES) {
    test(`${route.path} uses only light blueprint colours`, () => {
      const colors = inspectCard(cardElement(cardModel(route))).colors;
      const allowed = allowedLightColors();
      const unexpected = [...colors].filter((color) => !allowed.has(color));

      expect(colors.size).toBeGreaterThan(0);
      expect(unexpected).toEqual([]);
    });

    test(`${route.path} uses fonts that cover every rendered glyph`, () => {
      const fonts = new Map(
        [...FONT_FILES].map(([name, filename]) => [name, fontCodepoints(filename)]),
      );
      const texts = inspectCard(cardElement(cardModel(route))).texts;
      const missing: string[] = [];

      for (const { text, fontFamily } of texts) {
        const codepoints = fonts.get(fontFamily);
        if (codepoints === undefined) throw new Error(`No loaded font named ${fontFamily}.`);

        for (const character of text) {
          const codepoint = character.codePointAt(0);
          if (codepoint === undefined || character === '\n') continue;

          if (!codepoints.has(codepoint)) {
            missing.push(`${fontFamily}: U+${codepoint.toString(16).toUpperCase()}`);
          }
        }
      }

      expect(missing).toEqual([]);
    });
  }

  test('long titles and subtitles clamp at two lines and title-block rows cap at six plus overflow', () => {
    const base = PROJECTS[0];
    if (base === undefined) throw new Error('Expected at least one project.');

    const longName =
      'A synthetic project title deliberately written to exceed the available two-line space';
    const longTagline =
      'A synthetic subtitle that also needs more than two lines once it reaches the card';
    const layers = Array.from({ length: TITLE_BLOCK_ROW_LIMIT + 3 }, (_, index) => ({
      id: `synthetic-layer-${index + 1}`,
      name: `Synthetic layer ${index + 1}`,
      components: [],
    }));
    const syntheticProject: Project = {
      ...base,
      meta: { ...base.meta, slug: 'synthetic-card', name: longName, tagline: longTagline },
      layers,
    };
    const syntheticRoute: SeoRoute = {
      kind: 'project',
      path: '/projects/synthetic-card',
      ogImagePath: '/og/projects/synthetic-card.png',
      project: syntheticProject,
    };
    const model = cardModel(syntheticRoute);
    const tree = cardElement(model);

    expect(model.titleBlock.rows).toEqual([
      '01 Synthetic layer 1',
      '02 Synthetic layer 2',
      '03 Synthetic layer 3',
      '04 Synthetic layer 4',
      '05 Synthetic layer 5',
      '06 Synthetic layer 6',
      '+3',
    ]);

    for (const text of [longName, longTagline]) {
      const matches = elementsWithDirectText(tree, text);

      expect(
        matches.some((element) => {
          const style = element.props.style as CSSProperties;

          return (
            style.display === 'block' &&
            style.lineClamp === 2 &&
            style.overflow === 'hidden' &&
            style.textOverflow === 'ellipsis'
          );
        }),
      ).toBe(true);
    }
  });
});
