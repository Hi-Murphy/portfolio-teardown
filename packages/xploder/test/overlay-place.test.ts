import { describe, expect, test } from 'vitest';

import { parseProject, parseTechRegistry, type Project } from '../src/index';
import { fitZoom, layoutProject, VIEW } from '../src/layout';
import { resolveViewerLayoutOptions } from '../src/look/product';
import { look } from '../src/look/tokens';
import { calloutMode, placeColumns } from '../src/overlay/columns';
import { overlayBaseModel, overlayLabels } from '../src/overlay/model';
import {
  PLACEMENT_RADII,
  placeLabels,
  rectIntersectsPolygon,
  rectsIntersect,
  type LabelPlacement,
  type Rect,
} from '../src/overlay/place';
import { labelBox } from '../src/overlay/parts';
import { overlayFrame, type OverlayFrame, type Vec2 } from '../src/overlay/project';
import { projectAJson, projectBJson, projectCJson, techRegistryJson } from './fixtures';

// Pure maths, but ~7k cases: ~17 s locally and ~44 s on CI runners (vitest default is 30 s).
const DENSE_SWEEP_TIMEOUT_MS = 180_000;
const registry = parseTechRegistry(techRegistryJson);
const PROJECTS = [
  ['A', parseProject(projectAJson, { registry })],
  ['B', parseProject(projectBJson, { registry })],
  ['C', parseProject(projectCJson, { registry })],
] as const satisfies readonly (readonly [string, Project])[];
const AZIMUTHS = [0, 1, 2, 3].map((index) => VIEW.baseAzimuth + index * VIEW.snap);
const VIEWPORTS = [
  { width: 360, height: 480 },
  { width: 360, height: 640 },
  { width: 390, height: 844 },
  { width: 768, height: 1024 },
  { width: 1280, height: 720 },
] as const;
const STATES = [
  ['imploded', 0],
  ['exploded', 1],
] as const;
const VIEWPORT_INSET_PX = 4;

function box(placement: Rect): Rect {
  return { x: placement.x, y: placement.y, w: placement.w, h: placement.h };
}

function expectReadable(
  placements: readonly LabelPlacement[],
  frame: OverlayFrame,
  viewport: { readonly width: number; readonly height: number },
): void {
  expect(look.annotation.fontPx).toBeGreaterThanOrEqual(12);

  placements.forEach((placement) => {
    const placementBox = box(placement);

    expect(placementBox).toStrictEqual({
      ...placementBox,
      ...labelBox(placement.text, look.annotation),
    });
    expect(placement.x).toBeGreaterThanOrEqual(VIEWPORT_INSET_PX);
    expect(placement.y).toBeGreaterThanOrEqual(VIEWPORT_INSET_PX);
    expect(placement.x + placement.w).toBeLessThanOrEqual(viewport.width - VIEWPORT_INSET_PX);
    expect(placement.y + placement.h).toBeLessThanOrEqual(viewport.height - VIEWPORT_INSET_PX);

    for (const component of frame.components) {
      expect(
        rectIntersectsPolygon(placementBox, component.hull),
        `${placement.key} intersects ${component.id}`,
      ).toBe(false);
    }
  });

  for (let leftIndex = 0; leftIndex < placements.length; leftIndex += 1) {
    const left = placements[leftIndex];

    if (left === undefined) continue;

    for (let rightIndex = leftIndex + 1; rightIndex < placements.length; rightIndex += 1) {
      const right = placements[rightIndex];

      if (right === undefined) continue;

      expect(rectsIntersect(box(left), box(right)), `${left.key} overlaps ${right.key}`).toBe(
        false,
      );
    }
  }
}

function maximumLeaderLength(placements: readonly LabelPlacement[]): number {
  return placements.reduce((maximum, placement) => {
    if (placement.leader === null) return maximum;

    return Math.max(
      maximum,
      Math.hypot(
        placement.leader.to[0] - placement.leader.from[0],
        placement.leader.to[1] - placement.leader.from[1],
      ),
    );
  }, 0);
}

