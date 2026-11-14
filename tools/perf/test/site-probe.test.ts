import { describe, expect, test } from 'vitest';

import { evaluateTabWalk, type FocusStep } from '../src/a11y-probe.ts';
import { PROJECT_SOURCES, projectPath } from '../src/project-sources.ts';
import {
  cardOrderMatches,
  clsRoutes,
  evaluateCardChips,
  evaluateCls,
  evaluateDrawFrames,
  evaluateFallbackHtml,
  evaluateHeroEagerNoInteraction,
  evaluateHeroLoopRunning,
  evaluateHorizontalScroll,
  expectedTeardownCounts,
  heroContainsPoster,
  heroSettledFromSnapshot,
  outlineCountsFromHtml,
  parseHeroLiveMode,
  parseRegistryLabels,
  sameMarkBoxes,
  SITE_PROBE_CI_GROUPS,
  SITE_PROBE_GROUPS,
  teardownCountsMatch,
  tourTimeoutMs,
  type ClsEntry,
  type ClsSource,
} from '../src/site-probe.ts';

function source(text: string): ClsSource {
  return {
    node: {
      tag: 'div',
      dataAttributes: {},
      parentTag: 'section',
      text,
    },
    previousRect: { x: 10, y: 10, width: 44, height: 44 },
    currentRect: { x: 10, y: 7, width: 44, height: 44 },
  };
}

function shift(value: number, sources: ClsSource[] = []): ClsEntry {
  return { value, startTime: 100, hadRecentInput: false, sources };
}

describe('evaluateCls', () => {
  test('passes recorded entries whose total is zero', () => {
    const verdict = evaluateCls([shift(0)]);

    expect(verdict).toEqual({ total: 0, pass: true, sources: [] });
  });

  test('fails any positive total and reports its sources', () => {
    const moved = source('Theme toggle');
    const verdict = evaluateCls([shift(0.000637, [moved])]);

    expect(verdict.pass).toBe(false);
    expect(verdict.total).toBeCloseTo(0.000637, 12);
    expect(verdict.sources).toEqual([moved]);
  });

  test('counts shifts with recent input', () => {
    const verdict = evaluateCls([{ ...shift(0.000043), hadRecentInput: true }]);

    expect(verdict.pass).toBe(false);
    expect(verdict.total).toBeCloseTo(0.000043, 12);
  });
});

function tab(key: string): FocusStep {
  return { key, role: 'link', name: key, panel: '' };
}

describe('evaluateTabWalk', () => {
  const forward = [
    tab('skip'),
    tab('nav:home'),
    tab('nav:projects'),
    tab('nav:about'),
    tab('nav:contact'),
    tab('nav:github'),
    tab('nav:linkedin'),
    tab('nav:theme'),
    tab('hero:primary'),
    tab('hero:pause'),
    tab('card:websocket-inspector'),
    tab('contact:email'),
    tab('contact:github'),
    tab('contact:linkedin'),
    tab('footer:home'),
    tab('footer:top'),
  ];

  test('accepts a complete forward walk whose Shift+Tab walk reverses it', () => {
    const backward = [...forward].reverse().slice(1);
    const verdict = evaluateTabWalk(
      forward,
      backward,
      forward.map((step) => step.key),
    );

    expect(verdict.pass).toBe(true);
    expect(verdict.reachedLast).toBe(true);
    expect(verdict.trap).toBe(false);
    expect(verdict.forwardMatches).toBe(true);
    expect(verdict.backwardMatches).toBe(true);
  });

  test('reports a focus cycle that repeats before the last target', () => {
    const expected = ['skip', 'nav:home', 'nav:projects', 'footer:top'];
    const recorded = [tab('skip'), tab('nav:home'), tab('nav:home'), tab('nav:projects')];
    const verdict = evaluateTabWalk(recorded, [], expected);

    expect(verdict.pass).toBe(false);
    expect(verdict.trap).toBe(true);
    expect(verdict.repeated).toBe('nav:home');
  });
});

