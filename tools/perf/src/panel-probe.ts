import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import type { Page } from 'playwright';

import type {
  ClsObservation,
  EngineProbeCheck,
  LayoutShiftObservation,
  PixelObservation,
  PointObservation,
} from './engine-probe.ts';

export type S7Position = 'top' | 'bottom' | 'left' | 'right';
export type S7State = 'exploded' | 'imploded';
export type S7Palette = 'light' | 'dark';
export type S7Zoom = '1' | 'max-top' | 'max-bottom';
export type S7CloseRoute =
  'same-slab' | 'escape' | 'outside-blank' | 'outside-control' | 'close-control' | 'empty-canvas';
export type S7CaseStudyCloseRoute = 'close-control' | 'escape' | 'toggle' | 'canvas-tap';
export type S7FixtureId = 'a' | 'b' | 'c';

export interface S7Rect {
  readonly left: number;
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
  readonly width: number;
  readonly height: number;
}

export interface S7StageMetrics {
  readonly rect: S7Rect;
  readonly scrollHeight: number;
}

export interface S7StageSample {
  readonly label: string;
  readonly before: S7StageMetrics;
  readonly after: S7StageMetrics;
}

export interface S7Extremes {
  readonly top: string | null;
  readonly bottom: string | null;
  readonly left: string | null;
  readonly right: string | null;
}

export interface S7HitSweep {
  readonly centroids: Record<string, PointObservation>;
  readonly extremes: S7Extremes;
}

export interface S7FixtureObservation {
  readonly fixture: S7FixtureId;
  readonly desktop: S7HitSweep;
  readonly mobile: S7HitSweep;
}

export interface S7NeverCoversSample {
  readonly position: S7Position;
  readonly state: S7State;
  readonly palette: S7Palette;
  readonly zoom: S7Zoom;
  readonly slabId: string;
  readonly points: PointObservation[];
  readonly surfaceRect: S7Rect | null;
  readonly elementInside: boolean[];
}

export interface S7OpenSample {
  readonly target: string;
  readonly kind: string;
  readonly highlight: string | null;
  readonly title: string | null;
}

export interface S7Metric {
  readonly label: string;
  readonly value: string;
}

export interface S7Link {
  readonly label: string;
  readonly url: string;
  readonly target: string | null;
  readonly rel: string | null;
}

export interface S7ContentActual {
  readonly name: string;
  readonly paragraphs: string[];
  readonly chipLabels: string[];
  readonly metrics: S7Metric[];
  readonly links: S7Link[];
  readonly headings: string[];
}

export interface S7ContentExpected {
  readonly name: string;
  readonly summary: string | null;
  readonly chipLabels: string[];
  readonly metrics: S7Metric[];
  readonly links: S7Link[];
  readonly headings: string[];
}

export interface S7ContentSample {
  readonly id: string;
  readonly actual: S7ContentActual;
  readonly expected: S7ContentExpected;
}

export interface S7CloseFocus {
  readonly wrapper: boolean;
  readonly control: string | null;
}

export interface S7CloseSample {
  readonly route: S7CloseRoute;
  readonly panelAfter: string;
  readonly focus: S7CloseFocus;
}

export interface S7ArrowIsolationObservation {
  readonly before: number;
  readonly after: number;
  readonly closeFocused: boolean;
}

export interface S7CaseStudySample {
  readonly fixture: S7FixtureId;
  readonly heading: string;
  readonly headings: string[];
  readonly metrics: S7Metric[];
  readonly expected: {
    readonly heading: string;
    readonly headings: string[];
    readonly metrics: S7Metric[];
  };
}

export interface S7CaseStudyScrollObservation {
  readonly scrollHeight: number;
  readonly clientHeight: number;
  readonly scrollTopBefore: number;
  readonly scrollTopAfter: number;
  readonly windowYBefore: number;
  readonly windowYAfter: number;
}

export interface S7CaseStudyCloseSample {
  readonly route: S7CaseStudyCloseRoute;
  readonly panelAfter: string;
  readonly focus: {
    readonly wrapper: boolean;
    readonly opener: boolean;
  };
}

export interface S7PaletteSample {
  readonly background: PixelObservation;
  readonly text: PixelObservation;
  readonly expectedBackground: PixelObservation;
  readonly expectedText: PixelObservation;
}

export interface S7ChipLabelSample {
  readonly id: string;
  readonly labels: string[];
  readonly expectedLabels: string[];
}

export interface S7SwatchSample {
  readonly chipId: string;
  readonly category: string;
  readonly actual: PixelObservation;
  readonly expected: PixelObservation;
}

export interface S7ChipsObservation {
  readonly samples: S7ChipLabelSample[];
  readonly swatches: {
    readonly light: S7SwatchSample[];
    readonly dark: S7SwatchSample[];
  };
  readonly chipCount: number;
  readonly focusable: number;
  readonly linkRoles: number;
}

export interface S7TourState {
  readonly step: number;
  readonly status: string;
  readonly captionText: string;
  readonly trace: string[];
  readonly panel: string;
  readonly panelTitle: string | null;
}

export interface S7TourObservation {
  readonly jumpPlaying: {
    readonly before: S7TourState;
    readonly after: S7TourState;
    readonly beat: S7TourState;
  };
  readonly jumpPaused: {
    readonly before: S7TourState;
    readonly after: S7TourState;
  };
  readonly notInflow: {
    readonly before: S7TourState;
    readonly stepAtClick: number;
    readonly after: S7TourState;
  };
  readonly resumeSameStep: {
    readonly paused: S7TourState;
    readonly afterPlay: S7TourState;
  };
  readonly escapeLayering: {
    readonly afterFirst: S7TourState;
    readonly afterSecond: S7TourState;
  };
  readonly jumpStableCaption: {
    readonly frames: number;
    readonly framesWithoutCaption: number;
  };
}

export interface S7HiddenFrame {
  readonly hidden: boolean;
  readonly inside: boolean;
  readonly phase: 'before' | 'moving' | 'settled';
}

export interface S7HiddenWhileMovingObservation {
  readonly frames: S7HiddenFrame[];
  readonly settled: {
    readonly surfaceFound: boolean;
    readonly hidden: boolean;
    readonly pointCount: number;
    readonly pointsInside: number;
  };
}

export interface S7ReducedMotionObservation {
  readonly surfaceFound: boolean;
  readonly animations: number;
  readonly opacity: number;
}

export interface S7DrawCallsObservation {
  readonly panel: number;
  readonly tour: number;
}

export interface S7MaxZoomObservation {
  readonly zoom: number;
  readonly top: {
    readonly id: string;
    readonly hovered: boolean;
    readonly outside: boolean;
  } | null;
  readonly bottom: {
    readonly id: string;
    readonly hovered: boolean;
    readonly outside: boolean;
  } | null;
}

export interface S7Observation {
  readonly fixtures: S7FixtureObservation[];
  readonly neverCovers: S7NeverCoversSample[];
  readonly open: {
    readonly mouse: S7OpenSample;
    readonly touch: S7OpenSample;
  };
  readonly content: S7ContentSample[];
  readonly closes: S7CloseSample[];
  readonly arrowIsolation: S7ArrowIsolationObservation;
  readonly caseStudies: S7CaseStudySample[];
  readonly caseStudyScroll: S7CaseStudyScrollObservation;
  readonly caseStudyCloses: S7CaseStudyCloseSample[];
  readonly caseStudyPalettes: {
    readonly light: S7PaletteSample;
    readonly dark: S7PaletteSample;
  };
  readonly chips: S7ChipsObservation;
  readonly tour: S7TourObservation;
  readonly cls: ClsObservation;
  readonly stageSamples: S7StageSample[];
  readonly hiddenWhileMoving: S7HiddenWhileMovingObservation;
  readonly reducedMotion: S7ReducedMotionObservation;
  readonly drawCalls: S7DrawCallsObservation;
  readonly maxZoom: S7MaxZoomObservation;
}

export interface S7FixtureComponent {
  readonly id: string;
  readonly name?: string;
  readonly summary?: string;
  readonly techs?: readonly string[];
  readonly metrics?: readonly S7Metric[];
  readonly links?: readonly { readonly label: string; readonly url: string }[];
}

export interface S7FixtureProject {
  readonly meta: { readonly slug: string; readonly name?: string };
  readonly story?: {
    readonly problem?: string;
    readonly approach?: string;
    readonly outcome?: string;
    readonly metrics?: readonly S7Metric[];
  };
  readonly layers: readonly {
    readonly components: readonly S7FixtureComponent[];
  }[];
}

export interface S7Registry {
  readonly techs: readonly {
    readonly id: string;
    readonly label: string;
    readonly category: string;
  }[];
}

export interface S7FixtureData {
  readonly a: S7FixtureProject;
  readonly b: S7FixtureProject;
  readonly c: S7FixtureProject;
  readonly registry: S7Registry;
}

export interface S7CaptureDeps {
  readonly desktop: Page;
  readonly mobile: Page;
  readonly reduced: Page;
  readonly base: URL;
  readonly outDir: string;
  readonly fixtures: S7FixtureData;
  readonly setClsGroup: (page: Page, group: string) => void;
  readonly finishClsGroup: (page: Page) => Promise<void>;
  readonly collectCls: (pages: readonly Page[]) => ClsObservation;
}

export interface S7HitSweepResult {
  readonly stageRect: S7Rect;
  readonly points: Record<string, PointObservation[]>;
  readonly empty: PointObservation[];
}

const WAIT_TIMEOUT_MS = 15_000;
const VIEWER_SELECTOR = '[data-xploder-ready="true"]';
const STAGE_SELECTOR = '[data-xploder-stage]';
const PANEL_SURFACE_SELECTOR = '[data-xploder-panel-surface]';
const PANEL_LAYER_SELECTOR = '[data-xploder-panel-layer]';
const PANEL_CLOSE_SELECTOR = '[data-xploder-panel-close]';
const CAPTION_SELECTOR = '[data-xploder-caption]';
const DESKTOP_GRID = { cols: 40, rows: 24 } as const;
const MOBILE_GRID = { cols: 32, rows: 24 } as const;
const MAX_ZOOM = 3;
const POSITIONS = ['top', 'bottom', 'left', 'right'] as const;
const STATES = ['exploded', 'imploded'] as const;
const PALETTES = ['light', 'dark'] as const;
const ZOOMS = ['1', 'max-top', 'max-bottom'] as const;
const CLOSE_ROUTES = [
  'same-slab',
  'escape',
  'outside-blank',
  'outside-control',
  'close-control',
  'empty-canvas',
] as const;
const CASE_STUDY_CLOSE_ROUTES = ['close-control', 'escape', 'toggle', 'canvas-tap'] as const;
const FIXTURE_A_TOP_LAYER = ['beachgoer', 'forecast-details-panel', 'tide-chart-screen'];
const FIXTURE_A_BOTTOM_LAYER = ['tide-feed'];
const A_LIVE_UPDATE = [
  'beachgoer',
  'tide-chart-screen',
  'tide-view-model',
  'tide-repository',
  'live-tide-client',
  'tide-feed',
] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function equal(left: unknown, right: unknown): boolean {
  if (left === right) return true;

  if (Array.isArray(left) && Array.isArray(right)) {
    return left.length === right.length && left.every((value, index) => equal(value, right[index]));
  }

  if (isRecord(left) && isRecord(right)) {
    const leftKeys = Object.keys(left).sort();
    const rightKeys = Object.keys(right).sort();

    return equal(leftKeys, rightKeys) && leftKeys.every((key) => equal(left[key], right[key]));
  }

  return false;
}

