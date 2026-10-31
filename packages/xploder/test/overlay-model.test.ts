import { describe, expect, test } from 'vitest';

import { parseProject, parseTechRegistry } from '../src/index';
import { fitZoom, layoutProject, VIEW } from '../src/layout';
import { look } from '../src/look/tokens';
import { emphasis } from '../src/motion/emphasis';
import {
  overlayLabels,
  overlayModel,
  type OverlayLabel,
  type OverlayModel,
  type OverlayModelInput,
  type OverlayState,
  type OverlayViewport,
} from '../src/overlay/model';
import { placeLabels } from '../src/overlay/place';
import { labelBox } from '../src/overlay/parts';
import { overlayFrame, type OverlayFrame, type Vec2 } from '../src/overlay/project';
import { projectAJson, techRegistryJson } from './fixtures';

const registry = parseTechRegistry(techRegistryJson);
const project = parseProject(projectAJson, { registry });
const layout = layoutProject(project);
const NARROW = { width: 390, height: 844 } as const;
const WIDE = { width: 1280, height: 720 } as const;
const OFFSET_Y = 37;

type ModelOverrides = Partial<Pick<OverlayModelInput, 'offsetY' | 'target' | 'tour' | 'focus'>>;

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
    look,
  });
}

function parts(model: OverlayModel): readonly OverlayLabel[] {
  return model.labels.filter((label) => label.kind === 'part');
}

function componentName(id: string): string {
  const component = project.layers
    .flatMap((layer) => layer.components)
    .find((candidate) => candidate.id === id);

  if (component === undefined) throw new Error(`Missing component ${id}`);
  return component.name;
}

describe('overlay model visibility', () => {
  test('hides every annotation while a tour is not idle', () => {
    const model = modelFor(NARROW, { tour: { status: 'playing' } });

    expect(model.labels).toStrictEqual([]);
    expect(model.strokes).toStrictEqual([]);
    expect(model.hidden).toBe(0);
    expect(model.shown).toBe(false);
  });

  test('keeps layer and dimension labels but removes parts when imploded', () => {
    const model = modelFor(NARROW, { target: 'imploded' });

    expect(parts(model)).toStrictEqual([]);
    expect(model.labels.some((label) => label.kind === 'layer')).toBe(true);
    expect(model.labels.map((label) => label.key)).toEqual(
      expect.arrayContaining(['dimension:stack', 'dimension:footprint']),
    );
    expect(model.shown).toBe(true);
  });

  test('dims labels and leaders outside the focused layer', () => {
    const model = modelFor(WIDE, {
      focus: { layerId: 'data', suspended: false },
    });
    const focused = model.labels.filter(
      (label) => label.layerIndex !== null && project.layers[label.layerIndex]?.id === 'data',
    );
    const dimmed = model.labels.filter(
      (label) => label.layerIndex !== null && project.layers[label.layerIndex]?.id !== 'data',
    );
    const dimensions = model.labels.filter((label) => label.kind === 'dimension');

    expect(focused.length).toBeGreaterThan(0);
    expect(dimmed.length).toBeGreaterThan(0);
    expect(focused.every((label) => label.opacity === 1)).toBe(true);
    expect(dimmed.every((label) => label.opacity === emphasis.dim.level)).toBe(true);
    expect(dimensions.every((label) => label.opacity === 1)).toBe(true);
    expect(
      model.strokes
        .filter((stroke) => stroke.kind === 'leader')
        .every((stroke) => stroke.opacity === 1 || stroke.opacity === emphasis.dim.level),
    ).toBe(true);
  });

  test('uses no dimming when focus is absent or suspended', () => {
    const absent = modelFor(WIDE, { focus: { layerId: null, suspended: false } });
    const suspended = modelFor(WIDE, { focus: { layerId: 'data', suspended: true } });

    expect(absent.labels.every((label) => label.opacity === 1)).toBe(true);
    expect(absent.strokes.every((stroke) => stroke.opacity === 1)).toBe(true);
    expect(suspended.labels.every((label) => label.opacity === 1)).toBe(true);
    expect(suspended.strokes.every((stroke) => stroke.opacity === 1)).toBe(true);
  });
});