describe('evaluateDrawFrames', () => {
  test('takes the mode over rendered frames and ignores idle zero-draw frames', () => {
    const frames = [
      ...Array.from({ length: 30 }, () => ({ draws: 2 })),
      ...Array.from({ length: 6 }, () => ({ draws: 0 })),
    ];
    const verdict = evaluateDrawFrames(frames);

    expect(verdict.pass).toBe(true);
    expect(verdict.mode).toBe(2);
    expect(verdict.renderedFrames).toBe(30);
    expect(verdict.totalFrames).toBe(36);
    expect(verdict.counts).toEqual({ '2': 30 });
  });

  test('fails when fewer than 30 frames rendered', () => {
    const verdict = evaluateDrawFrames(Array.from({ length: 29 }, () => ({ draws: 2 })));

    expect(verdict.pass).toBe(false);
    expect(verdict.renderedFrames).toBe(29);
  });

  test('fails when the rendered-frame mode is not two', () => {
    const verdict = evaluateDrawFrames([
      ...Array.from({ length: 30 }, () => ({ draws: 3 })),
      ...Array.from({ length: 4 }, () => ({ draws: 2 })),
    ]);

    expect(verdict.pass).toBe(false);
    expect(verdict.mode).toBe(3);
  });
});

describe('HTML fallback assertions', () => {
  const poster = '<svg data-site-poster="" viewBox="0 0 1 1"></svg>';
  const cards =
    '<article data-site-card="websocket-inspector"><a href="/project">Open</a></article>';
  const outline = '<section data-site-outline=""><h2>Architecture</h2></section>';

  test('finds the poster and card list in home HTML bytes', () => {
    const verdict = evaluateFallbackHtml(
      `<section data-site-hero="">${poster}</section>${cards}`,
      'cards',
    );

    expect(verdict).toEqual({ pass: true, poster: true, list: true, listKind: 'cards' });
  });

  test('finds the poster and outline in project HTML bytes', () => {
    const verdict = evaluateFallbackHtml(`<main>${poster}${outline}</main>`, 'outline');

    expect(verdict).toEqual({ pass: true, poster: true, list: true, listKind: 'outline' });
  });

  test('rejects a missing poster or the wrong list kind', () => {
    expect(evaluateFallbackHtml(outline, 'outline')).toEqual({
      pass: false,
      poster: false,
      list: true,
      listKind: 'outline',
    });
    expect(evaluateFallbackHtml(poster, 'cards').pass).toBe(false);
  });

  test('requires the poster to be inside the hero section', () => {
    expect(heroContainsPoster(`<section data-site-hero="">${poster}</section>`)).toBe(true);
    expect(heroContainsPoster(`<section data-site-hero=""></section>${poster}`)).toBe(false);
  });
});

describe('cards helpers', () => {
  test('parses quoted registry labels from source text', () => {
    const sourceText = `
      { id: 'kotlin', label: 'Kotlin', category: 'language' },
      { id: 'nodejs', label: "Node.js", category: 'platform' },
    `;

    expect(parseRegistryLabels(sourceText)).toEqual(['Kotlin', 'Node.js']);
  });

  test('ignores an unquoted label-shaped value', () => {
    const sourceText = "label: Kotlin\n{ id: 'room', label: 'Room' }";

    expect(parseRegistryLabels(sourceText)).toEqual(['Room']);
  });

  test('matches card order exactly', () => {
    expect(
      cardOrderMatches(
        ['websocket-inspector', 'jev-toolkit'],
        ['websocket-inspector', 'jev-toolkit'],
      ),
    ).toBe(true);
  });

  test('rejects swapped card order', () => {
    expect(
      cardOrderMatches(
        ['jev-toolkit', 'websocket-inspector'],
        ['websocket-inspector', 'jev-toolkit'],
      ),
    ).toBe(false);
  });

  test('passes one to four chips whose labels are in the registry', () => {
    expect(evaluateCardChips(['Kotlin', 'Room'], ['Kotlin', 'Room', 'Node.js'])).toEqual({
      pass: true,
      count: 2,
      unknown: [],
    });
  });

  test('rejects five chips and a label outside the registry', () => {
    expect(
      evaluateCardChips(['Kotlin', 'Room', 'Node.js', 'Android', 'WebSocket'], ['Kotlin']),
    ).toEqual({
      pass: false,
      count: 5,
      unknown: ['Room', 'Node.js', 'Android', 'WebSocket'],
    });
  });

  test('passes a document that does not overflow horizontally', () => {
    expect(evaluateHorizontalScroll(390, 390)).toEqual({
      pass: true,
      scrollWidth: 390,
      clientWidth: 390,
    });
  });

  test('rejects a document wider than its client width', () => {
    expect(evaluateHorizontalScroll(391, 390).pass).toBe(false);
  });

  test('registers cards in the full and CI group lists', () => {
    expect(SITE_PROBE_GROUPS).toContain('cards');
    expect(SITE_PROBE_CI_GROUPS).toContain('cards');
  });
});

