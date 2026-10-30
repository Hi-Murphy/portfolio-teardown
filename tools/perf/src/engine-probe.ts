export interface FixtureObservation {
  instances: { layers: number; components: number };
  drawCalls: number;
}

export interface MotionObservation {
  phases: string[];
  settledMs: number;
}

export interface ReducedMotionObservation {
  phases: string[];
  framesIn1s: number;
}

export interface PointObservation {
  x: number;
  y: number;
}

export interface PixelObservation {
  r: number;
  g: number;
  b: number;
}

export interface HitMapObservation {
  grid: { cols: number; rows: number };
  imploded: Record<string, PointObservation[]>;
  exploded: Record<string, PointObservation[]>;
}

export interface HoverSampleObservation {
  target: string;
  highlight: string | null;
  cursor: string;
  pixelBefore: PixelObservation;
  pixelAfter: PixelObservation;
  accent: PixelObservation;
  clearAfterLeave: boolean;
}

export interface HoverObservation {
  exploded: HoverSampleObservation;
  imploded: HoverSampleObservation;
}

export interface TouchStateObservation {
  firstTarget: string;
  secondTarget: string;
  afterFirst: string | null;
  afterSecondTap: string | null;
  afterOtherTap: string | null;
  afterEmptyTap: string | null;
  afterOutsideTap: string | null;
}

export interface TouchTraceEntry {
  type: string;
  pointerType: string;
  t: number;
}

export interface TouchObservation {
  exploded: TouchStateObservation;
  imploded: TouchStateObservation;
  trace: TouchTraceEntry[];
}

export interface LayoutShiftObservation {
  value: number;
  startTime: number;
  hadRecentInput: boolean;
  page: 'desktop' | 'mobile' | 'reduced';
  group: string;
  sources: {
    node: {
      tag: string;
      dataAttributes: Record<string, string>;
      parentTag: string | null;
      text: string | null;
    } | null;
    previousRect: { x: number; y: number; width: number; height: number } | null;
    currentRect: { x: number; y: number; width: number; height: number } | null;
  }[];
}

export interface ClsObservation {
  total: number;
  entries: LayoutShiftObservation[];
}

export interface ClsLoadObservation extends ClsObservation {
  note: string;
}

export function totalLayoutShift(entries: readonly LayoutShiftObservation[]): number {
  return entries.reduce((sum, entry) => sum + entry.value, 0);
}

export interface FocusObservation {
  target: string;
  pixelBefore: PixelObservation;
  pixelAfter: PixelObservation;
  paper: PixelObservation;
  toggleLayer: string | null;
  escapeLayer: string | null;
  toggleReleaseLayer: string | null;
  afterExplode: { state: string; layer: string | null };
  afterRotate: { azimuth: number; layer: string | null };
}

export interface TourFlowObservation {
  fixture: 'a' | 'c';
  flowId: string;
  timeline: string[];
  stepNumbers: number[];
  stop: { status: string; captionVisible: boolean };
  camera: { azimuths: number[]; zooms: number[] };
}

export interface TourObservation {
  flows: TourFlowObservation[];
  normalCadenceMs: number[];
  pause: { stepAtPause: number; stepAfterHold: number };
  focusSuspended: { during: boolean; after: boolean; layerAfter: string | null };
}

export interface SelectorObservation {
  a: { flowButtons: number; visible: boolean };
  b: { flowButtons: number; visible: boolean };
  c: { flowButtons: number; visible: boolean };
}

export interface CaptionTokenObservation {
  userSelect: string;
  selectedText: string;
  text: string;
  color: PixelObservation;
  background: PixelObservation;
  expectedColor: PixelObservation;
  expectedBackground: PixelObservation;
}

export interface CaptionObservation {
  light: CaptionTokenObservation;
  dark: CaptionTokenObservation;
}

export interface ReducedActionObservation {
  target: string;
  frameDelta: number;
  highlight: string | null;
  tweening: string[];
  pulse: string[];
}

export interface ReducedObservation {
  hover: ReducedActionObservation;
  focus: ReducedActionObservation;
  tour: {
    timeline: string[];
    framesPerStep: number[];
    intervalsMs: number[];
    tweening: string[];
    pulse: string[];
  };
}

