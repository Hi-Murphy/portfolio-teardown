import { describe, expect, test } from 'vitest';

import { parseProject, parseTechRegistry, type Project } from '../src/index';
import { fitZoom, layoutProject, VIEW } from '../src/layout';
import { resolveViewerLayoutOptions } from '../src/look/product';
import { look } from '../src/look/tokens';
import { overlayLabels } from '../src/overlay/model';
import { rectIntersectsPolygon } from '../src/overlay/place';
import { overlayFrame, type OverlayFrame, type Vec2 } from '../src/overlay/project';
import { placeTitleBlock, titleBlockBox, titleBlockLines } from '../src/overlay/titleBlock';
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

function emptyFrame(): OverlayFrame {
  return { layers: [], components: [] };
}

describe('title block content and box', () => {
  const project = PROJECTS[0][1];
  const layout = layoutProject(project, resolveViewerLayoutOptions());

  test('derives fixture A title, footprint and numbered layer rows', () => {
    expect(titleBlockLines(project, layout)).toStrictEqual({
      title: 'Tidewatch',
      meta: '4 layers · 2 × 2',
      rows: ['1 Interface', '2 View state', '3 Tide data', '4 External boundary'],
    });
  });

  test('falls back to the slug when meta.name is absent', () => {
    const lines = titleBlockLines({ meta: { slug: 'slug-only' }, layers: project.layers }, layout);

    expect(lines.title).toBe('slug-only');
  });

  test('sizes the box from the widest R1 line and the total line height', () => {
    const lines = titleBlockLines(project, layout);

    expect(titleBlockBox(lines, look)).toStrictEqual({ w: 150, h: 106 });
  });
});

describe('title block corner placement', () => {
  const box = { w: 100, h: 60 } as const;
  const viewport = { width: 300, height: 200 } as const;
  const expected = { x: 8, y: 132, w: 100, h: 60, corner: 'bottom-left' } as const;

  test('falls back to bottom-left when a component blocks bottom-right', () => {
    const frame: OverlayFrame = {
      layers: [],
      components: [
        {
          id: 'blocker',
          layerId: 'blocker-layer',
          layerIndex: 0,
          slot: 0,
          anchor: [225, 160],
          hull: [
            [200, 140],
            [250, 140],
            [250, 180],
            [200, 180],
          ],
        },
      ],
    };

    expect(placeTitleBlock(box, frame, viewport, look)).toStrictEqual(expected);
  });

  test('treats a layer top-corner silhouette as an obstacle', () => {
    const corners: readonly [Vec2, Vec2, Vec2, Vec2] = [
      [200, 140],
      [250, 140],
      [250, 180],
      [200, 180],
    ];
    const frame: OverlayFrame = {
      layers: [{ id: 'blocker-layer', index: 0, corners }],
      components: [],
    };

    expect(placeTitleBlock(box, frame, viewport, look)).toStrictEqual(expected);
  });

  test('uses the inset from the viewer edges for the preferred corner', () => {
    const placement = placeTitleBlock(box, emptyFrame(), viewport, look);

    expect(placement).toStrictEqual({
      x: viewport.width - look.titleBlock.insetPx - box.w,
      y: viewport.height - look.titleBlock.insetPx - box.h,
      w: box.w,
      h: box.h,
      corner: 'bottom-right',
    });
  });
});

describe('imploded title block placement matrix', () => {
  test.each(PROJECTS)(
    'keeps every %s title block clear of the drawing across azimuths and viewports',
    (fixture, project) => {
      const layout = layoutProject(project, resolveViewerLayoutOptions());
      const lines = titleBlockLines(project, layout);
      const box = titleBlockBox(lines, look);
      const failures: string[] = [];

      for (const viewport of VIEWPORTS) {
        const zoom = fitZoom(layout.bounds.exploded, viewport);

        for (const azimuth of AZIMUTHS) {
          const frame = overlayFrame(layout, 0, {
            azimuth,
            zoom,
            ...viewport,
          });
          const labels = overlayLabels(frame, layout, project, viewport, 'imploded');
          const placement = placeTitleBlock(box, frame, viewport, look);
          const azimuthDegrees = Math.round((azimuth * 180) / Math.PI);
          const context = `${fixture} ${azimuthDegrees}deg imploded ${viewport.width}x${viewport.height}`;

          if (labels.length !== 0) failures.push(`${context}: labels=${labels.length}`);

          if (placement === null) {
            failures.push(`${context}: no corner`);
            console.log(`${context}: labels=${labels.length} corner=none`);
            continue;
          }

          if (
            placement.x < look.titleBlock.insetPx ||
            placement.y < look.titleBlock.insetPx ||
            placement.x + placement.w > viewport.width - look.titleBlock.insetPx ||
            placement.y + placement.h > viewport.height - look.titleBlock.insetPx
          ) {
            failures.push(`${context}: outside viewport`);
          }

          if (placement.w !== box.w || placement.h !== box.h) {
            failures.push(`${context}: box size drift`);
          }

          const obstacles = [
            ...frame.components.map((component) => component.hull),
            ...frame.layers.map((layer) => layer.corners),
          ];

          for (const obstacle of obstacles) {
            if (rectIntersectsPolygon(placement, obstacle)) {
              failures.push(`${context}: silhouette intersection`);
              break;
            }
          }

          console.log(
            `${context}: labels=${labels.length} corner=${placement.corner} font=${look.annotation.fontPx}px`,
          );
        }
      }

      expect(look.annotation.fontPx).toBeGreaterThanOrEqual(12);
      expect(failures).toStrictEqual([]);
    },
  );
});
