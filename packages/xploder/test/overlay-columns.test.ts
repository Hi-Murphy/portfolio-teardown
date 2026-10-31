import { describe, expect, test } from 'vitest';

import { parseProject, parseTechRegistry, type Project } from '../src/index';
import { fitZoom, layoutProject, VIEW } from '../src/layout';
import { resolveViewerLayoutOptions } from '../src/look/product';
import { look } from '../src/look/tokens';
import { calloutMode, placeColumns } from '../src/overlay/columns';
import { overlayModel, type OverlayLabel } from '../src/overlay/model';
import { labelBox } from '../src/overlay/parts';
import { rectIntersectsPolygon, rectsIntersect, type Rect } from '../src/overlay/place';
import { overlayFrame, type OverlayFrame } from '../src/overlay/project';
import { projectAJson, projectCJson, techRegistryJson } from './fixtures';

const VIEWPORT_INSET_PX = 4;
const registry = parseTechRegistry(techRegistryJson);
const PROJECTS = [
  ['A', parseProject(projectAJson, { registry })],
  ['C', parseProject(projectCJson, { registry })],
] as const satisfies readonly (readonly [string, Project])[];
const WIDE_VIEWPORTS = [
  { width: 1150, height: 562 },
  { width: 1280, height: 720 },
] as const;
const PHONES = [
  { width: 360, height: 640 },
  { width: 390, height: 844 },
] as const;

function box(label: Rect): Rect {
  return { x: label.x, y: label.y, w: label.w, h: label.h };
}

function frameFor(
  project: Project,
  viewport: { readonly width: number; readonly height: number },
): OverlayFrame {
  const layout = layoutProject(project, resolveViewerLayoutOptions());

  return overlayFrame(layout, 1, {
    azimuth: VIEW.baseAzimuth,
    zoom: fitZoom(layout.bounds.exploded, viewport),
    ...viewport,
  });
}

function expectInside(boxes: readonly Rect[], viewport: { width: number; height: number }): void {
  for (const candidate of boxes) {
    expect(candidate.x).toBeGreaterThanOrEqual(VIEWPORT_INSET_PX);
    expect(candidate.y).toBeGreaterThanOrEqual(VIEWPORT_INSET_PX);
    expect(candidate.x + candidate.w).toBeLessThanOrEqual(viewport.width - VIEWPORT_INSET_PX);
    expect(candidate.y + candidate.h).toBeLessThanOrEqual(viewport.height - VIEWPORT_INSET_PX);
  }
}

function expectClear(
  boxes: readonly Rect[],
  frame: OverlayFrame,
  viewport: { width: number; height: number },
): void {
  expectInside(boxes, viewport);

  for (const candidate of boxes) {
    for (const component of frame.components) {
      expect(rectIntersectsPolygon(candidate, component.hull)).toBe(false);
    }
  }

  for (let leftIndex = 0; leftIndex < boxes.length; leftIndex += 1) {
    const left = boxes[leftIndex];

    if (left === undefined) continue;

    for (let rightIndex = leftIndex + 1; rightIndex < boxes.length; rightIndex += 1) {
      const right = boxes[rightIndex];

      if (right !== undefined) expect(rectsIntersect(left, right)).toBe(false);
    }
  }
}

function tagLabels(labels: readonly OverlayLabel[]): readonly OverlayLabel[] {
  return labels.filter((label) => label.kind === 'tag');
}

