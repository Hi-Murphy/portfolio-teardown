import { describe, expect, test } from 'vitest';

import { parseProject, parseTechRegistry } from '../src/index';
import {
  initialTour,
  positionAt,
  showFlowSelector,
  tourReducer,
  type TourFlow,
  type TourState,
} from '../src/interaction/tour';
import { motion, resolveMotion } from '../src/motion';
import { projectAJson, projectBJson, projectCJson, techRegistryJson } from './fixtures';

const registry = parseTechRegistry(techRegistryJson);
const projectA = parseProject(projectAJson, { registry });
const projectB = parseProject(projectBJson, { registry });
const projectC = parseProject(projectCJson, { registry });
const BEAT = motion.durations.tourBeat;

const FLOWS: readonly TourFlow[] = [...projectA.flows, ...projectB.flows, ...projectC.flows];

function play(flows: readonly TourFlow[], now: number, flowId = flows[0]?.id): TourState {
  const selected = tourReducer(
    initialTour(flows),
    { type: 'selectFlow', flowId: flowId ?? '', now },
    flows,
    BEAT,
  );
  return tourReducer(selected, { type: 'play', now }, flows, BEAT);
}

describe('tour step order', () => {
  test.each([
    { project: projectA, flowId: 'live-update' },
    { project: projectA, flowId: 'offline-read' },
    { project: projectB, flowId: 'nightly-reconciliation' },
    { project: projectC, flowId: 'pickup-ready' },
    { project: projectC, flowId: 'push-failed' },
  ])('$flowId follows its flow path beat by beat', ({ project, flowId }) => {
    const flow = project.flows.find((candidate) => candidate.id === flowId);

    expect(flow).toBeDefined();

    const flows = project.flows;
    const path = flow?.path ?? [];
    const componentIds: string[] = [];
    let state = play(flows, 0, flowId);

    for (let step = 0; step < path.length; step += 1) {
      componentIds.push(positionAt(state, (step + 0.5) * BEAT, flows, BEAT).componentId ?? '');
      state = tourReducer(state, { type: 'tick', now: (step + 1) * BEAT }, flows, BEAT);
    }

    expect(componentIds).toStrictEqual(path);
    expect(state.status).toBe('ended');
    expect(state.step).toBe(path.length - 1);
    expect(positionAt(state, path.length * BEAT, flows, BEAT)).toMatchObject({
      status: 'ended',
      step: path.length - 1,
      componentId: path.at(-1),
      nextBoundary: null,
    });
  });
});

describe('tour clock', () => {
  test('keeps elapsed time across pause and resume', () => {
    const flows = projectA.flows;
    let state = play(flows, 0);

    state = tourReducer(state, { type: 'pause', now: 0.4 * BEAT }, flows, BEAT);

    expect(state).toMatchObject({ status: 'paused', step: 0, anchor: 0.4 * BEAT });
    expect(positionAt(state, 10.4 * BEAT, flows, BEAT)).toMatchObject({
      status: 'paused',
      step: 0,
      componentId: flows[0]?.path[0],
      nextBoundary: null,
    });

    state = tourReducer(state, { type: 'play', now: 10.4 * BEAT }, flows, BEAT);
    expect(positionAt(state, 10.9 * BEAT, flows, BEAT).step).toBe(0);
    expect(positionAt(state, 11 * BEAT, flows, BEAT).step).toBe(1);
  });

  test('folds elapsed beats exactly once when an action and a tick share a timestamp', () => {
    const flows = projectA.flows;
    const played = play(flows, 0);
    const paused = tourReducer(played, { type: 'pause', now: BEAT }, flows, BEAT);
    const ticked = tourReducer(paused, { type: 'tick', now: BEAT }, flows, BEAT);

    expect(paused).toMatchObject({ status: 'paused', step: 1, anchor: 0 });
    expect(ticked).toBe(paused);
  });

  test('reports the next boundary only while playing', () => {
    const flows = projectA.flows;
    const path = flows[0]?.path ?? [];
    const played = play(flows, 4);

    expect(positionAt(played, 4.2, flows, BEAT).nextBoundary).toBe(4 + BEAT);

    const paused = tourReducer(played, { type: 'pause', now: 4.2 }, flows, BEAT);
    const ended = tourReducer(played, { type: 'tick', now: 4 + path.length * BEAT }, flows, BEAT);

    expect(positionAt(paused, 4.2, flows, BEAT).nextBoundary).toBeNull();
    expect(ended.status).toBe('ended');
    expect(positionAt(ended, 4 + path.length * BEAT, flows, BEAT).nextBoundary).toBeNull();
  });
});

