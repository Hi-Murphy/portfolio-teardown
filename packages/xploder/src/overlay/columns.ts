import type { ProjectLayout } from '../layout';
import type { LookTokens } from '../look/tokens';

import { footprintDimension, stackDimension, type DimensionSegment } from './dimension';
import type { OverlayProject } from './model';
import { labelBox, layerText, partText } from './parts';
import {
  placeLabels,
  rectIntersectsPolygon,
  rectsIntersect,
  type LabelPlacement,
  type Rect,
} from './place';
import type { OverlayFrame, Vec2 } from './project';

const VIEWPORT_INSET_PX = 4;
const RIGHT_COLUMN_TAILROOM_PX = 8;

export type CalloutMode = 'columns' | 'tags';

export interface ColumnBox extends Rect {
  readonly key: string;
  readonly layerIndex: number | null;
  readonly text: string;
}

export interface ColumnItem {
  readonly key: `part:${string}`;
  readonly componentId: string;
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
  readonly text: string;
}

export interface ColumnGroup {
  readonly layerIndex: number;
  readonly items: readonly ColumnItem[];
}

export interface ColumnRail {
  readonly rail: DimensionSegment;
  readonly ticks: readonly DimensionSegment[];
  readonly extensionLines: readonly DimensionSegment[];
  readonly label: ColumnBox;
}

export interface ColumnLayout {
  readonly layerLabels: readonly ColumnBox[];
  readonly groups: readonly ColumnGroup[];
  readonly rail: ColumnRail;
  readonly footprint: LabelPlacement;
}

interface Extent {
  readonly minX: number;
  readonly maxX: number;
}

function drawingExtent(frame: OverlayFrame): Extent | null {
  let minX = Infinity;
  let maxX = -Infinity;
  let found = false;

  for (const layer of frame.layers) {
    for (const corner of layer.corners) {
      minX = Math.min(minX, corner[0]);
      maxX = Math.max(maxX, corner[0]);
      found = true;
    }
  }

  for (const component of frame.components) {
    for (const point of component.hull) {
      minX = Math.min(minX, point[0]);
      maxX = Math.max(maxX, point[0]);
      found = true;
    }
  }

  return found ? { minX, maxX } : null;
}

function meanY(corners: readonly Vec2[]): number {
  return corners.reduce((total, corner) => total + corner[1], 0) / corners.length;
}

function relax(
  targets: readonly number[],
  heights: readonly number[],
  viewportHeight: number,
  gapPx: number,
): readonly number[] | null {
  const positions: number[] = [];
  let previousBottom = -Infinity;

  for (let index = 0; index < targets.length; index += 1) {
    const target = targets[index];
    const height = heights[index];

    if (target === undefined || height === undefined) return null;

    const y = Math.max(target - height / 2, previousBottom + gapPx);

    positions.push(y);
    previousBottom = y + height;
  }

  const last = positions[positions.length - 1];
  const lastHeight = heights[heights.length - 1];

  if (
    last !== undefined &&
    lastHeight !== undefined &&
    last + lastHeight > viewportHeight - VIEWPORT_INSET_PX
  ) {
    const overflow = last + lastHeight - (viewportHeight - VIEWPORT_INSET_PX);

    for (let index = 0; index < positions.length; index += 1) {
      positions[index] = (positions[index] ?? 0) - overflow;
    }
  }

  return positions.every((position) => position >= VIEWPORT_INSET_PX) ? positions : null;
}

function inside(
  rect: Rect,
  viewport: { readonly width: number; readonly height: number },
): boolean {
  return (
    rect.x >= VIEWPORT_INSET_PX &&
    rect.y >= VIEWPORT_INSET_PX &&
    rect.x + rect.w <= viewport.width - VIEWPORT_INSET_PX &&
    rect.y + rect.h <= viewport.height - VIEWPORT_INSET_PX
  );
}

function polygon(rect: Rect): readonly Vec2[] {
  return [
    [rect.x, rect.y],
    [rect.x + rect.w, rect.y],
    [rect.x + rect.w, rect.y + rect.h],
    [rect.x, rect.y + rect.h],
  ];
}

function boxesClear(
  boxes: readonly Rect[],
  frame: OverlayFrame,
  viewport: { readonly width: number; readonly height: number },
): boolean {
  for (let index = 0; index < boxes.length; index += 1) {
    const box = boxes[index];

    if (box === undefined || !inside(box, viewport)) return false;
    if (frame.components.some((component) => rectIntersectsPolygon(box, component.hull))) {
      return false;
    }

    for (let otherIndex = index + 1; otherIndex < boxes.length; otherIndex += 1) {
      const other = boxes[otherIndex];

      if (other !== undefined && rectsIntersect(box, other)) return false;
    }
  }

  return true;
}

