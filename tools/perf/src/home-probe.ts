import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import type { Browser, BrowserContextOptions, Page } from 'playwright';

import { websocketInspectorSource } from '../../../apps/web/content/projects/websocket-inspector.source.ts';
import { siteSource } from '../../../apps/web/content/site.source.ts';
import { evaluateTabWalk, type FocusStep } from './a11y-probe.ts';
import { chromiumVersion, launch } from './browser.ts';
import { CliError, EXIT } from './exit-codes.ts';

export const HOME_PROBE_GROUPS = ['order', 'fold', 'responsive', 'structure', 'copy'] as const;
export type HomeProbeGroup = (typeof HOME_PROBE_GROUPS)[number];
export const HOME_PROBE_DEFAULT_GROUPS = [
  'order',
  'fold',
  'responsive',
  'structure',
  'copy',
] as const satisfies readonly HomeProbeGroup[];

export const HOME_PROBE_UI_ALLOWLIST = [
  'Skip to content',
  'Back to top ↑',
  'Switch to light theme',
  'Switch to dark theme',
  'Primary',
  'Tech',
] as const;
export const HOME_PROBE_SEPARATORS = ['·', '—', '©', '↑'] as const;
export const HOME_PROBE_PROOF_VALUE_SELECTOR = '[data-hero-proof-value]' as const;
export const HOME_SECTIONS_MISSING = 'HOME_SECTIONS module missing';

type Palette = 'light' | 'dark';
type ViewportName = 'mobile' | 'tablet' | 'desktop';
type DocumentRect = HomeRect;

export interface HomeRect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface HomeDocumentSnapshot {
  readonly scrollWidth: number;
  readonly clientWidth: number;
  readonly scrollHeight: number;
  readonly clientHeight: number;
}

export interface HomeSectionSnapshot {
  readonly id: string;
  readonly tag: string;
  readonly rect: DocumentRect;
  readonly text: string;
  readonly labelledby: string | null;
  readonly label: string | null;
  readonly reorder: readonly string[];
}

export interface HomeHeadingSnapshot {
  readonly level: number;
  readonly text: string;
  readonly sectionId: string | null;
  readonly elementId: string | null;
}

export interface HomeTextSnapshot {
  readonly key: string;
  readonly text: string;
  readonly tag: string;
  readonly sectionId: string | null;
  readonly rect: DocumentRect;
  readonly rendered: boolean;
  readonly fontSize: number;
  readonly fontFamily: string;
  readonly overflowX: string;
  readonly overflowY: string;
  readonly scrollWidth: number;
  readonly clientWidth: number;
  readonly scrollHeight: number;
  readonly clientHeight: number;
}

export interface HomeTargetSnapshot extends HomeTextSnapshot {
  readonly stretched: boolean;
}

export interface HomeFocusSnapshot extends FocusStep {
  readonly sectionIndex: number;
  readonly rect: DocumentRect;
  readonly tabIndex: number;
  readonly gridColumnIndex?: number | null;
}

export interface HomeHeroControlSnapshot {
  readonly loop: string | null;
  readonly button: boolean;
  readonly buttonInSlot: boolean;
  readonly posterVisible: boolean;
  readonly slot: DocumentRect | null;
}

export interface HomeFoldTargetSnapshot {
  readonly key: string;
  readonly text: string;
  readonly tag: string;
  readonly rect: DocumentRect;
  readonly rendered: boolean;
  readonly fullyInsideViewport: boolean;
}

export interface HomeFoldSnapshot {
  readonly name: HomeFoldTargetSnapshot | null;
  readonly eyebrow: HomeFoldTargetSnapshot | null;
  readonly headline: HomeFoldTargetSnapshot | null;
  readonly primaryCta: HomeFoldTargetSnapshot | null;
  readonly projectSignal: HomeFoldTargetSnapshot | null;
}

export interface HomeTabWalkSnapshot {
  readonly forward: readonly HomeFocusSnapshot[];
  readonly backward: readonly HomeFocusSnapshot[];
  readonly anchor: HomeFocusSnapshot | null;
}

export interface HomePageSnapshot {
  readonly viewport: { readonly width: number; readonly height: number };
  readonly documentState: HomeDocumentSnapshot;
  readonly sections: readonly HomeSectionSnapshot[];
  readonly headings: readonly HomeHeadingSnapshot[];
  readonly landmarks: {
    readonly banner: number;
    readonly main: number;
    readonly contentinfo: number;
  };
  readonly bodyTexts: readonly HomeTextSnapshot[];
  readonly measureTexts: readonly HomeTextSnapshot[];
  readonly targets: readonly HomeTargetSnapshot[];
  readonly focusables: readonly HomeFocusSnapshot[];
  readonly fold: HomeFoldSnapshot;
  readonly visibleTexts: readonly string[];
  readonly footerContactDisplay?: string | null;
  readonly heroControl?: HomeHeroControlSnapshot;
  readonly tabWalk?: HomeTabWalkSnapshot;
}

export interface HomeProbeConfig {
  readonly identityName: string;
  readonly eyebrow: string;
  readonly headline: string;
  readonly primaryCta: string;
  readonly projectName: string;
  readonly projectTagline: string;
  readonly projectsNote: string;
  readonly contactTitle: string;
}

export interface HomeProbeCheck {
  readonly name: string;
  readonly pass: boolean;
  readonly expected: unknown;
  readonly actual: unknown;
}

export interface HomeProbeGroupResult {
  readonly group: HomeProbeGroup;
  readonly pass: boolean;
  readonly checks: readonly HomeProbeCheck[];
  readonly data?: unknown;
  readonly lines: readonly string[];
}

export interface HomeProbeReport {
  readonly kind: 'home-probe';
  readonly version: 1;
  readonly baseUrl: string;
  readonly chromium: string;
  readonly approved: readonly string[];
  readonly homeSections: readonly string[] | null;
  readonly groups: readonly HomeProbeGroupResult[];
  readonly pass: boolean;
}

export interface HomeProbeOptions {
  readonly base: URL;
  readonly outDir: string;
  readonly groups: readonly HomeProbeGroup[];
  readonly approved: readonly string[];
  readonly rootDir?: string;
}

interface HomeProbeWindow {
  __homeProbeFocusKeys?: WeakMap<Element, string>;
  __homeProbeFocusGridColumns?: WeakMap<Element, number | null>;
}

interface HomeSectionsModule {
  readonly HOME_SECTIONS?: unknown;
}

interface Cell {
  readonly name: ViewportName;
  readonly width: number;
  readonly height: number;
  readonly palette: Palette;
  readonly reducedMotion?: boolean;
}

interface CellSnapshot {
  readonly name: ViewportName;
  readonly width: number;
  readonly height: number;
  readonly palette: Palette;
  readonly snapshot: HomePageSnapshot;
}

