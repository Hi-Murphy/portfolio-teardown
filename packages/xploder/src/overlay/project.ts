import { VIEW, type ComponentSlab, type LayerSlab, type ProjectLayout, type Vec3 } from '../layout';

export type Vec2 = readonly [x: number, y: number];

export interface OverlayView {
  readonly azimuth: number;
  readonly zoom: number;
  readonly width: number;
  readonly height: number;
}

export type OverlayProgress = number | ArrayLike<number>;

export interface OverlayLayerFrame {
  readonly id: string;
  readonly index: number;
  readonly corners: readonly [Vec2, Vec2, Vec2, Vec2];
}

export interface OverlayComponentFrame {
  readonly id: string;
  readonly layerId: string;
  readonly layerIndex: number;
  readonly slot: number;
  readonly anchor: Vec2;
  readonly hull: readonly Vec2[];
}

export interface OverlayFrame {
  readonly layers: readonly OverlayLayerFrame[];
  readonly components: readonly OverlayComponentFrame[];
}

function progressAt(progress: OverlayProgress, index: number): number {
  return typeof progress === 'number' ? progress : (progress[index] ?? 0);
}

function centerAt(
  placement: Pick<LayerSlab | ComponentSlab, 'imploded' | 'exploded'>,
  progress: number,
): Vec3 {
  return [
    placement.imploded[0] + (placement.exploded[0] - placement.imploded[0]) * progress,
    placement.imploded[1] + (placement.exploded[1] - placement.imploded[1]) * progress,
    placement.imploded[2] + (placement.exploded[2] - placement.imploded[2]) * progress,
  ];
}

export function projectPoint(point: Vec3, view: OverlayView): Vec2 {
  const sinAzimuth = Math.sin(view.azimuth);
  const cosAzimuth = Math.cos(view.azimuth);
  const sinElevation = Math.sin(VIEW.elevation);
  const cosElevation = Math.cos(VIEW.elevation);
  const rightX = cosAzimuth;
  const rightZ = -sinAzimuth;
  const upX = -sinElevation * sinAzimuth;
  const upY = cosElevation;
  const upZ = -sinElevation * cosAzimuth;
  const right = point[0] * rightX + point[2] * rightZ;
  const up = point[0] * upX + point[1] * upY + point[2] * upZ;

  return [view.width / 2 + view.zoom * right, view.height / 2 - view.zoom * up];
}

function cross(origin: Vec2, left: Vec2, right: Vec2): number {
  return (
    (left[0] - origin[0]) * (right[1] - origin[1]) - (left[1] - origin[1]) * (right[0] - origin[0])
  );
}

export function convexHull(points: readonly Vec2[]): readonly Vec2[] {
  const sorted = [...points].sort((left, right) => left[0] - right[0] || left[1] - right[1]);
  const unique: Vec2[] = [];

  for (const point of sorted) {
    const previous = unique[unique.length - 1];

    if (previous === undefined || point[0] !== previous[0] || point[1] !== previous[1]) {
      unique.push(point);
    }
  }

  if (unique.length <= 2) return unique;

  const lower: Vec2[] = [];

  for (const point of unique) {
    while (lower.length >= 2) {
      const left = lower[lower.length - 2];
      const right = lower[lower.length - 1];

      if (left === undefined || right === undefined || cross(left, right, point) > 0) break;
      lower.pop();
    }

    lower.push(point);
  }

  const upper: Vec2[] = [];

  for (let index = unique.length - 1; index >= 0; index -= 1) {
    const point = unique[index];

    if (point === undefined) continue;

    while (upper.length >= 2) {
      const left = upper[upper.length - 2];
      const right = upper[upper.length - 1];

      if (left === undefined || right === undefined || cross(left, right, point) > 0) break;
      upper.pop();
    }

    upper.push(point);
  }

  lower.pop();
  upper.pop();

  return [...lower, ...upper];
}

function layerCorners(
  layer: LayerSlab,
  progress: number,
  view: OverlayView,
): readonly [Vec2, Vec2, Vec2, Vec2] {
  const center = centerAt(layer, progress);
  const top = center[1] + layer.size[1] / 2;
  const halfWidth = layer.size[0] / 2;
  const halfDepth = layer.size[2] / 2;

  return [
    projectPoint([center[0] - halfWidth, top, center[2] - halfDepth], view),
    projectPoint([center[0] + halfWidth, top, center[2] - halfDepth], view),
    projectPoint([center[0] + halfWidth, top, center[2] + halfDepth], view),
    projectPoint([center[0] - halfWidth, top, center[2] + halfDepth], view),
  ];
}

function componentFrame(
  component: ComponentSlab,
  progress: number,
  view: OverlayView,
): OverlayComponentFrame {
  const center = centerAt(component, progress);
  const halfWidth = component.size[0] / 2;
  const halfHeight = component.size[1] / 2;
  const halfDepth = component.size[2] / 2;
  const corners: Vec2[] = [];

  for (const x of [center[0] - halfWidth, center[0] + halfWidth]) {
    for (const y of [center[1] - halfHeight, center[1] + halfHeight]) {
      for (const z of [center[2] - halfDepth, center[2] + halfDepth]) {
        corners.push(projectPoint([x, y, z], view));
      }
    }
  }

  return {
    id: component.id,
    layerId: component.layerId,
    layerIndex: component.layerIndex,
    slot: component.slot,
    anchor: projectPoint([center[0], center[1] + halfHeight, center[2]], view),
    hull: convexHull(corners),
  };
}

export function overlayFrame(
  layout: ProjectLayout,
  progress: OverlayProgress,
  view: OverlayView,
): OverlayFrame {
  return {
    layers: layout.layers.map((layer) => ({
      id: layer.id,
      index: layer.index,
      corners: layerCorners(layer, progressAt(progress, layer.index), view),
    })),
    components: layout.components.map((component, componentIndex) =>
      componentFrame(component, progressAt(progress, layout.layers.length + componentIndex), view),
    ),
  };
}
