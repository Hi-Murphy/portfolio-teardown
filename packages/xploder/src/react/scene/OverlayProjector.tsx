import { useFrame, useThree } from '@react-three/fiber';
import { useLayoutEffect, useMemo, useRef, type RefObject } from 'react';
import { Vector3, type OrthographicCamera } from 'three';

import type { ComponentSlab, LayerSlab, ProjectLayout } from '../../layout';
import type {
  OverlayComponentFrame,
  OverlayFrame,
  OverlayLayerFrame,
  Vec2,
} from '../../overlay/project';

type MutableVec2 = [number, number];
type ProjectorState = 'initial' | 'moving' | 'settled';

const COMPONENT_POINT_COUNT = 8;
const SIGNATURE_SEED = 2166136261;
const SIGNATURE_PRIME = 16777619;

export interface OverlayLayerBuffer {
  readonly id: string;
  readonly index: number;
  readonly corners: readonly [MutableVec2, MutableVec2, MutableVec2, MutableVec2];
}

export interface OverlayComponentBuffer {
  readonly id: string;
  readonly layerId: string;
  readonly layerIndex: number;
  readonly slot: number;
  readonly points: MutableVec2[];
  readonly anchor: MutableVec2;
  readonly hull: MutableVec2[];
  hullCount: number;
}

export interface OverlayProjectionBuffers {
  readonly layers: readonly OverlayLayerBuffer[];
  readonly components: readonly OverlayComponentBuffer[];
}

export type OverlayEvent =
  | { readonly kind: 'moving' }
  | {
      readonly kind: 'settled';
      readonly frame: OverlayFrame;
      readonly width: number;
      readonly height: number;
      readonly offsetY: number;
    };

export interface OverlayProjectorProps {
  readonly layout: ProjectLayout;
  readonly progressRef?: RefObject<Float32Array | null>;
  readonly onOverlay: (event: OverlayEvent) => void;
  readonly onOverlayScroll: (offsetY: number) => void;
}

function point(): MutableVec2 {
  return [0, 0];
}

function pointAt(points: readonly MutableVec2[], index: number): MutableVec2 {
  const value = points[index];

  if (value === undefined) throw new Error('Overlay projection buffer is incomplete');
  return value;
}

export function createOverlayProjectionBuffers(layout: ProjectLayout): OverlayProjectionBuffers {
  return {
    layers: layout.layers.map((layer) => ({
      id: layer.id,
      index: layer.index,
      corners: [point(), point(), point(), point()],
    })),
    components: layout.components.map((component) => {
      const points = Array.from({ length: COMPONENT_POINT_COUNT }, point);

      return {
        id: component.id,
        layerId: component.layerId,
        layerIndex: component.layerIndex,
        slot: component.slot,
        points,
        anchor: point(),
        hull: points.slice(),
        hullCount: 0,
      };
    }),
  };
}

function progressAt(progress: ArrayLike<number> | null | undefined, index: number): number {
  return progress?.[index] ?? 0;
}

function projectTo(
  out: MutableVec2,
  x: number,
  y: number,
  z: number,
  camera: OrthographicCamera,
  width: number,
  height: number,
  offsetY: number,
  vector: Vector3,
): void {
  const ndc = vector.set(x, y, z).project(camera);

  out[0] = ((ndc.x + 1) * width) / 2;
  out[1] = ((1 - ndc.y) * height) / 2 + offsetY;
}

function projectLayer(
  buffer: OverlayLayerBuffer,
  layer: LayerSlab,
  progress: number,
  camera: OrthographicCamera,
  width: number,
  height: number,
  offsetY: number,
  vector: Vector3,
): void {
  const centerX = layer.imploded[0] + (layer.exploded[0] - layer.imploded[0]) * progress;
  const centerY = layer.imploded[1] + (layer.exploded[1] - layer.imploded[1]) * progress;
  const centerZ = layer.imploded[2] + (layer.exploded[2] - layer.imploded[2]) * progress;
  const top = centerY + layer.size[1] / 2;
  const left = centerX - layer.size[0] / 2;
  const right = centerX + layer.size[0] / 2;
  const near = centerZ - layer.size[2] / 2;
  const far = centerZ + layer.size[2] / 2;

  projectTo(pointAt(buffer.corners, 0), left, top, near, camera, width, height, offsetY, vector);
  projectTo(pointAt(buffer.corners, 1), right, top, near, camera, width, height, offsetY, vector);
  projectTo(pointAt(buffer.corners, 2), right, top, far, camera, width, height, offsetY, vector);
  projectTo(pointAt(buffer.corners, 3), left, top, far, camera, width, height, offsetY, vector);
}

function cross(origin: MutableVec2, left: MutableVec2, right: MutableVec2): number {
  return (
    (left[0] - origin[0]) * (right[1] - origin[1]) - (left[1] - origin[1]) * (right[0] - origin[0])
  );
}