const WAIT_TIMEOUT_MS = 30_000;
const SETTLE_MS = 300;
const EPSILON = 0.5;
const MIN_TARGET_PX = 44;
const MIN_BODY_FONT_PX = 16;
const ORDER_CELLS = [
  { name: 'mobile', width: 390, height: 844, palette: 'light' },
  { name: 'tablet', width: 768, height: 1024, palette: 'light' },
  { name: 'desktop', width: 1440, height: 900, palette: 'light' },
] as const satisfies readonly Cell[];
const FOLD_CELLS = [
  { name: 'mobile', width: 390, height: 844, palette: 'light' },
  { name: 'mobile', width: 390, height: 844, palette: 'dark' },
] as const satisfies readonly Cell[];
const RESPONSIVE_CELLS = [
  { name: 'mobile', width: 390, height: 844, palette: 'light' },
  { name: 'mobile', width: 390, height: 844, palette: 'dark' },
  { name: 'tablet', width: 768, height: 1024, palette: 'light' },
  { name: 'tablet', width: 768, height: 1024, palette: 'dark' },
  { name: 'desktop', width: 1440, height: 900, palette: 'light' },
  { name: 'desktop', width: 1440, height: 900, palette: 'dark' },
] as const satisfies readonly Cell[];
const COPY_CELL = { name: 'desktop', width: 1440, height: 900, palette: 'light' } as const;
const STRUCTURE_CELLS: readonly Cell[] = [
  ...ORDER_CELLS,
  { name: 'mobile', width: 390, height: 844, palette: 'light', reducedMotion: true },
];

function check(name: string, pass: boolean, expected: unknown, actual: unknown): HomeProbeCheck {
  return { name, pass, expected, actual };
}

function sameStrings(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function formatCheck(entry: HomeProbeCheck): string {
  return `${entry.pass ? 'PASS' : 'FAIL'} ${entry.name}: expected ${JSON.stringify(entry.expected)} actual ${JSON.stringify(entry.actual)}`;
}

function groupResult(
  group: HomeProbeGroup,
  checks: readonly HomeProbeCheck[],
  data?: unknown,
  extraLines: readonly string[] = [],
): HomeProbeGroupResult {
  return {
    group,
    pass: checks.every((entry) => entry.pass),
    checks,
    ...(data === undefined ? {} : { data }),
    lines: extras(checks, extraLines),
  };
}

function extras(
  checks: readonly HomeProbeCheck[],
  extraLines: readonly string[],
): readonly string[] {
  return [...checks.map(formatCheck), ...extraLines];
}

function normaliseText(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function sectionHeading(snapshot: HomePageSnapshot, id: string): HomeHeadingSnapshot | undefined {
  return snapshot.headings.find((heading) => heading.sectionId === id);
}

function pageSectionIds(sections: readonly string[]): readonly string[] {
  return sections.filter((id) => id !== 'nav' && id !== 'footer');
}

function expectedSectionHeading(id: string): { level: number; label: string } {
  return id === 'hero' ? { level: 1, label: 'h1' } : { level: 2, label: 'h2' };
}

export function evaluateOrder(
  snapshot: HomePageSnapshot,
  homeSections: readonly string[] | null,
  approved: readonly string[],
): HomeProbeGroupResult {
  if (homeSections === null) {
    return groupResult('order', [
      check('order-home-sections', false, 'module present', HOME_SECTIONS_MISSING),
    ]);
  }

  const sequence = snapshot.sections.map((section) => section.id);
  const byId = new Map(snapshot.sections.map((section) => [section.id, section]));
  const required = ['nav', ...pageSectionIds(homeSections), 'footer'];
  const emptySections = required.filter((id) => {
    const section = byId.get(id);
    return section === undefined || section.rect.height <= EPSILON || section.text.trim() === '';
  });
  const missingHeadings = pageSectionIds(homeSections).flatMap((id) => {
    const expected = expectedSectionHeading(id);
    const heading = sectionHeading(snapshot, id);
    return heading !== undefined && heading.level === expected.level
      ? []
      : [`${id}:${expected.label}`];
  });
  const tops = snapshot.sections.map((section) => section.rect.y);
  const topsIncrease = tops.every(
    (top, index) => index === 0 || top > (tops[index - 1] ?? Number.NEGATIVE_INFINITY),
  );
  const reorderRisks = snapshot.sections.flatMap((section) =>
    section.reorder.map((risk) => `${section.id}:${risk}`),
  );

  return groupResult(
    'order',
    [
      check('order-approved-list', sameStrings(homeSections, approved), approved, homeSections),
      check('order-dom-sequence', sameStrings(sequence, homeSections), homeSections, sequence),
      check('order-sections-non-empty', emptySections.length === 0, [], emptySections),
      check('order-section-headings', missingHeadings.length === 0, [], missingHeadings),
      check('order-section-tops', topsIncrease, true, tops),
      check('order-no-css-reordering', reorderRisks.length === 0, [], reorderRisks),
    ],
    { snapshot, homeSections, approved },
  );
}

function foldTargetPass(target: HomeFoldTargetSnapshot | null): boolean {
  return target !== null && target.rendered && target.fullyInsideViewport;
}

export function evaluateFold(snapshot: HomePageSnapshot): HomeProbeGroupResult {
  const noHorizontalScroll =
    snapshot.documentState.scrollWidth <= snapshot.documentState.clientWidth;
  const checks = [
    check('fold-identity-name', foldTargetPass(snapshot.fold.name), true, snapshot.fold.name),
    check('fold-role-eyebrow', foldTargetPass(snapshot.fold.eyebrow), true, snapshot.fold.eyebrow),
    check('fold-headline', foldTargetPass(snapshot.fold.headline), true, snapshot.fold.headline),
    check(
      'fold-primary-cta',
      foldTargetPass(snapshot.fold.primaryCta),
      true,
      snapshot.fold.primaryCta,
    ),
    check(
      'fold-project-signal',
      foldTargetPass(snapshot.fold.projectSignal),
      true,
      snapshot.fold.projectSignal,
    ),
    check('fold-no-horizontal-scroll', noHorizontalScroll, true, snapshot.documentState),
  ];

  return groupResult('fold', checks, { snapshot });
}

function overlapArea(left: HomeRect, right: HomeRect): number {
  const width = Math.min(left.x + left.width, right.x + right.width) - Math.max(left.x, right.x);
  const height = Math.min(left.y + left.height, right.y + right.height) - Math.max(left.y, right.y);
  return width > EPSILON && height > EPSILON ? width * height : 0;
}

export function evaluateResponsive(snapshot: HomePageSnapshot): HomeProbeGroupResult {
  const noHorizontalScroll =
    snapshot.documentState.scrollWidth <= snapshot.documentState.clientWidth;
  const sectionOverlaps: string[] = [];
  for (let leftIndex = 0; leftIndex < snapshot.sections.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < snapshot.sections.length; rightIndex += 1) {
      const left = snapshot.sections[leftIndex];
      const right = snapshot.sections[rightIndex];
      if (left === undefined || right === undefined) continue;
      if (overlapArea(left.rect, right.rect) > 0) {
        sectionOverlaps.push(`${left.id}/${right.id}`);
      }
    }
  }

  const targetOffenders = snapshot.targets
    .filter((target) => target.rect.width < MIN_TARGET_PX || target.rect.height < MIN_TARGET_PX)
    .map((target) => ({
      text: normaliseText(target.text),
      width: Math.round(target.rect.width),
      height: Math.round(target.rect.height),
      stretched: target.stretched,
    }));
  const bodyFontOffenders = snapshot.bodyTexts
    .filter((text) => text.fontSize < MIN_BODY_FONT_PX)
    .map((text) => ({
      text: normaliseText(text.text).slice(0, 80),
      fontSize: text.fontSize,
      tag: text.tag,
    }));

  const overlapSources = [
    ...snapshot.measureTexts.map((text) => ({ ...text, kind: 'text' as const })),
    ...snapshot.targets
      .filter((target) => !target.stretched)
      .map((target) => ({ ...target, kind: 'target' as const })),
  ];
  const overlapOffenders: string[] = [];
  for (let leftIndex = 0; leftIndex < overlapSources.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < overlapSources.length; rightIndex += 1) {
      const left = overlapSources[leftIndex];
      const right = overlapSources[rightIndex];
      if (left === undefined || right === undefined) continue;
      if (left.key === right.key) continue;
      if (left.sectionId === null || left.sectionId !== right.sectionId) continue;
      if (overlapArea(left.rect, right.rect) > 0) {
        overlapOffenders.push(
          `${left.sectionId}:${left.kind}:${normaliseText(left.text).slice(0, 30)} / ${right.kind}:${normaliseText(right.text).slice(0, 30)}`,
        );
      }
    }
  }

  const clippingOffenders = [...snapshot.measureTexts, ...snapshot.targets].flatMap((item) => {
    const right = item.rect.x + item.rect.width;
    if (item.rect.x < -EPSILON || right > snapshot.viewport.width + EPSILON) {
      return [`${normaliseText(item.text).slice(0, 40)}:x-range`];
    }
    if (
      (item.overflowX !== 'visible' && item.scrollWidth > item.clientWidth + EPSILON) ||
      (item.overflowY !== 'visible' && item.scrollHeight > item.clientHeight + EPSILON)
    ) {
      return [`${normaliseText(item.text).slice(0, 40)}:overflow`];
    }
    return [];
  });

  return groupResult(
    'responsive',
    [
      check('responsive-no-horizontal-scroll', noHorizontalScroll, true, snapshot.documentState),
      check('responsive-no-section-overlap', sectionOverlaps.length === 0, [], sectionOverlaps),
      check('responsive-no-text-overlap', overlapOffenders.length === 0, [], overlapOffenders),
      check('responsive-no-clipping', clippingOffenders.length === 0, [], clippingOffenders),
      check('responsive-tap-targets', targetOffenders.length === 0, [], targetOffenders),
      check('responsive-body-font-size', bodyFontOffenders.length === 0, [], bodyFontOffenders),
    ],
    { snapshot },
  );
}