describe('overlay model labels', () => {
  test('uses short part text with a screen-reader name below the wide threshold', () => {
    const narrowParts = parts(modelFor(NARROW));

    expect(narrowParts.length).toBeGreaterThan(0);

    for (const label of narrowParts) {
      const id = label.key.slice('part:'.length);

      expect(label.text).toMatch(/^\d+\.\d+$/);
      expect(label.srText).toBe(componentName(id));
    }
  });

  test('uses long part text at the wide threshold', () => {
    const wideParts = parts(modelFor(WIDE));
    const first = wideParts[0];

    expect(wideParts.length).toBeGreaterThan(0);
    expect(first?.text).toBe('1.1 Beachgoer');
    expect(first?.srText).toBeUndefined();
  });

  test('sets every label box to the deterministic size model', () => {
    for (const viewport of [NARROW, WIDE]) {
      for (const label of modelFor(viewport).labels) {
        expect({ w: label.w, h: label.h }).toStrictEqual(labelBox(label.text, look.annotation));
      }
    }
  });

  test('reports the placement hidden count', () => {
    const viewport = { width: 180, height: 180 };
    const frame = frameFor(viewport, 'exploded', 0);
    const labels = overlayLabels(frame, layout, project, viewport, 'exploded');
    const placement = placeLabels(
      labels,
      frame.components.map((component) => component.hull),
      viewport,
      look,
    );
    const model = modelFor(viewport);

    expect(placement.hidden.length).toBeGreaterThan(0);
    expect(model.hidden).toBe(placement.hidden.length);
  });

  test('returns content-space labels and strokes after an offset round trip', () => {
    const base = modelFor(WIDE);
    const shifted = modelFor(WIDE, { offsetY: OFFSET_Y });
    const baseByKey = new Map(base.labels.map((label) => [label.key, label]));

    for (const label of shifted.labels) {
      const original = baseByKey.get(label.key);

      if (original === undefined) throw new Error(`Missing base label ${label.key}`);

      expect(label.x).toBe(original.x);
      expect(label.y).toBe(original.y + OFFSET_Y);
      expect(label.w).toBe(original.w);
      expect(label.h).toBe(original.h);
    }

    const baseStrokes = new Map(base.strokes.map((stroke) => [stroke.key, stroke]));

    for (const stroke of shifted.strokes) {
      const original = baseStrokes.get(stroke.key);

      if (original === undefined) throw new Error(`Missing base stroke ${stroke.key}`);

      expect(stroke.points[0]).toStrictEqual(shiftPoint(original.points[0], OFFSET_Y));
      expect(stroke.points[1]).toStrictEqual(shiftPoint(original.points[1], OFFSET_Y));
    }
  });
});

describe('overlay model strokes', () => {
  test('includes both dimension groups and one leader for every placed leader', () => {
    const viewport = WIDE;
    const frame = frameFor(viewport, 'exploded', 0);
    const labels = overlayLabels(frame, layout, project, viewport, 'exploded');
    const placement = placeLabels(
      labels,
      frame.components.map((component) => component.hull),
      viewport,
      look,
    );
    const model = modelFor(viewport);
    const leaders = placement.placements.flatMap((item) =>
      item.leader === null ? [] : [{ key: item.key, leader: item.leader }],
    );
    const leaderStrokes = model.strokes.filter((stroke) => stroke.kind === 'leader');

    expect(model.strokes.some((stroke) => stroke.kind === 'stack-rail')).toBe(true);
    expect(model.strokes.some((stroke) => stroke.kind === 'footprint-line')).toBe(true);
    expect(leaders.length).toBeGreaterThan(0);
    expect(leaderStrokes).toHaveLength(leaders.length);

    leaders.forEach(({ key, leader }, index) => {
      expect(leaderStrokes[index]?.key).toBe(`leader:${key}`);
      expect(leaderStrokes[index]?.points).toStrictEqual([leader.from, leader.to]);
    });

    expect(
      model.strokes
        .filter((stroke) => stroke.kind !== 'leader')
        .every((stroke) => stroke.role === look.annotation.dimensionRole),
    ).toBe(true);
    expect(leaderStrokes.every((stroke) => stroke.role === look.annotation.leaderRole)).toBe(true);
  });
});