function sortPoints(points: MutableVec2[]): void {
  for (let index = 1; index < points.length; index += 1) {
    const current = pointAt(points, index);
    let position = index - 1;

    while (position >= 0) {
      const previous = pointAt(points, position);

      if (previous[0] < current[0] || (previous[0] === current[0] && previous[1] <= current[1])) {
        break;
      }

      points[position + 1] = previous;
      position -= 1;
    }

    points[position + 1] = current;
  }
}

function uniquePointCount(points: MutableVec2[]): number {
  let unique = 0;

  for (let index = 0; index < points.length; index += 1) {
    const current = pointAt(points, index);
    const previous = unique === 0 ? null : pointAt(points, unique - 1);

    if (previous !== null && previous[0] === current[0] && previous[1] === current[1]) continue;

    if (unique !== index) {
      const target = pointAt(points, unique);

      target[0] = current[0];
      target[1] = current[1];
    }

    unique += 1;
  }

  return unique;
}

function buildHull(points: readonly MutableVec2[], count: number, hull: MutableVec2[]): number {
  if (count <= 2) {
    for (let index = 0; index < count; index += 1) hull[index] = pointAt(points, index);
    return count;
  }

  let size = 0;

  for (let index = 0; index < count; index += 1) {
    const current = pointAt(points, index);

    while (size >= 2) {
      const origin = pointAt(hull, size - 2);
      const left = pointAt(hull, size - 1);

      if (cross(origin, left, current) > 0) break;
      size -= 1;
    }

    hull[size] = current;
    size += 1;
  }

  const lowerSize = size + 1;

  for (let index = count - 2; index >= 0; index -= 1) {
    const current = pointAt(points, index);

    while (size >= lowerSize) {
      const origin = pointAt(hull, size - 2);
      const left = pointAt(hull, size - 1);

      if (cross(origin, left, current) > 0) break;
      size -= 1;
    }

    hull[size] = current;
    size += 1;
  }

  return size - 1;
}

function projectComponent(
  buffer: OverlayComponentBuffer,
  component: ComponentSlab,
  progress: number,
  camera: OrthographicCamera,
  width: number,
  height: number,
  offsetY: number,
  vector: Vector3,
): void {
  const centerX =
    component.imploded[0] + (component.exploded[0] - component.imploded[0]) * progress;
  const centerY =
    component.imploded[1] + (component.exploded[1] - component.imploded[1]) * progress;
  const centerZ =
    component.imploded[2] + (component.exploded[2] - component.imploded[2]) * progress;
  const halfWidth = component.size[0] / 2;
  const halfHeight = component.size[1] / 2;
  const halfDepth = component.size[2] / 2;
  let index = 0;

  for (let xIndex = 0; xIndex < 2; xIndex += 1) {
    const x = xIndex === 0 ? centerX - halfWidth : centerX + halfWidth;

    for (let yIndex = 0; yIndex < 2; yIndex += 1) {
      const y = yIndex === 0 ? centerY - halfHeight : centerY + halfHeight;

      for (let zIndex = 0; zIndex < 2; zIndex += 1) {
        const z = zIndex === 0 ? centerZ - halfDepth : centerZ + halfDepth;

        projectTo(pointAt(buffer.points, index), x, y, z, camera, width, height, offsetY, vector);
        index += 1;
      }
    }
  }

  projectTo(
    buffer.anchor,
    centerX,
    centerY + halfHeight,
    centerZ,
    camera,
    width,
    height,
    offsetY,
    vector,
  );

  sortPoints(buffer.points);
  const unique = uniquePointCount(buffer.points);

  buffer.hullCount = buildHull(buffer.points, unique, buffer.hull);
}

export function projectOverlayFrameBuffer(
  buffers: OverlayProjectionBuffers,
  layout: ProjectLayout,
  camera: OrthographicCamera,
  progress: ArrayLike<number> | null | undefined,
  width: number,
  height: number,
  offsetY: number,
  vector: Vector3,
): void {
  layout.layers.forEach((layer, index) => {
    const buffer = buffers.layers[index];

    if (buffer === undefined) throw new Error('Overlay layer buffer is incomplete');
    projectLayer(
      buffer,
      layer,
      progressAt(progress, layer.index),
      camera,
      width,
      height,
      offsetY,
      vector,
    );
  });

  layout.components.forEach((component, index) => {
    const buffer = buffers.components[index];

    if (buffer === undefined) throw new Error('Overlay component buffer is incomplete');
    projectComponent(
      buffer,
      component,
      progressAt(progress, layout.layers.length + index),
      camera,
      width,
      height,
      offsetY,
      vector,
    );
  });
}