function focusOrderValue(focus: HomeFocusSnapshot): readonly [number, number, number, number] {
  return [focus.sectionIndex, focus.gridColumnIndex ?? 0, focus.rect.y, focus.rect.x];
}

function nonDecreasing(
  left: readonly [number, number, number, number],
  right: readonly [number, number, number, number],
): boolean {
  return (
    left[0] < right[0] ||
    (left[0] === right[0] &&
      (left[1] < right[1] ||
        (left[1] === right[1] &&
          (left[2] < right[2] || (left[2] === right[2] && left[3] <= right[3])))))
  );
}

export function evaluateStructure(
  snapshot: HomePageSnapshot,
  homeSections: readonly string[] | null,
  contactTitle: string,
): HomeProbeGroupResult {
  const pages =
    homeSections === null ? ['hero', 'projects', 'about', 'contact'] : pageSectionIds(homeSections);
  const h1s = snapshot.headings.filter((heading) => heading.level === 1);
  const headings = snapshot.headings.map((heading) => heading.level);
  const skipped = headings.flatMap((level, index) => {
    const previous = headings[index - 1];
    return previous !== undefined && level > previous + 1 ? [`h${previous}->h${level}`] : [];
  });
  const pageHeadings = pages.flatMap((id) => {
    const heading = sectionHeading(snapshot, id);
    return heading === undefined ? [] : [`${id}:h${heading.level}`];
  });
  const expectedHeadings = pages.map((id) => {
    const expected = expectedSectionHeading(id);
    return `${id}:${expected.label}`;
  });
  const hero = snapshot.sections.find((section) => section.id === 'hero');
  const heroHeading = snapshot.headings.find(
    (heading) => heading.sectionId === 'hero' && heading.level === 1,
  );
  const heroNamed =
    hero !== undefined &&
    hero.labelledby !== null &&
    hero.label !== null &&
    hero.label === heroHeading?.text;
  const contactHeading = snapshot.headings.find(
    (heading) =>
      heading.sectionId === 'contact' && heading.level === 2 && heading.text === contactTitle,
  );
  const unnamedRegions = pages.filter((id) => {
    const section = snapshot.sections.find((candidate) => candidate.id === id);
    return (
      section === undefined ||
      section.tag !== 'section' ||
      section.labelledby === null ||
      section.label === null
    );
  });
  const positiveTabIndex = snapshot.focusables
    .filter((focus) => focus.tabIndex > 0)
    .map((focus) => `${focus.key}:${focus.tabIndex}`);
  const focusOrder = snapshot.focusables.map(focusOrderValue);
  const focusOrderPass = focusOrder.every(
    (value, index) =>
      index === 0 || nonDecreasing(focusOrder[index - 1] ?? [-1, -1, -1, -1], value),
  );
  const tabWalk = snapshot.tabWalk;
  const walkVerdict =
    tabWalk === undefined
      ? null
      : evaluateTabWalk(
          tabWalk.forward,
          tabWalk.backward,
          snapshot.focusables.map((focus) => focus.key),
        );

  return groupResult(
    'structure',
    [
      check('structure-one-h1', h1s.length === 1, 1, h1s.length),
      check('structure-heading-levels', skipped.length === 0, [], skipped),
      check(
        'structure-section-headings',
        sameStrings(pageHeadings, expectedHeadings),
        expectedHeadings,
        pageHeadings,
      ),
      check('structure-hero-named', heroNamed, true, {
        labelledby: hero?.labelledby ?? null,
        label: hero?.label ?? null,
        heading: heroHeading?.text ?? null,
      }),
      check(
        'structure-contact-h2',
        contactHeading !== undefined,
        contactTitle,
        contactHeading ?? null,
      ),
      check(
        'structure-landmarks',
        snapshot.landmarks.banner === 1 &&
          snapshot.landmarks.main === 1 &&
          snapshot.landmarks.contentinfo === 1,
        { banner: 1, main: 1, contentinfo: 1 },
        snapshot.landmarks,
      ),
      check('structure-named-regions', unnamedRegions.length === 0, [], unnamedRegions),
      check(
        'structure-skip-first',
        snapshot.focusables[0]?.key === 'skip',
        'skip',
        snapshot.focusables[0]?.key ?? null,
      ),
      check('structure-no-positive-tabindex', positiveTabIndex.length === 0, [], positiveTabIndex),
      check('structure-tab-walk', walkVerdict?.pass === true, true, walkVerdict ?? 'no tab walk'),
      check('structure-focus-order', focusOrderPass, true, focusOrder),
    ],
    { snapshot },
  );
}

export function evaluateHeroControl(
  snapshot: HomePageSnapshot,
  reducedMotion: boolean,
): HomeProbeCheck {
  const control = snapshot.heroControl;
  const slotPass =
    control?.slot !== null &&
    control?.slot !== undefined &&
    Math.round(control.slot.width) === MIN_TARGET_PX &&
    Math.round(control.slot.height) === MIN_TARGET_PX;
  const pass =
    reducedMotion === true
      ? control?.loop === null &&
        control.button === false &&
        control.buttonInSlot === false &&
        control.posterVisible === true &&
        slotPass
      : control?.loop === 'running' &&
        control.button === true &&
        control.buttonInSlot === true &&
        slotPass;

  return check(
    reducedMotion === true ? 'structure-hero-poster-path' : 'structure-hero-loop-control',
    pass,
    reducedMotion === true
      ? { loop: null, button: false, buttonInSlot: false, posterVisible: true, slot: 44 }
      : { loop: 'running', button: true, buttonInSlot: true, slot: 44 },
    control ?? null,
  );
}

