import { describe, expect, test } from 'vitest';

import type { LayoutShiftObservation } from '../src/engine-probe.ts';
import {
  centroidExtremes,
  evaluateS7,
  neverCoversVerdict,
  pointInRect,
  s7ClsSummary,
  type S7Observation,
} from '../src/panel-probe.ts';

const POSITIONS = ['top', 'bottom', 'left', 'right'] as const;
const STATES = ['exploded', 'imploded'] as const;
const PALETTES = ['light', 'dark'] as const;
const ZOOMS = ['1', 'max-top', 'max-bottom'] as const;
const TRACE = [
  'beachgoer',
  'tide-chart-screen',
  'tide-view-model',
  'tide-repository',
  'live-tide-client',
  'tide-feed',
];

function shift(inViewer: boolean, value = 0.01): LayoutShiftObservation {
  return {
    value,
    startTime: 10,
    hadRecentInput: false,
    page: 'desktop',
    group: 's7-test',
    sources: [
      {
        node: {
          tag: 'section',
          dataAttributes: { 'data-xploder-ready': 'true' },
          parentTag: 'div',
          text: null,
          inOverlay: false,
          inViewer,
        },
        previousRect: { x: 0, y: 0, width: 10, height: 10 },
        currentRect: { x: 0, y: 0, width: 20, height: 10 },
      },
    ],
  };
}