describe('tour lifecycle', () => {
  test('steps from idle, past the end, and restarts from ended', () => {
    const flows = projectA.flows;
    const path = flows[0]?.path ?? [];
    let state = initialTour(flows);

    state = tourReducer(state, { type: 'step', now: 0 }, flows, BEAT);
    expect(state).toMatchObject({ status: 'paused', step: 0, anchor: 0 });

    for (let step = 1; step < path.length; step += 1) {
      state = tourReducer(state, { type: 'step', now: step }, flows, BEAT);
      expect(state.step).toBe(step);
    }

    state = tourReducer(state, { type: 'step', now: path.length }, flows, BEAT);
    expect(state.status).toBe('ended');
    expect(positionAt(state, path.length, flows, BEAT).componentId).toBe(path.at(-1));

    const stepped = tourReducer(state, { type: 'step', now: path.length + 1 }, flows, BEAT);
    expect(stepped).toMatchObject({ status: 'paused', step: 0 });

    const replayed = tourReducer(state, { type: 'play', now: path.length + 2 }, flows, BEAT);
    expect(replayed).toMatchObject({ status: 'playing', step: 0, anchor: path.length + 2 });
  });

  test('stops to idle and switches only to known flows', () => {
    const flows = projectC.flows;
    const played = play(flows, 0);
    const stopped = tourReducer(played, { type: 'stop', now: BEAT / 2 }, flows, BEAT);

    expect(stopped).toMatchObject({ flowId: 'pickup-ready', status: 'idle', step: -1 });
    expect(positionAt(stopped, BEAT / 2, flows, BEAT).componentId).toBeNull();

    const switched = tourReducer(
      played,
      { type: 'selectFlow', flowId: 'push-failed', now: 0 },
      flows,
      BEAT,
    );
    expect(switched).toMatchObject({ flowId: 'push-failed', status: 'idle', step: -1 });

    const unchanged = tourReducer(
      switched,
      { type: 'selectFlow', flowId: 'missing', now: 0 },
      flows,
      BEAT,
    );
    expect(unchanged).toBe(switched);
  });

  test('has no active flow when the project has no flows', () => {
    const idle = initialTour([]);
    const played = tourReducer(idle, { type: 'play', now: 0 }, [], BEAT);

    expect(idle).toMatchObject({ flowId: null, status: 'idle', step: -1 });
    expect(played).toBe(idle);
    expect(positionAt(played, 0, [], BEAT).componentId).toBeNull();
  });
});

describe('reduced motion cadence', () => {
  test('uses the injected base beat when the resolved static twin has a zero beat', () => {
    const flows = projectA.flows;
    const path = flows[0]?.path ?? [];
    const staticTwin = resolveMotion(true);
    let state = play(flows, 0);

    expect(staticTwin.durations.tourBeat).toBe(0);

    for (let step = 0; step < path.length; step += 1) {
      expect(positionAt(state, (step + 0.5) * BEAT, flows, BEAT).componentId).toBe(path[step]);

      state = tourReducer(state, { type: 'tick', now: (step + 1) * BEAT }, flows, BEAT);

      if (step + 1 < path.length) {
        expect(state.step).toBe(step + 1);
      } else {
        expect(state.status).toBe('ended');
      }
    }
  });
});

describe('showFlowSelector', () => {
  test('shows the selector only when there is a choice', () => {
    expect(showFlowSelector(projectA.flows)).toBe(true);
    expect(showFlowSelector(projectB.flows)).toBe(false);
    expect(showFlowSelector(projectC.flows)).toBe(true);
  });
});

describe('reset', () => {
  test('selects the first flow and returns to idle', () => {
    const played = play(FLOWS, 0);
    const reset = tourReducer(played, { type: 'reset', flows: projectB.flows }, FLOWS, BEAT);

    expect(reset).toStrictEqual(initialTour(projectB.flows));
  });
});

describe('review fixes (orchestrator)', () => {
  const flows = projectA.flows;
  const last = (flows[0]?.path.length ?? 0) - 1;

  test('stepping past the last step from paused ends with stepStartedAt = the step action time', () => {
    let state = tourReducer(initialTour(flows), { type: 'step', now: 1 }, flows, BEAT);

    for (let index = 0; index < last; index += 1) {
      state = tourReducer(state, { type: 'step', now: 2 + index }, flows, BEAT);
    }

    const ended = tourReducer(state, { type: 'step', now: 50 }, flows, BEAT);
    const position = positionAt(ended, 60, flows, BEAT);

    expect(ended.status).toBe('ended');
    expect(position.step).toBe(last);
    expect(position.stepStartedAt).toBe(50);
  });

  test('selecting the already selected flow keeps a playing tour playing', () => {
    const playing = play(flows, 0);
    const same = tourReducer(
      playing,
      { type: 'selectFlow', flowId: playing.flowId ?? '', now: BEAT / 2 },
      flows,
      BEAT,
    );

    expect(same.status).toBe('playing');
    expect(same.step).toBe(0);
  });
});
