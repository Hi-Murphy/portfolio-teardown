import { describe, expect, test } from 'vitest';

import {
  evaluateProbe,
  type EngineProbeObservation,
  type LayoutShiftObservation,
  type PixelObservation,
  type S5Observation,
  type S6Observation,
  totalLayoutShift,
} from '../src/engine-probe.ts';

const BLACK: PixelObservation = { r: 0, g: 0, b: 0 };
const MID: PixelObservation = { r: 100, g: 100, b: 100 };
const ACCENTWARD: PixelObservation = { r: 10, g: 10, b: 10 };
const WHITE: PixelObservation = { r: 255, g: 255, b: 255 };
const PAPERWARD: PixelObservation = { r: 160, g: 160, b: 160 };
const LIGHT_PAPER: PixelObservation = { r: 246, g: 243, b: 234 };
const LIGHT_LINE: PixelObservation = { r: 30, g: 77, b: 140 };
const DARK_PAPER: PixelObservation = { r: 11, g: 26, b: 46 };
const DARK_LINE: PixelObservation = { r: 140, g: 196, b: 238 };
const OFF: PixelObservation = { r: 1, g: 2, b: 3 };
const LIVE_UPDATE = [
  'beachgoer',
  'tide-chart-screen',
  'tide-view-model',
  'tide-repository',
  'live-tide-client',
  'tide-feed',
];
const OFFLINE_READ = [...LIVE_UPDATE.slice(0, 4), 'tide-cache'];
const PICKUP_READY = [
  'recipient',
  'pickup-app',
  'pickup-api',
  'booking-service',
  'locker-registry',
  'notifier',
  'push-gateway',
];
const PUSH_FAILED = [
  'booking-service',
  'notifier',
  'push-gateway',
  'retry-scheduler',
  'dead-letter-store',
];
const FIXTURE_A_COMPONENTS = [
  'beachgoer',
  'forecast-details-panel',
  'live-tide-client',
  'tide-cache',
  'tide-chart-screen',
  'tide-feed',
  'tide-repository',
  'tide-view-model',
];
const FIXTURE_C_COMPONENTS = [
  'recipient',
  'pickup-app',
  'pickup-api',
  'session-gate',
  'booking-service',
  'notifier',
  'retry-scheduler',
  'slot-planner',
  'audit-trail',
  'locker-registry',
  'dead-letter-store',
  'push-gateway',
  'locker-hardware',
];

function tracePrefixes(path: readonly string[]): string[] {
  return path.map((_, index) => path.slice(0, index + 1).join(' '));
}

