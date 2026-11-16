import type { Vector3 } from 'three';

import type { ProjectLayout } from '../../layout';
import { topFaceQuad, type FaceQuad } from '../../lettering/faces';
import type { OverlayEvent } from '../scene/OverlayProjector';
import type { PickBridgeHandle } from '../scene/PickBridge';

type SettledEvent = Extract<OverlayEvent, { kind: 'settled' }>;

export function snapshotFaces(
  bridge: PickBridgeHandle,
  layout: ProjectLayout,
  event: SettledEvent,
  vector: Vector3,
): FaceQuad[] | null {
  const camera = bridge.camera;
  const progress = bridge.progress;

  if (camera === null || progress === null) return null;

  camera.updateMatrixWorld(true);

  const projectPoint = (point: readonly [number, number, number]) => {
    const ndc = vector.set(point[0], point[1], point[2]).project(camera);

    return [
      ((ndc.x + 1) * event.width) / 2,
      ((1 - ndc.y) * event.height) / 2 + event.offsetY,
    ] as const;
  };

  return layout.components.map((component, index) => {
    const frameComponent = event.frame.components[index];

    if (frameComponent === undefined) {
      throw new Error(`Missing overlay component ${component.id}`);
    }

    return topFaceQuad(component, progress[layout.layers.length + index] ?? 0, projectPoint);
  });
}

export function stageExtent(wrapper: HTMLDivElement | null): number | null {
  const stage = wrapper?.querySelector('[data-xploder-stage]');
  const value = stage?.getAttribute('data-xploder-scroll-extent');

  if (value === null || value === undefined || value.trim() === '') return null;

  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : null;
}
