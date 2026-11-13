import { describe, expect, test } from 'vitest';

import {
  evaluateCopy,
  evaluateFold,
  evaluateHeroControl,
  evaluateOrder,
  evaluateResponsive,
  evaluateStructure,
  heroNarrationCompositions,
  HOME_PROBE_HERO_ANNOTATION_SELECTOR,
  HOME_PROBE_DEFAULT_GROUPS,
  HOME_PROBE_GROUPS,
  HOME_PROBE_PRIMARY_CTA_SELECTOR,
  HOME_PROBE_UI_ALLOWLIST,
  HOME_SECTIONS_MISSING,
  type HomeFoldTargetSnapshot,
  type HomeFocusSnapshot,
  type HomeHeroControlSnapshot,
  type HomeHeadingSnapshot,
  type HomePageSnapshot,
  type HomeRect,
  type HomeSectionSnapshot,
  type HomeTargetSnapshot,
  type HomeTextSnapshot,
} from '../src/home-probe.ts';

const APPROVED = ['nav', 'hero', 'projects', 'about', 'contact', 'footer'] as const;

function rect(x: number, y: number, width: number, height: number): HomeRect {
  return { x, y, width, height };
}

function section(id: string, y: number, height: number, label: string | null): HomeSectionSnapshot {
  return {
    id,
    tag: id === 'nav' ? 'header' : id === 'footer' ? 'footer' : 'section',
    rect: rect(0, y, 390, height),
    text: label ?? `${id} text`,
    labelledby: label === null ? null : `${id}-title`,
    label,
    reorder: [],
  };
}

function heading(level: number, text: string, sectionId: string): HomeHeadingSnapshot {
  return { level, text, sectionId, elementId: `${sectionId}-title` };
}

function text(overrides: Partial<HomeTextSnapshot> = {}): HomeTextSnapshot {
  return {
    key: 'body:0',
    text: 'Body copy',
    tag: 'p',
    sectionId: 'hero',
    rect: rect(20, 200, 200, 24),
    rendered: true,
    fontSize: 16,
    fontFamily: 'sans-serif',
    overflowX: 'visible',
    overflowY: 'visible',
    scrollWidth: 200,
    clientWidth: 200,
    scrollHeight: 24,
    clientHeight: 24,
    ...overrides,
  };
}

function target(overrides: Partial<HomeTargetSnapshot> = {}): HomeTargetSnapshot {
  return {
    ...text({
      key: 'target:0',
      text: 'Open',
      tag: 'a',
      sectionId: 'projects',
      rect: rect(200, 400, 44, 44),
    }),
    stretched: false,
    ...overrides,
  };
}

function foldTarget(overrides: Partial<HomeFoldTargetSnapshot> = {}): HomeFoldTargetSnapshot {
  return {
    key: 'fold:target',
    text: 'Target',
    tag: 'p',
    rect: rect(20, 100, 160, 24),
    rendered: true,
    fullyInsideViewport: true,
    ...overrides,
  };
}

function focus(
  key: string,
  sectionIndex: number,
  y: number,
  x: number,
  overrides: Partial<HomeFocusSnapshot> = {},
): HomeFocusSnapshot {
  return {
    key,
    role: 'link',
    name: key,
    panel: '',
    sectionIndex,
    rect: rect(x, y, 44, 44),
    tabIndex: 0,
    gridColumnIndex: null,
    ...overrides,
  };
}

function heroControl(overrides: Partial<HomeHeroControlSnapshot> = {}): HomeHeroControlSnapshot {
  return {
    loop: 'running',
    button: true,
    buttonInSlot: true,
    posterVisible: false,
    slot: rect(20, 700, 44, 44),
    ...overrides,
  };
}