function passingS5(): S5Observation {
  const captionAnchorSamples = Array.from({ length: 14 }, (_, index) => ({
    viewport: index < 7 ? ('desktop' as const) : ('mobile' as const),
    step: index % 7,
    target: 'recipient',
    point: { x: 10, y: 10 },
    caption: { left: 20, top: 20, right: 40, bottom: 40 },
    outside: true,
  }));

  return {
    hitMap: {
      grid: { cols: 40, rows: 24 },
      exploded: Object.fromEntries(
        [
          'beachgoer',
          'forecast-details-panel',
          'live-tide-client',
          'tide-cache',
          'tide-chart-screen',
          'tide-feed',
          'tide-repository',
          'tide-view-model',
        ].map((id) => [id, [{ x: 1, y: 1 }]]),
      ),
      imploded: Object.fromEntries(
        ['beachgoer', 'forecast-details-panel', 'tide-chart-screen'].map((id) => [
          id,
          [{ x: 1, y: 1 }],
        ]),
      ),
    },
    hover: {
      exploded: {
        target: 'tide-chart-screen',
        highlight: 'tide-chart-screen',
        cursor: 'pointer',
        pixelBefore: MID,
        pixelAfter: ACCENTWARD,
        accent: BLACK,
        clearAfterLeave: true,
      },
      imploded: {
        target: 'tide-chart-screen',
        highlight: 'tide-chart-screen',
        cursor: 'pointer',
        pixelBefore: MID,
        pixelAfter: ACCENTWARD,
        accent: BLACK,
        clearAfterLeave: true,
      },
    },
    touch: {
      exploded: {
        firstTarget: 'beachgoer',
        secondTarget: 'tide-feed',
        afterFirst: 'beachgoer',
        afterSecondTap: null,
        afterOtherTap: 'tide-feed',
        afterEmptyTap: null,
        afterOutsideTap: null,
      },
      imploded: {
        firstTarget: 'beachgoer',
        secondTarget: 'tide-chart-screen',
        afterFirst: 'beachgoer',
        afterSecondTap: null,
        afterOtherTap: 'tide-chart-screen',
        afterEmptyTap: null,
        afterOutsideTap: null,
      },
      trace: [
        { type: 'pointerdown', pointerType: 'touch', t: 1 },
        { type: 'pointerup', pointerType: 'touch', t: 2 },
        { type: 'click', pointerType: 'touch', t: 3 },
      ],
    },
    cls: { total: 0, entries: [] },
    clsLoad: {
      total: 0.000616,
      entries: [
        {
          value: 0.000616,
          startTime: 320,
          hadRecentInput: false,
          page: 'desktop',
          group: 's4-fixtures-camera',
          sources: [
            {
              node: {
                tag: 'button',
                dataAttributes: { 'data-engine-control': 'rotate-right' },
                parentTag: 'section',
                text: 'Rotate right',
              },
              previousRect: { x: 0, y: 640, width: 44, height: 44 },
              currentRect: { x: 0, y: 637, width: 44, height: 44 },
            },
          ],
        },
      ],
      note: 'pre-ready page-load shifts (F7)',
    },
    focus: {
      target: 'tide-view-model',
      pixelBefore: MID,
      pixelAfter: PAPERWARD,
      paper: WHITE,
      toggleLayer: 'ui',
      escapeLayer: null,
      toggleReleaseLayer: null,
      afterExplode: { state: 'exploded', layer: 'ui' },
      afterRotate: { azimuth: 135, layer: 'ui' },
    },
    tour: {
      flows: [
        {
          fixture: 'a',
          flowId: 'live-update',
          timeline: LIVE_UPDATE,
          stepNumbers: [0, 1, 2, 3, 4, 5],
          stop: { status: 'idle', captionVisible: false },
          camera: { azimuths: [45, 45, 45, 45, 45, 45], zooms: [1, 1, 1, 1, 1, 1] },
        },
        {
          fixture: 'a',
          flowId: 'offline-read',
          timeline: [...LIVE_UPDATE.slice(0, 4), 'tide-cache'],
          stepNumbers: [0, 1, 2, 3, 4],
          stop: { status: 'idle', captionVisible: false },
          camera: { azimuths: [45, 45, 45, 45, 45], zooms: [1, 1, 1, 1, 1] },
        },
        {
          fixture: 'c',
          flowId: 'pickup-ready',
          timeline: [
            'recipient',
            'pickup-app',
            'pickup-api',
            'booking-service',
            'locker-registry',
            'notifier',
            'push-gateway',
          ],
          stepNumbers: [0, 1, 2, 3, 4, 5, 6],
          stop: { status: 'idle', captionVisible: false },
          camera: { azimuths: [45, 45, 45, 45, 45, 45, 45], zooms: [1, 1, 1, 1, 1, 1, 1] },
        },
        {
          fixture: 'c',
          flowId: 'push-failed',
          timeline: [
            'booking-service',
            'notifier',
            'push-gateway',
            'retry-scheduler',
            'dead-letter-store',
          ],
          stepNumbers: [0, 1, 2, 3, 4],
          stop: { status: 'idle', captionVisible: false },
          camera: { azimuths: [45, 45, 45, 45, 45], zooms: [1, 1, 1, 1, 1] },
        },
      ],
      normalCadenceMs: [1600, 1605],
      pause: { stepAtPause: 2, stepAfterHold: 2 },
      focusSuspended: { during: true, after: true, layerAfter: 'ui' },
    },
    selector: {
      a: { flowButtons: 2, visible: true },
      b: { flowButtons: 0, visible: false },
      c: { flowButtons: 2, visible: true },
    },
    caption: {
      light: {
        userSelect: 'text',
        selectedText: 'Recipient',
        text: 'Recipient',
        color: BLACK,
        background: WHITE,
        expectedColor: BLACK,
        expectedBackground: WHITE,
      },
      dark: {
        userSelect: 'text',
        selectedText: 'Recipient',
        text: 'Recipient',
        color: WHITE,
        background: BLACK,
        expectedColor: WHITE,
        expectedBackground: BLACK,
      },
    },
    reduced: {
      hover: {
        target: 'tide-chart-screen',
        frameDelta: 1,
        highlight: 'tide-chart-screen',
        tweening: ['false'],
        pulse: ['false'],
      },
      focus: {
        target: 'ui',
        frameDelta: 1,
        highlight: 'ui',
        tweening: ['false'],
        pulse: ['false'],
      },
      tour: {
        timeline: LIVE_UPDATE,
        framesPerStep: [1, 1, 1, 1, 1],
        intervalsMs: [1600, 1600, 1600, 1600, 1600],
        tweening: ['false'],
        pulse: ['false'],
      },
    },
    scroll: {
      zoomOneOverflow: 0,
      zoomedOverflow: 903,
      zoomedTo: 2.25,
      topHits: ['beachgoer'],
      bottomHits: ['tide-feed'],
      cameraBefore: { azimuth: 45, zoom: 2.25 },
      cameraAfter: { azimuth: 45, zoom: 2.25 },
    },
    captionAnchor: { samples: captionAnchorSamples },
  };
}