export function evaluateCopy(
  visibleTexts: readonly string[],
  allowedTexts: readonly string[],
  allowlist: readonly string[] = HOME_PROBE_UI_ALLOWLIST,
): HomeProbeGroupResult {
  const allowed = new Set([...allowedTexts, ...allowlist].map(normaliseText));
  const separatorOnly = (text: string): boolean =>
    text.length > 0 &&
    [...text].every(
      (character) =>
        (HOME_PROBE_SEPARATORS as readonly string[]).includes(character) || /\s/.test(character),
    );
  const unknown = [...new Set(visibleTexts.map(normaliseText))].filter(
    (text) => text !== '' && !allowed.has(text) && !separatorOnly(text),
  );

  return groupResult(
    'copy',
    [check('copy-known-text', unknown.length === 0, [], unknown)],
    { visibleTexts: [...new Set(visibleTexts.map(normaliseText))], allowedTexts, allowlist },
    [`allowlist: ${allowlist.join(' | ')}`],
  );
}

export function homeProbeConfig(): HomeProbeConfig {
  return {
    identityName: siteSource.identity.name,
    eyebrow: siteSource.hero.eyebrow,
    headline: siteSource.hero.headline,
    primaryCta: siteSource.hero.primaryCta.label,
    projectName: websocketInspectorSource.meta.name,
    projectTagline: websocketInspectorSource.meta.tagline ?? '',
    projectsNote: siteSource.projects.emptyNote,
    contactTitle: siteSource.contact.title,
  };
}