describe('callout columns', () => {
  test.each(PROJECTS)(
    'keeps every fixture %s part and layer callout in aligned clear columns',
    (fixture, project) => {
      const layout = layoutProject(project, resolveViewerLayoutOptions());

      for (const viewport of WIDE_VIEWPORTS) {
        const frame = frameFor(project, viewport);
        const columns = placeColumns(frame, layout, project, viewport, look);

        expect(columns, `${fixture} ${viewport.width}x${viewport.height}`).not.toBeNull();

        if (columns === null) continue;

        expect(calloutMode(frame, layout, project, viewport, look, columns)).toBe('columns');

        const boxes = [
          ...columns.layerLabels,
          ...columns.groups.flatMap((group) => group.items),
          columns.rail.label,
          columns.footprint,
        ];

        expectClear(boxes, frame, viewport);

        const drawingXs = [
          ...frame.layers.flatMap((layer) => layer.corners.map((corner) => corner[0])),
          ...frame.components.flatMap((component) => component.hull.map((point) => point[0])),
        ];
        const extentMinX = Math.min(...drawingXs);
        const extentMaxX = Math.max(...drawingXs);

        expect(
          columns.layerLabels.every(
            (label) => label.x + label.w === extentMinX - look.callouts.columnGapPx,
          ),
        ).toBe(true);
        expect(columns.rail.rail.from[0]).toBe(extentMinX - look.callouts.columnGapPx / 2);
        expect(columns.rail.rail.to[0]).toBe(extentMinX - look.callouts.columnGapPx / 2);
        expect(columns.rail.label.x + columns.rail.label.w / 2).toBe(
          extentMinX - look.callouts.columnGapPx / 2,
        );
        expect(columns.rail.label.y + columns.rail.label.h).toBeLessThan(columns.rail.rail.from[1]);
        expect(
          columns.groups.every((group) => group.items[0]?.x === columns.groups[0]?.items[0]?.x),
        ).toBe(true);
        expect(columns.groups[0]?.items[0]?.x ?? 0).toBeGreaterThanOrEqual(
          extentMaxX + look.callouts.columnGapPx,
        );

        columns.layerLabels.forEach((label) => {
          expect({ w: label.w, h: label.h }).toStrictEqual(labelBox(label.text, look.annotation));
        });

        columns.groups.forEach((group, groupIndex) => {
          const source = project.layers[group.layerIndex];

          expect(group.items.map((item) => item.componentId)).toStrictEqual(
            source?.components.map((component) => component.id),
          );

          const first = group.items[0];

          group.items.forEach((item, itemIndex) => {
            expect({ w: item.w, h: item.h }).toStrictEqual(labelBox(item.text, look.annotation));

            if (first !== undefined) {
              expect(item.y).toBe(first.y + itemIndex * (item.h + look.callouts.rowGapPx));
            }
          });

          const next = columns.groups[groupIndex + 1];

          if (next !== undefined && first !== undefined && next.items[0] !== undefined) {
            expect(
              first.y +
                group.items.reduce((sum, item) => sum + item.h, 0) +
                look.callouts.rowGapPx * (group.items.length - 1),
            ).toBeLessThanOrEqual(next.items[0].y);
          }
        });

        const model = overlayModel({
          frame,
          layout,
          project,
          viewport,
          offsetY: 0,
          target: 'exploded',
          tour: { status: 'idle' },
          focus: { layerId: null, suspended: false },
          look,
        });

        expect(model.calloutMode).toBe('columns');
        expect(model.strokes.filter((stroke) => stroke.kind === 'leader')).toStrictEqual([]);
        expect(model.labels.some((label) => label.emphasis === true)).toBe(false);
      }
    },
  );

  test.each(PROJECTS)(
    'draws one accent leader from the highlighted %s callout to the part anchor',
    (fixture, project) => {
      const layout = layoutProject(project, resolveViewerLayoutOptions());
      const viewport = WIDE_VIEWPORTS[0];
      const frame = frameFor(project, viewport);
      const component = frame.components[0];

      if (component === undefined) throw new Error('Missing component');

      const model = overlayModel({
        frame,
        layout,
        project,
        viewport,
        offsetY: 0,
        target: 'exploded',
        tour: { status: 'idle' },
        focus: { layerId: null, suspended: false },
        look,
        highlight: component.id,
      });
      const leaders = model.strokes.filter((stroke) => stroke.kind === 'leader');
      const target = model.labels.find((label) => label.key === `part:${component.id}`);

      expect(leaders).toHaveLength(1);
      expect(leaders[0]?.role).toBe(look.callouts.emphasisRole);
      expect(leaders[0]?.points[0]).toStrictEqual([
        target?.x,
        (target?.y ?? 0) + (target?.h ?? 0) / 2,
      ]);
      expect(leaders[0]?.points[1]).toStrictEqual([
        (target?.x ?? 0) - 12,
        (target?.y ?? 0) + (target?.h ?? 0) / 2,
      ]);
      expect(leaders[0]?.points[2]).toStrictEqual(component.anchor);
      expect(target?.emphasis).toBe(true);
    },
  );
});