function passingObservation(): S7Observation {
  const centroids = {
    north: { x: 50, y: 10 },
    south: { x: 50, y: 90 },
    west: { x: 10, y: 50 },
    east: { x: 90, y: 50 },
  };

  return {
    fixtures: [
      {
        fixture: 'a',
        desktop: { centroids, extremes: centroidExtremes(centroids) },
        mobile: { centroids, extremes: centroidExtremes(centroids) },
      },
    ],
    neverCovers: POSITIONS.flatMap((position) =>
      STATES.flatMap((state) =>
        PALETTES.flatMap((palette) =>
          ZOOMS.map((zoom) => ({
            position,
            state,
            palette,
            zoom,
            slabId: 'tide-repository',
            points: [
              { x: 0, y: 0 },
              { x: 5, y: 5 },
            ],
            surfaceRect: { left: 100, top: 100, right: 200, bottom: 200, width: 100, height: 100 },
            elementInside: [false, false],
          })),
        ),
      ),
    ),
    open: {
      mouse: {
        target: 'tide-repository',
        kind: 'detail',
        highlight: 'tide-repository',
        title: 'Tide Repository',
      },
      touch: {
        target: 'tide-chart-screen',
        kind: 'detail',
        highlight: 'tide-chart-screen',
        title: 'Tide Chart Screen',
      },
    },
    content: [
      {
        id: 'tide-repository',
        actual: {
          name: 'Tide Repository',
          paragraphs: ['Chooses between a live reading and the saved forecast.'],
          chipLabels: ['Kotlin', 'Kotlin Coroutines'],
          metrics: [{ label: 'Saved window', value: '30 days' }],
          links: [
            {
              label: 'Data notes',
              url: 'https://example.com/tidewatch/data-notes',
              target: '_blank',
              rel: 'noopener noreferrer',
            },
          ],
          headings: ['Tech', 'Metrics', 'Links'],
        },
        expected: {
          name: 'Tide Repository',
          summary: 'Chooses between a live reading and the saved forecast.',
          chipLabels: ['Kotlin', 'Kotlin Coroutines'],
          metrics: [{ label: 'Saved window', value: '30 days' }],
          links: [
            {
              label: 'Data notes',
              url: 'https://example.com/tidewatch/data-notes',
              target: '_blank',
              rel: 'noopener noreferrer',
            },
          ],
          headings: ['Tech', 'Metrics', 'Links'],
        },
      },
    ],
    closes: [
      'same-slab',
      'escape',
      'outside-blank',
      'outside-control',
      'close-control',
      'empty-canvas',
    ].map((route) => ({
      route: route as S7Observation['closes'][number]['route'],
      panelAfter: 'closed',
      focus:
        route === 'outside-control'
          ? { wrapper: false, control: 'fixture-a' }
          : { wrapper: true, control: null },
    })),
    arrowIsolation: { before: 45, after: 45, closeFocused: true },
    caseStudies: [
      {
        fixture: 'a',
        heading: 'Tidewatch',
        headings: ['Problem', 'Approach', 'Outcome', 'Metrics'],
        metrics: [{ label: 'Saved forecast', value: '30 days' }],
        expected: {
          heading: 'Tidewatch',
          headings: ['Problem', 'Approach', 'Outcome', 'Metrics'],
          metrics: [{ label: 'Saved forecast', value: '30 days' }],
        },
      },
    ],
    caseStudyScroll: {
      scrollHeight: 900,
      clientHeight: 354,
      scrollTopBefore: 0,
      scrollTopAfter: 400,
      windowYBefore: 0,
      windowYAfter: 0,
    },
    caseStudyCloses: ['close-control', 'escape', 'toggle', 'canvas-tap'].map((route) => ({
      route: route as S7Observation['caseStudyCloses'][number]['route'],
      panelAfter: 'closed',
      focus: { wrapper: false, opener: true },
    })),
    caseStudyPalettes: {
      light: {
        background: { r: 252, g: 250, b: 244 },
        text: { r: 34, g: 38, b: 43 },
        expectedBackground: { r: 252, g: 250, b: 244 },
        expectedText: { r: 34, g: 38, b: 43 },
      },
      dark: {
        background: { r: 17, g: 37, b: 64 },
        text: { r: 230, g: 237, b: 245 },
        expectedBackground: { r: 17, g: 37, b: 64 },
        expectedText: { r: 230, g: 237, b: 245 },
      },
    },
    chips: {
      samples: [
        {
          id: 'live-tide-client',
          labels: ['Kotlin', 'OkHttp', 'WebSocket'],
          expectedLabels: ['Kotlin', 'OkHttp', 'WebSocket'],
        },
      ],
      swatches: {
        light: [
          {
            chipId: 'kotlin',
            category: 'language',
            actual: { r: 31, g: 95, b: 173 },
            expected: { r: 31, g: 95, b: 173 },
          },
        ],
        dark: [
          {
            chipId: 'kotlin',
            category: 'language',
            actual: { r: 127, g: 178, b: 240 },
            expected: { r: 127, g: 178, b: 240 },
          },
        ],
      },
      chipCount: 3,
      focusable: 0,
      linkRoles: 0,
    },
    tour: {
      jumpPlaying: {
        before: {
          step: 2,
          status: 'playing',
          captionText: '',
          trace: TRACE.slice(0, 3),
          panel: 'closed',
          panelTitle: null,
        },
        after: {
          step: 3,
          status: 'playing',
          captionText: 'Live update · Step 4 of 6 Tide Repository',
          trace: TRACE.slice(0, 4),
          panel: 'closed',
          panelTitle: null,
        },
        beat: {
          step: 4,
          status: 'playing',
          captionText: 'Live update · Step 5 of 6 Live Tide Client',
          trace: TRACE.slice(0, 5),
          panel: 'closed',
          panelTitle: null,
        },
      },
      jumpPaused: {
        before: {
          step: 1,
          status: 'paused',
          captionText: '',
          trace: TRACE.slice(0, 2),
          panel: 'closed',
          panelTitle: null,
        },
        after: {
          step: 4,
          status: 'paused',
          captionText: 'Live update · Step 5 of 6 Live Tide Client',
          trace: TRACE.slice(0, 5),
          panel: 'closed',
          panelTitle: null,
        },
      },
      notInflow: {
        before: {
          step: 1,
          status: 'playing',
          captionText: '',
          trace: TRACE.slice(0, 2),
          panel: 'closed',
          panelTitle: null,
        },
        stepAtClick: 1,
        after: {
          step: 1,
          status: 'paused',
          captionText: 'Live update · Step 2 of 6 Forecast Details Panel',
          trace: TRACE.slice(0, 2),
          panel: 'detail',
          panelTitle: 'Forecast Details Panel',
        },
      },
      resumeSameStep: {
        paused: {
          step: 1,
          status: 'paused',
          captionText: '',
          trace: TRACE.slice(0, 2),
          panel: 'detail',
          panelTitle: 'Forecast Details Panel',
        },
        afterPlay: {
          step: 1,
          status: 'playing',
          captionText: '',
          trace: TRACE.slice(0, 2),
          panel: 'closed',
          panelTitle: null,
        },
      },
      escapeLayering: {
        afterFirst: {
          step: 1,
          status: 'paused',
          captionText: '',
          trace: TRACE.slice(0, 2),
          panel: 'closed',
          panelTitle: null,
        },
        afterSecond: {
          step: -1,
          status: 'idle',
          captionText: '',
          trace: [],
          panel: 'closed',
          panelTitle: null,
        },
      },
      jumpStableCaption: { frames: 20, framesWithoutCaption: 0 },
    },
    cls: { total: 0, entries: [] },
    stageSamples: [
      {
        label: 'open',
        before: {
          rect: { left: 0, top: 0, right: 1280, bottom: 480, width: 1280, height: 480 },
          scrollHeight: 480,
        },
        after: {
          rect: { left: 0, top: 0, right: 1280, bottom: 480, width: 1280, height: 480 },
          scrollHeight: 480,
        },
      },
    ],
    hiddenWhileMoving: {
      frames: [
        { hidden: false, inside: false, phase: 'before' },
        { hidden: true, inside: false, phase: 'moving' },
      ],
      settled: { surfaceFound: true, hidden: false, pointCount: 4, pointsInside: 0 },
    },
    reducedMotion: { surfaceFound: true, animations: 0, opacity: 1 },
    drawCalls: { panel: 2, tour: 2 },
    maxZoom: {
      zoom: 3,
      top: { id: 'tide-chart-screen', hovered: true, outside: true },
      bottom: { id: 'tide-feed', hovered: true, outside: true },
    },
  };
}