export function pointInRect(point: PointObservation, rect: S7Rect): boolean {
  return (
    point.x >= rect.left && point.x <= rect.right && point.y >= rect.top && point.y <= rect.bottom
  );
}

export function centroid(points: readonly PointObservation[]): PointObservation {
  if (points.length === 0) throw new Error('centroid needs at least one point');

  const sum = points.reduce((total, point) => ({ x: total.x + point.x, y: total.y + point.y }), {
    x: 0,
    y: 0,
  });

  return { x: sum.x / points.length, y: sum.y / points.length };
}

export function centroidExtremes(centroids: Record<string, PointObservation>): S7Extremes {
  let top: string | null = null;
  let bottom: string | null = null;
  let left: string | null = null;
  let right: string | null = null;
  let topY = Number.POSITIVE_INFINITY;
  let bottomY = Number.NEGATIVE_INFINITY;
  let leftX = Number.POSITIVE_INFINITY;
  let rightX = Number.NEGATIVE_INFINITY;

  for (const id of Object.keys(centroids).sort()) {
    const point = centroids[id];
    if (point === undefined) continue;

    if (point.y < topY) {
      topY = point.y;
      top = id;
    }
    if (point.y > bottomY) {
      bottomY = point.y;
      bottom = id;
    }
    if (point.x < leftX) {
      leftX = point.x;
      left = id;
    }
    if (point.x > rightX) {
      rightX = point.x;
      right = id;
    }
  }

  return { top, bottom, left, right };
}

export function neverCoversVerdict(sample: S7NeverCoversSample): {
  readonly pass: boolean;
  readonly pointCount: number;
  readonly rectOutsideCount: number;
  readonly elementOutsideCount: number;
} {
  const pointCount = sample.points.length;
  const surfaceRect = sample.surfaceRect;
  const rectOutsideCount =
    surfaceRect === null
      ? 0
      : sample.points.filter((point) => !pointInRect(point, surfaceRect)).length;
  const elementOutsideCount = sample.elementInside.filter((inside) => !inside).length;

  return {
    pass:
      pointCount > 0 &&
      surfaceRect !== null &&
      sample.elementInside.length === pointCount &&
      rectOutsideCount === pointCount &&
      elementOutsideCount === pointCount,
    pointCount,
    rectOutsideCount,
    elementOutsideCount,
  };
}

function shiftsInsideViewer(entry: LayoutShiftObservation): boolean {
  return entry.sources.some((source) => source.node?.inViewer === true);
}

export function s7ClsSummary(entries: readonly LayoutShiftObservation[]): {
  readonly pageTotal: number;
  readonly inside: LayoutShiftObservation[];
  readonly outside: LayoutShiftObservation[];
} {
  const inside = entries.filter(shiftsInsideViewer);
  const outside = entries.filter((entry) => !shiftsInsideViewer(entry));

  return {
    pageTotal: entries.reduce((sum, entry) => sum + entry.value, 0),
    inside,
    outside,
  };
}

function linkPass(actual: readonly S7Link[], expected: readonly S7Link[]): boolean {
  return (
    actual.length === expected.length &&
    actual.every((link, index) => {
      const target = expected[index];
      if (target === undefined) return false;

      const rel = new Set((link.rel ?? '').split(/\s+/).filter(Boolean));

      return (
        link.label === target.label &&
        link.url === target.url &&
        link.target === '_blank' &&
        rel.has('noopener') &&
        rel.has('noreferrer')
      );
    })
  );
}

function contentPass(sample: S7ContentSample): boolean {
  const { actual, expected } = sample;

  return (
    actual.name === expected.name &&
    equal(actual.chipLabels, expected.chipLabels) &&
    equal(actual.metrics, expected.metrics) &&
    equal(actual.headings, expected.headings) &&
    (expected.summary === null || actual.paragraphs.includes(expected.summary)) &&
    linkPass(actual.links, expected.links)
  );
}

function tourCaptionContains(state: S7TourState, ...parts: readonly string[]): boolean {
  return parts.every((part) => state.captionText.includes(part));
}

function tourTracePrefix(state: S7TourState, length: number): boolean {
  return equal(state.trace, A_LIVE_UPDATE.slice(0, length));
}

function check(name: string, pass: boolean, expected: unknown, actual: unknown): EngineProbeCheck {
  return { name, pass, expected, actual };
}

export function evaluateS7(observation: S7Observation): EngineProbeCheck[] {
  const checks: EngineProbeCheck[] = [];

  for (const fixture of observation.fixtures) {
    const expected = {
      desktop: centroidExtremes(fixture.desktop.centroids),
      mobile: centroidExtremes(fixture.mobile.centroids),
    };
    const actual = {
      desktop: fixture.desktop.extremes,
      mobile: fixture.mobile.extremes,
    };
    const complete =
      Object.keys(fixture.desktop.centroids).length >= 4 &&
      Object.keys(fixture.mobile.centroids).length >= 4 &&
      POSITIONS.every(
        (position) => expected.desktop[position] !== null && expected.mobile[position] !== null,
      );

    checks.push(
      check(
        `s7-slab-finder-${fixture.fixture}`,
        complete && equal(expected, actual),
        expected,
        actual,
      ),
    );
  }

  for (const position of POSITIONS) {
    for (const state of STATES) {
      for (const palette of PALETTES) {
        for (const zoom of ZOOMS) {
          const sample = observation.neverCovers.find(
            (candidate) =>
              candidate.position === position &&
              candidate.state === state &&
              candidate.palette === palette &&
              candidate.zoom === zoom,
          );
          const verdict = sample === undefined ? null : neverCoversVerdict(sample);

          checks.push(
            check(
              `panel-never-covers-${position}-${state}-${palette}-${zoom}`,
              sample !== undefined && verdict !== null && verdict.pass,
              {
                pointCount: '> 0',
                allPointsOutsideRect: true,
                allElementFromPointOutsideSurface: true,
              },
              sample === undefined || verdict === null
                ? null
                : {
                    slabId: sample.slabId,
                    ...verdict,
                    surfaceFound: sample.surfaceRect !== null,
                  },
            ),
          );
        }
      }
    }
  }

  for (const kind of ['mouse', 'touch'] as const) {
    const sample = observation.open[kind];
    const pass =
      sample.kind === 'detail' && sample.highlight === sample.target && sample.target.length > 0;

    checks.push(
      check(`panel-open-${kind}`, pass, { kind: 'detail', highlight: sample.target }, sample),
    );
  }

  for (const sample of observation.content) {
    checks.push(
      check(`panel-content-${sample.id}`, contentPass(sample), sample.expected, sample.actual),
    );
  }

  for (const route of CLOSE_ROUTES) {
    const sample = observation.closes.find((candidate) => candidate.route === route);
    const expectedControl = route === 'outside-control' ? 'fixture-a' : null;
    const focusPass =
      sample !== undefined &&
      (expectedControl === null ? sample.focus.wrapper : sample.focus.control === expectedControl);

    checks.push(
      check(
        `panel-close-${route}`,
        sample !== undefined && sample.panelAfter === 'closed',
        { panelAfter: 'closed' },
        sample ?? null,
      ),
      check(
        `panel-focus-return-${route}`,
        focusPass,
        expectedControl === null ? { wrapper: true } : { control: expectedControl },
        sample?.focus ?? null,
      ),
    );
  }

  checks.push(
    check(
      'panel-keys-isolated',
      observation.arrowIsolation.closeFocused &&
        Number.isFinite(observation.arrowIsolation.before) &&
        observation.arrowIsolation.before === observation.arrowIsolation.after,
      { closeFocused: true, azimuthUnchanged: true },
      observation.arrowIsolation,
    ),
  );

  for (const sample of observation.caseStudies) {
    checks.push(
      check(
        `case-study-sections-${sample.fixture}`,
        sample.heading === sample.expected.heading &&
          equal(sample.headings, sample.expected.headings) &&
          equal(sample.metrics, sample.expected.metrics),
        sample.expected,
        {
          heading: sample.heading,
          headings: sample.headings,
          metrics: sample.metrics,
        },
      ),
    );
  }

  const scroll = observation.caseStudyScroll;
  checks.push(
    check(
      'case-study-scroll',
      scroll.scrollHeight > scroll.clientHeight &&
        scroll.scrollTopAfter !== scroll.scrollTopBefore &&
        scroll.windowYAfter === scroll.windowYBefore,
      {
        scrollHeightGreaterThanClientHeight: true,
        scrollTopChanged: true,
        windowScrollYUnchanged: true,
      },
      scroll,
    ),
  );

  for (const route of CASE_STUDY_CLOSE_ROUTES) {
    const sample = observation.caseStudyCloses.find((candidate) => candidate.route === route);
    const focusPass =
      route === 'canvas-tap'
        ? sample !== undefined && (sample.focus.opener || sample.focus.wrapper)
        : sample !== undefined && sample.focus.opener;
    checks.push(
      check(
        `case-study-close-${route}`,
        sample !== undefined && sample.panelAfter === 'closed' && focusPass,
        {
          panelAfter: 'closed',
          focus: route === 'canvas-tap' ? 'opener or wrapper' : 'opener',
        },
        sample ?? null,
      ),
    );
  }

  for (const palette of PALETTES) {
    const sample = observation.caseStudyPalettes[palette];
    checks.push(
      check(
        `case-study-palette-${palette}`,
        equal(sample.background, sample.expectedBackground) &&
          equal(sample.text, sample.expectedText),
        {
          background: sample.expectedBackground,
          text: sample.expectedText,
        },
        { background: sample.background, text: sample.text },
      ),
    );
  }

  checks.push(
    check(
      'chips-labels',
      observation.chips.samples.length > 0 &&
        observation.chips.samples.every((sample) => equal(sample.labels, sample.expectedLabels)),
      'labels equal the registry labels',
      observation.chips.samples,
    ),
  );

  for (const palette of PALETTES) {
    const samples = observation.chips.swatches[palette];
    checks.push(
      check(
        `chips-swatch-${palette}`,
        samples.length > 0 && samples.every((sample) => equal(sample.actual, sample.expected)),
        'swatch colour equals the live --bp-tech-<category> value',
        samples,
      ),
    );
  }

  checks.push(
    check(
      'chips-display-only',
      observation.chips.chipCount > 0 &&
        observation.chips.focusable === 0 &&
        observation.chips.linkRoles === 0,
      { chipCount: '> 0', focusable: 0, linkRoles: 0 },
      {
        chipCount: observation.chips.chipCount,
        focusable: observation.chips.focusable,
        linkRoles: observation.chips.linkRoles,
      },
    ),
  );

  const tour = observation.tour;
  checks.push(
    check(
      'tour-jump-playing',
      tour.jumpPlaying.before.status === 'playing' &&
        tour.jumpPlaying.after.status === 'playing' &&
        tour.jumpPlaying.after.step === 3 &&
        tourCaptionContains(tour.jumpPlaying.after, 'Step 4 of 6', 'Tide Repository') &&
        tourTracePrefix(tour.jumpPlaying.after, 4) &&
        tour.jumpPlaying.beat.status === 'playing' &&
        tour.jumpPlaying.beat.step === 4 &&
        tourCaptionContains(tour.jumpPlaying.beat, 'Step 5 of 6', 'Live Tide Client') &&
        tourTracePrefix(tour.jumpPlaying.beat, 5),
      {
        after: { step: 3, status: 'playing', caption: 'Step 4 of 6 · Tide Repository' },
        beat: { step: 4, status: 'playing', caption: 'Step 5 of 6 · Live Tide Client' },
      },
      tour.jumpPlaying,
    ),
    check(
      'tour-jump-paused',
      tour.jumpPaused.after.status === 'paused' &&
        tour.jumpPaused.after.step === 4 &&
        tourCaptionContains(tour.jumpPaused.after, 'Step 5 of 6', 'Live Tide Client') &&
        tourTracePrefix(tour.jumpPaused.after, 5),
      { step: 4, status: 'paused', caption: 'Step 5 of 6 · Live Tide Client' },
      tour.jumpPaused,
    ),
    check(
      'tour-notinflow-pause',
      tour.notInflow.after.status === 'paused' &&
        tour.notInflow.after.step === tour.notInflow.stepAtClick &&
        tour.notInflow.after.panel === 'detail' &&
        tour.notInflow.after.panelTitle === 'Forecast Details Panel',
      {
        status: 'paused',
        step: tour.notInflow.stepAtClick,
        panel: 'detail',
        panelTitle: 'Forecast Details Panel',
      },
      tour.notInflow,
    ),
    check(
      'tour-resume-same-step',
      tour.resumeSameStep.afterPlay.status === 'playing' &&
        tour.resumeSameStep.afterPlay.step === tour.resumeSameStep.paused.step,
      { status: 'playing', step: tour.resumeSameStep.paused.step },
      tour.resumeSameStep,
    ),
    check(
      'tour-escape-layering',
      tour.escapeLayering.afterFirst.panel === 'closed' &&
        tour.escapeLayering.afterFirst.status !== 'idle' &&
        tour.escapeLayering.afterSecond.status === 'idle',
      { afterFirst: { panel: 'closed', status: 'paused' }, afterSecond: { status: 'idle' } },
      tour.escapeLayering,
    ),
    check(
      'tour-jump-no-caption-gap',
      tour.jumpStableCaption.frames > 10 && tour.jumpStableCaption.framesWithoutCaption === 0,
      { frames: '> 10', framesWithoutCaption: 0 },
      tour.jumpStableCaption,
    ),
  );

  const cls = s7ClsSummary(observation.cls.entries);
  checks.push(
    check(
      'panel-cls-strict',
      cls.inside.length === 0,
      '0 layout-shift entries with a source inside the viewer wrapper',
      {
        pageTotal: cls.pageTotal,
        inside: cls.inside,
        outsideCount: cls.outside.length,
        outsideEntries: cls.outside,
      },
    ),
  );

  const stageFailures = observation.stageSamples.filter(
    (sample) => !equal(sample.before, sample.after),
  );
  checks.push(
    check(
      'panel-stage-invariant',
      observation.stageSamples.length > 0 && stageFailures.length === 0,
      'stage rect and scrollHeight identical before/after every open/close',
      { samples: observation.stageSamples.length, failures: stageFailures },
    ),
  );

  const hidden = observation.hiddenWhileMoving;
  const hiddenViolations = hidden.frames.filter((frame) => !frame.hidden && frame.inside);
  checks.push(
    check(
      'panel-hidden-while-moving',
      hidden.frames.length > 0 &&
        hiddenViolations.length === 0 &&
        (hidden.settled.hidden ||
          (hidden.settled.surfaceFound &&
            hidden.settled.pointCount > 0 &&
            hidden.settled.pointsInside === 0)),
      'every frame is hidden or disjoint from the slab hit points',
      {
        frames: hidden.frames.length,
        violations: hiddenViolations,
        settled: hidden.settled,
      },
    ),
  );

  checks.push(
    check(
      'rm-panel-instant',
      observation.reducedMotion.surfaceFound &&
        observation.reducedMotion.animations === 0 &&
        observation.reducedMotion.opacity >= 0.99,
      { surfaceFound: true, animations: 0, opacity: 1 },
      observation.reducedMotion,
    ),
    check(
      'panel-draw-calls',
      observation.drawCalls.panel === 2 && observation.drawCalls.tour === 2,
      { panel: 2, tour: 2 },
      observation.drawCalls,
    ),
    check(
      'panel-max-zoom-reach',
      observation.maxZoom.zoom >= MAX_ZOOM &&
        observation.maxZoom.top !== null &&
        observation.maxZoom.top.hovered &&
        observation.maxZoom.top.outside &&
        FIXTURE_A_TOP_LAYER.includes(observation.maxZoom.top.id) &&
        observation.maxZoom.bottom !== null &&
        observation.maxZoom.bottom.hovered &&
        observation.maxZoom.bottom.outside &&
        FIXTURE_A_BOTTOM_LAYER.includes(observation.maxZoom.bottom.id),
      {
        zoom: MAX_ZOOM,
        topLayer: FIXTURE_A_TOP_LAYER,
        bottomLayer: FIXTURE_A_BOTTOM_LAYER,
      },
      observation.maxZoom,
    ),
  );

  return checks;
}