function passingS6(): S6Observation {
  const edgeScan = Array.from({ length: 60 }, (_, index) =>
    index === 30 ? LIGHT_LINE : LIGHT_PAPER,
  );
  const darkEdgeScan = Array.from({ length: 60 }, (_, index) =>
    index === 30 ? DARK_LINE : DARK_PAPER,
  );
  const overlayDefaults = (['a', 'b', 'c'] as const).flatMap((fixture) =>
    (['imploded', 'exploded'] as const).flatMap((state) =>
      (['mobile', 'desktop'] as const).map((viewport) => ({
        fixture,
        state,
        viewport,
        titleBlock: state === 'imploded' ? 'shown' : 'hidden',
        overlay: 'shown',
        hidden: '0',
        labelCount: state === 'imploded' ? 0 : 3,
      })),
    ),
  );
  const overlay360 = (['a', 'c'] as const).flatMap((fixture) =>
    (['imploded', 'exploded'] as const).flatMap((state) =>
      (['light', 'dark'] as const).map((theme) => ({
        fixture,
        state,
        theme,
        viewer: { left: 0, top: 0, right: 360, bottom: 740 },
        boxes: [
          {
            key: state === 'imploded' ? 'titleblock' : 'layer:ui',
            left: 10,
            top: 10,
            right: 110,
            bottom: 30,
            fontSize: 12,
          },
          {
            key: 'dimension:stack',
            left: 10,
            top: 40,
            right: 110,
            bottom: 60,
            fontSize: 12,
          },
        ],
      })),
    ),
  );
  const lightExpected = {
    label: { r: 74, g: 80, b: 89 },
    ink: { r: 34, g: 38, b: 43 },
    steel: { r: 86, g: 103, b: 122 },
  };
  const darkExpected = {
    label: { r: 167, g: 184, b: 203 },
    ink: { r: 230, g: 237, b: 245 },
    steel: { r: 143, g: 163, b: 184 },
  };

  return {
    palette: {
      light: { fill: LIGHT_PAPER, edgeScan, paper: LIGHT_PAPER, line: LIGHT_LINE },
      dark: { fill: DARK_PAPER, edgeScan: darkEdgeScan, paper: DARK_PAPER, line: DARK_LINE },
      kinds: { store: { r: 151, g: 86, b: 15 }, service: { r: 122, g: 62, b: 157 } },
      toggle: { fill: DARK_PAPER, lightPaper: LIGHT_PAPER, darkPaper: DARK_PAPER },
      osDarkFirstPaint: {
        background: DARK_PAPER,
        fill: DARK_PAPER,
        lightPaper: LIGHT_PAPER,
        darkPaper: DARK_PAPER,
      },
    },
    overlayDefaults,
    overlay360,
    selectable: {
      userSelect: 'text',
      titleUserSelect: 'text',
      layerText: '01 UI',
      selectedLayerText: '01 UI',
      titleRowText: '01 UI',
      selectedTitleRowText: '01 UI',
    },
    colours: {
      light: {
        layer: lightExpected.label,
        part: lightExpected.ink,
        dimension: lightExpected.steel,
        title: lightExpected.ink,
        expected: lightExpected,
      },
      dark: {
        layer: darkExpected.label,
        part: darkExpected.ink,
        dimension: darkExpected.steel,
        title: darkExpected.ink,
        expected: darkExpected,
      },
    },
    hitThrough: {
      hoverTarget: 'tide-chart-screen',
      hoverHighlight: 'tide-chart-screen',
      tapTarget: 'tide-chart-screen',
      tapHighlight: 'tide-chart-screen',
      labelTarget: 'layer:ui',
      afterLabelTap: null,
    },
    cls: { total: 0, entries: [] },
    trace: {
      flows: [
        { fixture: 'a', flowId: 'live-update', traces: tracePrefixes(LIVE_UPDATE), stopTrace: '' },
        {
          fixture: 'a',
          flowId: 'offline-read',
          traces: tracePrefixes(OFFLINE_READ),
          stopTrace: '',
        },
        {
          fixture: 'c',
          flowId: 'pickup-ready',
          traces: tracePrefixes(PICKUP_READY),
          stopTrace: '',
        },
        {
          fixture: 'c',
          flowId: 'push-failed',
          traces: tracePrefixes(PUSH_FAILED),
          stopTrace: '',
        },
      ],
      reducedMotion: {
        samples: [
          { step: 1, trace: 'beachgoer tide-chart-screen', animations: 0 },
          {
            step: 3,
            trace: 'beachgoer tide-chart-screen tide-view-model tide-repository',
            animations: 0,
          },
        ],
      },
    },
    defaultGap: { a: FIXTURE_A_COMPONENTS, c: FIXTURE_C_COMPONENTS },
    drawCallsMidTour: 2,
    blink: {
      throttle: 4,
      rounds: 4,
      framesSampled: 900,
      blinkFrames: 0,
      stuckHiddenAfterSettle: [],
    },
  };
}

