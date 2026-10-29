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

export interface EngineProbeObservation {
  fixtures: { a: FixtureObservation; b: FixtureObservation };
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

function equal(actual: unknown, expected: unknown): boolean {
  if (Object.is(actual, expected)) return true;
  if (typeof actual !== 'object' || actual === null) return false;
  if (typeof expected !== 'object' || expected === null) return false;
  return JSON.stringify(actual) === JSON.stringify(expected);
}

function includesPhasePair(phases: readonly string[], from: string, to: string): boolean {
  return phases.some((phase, index) => phase === from && phases[index + 1] === to);
}

export function evaluateProbe(observation: EngineProbeObservation): EngineProbeEvaluation {
  const checks: EngineProbeCheck[] = [
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

  return { checks, pass: checks.every((check) => check.pass) };
}