function snapshot(overrides: Partial<HomePageSnapshot> = {}): HomePageSnapshot {
  const focusables = [
    focus('skip', -1, -96, 12),
    focus('nav:home', 0, 0, 8),
    focus('hero:primary', 1, 300, 20),
    focus('footer:top', 5, 1200, 20),
  ];
  return {
    viewport: { width: 390, height: 844 },
    documentState: { scrollWidth: 390, clientWidth: 390, scrollHeight: 1_250, clientHeight: 844 },
    sections: [
      section('nav', 0, 44, null),
      section('hero', 44, 556, 'Every project, taken apart.'),
      section('projects', 600, 190, 'Projects'),
      section('about', 790, 260, 'About'),
      section('contact', 1_050, 100, 'Contact'),
      section('footer', 1_150, 100, null),
    ],
    headings: [
      heading(1, 'Every project, taken apart.', 'hero'),
      heading(2, 'Projects', 'projects'),
      heading(2, 'About', 'about'),
      heading(2, 'Contact', 'contact'),
    ],
    landmarks: { banner: 1, main: 1, contentinfo: 1 },
    bodyTexts: [text()],
    measureTexts: [
      text({ key: 'measure:0', text: 'Headline', tag: 'h1', rect: rect(20, 80, 240, 40) }),
    ],
    targets: [target()],
    focusables,
    fold: {
      name: foldTarget({ key: 'fold:name', text: 'Murphy' }),
      eyebrow: foldTarget({ key: 'fold:eyebrow', text: 'Android engineer · Indonesia' }),
      headline: foldTarget({ key: 'fold:headline', tag: 'h1' }),
      primaryCta: foldTarget({ key: 'fold:primary-cta', tag: 'a', rect: rect(20, 500, 155, 44) }),
      projectSignal: foldTarget({
        key: 'fold:project-signal',
        tag: 'figcaption',
        rect: rect(20, 700, 350, 46),
      }),
    },
    visibleTexts: ['Known text'],
    tabWalk: {
      forward: focusables,
      backward: [...focusables].reverse().slice(1),
      anchor: focusables.at(-1) ?? null,
    },
    ...overrides,
  };
}

describe('order group', () => {
  test('fails with the dedicated detail when HOME_SECTIONS is missing', () => {
    const result = evaluateOrder(snapshot(), null, APPROVED);

    expect(result.pass).toBe(false);
    expect(result.checks).toEqual([
      {
        name: 'order-home-sections',
        pass: false,
        expected: 'module present',
        actual: HOME_SECTIONS_MISSING,
      },
    ]);
  });

  test('passes an approved DOM order and bites added, removed and swapped sections', () => {
    const base = snapshot();
    expect(evaluateOrder(base, APPROVED, APPROVED).pass).toBe(true);

    const added = snapshot({
      sections: [...base.sections, section('extra', 1_250, 50, 'Extra')],
    });
    expect(evaluateOrder(added, APPROVED, APPROVED).pass).toBe(false);

    const removed = snapshot({
      sections: base.sections.filter((entry) => entry.id !== 'about'),
    });
    expect(evaluateOrder(removed, APPROVED, APPROVED).pass).toBe(false);

    const sections = [...base.sections];
    [sections[1], sections[2]] = [sections[2]!, sections[1]!];
    expect(evaluateOrder(snapshot({ sections }), APPROVED, APPROVED).pass).toBe(false);
  });

  test('fails when data and approval drift apart', () => {
    const result = evaluateOrder(snapshot(), APPROVED, [
      'nav',
      'hero',
      'about',
      'projects',
      'contact',
      'footer',
    ]);

    expect(result.pass).toBe(false);
    expect(result.checks.find((entry) => entry.name === 'order-approved-list')?.pass).toBe(false);
  });
});

describe('fold group', () => {
  test('passes when every requested element is visible above the fold', () => {
    expect(evaluateFold(snapshot()).pass).toBe(true);
  });

  test('fails a CTA at y=900', () => {
    const base = snapshot();
    const result = evaluateFold(
      snapshot({
        fold: {
          ...base.fold,
          primaryCta: foldTarget({
            key: 'fold:primary-cta',
            rect: rect(20, 900, 155, 44),
            fullyInsideViewport: false,
          }),
        },
      }),
    );

    expect(result.pass).toBe(false);
    expect(result.checks.find((entry) => entry.name === 'fold-primary-cta')?.pass).toBe(false);
  });
});