function passingObservation(): EngineProbeObservation {
  return {
    fixtures: {
      a: { instances: { layers: 4, components: 8 }, drawCalls: 2 },
      b: { instances: { layers: 4, components: 5 }, drawCalls: 2 },
      c: { instances: { layers: 5, components: 13 }, drawCalls: 2 },
    },
    camera: {
      defaultAzimuth: 45,
      afterButtonRight: 135,
      afterArrowRight: 225,
      zoomAfter20In: 3,
      zoomAfter20Out: 1,
      zoomAfterReset: 1,
      disabledAtDefault: { zoomOut: true, zoomReset: true },
      disabledAtMax: { zoomIn: true },
    },
    motion: {
      explode: { phases: ['exploding', 'exploded'], settledMs: 1234 },
      implode: { phases: ['imploding', 'imploded'], settledMs: 987 },
    },
    reducedMotion: {
      initialState: 'exploded',
      afterToggle: { phases: ['imploded'], framesIn1s: 1 },
      afterToggleBack: { phases: ['exploded'], framesIn1s: 1 },
    },
    s5: passingS5(),
    s6: passingS6(),
  };
}

function failS4Check(observation: EngineProbeObservation, name: string): void {
  switch (name) {
    case 'fixture-a-instances':
      observation.fixtures.a.instances.components = 7;
      break;
    case 'fixture-a-draw-calls':
      observation.fixtures.a.drawCalls = 1;
      break;
    case 'fixture-b-instances':
      observation.fixtures.b.instances.components = 6;
      break;
    case 'fixture-b-draw-calls':
      observation.fixtures.b.drawCalls = 1;
      break;
    case 'fixture-c-instances':
      observation.fixtures.c.instances.components = 12;
      break;
    case 'fixture-c-draw-calls':
      observation.fixtures.c.drawCalls = 1;
      break;
    case 'camera-default-azimuth':
      observation.camera.defaultAzimuth = 0;
      break;
    case 'camera-after-button-right':
      observation.camera.afterButtonRight = 90;
      break;
    case 'camera-after-arrow-right':
      observation.camera.afterArrowRight = 180;
      break;
    case 'camera-zoom-after-20-in':
      observation.camera.zoomAfter20In = 2;
      break;
    case 'camera-zoom-after-20-out':
      observation.camera.zoomAfter20Out = 2;
      break;
    case 'camera-zoom-after-reset':
      observation.camera.zoomAfterReset = 2;
      break;
    case 'camera-zoom-out-disabled-at-default':
      observation.camera.disabledAtDefault.zoomOut = false;
      break;
    case 'camera-zoom-reset-disabled-at-default':
      observation.camera.disabledAtDefault.zoomReset = false;
      break;
    case 'camera-zoom-in-disabled-at-max':
      observation.camera.disabledAtMax.zoomIn = false;
      break;
    case 'motion-explode-phases':
      observation.motion.explode.phases = ['exploding'];
      break;
    case 'motion-implode-phases':
      observation.motion.implode.phases = ['imploding'];
      break;
    case 'reduced-motion-initial-state':
      observation.reducedMotion.initialState = 'imploded';
      break;
    case 'reduced-motion-toggle-phases':
      observation.reducedMotion.afterToggle.phases = ['exploded', 'imploded'];
      break;
    case 'reduced-motion-toggle-frames':
      observation.reducedMotion.afterToggle.framesIn1s = 3;
      break;
    case 'reduced-motion-toggle-back-phases':
      observation.reducedMotion.afterToggleBack.phases = ['imploded', 'exploded'];
      break;
    case 'reduced-motion-toggle-back-frames':
      observation.reducedMotion.afterToggleBack.framesIn1s = 3;
      break;
    default:
      throw new Error(`no failure mutation for ${name}`);
  }
}