function collectSnapshotInPage(config: HomeProbeConfig): HomePageSnapshot {
  const scrollX = window.scrollX;
  const scrollY = window.scrollY;
  const viewport = { width: window.innerWidth, height: window.innerHeight };
  const proofValueSelector = '[data-hero-proof-value]';
  const compact = (value: string): string => value.replace(/\s+/g, ' ').trim();
  const rect = (element: Element): DocumentRect => {
    const value = element.getBoundingClientRect();
    return {
      x: value.x + scrollX,
      y: value.y + scrollY,
      width: value.width,
      height: value.height,
    };
  };
  const viewportRect = (element: Element): DocumentRect => {
    const value = element.getBoundingClientRect();
    return { x: value.x, y: value.y, width: value.width, height: value.height };
  };
  const rendered = (element: Element): boolean => {
    const box = element.getBoundingClientRect();
    if (box.width <= 1 || box.height <= 1) return false;
    if (element.closest('.sr-only') !== null) return false;
    const style = getComputedStyle(element);
    return style.visibility === 'visible' && Number(style.opacity) === 1;
  };
  const fullyInsideViewport = (box: DocumentRect): boolean =>
    box.x >= 0 &&
    box.y >= 0 &&
    box.x + box.width <= viewport.width &&
    box.y + box.height <= viewport.height;
  const sectionIdFor = (element: Element): string | null => {
    const explicit = element.getAttribute('data-home-section');
    if (explicit !== null && explicit !== '') return explicit;
    if (element.tagName === 'HEADER') return 'nav';
    if (element.tagName === 'FOOTER') return 'footer';
    if (element.hasAttribute('data-site-hero')) return 'hero';
    if (element.id !== '') return element.id;
    return null;
  };
  const sectionFor = (element: Element): Element | null =>
    element.closest('header, main section, footer');
  const sectionIdOf = (element: Element): string | null => {
    const section = sectionFor(element);
    return section === null ? null : sectionIdFor(section);
  };
  const labelledById = (element: Element): string | null => {
    const value = element.getAttribute('aria-labelledby');
    if (value === null || value === '') return null;
    const ids = value.split(/\s+/).filter(Boolean);
    const text = ids.map((id) => document.getElementById(id)?.textContent ?? '').join(' ');
    return compact(text) || null;
  };
  const reorderRisks = (element: Element, label: string): string[] => {
    const style = getComputedStyle(element);
    const risks: string[] = [];
    if (style.order !== '0') risks.push(`${label}:order=${style.order}`);
    if (style.flexDirection.endsWith('reverse')) {
      risks.push(`${label}:flex-direction=${style.flexDirection}`);
    }
    if (style.gridRow !== 'auto') risks.push(`${label}:grid-row=${style.gridRow}`);
    if (style.gridColumn !== 'auto') risks.push(`${label}:grid-column=${style.gridColumn}`);
    if (style.gridArea !== 'auto') risks.push(`${label}:grid-area=${style.gridArea}`);
    if (style.position === 'absolute' || style.position === 'fixed') {
      risks.push(`${label}:position=${style.position}`);
    }
    return risks;
  };
  const gridTracks = (style: CSSStyleDeclaration): string[] => {
    const tokens: string[] = [];
    let token = '';
    let depth = 0;
    for (const character of style.gridTemplateColumns) {
      if (character === '(') depth += 1;
      if (character === ')') depth = Math.max(0, depth - 1);
      if (/\s/.test(character) && depth === 0) {
        if (token !== '') tokens.push(token);
        token = '';
      } else {
        token += character;
      }
    }
    if (token !== '') tokens.push(token);
    return tokens.filter(
      (value) => value !== 'none' && !(value.startsWith('[') && value.endsWith(']')),
    );
  };
  const isMultiColumnGrid = (element: Element): boolean => {
    const style = getComputedStyle(element);
    return (
      (style.display === 'grid' || style.display === 'inline-grid') && gridTracks(style).length > 1
    );
  };
  const gridColumnIndexFor = (element: Element): number | null => {
    const section = sectionFor(element);
    if (section === null) return null;

    const grid = [section, ...section.querySelectorAll('*')].find(
      (candidate) => rendered(candidate) && isMultiColumnGrid(candidate),
    );
    if (grid === undefined || !grid.contains(element)) return null;

    const style = getComputedStyle(grid);
    const trackWidths = gridTracks(style).flatMap((track) => {
      const pixels = [...track.matchAll(/([\d.]+)px/g)];
      const width = Number(pixels.at(-1)?.[1]);
      return Number.isFinite(width) ? [width] : [];
    });
    if (trackWidths.length < 2) return null;

    let item = element;
    while (item.parentElement !== null && item.parentElement !== grid) {
      item = item.parentElement;
    }
    if (item.parentElement !== grid) return null;

    const gap = Number.parseFloat(style.columnGap);
    const gridRect = grid.getBoundingClientRect();
    const contentLeft =
      gridRect.left +
      (Number.parseFloat(style.borderLeftWidth) || 0) +
      (Number.parseFloat(style.paddingLeft) || 0);
    const itemLeft = item.getBoundingClientRect().left;
    let cursor = contentLeft;
    let column = 0;
    for (const width of trackWidths.slice(0, -1)) {
      if (itemLeft < cursor + width + (Number.isFinite(gap) ? gap : 0) / 2) break;
      cursor += width + (Number.isFinite(gap) ? gap : 0);
      column += 1;
    }
    return column;
  };

  const roots: Element[] = [];
  const header = document.querySelector('header');
  if (header !== null) roots.push(header);
  roots.push(...document.querySelectorAll('main section'));
  const footer = document.querySelector('footer');
  if (footer !== null) roots.push(footer);
  const sectionRoots = roots.filter((element) => {
    if (element === header || element === footer) return true;
    return sectionIdFor(element) !== null;
  });
  const sections = sectionRoots.map((element) => {
    const risks = reorderRisks(element, 'self');
    if (element.parentElement !== null)
      risks.push(...reorderRisks(element.parentElement, 'parent'));
    return {
      id: sectionIdFor(element) ?? element.tagName.toLowerCase(),
      tag: element.tagName.toLowerCase(),
      rect: rect(element),
      text: compact((element as HTMLElement).innerText || element.textContent || ''),
      labelledby: element.getAttribute('aria-labelledby'),
      label: labelledById(element),
      reorder: risks,
    };
  });

  const headings = [...document.querySelectorAll('h1,h2,h3,h4,h5,h6')].map((element) => ({
    level: Number(element.tagName.slice(1)),
    text: compact(element.textContent ?? ''),
    sectionId: sectionIdOf(element),
    elementId: element.id || null,
  }));

  const textSnapshot = (element: Element, key: string): HomeTextSnapshot => {
    const style = getComputedStyle(element);
    return {
      key,
      text: compact((element as HTMLElement).innerText || element.textContent || ''),
      tag: element.tagName.toLowerCase(),
      sectionId: sectionIdOf(element),
      rect: viewportRect(element),
      rendered: rendered(element),
      fontSize: Number.parseFloat(style.fontSize),
      fontFamily: style.fontFamily,
      overflowX: style.overflowX,
      overflowY: style.overflowY,
      scrollWidth: element.scrollWidth,
      clientWidth: element.clientWidth,
      scrollHeight: element.scrollHeight,
      clientHeight: element.clientHeight,
    };
  };

  const bodyElements = new Set<Element>();
  const add = (element: Element | null): void => {
    if (element !== null) bodyElements.add(element);
  };
  add(document.querySelector('[data-site-hero] h1 + p'));
  add(document.querySelector('#hero-caption'));
  for (const element of document.querySelectorAll('[data-site-card] p')) add(element);
  const aboutParagraphs = [...document.querySelectorAll('#about p')];
  for (const [index, element] of aboutParagraphs.entries()) {
    const isLast = index === aboutParagraphs.length - 1;
    const mono = getComputedStyle(element).fontFamily.toLowerCase().includes('mono');
    if (!(isLast && mono)) add(element);
  }
  for (const element of document.querySelectorAll('p')) {
    if (compact(element.textContent ?? '') === config.projectsNote) add(element);
  }
  for (const element of document.querySelectorAll(
    '[data-home-section="contact"] a, [data-home-section="contact"] p',
  )) {
    add(element);
  }
  for (const element of document.querySelectorAll(proofValueSelector)) add(element);
  const bodyKeys = new Map(
    [...bodyElements].map((element, index) => [element, `body:${index}`] as const),
  );
  const bodyTexts = [...bodyElements].map((element) =>
    textSnapshot(element, bodyKeys.get(element) ?? 'body:unknown'),
  );
  const measureElements = new Set<Element>([
    ...document.querySelectorAll('h1,h2,h3,h4,h5,h6,p,figcaption'),
    ...bodyElements,
  ]);
  for (const element of document.querySelectorAll('[data-hero-proof-label]')) {
    measureElements.add(element);
  }
  const measureTexts = [...measureElements]
    .filter((element) => rendered(element))
    .filter(
      (element) => element.tagName !== 'FIGCAPTION' || element.querySelector('button') === null,
    )
    .map((element, index) => textSnapshot(element, bodyKeys.get(element) ?? `measure:${index}`));

  const targets = [...document.querySelectorAll<HTMLElement>('a,button')].flatMap(
    (element, index) => {
      if (!rendered(element)) return [];
      const after = getComputedStyle(element, '::after');
      let box = viewportRect(element);
      let stretched = false;
      if (after.position === 'absolute') {
        let ancestor = element.parentElement;
        while (ancestor !== null && getComputedStyle(ancestor).position === 'static') {
          ancestor = ancestor.parentElement;
        }
        box = viewportRect(ancestor ?? element);
        stretched = true;
      }
      const name = compact(
        element.getAttribute('aria-label') ?? element.innerText ?? element.textContent ?? '',
      );
      const isSkip =
        element.tagName === 'A' && element.getAttribute('href') === '#main' && /skip/i.test(name);
      if (isSkip && !fullyInsideViewport(box)) return [];
      const base = textSnapshot(element, bodyKeys.get(element) ?? `target:${index}`);
      return [{ ...base, rect: box, text: name, stretched }];
    },
  );

  const sectionsIndex = new Map(sections.map((section, index) => [section.id, index]));
  const focusKeys = new WeakMap<Element, string>();
  const focusGridColumns = new WeakMap<Element, number | null>();
  const focusables = [
    ...document.querySelectorAll<HTMLElement>('a[href],button,input,select,textarea,[tabindex]'),
  ]
    .filter((element) => {
      if (element.hasAttribute('disabled')) return false;
      if (element.tabIndex < 0) return false;
      if (element.closest('[aria-hidden="true"],[inert],script,style,template,noscript') !== null) {
        return false;
      }
      return element.getClientRects().length > 0;
    })
    .map((element, index) => {
      const name = compact(
        element.getAttribute('aria-label') ?? element.innerText ?? element.textContent ?? '',
      );
      const href = element.getAttribute('href');
      const key =
        href === '#main' && /skip/i.test(name)
          ? 'skip'
          : `focus:${index}:${element.tagName.toLowerCase()}:${name}`;
      focusKeys.set(element, key);
      const gridColumnIndex = gridColumnIndexFor(element);
      focusGridColumns.set(element, gridColumnIndex);
      const sectionId = sectionIdOf(element);
      return {
        key,
        role: element.getAttribute('role') ?? element.tagName.toLowerCase(),
        name,
        panel: sectionId ?? '',
        sectionIndex: sectionId === null ? -1 : (sectionsIndex.get(sectionId) ?? -1),
        rect: rect(element),
        tabIndex: element.tabIndex,
        gridColumnIndex,
      };
    });

  const foldTarget = (
    element: Element | null | undefined,
    key: string,
  ): HomeFoldTargetSnapshot | null => {
    if (element === null || element === undefined) return null;
    const box = viewportRect(element);
    return {
      key,
      text: compact((element as HTMLElement).innerText || element.textContent || ''),
      tag: element.tagName.toLowerCase(),
      rect: box,
      rendered: rendered(element),
      fullyInsideViewport: fullyInsideViewport(box),
    };
  };
  const exactInHero = (text: string): Element | undefined =>
    [...document.querySelectorAll('[data-site-hero] *')].find(
      (element) => compact(element.textContent ?? '') === text,
    );
  const hero = document.querySelector('[data-site-hero]');
  const heroCta =
    hero === null
      ? undefined
      : [...hero.querySelectorAll('a')].find(
          (element) => compact(element.textContent ?? '') === config.primaryCta,
        );
  const caption = document.querySelector('#hero-caption');
  const projectSignal =
    caption !== null && compact(caption.textContent ?? '').includes(config.projectName)
      ? caption
      : [...document.querySelectorAll('[data-site-card] h2,[data-site-card] h3')].find((element) =>
          compact(element.textContent ?? '').includes(config.projectName),
        );
  const fold = {
    name: foldTarget(exactInHero(config.identityName), 'fold:name'),
    eyebrow: foldTarget(exactInHero(config.eyebrow), 'fold:eyebrow'),
    headline: foldTarget(document.querySelector('h1'), 'fold:headline'),
    primaryCta: foldTarget(heroCta, 'fold:primary-cta'),
    projectSignal: foldTarget(projectSignal, 'fold:project-signal'),
  };

  const visibleByParent = new Map<Element, string[]>();
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node !== null; node = walker.nextNode()) {
    const text = compact(node.textContent ?? '');
    if (text === '') continue;
    const parent = node.parentElement;
    if (parent === null) continue;
    const narration = parent.closest('[data-hero-narration]');
    if (
      narration === null &&
      parent.closest('.sr-only,[aria-hidden="true"],[inert],script,style,template,noscript') !==
        null
    ) {
      continue;
    }
    const style = getComputedStyle(parent);
    if (style.visibility === 'hidden' || style.display === 'none' || Number(style.opacity) === 0) {
      continue;
    }
    const range = document.createRange();
    range.selectNodeContents(node);
    const box = range.getBoundingClientRect();
    if (box.width > 0 && box.height > 0) {
      const parts = visibleByParent.get(parent) ?? [];
      parts.push(text);
      visibleByParent.set(parent, parts);
    }
  }
  const visibleTexts = [...visibleByParent.values()].map((parts) => compact(parts.join(' ')));
  const footerContact = document.querySelector('[data-footer-contact]');
  const heroLoop = document.querySelector('[data-hero-loop]');
  const heroSlot = hero?.querySelector<HTMLElement>('[data-hero-loop-slot]') ?? null;
  const heroButton = heroSlot?.querySelector<HTMLButtonElement>('button') ?? null;
  const heroPoster = hero?.querySelector('[data-site-poster]') ?? null;

  (window as unknown as HomeProbeWindow).__homeProbeFocusKeys = focusKeys;
  (window as unknown as HomeProbeWindow).__homeProbeFocusGridColumns = focusGridColumns;

  return {
    viewport,
    documentState: {
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
      scrollHeight: document.documentElement.scrollHeight,
      clientHeight: document.documentElement.clientHeight,
    },
    sections,
    headings,
    landmarks: {
      banner: document.querySelectorAll('header').length,
      main: document.querySelectorAll('main').length,
      contentinfo: document.querySelectorAll('footer').length,
    },
    bodyTexts,
    measureTexts,
    targets,
    focusables,
    fold,
    visibleTexts,
    footerContactDisplay: footerContact === null ? null : getComputedStyle(footerContact).display,
    heroControl: {
      loop: heroLoop?.getAttribute('data-hero-loop') ?? null,
      button: heroButton !== null && rendered(heroButton),
      buttonInSlot: heroButton !== null,
      posterVisible: heroPoster !== null && rendered(heroPoster),
      slot: heroSlot === null ? null : viewportRect(heroSlot),
    },
  };
}

