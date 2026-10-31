import { describe, expect, test } from 'vitest';

import { parseProject, parseTechRegistry, type Project } from '../src/index';
import { scrollExtent } from '../src/interaction/scroll';
import { fitZoom, layoutProject, VIEW, type ProjectLayout } from '../src/layout';
import { resolveViewerLayoutOptions } from '../src/look/product';
import { motion } from '../src/motion';
import { PANEL_LOOK } from '../src/panel/look';
import {
  placePanel,
  rectOfHull,
  visibleSlabRect,
  type Dock,
  type Placement,
  type Rect,
  type Size,
} from '../src/panel/place';
import { rectIntersectsPolygon, type Rect as OverlayRect } from '../src/overlay/place';
import {
  overlayFrame,
  type OverlayComponentFrame,
  type OverlayFrame,
} from '../src/overlay/project';
import { projectAJson, projectBJson, projectCJson, techRegistryJson } from './fixtures';

const DENSE_SWEEP_TIMEOUT_MS = 180_000;
const registry = parseTechRegistry(techRegistryJson);
const PROJECTS = [
  ['A', parseProject(projectAJson, { registry })],
  ['B', parseProject(projectBJson, { registry })],
  ['C', parseProject(projectCJson, { registry })],
] as const satisfies readonly (readonly [string, Project])[];
const CANVASES = [
  { width: 328, height: 444 },
  { width: 358, height: 506 },
  { width: 768, height: 614 },
  { width: 1216, height: 480 },
] as const satisfies readonly Size[];
const AZIMUTHS = [0, 1, 2, 3].map((index) => VIEW.baseAzimuth + index * VIEW.snap);
const STATES = [
  ['imploded', 0],
  ['exploded', 1],
] as const;
const ZOOM_FACTORS = [1, 3] as const;
const POSITIONS = ['top', 'bottom', 'left', 'right'] as const;

type Position = (typeof POSITIONS)[number];
type Stage = Placement['stage'];
type Histogram = Readonly<Record<Stage, number>>;

interface VisibleComponent {
  readonly component: OverlayComponentFrame;
  readonly rect: Rect;
}

function emptyHistogram(): Record<Stage, number> {
  return { 1: 0, 2: 0, 3: 0, 4: 0 };
}

function recordStage(histogram: Record<Stage, number>, stage: Stage): void {
  histogram[stage] += 1;
}

function printHistogram(label: string, histogram: Histogram): void {
  console.log(
    `stage histogram ${label}: stage1=${histogram[1]} stage2=${histogram[2]} stage3=${histogram[3]} stage4=${histogram[4]}`,
  );
}

function overlayRect(rect: Rect): OverlayRect {
  return {
    x: rect.left,
    y: rect.top,
    w: rect.right - rect.left,
    h: rect.bottom - rect.top,
  };
}

function viewFor(canvas: Size, zoomFactor: number, azimuth: number, layout: ProjectLayout) {
  return {
    ...canvas,
    azimuth,
    zoom: fitZoom(layout.bounds.exploded, canvas) * zoomFactor,
  };
}

function drawingExtent(frame: OverlayFrame, canvas: Size): number {
  let top = Infinity;
  let bottom = -Infinity;

  for (const layer of frame.layers) {
    for (const point of layer.corners) {
      top = Math.min(top, point[1]);
      bottom = Math.max(bottom, point[1]);
    }
  }

  for (const component of frame.components) {
    for (const point of component.hull) {
      top = Math.min(top, point[1]);
      bottom = Math.max(bottom, point[1]);
    }
  }

  return scrollExtent(top, bottom, canvas.height, VIEW.fitMargin * canvas.height);
}

function scrollOffsets(extent: number, zoomFactor: number): readonly number[] {
  return zoomFactor === 1 ? [0] : [-extent / 2, 0, extent / 2];
}

function visibleComponents(
  frame: OverlayFrame,
  offsetY: number,
  canvas: Size,
): readonly VisibleComponent[] {
  return frame.components.flatMap((component) => {
    const rect = visibleSlabRect(component.hull, offsetY, canvas);

    return rect === null ? [] : [{ component, rect }];
  });
}