describe('hero live mode', () => {
  test('recognizes the compile-time eager and gated modes', () => {
    expect(parseHeroLiveMode('eager')).toBe('eager');
    expect(parseHeroLiveMode('gated')).toBe('gated');
  });

  test('rejects a missing or unknown mode attribute', () => {
    expect(parseHeroLiveMode(null)).toBeNull();
    expect(parseHeroLiveMode(undefined)).toBeNull();
    expect(parseHeroLiveMode('other')).toBeNull();
  });

  test('requires reveal, exactly one canvas, and the ready marker without input', () => {
    expect(
      evaluateHeroEagerNoInteraction({ liveState: 'revealed', canvases: 1, ready: true }),
    ).toBe(true);
    expect(evaluateHeroEagerNoInteraction({ liveState: 'idle', canvases: 0, ready: false })).toBe(
      false,
    );
    expect(
      evaluateHeroEagerNoInteraction({ liveState: 'revealed', canvases: 2, ready: true }),
    ).toBe(false);
    expect(
      evaluateHeroEagerNoInteraction({ liveState: 'revealed', canvases: 1, ready: false }),
    ).toBe(false);
  });

  test('requires a running loop, exactly one canvas, and a valid tour state', () => {
    expect(evaluateHeroLoopRunning({ heroLoop: 'running', canvases: 1, tour: 'idle' })).toBe(true);
    expect(evaluateHeroLoopRunning({ heroLoop: 'running', canvases: 1, tour: null })).toBe(true);
    expect(evaluateHeroLoopRunning({ heroLoop: 'paused', canvases: 1, tour: 'idle' })).toBe(false);
    expect(evaluateHeroLoopRunning({ heroLoop: 'running', canvases: 2, tour: 'idle' })).toBe(false);
    expect(evaluateHeroLoopRunning({ heroLoop: 'running', canvases: 1, tour: 'playing' })).toBe(
      true,
    );
    expect(evaluateHeroLoopRunning({ heroLoop: 'running', canvases: 1, tour: 'paused' })).toBe(
      true,
    );
    expect(evaluateHeroLoopRunning({ heroLoop: 'running', canvases: 1, tour: 'ended' })).toBe(true);
    expect(evaluateHeroLoopRunning({ heroLoop: 'running', canvases: 1, tour: 'unknown' })).toBe(
      false,
    );
  });
});

describe('heroSettledFromSnapshot', () => {
  test('settles a route without the live hero', () => {
    expect(
      heroSettledFromSnapshot({
        liveMode: null,
        liveState: null,
        loopButton: false,
        loopAttr: false,
      }),
    ).toBe(true);
  });

  test('settles eager and gated heroes once revealed with the loop mounted', () => {
    for (const liveMode of ['eager', 'gated']) {
      expect(
        heroSettledFromSnapshot({
          liveMode,
          liveState: 'revealed',
          loopButton: true,
          loopAttr: true,
        }),
      ).toBe(true);
    }
  });

  test('settles skipped and gated-idle heroes immediately', () => {
    for (const liveMode of ['eager', 'gated']) {
      expect(
        heroSettledFromSnapshot({
          liveMode,
          liveState: 'skipped',
          loopButton: false,
          loopAttr: false,
        }),
      ).toBe(true);
    }
    expect(
      heroSettledFromSnapshot({
        liveMode: 'gated',
        liveState: 'idle',
        loopButton: false,
        loopAttr: false,
      }),
    ).toBe(true);
  });

  test('does not settle a revealed hero without both loop markers', () => {
    expect(
      heroSettledFromSnapshot({
        liveMode: 'eager',
        liveState: 'revealed',
        loopButton: false,
        loopAttr: true,
      }),
    ).toBe(false);
    expect(
      heroSettledFromSnapshot({
        liveMode: 'eager',
        liveState: 'revealed',
        loopButton: true,
        loopAttr: false,
      }),
    ).toBe(false);
  });

  test('does not settle loading or eager-idle heroes', () => {
    expect(
      heroSettledFromSnapshot({
        liveMode: 'eager',
        liveState: 'loading',
        loopButton: false,
        loopAttr: false,
      }),
    ).toBe(false);
    expect(
      heroSettledFromSnapshot({
        liveMode: 'eager',
        liveState: 'idle',
        loopButton: false,
        loopAttr: false,
      }),
    ).toBe(false);
  });
});