export async function collectHomeSnapshot(
  page: Page,
  config: HomeProbeConfig = homeProbeConfig(),
): Promise<HomePageSnapshot> {
  return await page.evaluate(collectSnapshotInPage, config);
}

async function readActiveFocus(page: Page): Promise<HomeFocusSnapshot | null> {
  return await page.evaluate(() => {
    const active = document.activeElement;
    if (!(active instanceof HTMLElement) || active === document.body) return null;
    const keys = (window as unknown as HomeProbeWindow).__homeProbeFocusKeys;
    const gridColumns = (window as unknown as HomeProbeWindow).__homeProbeFocusGridColumns;
    const key = keys?.get(active) ?? `focus:active:${active.tagName.toLowerCase()}`;
    const rect = active.getBoundingClientRect();
    const section = active.closest('header, main section, footer');
    const sectionText = section?.getAttribute('data-home-section') ?? '';
    return {
      key,
      role: active.getAttribute('role') ?? active.tagName.toLowerCase(),
      name: (active.getAttribute('aria-label') ?? active.innerText ?? active.textContent ?? '')
        .replace(/\s+/g, ' ')
        .trim(),
      panel: sectionText,
      sectionIndex: -1,
      rect: {
        x: rect.x + window.scrollX,
        y: rect.y + window.scrollY,
        width: rect.width,
        height: rect.height,
      },
      tabIndex: active.tabIndex,
      gridColumnIndex: gridColumns?.get(active) ?? null,
    };
  });
}

async function collectTabWalk(
  page: Page,
  expected: readonly HomeFocusSnapshot[],
): Promise<HomeTabWalkSnapshot> {
  await page.evaluate(() => {
    (document.activeElement as HTMLElement | null)?.blur();
    document.body.focus();
  });
  const forward: HomeFocusSnapshot[] = [];
  for (let index = 0; index < expected.length + 4; index += 1) {
    await page.keyboard.press('Tab');
    const step = await readActiveFocus(page);
    if (step === null) break;
    forward.push(step);
  }

  await page.evaluate(() => {
    (document.activeElement as HTMLElement | null)?.blur();
    document.body.focus();
  });
  await page.keyboard.press('Shift+Tab');
  const anchor = await readActiveFocus(page);
  const backward: HomeFocusSnapshot[] = [];
  for (let index = 0; index < expected.length - 1; index += 1) {
    await page.keyboard.press('Shift+Tab');
    const step = await readActiveFocus(page);
    if (step !== null) backward.push(step);
  }
  return { forward, backward, anchor };
}

function contextOptions(cell: Cell): BrowserContextOptions {
  return {
    viewport: { width: cell.width, height: cell.height },
    deviceScaleFactor: 1,
    isMobile: cell.name === 'mobile',
    hasTouch: cell.name === 'mobile',
    colorScheme: cell.palette,
    reducedMotion: cell.reducedMotion === true ? 'reduce' : 'no-preference',
  };
}

async function waitForHeroSettled(page: Page): Promise<void> {
  await page.waitForFunction(
    () => {
      const live = document.querySelector('[data-site-live]');
      const poster = document.querySelector('[data-site-poster]');

      if (live === null) return poster !== null;

      const state = live.getAttribute('data-site-live-state');
      if (state === 'revealed') return document.querySelector('[data-hero-loop]') !== null;
      if (state === 'skipped') return poster !== null;
      return false;
    },
    undefined,
    { timeout: WAIT_TIMEOUT_MS },
  );
}

async function waitForHeroReady(page: Page, base: URL, cell: Cell): Promise<void> {
  if (base.pathname !== '/') {
    await waitForHeroSettled(page);
    return;
  }

  if (cell.reducedMotion === true) {
    await page.waitForFunction(
      () =>
        document.querySelector('[data-site-live]')?.getAttribute('data-site-live-state') ===
          'skipped' && document.querySelector('[data-site-hero] [data-site-poster]') !== null,
      undefined,
      { timeout: WAIT_TIMEOUT_MS },
    );
    return;
  }

  await page.waitForFunction(
    () => document.querySelector('[data-hero-loop="running"]') !== null,
    undefined,
    { timeout: WAIT_TIMEOUT_MS },
  );
}