function extremePosition(
  components: readonly VisibleComponent[],
  position: Position,
): VisibleComponent {
  const center = (candidate: VisibleComponent): readonly [number, number] => [
    (candidate.rect.left + candidate.rect.right) / 2,
    (candidate.rect.top + candidate.rect.bottom) / 2,
  ];
  const selected = components.reduce((best, candidate) => {
    const bestCenter = center(best);
    const candidateCenter = center(candidate);
    const bestValue =
      position === 'top'
        ? bestCenter[1]
        : position === 'bottom'
          ? -bestCenter[1]
          : position === 'left'
            ? bestCenter[0]
            : -bestCenter[0];
    const candidateValue =
      position === 'top'
        ? candidateCenter[1]
        : position === 'bottom'
          ? -candidateCenter[1]
          : position === 'left'
            ? candidateCenter[0]
            : -candidateCenter[0];

    return candidateValue < bestValue ? candidate : best;
  });

  if (selected === undefined) throw new Error(`No visible component for ${position}`);
  return selected;
}

function expectInside(rect: Rect, canvas: Size, label: string, allowZero = false): void {
  expect(rect.left, `${label} left`).toBeGreaterThanOrEqual(0);
  expect(rect.top, `${label} top`).toBeGreaterThanOrEqual(0);
  expect(rect.right, `${label} right`).toBeLessThanOrEqual(canvas.width);
  expect(rect.bottom, `${label} bottom`).toBeLessThanOrEqual(canvas.height);
  expect(rect.right, `${label} width`).toBeGreaterThanOrEqual(
    allowZero ? rect.left : rect.left + 1,
  );
  expect(rect.bottom, `${label} height`).toBeGreaterThanOrEqual(
    allowZero ? rect.top : rect.top + 1,
  );
}

function expectNeverCovers(
  placement: Placement,
  component: OverlayComponentFrame,
  offsetY: number,
  label: string,
): void {
  const hull = component.hull.map(([x, y]) => [x, y - offsetY] as const);

  expect(rectIntersectsPolygon(overlayRect(placement.rect), hull), label).toBe(false);
}

function freeAt(dock: Dock, slab: Rect, canvas: Size): number {
  if (dock === 'right') {
    return Math.max(0, canvas.width - PANEL_LOOK.insetPx - (slab.right + PANEL_LOOK.gapPx));
  }
  if (dock === 'left') {
    return Math.max(0, slab.left - PANEL_LOOK.gapPx - PANEL_LOOK.insetPx);
  }
  if (dock === 'bottom') {
    return Math.max(0, canvas.height - PANEL_LOOK.insetPx - (slab.bottom + PANEL_LOOK.gapPx));
  }
  return Math.max(0, slab.top - PANEL_LOOK.gapPx - PANEL_LOOK.insetPx);
}

const SYNTHETIC = [
  ['1x1', { layers: [{ id: 'only', components: [{ id: 'one' }] }] }],
  [
    '2x1',
    {
      layers: [
        { id: 'upper', components: [{ id: 'upper-one' }] },
        { id: 'lower', components: [{ id: 'lower-one' }] },
      ],
    },
  ],
] as const;