type S5Group =
  | 'hitMap'
  | 'hover'
  | 'touch'
  | 'cls'
  | 'focus'
  | 'tour'
  | 'selector'
  | 'caption'
  | 'reduced'
  | 'scroll'
  | 'captionAnchor';

function failS5Group(observation: EngineProbeObservation, group: S5Group): void {
  const s5 = observation.s5;
  if (s5 === undefined) throw new Error('S5 fixture is missing');

  switch (group) {
    case 'hitMap':
      delete s5.hitMap.exploded['tide-feed'];
      break;
    case 'hover':
      s5.hover.exploded.pixelAfter = MID;
      break;
    case 'touch':
      s5.touch.exploded.afterSecondTap = 'beachgoer';
      break;
    case 'cls':
      s5.cls = {
        total: 0.01,
        entries: [
          {
            value: 0.01,
            startTime: 1,
            hadRecentInput: false,
            page: 'desktop',
            group: 'caption',
            sources: [
              {
                node: {
                  tag: 'div',
                  dataAttributes: { 'data-xploder-caption': '' },
                  parentTag: 'div',
                  text: 'Recipient',
                },
                previousRect: { x: 0, y: 0, width: 100, height: 20 },
                currentRect: { x: 0, y: 0, width: 100, height: 40 },
              },
            ],
          },
        ],
      };
      break;
    case 'focus':
      s5.focus.escapeLayer = 'ui';
      break;
    case 'tour': {
      const flow = s5.tour.flows[0];
      if (flow !== undefined) flow.timeline = [...flow.timeline].reverse();
      break;
    }
    case 'selector':
      s5.selector.b = { flowButtons: 1, visible: true };
      break;
    case 'caption':
      s5.caption.light.expectedColor = WHITE;
      break;
    case 'reduced':
      s5.reduced.tour.framesPerStep[0] = 2;
      break;
    case 'scroll':
      s5.scroll.zoomOneOverflow = 2;
      break;
    case 'captionAnchor': {
      const sample = s5.captionAnchor.samples[0];
      if (sample !== undefined) sample.outside = false;
      break;
    }
  }
}