describe('responsive group', () => {
  test('passes separated 44 px controls and 16 px body text', () => {
    expect(evaluateResponsive(snapshot()).pass).toBe(true);
  });

  test('fails a 40 px target', () => {
    const result = evaluateResponsive(
      snapshot({ targets: [target({ rect: rect(200, 400, 40, 44) })] }),
    );

    expect(result.pass).toBe(false);
    expect(result.checks.find((entry) => entry.name === 'responsive-tap-targets')?.pass).toBe(
      false,
    );
  });

  test('fails a 14 px body element', () => {
    const result = evaluateResponsive(snapshot({ bodyTexts: [text({ fontSize: 14 })] }));

    expect(result.pass).toBe(false);
    expect(result.checks.find((entry) => entry.name === 'responsive-body-font-size')?.pass).toBe(
      false,
    );
  });

  test('fails overlapping text and control boxes in one section', () => {
    const result = evaluateResponsive(
      snapshot({
        measureTexts: [
          text({ key: 'measure:text', sectionId: 'projects', rect: rect(200, 400, 120, 24) }),
        ],
      }),
    );

    expect(result.pass).toBe(false);
    expect(result.checks.find((entry) => entry.name === 'responsive-no-text-overlap')?.pass).toBe(
      false,
    );
  });
});

describe('structure group', () => {
  test('passes a single outline, named hero, contact h2, landmarks and tab walk', () => {
    expect(evaluateStructure(snapshot(), APPROVED, 'Contact').pass).toBe(true);
  });

  test('fails two h1 elements', () => {
    const base = snapshot();
    const result = evaluateStructure(
      snapshot({ headings: [...base.headings, heading(1, 'Second', 'projects')] }),
      APPROVED,
      'Contact',
    );

    expect(result.pass).toBe(false);
    expect(result.checks.find((entry) => entry.name === 'structure-one-h1')?.pass).toBe(false);
  });

  test('fails an h2 to h4 jump', () => {
    const result = evaluateStructure(
      snapshot({
        headings: [
          heading(1, 'Every project, taken apart.', 'hero'),
          heading(4, 'Projects', 'projects'),
          heading(2, 'About', 'about'),
          heading(2, 'Contact', 'contact'),
        ],
      }),
      APPROVED,
      'Contact',
    );

    expect(result.pass).toBe(false);
    expect(result.checks.find((entry) => entry.name === 'structure-heading-levels')?.pass).toBe(
      false,
    );
  });

  test('fails a positive tabindex jump', () => {
    const base = snapshot();
    const result = evaluateStructure(
      snapshot({
        focusables: [
          focus('skip', -1, -96, 12),
          focus('nav:home', 0, 0, 8, { tabIndex: 2 }),
          focus('hero:primary', 1, 300, 20),
          focus('footer:top', 5, 1200, 20),
        ],
      }),
      APPROVED,
      'Contact',
    );

    expect(result.pass).toBe(false);
    expect(
      result.checks.find((entry) => entry.name === 'structure-no-positive-tabindex')?.pass,
    ).toBe(false);
    expect(base.focusables[1]?.tabIndex).toBe(0);
  });

  test('fails a right-column focus stop before a left-column stop in Tab order', () => {
    const focusables = [
      focus('skip', -1, -96, 12),
      focus('nav:home', 0, 0, 8),
      focus('hero:loop', 1, 100, 600, { gridColumnIndex: 1 }),
      focus('hero:primary', 1, 300, 20, { gridColumnIndex: 0 }),
      focus('footer:top', 5, 1200, 20),
    ];
    const result = evaluateStructure(
      snapshot({
        focusables,
        tabWalk: {
          forward: focusables,
          backward: [...focusables].reverse().slice(1),
          anchor: focusables.at(-1) ?? null,
        },
      }),
      APPROVED,
      'Contact',
    );

    expect(result.pass).toBe(false);
    expect(result.checks.find((entry) => entry.name === 'structure-focus-order')?.pass).toBe(false);
  });

  test('reads a left column before a right column even when the right stop is higher', () => {
    const focusables = [
      focus('skip', -1, -96, 12),
      focus('nav:home', 0, 0, 8),
      focus('hero:primary', 1, 300, 20, { gridColumnIndex: 0 }),
      focus('hero:loop', 1, 100, 600, { gridColumnIndex: 1 }),
      focus('footer:top', 5, 1200, 20),
    ];
    const result = evaluateStructure(
      snapshot({
        focusables,
        tabWalk: {
          forward: focusables,
          backward: [...focusables].reverse().slice(1),
          anchor: focusables.at(-1) ?? null,
        },
      }),
      APPROVED,
      'Contact',
    );

    expect(result.pass).toBe(true);
    expect(result.checks.find((entry) => entry.name === 'structure-focus-order')?.pass).toBe(true);
  });
});

