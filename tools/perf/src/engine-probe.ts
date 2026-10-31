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
      inOverlay?: boolean;
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

export interface PaletteSampleObservation {
  fill: PixelObservation;
  edgeScan: PixelObservation[];
  paper: PixelObservation;
  line: PixelObservation;
}

export interface S6PaletteObservation {
  light: PaletteSampleObservation;
  dark: PaletteSampleObservation;
  kinds: { store: PixelObservation; service: PixelObservation };
  toggle: { fill: PixelObservation; lightPaper: PixelObservation; darkPaper: PixelObservation };
  osDarkFirstPaint: {
    background: PixelObservation;
    fill: PixelObservation;
    lightPaper: PixelObservation;
    darkPaper: PixelObservation;
  };
}

export interface OverlayDefaultObservation {
  fixture: 'a' | 'b' | 'c';
  state: 'imploded' | 'exploded';
  viewport: 'mobile' | 'desktop';
  titleBlock: string | null;
  overlay: string | null;
  hidden: string | null;
  labelCount: number;
}

export interface OverlayBoxObservation {
  key: string;
  left: number;
  top: number;
  right: number;
  bottom: number;
  fontSize: number;
}

export interface Overlay360Observation {
  fixture: 'a' | 'c';
  state: 'imploded' | 'exploded';
  theme: 'light' | 'dark';
  viewer: { left: number; top: number; right: number; bottom: number };
  boxes: OverlayBoxObservation[];
}

export interface OverlaySelectableObservation {
  userSelect: string;
  titleUserSelect: string;
  layerText: string;
  selectedLayerText: string;
  titleRowText: string;
  selectedTitleRowText: string;
}

export interface OverlayColoursObservation {
  layer: PixelObservation;
  part: PixelObservation;
  dimension: PixelObservation;
  title: PixelObservation;
  expected: { label: PixelObservation; ink: PixelObservation; steel: PixelObservation };
}

export interface OverlayHitThroughObservation {
  hoverTarget: string;
  hoverHighlight: string | null;
  tapTarget: string;
  tapHighlight: string | null;
  labelTarget: string;
  afterLabelTap: string | null;
}

export interface TraceFlowObservation {
  fixture: 'a' | 'c';
  flowId: string;
  traces: string[];
  stopTrace: string;
}

export interface ReducedTraceObservation {
  samples: { step: number; trace: string; animations: number }[];
}

export interface BlinkObservation {
  throttle: number;
  rounds: number;
  framesSampled: number;
  blinkFrames: number;
  stuckHiddenAfterSettle: { round: number; to: string; end: string | null }[];
}

export interface S6Observation {
  palette: S6PaletteObservation;
  overlayDefaults: OverlayDefaultObservation[];
  overlay360: Overlay360Observation[];
  selectable: OverlaySelectableObservation;
  colours: { light: OverlayColoursObservation; dark: OverlayColoursObservation };
  hitThrough: OverlayHitThroughObservation;
  cls: ClsObservation;
  trace: { flows: TraceFlowObservation[]; reducedMotion: ReducedTraceObservation };
  defaultGap: { a: string[]; c: string[] };
  drawCallsMidTour: number;
  blink: BlinkObservation;
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
  s6?: S6Observation;
}

export type ProbeScope = 's4' | 's5' | 's6' | 'all';

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
const EDGE_DELTA_E_MAX = 10;
const KIND_DELTA_E_MIN = 3;
const OS_DARK_BACKGROUND_DELTA_E_MAX = 3;
const OVERLAY_FONT_PX_MIN = 12;
const BOX_INSIDE_EPSILON = 0.5;
const BLINK_THROTTLE = 4;
const BLINK_ROUNDS = 4;

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