async function openCell(
  browser: Browser,
  base: URL,
  cell: Cell,
): Promise<{ page: Page; close: () => Promise<void> }> {
  const context = await browser.newContext(contextOptions(cell));
  const page = await context.newPage();
  page.setDefaultTimeout(WAIT_TIMEOUT_MS);
  try {
    const response = await page.goto(base.href, { waitUntil: 'load', timeout: WAIT_TIMEOUT_MS });
    if (response === null || response.status() >= 400) {
      throw new CliError(
        EXIT.UNREACHABLE,
        `unreachable: ${base.href} returned HTTP ${response?.status() ?? 'no response'}`,
      );
    }
  } catch (error) {
    if (error instanceof CliError) throw error;
    const detail = error instanceof Error ? error.message : String(error);
    throw new CliError(EXIT.UNREACHABLE, `unreachable: ${base.href}: ${detail}`);
  }
  await page.locator('button[aria-label^="Switch to "]').waitFor({
    state: 'visible',
    timeout: WAIT_TIMEOUT_MS,
  });
  await waitForHeroReady(page, base, cell);
  await page.evaluate(async () => {
    await document.fonts.ready;
  });
  await page.waitForTimeout(SETTLE_MS);
  return { page, close: async () => context.close() };
}

async function collectCell(browser: Browser, base: URL, cell: Cell): Promise<CellSnapshot> {
  const opened = await openCell(browser, base, cell);
  try {
    const snapshot = await collectHomeSnapshot(opened.page);
    return { ...cell, snapshot };
  } finally {
    await opened.close();
  }
}

async function drawBoxes(page: Page, boxes: readonly HomeRect[], fullPage: boolean): Promise<void> {
  await page.evaluate(
    ({ values, includeScroll }) => {
      const colour = getComputedStyle(document.body).color;
      const root = document.createElement('div');
      root.setAttribute('data-home-probe-outline', '');
      root.setAttribute('aria-hidden', 'true');
      Object.assign(root.style, {
        position: 'absolute',
        inset: '0',
        pointerEvents: 'none',
        zIndex: '2147483647',
      });
      for (const box of values) {
        const outline = document.createElement('div');
        outline.setAttribute('aria-hidden', 'true');
        Object.assign(outline.style, {
          position: 'absolute',
          left: `${box.x + (includeScroll ? window.scrollX : 0)}px`,
          top: `${box.y + (includeScroll ? window.scrollY : 0)}px`,
          width: `${box.width}px`,
          height: `${box.height}px`,
          outline: '2px solid',
          outlineColor: colour,
          boxShadow: `0 0 0 1px ${colour}`,
          pointerEvents: 'none',
        });
        root.append(outline);
      }
      document.body.append(root);
    },
    { values: boxes, includeScroll: fullPage },
  );
}

async function clearBoxes(page: Page): Promise<void> {
  await page.evaluate(() => document.querySelector('[data-home-probe-outline]')?.remove());
}

async function screenshotCell(
  page: Page,
  path: string,
  fullPage: boolean,
  boxes: readonly HomeRect[] = [],
): Promise<void> {
  if (boxes.length > 0) await drawBoxes(page, boxes, fullPage);
  try {
    await page.screenshot({ path, fullPage, animations: 'allow', caret: 'hide' });
  } finally {
    if (boxes.length > 0) await clearBoxes(page);
  }
}

async function runOrderGroup(
  browser: Browser,
  options: HomeProbeOptions,
  homeSections: readonly string[] | null,
): Promise<HomeProbeGroupResult> {
  const cells: CellSnapshot[] = [];
  const results: HomeProbeGroupResult[] = [];
  for (const cell of ORDER_CELLS) {
    const collected = await collectCell(browser, options.base, cell);
    cells.push(collected);
    results.push(evaluateOrder(collected.snapshot, homeSections, options.approved));
    if (cell.width === 1440) {
      const opened = await openCell(browser, options.base, cell);
      try {
        await screenshotCell(
          opened.page,
          join(options.outDir, 'order-1440-light.png'),
          true,
          collected.snapshot.sections.map((section) => section.rect),
        );
      } finally {
        await opened.close();
      }
    }
  }
  const checks = results.flatMap((result, index) =>
    result.checks.map((entry) => ({
      ...entry,
      name: `${ORDER_CELLS[index]?.width ?? 0}:${entry.name}`,
    })),
  );
  return groupResult('order', checks, { cells, homeSections, approved: options.approved });
}

async function runFoldGroup(
  browser: Browser,
  options: HomeProbeOptions,
): Promise<HomeProbeGroupResult> {
  const cells: CellSnapshot[] = [];
  const results: HomeProbeGroupResult[] = [];
  for (const cell of FOLD_CELLS) {
    const collected = await collectCell(browser, options.base, cell);
    cells.push(collected);
    results.push(evaluateFold(collected.snapshot));
    const opened = await openCell(browser, options.base, cell);
    try {
      const boxes = Object.values(collected.snapshot.fold).flatMap((target) =>
        target === null ? [] : [target.rect],
      );
      await screenshotCell(
        opened.page,
        join(options.outDir, `fold-390x844-${cell.palette}.png`),
        false,
        boxes,
      );
    } finally {
      await opened.close();
    }
  }
  const checks = results.flatMap((result, index) =>
    result.checks.map((entry) => ({
      ...entry,
      name: `${FOLD_CELLS[index]?.palette ?? ''}:${entry.name}`,
    })),
  );
  return groupResult('fold', checks, { cells });
}

async function runResponsiveGroup(
  browser: Browser,
  options: HomeProbeOptions,
): Promise<HomeProbeGroupResult> {
  const cells: CellSnapshot[] = [];
  const results: HomeProbeGroupResult[] = [];
  for (const cell of RESPONSIVE_CELLS) {
    const collected = await collectCell(browser, options.base, cell);
    cells.push(collected);
    results.push(evaluateResponsive(collected.snapshot));
    const opened = await openCell(browser, options.base, cell);
    try {
      const baseName = `${cell.name}-${cell.palette}`;
      await screenshotCell(opened.page, join(options.outDir, `${baseName}.png`), true);
      await screenshotCell(opened.page, join(options.outDir, `${baseName}-fold.png`), false);
    } finally {
      await opened.close();
    }
  }
  const checks = results.flatMap((result, index) =>
    result.checks.map((entry) => ({
      ...entry,
      name: `${RESPONSIVE_CELLS[index]?.name ?? ''}-${RESPONSIVE_CELLS[index]?.palette ?? ''}:${entry.name}`,
    })),
  );
  return groupResult('responsive', checks, { cells });
}

async function runStructureGroup(
  browser: Browser,
  options: HomeProbeOptions,
  homeSections: readonly string[] | null,
  config: HomeProbeConfig,
): Promise<HomeProbeGroupResult> {
  const cells: CellSnapshot[] = [];
  const results: HomeProbeGroupResult[] = [];
  for (const cell of STRUCTURE_CELLS) {
    const opened = await openCell(browser, options.base, cell);
    try {
      const snapshot = await collectHomeSnapshot(opened.page, config);
      const tabWalk = await collectTabWalk(opened.page, snapshot.focusables);
      const withWalk = { ...snapshot, tabWalk };
      cells.push({ ...cell, snapshot: withWalk });
      const evaluation = evaluateStructure(withWalk, homeSections, config.contactTitle);
      const footerContact = check(
        'footer-contact-hidden-on-home',
        withWalk.footerContactDisplay === 'none',
        'none',
        withWalk.footerContactDisplay ?? null,
      );
      const heroControl = evaluateHeroControl(withWalk, cell.reducedMotion === true);
      results.push({
        ...evaluation,
        pass: evaluation.pass && footerContact.pass && heroControl.pass,
        checks: [...evaluation.checks, footerContact, heroControl],
        lines: [...evaluation.lines, formatCheck(footerContact), formatCheck(heroControl)],
      });
    } finally {
      await opened.close();
    }
  }
  const checks = results.flatMap((result, index) =>
    result.checks.map((entry) => ({
      ...entry,
      name: `${STRUCTURE_CELLS[index]?.width ?? 0}${STRUCTURE_CELLS[index]?.reducedMotion === true ? '-reduced' : ''}:${entry.name}`,
    })),
  );
  return groupResult('structure', checks, { cells });
}