describe('S7 evaluators', () => {
  test('checks point containment including rect edges', () => {
    const rect = { left: 0, top: 0, right: 10, bottom: 10, width: 10, height: 10 };
    expect(pointInRect({ x: 0, y: 0 }, rect)).toBe(true);
    expect(pointInRect({ x: 10, y: 10 }, rect)).toBe(true);
    expect(pointInRect({ x: 11, y: 5 }, rect)).toBe(false);
    expect(pointInRect({ x: 5, y: -1 }, rect)).toBe(false);
  });

  test('finds the top, bottom, left and right centroids', () => {
    expect(
      centroidExtremes({
        north: { x: 50, y: 10 },
        south: { x: 50, y: 90 },
        west: { x: 10, y: 50 },
        east: { x: 90, y: 50 },
      }),
    ).toEqual({ top: 'north', bottom: 'south', left: 'west', right: 'east' });
  });

  test('fails the never-covers verdict when a hit point overlaps the surface', () => {
    const verdict = neverCoversVerdict({
      position: 'left',
      state: 'exploded',
      palette: 'light',
      zoom: '1',
      slabId: 'tide-repository',
      points: [
        { x: 150, y: 150 },
        { x: 300, y: 300 },
      ],
      surfaceRect: { left: 100, top: 100, right: 200, bottom: 200, width: 100, height: 100 },
      elementInside: [true, false],
    });

    expect(verdict.pass).toBe(false);
    expect(verdict.rectOutsideCount).toBe(1);
    expect(verdict.elementOutsideCount).toBe(1);
  });

  test('attributes layout shifts inside and outside the wrapper', () => {
    const inside = shift(true, 0.02);
    const outside = shift(false, 0.03);
    const summary = s7ClsSummary([inside, outside]);

    expect(summary.pageTotal).toBeCloseTo(0.05);
    expect(summary.inside).toEqual([inside]);
    expect(summary.outside).toEqual([outside]);
  });

  test('passes the complete synthetic observation', () => {
    const result = evaluateS7(passingObservation());

    expect(result.filter((check) => !check.pass)).toEqual([]);
    expect(result.some((check) => check.name === 'panel-never-covers-left-exploded-light-1')).toBe(
      true,
    );
    expect(result.filter((check) => check.name.startsWith('panel-never-covers-'))).toHaveLength(48);
  });

  test('fails specifically when a hit point overlaps the panel', () => {
    const observation = passingObservation();
    const sample = observation.neverCovers[0];
    if (sample === undefined) throw new Error('sample is missing');
    sample.points.splice(0, sample.points.length, { x: 150, y: 150 });
    sample.elementInside.splice(0, sample.elementInside.length, true);

    const checks = evaluateS7(observation);
    const failed = checks.filter((check) => !check.pass);

    expect(failed.map((check) => check.name)).toEqual(['panel-never-covers-top-exploded-light-1']);
  });

  test('allows wrapper focus when a canvas tap closes the case study', () => {
    const observation = passingObservation();
    const index = observation.caseStudyCloses.findIndex(
      (candidate) => candidate.route === 'canvas-tap',
    );
    const sample = observation.caseStudyCloses[index];
    if (sample === undefined) throw new Error('canvas-tap close is missing');
    observation.caseStudyCloses[index] = {
      ...sample,
      focus: { wrapper: true, opener: false },
    };

    const checks = evaluateS7(observation);
    const close = checks.find((check) => check.name === 'case-study-close-canvas-tap');

    expect(close?.pass).toBe(true);
  });

  test('fails panel-cls-strict when a layout shift entry is inside the viewer', () => {
    const observation = passingObservation();
    observation.cls.entries.push(shift(true));

    const checks = evaluateS7(observation);
    const cls = checks.find((check) => check.name === 'panel-cls-strict');

    expect(cls?.pass).toBe(false);
  });

  test('fails panel-stage-invariant when the stage reflows', () => {
    const observation = passingObservation();
    const sample = observation.stageSamples[0] as unknown as
      { after: { rect: { height: number } } } | undefined;
    if (sample === undefined) throw new Error('stage sample is missing');
    sample.after.rect.height += 1;

    const checks = evaluateS7(observation);
    const stage = checks.find((check) => check.name === 'panel-stage-invariant');

    expect(stage?.pass).toBe(false);
  });
});
