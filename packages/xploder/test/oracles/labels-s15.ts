// frozen S15 composition at 021c1ff — do not edit
import { VIEW, type ProjectLayout } from '../../src/layout';
import {
  compactColumn,
  compactColumnAtRest,
  type CompactColumn,
  type CompactColumnLayer,
} from '../../src/lettering/column';
import type { FaceQuad } from '../../src/lettering/faces';
import { layerLetteringModel, type LayerLettering } from '../../src/lettering/layers';
import { LETTERING_LOOK } from '../../src/lettering/look';
import { letteringModel, type ComponentLettering } from '../../src/lettering/model';
import type { LookTokens } from '../../src/look/tokens';
import { scrollExtent } from '../../src/interaction/scroll';
import { calloutMode } from '../../src/overlay/columns';
import { overlayBaseModel, type OverlayModel } from '../../src/overlay/model';
import { partShortText } from '../../src/overlay/parts';
import type { OverlayFrame, Vec2 } from '../../src/overlay/project';
import { faceLetteringAllOrNone } from '../../src/react/lettering/faceNames';
import type { ViewerProject } from '../../src/react/useTeardownViewer';

export interface OracleInput {
  readonly frame: OverlayFrame;
  readonly faces: readonly FaceQuad[] | null;
  readonly viewport: { readonly width: number; readonly height: number };
  readonly offsetY: number;
  readonly extentPx: number | null;
  readonly zoomFactor: number;
  readonly target: 'imploded' | 'exploded';
  readonly layout: ProjectLayout;
  readonly project: ViewerProject;
  readonly look: LookTokens;
}

export interface OracleLettering {
  readonly items: readonly ComponentLettering[];
  readonly column: CompactColumn | null;
  readonly layerLabels: readonly LayerLettering[];
  readonly layersShown: boolean;
}

function componentNames(project: ViewerProject): ReadonlyMap<string, string> {
  const names = new Map<string, string>();

  for (const layer of project.layers) {
    for (const component of layer.components) {
      names.set(component.id, component.name ?? component.id);
    }
  }

  return names;
}

function drawingMaxX(frame: OverlayFrame): number {
  let max = -Infinity;

  for (const layer of frame.layers) {
    for (const corner of layer.corners) max = Math.max(max, corner[0]);
  }

  for (const component of frame.components) {
    for (const point of component.hull) max = Math.max(max, point[0]);
  }

  return max;
}

function frameExtent(frame: OverlayFrame, height: number): number {
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

  if (!Number.isFinite(top) || !Number.isFinite(bottom)) return Number.POSITIVE_INFINITY;

  return scrollExtent(top, bottom, height, VIEW.fitMargin * height);
}

function columnLayers(
  frame: OverlayFrame,
  layout: ProjectLayout,
  names: ReadonlyMap<string, string>,
): readonly CompactColumnLayer[] {
  return frame.layers.map((layer) => ({
    index: layer.index,
    corners: layer.corners,
    partLabels: layout.components
      .filter((component) => component.layerIndex === layer.index)
      .sort((left, right) => left.slot - right.slot)
      .map((component) => ({
        id: component.id,
        number: partShortText(layer.index, component.slot),
        name: names.get(component.id) ?? component.id,
      })),
  }));
}

function arrayPoint(point: Vec2): Vec2 {
  return [point[0], point[1]];
}

export function oracleOverlay(input: OracleInput): OverlayModel {
  return overlayBaseModel({
    frame: input.frame,
    layout: input.layout,
    project: input.project,
    viewport: { width: input.viewport.width, height: input.viewport.height },
    offsetY: input.offsetY,
    target: input.target,
    look: input.look,
  });
}

export function oracleLettering(input: OracleInput): OracleLettering | null {
  if (input.faces === null) return null;

  const names = componentNames(input.project);
  const components = input.layout.components.map((component, index) => {
    const frameComponent = input.frame.components[index];
    const face = input.faces?.[index];

    if (frameComponent === undefined) {
      throw new Error(`Missing overlay component ${component.id}`);
    }
    if (face === undefined) {
      throw new Error(`Missing face quad ${component.id}`);
    }

    return {
      id: component.id,
      layerIndex: component.layerIndex,
      slot: component.slot,
      quad: face,
      hull: frameComponent.hull,
    };
  });
  const columnLayersValue = columnLayers(input.frame, input.layout, names);
  const maxX = drawingMaxX(input.frame);
  const extentPx = input.extentPx ?? frameExtent(input.frame, input.viewport.height);
  const mode = calloutMode(
    input.frame,
    input.layout,
    input.project,
    { width: input.viewport.width, height: input.viewport.height },
    input.look,
  );
  const column =
    mode === 'tags' && compactColumnAtRest({ offsetY: input.offsetY, extentPx })
      ? compactColumn({
          canvas: { width: input.viewport.width, height: input.viewport.height },
          layers: columnLayersValue,
          drawingMaxX: maxX,
          look: LETTERING_LOOK,
        })
      : null;
  const items = faceLetteringAllOrNone({
    zoomFactor: input.zoomFactor,
    columnActive: column !== null,
    names,
    build: (faceNames) =>
      letteringModel({
        layout: input.layout,
        components,
        layers: input.frame.layers,
        names: faceNames,
      }),
  });
  const layersShown = mode === 'tags' || extentPx > 1e-9;
  const layerLabels = layersShown
    ? layerLetteringModel({
        layers: input.frame.layers.map((layer) => ({
          id: layer.id,
          index: layer.index,
          name: input.project.layers[layer.index]?.name ?? layer.id,
          corners: layer.corners,
        })),
        components: input.frame.components.map((component) => ({
          layerIndex: component.layerIndex,
          hull: component.hull.map(arrayPoint),
        })),
        canvasWidth: input.viewport.width,
      })
    : [];

  return { items, column, layerLabels, layersShown };
}