function flattenStrings(value: unknown, output: string[]): void {
  if (typeof value === 'string') {
    output.push(value);
  } else if (Array.isArray(value)) {
    for (const item of value) flattenStrings(item, output);
  } else if (value !== null && typeof value === 'object') {
    for (const item of Object.values(value)) flattenStrings(item, output);
  }
}

async function techLabels(rootDir: string): Promise<string[]> {
  try {
    const source = await readFile(resolve(rootDir, 'apps/web/content/tech-registry.ts'), 'utf8');
    return [...source.matchAll(/\blabel:\s*(['"])([^'"]+)\1/g)].flatMap((match) =>
      match[2] === undefined ? [] : [match[2]],
    );
  } catch {
    return [];
  }
}

interface NarrationProject {
  readonly flows?: readonly {
    readonly id?: string;
    readonly label?: string;
    readonly path: readonly string[];
  }[];
  readonly layers: readonly {
    readonly components: readonly {
      readonly id: string;
      readonly name?: string;
      readonly summary?: string;
    }[];
  }[];
}

interface ProofProject {
  readonly story?: {
    readonly metrics?: readonly {
      readonly label?: string;
      readonly value?: string;
    }[];
  };
  readonly layers: readonly {
    readonly id: string;
  }[];
}

interface ProofReference {
  readonly metric: number;
  readonly layer: string | null;
}

export function heroNarrationCompositions(project: NarrationProject): string[] {
  const components = project.layers.flatMap((layer) => layer.components);
  const compositions: string[] = [];

  for (const [flowIndex, flow] of (project.flows ?? []).entries()) {
    const flowLabel = flow.label ?? flow.id ?? `flow-${flowIndex + 1}`;

    for (const [step, componentId] of flow.path.entries()) {
      const component = components.find((candidate) => candidate.id === componentId);
      if (component?.name === undefined || component.summary === undefined) continue;

      compositions.push(
        `${flowLabel} · ${step + 1}/${flow.path.length} · ${component.name} — ${component.summary}`,
      );
    }
  }

  return compositions;
}

export function heroProofCompositions(
  project: ProofProject,
  proof: readonly ProofReference[],
): string[] {
  const layerIds = new Set(project.layers.map((layer) => layer.id));
  const metrics = project.story?.metrics ?? [];

  return proof.flatMap((reference) => {
    if (
      !Number.isInteger(reference.metric) ||
      reference.metric < 0 ||
      reference.metric >= metrics.length ||
      (reference.layer !== null && !layerIds.has(reference.layer))
    ) {
      return [];
    }

    const metric = metrics[reference.metric];
    if (metric?.label === undefined || metric.value === undefined) return [];

    return [`${metric.label} — ${metric.value}`];
  });
}

async function copyAllowlist(rootDir: string, config: HomeProbeConfig): Promise<string[]> {
  const strings: string[] = [];
  flattenStrings(siteSource, strings);
  flattenStrings(websocketInspectorSource, strings);
  strings.push(...heroNarrationCompositions(websocketInspectorSource));
  strings.push(...(await techLabels(rootDir)));
  strings.push(
    `${siteSource.identity.role} · ${siteSource.identity.location}`,
    `${config.projectName} — ${config.projectTagline}`,
    `© ${new Date().getFullYear()} ${siteSource.identity.name}`,
  );
  strings.push(...heroProofCompositions(websocketInspectorSource, siteSource.hero.proof));
  return [...new Set(strings.map(normaliseText).filter(Boolean))];
}

async function runCopyGroup(
  browser: Browser,
  options: HomeProbeOptions,
  config: HomeProbeConfig,
): Promise<HomeProbeGroupResult> {
  const collected = await collectCell(browser, options.base, COPY_CELL);
  const allowed = await copyAllowlist(options.rootDir ?? process.cwd(), config);
  return evaluateCopy(collected.snapshot.visibleTexts, allowed);
}

async function loadHomeSections(rootDir: string): Promise<readonly string[] | null> {
  const path = resolve(rootDir, 'apps/web/content/home-sections.ts');
  try {
    await access(path);
  } catch {
    return null;
  }
  try {
    const module = (await import(pathToFileURL(path).href)) as HomeSectionsModule;
    if (
      !Array.isArray(module.HOME_SECTIONS) ||
      module.HOME_SECTIONS.some((id) => typeof id !== 'string')
    ) {
      return null;
    }
    return [...module.HOME_SECTIONS];
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new CliError(EXIT.INTERNAL, `could not import HOME_SECTIONS: ${detail}`);
  }
}

async function writeGroupArtifacts(outDir: string, result: HomeProbeGroupResult): Promise<void> {
  await writeFile(
    join(outDir, `${result.group}.json`),
    `${JSON.stringify(result, null, 2)}\n`,
    'utf8',
  );
  await writeFile(
    join(outDir, `${result.group}.log.txt`),
    `${[
      `group: ${result.group}`,
      `result: ${result.pass ? 'PASS' : 'FAIL'}`,
      ...result.lines,
      `summary: ${result.pass ? 'PASS' : 'FAIL'} (${result.checks.length} checks)`,
    ].join('\n')}\n`,
    'utf8',
  );
}

export async function runHomeProbe(options: HomeProbeOptions): Promise<HomeProbeReport> {
  await mkdir(options.outDir, { recursive: true });
  const rootDir = options.rootDir ?? process.cwd();
  const homeSections = await loadHomeSections(rootDir);
  const config = homeProbeConfig();
  const browser = await launch();
  const browserVersion = chromiumVersion(browser);
  const groups: HomeProbeGroupResult[] = [];

  try {
    for (const group of options.groups) {
      const result =
        group === 'order'
          ? await runOrderGroup(browser, options, homeSections)
          : group === 'fold'
            ? await runFoldGroup(browser, options)
            : group === 'responsive'
              ? await runResponsiveGroup(browser, options)
              : group === 'structure'
                ? await runStructureGroup(browser, options, homeSections, config)
                : await runCopyGroup(browser, options, config);
      groups.push(result);
      for (const line of result.lines) console.log(line);
      console.log(`${group}: ${result.pass ? 'PASS' : 'FAIL'} (${result.checks.length} checks)`);
      await writeGroupArtifacts(options.outDir, result);
    }

    const report: HomeProbeReport = {
      kind: 'home-probe',
      version: 1,
      baseUrl: options.base.href,
      chromium: browserVersion,
      approved: options.approved,
      homeSections,
      groups,
      pass: groups.every((group) => group.pass),
    };
    await writeFile(
      join(options.outDir, 'home-probe.json'),
      `${JSON.stringify(report, null, 2)}\n`,
      'utf8',
    );
    return report;
  } finally {
    await browser.close();
  }
}
