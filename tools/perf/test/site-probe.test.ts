import { describe, expect, test } from 'vitest';

import { evaluateTabWalk, type FocusStep } from '../src/a11y-probe.ts';
import { PROJECT_SOURCES, projectPath } from '../src/project-sources.ts';
import {
  clsRoutes,
  evaluateCls,
  evaluateDrawFrames,
  evaluateFallbackHtml,
  evaluateHeroEagerNoInteraction,
  evaluateHeroLoopRunning,
  heroContainsPoster,
  parseHeroLiveMode,
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