describe('callout tags', () => {
  test.each(PROJECTS)(
    'uses phone tags for fixture %s without tag overlaps or foreign hull hits',
    (fixture, project) => {
      const layout = layoutProject(project, resolveViewerLayoutOptions());

      for (const viewport of PHONES) {
        const frame = frameFor(project, viewport);

        expect(calloutMode(frame, layout, project, viewport, look)).toBe('tags');

        const model = overlayModel({
          frame,
          layout,
          project,
          viewport,
          offsetY: 0,
          target: 'exploded',
          tour: { status: 'idle' },
          focus: { layerId: null, suspended: false },
          look,
        });
        const tags = tagLabels(model.labels);

        expect(tags).toHaveLength(frame.components.length);
        expectInside(tags, viewport);
        expect(tags.every((label) => label.srText !== undefined)).toBe(true);
        expect(
          tags.every(
            (label) =>
              label.w === labelBox(label.text, look.annotation).w &&
              label.h === labelBox(label.text, look.annotation).h,
          ),
        ).toBe(true);
        expect(model.strokes.filter((stroke) => stroke.kind === 'leader')).toStrictEqual([]);

        for (let leftIndex = 0; leftIndex < tags.length; leftIndex += 1) {
          const left = tags[leftIndex];

          if (left === undefined) continue;

          for (let rightIndex = leftIndex + 1; rightIndex < tags.length; rightIndex += 1) {
            const right = tags[rightIndex];

            if (right !== undefined) expect(rectsIntersect(left, right)).toBe(false);
          }

          for (const component of frame.components) {
            if (left.key === `part:${component.id}`) continue;

            expect(rectIntersectsPolygon(box(left), component.hull)).toBe(false);
          }
        }

        console.log(
          `${fixture} ${viewport.width}x${viewport.height}: mode=tags tags=${tags.length} hidden=${model.hidden}`,
        );
      }
    },
  );

  test('marks only the highlighted tag without adding a leader', () => {
    const project = PROJECTS[0][1];
    const layout = layoutProject(project, resolveViewerLayoutOptions());
    const viewport = PHONES[0];
    const frame = frameFor(project, viewport);
    const component = frame.components[0];

    if (component === undefined) throw new Error('Missing component');

    const model = overlayModel({
      frame,
      layout,
      project,
      viewport,
      offsetY: 0,
      target: 'exploded',
      tour: { status: 'idle' },
      focus: { layerId: null, suspended: false },
      look,
      highlight: component.id,
    });
    const emphasized = model.labels.filter((label) => label.emphasis === true);

    expect(emphasized).toHaveLength(1);
    expect(emphasized[0]?.key).toBe(`part:${component.id}`);
    expect(model.strokes.filter((stroke) => stroke.kind === 'leader')).toStrictEqual([]);
  });

  test('falls back to tags on a wide canvas when the columns do not fit', () => {
    const project = PROJECTS[0][1];
    const layout = layoutProject(project, resolveViewerLayoutOptions());
    const viewport = { width: 768, height: 180 } as const;
    const frame = frameFor(project, viewport);

    expect(placeColumns(frame, layout, project, viewport, look)).toBeNull();
    expect(calloutMode(frame, layout, project, viewport, look)).toBe('tags');
  });
});