function pixelLab(pixel: PixelObservation): [number, number, number] {
  const [red = 0, green = 0, blue = 0] = [pixel.r, pixel.g, pixel.b].map((value) => {
    const channel = Math.min(255, Math.max(0, value)) / 255;
    return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  const xyz = [
    (0.4124 * red + 0.3576 * green + 0.1805 * blue) / 0.95047,
    (0.2126 * red + 0.7152 * green + 0.0722 * blue) / 1,
    (0.0193 * red + 0.1192 * green + 0.9505 * blue) / 1.08883,
  ];
  const [x = 0, y = 0, z = 0] = xyz.map((value) =>
    value > 0.008856 ? value ** (1 / 3) : 7.787 * value + 16 / 116,
  );

  return [116 * y - 16, 500 * (x - y), 200 * (y - z)];
}

function deltaE(left: PixelObservation, right: PixelObservation): number {
  const [leftLightness, leftRed, leftBlue] = pixelLab(left);
  const [rightLightness, rightRed, rightBlue] = pixelLab(right);

  return Math.hypot(leftLightness - rightLightness, leftRed - rightRed, leftBlue - rightBlue);
}

function closestScanDeltaE(scan: readonly PixelObservation[], target: PixelObservation): number {
  return scan.reduce(
    (closest, pixel) => Math.min(closest, deltaE(pixel, target)),
    Number.POSITIVE_INFINITY,
  );
}

function boxInside(box: OverlayBoxObservation, viewer: Overlay360Observation['viewer']): boolean {
  return (
    box.left >= viewer.left - BOX_INSIDE_EPSILON &&
    box.top >= viewer.top - BOX_INSIDE_EPSILON &&
    box.right <= viewer.right + BOX_INSIDE_EPSILON &&
    box.bottom <= viewer.bottom + BOX_INSIDE_EPSILON
  );
}

function boxesOverlap(left: OverlayBoxObservation, right: OverlayBoxObservation): boolean {
  return (
    Math.min(left.right, right.right) - Math.max(left.left, right.left) > 0 &&
    Math.min(left.bottom, right.bottom) - Math.max(left.top, right.top) > 0
  );
}

function hasOverlappingBoxes(boxes: readonly OverlayBoxObservation[]): boolean {
  return boxes.some((box, index) =>
    boxes.slice(index + 1).some((candidate) => boxesOverlap(box, candidate)),
  );
}

function shiftsInsideOverlay(entry: LayoutShiftObservation): boolean {
  return entry.sources.some((source) => {
    const node = source.node;
    if (node === null) return false;
    if (node.inOverlay === true) return true;

    return Object.keys(node.dataAttributes).some(
      (name) =>
        name === 'data-xploder-overlay' ||
        name === 'data-xploder-label' ||
        name === 'data-xploder-titleblock-box' ||
        name === 'data-xploder-trace',
    );
  });
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

function s6Checks(observation: S6Observation): EngineProbeCheck[] {
  const checks: CheckInput[] = [];

  for (const theme of ['light', 'dark'] as const) {
    const sample = observation.palette[theme];
    const fillNearPaper = deltaE(sample.fill, sample.paper) < deltaE(sample.fill, sample.line);
    const closestEdge = closestScanDeltaE(sample.edgeScan, sample.line);

    checks.push(
      {
        name: `bp-fill-near-paper-${theme}`,
        pass: fillNearPaper,
        expected: 'fill is closer to --bp-paper than --bp-line',
        actual: {
          toPaper: deltaE(sample.fill, sample.paper),
          toLine: deltaE(sample.fill, sample.line),
        },
      },
      {
        name: `bp-edge-ink-${theme}`,
        pass: sample.edgeScan.length >= 60 && closestEdge <= EDGE_DELTA_E_MAX,
        expected: { scanPixels: '>= 60', closestDeltaE: `<= ${EDGE_DELTA_E_MAX}` },
        actual: { scanPixels: sample.edgeScan.length, closestDeltaE: closestEdge },
      },
    );
  }

  checks.push(
    {
      name: 'bp-kind-distinct',
      pass:
        deltaE(observation.palette.kinds.store, observation.palette.kinds.service) >=
        KIND_DELTA_E_MIN,
      expected: `deltaE >= ${KIND_DELTA_E_MIN}`,
      actual: deltaE(observation.palette.kinds.store, observation.palette.kinds.service),
    },
    {
      name: 'bp-toggle-switches',
      pass:
        deltaE(observation.palette.toggle.fill, observation.palette.toggle.darkPaper) <
        deltaE(observation.palette.toggle.fill, observation.palette.toggle.lightPaper),
      expected: 'fill is closer to dark paper than light paper',
      actual: {
        toDarkPaper: deltaE(observation.palette.toggle.fill, observation.palette.toggle.darkPaper),
        toLightPaper: deltaE(
          observation.palette.toggle.fill,
          observation.palette.toggle.lightPaper,
        ),
      },
    },
    {
      name: 'bp-os-dark-first-paint',
      pass:
        deltaE(
          observation.palette.osDarkFirstPaint.background,
          observation.palette.osDarkFirstPaint.darkPaper,
        ) <= OS_DARK_BACKGROUND_DELTA_E_MAX &&
        deltaE(
          observation.palette.osDarkFirstPaint.fill,
          observation.palette.osDarkFirstPaint.darkPaper,
        ) <
          deltaE(
            observation.palette.osDarkFirstPaint.fill,
            observation.palette.osDarkFirstPaint.lightPaper,
          ),
      expected: {
        backgroundDeltaE: `<= ${OS_DARK_BACKGROUND_DELTA_E_MAX}`,
        fill: 'closer to dark paper',
      },
      actual: {
        backgroundDeltaE: deltaE(
          observation.palette.osDarkFirstPaint.background,
          observation.palette.osDarkFirstPaint.darkPaper,
        ),
        fillToDarkPaper: deltaE(
          observation.palette.osDarkFirstPaint.fill,
          observation.palette.osDarkFirstPaint.darkPaper,
        ),
        fillToLightPaper: deltaE(
          observation.palette.osDarkFirstPaint.fill,
          observation.palette.osDarkFirstPaint.lightPaper,
        ),
      },
    },
  );

  for (const fixture of ['a', 'b', 'c'] as const) {
    for (const state of ['imploded', 'exploded'] as const) {
      for (const viewport of ['mobile', 'desktop'] as const) {
        const sample = observation.overlayDefaults.find(
          (candidate) =>
            candidate.fixture === fixture &&
            candidate.state === state &&
            candidate.viewport === viewport,
        );
        const pass =
          state === 'imploded'
            ? sample?.titleBlock === 'shown' && sample.labelCount === 0
            : sample?.overlay === 'shown' && sample.hidden === '0';

        checks.push({
          name: `overlay-default-${fixture}-${state}-${viewport}`,
          pass,
          expected:
            state === 'imploded'
              ? { titleBlock: 'shown', labelCount: 0 }
              : { overlay: 'shown', hidden: '0' },
          actual: sample ?? null,
        });
      }
    }
  }

  const expected360 = (['a', 'c'] as const).flatMap((fixture) =>
    (['imploded', 'exploded'] as const).flatMap((state) =>
      (['light', 'dark'] as const).map((theme) => ({ fixture, state, theme })),
    ),
  );
  const overlay360Samples = expected360.map((expected) =>
    observation.overlay360.find(
      (sample) =>
        sample.fixture === expected.fixture &&
        sample.state === expected.state &&
        sample.theme === expected.theme,
    ),
  );
  const boxesValid = overlay360Samples.every(
    (sample) =>
      sample !== undefined &&
      sample.boxes.length > 0 &&
      sample.boxes.every(
        (box) => boxInside(box, sample.viewer) && box.fontSize >= OVERLAY_FONT_PX_MIN,
      ) &&
      !hasOverlappingBoxes(sample.boxes),
  );

  checks.push(
    {
      name: 'overlay-360-boxes',
      pass: overlay360Samples.every((sample) => sample !== undefined) && boxesValid,
      expected: {
        samples: 8,
        everyBox: 'inside viewer, font-size >= 12px, no pairwise intersections',
      },
      actual: overlay360Samples.map((sample) => sample ?? null),
    },
    {
      name: 'overlay-selectable',
      pass:
        observation.selectable.userSelect !== 'none' &&
        observation.selectable.titleUserSelect !== 'none' &&
        observation.selectable.layerText.length > 0 &&
        observation.selectable.selectedLayerText === observation.selectable.layerText &&
        observation.selectable.titleRowText.length > 0 &&
        observation.selectable.selectedTitleRowText === observation.selectable.titleRowText,
      expected: 'Selection API returns layer-label and title-row text; user-select is not none',
      actual: observation.selectable,
    },
    {
      name: 'overlay-colors-light',
      pass: colourCheckPass(observation.colours.light),
      expected: observation.colours.light.expected,
      actual: {
        layer: observation.colours.light.layer,
        part: observation.colours.light.part,
        dimension: observation.colours.light.dimension,
        title: observation.colours.light.title,
      },
    },
    {
      name: 'overlay-colors-dark',
      pass: colourCheckPass(observation.colours.dark),
      expected: observation.colours.dark.expected,
      actual: {
        layer: observation.colours.dark.layer,
        part: observation.colours.dark.part,
        dimension: observation.colours.dark.dimension,
        title: observation.colours.dark.title,
      },
    },
    {
      name: 'overlay-hit-through',
      pass:
        observation.hitThrough.hoverHighlight === observation.hitThrough.hoverTarget &&
        observation.hitThrough.tapHighlight === observation.hitThrough.tapTarget &&
        observation.hitThrough.afterLabelTap === null,
      expected: {
        hoverHighlight: observation.hitThrough.hoverTarget,
        tapHighlight: observation.hitThrough.tapTarget,
        afterLabelTap: null,
      },
      actual: observation.hitThrough,
    },
    {
      name: 'overlay-cls-zero',
      pass: observation.cls.entries.every((entry) => !shiftsInsideOverlay(entry)),
      expected: '0 layout-shift entries with a source inside the overlay',
      actual: observation.cls.entries.filter(shiftsInsideOverlay),
    },
  );

  for (const expectation of TOUR_EXPECTATIONS) {
    const actual = observation.trace.flows.find(
      (flow) => flow.fixture === expectation.fixture && flow.flowId === expectation.flowId,
    );
    const expected = expectation.path.map((_, index) =>
      expectation.path.slice(0, index + 1).join(' '),
    );

    checks.push({
      name: `trace-order-${expectation.fixture}-${expectation.flowId}`,
      pass: actual !== undefined && equal(actual.traces, expected),
      expected,
      actual: actual?.traces ?? null,
    });
  }

  checks.push(
    {
      name: 'trace-stop-clears',
      pass:
        observation.trace.flows.length === TOUR_EXPECTATIONS.length &&
        observation.trace.flows.every((flow) => flow.stopTrace === ''),
      expected: 'every flow leaves data-xploder-trace empty after Stop',
      actual: observation.trace.flows.map((flow) => ({
        fixture: flow.fixture,
        flowId: flow.flowId,
        stopTrace: flow.stopTrace,
      })),
    },
    {
      name: 'rm-trace-static',
      pass:
        observation.trace.reducedMotion.samples.length >= 2 &&
        new Set(observation.trace.reducedMotion.samples.map((sample) => sample.step)).size >= 2 &&
        observation.trace.reducedMotion.samples.every(
          (sample) => sample.trace.length > 0 && sample.animations === 0,
        ),
      expected: '>= 2 different playing steps with a trace and 0 overlay animations',
      actual: observation.trace.reducedMotion.samples,
    },
    {
      name: 'default-gap-hitmap-a',
      pass: sameSet(observation.defaultGap.a, FIXTURE_A_COMPONENTS),
      expected: FIXTURE_A_COMPONENTS,
      actual: [...observation.defaultGap.a].sort(),
    },
    {
      name: 'default-gap-hitmap-c',
      pass: sameSet(observation.defaultGap.c, FIXTURE_C_COMPONENTS),
      expected: FIXTURE_C_COMPONENTS,
      actual: [...observation.defaultGap.c].sort(),
    },
    {
      name: 'draw-calls-mid-tour',
      pass: observation.drawCallsMidTour === 2,
      expected: 2,
      actual: observation.drawCallsMidTour,
    },
    {
      name: 'overlay-no-blink',
      pass:
        observation.blink.throttle === BLINK_THROTTLE &&
        observation.blink.rounds === BLINK_ROUNDS &&
        observation.blink.framesSampled > 0 &&
        observation.blink.blinkFrames === 0 &&
        observation.blink.stuckHiddenAfterSettle.length === 0,
      expected: {
        throttle: BLINK_THROTTLE,
        rounds: BLINK_ROUNDS,
        blinkFrames: 0,
        stuckHiddenAfterSettle: [],
      },
      actual: observation.blink,
    },
  );

  return checks.map((check) => ({ ...check }));
}

function colourCheckPass(observation: OverlayColoursObservation): boolean {
  return (
    equal(observation.layer, observation.expected.label) &&
    equal(observation.part, observation.expected.ink) &&
    equal(observation.dimension, observation.expected.steel) &&
    equal(observation.title, observation.expected.ink)
  );
}

export function evaluateProbe(
  observation: Partial<EngineProbeObservation>,
  scope: ProbeScope = 'all',
): EngineProbeEvaluation {
  const checks: EngineProbeCheck[] = [];

  if (scope === 's4' || scope === 'all') {
    if (!isS4Observation(observation)) throw new Error('S4 observation is incomplete');
    checks.push(...s4Checks(observation));
  }

  if (scope === 's5' || scope === 'all') {
    if (observation.s5 === undefined) throw new Error('S5 observation is incomplete');
    checks.push(...s5Checks(observation.s5));
  }

  if (scope === 's6' || scope === 'all') {
    if (observation.s6 === undefined) throw new Error('S6 observation is incomplete');
    checks.push(...s6Checks(observation.s6));
  }

  return { checks, pass: checks.every((check) => check.pass) };
}
