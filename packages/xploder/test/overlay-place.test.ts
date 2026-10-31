import { describe, expect, test } from 'vitest';

import { parseProject, parseTechRegistry, type Project } from '../src/index';
import { fitZoom, layoutProject, VIEW } from '../src/layout';
import { resolveViewerLayoutOptions } from '../src/look/product';
import { look } from '../src/look/tokens';
import { overlayLabels } from '../src/overlay/model';
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

  test('keeps every label readable across the dense canvas sweep', () => {
    let cases = 0;
    let failures = 0;
    let fallbackLabels = 0;
    let fallbackCases = 0;
    let maxLeader = 0;
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
            const labels = overlayLabels(frame, layout, project, viewport, 'exploded');
            const result = placeLabels(
              labels,
              frame.components.map((component) => component.hull),
              viewport,
              look,
            );
            const azimuthDegrees = Math.round((azimuth * 180) / Math.PI);
            const context = `${fixture} ${azimuthDegrees}deg ${width}x${height}`;

            fallbackLabels += result.fellBack.length;
            if (result.fellBack.length > 0) fallbackCases += 1;

            if (
              result.hidden.length > 0 ||
              result.offscreen.length > 0 ||
              result.placements.length !== labels.length
            ) {
              fail(
                context,
                `hidden=[${result.hidden.join(',')}] offscreen=[${result.offscreen.join(',')}]`,
              );
              continue;
            }

            maxLeader = Math.max(maxLeader, maximumLeaderLength(result.placements));

            for (const placement of result.placements) {
              const placementBox = box(placement);

              if (
                placement.x < VIEWPORT_INSET_PX ||
                placement.y < VIEWPORT_INSET_PX ||
                placement.x + placement.w > viewport.width - VIEWPORT_INSET_PX ||
                placement.y + placement.h > viewport.height - VIEWPORT_INSET_PX
              ) {
                fail(context, `${placement.key} outside viewport`);
              }

              if (
                frame.components.some((component) =>
                  rectIntersectsPolygon(placementBox, component.hull),
                )
              ) {
                fail(context, `${placement.key} intersects a hull`);
              }
            }

            for (let leftIndex = 0; leftIndex < result.placements.length; leftIndex += 1) {
              const left = result.placements[leftIndex];

              if (left === undefined) continue;

              for (
                let rightIndex = leftIndex + 1;
                rightIndex < result.placements.length;
                rightIndex += 1
              ) {
                const right = result.placements[rightIndex];

                if (right !== undefined && rectsIntersect(box(left), box(right))) {
                  fail(context, `${left.key} overlaps ${right.key}`);
                }
              }
            }
          }
        }
      }
    }

    console.log(
      `dense placement sweep: cases=${cases} failures=${failures} maxLeader=${maxLeader.toFixed(2)}px fallbackLabels=${fallbackLabels} fallbackCases=${fallbackCases}`,
    );

    expect(examples).toStrictEqual([]);
    expect(failures).toBe(0);
  }, 30_000);

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