function expectColumnBoxes(
  frame: OverlayFrame,
  layout: ReturnType<typeof layoutProject>,
  project: Project,
  viewport: { readonly width: number; readonly height: number },
  context: string,
  fail: (context: string, detail: string) => void,
): void {
  const columns = placeColumns(frame, layout, project, viewport, look);

  if (columns === null) {
    fail(context, 'column mode has no layout');
    return;
  }

  const boxes = [
    ...columns.layerLabels,
    ...columns.groups.flatMap((group) => group.items),
    columns.rail.label,
    columns.footprint,
  ];

  for (const placement of boxes) {
    const placementBox = box(placement);

    if (
      placement.x < VIEWPORT_INSET_PX ||
      placement.y < VIEWPORT_INSET_PX ||
      placement.x + placement.w > viewport.width - VIEWPORT_INSET_PX ||
      placement.y + placement.h > viewport.height - VIEWPORT_INSET_PX
    ) {
      fail(context, `${placement.key} outside viewport`);
    }

    if (frame.components.some((component) => rectIntersectsPolygon(placementBox, component.hull))) {
      fail(context, `${placement.key} intersects a hull`);
    }
  }

  for (let leftIndex = 0; leftIndex < boxes.length; leftIndex += 1) {
    const left = boxes[leftIndex];

    if (left === undefined) continue;

    for (let rightIndex = leftIndex + 1; rightIndex < boxes.length; rightIndex += 1) {
      const right = boxes[rightIndex];

      if (right !== undefined && rectsIntersect(box(left), box(right))) {
        fail(context, `${left.key} overlaps ${right.key}`);
      }
    }
  }
}

function expectTagBoxes(
  project: Project,
  frame: OverlayFrame,
  layout: ReturnType<typeof layoutProject>,
  viewport: { readonly width: number; readonly height: number },
  context: string,
  fail: (context: string, detail: string) => void,
): number {
  const model = overlayBaseModel({
    frame,
    layout,
    project,
    viewport,
    offsetY: 0,
    target: 'exploded',
    look,
  });
  const tags = model.labels.filter((label) => label.kind === 'tag');

  if (tags.length !== frame.components.length) {
    fail(context, `tags=${tags.length} expected=${frame.components.length}`);
  }
  if (model.hidden > 0) fail(context, `hidden=${model.hidden}`);

  for (const tag of tags) {
    if (
      tag.x < VIEWPORT_INSET_PX ||
      tag.y < VIEWPORT_INSET_PX ||
      tag.x + tag.w > viewport.width - VIEWPORT_INSET_PX ||
      tag.y + tag.h > viewport.height - VIEWPORT_INSET_PX
    ) {
      fail(context, `${tag.key} outside viewport`);
    }

    for (const component of frame.components) {
      if (tag.key === `part:${component.id}`) continue;
      if (rectIntersectsPolygon(box(tag), component.hull)) {
        fail(context, `${tag.key} intersects ${component.id}`);
      }
    }
  }

  for (let leftIndex = 0; leftIndex < tags.length; leftIndex += 1) {
    const left = tags[leftIndex];

    if (left === undefined) continue;

    for (let rightIndex = leftIndex + 1; rightIndex < tags.length; rightIndex += 1) {
      const right = tags[rightIndex];

      if (right !== undefined && rectsIntersect(box(left), box(right))) {
        fail(context, `${left.key} overlaps ${right.key}`);
      }
    }
  }

  return tags.length;
}

