import { describe, expect, test } from 'vitest';

import { evaluateProbe, type EngineProbeObservation } from '../src/engine-probe.ts';

function passingObservation(): EngineProbeObservation {
  return {
    fixtures: {
      a: { instances: { layers: 4, components: 8 }, drawCalls: 2 },
      b: { instances: { layers: 4, components: 5 }, drawCalls: 2 },
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
  };
}

function failCheck(observation: EngineProbeObservation, name: string): void {
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

describe('evaluateProbe', () => {
  test('passes the complete synthetic observation', () => {
    const result = evaluateProbe(passingObservation());

    expect(result.pass).toBe(true);
    expect(result.checks).toHaveLength(20);
    expect(result.checks.every((check) => check.pass)).toBe(true);
  });

  test('fails each check once without failing another', () => {
    const baseline = evaluateProbe(passingObservation());

    for (const check of baseline.checks) {
      const observation = structuredClone(passingObservation());
      failCheck(observation, check.name);
      const result = evaluateProbe(observation);

      expect(result.pass).toBe(false);
      expect(
        result.checks.filter((candidate) => !candidate.pass).map((candidate) => candidate.name),
      ).toEqual([check.name]);
    }
  });
});