export interface ScrollObservation {
  zoomOneOverflow: number;
  zoomedOverflow: number;
  zoomedTo: number;
  topHits: string[];
  bottomHits: string[];
  cameraBefore: { azimuth: number; zoom: number };
  cameraAfter: { azimuth: number; zoom: number };
}

export interface CaptionAnchorSample {
  viewport: 'desktop' | 'mobile';
  step: number;
  target: string;
  point: PointObservation;
  caption: { left: number; top: number; right: number; bottom: number };
  outside: boolean;
}

export interface CaptionAnchorObservation {
  samples: CaptionAnchorSample[];
}

export interface S5Observation {
  hitMap: HitMapObservation;
  hover: HoverObservation;
  touch: TouchObservation;
  cls: ClsObservation;
  clsLoad: ClsLoadObservation;
  focus: FocusObservation;
  tour: TourObservation;
  selector: SelectorObservation;
  caption: CaptionObservation;
  reduced: ReducedObservation;
  scroll: ScrollObservation;
  captionAnchor: CaptionAnchorObservation;
}

export interface S4Observation {
  fixtures: { a: FixtureObservation; b: FixtureObservation; c: FixtureObservation };
  camera: {
    defaultAzimuth: number;
    afterButtonRight: number;
    afterArrowRight: number;
    zoomAfter20In: number;
    zoomAfter20Out: number;
    zoomAfterReset: number;
    disabledAtDefault: { zoomOut: boolean; zoomReset: boolean };
    disabledAtMax: { zoomIn: boolean };
  };
  motion: { explode: MotionObservation; implode: MotionObservation };
  reducedMotion: {
    initialState: string;
    afterToggle: ReducedMotionObservation;
    afterToggleBack: ReducedMotionObservation;
  };
}

export interface EngineProbeObservation extends S4Observation {
  s5?: S5Observation;
}

export type ProbeScope = 's4' | 's5' | 'all';

export interface EngineProbeCheck {
  name: string;
  pass: boolean;
  expected: unknown;
  actual: unknown;
}

export interface EngineProbeEvaluation {
  checks: EngineProbeCheck[];
  pass: boolean;
}

interface CheckInput {
  name: string;
  pass: boolean;
  expected: unknown;
  actual: unknown;
}

interface TourExpectation {
  fixture: 'a' | 'c';
  flowId: string;
  path: readonly string[];
}

const FIXTURE_A_COMPONENTS = [
  'beachgoer',
  'forecast-details-panel',
  'live-tide-client',
  'tide-cache',
  'tide-chart-screen',
  'tide-feed',
  'tide-repository',
  'tide-view-model',
] as const;
const FIXTURE_A_TOP_LAYER = ['beachgoer', 'forecast-details-panel', 'tide-chart-screen'];
const FIXTURE_A_BOTTOM_LAYER = ['tide-feed'];
const PICKUP_READY_PATH = [
  'recipient',
  'pickup-app',
  'pickup-api',
  'booking-service',
  'locker-registry',
  'notifier',
  'push-gateway',
] as const;
const TOUR_EXPECTATIONS: readonly TourExpectation[] = [
  {
    fixture: 'a',
    flowId: 'live-update',
    path: [
      'beachgoer',
      'tide-chart-screen',
      'tide-view-model',
      'tide-repository',
      'live-tide-client',
      'tide-feed',
    ],
  },
  {
    fixture: 'a',
    flowId: 'offline-read',
    path: ['beachgoer', 'tide-chart-screen', 'tide-view-model', 'tide-repository', 'tide-cache'],
  },
  { fixture: 'c', flowId: 'pickup-ready', path: PICKUP_READY_PATH },
  {
    fixture: 'c',
    flowId: 'push-failed',
    path: ['booking-service', 'notifier', 'push-gateway', 'retry-scheduler', 'dead-letter-store'],
  },
];
const CADENCE_TOLERANCE = 0.2;

function equal(actual: unknown, expected: unknown): boolean {
  if (Object.is(actual, expected)) return true;
  if (typeof actual !== 'object' || actual === null) return false;
  if (typeof expected !== 'object' || expected === null) return false;
  return JSON.stringify(actual) === JSON.stringify(expected);
}

function sameSet(actual: readonly string[], expected: readonly string[]): boolean {
  return equal([...actual].sort(), [...expected].sort());
}

function includesPhasePair(phases: readonly string[], from: string, to: string): boolean {
  return phases.some((phase, index) => phase === from && phases[index + 1] === to);
}