describe('overlay label placement matrix', () => {
  test.each(PROJECTS)(
    'keeps every %s label readable across azimuths, states and viewports',
    (fixture, project) => {
      const layout = layoutProject(project, resolveViewerLayoutOptions());
      const failures: string[] = [];

      for (const viewport of VIEWPORTS) {
        const zoom = fitZoom(layout.bounds.exploded, viewport);

        for (const azimuth of AZIMUTHS) {
          for (const [state, progress] of STATES) {
            const frame = overlayFrame(layout, progress, {
              azimuth,
              zoom,
              ...viewport,
            });
            const labels = overlayLabels(frame, layout, project, viewport, state);
            const result = placeLabels(
              labels,
              frame.components.map((component) => component.hull),
              viewport,
              look,
            );
            const azimuthDegrees = Math.round((azimuth * 180) / Math.PI);
            const context = `${fixture} ${azimuthDegrees}deg ${state} ${viewport.width}x${viewport.height}`;

            if (state === 'imploded') {
              expect(labels).toStrictEqual([]);
              expect(result.placements).toStrictEqual([]);
            } else if (
              result.hidden.length > 0 ||
              result.offscreen.length > 0 ||
              result.placements.length !== labels.length
            ) {
              failures.push(
                `${context}: hidden=[${result.hidden.join(',')}] offscreen=[${result.offscreen.join(',')}]`,
              );
            } else {
              expectReadable(result.placements, frame, viewport);
            }

            console.log(
              `${context}: placed=${result.placements.length} hidden=${result.hidden.length} fellBack=${result.fellBack.length} maxLeader=${maximumLeaderLength(result.placements).toFixed(2)}px`,
            );
          }
        }
      }

      expect(failures).toStrictEqual([]);
    },
  );

  test(
    'keeps every callout readable across the dense canvas sweep',
    () => {
      let cases = 0;
      let failures = 0;
      let columnCases = 0;
      let tagCases = 0;
      let tagCount = 0;
      const examples: string[] = [];

      function fail(context: string, detail: string): void {
        failures += 1;
        if (examples.length < 20) examples.push(`${context}: ${detail}`);
      }

      for (const [fixture, project] of PROJECTS) {
        const layout = layoutProject(project, resolveViewerLayoutOptions());

        for (let width = 360; width <= 1700; width += 40) {
          for (let height = 300; height <= 1000; height += 40) {
            const viewport = { width, height };
            const zoom = fitZoom(layout.bounds.exploded, viewport);

            for (const azimuth of AZIMUTHS) {
              cases += 1;

              const frame = overlayFrame(layout, 1, { azimuth, zoom, ...viewport });
              const columns =
                width >= look.annotation.wideMinPx
                  ? placeColumns(frame, layout, project, viewport, look)
                  : null;
              const mode = calloutMode(frame, layout, project, viewport, look, columns);
              const azimuthDegrees = Math.round((azimuth * 180) / Math.PI);
              const context = `${fixture} ${azimuthDegrees}deg ${width}x${height}`;

              if (mode === 'columns') {
                columnCases += 1;
                expectColumnBoxes(frame, layout, project, viewport, context, fail);
              } else {
                tagCases += 1;
                tagCount += expectTagBoxes(project, frame, layout, viewport, context, fail);
              }
            }
          }
        }
      }

      console.log(
        `dense callout sweep: cases=${cases} failures=${failures} columns=${columnCases} tags=${tagCases} tagsPlaced=${tagCount}`,
      );

      expect(examples).toStrictEqual([]);
      expect(failures).toBe(0);
    },
    DENSE_SWEEP_TIMEOUT_MS,
  );

  test('is deterministic for identical input', () => {
    const project = PROJECTS[0][1];
    const layout = layoutProject(project, resolveViewerLayoutOptions());
    const viewport = VIEWPORTS[2];
    const frame = overlayFrame(layout, 1, {
      azimuth: VIEW.baseAzimuth,
      zoom: fitZoom(layout.bounds.exploded, viewport),
      ...viewport,
    });
    const labels = overlayLabels(frame, layout, project, viewport, 'exploded');
    const obstacles = frame.components.map((component) => component.hull);

    expect(placeLabels(labels, obstacles, viewport, look)).toStrictEqual(
      placeLabels(labels, obstacles, viewport, look),
    );
  });

  test('reports off-screen anchors separately at 3x zoom and keeps placed boxes apart', () => {
    const project = PROJECTS[0][1];
    const layout = layoutProject(project, resolveViewerLayoutOptions());
    const viewport = { width: 360, height: 640 };
    const frame = overlayFrame(layout, 1, {
      azimuth: VIEW.baseAzimuth,
      zoom: 3 * fitZoom(layout.bounds.exploded, viewport),
      ...viewport,
    });
    const labels = overlayLabels(frame, layout, project, viewport, 'exploded');
    const result = placeLabels(
      labels,
      frame.components.map((component) => component.hull),
      viewport,
      look,
    );
    const expectedOffscreen = labels
      .filter(
        (label) =>
          label.anchor[0] < 0 ||
          label.anchor[0] > viewport.width ||
          label.anchor[1] < 0 ||
          label.anchor[1] > viewport.height,
      )
      .map((label) => label.key)
      .sort();

    expect(expectedOffscreen.length).toBeGreaterThan(0);
    expect([...result.offscreen].sort()).toStrictEqual(expectedOffscreen);
    expect(result.placements.length + result.hidden.length + result.offscreen.length).toBe(
      labels.length,
    );
    expectReadable(result.placements, frame, viewport);

    console.log(
      `zoomed 3x 360x640: placed=${result.placements.length} hidden=${result.hidden.length} fellBack=${result.fellBack.length} offscreen=${result.offscreen.length} maxLeader=${maximumLeaderLength(result.placements).toFixed(2)}px`,
    );
  });
});

describe('separating-axis intersection', () => {
  test('detects separated, touching, overlapping and contained rectangles', () => {
    const base = { x: 0, y: 0, w: 10, h: 10 };

    expect(rectsIntersect(base, { x: 12, y: 0, w: 5, h: 5 })).toBe(false);
    expect(rectsIntersect(base, { x: 10, y: 0, w: 5, h: 5 })).toBe(true);
    expect(rectsIntersect(base, { x: 8, y: 8, w: 5, h: 5 })).toBe(true);
    expect(rectsIntersect(base, { x: 2, y: 2, w: 2, h: 2 })).toBe(true);
  });

  test('uses polygon edges as SAT axes', () => {
    const diamond: readonly Vec2[] = [
      [5, 0],
      [10, 5],
      [5, 10],
      [0, 5],
    ];

    expect(rectIntersectsPolygon({ x: 20, y: 0, w: 5, h: 5 }, diamond)).toBe(false);
    expect(rectIntersectsPolygon({ x: 10, y: 0, w: 5, h: 5 }, diamond)).toBe(true);
    expect(rectIntersectsPolygon({ x: 7, y: 5, w: 4, h: 4 }, diamond)).toBe(true);
    expect(rectIntersectsPolygon({ x: 4, y: 4, w: 2, h: 2 }, diamond)).toBe(true);
  });
});