describe('AC2 placement matrix', () => {
  test.each(PROJECTS)(
    'keeps every %s fixture panel disjoint and inside the canvas',
    (fixture, project) => {
      const layout = layoutProject(project, resolveViewerLayoutOptions());
      const histogram = emptyHistogram();

      for (const canvas of CANVASES) {
        for (const [state, progress] of STATES) {
          for (const azimuth of AZIMUTHS) {
            for (const zoomFactor of ZOOM_FACTORS) {
              const view = viewFor(canvas, zoomFactor, azimuth, layout);
              const frame = overlayFrame(layout, progress, view);
              const extent = drawingExtent(frame, canvas);

              for (const offsetY of scrollOffsets(extent, zoomFactor)) {
                const visible = visibleComponents(frame, offsetY, canvas);

                if (visible.length === 0) continue;

                for (const position of POSITIONS) {
                  const selected = extremePosition(visible, position);
                  const placement = placePanel({
                    canvas,
                    slab: selected.rect,
                    kind: 'detail',
                  });
                  const label = `${fixture} ${state} ${canvas.width}x${canvas.height} z${zoomFactor} ${position} ${selected.component.id}`;

                  recordStage(histogram, placement.stage);
                  expect(placement.stage, `${label} stage`).toBeLessThanOrEqual(2);
                  expectInside(placement.rect, canvas, label);
                  expectNeverCovers(placement, selected.component, offsetY, label);

                  if (canvas.width >= PANEL_LOOK.wideMinPx) {
                    const centerX = (selected.rect.left + selected.rect.right) / 2;

                    if (position === 'left' && centerX < canvas.width / 2) {
                      expect(placement.dock, label).toBe('right');
                    }
                    if (position === 'right' && centerX > canvas.width / 2) {
                      expect(placement.dock, label).toBe('left');
                    }
                  } else {
                    const centerY = (selected.rect.top + selected.rect.bottom) / 2;

                    if (position === 'top' && centerY < canvas.height / 2) {
                      expect(placement.dock, label).toBe('bottom');
                    }
                    if (position === 'bottom' && centerY > canvas.height / 2) {
                      expect(placement.dock, label).toBe('top');
                    }
                  }
                }
              }
            }
          }
        }
      }

      printHistogram(fixture, histogram);
    },
    DENSE_SWEEP_TIMEOUT_MS,
  );

  test.each(SYNTHETIC)(
    'keeps synthetic %s panels disjoint and inside at every stage',
    (fixture, input) => {
      const layout = layoutProject(input, resolveViewerLayoutOptions());
      const histogram = emptyHistogram();

      for (const canvas of CANVASES) {
        for (const [state, progress] of STATES) {
          for (const azimuth of AZIMUTHS) {
            for (const zoomFactor of ZOOM_FACTORS) {
              const view = viewFor(canvas, zoomFactor, azimuth, layout);
              const frame = overlayFrame(layout, progress, view);
              const extent = drawingExtent(frame, canvas);

              for (const offsetY of scrollOffsets(extent, zoomFactor)) {
                const visible = visibleComponents(frame, offsetY, canvas);

                if (visible.length === 0) continue;

                for (const position of POSITIONS) {
                  const selected = extremePosition(visible, position);
                  const placement = placePanel({
                    canvas,
                    slab: selected.rect,
                    kind: 'detail',
                  });
                  const label = `${fixture} ${state} ${canvas.width}x${canvas.height} z${zoomFactor} ${position} ${selected.component.id}`;

                  recordStage(histogram, placement.stage);
                  expectInside(placement.rect, canvas, label, placement.stage === 4);
                  expectNeverCovers(placement, selected.component, offsetY, label);
                }
              }
            }
          }
        }
      }

      printHistogram(`synthetic ${fixture}`, histogram);
      expect(histogram[3] + histogram[4], `${fixture} fallback stages`).toBeGreaterThan(0);
    },
    DENSE_SWEEP_TIMEOUT_MS,
  );
});

describe('placement hysteresis', () => {
  test.each(PROJECTS)(
    'changes the %s dock only after the current size no longer fits',
    (fixture, project) => {
      const layout = layoutProject(project, resolveViewerLayoutOptions());
      const canvas = { width: 358, height: 506 } as const;
      const azimuth = VIEW.baseAzimuth;
      const view = viewFor(canvas, 3, azimuth, layout);
      const centeredFrame = overlayFrame(layout, 1, view);
      const extent = drawingExtent(centeredFrame, canvas);
      const centered = visibleComponents(centeredFrame, 0, canvas);
      const target = centered.reduce((best, candidate) => {
        const bestCenter = (best.rect.left + best.rect.right) / 2;
        const candidateCenter = (candidate.rect.left + candidate.rect.right) / 2;
        return Math.abs(candidateCenter - canvas.width / 2) <
          Math.abs(bestCenter - canvas.width / 2)
          ? candidate
          : best;
      });

      if (target === undefined) throw new Error(`No scrolling slab for ${fixture}`);

      let current: { readonly dock: Dock; readonly size: number } | null = null;
      let changes = 0;
      const offsets = Array.from({ length: 17 }, (_, index) => -extent / 2 + (extent * index) / 16);

      for (const offsetY of offsets) {
        const slab = visibleSlabRect(target.component.hull, offsetY, canvas);
        const placement = placePanel({ canvas, slab, kind: 'detail', current });

        if (current !== null && slab !== null) {
          const free = freeAt(current.dock, slab, canvas);

          if (free >= current.size) {
            expect(placement.dock).toBe(current.dock);
            expect(placement.size).toBe(current.size);
          }

          if (placement.dock !== current.dock) {
            expect(free, `${fixture} dock change at offset ${offsetY}`).toBeLessThan(current.size);
            changes += 1;
          }
        }

        current = { dock: placement.dock, size: placement.size };
      }

      expect(changes, `${fixture} hysteresis path exercised`).toBeGreaterThan(0);
    },
    DENSE_SWEEP_TIMEOUT_MS,
  );
});