export async function loadS7Fixtures(): Promise<S7FixtureData> {
  const root = new URL('../../../packages/xploder/test/fixtures/', import.meta.url);
  const readJson = async (name: string): Promise<unknown> =>
    JSON.parse(await readFile(new URL(name, root), 'utf8')) as unknown;

  const [a, b, c, registry] = await Promise.all([
    readJson('project-a-ui-app.json'),
    readJson('project-b-pipeline.json'),
    readJson('project-c-lockerbay.json'),
    readJson('tech-registry.json'),
  ]);

  if (
    !isRecord(a) ||
    !isRecord(b) ||
    !isRecord(c) ||
    !isRecord(registry) ||
    !Array.isArray(registry.techs)
  ) {
    throw new Error('S7 fixtures are malformed');
  }

  return {
    a: a as unknown as S7FixtureProject,
    b: b as unknown as S7FixtureProject,
    c: c as unknown as S7FixtureProject,
    registry: registry as unknown as S7Registry,
  };
}

function findComponent(project: S7FixtureProject, id: string): S7FixtureComponent {
  const component = project.layers
    .flatMap((layer) => layer.components)
    .find((candidate) => candidate.id === id);

  if (component === undefined) throw new Error(`fixture component is missing: ${id}`);
  return component;
}

function labelsFor(techs: readonly string[] | undefined, registry: S7Registry): string[] {
  const labels = new Map(registry.techs.map((tech) => [tech.id, tech.label]));
  return (techs ?? []).map((id) => labels.get(id) ?? id);
}

function expectedContent(component: S7FixtureComponent, registry: S7Registry): S7ContentExpected {
  const techs = component.techs ?? [];
  const metrics = [...(component.metrics ?? [])];
  const links = (component.links ?? []).map((link) => ({
    label: link.label,
    url: link.url,
    target: '_blank',
    rel: 'noopener noreferrer',
  }));
  const headings = [
    ...(techs.length === 0 ? [] : ['Tech']),
    ...(metrics.length === 0 ? [] : ['Metrics']),
    ...(links.length === 0 ? [] : ['Links']),
  ];

  return {
    name: component.name ?? component.id,
    summary: component.summary ?? null,
    chipLabels: labelsFor(techs, registry),
    metrics,
    links,
    headings,
  };
}

function expectedCaseStudy(project: S7FixtureProject): {
  heading: string;
  headings: string[];
  metrics: S7Metric[];
} {
  const story = project.story;
  const headings = [
    ...(story?.problem === undefined ? [] : ['Problem']),
    ...(story?.approach === undefined ? [] : ['Approach']),
    ...(story?.outcome === undefined ? [] : ['Outcome']),
  ];
  const metrics = [...(story?.metrics ?? [])];

  if (metrics.length > 0) headings.push('Metrics');

  return {
    heading: project.meta.name ?? project.meta.slug,
    headings,
    metrics,
  };
}

function fixtureUrl(
  base: URL,
  fixture: S7FixtureId,
  params: {
    readonly state?: S7State;
    readonly select?: string;
    readonly panel?: string;
    readonly flow?: string;
    readonly tour?: string;
    readonly step?: number;
  } = {},
): string {
  const url = new URL('dev/engine', base);
  url.searchParams.set('fixture', fixture);
  if (params.state === 'exploded') url.searchParams.set('state', 'exploded');
  if (params.select !== undefined) url.searchParams.set('select', params.select);
  if (params.panel !== undefined) url.searchParams.set('panel', params.panel);
  if (params.flow !== undefined) url.searchParams.set('flow', params.flow);
  if (params.tour !== undefined) url.searchParams.set('tour', params.tour);
  if (params.step !== undefined) url.searchParams.set('step', String(params.step));
  return url.href;
}

function parseColor(raw: string): PixelObservation {
  const value = raw.trim();
  const hex = /^#([0-9a-f]{6})$/i.exec(value);

  if (hex?.[1] !== undefined) {
    const number = Number.parseInt(hex[1], 16);
    return { r: (number >> 16) & 255, g: (number >> 8) & 255, b: number & 255 };
  }

  const rgb = /^rgba?\(([^)]+)\)$/i.exec(value);
  if (rgb?.[1] !== undefined) {
    const parts = rgb[1]
      .split(/[\s,/]+/)
      .filter(Boolean)
      .map(Number);
    const [r, g, b] = parts;
    if (r !== undefined && g !== undefined && b !== undefined) return { r, g, b };
  }

  throw new Error(`unsupported colour value: ${value}`);
}

async function waitForFrames(page: Page): Promise<void> {
  await page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
      }),
  );
}

async function resetPageScroll(page: Page): Promise<void> {
  await page.evaluate(() => window.scrollTo(0, 0));
  await waitForFrames(page);
}

async function waitForSettled(page: Page): Promise<void> {
  await waitForFrames(page);
  await page.waitForFunction(
    (selector) => {
      const viewer = document.querySelector(selector);
      return (
        viewer?.getAttribute('data-xploder-tweening') === 'false' &&
        viewer?.getAttribute('data-xploder-pulse') === 'false'
      );
    },
    VIEWER_SELECTOR,
    { timeout: WAIT_TIMEOUT_MS },
  );
}

async function gotoFixture(page: Page, href: string, state?: S7State): Promise<void> {
  await page.goto(href, { waitUntil: 'load', timeout: WAIT_TIMEOUT_MS });
  await page.waitForSelector(VIEWER_SELECTOR, { timeout: WAIT_TIMEOUT_MS });
  if (state !== undefined) {
    await page.waitForFunction(
      ({ selector, expected }) =>
        document.querySelector(selector)?.getAttribute('data-xploder-state') === expected,
      { selector: VIEWER_SELECTOR, expected: state },
      { timeout: WAIT_TIMEOUT_MS },
    );
  }
  await waitForSettled(page);
}