describe('hero control slot', () => {
  test('requires a 44 x 44 slot and a running button inside it', () => {
    const passing = evaluateHeroControl(snapshot({ heroControl: heroControl() }), false);
    const small = evaluateHeroControl(
      snapshot({ heroControl: heroControl({ slot: rect(20, 700, 40, 40) }) }),
      false,
    );
    const misplaced = evaluateHeroControl(
      snapshot({ heroControl: heroControl({ buttonInSlot: false }) }),
      false,
    );

    expect(passing.pass).toBe(true);
    expect(small.pass).toBe(false);
    expect(misplaced.pass).toBe(false);
  });

  test('keeps the reserved slot while the poster path has no button', () => {
    const result = evaluateHeroControl(
      snapshot({
        heroControl: heroControl({
          loop: null,
          button: false,
          buttonInSlot: false,
          posterVisible: true,
        }),
      }),
      true,
    );

    expect(result.pass).toBe(true);
  });
});

describe('copy group', () => {
  test('runs every group by default', () => {
    expect(HOME_PROBE_DEFAULT_GROUPS).toEqual(HOME_PROBE_GROUPS);
    expect(HOME_PROBE_DEFAULT_GROUPS).toEqual(['order', 'fold', 'responsive', 'structure', 'copy']);
  });

  test('passes known strings and prints the UI allowlist', () => {
    const result = evaluateCopy(['Known text', ...HOME_PROBE_UI_ALLOWLIST], ['Known text']);

    expect(result.pass).toBe(true);
    expect(result.lines.at(-1)).toBe(`allowlist: ${HOME_PROBE_UI_ALLOWLIST.join(' | ')}`);
  });

  test('fails an unknown rendered string', () => {
    const result = evaluateCopy(['Known text', 'Hand-typed recruiter copy'], ['Known text']);

    expect(result.pass).toBe(false);
    expect(result.checks[0]?.actual).toEqual(['Hand-typed recruiter copy']);
  });

  test('accepts the annotation position counter', () => {
    const result = evaluateCopy(['Known text', '1/7'], ['Known text']);

    expect(result.pass).toBe(true);
  });

  test('accepts compositions built from project flow content', () => {
    const project = {
      flows: [{ id: 'flow', label: 'Flow label', path: ['one', 'two'] }],
      layers: [
        {
          components: [
            { id: 'one', name: 'First', summary: 'First summary' },
            { id: 'two', name: 'Second', summary: 'Second summary' },
          ],
        },
      ],
    };
    const compositions = heroNarrationCompositions(project);

    expect(compositions).toHaveLength(2);
    expect(evaluateCopy(compositions, compositions).pass).toBe(true);
  });

  test('exposes the annotation selector used for the hero project signal and body text', () => {
    expect(HOME_PROBE_PRIMARY_CTA_SELECTOR).toBe('[data-hero-primary-cta]');
    expect(HOME_PROBE_HERO_ANNOTATION_SELECTOR).toBe('[data-hero-annotation]');
  });
});