describe('placement hysteresis does not keep a cramped size', () => {
  test('a stage-3/4 current size is re-placed once a readable dock fits again', () => {
    const canvas = { width: 358, height: 506 } as const;
    const smallSlab = { left: 150, top: 200, right: 210, bottom: 240 };
    const cramped = placePanel({
      canvas,
      slab: smallSlab,
      kind: 'detail',
      current: { dock: 'bottom', size: PANEL_LOOK.compactMinPx },
    });

    expect(cramped.stage).toBe(1);
    expect(cramped.size).toBeGreaterThan(PANEL_LOOK.compactMinPx);

    const zeroSize = placePanel({
      canvas,
      slab: smallSlab,
      kind: 'detail',
      current: { dock: 'top', size: 0 },
    });

    expect(zeroSize.stage).toBe(1);
    expect(zeroSize.size).toBeGreaterThan(0);
  });

  test('a readable current size is still kept while it fits', () => {
    const canvas = { width: 358, height: 506 } as const;
    const slab = { left: 150, top: 40, right: 210, bottom: 80 };
    const kept = placePanel({
      canvas,
      slab,
      kind: 'detail',
      current: { dock: 'bottom', size: PANEL_LOOK.sheet.minPx },
    });

    expect(kept.dock).toBe('bottom');
    expect(kept.size).toBe(PANEL_LOOK.sheet.minPx);
  });
});

describe('panel sizing and visible rects', () => {
  test('keeps the R2 gap clear of the S5 hover lift', () => {
    expect(PANEL_LOOK.gapPx).toBeGreaterThanOrEqual(2 * motion.distances.hoverLift);
  });

  test.each(CANVASES)('uses the RFC D3 case-study size on $width x $height', (canvas) => {
    const placement = placePanel({ canvas, slab: null, kind: 'caseStudy' });
    const expectedDock: Dock = canvas.width >= PANEL_LOOK.wideMinPx ? 'right' : 'bottom';
    const expectedSize =
      canvas.width >= PANEL_LOOK.wideMinPx
        ? Math.min(PANEL_LOOK.caseStudy.sidePx, PANEL_LOOK.caseStudy.sideFrac * canvas.width)
        : Math.min(PANEL_LOOK.caseStudy.sheetFrac * canvas.height, PANEL_LOOK.caseStudy.sheetMaxPx);

    expect(placement.dock).toBe(expectedDock);
    expect(placement.size).toBe(expectedSize);
    expect(placement.stage).toBe(1);
    expectInside(placement.rect, canvas, `case study ${canvas.width}x${canvas.height}`);
  });

  test('computes and clips the visible slab rect after scrolling', () => {
    const hull = [
      [-20, 10],
      [10, 40],
      [30, 60],
    ] as const;
    const canvas = { width: 100, height: 50 } as const;

    expect(rectOfHull(hull)).toStrictEqual({ left: -20, top: 10, right: 30, bottom: 60 });
    expect(rectOfHull([])).toBeNull();
    expect(visibleSlabRect(hull, 5, canvas)).toStrictEqual({
      left: 0,
      top: 5,
      right: 30,
      bottom: 50,
    });
    expect(
      visibleSlabRect(
        [
          [110, 0],
          [140, 20],
        ],
        0,
        canvas,
      ),
    ).toBeNull();
    expect(
      visibleSlabRect(
        [
          [10, 60],
          [20, 80],
        ],
        0,
        canvas,
      ),
    ).toBeNull();
  });
});