function pixelDistance(actual: PixelObservation, target: PixelObservation): number {
  return Math.hypot(actual.r - target.r, actual.g - target.g, actual.b - target.b);
}

function towards(actual: PixelObservation, before: PixelObservation, target: PixelObservation) {
  return pixelDistance(actual, target) < pixelDistance(before, target);
}

function isS4Observation(
  observation: Partial<EngineProbeObservation>,
): observation is S4Observation {
  return (
    observation.fixtures !== undefined &&
    observation.camera !== undefined &&
    observation.motion !== undefined &&
    observation.reducedMotion !== undefined
  );
}

function median(values: readonly number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);

  return sorted.length % 2 === 0
    ? ((sorted[middle - 1] ?? 0) + (sorted[middle] ?? 0)) / 2
    : (sorted[middle] ?? 0);
}

function s4Checks(observation: S4Observation): EngineProbeCheck[] {
  return [
    {
      name: 'fixture-a-instances',
      pass: equal(observation.fixtures.a.instances, { layers: 4, components: 8 }),
      expected: { layers: 4, components: 8 },
      actual: observation.fixtures.a.instances,
    },
    {
      name: 'fixture-a-draw-calls',
      pass: observation.fixtures.a.drawCalls === 2,
      expected: 2,
      actual: observation.fixtures.a.drawCalls,
    },
    {
      name: 'fixture-b-instances',
      pass: equal(observation.fixtures.b.instances, { layers: 4, components: 5 }),
      expected: { layers: 4, components: 5 },
      actual: observation.fixtures.b.instances,
    },
    {
      name: 'fixture-b-draw-calls',
      pass: observation.fixtures.b.drawCalls === 2,
      expected: 2,
      actual: observation.fixtures.b.drawCalls,
    },
    {
      name: 'fixture-c-instances',
      pass: equal(observation.fixtures.c.instances, { layers: 5, components: 13 }),
      expected: { layers: 5, components: 13 },
      actual: observation.fixtures.c.instances,
    },
    {
      name: 'fixture-c-draw-calls',
      pass: observation.fixtures.c.drawCalls === 2,
      expected: 2,
      actual: observation.fixtures.c.drawCalls,
    },
    {
      name: 'camera-default-azimuth',
      pass: observation.camera.defaultAzimuth === 45,
      expected: 45,
      actual: observation.camera.defaultAzimuth,
    },
    {
      name: 'camera-after-button-right',
      pass: observation.camera.afterButtonRight === 135,
      expected: 135,
      actual: observation.camera.afterButtonRight,
    },
    {
      name: 'camera-after-arrow-right',
      pass: observation.camera.afterArrowRight === 225,
      expected: 225,
      actual: observation.camera.afterArrowRight,
    },
    {
      name: 'camera-zoom-after-20-in',
      pass: observation.camera.zoomAfter20In === 3,
      expected: 3,
      actual: observation.camera.zoomAfter20In,
    },
    {
      name: 'camera-zoom-after-20-out',
      pass: observation.camera.zoomAfter20Out === 1,
      expected: 1,
      actual: observation.camera.zoomAfter20Out,
    },
    {
      name: 'camera-zoom-after-reset',
      pass: observation.camera.zoomAfterReset === 1,
      expected: 1,
      actual: observation.camera.zoomAfterReset,
    },
    {
      name: 'camera-zoom-out-disabled-at-default',
      pass: observation.camera.disabledAtDefault.zoomOut === true,
      expected: true,
      actual: observation.camera.disabledAtDefault.zoomOut,
    },
    {
      name: 'camera-zoom-reset-disabled-at-default',
      pass: observation.camera.disabledAtDefault.zoomReset === true,
      expected: true,
      actual: observation.camera.disabledAtDefault.zoomReset,
    },
    {
      name: 'camera-zoom-in-disabled-at-max',
      pass: observation.camera.disabledAtMax.zoomIn === true,
      expected: true,
      actual: observation.camera.disabledAtMax.zoomIn,
    },
    {
      name: 'motion-explode-phases',
      pass: includesPhasePair(observation.motion.explode.phases, 'exploding', 'exploded'),
      expected: ['exploding', 'exploded'],
      actual: observation.motion.explode.phases,
    },
    {
      name: 'motion-implode-phases',
      pass: includesPhasePair(observation.motion.implode.phases, 'imploding', 'imploded'),
      expected: ['imploding', 'imploded'],
      actual: observation.motion.implode.phases,
    },
    {
      name: 'reduced-motion-initial-state',
      pass: observation.reducedMotion.initialState === 'exploded',
      expected: 'exploded',
      actual: observation.reducedMotion.initialState,
    },
    {
      name: 'reduced-motion-toggle-phases',
      pass: equal(observation.reducedMotion.afterToggle.phases, ['imploded']),
      expected: ['imploded'],
      actual: observation.reducedMotion.afterToggle.phases,
    },
    {
      name: 'reduced-motion-toggle-frames',
      pass:
        Number.isFinite(observation.reducedMotion.afterToggle.framesIn1s) &&
        observation.reducedMotion.afterToggle.framesIn1s <= 2,
      expected: '<= 2',
      actual: observation.reducedMotion.afterToggle.framesIn1s,
    },
    {
      name: 'reduced-motion-toggle-back-phases',
      pass: equal(observation.reducedMotion.afterToggleBack.phases, ['exploded']),
      expected: ['exploded'],
      actual: observation.reducedMotion.afterToggleBack.phases,
    },
    {
      name: 'reduced-motion-toggle-back-frames',
      pass:
        Number.isFinite(observation.reducedMotion.afterToggleBack.framesIn1s) &&
        observation.reducedMotion.afterToggleBack.framesIn1s <= 2,
      expected: '<= 2',
      actual: observation.reducedMotion.afterToggleBack.framesIn1s,
    },
  ];
}