export function placeColumns(
  frame: OverlayFrame,
  layout: ProjectLayout,
  project: OverlayProject,
  viewport: { readonly width: number; readonly height: number },
  look: LookTokens,
): ColumnLayout | null {
  const extent = drawingExtent(frame);

  if (extent === null || frame.layers.length === 0) return null;

  const layerLabels: ColumnBox[] = [];
  const groups: ColumnGroup[] = [];
  const leftTargets: number[] = [];
  const leftHeights: number[] = [];
  const rightTargets: number[] = [];
  const rightHeights: number[] = [];

  project.layers.forEach((layer, layerIndex) => {
    const layerFrame = frame.layers.find((candidate) => candidate.id === layer.id);

    if (layerFrame === undefined) return;

    const layerTextValue = layerText(layerIndex, layer.name ?? layer.id);
    const layerBox = labelBox(layerTextValue, look.annotation);

    leftTargets.push(meanY(layerFrame.corners));
    leftHeights.push(layerBox.h);
    layerLabels.push({
      key: `layer:${layer.id}`,
      layerIndex,
      text: layerTextValue,
      x: extent.minX - look.callouts.columnGapPx - layerBox.w,
      y: 0,
      w: layerBox.w,
      h: layerBox.h,
    });

    const items: ColumnItem[] = [];

    layer.components.forEach((component, slot) => {
      const componentFrame = frame.components.find(
        (candidate) => candidate.layerId === layer.id && candidate.id === component.id,
      );

      if (componentFrame === undefined) return;

      const text = partText(layerIndex, slot, component.name ?? component.id);
      const itemBox = labelBox(text, look.annotation);

      items.push({
        key: `part:${component.id}`,
        componentId: component.id,
        text,
        x: 0,
        y: 0,
        w: itemBox.w,
        h: itemBox.h,
      });
    });

    if (items.length === 0) return;

    const height =
      items.reduce((total, item) => total + item.h, 0) +
      look.callouts.rowGapPx * (items.length - 1);

    rightTargets.push(meanY(layerFrame.corners));
    rightHeights.push(height);
    groups.push({ layerIndex, items });
  });

  const leftOrder = layerLabels
    .map((label, index) => ({
      label,
      target: leftTargets[index] ?? 0,
      height: leftHeights[index] ?? 0,
    }))
    .sort((left, right) => left.target - right.target);
  const rightOrder = groups
    .map((group, index) => ({
      group,
      target: rightTargets[index] ?? 0,
      height: rightHeights[index] ?? 0,
    }))
    .sort((left, right) => left.target - right.target);
  const leftY = relax(
    leftOrder.map((entry) => entry.target),
    leftOrder.map((entry) => entry.height),
    viewport.height,
    look.callouts.groupGapPx,
  );
  const rightY = relax(
    rightOrder.map((entry) => entry.target),
    rightOrder.map((entry) => entry.height),
    viewport.height,
    look.callouts.groupGapPx,
  );

  if (leftY === null || rightY === null) return null;

  const positionedLayerLabels = leftOrder.map((entry, index) => ({
    ...entry.label,
    y: leftY[index] ?? 0,
  }));

  const maxItemWidth = Math.max(...groups.flatMap((group) => group.items.map((item) => item.w)), 0);
  let rightX = extent.maxX + look.callouts.columnGapPx;

  if (rightX + maxItemWidth > viewport.width - VIEWPORT_INSET_PX) {
    rightX = viewport.width - VIEWPORT_INSET_PX - maxItemWidth;

    if (rightX < extent.maxX + RIGHT_COLUMN_TAILROOM_PX) return null;
  }

  const positionedGroups = rightOrder.map((entry, groupIndex) => {
    const { group } = entry;
    const groupY = rightY[groupIndex] ?? 0;

    return {
      layerIndex: group.layerIndex,
      items: group.items.map((item, itemIndex) => ({
        ...item,
        x: rightX,
        y: groupY + itemIndex * (item.h + look.callouts.rowGapPx),
      })),
    };
  });

  const stack = stackDimension(frame);
  const railX = extent.minX - look.callouts.columnGapPx / 2;
  const railShift = railX - stack.rail.from[0];
  const rail: DimensionSegment = {
    from: [railX, stack.rail.from[1]],
    to: [railX, stack.rail.to[1]],
  };
  const railText = `${frame.layers.length} layers`;
  const railBox = labelBox(railText, look.annotation);
  const railLabel: ColumnBox = {
    key: 'dimension:stack',
    layerIndex: null,
    text: railText,
    x: railX - railBox.w / 2,
    y: rail.from[1] - look.callouts.columnGapPx - railBox.h,
    w: railBox.w,
    h: railBox.h,
  };

  const allBoxes: Rect[] = [
    ...positionedLayerLabels,
    ...positionedGroups.flatMap((group) => group.items),
    railLabel,
  ];

  if (!boxesClear(allBoxes, frame, viewport)) return null;

  const footprint = footprintDimension(frame, layout.footprint);
  const blocked = allBoxes.map(polygon);
  const placedFootprint = placeLabels(
    [
      {
        key: 'dimension:footprint',
        kind: 'dimension',
        anchor: footprint.labelAnchor,
        text: footprint.text,
      },
    ],
    [...frame.components.map((component) => component.hull), ...blocked],
    viewport,
    look,
  ).placements[0];

  if (placedFootprint === undefined) return null;
  if (!boxesClear([...allBoxes, placedFootprint], frame, viewport)) return null;

  return {
    layerLabels: positionedLayerLabels,
    groups: positionedGroups,
    rail: {
      rail,
      ticks: stack.ticks.map((tick) => ({
        from: [tick.from[0] + railShift, tick.from[1]],
        to: [tick.to[0] + railShift, tick.to[1]],
      })),
      extensionLines: stack.extensionLines.map((line) => ({
        from: line.from,
        to: [railX, line.to[1]],
      })),
      label: railLabel,
    },
    footprint: placedFootprint,
  };
}

export function calloutMode(
  frame: OverlayFrame,
  layout: ProjectLayout,
  project: OverlayProject,
  viewport: { readonly width: number; readonly height: number },
  look: LookTokens,
  placed?: ColumnLayout | null,
): CalloutMode {
  if (viewport.width < look.annotation.wideMinPx) return 'tags';

  const columns =
    placed === undefined ? placeColumns(frame, layout, project, viewport, look) : placed;

  return columns === null ? 'tags' : 'columns';
}