async function waitForViewerAttribute(
  page: Page,
  name: string,
  value: string | null,
): Promise<void> {
  await page.waitForFunction(
    ({ selector, attribute, expected }) => {
      const actual = document.querySelector(selector)?.getAttribute(attribute) ?? null;
      return actual === expected;
    },
    { selector: VIEWER_SELECTOR, attribute: name, expected: value },
    { timeout: WAIT_TIMEOUT_MS },
  );
}

async function waitForPanel(page: Page, kind: 'closed' | 'detail' | 'case-study'): Promise<void> {
  await page.waitForFunction(
    ({ selector, expected }) =>
      (document.querySelector(selector) as HTMLElement | null)?.dataset.xploderPanel === expected,
    { selector: VIEWER_SELECTOR, expected: kind },
    { timeout: WAIT_TIMEOUT_MS },
  );
}

async function waitForPanelReady(page: Page, ready: boolean): Promise<void> {
  await waitForViewerAttribute(page, 'data-xploder-panel-ready', String(ready));
}

async function waitForTour(
  page: Page,
  status: 'idle' | 'playing' | 'paused' | 'ended',
  step?: number,
): Promise<void> {
  await page.waitForFunction(
    ({ selector, expectedStatus, expectedStep }) => {
      const viewer = document.querySelector(selector);
      return (
        viewer?.getAttribute('data-xploder-tour') === expectedStatus &&
        (expectedStep === undefined ||
          viewer.getAttribute('data-xploder-tour-step') === String(expectedStep))
      );
    },
    { selector: VIEWER_SELECTOR, expectedStatus: status, expectedStep: step },
    { timeout: WAIT_TIMEOUT_MS },
  );
}

async function readAttribute(page: Page, name: string): Promise<string> {
  const value = await page.locator(VIEWER_SELECTOR).getAttribute(name);
  if (value === null) throw new Error(`viewer is missing ${name}`);
  return value;
}

async function readNumberAttribute(page: Page, name: string): Promise<number> {
  const value = Number(await readAttribute(page, name));
  if (!Number.isFinite(value)) throw new Error(`viewer ${name} is not a number`);
  return value;
}

async function readStageMetrics(page: Page): Promise<S7StageMetrics> {
  await resetPageScroll(page);
  return page.evaluate((stageSelector) => {
    const stage = document.querySelector(stageSelector);
    if (!(stage instanceof HTMLElement)) throw new Error('stage is missing');
    const rect = stage.getBoundingClientRect();
    return {
      rect: {
        left: rect.left,
        top: rect.top,
        right: rect.right,
        bottom: rect.bottom,
        width: rect.width,
        height: rect.height,
      },
      scrollHeight: stage.scrollHeight,
    };
  }, STAGE_SELECTOR);
}

async function readStageRect(page: Page): Promise<S7Rect> {
  return page.evaluate((selector) => {
    const stage = document.querySelector(selector);
    if (!(stage instanceof HTMLElement)) throw new Error('stage is missing');
    const rect = stage.getBoundingClientRect();
    return {
      left: rect.left,
      top: rect.top,
      right: rect.right,
      bottom: rect.bottom,
      width: rect.width,
      height: rect.height,
    };
  }, STAGE_SELECTOR);
}

async function readSurfaceRect(page: Page): Promise<S7Rect | null> {
  return page.evaluate((selector) => {
    const surface = document.querySelector(selector);
    if (!(surface instanceof HTMLElement)) return null;
    const rect = surface.getBoundingClientRect();
    return {
      left: rect.left,
      top: rect.top,
      right: rect.right,
      bottom: rect.bottom,
      width: rect.width,
      height: rect.height,
    };
  }, PANEL_SURFACE_SELECTOR);
}

async function setTheme(page: Page, theme: S7Palette): Promise<void> {
  await page.waitForSelector('button[aria-label^="Switch to "]', {
    timeout: WAIT_TIMEOUT_MS,
  });
  const isDark = await page.evaluate(() => document.documentElement.classList.contains('dark'));

  if (isDark !== (theme === 'dark')) {
    await page
      .getByRole('button', {
        name: isDark ? 'Switch to light theme' : 'Switch to dark theme',
      })
      .click();
    await page.waitForFunction(
      (dark) => document.documentElement.classList.contains('dark') === dark,
      theme === 'dark',
      { timeout: WAIT_TIMEOUT_MS },
    );
  }

  await resetPageScroll(page);
}

async function scrollStage(page: Page, edge: 'top' | 'bottom'): Promise<void> {
  await page.locator(STAGE_SELECTOR).evaluate((stage, target) => {
    stage.scrollTop = target === 'top' ? 0 : stage.scrollHeight;
    stage.dispatchEvent(new Event('scroll'));
  }, edge);
  await waitForFrames(page);
}

async function scrollStageTo(page: Page, scrollTop: number): Promise<void> {
  await page.locator(STAGE_SELECTOR).evaluate((stage, target) => {
    stage.scrollTop = target;
    stage.dispatchEvent(new Event('scroll'));
  }, scrollTop);
  await waitForFrames(page);
}

async function zoomToMax(page: Page): Promise<void> {
  await page.evaluate((selector) => {
    const viewer = document.querySelector(selector);
    if (viewer instanceof HTMLElement) viewer.focus();
  }, VIEWER_SELECTOR);

  for (let index = 0; index < 20; index += 1) await page.keyboard.press('+');
  await page.waitForFunction(
    ({ selector, expected }) =>
      document.querySelector(selector)?.getAttribute('data-xploder-zoom') === expected,
    { selector: VIEWER_SELECTOR, expected: String(MAX_ZOOM) },
    { timeout: WAIT_TIMEOUT_MS },
  );
  await waitForFrames(page);
}

async function clearPointer(page: Page): Promise<void> {
  await page.mouse.move(1, 1);
  await waitForViewerAttribute(page, 'data-xploder-highlight', null);
}

async function movePointerAway(page: Page): Promise<void> {
  await page.mouse.move(1, 1);
}

async function sweepHitMap(
  page: Page,
  grid: { readonly cols: number; readonly rows: number },
): Promise<S7HitSweepResult> {
  return page.evaluate(
    async ({ stageSelector, viewerSelector, grid: dimensions }) => {
      const stage = document.querySelector(stageSelector);
      const viewer = document.querySelector(viewerSelector);
      if (!(stage instanceof HTMLElement) || !(viewer instanceof HTMLElement)) {
        throw new Error('viewer or stage is missing');
      }

      const rect = stage.getBoundingClientRect();
      const points: Record<string, [number, number][]> = {};
      const empty: [number, number][] = [];

      for (let row = 0; row <= dimensions.rows; row += 1) {
        const clientY = rect.top + 1 + ((rect.height - 2) * row) / dimensions.rows;
        for (let col = 0; col <= dimensions.cols; col += 1) {
          const clientX = rect.left + 1 + ((rect.width - 2) * col) / dimensions.cols;
          stage.dispatchEvent(
            new PointerEvent('pointermove', {
              bubbles: true,
              pointerType: 'mouse',
              clientX,
              clientY,
            }),
          );
          await new Promise((resolve) => setTimeout(resolve, 0));
          const id = viewer.dataset.xploderHighlight;
          const point: [number, number] = [Math.round(clientX), Math.round(clientY)];

          if (id === undefined) {
            if (empty.length < 200) empty.push(point);
          } else {
            (points[id] ??= []).push(point);
          }
        }
      }

      return {
        stageRect: {
          left: rect.left,
          top: rect.top,
          right: rect.right,
          bottom: rect.bottom,
          width: rect.width,
          height: rect.height,
        },
        points: Object.fromEntries(
          Object.entries(points).map(([id, values]) => [id, values.map(([x, y]) => ({ x, y }))]),
        ),
        empty: empty.map(([x, y]) => ({ x, y })),
      };
    },
    {
      stageSelector: STAGE_SELECTOR,
      viewerSelector: VIEWER_SELECTOR,
      grid,
    },
  );
}

async function scrollToVisibleEdge(
  page: Page,
  edge: 'top' | 'bottom',
  grid: { readonly cols: number; readonly rows: number },
): Promise<S7HitSweepResult> {
  await scrollStage(page, edge);
  let sweep = await sweepHitMap(page, grid);
  if (Object.keys(sweep.points).length > 0) return sweep;

  const extent = await page.locator(STAGE_SELECTOR).evaluate((stage) => {
    return Math.max(0, stage.scrollHeight - stage.clientHeight);
  });
  const step = Math.max(8, Math.ceil(extent / 24));

  for (let distance = step; distance <= extent; distance += step) {
    await scrollStageTo(page, edge === 'top' ? distance : extent - distance);
    sweep = await sweepHitMap(page, grid);
    if (Object.keys(sweep.points).length > 0) return sweep;
  }

  throw new Error(`no visible slab at the ${edge} edge of the stage`);
}

function centralPoint(
  points: readonly PointObservation[] | undefined,
  id = 'unknown',
): PointObservation {
  if (points === undefined || points.length === 0) {
    throw new Error(`hit-map point is missing for ${id}`);
  }

  const center = centroid(points);
  return points.reduce((best, point) => {
    const bestDistance = Math.hypot(best.x - center.x, best.y - center.y);
    const pointDistance = Math.hypot(point.x - center.x, point.y - center.y);
    return pointDistance < bestDistance ? point : best;
  });
}

function toRelative(points: readonly PointObservation[], rect: S7Rect): PointObservation[] {
  return points.map((point) => ({ x: point.x - rect.left, y: point.y - rect.top }));
}

function toViewport(points: readonly PointObservation[], rect: S7Rect): PointObservation[] {
  return points.map((point) => ({ x: point.x + rect.left, y: point.y + rect.top }));
}

function sweepObservation(points: Record<string, PointObservation[]>): S7HitSweep {
  const centroids: Record<string, PointObservation> = {};

  for (const [id, values] of Object.entries(points)) {
    if (values.length > 0) centroids[id] = centroid(values);
  }

  return { centroids, extremes: centroidExtremes(centroids) };
}

async function readPanelState(
  page: Page,
): Promise<{ kind: string; highlight: string | null; title: string | null }> {
  return page.evaluate(
    ({ viewerSelector, surfaceSelector }) => {
      const viewer = document.querySelector(viewerSelector) as HTMLElement | null;
      const surface = document.querySelector(surfaceSelector);
      return {
        kind: viewer?.dataset.xploderPanel ?? 'closed',
        highlight: viewer?.dataset.xploderHighlight ?? null,
        title: surface?.querySelector('h2')?.textContent?.trim() ?? null,
      };
    },
    { viewerSelector: VIEWER_SELECTOR, surfaceSelector: PANEL_SURFACE_SELECTOR },
  );
}

async function readOpenSample(page: Page, target: string): Promise<S7OpenSample> {
  await waitForPanelReady(page, true);
  await waitForPanel(page, 'detail');
  const state = await readPanelState(page);
  return { target, ...state };
}