function failS6Check(observation: EngineProbeObservation, name: string): void {
  const s6 = observation.s6;
  if (s6 === undefined) throw new Error('S6 fixture is missing');

  switch (name) {
    case 'bp-fill-near-paper-light':
      s6.palette.light.fill = LIGHT_LINE;
      break;
    case 'bp-fill-near-paper-dark':
      s6.palette.dark.fill = DARK_LINE;
      break;
    case 'bp-edge-ink-light':
      s6.palette.light.edgeScan = Array.from({ length: 60 }, () => LIGHT_PAPER);
      break;
    case 'bp-edge-ink-dark':
      s6.palette.dark.edgeScan = Array.from({ length: 60 }, () => DARK_PAPER);
      break;
    case 'bp-kind-distinct':
      s6.palette.kinds.service = s6.palette.kinds.store;
      break;
    case 'bp-toggle-switches':
      s6.palette.toggle.fill = s6.palette.toggle.lightPaper;
      break;
    case 'bp-os-dark-first-paint':
      s6.palette.osDarkFirstPaint.background = s6.palette.osDarkFirstPaint.lightPaper;
      break;
    case 'overlay-360-boxes': {
      const box = s6.overlay360[0]?.boxes[0];
      if (box === undefined) throw new Error('360 box is missing');
      box.fontSize = 11;
      break;
    }
    case 'overlay-selectable':
      s6.selectable.selectedLayerText = 'wrong';
      break;
    case 'overlay-colors-light':
      s6.colours.light.layer = OFF;
      break;
    case 'overlay-colors-dark':
      s6.colours.dark.layer = OFF;
      break;
    case 'overlay-hit-through':
      s6.hitThrough.afterLabelTap = s6.hitThrough.tapTarget;
      break;
    case 'overlay-cls-zero':
      s6.cls.entries.push({
        value: 0.01,
        startTime: 1,
        hadRecentInput: false,
        page: 'desktop',
        group: 's6-overlay-default',
        sources: [
          {
            node: {
              tag: 'div',
              dataAttributes: { 'data-xploder-label': 'layer:ui' },
              parentTag: 'div',
              text: 'UI',
              inOverlay: true,
            },
            previousRect: { x: 0, y: 0, width: 100, height: 20 },
            currentRect: { x: 0, y: 0, width: 100, height: 40 },
          },
        ],
      });
      break;
    case 'trace-stop-clears': {
      const flow = s6.trace.flows[0];
      if (flow === undefined) throw new Error('trace flow is missing');
      flow.stopTrace = 'beachgoer';
      break;
    }
    case 'rm-trace-static':
      s6.trace.reducedMotion.samples[0]!.animations = 1;
      break;
    case 'default-gap-hitmap-a':
      s6.defaultGap.a = s6.defaultGap.a.slice(0, -1);
      break;
    case 'default-gap-hitmap-c':
      s6.defaultGap.c = s6.defaultGap.c.slice(0, -1);
      break;
    case 'draw-calls-mid-tour':
      s6.drawCallsMidTour = 1;
      break;
    case 'overlay-no-blink':
      s6.blink.blinkFrames = 1;
      break;
    default: {
      const overlay = /^overlay-default-(a|b|c)-(imploded|exploded)-(mobile|desktop)$/.exec(name);
      if (overlay !== null) {
        const sample = s6.overlayDefaults.find(
          (candidate) =>
            candidate.fixture === overlay[1] &&
            candidate.state === overlay[2] &&
            candidate.viewport === overlay[3],
        );
        if (sample === undefined) throw new Error('overlay default sample is missing');
        if (sample.state === 'imploded') sample.titleBlock = 'hidden';
        else sample.overlay = 'hidden';
        break;
      }

      const trace = /^trace-order-(a|c)-(.+)$/.exec(name);
      if (trace !== null) {
        const flow = s6.trace.flows.find(
          (candidate) => candidate.fixture === trace[1] && candidate.flowId === trace[2],
        );
        if (flow === undefined) throw new Error('trace flow is missing');
        flow.traces[0] = 'wrong';
        break;
      }

      throw new Error(`no failure mutation for ${name}`);
    }
  }
}