function copyPoint(value: Vec2): Vec2 {
  return [value[0], value[1]];
}

export function snapshotOverlayFrame(buffers: OverlayProjectionBuffers): OverlayFrame {
  const layers: OverlayLayerFrame[] = [];
  const components: OverlayComponentFrame[] = [];

  for (const buffer of buffers.layers) {
    layers.push({
      id: buffer.id,
      index: buffer.index,
      corners: [
        copyPoint(pointAt(buffer.corners, 0)),
        copyPoint(pointAt(buffer.corners, 1)),
        copyPoint(pointAt(buffer.corners, 2)),
        copyPoint(pointAt(buffer.corners, 3)),
      ],
    });
  }

  for (const buffer of buffers.components) {
    const hull: Vec2[] = [];

    for (let index = 0; index < buffer.hullCount; index += 1) {
      hull.push(copyPoint(pointAt(buffer.hull, index)));
    }

    components.push({
      id: buffer.id,
      layerId: buffer.layerId,
      layerIndex: buffer.layerIndex,
      slot: buffer.slot,
      anchor: copyPoint(buffer.anchor),
      hull,
    });
  }

  return { layers, components };
}

function mixSignature(hash: number, value: number, scratch: DataView): number {
  scratch.setFloat64(0, value, true);

  const low = scratch.getUint32(0, true);
  const high = scratch.getUint32(4, true);

  return Math.imul(Math.imul(hash ^ low, SIGNATURE_PRIME) ^ high, SIGNATURE_PRIME) >>> 0;
}

function signatureOf(
  camera: OrthographicCamera,
  width: number,
  height: number,
  progress: ArrayLike<number> | null,
  count: number,
  scratch: DataView,
): number {
  let hash = SIGNATURE_SEED;

  for (let index = 0; index < 16; index += 1) {
    hash = mixSignature(hash, camera.matrixWorld.elements[index] ?? 0, scratch);
  }

  hash = mixSignature(hash, camera.zoom, scratch);
  hash = mixSignature(hash, width, scratch);
  hash = mixSignature(hash, height, scratch);
  hash = mixSignature(hash, progress?.length ?? 0, scratch);

  for (let index = 0; index < count; index += 1) {
    hash = mixSignature(hash, progressAt(progress, index), scratch);
  }

  return hash;
}

export function OverlayProjector({
  layout,
  progressRef,
  onOverlay,
  onOverlayScroll,
}: OverlayProjectorProps) {
  const { camera, size, invalidate } = useThree();
  const buffers = useMemo(() => createOverlayProjectionBuffers(layout), [layout]);
  const vector = useMemo(() => new Vector3(), []);
  const signatureScratch = useMemo(() => new DataView(new ArrayBuffer(8)), []);
  const signatureRef = useRef<number | null>(null);
  const stateRef = useRef<ProjectorState>('initial');
  const offsetRef = useRef<number | null>(null);
  const onOverlayRef = useRef(onOverlay);
  const onOverlayScrollRef = useRef(onOverlayScroll);

  useLayoutEffect(() => {
    onOverlayRef.current = onOverlay;
  }, [onOverlay]);

  useLayoutEffect(() => {
    onOverlayScrollRef.current = onOverlayScroll;
  }, [onOverlayScroll]);

  useLayoutEffect(() => {
    signatureRef.current = null;
    stateRef.current = 'initial';
  }, [layout]);

  useFrame(() => {
    const orthographicCamera = camera as OrthographicCamera;
    const view = orthographicCamera.view;
    const offsetY = view?.enabled ? view.offsetY : 0;
    const previousOffset = offsetRef.current;

    orthographicCamera.updateMatrixWorld(true);
    offsetRef.current = offsetY;

    if (previousOffset !== null && previousOffset !== offsetY) {
      onOverlayScrollRef.current(offsetY);
    }

    const progress = progressRef?.current ?? null;
    const signature = signatureOf(
      orthographicCamera,
      size.width,
      size.height,
      progress,
      layout.layers.length + layout.components.length,
      signatureScratch,
    );
    const previousSignature = signatureRef.current;

    signatureRef.current = signature;

    if (previousSignature !== null && previousSignature !== signature) {
      if (stateRef.current !== 'moving') {
        stateRef.current = 'moving';
        onOverlayRef.current({ kind: 'moving' });
      }

      invalidate();
      return;
    }

    if (previousSignature === null || stateRef.current === 'moving') {
      projectOverlayFrameBuffer(
        buffers,
        layout,
        orthographicCamera,
        progress,
        size.width,
        size.height,
        offsetY,
        vector,
      );
      stateRef.current = 'settled';
      onOverlayRef.current({
        kind: 'settled',
        frame: snapshotOverlayFrame(buffers),
        width: size.width,
        height: size.height,
        offsetY,
      });
    }
  });

  return null;
}