async function readContent(page: Page): Promise<S7ContentActual> {
  return page.evaluate((surfaceSelector) => {
    const surface = document.querySelector(surfaceSelector);
    if (!(surface instanceof HTMLElement)) throw new Error('panel surface is missing');

    const text = (node: Element | null): string => node?.textContent?.trim() ?? '';
    const paragraphs = [...surface.querySelectorAll('p')]
      .map((paragraph) => text(paragraph))
      .filter(Boolean);
    const chipLabels = [...surface.querySelectorAll('[data-xploder-chip]')].map((chip) =>
      text(chip),
    );
    const metrics = [...surface.querySelectorAll('dl > div')].map((row) => ({
      label: text(row.querySelector('dt')),
      value: text(row.querySelector('dd')),
    }));
    const links = [...surface.querySelectorAll('a')].map((anchor) => ({
      label: anchor.firstChild?.textContent?.trim() ?? text(anchor),
      url: anchor.getAttribute('href') ?? '',
      target: anchor.getAttribute('target'),
      rel: anchor.getAttribute('rel'),
    }));
    const headings = [...surface.querySelectorAll('h3')].map((heading) => text(heading));

    return {
      name: text(surface.querySelector('h2')),
      paragraphs,
      chipLabels,
      metrics,
      links,
      headings,
    };
  }, PANEL_SURFACE_SELECTOR);
}

interface S7ChipRead {
  readonly chips: {
    readonly id: string;
    readonly label: string;
    readonly background: string;
  }[];
  readonly focusable: number;
  readonly linkRoles: number;
}

async function readChips(page: Page): Promise<S7ChipRead> {
  return page.evaluate((surfaceSelector) => {
    const surface = document.querySelector(surfaceSelector);
    if (!(surface instanceof HTMLElement)) throw new Error('panel surface is missing');
    const list = surface.querySelector('ul[aria-label="Tech"]');
    if (!(list instanceof HTMLUListElement)) throw new Error('tech chip list is missing');

    const chips = [...list.querySelectorAll('[data-xploder-chip]')].map((chip) => ({
      id: chip.getAttribute('data-xploder-chip') ?? '',
      label: chip.textContent?.trim() ?? '',
      background: getComputedStyle(chip.querySelector('span[aria-hidden="true"]') ?? chip)
        .backgroundColor,
    }));
    const focusable = [...list.querySelectorAll('*')].filter((element) => {
      if (element.matches('a,button,[role="link"]')) return true;
      return element instanceof HTMLElement && element.tabIndex >= 0;
    }).length;
    const linkRoles = list.querySelectorAll('a,button,[role="link"]').length;

    return { chips, focusable, linkRoles };
  }, PANEL_SURFACE_SELECTOR);
}

async function readCssColor(page: Page, name: string): Promise<PixelObservation> {
  const raw = await page.evaluate(
    (variable) => getComputedStyle(document.documentElement).getPropertyValue(variable),
    name,
  );
  return parseColor(raw);
}

async function readCaseStudySample(
  page: Page,
  fixture: S7FixtureId,
  expected: S7CaseStudySample['expected'],
): Promise<S7CaseStudySample> {
  await waitForPanelReady(page, true);
  await waitForPanel(page, 'case-study');
  const actual = await page.evaluate((surfaceSelector) => {
    const surface = document.querySelector(surfaceSelector);
    if (!(surface instanceof HTMLElement)) throw new Error('case study surface is missing');
    const text = (node: Element | null): string => node?.textContent?.trim() ?? '';

    return {
      heading: text(surface.querySelector('h2')),
      headings: [...surface.querySelectorAll('h3')].map((heading) => text(heading)),
      metrics: [...surface.querySelectorAll('dl > div')].map((row) => ({
        label: text(row.querySelector('dt')),
        value: text(row.querySelector('dd')),
      })),
    };
  }, PANEL_SURFACE_SELECTOR);

  return { fixture, ...actual, expected };
}

async function readFocus(
  page: Page,
): Promise<{ wrapper: boolean; control: string | null; opener: boolean }> {
  return page.evaluate((viewerSelector) => {
    const wrapper = document.querySelector(viewerSelector);
    const active = document.activeElement;
    const control =
      active instanceof HTMLElement ? active.getAttribute('data-engine-control') : null;
    return {
      wrapper: active === wrapper,
      control,
      opener: control === 'case-study',
    };
  }, VIEWER_SELECTOR);
}

async function readTourState(page: Page): Promise<S7TourState> {
  return page.evaluate(
    ({ viewerSelector, surfaceSelector, captionSelector }) => {
      const viewer = document.querySelector(viewerSelector) as HTMLElement | null;
      const surface = document.querySelector(surfaceSelector);
      const caption = document.querySelector(captionSelector) as HTMLElement | null;
      const trace = viewer?.dataset.xploderTrace?.trim() ?? '';

      return {
        step: Number(viewer?.dataset.xploderTourStep ?? -1),
        status: viewer?.dataset.xploderTour ?? 'idle',
        captionText: (caption?.innerText ?? '').replace(/\s+/g, ' ').trim(),
        trace: trace.length === 0 ? [] : trace.split(/\s+/),
        panel: viewer?.dataset.xploderPanel ?? 'closed',
        panelTitle: surface?.querySelector('h2')?.textContent?.trim() ?? null,
      };
    },
    {
      viewerSelector: VIEWER_SELECTOR,
      surfaceSelector: PANEL_SURFACE_SELECTOR,
      captionSelector: CAPTION_SELECTOR,
    },
  );
}

async function readDrawCalls(page: Page): Promise<number> {
  await page.waitForFunction(
    () => {
      const element = document.querySelector('[data-engine-draw-calls]');
      return element?.getAttribute('data-engine-draw-calls') !== null;
    },
    undefined,
    { timeout: WAIT_TIMEOUT_MS },
  );
  const raw = await page.locator('[data-engine-draw-calls]').getAttribute('data-engine-draw-calls');
  const value = Number(raw);
  if (!Number.isInteger(value)) throw new Error(`draw calls are incomplete: ${raw ?? 'missing'}`);
  return value;
}

async function readPaletteSample(page: Page): Promise<S7PaletteSample> {
  const raw = await page.evaluate((surfaceSelector) => {
    const surface = document.querySelector(surfaceSelector);
    if (!(surface instanceof HTMLElement)) throw new Error('panel surface is missing');
    const heading = surface.querySelector('h2');
    if (!(heading instanceof HTMLElement)) throw new Error('panel heading is missing');
    const root = getComputedStyle(document.documentElement);

    return {
      background: getComputedStyle(surface).backgroundColor,
      text: getComputedStyle(heading).color,
      expectedBackground: root.getPropertyValue('--bp-surface'),
      expectedText: root.getPropertyValue('--bp-ink'),
    };
  }, PANEL_SURFACE_SELECTOR);

  return {
    background: parseColor(raw.background),
    text: parseColor(raw.text),
    expectedBackground: parseColor(raw.expectedBackground),
    expectedText: parseColor(raw.expectedText),
  };
}

async function withClsGroup<T>(
  deps: S7CaptureDeps,
  page: Page,
  group: string,
  work: () => Promise<T>,
): Promise<T> {
  deps.setClsGroup(page, group);
  try {
    return await work();
  } finally {
    await deps.finishClsGroup(page);
  }
}

async function clickStagePoint(page: Page, point: PointObservation): Promise<void> {
  const rect = await readStageRect(page);
  const viewport = toViewport([point], rect)[0];
  if (viewport === undefined) throw new Error('stage point is missing');
  await page.mouse.click(viewport.x, viewport.y);
}

async function tapStagePoint(page: Page, point: PointObservation): Promise<void> {
  const rect = await readStageRect(page);
  const viewport = toViewport([point], rect)[0];
  if (viewport === undefined) throw new Error('stage point is missing');
  await page.touchscreen.tap(viewport.x, viewport.y);
}

async function blankOutsidePoint(page: Page): Promise<PointObservation> {
  return page.evaluate((viewerSelector) => {
    const wrapper = document.querySelector(viewerSelector);
    if (!(wrapper instanceof HTMLElement)) throw new Error('viewer wrapper is missing');
    const rect = wrapper.getBoundingClientRect();
    const candidates = [
      { x: 8, y: rect.bottom + 8 },
      { x: window.innerWidth - 8, y: rect.bottom + 8 },
      { x: 8, y: Math.max(8, rect.top - 8) },
      { x: Math.round(window.innerWidth / 2), y: window.innerHeight - 4 },
    ];

    for (const candidate of candidates) {
      const element = document.elementFromPoint(candidate.x, candidate.y);
      if (element === null || wrapper.contains(element)) continue;
      if (element.closest('button,a,input,textarea,select,[role="button"]') !== null) continue;
      return candidate;
    }

    throw new Error('blank point outside the viewer is missing');
  }, VIEWER_SELECTOR);
}

async function elementInsideSurface(
  page: Page,
  points: readonly PointObservation[],
): Promise<boolean[]> {
  const rect = await readStageRect(page);
  const viewport = toViewport(points, rect);
  return page.evaluate(
    ({ selector, values }) => {
      const surface = document.querySelector(selector);
      return values.map((point) => {
        const element = document.elementFromPoint(point.x, point.y);
        if (element === null || surface === null) return false;
        return element === surface || surface.contains(element);
      });
    },
    { selector: PANEL_SURFACE_SELECTOR, values: viewport },
  );
}

async function readPanelKind(page: Page): Promise<string> {
  return page.evaluate(
    (selector) =>
      (document.querySelector(selector) as HTMLElement | null)?.dataset.xploderPanel ?? 'closed',
    VIEWER_SELECTOR,
  );
}

async function pressEscapeUntilClosed(page: Page): Promise<void> {
  await page.keyboard.press('Escape');
  await waitForPanel(page, 'closed');
  await waitForFrames(page);
}

async function prepareTourPaused(page: Page, base: URL, step: number): Promise<void> {
  await gotoFixture(
    page,
    fixtureUrl(base, 'a', {
      state: 'exploded',
      flow: 'live-update',
      tour: 'paused',
      step,
    }),
    'exploded',
  );
  await waitForTour(page, 'paused', step);
}