describe('sameMarkBoxes', () => {
  const box = { x: 10, y: 20, width: 18, height: 18 };

  test('accepts four identical boxes', () => {
    expect(
      sameMarkBoxes([box, box, box, box], [{ ...box }, { ...box }, { ...box }, { ...box }]),
    ).toBe(true);
  });

  test('rejects a box that moved by half a pixel', () => {
    expect(sameMarkBoxes([box], [{ ...box, x: box.x + 0.5 }])).toBe(false);
    expect(sameMarkBoxes([box], [{ ...box, y: box.y - 0.5 }])).toBe(false);
  });

  test('rejects a different mark count', () => {
    expect(sameMarkBoxes([box, box], [box])).toBe(false);
  });
});

describe('clsRoutes', () => {
  test('includes home, the project index, and every project source once', () => {
    const routes = clsRoutes(new URL('http://127.0.0.1:4173'));

    expect(routes.map((route) => route.path)).toEqual([
      '/',
      '/projects',
      ...PROJECT_SOURCES.map((source) => projectPath(source)),
    ]);
    expect(routes.every((route) => route.base === 'site')).toBe(true);
  });
});

describe('teardown helpers', () => {
  test('counts outline layers and component items by structure', () => {
    const html = `
      <section data-site-outline>
        <h2>Example</h2>
        <section><h3>Metrics</h3><dl><div><dt>One</dt></div></dl></section>
        <div>
          <section><h3>Layer one</h3><ul><li>Part A</li><li>Part B</li></ul></section>
          <section><h3>Layer two</h3><ul><li>Part C</li></ul></section>
        </div>
        <ol><li>Flow one</li><li>Flow two</li></ol>
      </section>
    `;

    expect(outlineCountsFromHtml(html)).toEqual({
      present: true,
      layers: 2,
      components: 3,
      flows: 2,
    });
  });

  test('reports a missing outline as absent instead of counting unrelated lists', () => {
    expect(outlineCountsFromHtml('<ul><li>Part</li></ul><ol><li>Flow</li></ol>')).toEqual({
      present: false,
      layers: 0,
      components: 0,
      flows: 0,
    });
  });

  test('computes expected counts from a source module', () => {
    const source = {
      layers: [{ components: [{ id: 'a' }, { id: 'b' }] }, { components: [{ id: 'c' }] }],
      flows: [{ id: 'one' }, { id: 'two' }],
    };

    expect(expectedTeardownCounts(source)).toEqual({ layers: 2, components: 3, flows: 2 });
  });

  test('rejects a count mismatch for the source-derived expectation', () => {
    const expected = expectedTeardownCounts({
      layers: [{ components: [{ id: 'a' }] }],
      flows: [{ id: 'one' }],
    });

    expect(teardownCountsMatch({ layers: 1, components: 1, flows: 0 }, expected)).toBe(false);
  });

  test('scales the tour timeout at four seconds per path step plus fifteen seconds', () => {
    expect(tourTimeoutMs(0)).toBe(15_000);
    expect(tourTimeoutMs(8)).toBe(47_000);
  });

  test('rejects a negative path length', () => {
    expect(() => tourTimeoutMs(-1)).toThrow(RangeError);
  });
});