describe('placement priority and fallback', () => {
  const viewport = { width: 400, height: 400 };
  const anchor: Vec2 = [200, 200];

  test('pins the placement radii', () => {
    expect(PLACEMENT_RADII).toStrictEqual([8, 20, 36, 56, 80, 104]);
  });

  test('uses each type first preferred direction at the smallest radius', () => {
    const layer = placeLabels(
      [{ key: 'layer', kind: 'layer', anchor, text: '1 Layer', layerIndex: 0 }],
      [],
      viewport,
      look,
    ).placements[0];
    const part = placeLabels(
      [{ key: 'part', kind: 'part', anchor, text: '1.1 Part', shortText: '1.1' }],
      [],
      viewport,
      look,
    ).placements[0];
    const dimension = placeLabels(
      [{ key: 'dimension', kind: 'dimension', anchor, text: '2 x 2' }],
      [],
      viewport,
      look,
    ).placements[0];

    expect(layer?.direction).toBe('W');
    expect(part?.direction).toBe('NE');
    expect(dimension?.direction).toBe('W');
    expect(layer?.radius).toBe(8);
    expect(part?.radius).toBe(8);
    expect(dimension?.radius).toBe(8);
    expect(layer?.leader).toBeNull();
  });

  test('prefers a radius-zero tag centred on its anchor', () => {
    const text = '1.1';
    const size = labelBox(text, look.annotation);
    const tag = placeLabels([{ key: 'part', kind: 'tag', anchor, text }], [], viewport, look)
      .placements[0];

    expect(tag?.direction).toBe('C');
    expect(tag?.radius).toBe(0);
    expect(tag?.x).toBe(anchor[0] - size.w / 2);
    expect(tag?.y).toBe(anchor[1] - size.h / 2);
    expect(tag?.leader).toBeNull();
  });

  test('orders layer, part and dimension labels regardless of input order', () => {
    const result = placeLabels(
      [
        { key: 'dimension', kind: 'dimension', anchor, text: '2 layers' },
        { key: 'part', kind: 'part', anchor, text: '1.1', layerIndex: 0, slot: 0 },
        { key: 'layer', kind: 'layer', anchor, text: '1 Layer', layerIndex: 0 },
      ],
      [],
      viewport,
      look,
    );

    expect(result.placements.map((placement) => placement.key)).toStrictEqual([
      'layer',
      'part',
      'dimension',
    ]);
  });

  test('retries a part with its short text before hiding it', () => {
    const result = placeLabels(
      [
        {
          key: 'part:long',
          kind: 'part',
          anchor,
          text: '1.1 This part name cannot fit in any candidate box',
          shortText: '1.1',
        },
      ],
      [],
      { width: 200, height: 200 },
      look,
    );

    expect(result.hidden).toStrictEqual([]);
    expect(result.fellBack).toStrictEqual(['part:long']);
    expect(result.placements[0]?.text).toBe('1.1');
  });

  test('reports an off-screen anchor without counting it as hidden', () => {
    const result = placeLabels(
      [{ key: 'part:offscreen', kind: 'part', anchor: [-1, 200], text: '1.1' }],
      [],
      viewport,
      look,
    );

    expect(result.offscreen).toStrictEqual(['part:offscreen']);
    expect(result.hidden).toStrictEqual([]);
    expect(result.placements).toStrictEqual([]);
  });

  test('tries alternative anchors after the primary', () => {
    const primary: Vec2 = [60, 100];
    const alternative: Vec2 = [340, 100];
    const obstacle: readonly Vec2[] = [
      [0, 0],
      [275, 0],
      [275, 200],
      [0, 200],
    ];
    const result = placeLabels(
      [
        {
          key: 'dimension:stack',
          kind: 'dimension',
          anchor: primary,
          anchors: [alternative],
          text: '4 layers',
        },
      ],
      [obstacle],
      { width: 400, height: 200 },
      look,
    );

    expect(result.hidden).toStrictEqual([]);
    expect(result.placements[0]?.anchor).toStrictEqual(alternative);

    if (result.placements[0]?.leader !== null) {
      expect(result.placements[0]?.leader?.from).toStrictEqual(alternative);
    }
  });

  test('uses the primary anchor for the off-screen decision', () => {
    const result = placeLabels(
      [
        {
          key: 'dimension:stack',
          kind: 'dimension',
          anchor: [-1, 100],
          anchors: [[200, 100]],
          text: '4 layers',
        },
      ],
      [],
      viewport,
      look,
    );

    expect(result.offscreen).toStrictEqual(['dimension:stack']);
    expect(result.placements).toStrictEqual([]);
  });
});