function s5Checks(observation: S5Observation): EngineProbeCheck[] {
  const checks: CheckInput[] = [
    {
      name: 'hitmap-exploded-all-components-hit',
      pass: sameSet(Object.keys(observation.hitMap.exploded), FIXTURE_A_COMPONENTS),
      expected: FIXTURE_A_COMPONENTS,
      actual: Object.keys(observation.hitMap.exploded).sort(),
    },
    {
      name: 'hitmap-imploded-top-layer-hit',
      pass: sameSet(Object.keys(observation.hitMap.imploded), FIXTURE_A_TOP_LAYER),
      expected: FIXTURE_A_TOP_LAYER,
      actual: Object.keys(observation.hitMap.imploded).sort(),
    },
    {
      name: 'hover-highlight-exploded',
      pass: observation.hover.exploded.highlight === observation.hover.exploded.target,
      expected: observation.hover.exploded.target,
      actual: observation.hover.exploded.highlight,
    },
    {
      name: 'hover-highlight-imploded',
      pass: observation.hover.imploded.highlight === observation.hover.imploded.target,
      expected: observation.hover.imploded.target,
      actual: observation.hover.imploded.highlight,
    },
    {
      name: 'hover-cursor-pointer',
      pass:
        observation.hover.exploded.cursor === 'pointer' &&
        observation.hover.imploded.cursor === 'pointer',
      expected: { exploded: 'pointer', imploded: 'pointer' },
      actual: {
        exploded: observation.hover.exploded.cursor,
        imploded: observation.hover.imploded.cursor,
      },
    },
    {
      name: 'hover-pixel-toward-accent',
      pass:
        towards(
          observation.hover.exploded.pixelAfter,
          observation.hover.exploded.pixelBefore,
          observation.hover.exploded.accent,
        ) &&
        towards(
          observation.hover.imploded.pixelAfter,
          observation.hover.imploded.pixelBefore,
          observation.hover.imploded.accent,
        ),
      expected: 'distance to accent decreases in both states',
      actual: {
        exploded: {
          before: pixelDistance(
            observation.hover.exploded.pixelBefore,
            observation.hover.exploded.accent,
          ),
          after: pixelDistance(
            observation.hover.exploded.pixelAfter,
            observation.hover.exploded.accent,
          ),
        },
        imploded: {
          before: pixelDistance(
            observation.hover.imploded.pixelBefore,
            observation.hover.imploded.accent,
          ),
          after: pixelDistance(
            observation.hover.imploded.pixelAfter,
            observation.hover.imploded.accent,
          ),
        },
      },
    },
    {
      name: 'hover-leave-clears',
      pass:
        observation.hover.exploded.clearAfterLeave && observation.hover.imploded.clearAfterLeave,
      expected: { exploded: true, imploded: true },
      actual: {
        exploded: observation.hover.exploded.clearAfterLeave,
        imploded: observation.hover.imploded.clearAfterLeave,
      },
    },
    {
      name: 'tap-highlight-exploded',
      pass: observation.touch.exploded.afterFirst === observation.touch.exploded.firstTarget,
      expected: observation.touch.exploded.firstTarget,
      actual: observation.touch.exploded.afterFirst,
    },
    {
      name: 'tap-highlight-imploded',
      pass: observation.touch.imploded.afterFirst === observation.touch.imploded.firstTarget,
      expected: observation.touch.imploded.firstTarget,
      actual: observation.touch.imploded.afterFirst,
    },
    {
      name: 'tap-second-clears',
      pass:
        observation.touch.exploded.afterSecondTap === null &&
        observation.touch.imploded.afterSecondTap === null,
      expected: { exploded: null, imploded: null },
      actual: {
        exploded: observation.touch.exploded.afterSecondTap,
        imploded: observation.touch.imploded.afterSecondTap,
      },
    },
    {
      name: 'tap-other-switches',
      pass:
        observation.touch.exploded.afterOtherTap === observation.touch.exploded.secondTarget &&
        observation.touch.imploded.afterOtherTap === observation.touch.imploded.secondTarget,
      expected: {
        exploded: observation.touch.exploded.secondTarget,
        imploded: observation.touch.imploded.secondTarget,
      },
      actual: {
        exploded: observation.touch.exploded.afterOtherTap,
        imploded: observation.touch.imploded.afterOtherTap,
      },
    },
    {
      name: 'tap-empty-clears',
      pass:
        observation.touch.exploded.afterEmptyTap === null &&
        observation.touch.imploded.afterEmptyTap === null,
      expected: { exploded: null, imploded: null },
      actual: {
        exploded: observation.touch.exploded.afterEmptyTap,
        imploded: observation.touch.imploded.afterEmptyTap,
      },
    },
    {
      name: 'tap-outside-clears',
      pass:
        observation.touch.exploded.afterOutsideTap === null &&
        observation.touch.imploded.afterOutsideTap === null,
      expected: { exploded: null, imploded: null },
      actual: {
        exploded: observation.touch.exploded.afterOutsideTap,
        imploded: observation.touch.imploded.afterOutsideTap,
      },
    },
    {
      name: 'trace-pointertype-touch',
      pass:
        observation.touch.trace.length >= 3 &&
        observation.touch.trace.every((entry) => entry.pointerType === 'touch') &&
        ['pointerdown', 'pointerup', 'click'].every((type) =>
          observation.touch.trace.some((entry) => entry.type === type),
        ),
      expected: 'pointerdown, pointerup and click all with pointerType=touch',
      actual: observation.touch.trace,
    },
    {
      name: 'cls-zero',
      pass: observation.cls.total === 0,
      expected: 0,
      actual: observation.cls,
    },
    {
      name: 'focus-toggle-sets',
      pass: observation.focus.toggleLayer === 'ui',
      expected: 'ui',
      actual: observation.focus.toggleLayer,
    },
    {
      name: 'focus-pixel-toward-paper',
      pass: towards(
        observation.focus.pixelAfter,
        observation.focus.pixelBefore,
        observation.focus.paper,
      ),
      expected: 'distance to paper decreases',
      actual: {
        before: pixelDistance(observation.focus.pixelBefore, observation.focus.paper),
        after: pixelDistance(observation.focus.pixelAfter, observation.focus.paper),
      },
    },
    {
      name: 'focus-esc-releases',
      pass: observation.focus.escapeLayer === null,
      expected: null,
      actual: observation.focus.escapeLayer,
    },
    {
      name: 'focus-toggle-releases',
      pass: observation.focus.toggleReleaseLayer === null,
      expected: null,
      actual: observation.focus.toggleReleaseLayer,
    },
    {
      name: 'focus-survives-explode',
      pass:
        observation.focus.afterExplode.state === 'exploded' &&
        observation.focus.afterExplode.layer === 'ui',
      expected: { state: 'exploded', layer: 'ui' },
      actual: observation.focus.afterExplode,
    },
    {
      name: 'focus-survives-rotate',
      pass:
        observation.focus.afterRotate.azimuth === 135 &&
        observation.focus.afterRotate.layer === 'ui',
      expected: { azimuth: 135, layer: 'ui' },
      actual: observation.focus.afterRotate,
    },
  ];

  for (const expectation of TOUR_EXPECTATIONS) {
    const actual = observation.tour.flows.find(
      (flow) => flow.fixture === expectation.fixture && flow.flowId === expectation.flowId,
    );
    checks.push({
      name: `tour-order-${expectation.fixture}-${expectation.flowId}`,
      pass: actual !== undefined && equal(actual.timeline, expectation.path),
      expected: expectation.path,
      actual: actual?.timeline ?? null,
    });
  }

  checks.push(
    {
      name: 'tour-pause-holds',
      pass: observation.tour.pause.stepAtPause === observation.tour.pause.stepAfterHold,
      expected: observation.tour.pause.stepAtPause,
      actual: observation.tour.pause.stepAfterHold,
    },
    {
      name: 'tour-step-advances-one',
      pass: observation.tour.flows.every((flow) =>
        equal(
          flow.stepNumbers,
          flow.timeline.map((_, index) => index),
        ),
      ),
      expected: 'step numbers are contiguous from 0',
      actual: observation.tour.flows.map((flow) => flow.stepNumbers),
    },
    {
      name: 'tour-stop-clears',
      pass: observation.tour.flows.every(
        (flow) => flow.stop.status === 'idle' && !flow.stop.captionVisible,
      ),
      expected: 'every flow stops idle with no caption',
      actual: observation.tour.flows.map((flow) => flow.stop),
    },
    {
      name: 'tour-camera-still',
      pass: observation.tour.flows.every(
        (flow) => new Set(flow.camera.azimuths).size <= 1 && new Set(flow.camera.zooms).size <= 1,
      ),
      expected: 'azimuth and zoom unchanged during each flow',
      actual: observation.tour.flows.map((flow) => flow.camera),
    },
    {
      name: 'tour-focus-suspended-restored',
      pass:
        observation.tour.focusSuspended.during &&
        observation.tour.focusSuspended.after &&
        observation.tour.focusSuspended.layerAfter === 'ui',
      expected: { during: true, after: true, layerAfter: 'ui' },
      actual: observation.tour.focusSuspended,
    },
    {
      name: 'selector-a-visible',
      pass: observation.selector.a.flowButtons > 0 && observation.selector.a.visible,
      expected: 'at least one visible flow selector button',
      actual: observation.selector.a,
    },
    {
      name: 'selector-b-hidden',
      pass: observation.selector.b.flowButtons === 0 && !observation.selector.b.visible,
      expected: { flowButtons: 0, visible: false },
      actual: observation.selector.b,
    },
    {
      name: 'selector-c-two-flows',
      pass: observation.selector.c.flowButtons === 2 && observation.selector.c.visible,
      expected: { flowButtons: 2, visible: true },
      actual: observation.selector.c,
    },
    {
      name: 'caption-selectable',
      pass:
        observation.caption.light.userSelect === 'text' &&
        observation.caption.light.selectedText === observation.caption.light.text,
      expected: 'user-select text and selection round-trip',
      actual: {
        userSelect: observation.caption.light.userSelect,
        selectedText: observation.caption.light.selectedText,
        text: observation.caption.light.text,
      },
    },
    {
      name: 'caption-tokens-light',
      pass:
        equal(observation.caption.light.color, observation.caption.light.expectedColor) &&
        equal(observation.caption.light.background, observation.caption.light.expectedBackground),
      expected: {
        color: observation.caption.light.expectedColor,
        background: observation.caption.light.expectedBackground,
      },
      actual: {
        color: observation.caption.light.color,
        background: observation.caption.light.background,
      },
    },
    {
      name: 'caption-tokens-dark',
      pass:
        equal(observation.caption.dark.color, observation.caption.dark.expectedColor) &&
        equal(observation.caption.dark.background, observation.caption.dark.expectedBackground),
      expected: {
        color: observation.caption.dark.expectedColor,
        background: observation.caption.dark.expectedBackground,
      },
      actual: {
        color: observation.caption.dark.color,
        background: observation.caption.dark.background,
      },
    },
  );

  const reducedAttrs = [
    ...observation.reduced.hover.tweening,
    ...observation.reduced.hover.pulse,
    ...observation.reduced.focus.tweening,
    ...observation.reduced.focus.pulse,
    ...observation.reduced.tour.tweening,
    ...observation.reduced.tour.pulse,
  ];
  const normalCadence = median(observation.tour.normalCadenceMs);
  const cadenceInBand =
    normalCadence > 0 &&
    observation.reduced.tour.intervalsMs.length > 0 &&
    observation.reduced.tour.intervalsMs.every(
      (interval) => Math.abs(interval - normalCadence) / normalCadence <= CADENCE_TOLERANCE,
    );

  checks.push(
    {
      name: 'rm-hover-instant',
      pass:
        observation.reduced.hover.highlight === observation.reduced.hover.target &&
        observation.reduced.hover.frameDelta === 1,
      expected: { highlight: observation.reduced.hover.target, frameDelta: 1 },
      actual: observation.reduced.hover,
    },
    {
      name: 'rm-focus-instant',
      pass:
        observation.reduced.focus.highlight === observation.reduced.focus.target &&
        observation.reduced.focus.frameDelta === 1,
      expected: { highlight: observation.reduced.focus.target, frameDelta: 1 },
      actual: observation.reduced.focus,
    },
    {
      name: 'rm-tour-instant',
      pass:
        equal(observation.reduced.tour.timeline, TOUR_EXPECTATIONS[0]?.path) &&
        observation.reduced.tour.framesPerStep.length > 0 &&
        observation.reduced.tour.framesPerStep.every((frames) => frames === 1),
      expected: {
        timeline: TOUR_EXPECTATIONS[0]?.path,
        framesPerStep: 'exactly 1',
      },
      actual: observation.reduced.tour,
    },
    {
      name: 'rm-no-tween-attr',
      pass: reducedAttrs.every((value) => value === 'false'),
      expected: 'tweening and pulse are never "true"',
      actual: reducedAttrs,
    },
    {
      name: 'rm-tour-cadence',
      pass: cadenceInBand,
      expected: {
        normalCadenceMs: observation.tour.normalCadenceMs,
        tolerance: CADENCE_TOLERANCE,
      },
      actual: observation.reduced.tour.intervalsMs,
    },
    {
      name: 'scroll-zoom1-no-overflow',
      pass: observation.scroll.zoomOneOverflow <= 1,
      expected: '<= 1px',
      actual: observation.scroll.zoomOneOverflow,
    },
    {
      name: 'scroll-zoomed-overflows',
      pass: observation.scroll.zoomedOverflow > 1,
      expected: '> 1px',
      actual: observation.scroll.zoomedOverflow,
    },
    {
      name: 'scroll-top-reaches-top-layer',
      pass: observation.scroll.topHits.some((id) => FIXTURE_A_TOP_LAYER.includes(id)),
      expected: FIXTURE_A_TOP_LAYER,
      actual: observation.scroll.topHits,
    },
    {
      name: 'scroll-bottom-reaches-bottom-layer',
      pass: observation.scroll.bottomHits.some((id) => FIXTURE_A_BOTTOM_LAYER.includes(id)),
      expected: FIXTURE_A_BOTTOM_LAYER,
      actual: observation.scroll.bottomHits,
    },
    {
      name: 'scroll-camera-still',
      pass: equal(observation.scroll.cameraBefore, observation.scroll.cameraAfter),
      expected: observation.scroll.cameraBefore,
      actual: observation.scroll.cameraAfter,
    },
    {
      name: 'caption-clear-of-target',
      pass:
        observation.captionAnchor.samples.length === PICKUP_READY_PATH.length * 2 &&
        observation.captionAnchor.samples.every((sample) => sample.outside),
      expected: 'every pickup-ready target point is outside the caption (desktop and mobile)',
      actual: observation.captionAnchor.samples,
    },
  );

  return checks.map((check) => ({ ...check }));
}

export function evaluateProbe(
  observation: Partial<EngineProbeObservation>,
  scope: ProbeScope = 'all',
): EngineProbeEvaluation {
  const checks: EngineProbeCheck[] = [];

  if (scope !== 's5') {
    if (!isS4Observation(observation)) throw new Error('S4 observation is incomplete');
    checks.push(...s4Checks(observation));
  }

  if (scope !== 's4') {
    if (observation.s5 === undefined) throw new Error('S5 observation is incomplete');
    checks.push(...s5Checks(observation.s5));
  }

  return { checks, pass: checks.every((check) => check.pass) };
}