async function installCaptionGapSampler(page: Page): Promise<void> {
  await page.evaluate((captionSelector) => {
    const target = window as unknown as {
      __s7CaptionGap?: { frames: number; missing: number; active: boolean };
    };
    const state = { frames: 0, missing: 0, active: true };
    target.__s7CaptionGap = state;
    const tick = () => {
      if (!state.active) return;
      state.frames += 1;
      if (document.querySelector(captionSelector) === null) state.missing += 1;
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, CAPTION_SELECTOR);
}

async function stopCaptionGapSampler(
  page: Page,
): Promise<{ frames: number; framesWithoutCaption: number }> {
  const sample = await page.evaluate(() => {
    const target = window as unknown as {
      __s7CaptionGap?: { frames: number; missing: number; active: boolean };
    };
    const state = target.__s7CaptionGap;
    if (state === undefined) throw new Error('caption gap sampler was not installed');
    state.active = false;
    return { frames: state.frames, missing: state.missing };
  });

  return { frames: sample.frames, framesWithoutCaption: sample.missing };
}

async function captureNeverCovers(
  deps: S7CaptureDeps,
  stageSamples: S7StageSample[],
): Promise<{
  samples: S7NeverCoversSample[];
  fixtures: S7FixtureObservation[];
}> {
  const samples: S7NeverCoversSample[] = [];
  let finderDesktop: S7HitSweep | undefined;
  let finderMobile: S7HitSweep | undefined;

  for (const state of STATES) {
    for (const palette of PALETTES) {
      for (const zoom of ZOOMS) {
        for (const viewport of ['desktop', 'mobile'] as const) {
          const page = viewport === 'desktop' ? deps.desktop : deps.mobile;
          const grid = viewport === 'desktop' ? DESKTOP_GRID : MOBILE_GRID;

          await withClsGroup(
            deps,
            page,
            `s7-never-${state}-${palette}-${zoom}-${viewport}`,
            async () => {
              await gotoFixture(page, fixtureUrl(deps.base, 'a', { state }), state);
              await setTheme(page, palette);
              await resetPageScroll(page);

              if (zoom !== '1') {
                await zoomToMax(page);
              }

              await clearPointer(page);
              const sweep =
                zoom === '1'
                  ? await scrollToVisibleEdge(page, 'top', grid)
                  : await scrollToVisibleEdge(page, zoom === 'max-top' ? 'top' : 'bottom', grid);
              const centroids = sweepObservation(sweep.points).centroids;
              const extremes = centroidExtremes(centroids);
              const relative = Object.fromEntries(
                Object.entries(sweep.points).map(([id, values]) => [
                  id,
                  toRelative(values, sweep.stageRect),
                ]),
              ) as Record<string, PointObservation[]>;

              if (state === 'exploded' && palette === 'light' && zoom === '1') {
                const observer = { centroids, extremes };
                if (viewport === 'desktop') finderDesktop = observer;
                else finderMobile = observer;
              }

              const positions: readonly S7Position[] =
                viewport === 'desktop' ? ['left', 'right'] : ['top', 'bottom'];

              for (const position of positions) {
                const slabId = extremes[position];
                if (slabId === null) {
                  throw new Error(
                    `slab extreme is missing: ${position} (${state}/${palette}/${zoom}/${viewport}; ids=${Object.keys(centroids).join(',')})`,
                  );
                }
                const points = relative[slabId];
                const clickPoint = centralPoint(points, slabId);
                const label = `${position}-${state}-${palette}-${zoom}-${viewport}`;
                const beforeOpen = await readStageMetrics(page);

                await clickStagePoint(page, clickPoint);
                await waitForPanelReady(page, true);
                await waitForPanel(page, 'detail');

                const surfaceRect = await readSurfaceRect(page);
                const inside = await elementInsideSurface(page, points ?? []);
                const viewportPoints = toViewport(points ?? [], sweep.stageRect);
                samples.push({
                  position,
                  state,
                  palette,
                  zoom,
                  slabId,
                  points: viewportPoints,
                  surfaceRect,
                  elementInside: inside,
                });
                const afterOpen = await readStageMetrics(page);
                stageSamples.push({ label: `open-${label}`, before: beforeOpen, after: afterOpen });

                await pressEscapeUntilClosed(page);
                const afterClose = await readStageMetrics(page);
                stageSamples.push({
                  label: `close-${label}`,
                  before: afterOpen,
                  after: afterClose,
                });
              }
            },
          );
        }
      }
    }
  }

  if (finderDesktop === undefined || finderMobile === undefined) {
    throw new Error('slab finder sweep is incomplete');
  }

  return {
    samples,
    fixtures: [{ fixture: 'a', desktop: finderDesktop, mobile: finderMobile }],
  };
}

async function captureOpenAndContent(
  deps: S7CaptureDeps,
  stageSamples: S7StageSample[],
): Promise<{
  mouse: S7OpenSample;
  touch: S7OpenSample;
  content: S7ContentSample[];
  drawCallsPanel: number;
}> {
  const { desktop, mobile, base, fixtures } = deps;
  let drawCallsPanel: number | undefined;

  const mouse = await withClsGroup(deps, desktop, 's7-open-mouse', async () => {
    await gotoFixture(desktop, fixtureUrl(base, 'a', { state: 'exploded' }), 'exploded');
    await clearPointer(desktop);
    const sweep = await sweepHitMap(desktop, DESKTOP_GRID);
    const points = sweep.points['tide-chart-screen'];
    const point = toRelative([centralPoint(points, 'tide-chart-screen')], sweep.stageRect)[0];
    if (point === undefined) throw new Error('mouse open point is missing');
    const before = await readStageMetrics(desktop);
    await clickStagePoint(desktop, point);
    const sample = await readOpenSample(desktop, 'tide-chart-screen');
    drawCallsPanel = await readDrawCalls(desktop);
    const after = await readStageMetrics(desktop);
    stageSamples.push({ label: 'open-mouse', before, after });
    await pressEscapeUntilClosed(desktop);
    stageSamples.push({
      label: 'close-mouse',
      before: after,
      after: await readStageMetrics(desktop),
    });
    return sample;
  });

  const touch = await withClsGroup(deps, mobile, 's7-open-touch', async () => {
    await gotoFixture(mobile, fixtureUrl(base, 'a', { state: 'exploded' }), 'exploded');
    await clearPointer(mobile);
    const sweep = await sweepHitMap(mobile, MOBILE_GRID);
    const points = sweep.points['tide-chart-screen'];
    const point = toRelative([centralPoint(points, 'tide-chart-screen')], sweep.stageRect)[0];
    if (point === undefined) throw new Error('touch open point is missing');
    await tapStagePoint(mobile, point);
    const sample = await readOpenSample(mobile, 'tide-chart-screen');
    await pressEscapeUntilClosed(mobile);
    return sample;
  });

  const targets = [
    { fixture: 'a' as const, id: 'tide-repository' },
    { fixture: 'b' as const, id: 'reconciliation-ledger' },
    { fixture: 'a' as const, id: 'beachgoer' },
  ];
  const content: S7ContentSample[] = [];

  for (const target of targets) {
    const sample = await withClsGroup(deps, desktop, `s7-content-${target.id}`, async () => {
      await gotoFixture(
        desktop,
        fixtureUrl(base, target.fixture, { state: 'exploded', select: target.id }),
        'exploded',
      );
      await waitForPanelReady(desktop, true);
      await waitForPanel(desktop, 'detail');
      const actual = await readContent(desktop);
      const beforeClose = await readStageMetrics(desktop);
      await pressEscapeUntilClosed(desktop);
      stageSamples.push({
        label: `close-content-${target.id}`,
        before: beforeClose,
        after: await readStageMetrics(desktop),
      });

      const project = fixtures[target.fixture];
      const component = findComponent(project, target.id);
      return {
        id: target.id,
        actual,
        expected: expectedContent(component, fixtures.registry),
      };
    });
    content.push(sample);
  }

  if (drawCallsPanel === undefined) throw new Error('panel draw calls were not captured');
  return { mouse, touch, content, drawCallsPanel };
}

async function captureCloses(
  deps: S7CaptureDeps,
  stageSamples: S7StageSample[],
): Promise<S7CloseSample[]> {
  const { desktop, base } = deps;
  const closes: S7CloseSample[] = [];

  for (const route of CLOSE_ROUTES) {
    const sample = await withClsGroup(deps, desktop, `s7-close-${route}`, async () => {
      await gotoFixture(desktop, fixtureUrl(base, 'a', { state: 'exploded' }), 'exploded');
      await clearPointer(desktop);
      const sweep = await sweepHitMap(desktop, DESKTOP_GRID);
      const points = sweep.points['tide-chart-screen'];
      const target = toRelative([centralPoint(points, 'tide-chart-screen')], sweep.stageRect)[0];
      const empty = sweep.empty[0];
      if (target === undefined || empty === undefined) {
        throw new Error(`close route ${route} has no hit point`);
      }
      const emptyRelative = toRelative([empty], sweep.stageRect)[0];
      if (emptyRelative === undefined) throw new Error('empty point is missing');

      const beforeOpen = await readStageMetrics(desktop);
      await clickStagePoint(desktop, target);
      await waitForPanelReady(desktop, true);
      await waitForPanel(desktop, 'detail');
      const afterOpen = await readStageMetrics(desktop);
      stageSamples.push({ label: `open-close-${route}`, before: beforeOpen, after: afterOpen });
      await waitForFrames(desktop);

      switch (route) {
        case 'same-slab':
          await clickStagePoint(desktop, target);
          break;
        case 'escape':
          await desktop.keyboard.press('Escape');
          break;
        case 'outside-blank': {
          const point = await blankOutsidePoint(desktop);
          await desktop.mouse.click(point.x, point.y);
          break;
        }
        case 'outside-control':
          await desktop.locator('[data-engine-control="fixture-a"]').click();
          break;
        case 'close-control':
          await desktop.locator(PANEL_CLOSE_SELECTOR).click();
          break;
        case 'empty-canvas':
          await clickStagePoint(desktop, emptyRelative);
          break;
      }

      await waitForPanel(desktop, 'closed');
      await waitForFrames(desktop);
      await resetPageScroll(desktop);
      const focus = await readFocus(desktop);
      const afterClose = await readStageMetrics(desktop);
      stageSamples.push({ label: `close-close-${route}`, before: afterOpen, after: afterClose });

      return { route, panelAfter: await readPanelKind(desktop), focus };
    });
    closes.push(sample);
  }

  return closes;
}

async function openCaseStudy(page: Page): Promise<void> {
  await page.locator('[data-engine-control="case-study"]').click();
  await waitForPanelReady(page, true);
  await waitForPanel(page, 'case-study');
}

async function closeCaseStudyWithControl(page: Page): Promise<void> {
  await page.locator(PANEL_CLOSE_SELECTOR).click();
  await waitForPanel(page, 'closed');
  await waitForFrames(page);
}

async function captureCaseStudies(
  deps: S7CaptureDeps,
  stageSamples: S7StageSample[],
): Promise<{
  caseStudies: S7CaseStudySample[];
  caseStudyScroll: S7CaseStudyScrollObservation;
  caseStudyCloses: S7CaseStudyCloseSample[];
  caseStudyPalettes: { light: S7PaletteSample; dark: S7PaletteSample };
}> {
  const { desktop, mobile, base, fixtures } = deps;
  const caseStudies: S7CaseStudySample[] = [];
  const caseStudyCloses: S7CaseStudyCloseSample[] = [];

  for (const fixture of ['a', 'b', 'c'] as const) {
    const sample = await withClsGroup(deps, desktop, `s7-case-${fixture}`, async () => {
      await gotoFixture(desktop, fixtureUrl(base, fixture, { state: 'exploded' }), 'exploded');
      const beforeOpen = await readStageMetrics(desktop);
      await openCaseStudy(desktop);
      const afterOpen = await readStageMetrics(desktop);
      stageSamples.push({ label: `open-case-${fixture}`, before: beforeOpen, after: afterOpen });
      const expected = expectedCaseStudy(fixtures[fixture]);
      const observation = await readCaseStudySample(desktop, fixture, expected);
      await closeCaseStudyWithControl(desktop);
      const afterClose = await readStageMetrics(desktop);
      stageSamples.push({ label: `close-case-${fixture}`, before: afterOpen, after: afterClose });

      if (fixture === 'a') {
        const focus = await readFocus(desktop);
        caseStudyCloses.push({
          route: 'close-control',
          panelAfter: await readPanelKind(desktop),
          focus: { wrapper: focus.wrapper, opener: focus.opener },
        });
      }

      return observation;
    });
    caseStudies.push(sample);
  }

  const caseStudyScroll = await withClsGroup(deps, mobile, 's7-case-scroll', async () => {
    await gotoFixture(mobile, fixtureUrl(base, 'a', { state: 'exploded' }), 'exploded');
    await openCaseStudy(mobile);
    const before = await mobile.evaluate((surfaceSelector) => {
      const surface = document.querySelector(surfaceSelector);
      if (!(surface instanceof HTMLElement)) throw new Error('case study surface is missing');
      return {
        scrollHeight: surface.scrollHeight,
        clientHeight: surface.clientHeight,
        scrollTop: surface.scrollTop,
        windowY: window.scrollY,
      };
    }, PANEL_SURFACE_SELECTOR);
    const rect = await readSurfaceRect(mobile);
    if (rect === null) throw new Error('case study surface rect is missing');
    await mobile.mouse.move((rect.left + rect.right) / 2, (rect.top + rect.bottom) / 2);
    await mobile.mouse.wheel(0, 400);
    await waitForFrames(mobile);
    const after = await mobile.evaluate((surfaceSelector) => {
      const surface = document.querySelector(surfaceSelector);
      if (!(surface instanceof HTMLElement)) throw new Error('case study surface is missing');
      return {
        scrollHeight: surface.scrollHeight,
        clientHeight: surface.clientHeight,
        scrollTop: surface.scrollTop,
        windowY: window.scrollY,
      };
    }, PANEL_SURFACE_SELECTOR);
    await closeCaseStudyWithControl(mobile);

    return {
      scrollHeight: after.scrollHeight,
      clientHeight: after.clientHeight,
      scrollTopBefore: before.scrollTop,
      scrollTopAfter: after.scrollTop,
      windowYBefore: before.windowY,
      windowYAfter: after.windowY,
    };
  });

  const caseStudyPalettes = {
    light: await withClsGroup(deps, desktop, 's7-case-palette-light', async () => {
      await gotoFixture(desktop, fixtureUrl(base, 'a', { state: 'exploded' }), 'exploded');
      await setTheme(desktop, 'light');
      await openCaseStudy(desktop);
      const sample = await readPaletteSample(desktop);
      await closeCaseStudyWithControl(desktop);
      return sample;
    }),
    dark: await withClsGroup(deps, desktop, 's7-case-palette-dark', async () => {
      await gotoFixture(desktop, fixtureUrl(base, 'a', { state: 'exploded' }), 'exploded');
      await setTheme(desktop, 'dark');
      await openCaseStudy(desktop);
      const sample = await readPaletteSample(desktop);
      await closeCaseStudyWithControl(desktop);
      return sample;
    }),
  };

  for (const route of ['escape', 'toggle'] as const) {
    const sample = await withClsGroup(deps, desktop, `s7-case-close-${route}`, async () => {
      await gotoFixture(desktop, fixtureUrl(base, 'a', { state: 'exploded' }), 'exploded');
      await openCaseStudy(desktop);
      if (route === 'escape') await desktop.keyboard.press('Escape');
      else await desktop.locator('[data-engine-control="case-study"]').click();
      await waitForPanel(desktop, 'closed');
      await waitForFrames(desktop);
      const focus = await readFocus(desktop);
      return {
        route,
        panelAfter: await readPanelKind(desktop),
        focus: { wrapper: focus.wrapper, opener: focus.opener },
      };
    });
    caseStudyCloses.push(sample);
  }

  const canvasTap = await withClsGroup(deps, desktop, 's7-case-close-canvas-tap', async () => {
    await gotoFixture(desktop, fixtureUrl(base, 'a', { state: 'exploded' }), 'exploded');
    await clearPointer(desktop);
    const sweep = await sweepHitMap(desktop, DESKTOP_GRID);
    await openCaseStudy(desktop);
    const surface = await readSurfaceRect(desktop);
    const stageRect = await readStageRect(desktop);
    const empty = sweep.empty
      .map((point) => toRelative([point], sweep.stageRect)[0])
      .filter((point): point is PointObservation => point !== undefined)
      .find((point) => {
        const viewport = toViewport([point], stageRect)[0];
        if (viewport === undefined) return false;
        return (
          surface === null ||
          viewport.x < surface.left ||
          viewport.x > surface.right ||
          viewport.y < surface.top ||
          viewport.y > surface.bottom
        );
      });
    if (empty === undefined) throw new Error('case study canvas tap point is missing');
    await clickStagePoint(desktop, empty);
    await waitForPanel(desktop, 'closed');
    await waitForFrames(desktop);
    const focus = await readFocus(desktop);
    return {
      route: 'canvas-tap' as const,
      panelAfter: await readPanelKind(desktop),
      focus: { wrapper: focus.wrapper, opener: focus.opener },
    };
  });
  caseStudyCloses.push(canvasTap);

  return { caseStudies, caseStudyScroll, caseStudyCloses, caseStudyPalettes };
}

async function captureChips(deps: S7CaptureDeps): Promise<S7ChipsObservation> {
  const { desktop, base, fixtures } = deps;
  const samples: S7ChipLabelSample[] = [];
  const swatches: { light: S7SwatchSample[]; dark: S7SwatchSample[] } = {
    light: [],
    dark: [],
  };
  let chipCount = 0;
  let focusable = 0;
  let linkRoles = 0;

  const read = async (
    group: string,
    theme: S7Palette,
    componentId: string,
    collectLabels: boolean,
    collectSwatches: boolean,
  ): Promise<void> => {
    await withClsGroup(deps, desktop, group, async () => {
      await gotoFixture(desktop, fixtureUrl(base, 'a', { state: 'exploded' }), 'exploded');
      await setTheme(desktop, theme);
      await gotoFixture(
        desktop,
        fixtureUrl(base, 'a', { state: 'exploded', select: componentId }),
        'exploded',
      );
      await waitForPanelReady(desktop, true);
      await waitForPanel(desktop, 'detail');
      const chips = await readChips(desktop);
      const component = findComponent(fixtures.a, componentId);

      chipCount += chips.chips.length;
      focusable += chips.focusable;
      linkRoles += chips.linkRoles;

      if (collectLabels) {
        samples.push({
          id: componentId,
          labels: chips.chips.map((chip) => chip.label),
          expectedLabels: labelsFor(component.techs, fixtures.registry),
        });
      }

      if (collectSwatches) {
        const positions = await Promise.all(
          chips.chips.map((chip) => readCssColor(desktop, `--bp-tech-${categoryOf(chip.id)}`)),
        );
        chips.chips.forEach((chip, index) => {
          const expected = positions[index];
          if (expected === undefined) return;
          swatches[theme].push({
            chipId: chip.id,
            category: categoryOf(chip.id),
            actual: parseColor(chip.background),
            expected,
          });
        });
      }

      await pressEscapeUntilClosed(desktop);
    });
  };

  const categoryOf = (techId: string): string => {
    const tech = fixtures.registry.techs.find((candidate) => candidate.id === techId);
    if (tech === undefined) throw new Error(`registry tech is missing: ${techId}`);
    return tech.category;
  };

  await read('s7-chips-light', 'light', 'live-tide-client', true, true);
  await read('s7-chips-light-repository', 'light', 'tide-repository', true, false);
  await read('s7-chips-dark', 'dark', 'live-tide-client', false, true);

  return { samples, swatches, chipCount, focusable, linkRoles };
}

async function captureTour(
  deps: S7CaptureDeps,
): Promise<{ tour: S7TourObservation; drawCallsTour: number }> {
  const { desktop, base } = deps;
  let drawCallsTour = 0;

  const jumpPlaying = await withClsGroup(deps, desktop, 's7-tour-playing', async () => {
    await prepareTourPaused(desktop, base, 2);
    await clearPointer(desktop);
    const sweep = await sweepHitMap(desktop, DESKTOP_GRID);
    const repository = toRelative(
      [centralPoint(sweep.points['tide-repository'], 'tide-repository')],
      sweep.stageRect,
    )[0];
    if (repository === undefined) throw new Error('tide-repository point is missing');

    await desktop.locator('[data-engine-control="tour-play"]').click();
    await resetPageScroll(desktop);
    await waitForTour(desktop, 'playing');
    const before = await readTourState(desktop);

    await clickStagePoint(desktop, repository);
    await waitForTour(desktop, 'playing', 3);
    const after = await readTourState(desktop);
    drawCallsTour = await readDrawCalls(desktop);
    await waitForTour(desktop, 'playing', 4);
    const beat = await readTourState(desktop);

    return { before, after, beat };
  });

  const jumpPaused = await withClsGroup(deps, desktop, 's7-tour-paused', async () => {
    await prepareTourPaused(desktop, base, 1);
    await clearPointer(desktop);
    const sweep = await sweepHitMap(desktop, DESKTOP_GRID);
    const client = toRelative(
      [centralPoint(sweep.points['live-tide-client'], 'live-tide-client')],
      sweep.stageRect,
    )[0];
    if (client === undefined) throw new Error('live-tide-client point is missing');
    const before = await readTourState(desktop);
    await clickStagePoint(desktop, client);
    await waitForTour(desktop, 'paused', 4);
    const after = await readTourState(desktop);
    return { before, after };
  });

  const notInflow = await withClsGroup(deps, desktop, 's7-tour-notinflow', async () => {
    await prepareTourPaused(desktop, base, 1);
    await clearPointer(desktop);
    const sweep = await sweepHitMap(desktop, DESKTOP_GRID);
    const forecast = toRelative(
      [centralPoint(sweep.points['forecast-details-panel'], 'forecast-details-panel')],
      sweep.stageRect,
    )[0];
    if (forecast === undefined) throw new Error('forecast-details-panel point is missing');

    await desktop.locator('[data-engine-control="tour-play"]').click();
    await resetPageScroll(desktop);
    await waitForTour(desktop, 'playing');
    const before = await readTourState(desktop);
    const stepAtClick = before.step;
    await clickStagePoint(desktop, forecast);
    await waitForPanelReady(desktop, true);
    await waitForPanel(desktop, 'detail');
    const after = await readTourState(desktop);
    return { before, stepAtClick, after, forecast };
  });

  const resumeSameStep = await withClsGroup(deps, desktop, 's7-tour-resume', async () => {
    await desktop.locator('[data-engine-control="tour-play"]').click();
    await resetPageScroll(desktop);
    await waitForTour(desktop, 'playing');
    const afterPlay = await readTourState(desktop);
    return { paused: notInflow.after, afterPlay };
  });

  const escapeLayering = await withClsGroup(deps, desktop, 's7-tour-escape', async () => {
    await waitForTour(desktop, 'playing');
    await clickStagePoint(desktop, notInflow.forecast);
    await waitForPanelReady(desktop, true);
    await waitForPanel(desktop, 'detail');
    await desktop.keyboard.press('Escape');
    await waitForPanel(desktop, 'closed');
    await waitForFrames(desktop);
    const afterFirst = await readTourState(desktop);
    await desktop.keyboard.press('Escape');
    await waitForTour(desktop, 'idle');
    const afterSecond = await readTourState(desktop);
    return { afterFirst, afterSecond };
  });

  const jumpStableCaption = await withClsGroup(deps, desktop, 's7-tour-caption', async () => {
    await prepareTourPaused(desktop, base, 1);
    await clearPointer(desktop);
    const sweep = await sweepHitMap(desktop, DESKTOP_GRID);
    const repository = toRelative(
      [centralPoint(sweep.points['tide-repository'], 'tide-repository')],
      sweep.stageRect,
    )[0];
    if (repository === undefined) throw new Error('tide-repository point is missing');

    await installCaptionGapSampler(desktop);
    await clickStagePoint(desktop, repository);
    await waitForTour(desktop, 'paused', 3);
    await desktop.waitForTimeout(400);
    return stopCaptionGapSampler(desktop);
  });

  return {
    tour: {
      jumpPlaying,
      jumpPaused,
      notInflow: {
        before: notInflow.before,
        stepAtClick: notInflow.stepAtClick,
        after: notInflow.after,
      },
      resumeSameStep,
      escapeLayering,
      jumpStableCaption,
    },
    drawCallsTour,
  };
}

async function captureHiddenWhileMoving(
  deps: S7CaptureDeps,
): Promise<S7HiddenWhileMovingObservation> {
  const { desktop, base } = deps;

  return withClsGroup(deps, desktop, 's7-hidden-moving', async () => {
    await gotoFixture(
      desktop,
      fixtureUrl(base, 'a', { state: 'exploded', select: 'tide-repository' }),
      'exploded',
    );
    await waitForPanelReady(desktop, true);
    await waitForPanel(desktop, 'detail');
    await movePointerAway(desktop);
    const sweep = await sweepHitMap(desktop, DESKTOP_GRID);
    const relativePoints = toRelative(sweep.points['tide-repository'] ?? [], sweep.stageRect);
    if (relativePoints.length === 0) throw new Error('tide-repository hit points are missing');

    await desktop.evaluate((selector) => {
      const viewer = document.querySelector(selector);
      if (viewer instanceof HTMLElement) viewer.focus();
    }, VIEWER_SELECTOR);
    await desktop.evaluate(
      ({ viewerSelector, layerSelector, surfaceSelector, stageSelector, points }) => {
        const target = window as unknown as {
          __s7HiddenMoving?: {
            frames: S7HiddenFrame[];
            active: boolean;
            sawMoving: boolean;
          };
        };
        const viewer = document.querySelector(viewerSelector) as HTMLElement | null;
        const stage = document.querySelector(stageSelector);
        if (!(viewer instanceof HTMLElement) || !(stage instanceof HTMLElement)) {
          throw new Error('viewer or stage is missing');
        }
        const state = { frames: [] as S7HiddenFrame[], active: true, sawMoving: false };
        target.__s7HiddenMoving = state;

        const tick = () => {
          if (!state.active) return;
          const ready = viewer.dataset.xploderPanelReady;
          if (ready === 'false') state.sawMoving = true;
          if (!state.sawMoving) {
            requestAnimationFrame(tick);
            return;
          }
          if (ready === 'true') {
            state.active = false;
            return;
          }

          const layer = document.querySelector(layerSelector);
          const surface = document.querySelector(surfaceSelector);
          const stageRect = stage.getBoundingClientRect();
          const hidden =
            !(layer instanceof HTMLElement) ||
            !(surface instanceof HTMLElement) ||
            getComputedStyle(layer).visibility === 'hidden';
          const rect = surface instanceof HTMLElement ? surface.getBoundingClientRect() : null;
          let inside = false;

          if (!hidden && rect !== null) {
            inside = points.some((point) => {
              const x = point.x + stageRect.left;
              const y = point.y + stageRect.top;
              return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
            });
          }

          state.frames.push({
            hidden,
            inside,
            phase: ready === 'false' ? 'moving' : 'before',
          });
          requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      },
      {
        viewerSelector: VIEWER_SELECTOR,
        layerSelector: PANEL_LAYER_SELECTOR,
        surfaceSelector: PANEL_SURFACE_SELECTOR,
        stageSelector: STAGE_SELECTOR,
        points: relativePoints,
      },
    );

    await waitForFrames(desktop);
    await desktop.keyboard.press('ArrowRight');

    try {
      await desktop.waitForFunction(
        (selector) =>
          (document.querySelector(selector) as HTMLElement | null)?.dataset.xploderPanelReady ===
          'false',
        VIEWER_SELECTOR,
        { timeout: 5000 },
      );
      await desktop.waitForFunction(
        (selector) =>
          (document.querySelector(selector) as HTMLElement | null)?.dataset.xploderPanelReady ===
          'true',
        VIEWER_SELECTOR,
        { timeout: WAIT_TIMEOUT_MS },
      );
    } catch {
      // The settle check below still measures the panel against fresh hit points.
    }

    await waitForFrames(desktop);
    const frames = await desktop.evaluate(() => {
      const target = window as unknown as {
        __s7HiddenMoving?: {
          frames: S7HiddenFrame[];
          active: boolean;
        };
      };
      const state = target.__s7HiddenMoving;
      if (state === undefined) throw new Error('hidden-moving sampler was not installed');
      state.active = false;
      return state.frames;
    });

    await movePointerAway(desktop);
    const settledSweep = await sweepHitMap(desktop, DESKTOP_GRID);
    const settledRelative = toRelative(
      settledSweep.points['tide-repository'] ?? [],
      settledSweep.stageRect,
    );
    const surfaceRect = await readSurfaceRect(desktop);
    const stageRect = await readStageRect(desktop);
    const hidden = await desktop.evaluate((selector) => {
      const layer = document.querySelector(selector);
      return !(layer instanceof HTMLElement) || getComputedStyle(layer).visibility === 'hidden';
    }, PANEL_LAYER_SELECTOR);
    const pointsInside =
      surfaceRect === null
        ? settledRelative.length
        : settledRelative.filter((point) => {
            const viewport = toViewport([point], stageRect)[0];
            return viewport !== undefined && pointInRect(viewport, surfaceRect);
          }).length;

    return {
      frames,
      settled: {
        surfaceFound: surfaceRect !== null,
        hidden,
        pointCount: settledRelative.length,
        pointsInside,
      },
    };
  });
}

async function captureReducedMotion(deps: S7CaptureDeps): Promise<S7ReducedMotionObservation> {
  const { reduced, base } = deps;

  return withClsGroup(deps, reduced, 's7-reduced-motion', async () => {
    await gotoFixture(
      reduced,
      fixtureUrl(base, 'a', { state: 'exploded', select: 'tide-repository' }),
      'exploded',
    );
    await waitForPanelReady(reduced, true);
    await waitForPanel(reduced, 'detail');
    return reduced.evaluate((selector) => {
      const surface = document.querySelector(selector);
      if (!(surface instanceof HTMLElement)) {
        return { surfaceFound: false, animations: 0, opacity: 0 };
      }
      return {
        surfaceFound: true,
        animations: surface.getAnimations({ subtree: true }).length,
        opacity: Number.parseFloat(getComputedStyle(surface).opacity),
      };
    }, PANEL_SURFACE_SELECTOR);
  });
}

async function captureMaxZoom(deps: S7CaptureDeps): Promise<S7MaxZoomObservation> {
  const { desktop, base, outDir } = deps;

  return withClsGroup(deps, desktop, 's7-max-zoom', async () => {
    await gotoFixture(
      desktop,
      fixtureUrl(base, 'a', { state: 'exploded', select: 'tide-repository' }),
      'exploded',
    );
    await waitForPanelReady(desktop, true);
    await waitForPanel(desktop, 'detail');
    await zoomToMax(desktop);
    await resetPageScroll(desktop);

    const hoverCandidate = async (
      edge: 'top' | 'bottom',
      layerIds: readonly string[],
    ): Promise<{ id: string; hovered: boolean; outside: boolean } | null> => {
      await scrollStage(desktop, edge);
      await movePointerAway(desktop);
      const sweep = await sweepHitMap(desktop, DESKTOP_GRID);
      const surface = await readSurfaceRect(desktop);
      const stageRect = await readStageRect(desktop);
      const candidate = layerIds.find((id) => (sweep.points[id]?.length ?? 0) > 0);
      if (candidate === undefined) return null;
      const point = centralPoint(sweep.points[candidate], candidate);
      const relative = toRelative([point], sweep.stageRect)[0];
      if (relative === undefined) return null;
      const viewport = toViewport([relative], stageRect)[0];
      if (viewport === undefined) return null;
      const outside = surface === null || !pointInRect(viewport, surface);
      await desktop.mouse.move(viewport.x, viewport.y);
      await waitForViewerAttribute(desktop, 'data-xploder-highlight', candidate);
      return { id: candidate, hovered: true, outside };
    };

    const top = await hoverCandidate('top', FIXTURE_A_TOP_LAYER);
    await desktop.screenshot({ path: join(outDir, 's7-maxzoom-top.png') });
    const bottom = await hoverCandidate('bottom', FIXTURE_A_BOTTOM_LAYER);
    await desktop.screenshot({ path: join(outDir, 's7-maxzoom-bottom.png') });
    const zoom = await readNumberAttribute(desktop, 'data-xploder-zoom');

    return { zoom, top, bottom };
  });
}

async function captureKeysIsolated(deps: S7CaptureDeps): Promise<S7ArrowIsolationObservation> {
  const { desktop, base } = deps;

  return withClsGroup(deps, desktop, 's7-keys-isolated', async () => {
    await gotoFixture(
      desktop,
      fixtureUrl(base, 'a', { state: 'exploded', select: 'tide-repository' }),
      'exploded',
    );
    await waitForPanelReady(desktop, true);
    await waitForPanel(desktop, 'detail');
    await desktop.locator(PANEL_CLOSE_SELECTOR).focus();
    const closeFocused = await desktop.evaluate(
      (selector) => document.activeElement?.matches(selector) === true,
      PANEL_CLOSE_SELECTOR,
    );
    const before = await readNumberAttribute(desktop, 'data-xploder-azimuth');
    await desktop.keyboard.press('ArrowLeft');
    await waitForFrames(desktop);
    const after = await readNumberAttribute(desktop, 'data-xploder-azimuth');
    await pressEscapeUntilClosed(desktop);
    return { before, after, closeFocused };
  });
}

export async function captureS7(deps: S7CaptureDeps): Promise<S7Observation> {
  const stageSamples: S7StageSample[] = [];
  const { samples: neverCovers, fixtures } = await captureNeverCovers(deps, stageSamples);
  const { mouse, touch, content, drawCallsPanel } = await captureOpenAndContent(deps, stageSamples);
  const closes = await captureCloses(deps, stageSamples);
  const arrowIsolation = await captureKeysIsolated(deps);
  const { caseStudies, caseStudyScroll, caseStudyCloses, caseStudyPalettes } =
    await captureCaseStudies(deps, stageSamples);
  const chips = await captureChips(deps);
  const { tour, drawCallsTour } = await captureTour(deps);
  const hiddenWhileMoving = await captureHiddenWhileMoving(deps);
  const reducedMotion = await captureReducedMotion(deps);
  const maxZoom = await captureMaxZoom(deps);
  const cls = deps.collectCls([deps.desktop, deps.mobile, deps.reduced]);

  return {
    fixtures,
    neverCovers,
    open: { mouse, touch },
    content,
    closes,
    arrowIsolation,
    caseStudies,
    caseStudyScroll,
    caseStudyCloses,
    caseStudyPalettes,
    chips,
    tour,
    cls,
    stageSamples,
    hiddenWhileMoving,
    reducedMotion,
    drawCalls: { panel: drawCallsPanel, tour: drawCallsTour },
    maxZoom,
  };
}
