import { describe, expect, test } from 'vitest';

import { parseProject, parseTechRegistry } from '../src/index';
import { fitZoom, layoutProject, VIEW } from '../src/layout';
import { look } from '../src/look/tokens';
import {
  overlayBaseModel,
  overlayHighlight,
  overlayStateModel,
  type OverlayLabel,
  type OverlayModel,
  type OverlayViewport,
} from '../src/overlay/model';
import { overlayFrame } from '../src/overlay/project';
import { projectAJson, techRegistryJson } from './fixtures';

const registry = parseTechRegistry(techRegistryJson);
const project = parseProject(projectAJson, { registry });
const layout = layoutProject(project);
const TAGS = { width: 390, height: 844 } as const;
const COLUMNS = { width: 1280, height: 720 } as const;
const SELECTED = 'beachgoer';
const HOVER = 'tide-chart-screen';
const IDLE_FOCUS = { layerId: null, suspended: false } as const;

function baseFor(viewport: OverlayViewport): OverlayModel {
  const frame = overlayFrame(layout, 1, {
    azimuth: VIEW.baseAzimuth,
    zoom: fitZoom(layout.bounds.exploded, viewport),
    ...viewport,
  });

  return overlayBaseModel({
    frame,
    layout,
    project,
    viewport,
    offsetY: 0,
    target: 'exploded',
    look,
  });
}

function label(model: OverlayModel, id: string): OverlayLabel | undefined {
  return model.labels.find((candidate) => candidate.key === `part:${id}`);
}

function emphasized(model: OverlayModel): readonly OverlayLabel[] {
  return model.labels.filter((candidate) => candidate.emphasis === true);
}

describe.each([
  ['tags', TAGS],
  ['columns', COLUMNS],
] as const)('overlay emphasis slots in %s mode', (mode, viewport) => {
  test('emphasises selected and hovered parts in their own slots', () => {
    const base = baseFor(viewport);

    expect(base.calloutMode).toBe(mode);

    const model = overlayStateModel(
      base,
      project,
      IDLE_FOCUS,
      { status: 'idle' },
      HOVER,
      look,
      SELECTED,
    );
    const selected = label(model, SELECTED);
    const hovered = label(model, HOVER);

    expect(emphasized(model)).toStrictEqual([selected, hovered]);
    expect(selected?.emphasis).toBe(true);
    expect(selected?.emphasisSlot).toBe('selected');
    expect(hovered?.emphasis).toBe(true);
    expect(hovered?.emphasisSlot).toBe('hover');

    const leaders = model.strokes.filter((stroke) => stroke.kind === 'leader');

    if (mode === 'tags') {
      expect(leaders).toStrictEqual([]);
      return;
    }

    expect(leaders).toHaveLength(2);

    for (const target of [selected, hovered]) {
      if (target === undefined || target.anchor === undefined) {
        throw new Error('Missing emphasised label anchor');
      }

      const middleY = target.y + target.h / 2;

      expect(leaders.find((stroke) => stroke.key === `leader:${target.key}`)).toStrictEqual({
        key: `leader:${target.key}`,
        kind: 'leader',
        points: [[target.x, middleY], [target.x - 12, middleY], target.anchor],
        role: look.callouts.emphasisRole,
        opacity: target.opacity,
      });
    }
  });

  test('keeps the old six-argument call deep-equal to the single emphasis', () => {
    const base = baseFor(viewport);

    for (const highlight of [null, SELECTED] as const) {
      expect(
        overlayStateModel(base, project, IDLE_FOCUS, { status: 'idle' }, highlight, look),
      ).toStrictEqual(overlayHighlight(base, highlight, look));
    }
  });
});

describe('overlay emphasis slot precedence', () => {
  test('uses one label and one leader when both slots hold the same id', () => {
    const base = baseFor(COLUMNS);
    const model = overlayStateModel(
      base,
      project,
      IDLE_FOCUS,
      { status: 'idle' },
      SELECTED,
      look,
      SELECTED,
    );
    const targets = emphasized(model);

    expect(targets).toHaveLength(1);
    expect(targets[0]?.key).toBe(`part:${SELECTED}`);
    expect(targets[0]?.emphasisSlot).toBe('hover selected');
    expect(model.strokes.filter((stroke) => stroke.kind === 'leader')).toHaveLength(1);
  });

  test('emphasises only selected when hover is null', () => {
    const model = overlayStateModel(
      baseFor(COLUMNS),
      project,
      IDLE_FOCUS,
      { status: 'idle' },
      null,
      look,
      SELECTED,
    );

    expect(emphasized(model).map((target) => target.key)).toStrictEqual([`part:${SELECTED}`]);
    expect(label(model, SELECTED)?.emphasisSlot).toBe('selected');
    expect(label(model, HOVER)?.emphasisSlot).toBeUndefined();
    expect(model.strokes.filter((stroke) => stroke.kind === 'leader')).toHaveLength(1);
  });

  test('lets the tour trail ignore both slots', () => {
    const base = baseFor(COLUMNS);
    const tour = { status: 'playing', flowId: 'live-update', step: 2 } as const;
    const oldCall = overlayStateModel(base, project, IDLE_FOCUS, tour, HOVER, look);
    const withSlots = overlayStateModel(base, project, IDLE_FOCUS, tour, HOVER, look, SELECTED);

    expect(withSlots).toStrictEqual(oldCall);
    expect(withSlots.labels.some((candidate) => candidate.emphasisSlot !== undefined)).toBe(false);
  });
});