describe('evaluateProbe', () => {
  test('sums layout shifts across every page and probe group', () => {
    const entries: LayoutShiftObservation[] = [
      {
        value: 0.01,
        startTime: 10,
        hadRecentInput: false,
        page: 'desktop',
        group: 'tour',
        sources: [],
      },
      {
        value: 0.002,
        startTime: 20,
        hadRecentInput: true,
        page: 'mobile',
        group: 'scroll',
        sources: [],
      },
    ];

    expect(totalLayoutShift(entries)).toBeCloseTo(0.012, 12);
  });

  test('passes the complete synthetic observation', () => {
    const result = evaluateProbe(passingObservation());

    expect(result.pass).toBe(true);
    expect(result.checks).toHaveLength(104);
    expect(result.checks.every((check) => check.pass)).toBe(true);
  });

  test('fails each S4 check once without failing another', () => {
    const baseline = evaluateProbe(passingObservation(), 's4');

    for (const check of baseline.checks) {
      const observation = structuredClone(passingObservation());
      failS4Check(observation, check.name);
      const result = evaluateProbe(observation, 's4');

      expect(result.pass).toBe(false);
      expect(
        result.checks.filter((candidate) => !candidate.pass).map((candidate) => candidate.name),
      ).toEqual([check.name]);
    }
  });

  test.each([
    'hitMap',
    'hover',
    'touch',
    'cls',
    'focus',
    'tour',
    'selector',
    'caption',
    'reduced',
    'scroll',
    'captionAnchor',
  ] satisfies S5Group[])('fails an S5 %s observation', (group) => {
    const observation = structuredClone(passingObservation());
    failS5Group(observation, group);
    const result = evaluateProbe(observation, 's5');

    expect(result.pass).toBe(false);
    expect(result.checks.some((check) => !check.pass)).toBe(true);
  });

  test('fails each S6 check once without failing another', () => {
    const baseline = evaluateProbe(passingObservation(), 's6');

    expect(baseline.checks).toHaveLength(35);
    expect(baseline.pass).toBe(true);

    for (const check of baseline.checks) {
      const observation = structuredClone(passingObservation());
      failS6Check(observation, check.name);
      const result = evaluateProbe(observation, 's6');

      expect(result.pass).toBe(false);
      expect(
        result.checks.filter((candidate) => !candidate.pass).map((candidate) => candidate.name),
      ).toEqual([check.name]);
    }
  });
});
