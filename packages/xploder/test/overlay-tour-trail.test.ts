import { describe, expect, test } from 'vitest';

import { parseProject, parseTechRegistry } from '../src/index';
import { fitZoom, layoutProject, VIEW } from '../src/layout';
import { look } from '../src/look/tokens';
import {
  overlayBaseModel,
  overlayModel,
  overlayStateModel,
  type OverlayLabel,
  type OverlayModel,
  type OverlayModelInput,
  type OverlayState,
  type OverlayViewport,
} from '../src/overlay/model';
import { overlayFrame, type OverlayFrame, type Vec2 } from '../src/overlay/project';
import { projectAJson, techRegistryJson } from './fixtures';

const registry = parseTechRegistry(techRegistryJson);
const project = parseProject(projectAJson, { registry });
const layout = layoutProject(project);
const NARROW = { width: 390, height: 844 } as const;
const WIDE = { width: 1280, height: 720 } as const;
const FLOW_ID = 'live-update';
const flow = project.flows.find((candidate) => candidate.id === FLOW_ID);

if (flow === undefined) throw new Error(`Missing ${FLOW_ID} flow`);

type ModelOverrides = Partial<
  Pick<OverlayModelInput, 'offsetY' | 'target' | 'tour' | 'focus' | 'highlight'>
>;

function shiftPoint([x, y]: Vec2, offsetY: number): Vec2 {
  return [x, y + offsetY];
}

function shiftFrame(frame: OverlayFrame, offsetY: number): OverlayFrame {
  return {
    layers: frame.layers.map((layer) => ({
      ...layer,
      corners: layer.corners.map((corner) => shiftPoint(corner, offsetY)) as [
        Vec2,
        Vec2,
        Vec2,
        Vec2,
      ],
    })),
    components: frame.components.map((component) => ({
      ...component,
      anchor: shiftPoint(component.anchor, offsetY),
      hull: component.hull.map((point) => shiftPoint(point, offsetY)),
    })),
  };
}

function frameFor(viewport: OverlayViewport, target: OverlayState, offsetY: number): OverlayFrame {
  const frame = overlayFrame(layout, target === 'exploded' ? 1 : 0, {
    azimuth: VIEW.baseAzimuth,
    zoom: fitZoom(layout.bounds.exploded, viewport),
    ...viewport,
  });

  return offsetY === 0 ? frame : shiftFrame(frame, offsetY);
}

function baseFor(viewport: OverlayViewport, overrides: ModelOverrides = {}): OverlayModel {
  const target = overrides.target ?? 'exploded';
  const offsetY = overrides.offsetY ?? 0;

  return overlayBaseModel({
    frame: frameFor(viewport, target, offsetY),
    layout,
    project,
    viewport,
    offsetY,
    target,
    look,
  });
}

function stateModelFor(viewport: OverlayViewport, overrides: ModelOverrides = {}): OverlayModel {
  return overlayStateModel(
    baseFor(viewport, overrides),
    project,
    overrides.focus ?? { layerId: null, suspended: false },
    overrides.tour ?? { status: 'idle' },
    overrides.highlight,
    look,
  );
}

function modelFor(viewport: OverlayViewport, overrides: ModelOverrides = {}): OverlayModel {
  const target = overrides.target ?? 'exploded';
  const offsetY = overrides.offsetY ?? 0;

  return overlayModel({
    frame: frameFor(viewport, target, offsetY),
    layout,
    project,
    viewport,
    offsetY,
    target,
    tour: overrides.tour ?? { status: 'idle' },
    focus: overrides.focus ?? { layerId: null, suspended: false },
    highlight: overrides.highlight,
    look,
  });
}

function partLabels(model: OverlayModel): readonly OverlayLabel[] {
  return model.labels.filter((label) => label.kind === 'part');
}

describe('overlay tour trail', () => {
  test('uses fixture A in a columns viewport as the trail precondition', () => {
    expect(modelFor(WIDE).calloutMode).toBe('columns');
    expect(modelFor(NARROW).calloutMode).toBe('tags');
  });

  test('shows one label and one leader for the first step', () => {
    const model = stateModelFor(WIDE, { tour: { status: 'playing', flowId: FLOW_ID, step: 0 } });
    const labels = partLabels(model);
    const leaders = model.strokes.filter((stroke) => stroke.kind === 'leader');
    const first = labels[0];

    expect(model.calloutMode).toBe('columns');
    expect(model.labels.every((label) => label.kind === 'part')).toBe(true);
    expect(model.strokes.every((stroke) => stroke.kind === 'leader')).toBe(true);
    expect(labels.map((label) => label.key)).toStrictEqual(['part:beachgoer']);
    expect(labels.filter((label) => label.emphasis === true)).toStrictEqual([first]);
    expect(leaders).toHaveLength(1);
    expect(leaders[0]?.key).toBe('leader:part:beachgoer');
    expect(leaders[0]?.role).toBe('accent');
    expect(leaders[0]?.points).toStrictEqual(
      first === undefined || first.anchor === undefined
        ? []
        : [[first.x, first.y + first.h / 2], [first.x - 12, first.y + first.h / 2], first.anchor],
    );
    expect(model.titleBlock).toBeNull();
  });

  test('builds the visited labels and leaders in path order through step 3', () => {
    const model = modelFor(WIDE, { tour: { status: 'playing', flowId: FLOW_ID, step: 3 } });
    const labels = partLabels(model);
    const leaders = model.strokes.filter((stroke) => stroke.kind === 'leader');

    expect(labels.map((label) => label.key)).toStrictEqual(
      flow.path.slice(0, 4).map((id) => `part:${id}`),
    );
    expect(
      labels.filter((label) => label.emphasis === true).map((label) => label.key),
    ).toStrictEqual([`part:${flow.path[3]}`]);
    expect(leaders.map((stroke) => stroke.key)).toStrictEqual(
      flow.path.slice(0, 4).map((id) => `leader:part:${id}`),
    );
    expect(leaders.map((stroke) => stroke.role)).toStrictEqual([
      look.annotation.leaderRole,
      look.annotation.leaderRole,
      look.annotation.leaderRole,
      look.callouts.emphasisRole,
    ]);
    expect(model.labels).toHaveLength(4);
    expect(model.strokes).toHaveLength(4);
  });

  test('keeps the trail while the tour is paused', () => {
    const model = stateModelFor(WIDE, { tour: { status: 'paused', flowId: FLOW_ID, step: 2 } });

    expect(partLabels(model).map((label) => label.key)).toStrictEqual(
      flow.path.slice(0, 3).map((id) => `part:${id}`),
    );
    expect(model.strokes.filter((stroke) => stroke.kind === 'leader')).toHaveLength(3);
  });

  test('returns an empty model for an unknown flow', () => {
    const model = modelFor(WIDE, { tour: { status: 'playing', flowId: 'missing-flow', step: 0 } });

    expect(model).toStrictEqual({
      labels: [],
      strokes: [],
      titleBlock: null,
      hidden: 0,
      shown: false,
      calloutMode: null,
    });
  });

  test('returns an empty model outside the columns mode', () => {
    const model = modelFor(NARROW, { tour: { status: 'playing', flowId: FLOW_ID, step: 0 } });

    expect(model).toStrictEqual({
      labels: [],
      strokes: [],
      titleBlock: null,
      hidden: 0,
      shown: false,
      calloutMode: null,
    });
  });

  test('leaves the idle base model unchanged', () => {
    const expected = stateModelFor(WIDE, { tour: { status: 'idle' } });
    const actual = modelFor(WIDE, { tour: { status: 'idle' } });

    expect(actual).toStrictEqual(expected);
  });
});
