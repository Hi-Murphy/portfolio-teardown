import type { Raycaster, Vector2 } from 'three';

import { pick } from '../../interaction/pick';
import type { ProjectLayout } from '../../layout';
import type { PickBridgeHandle } from '../scene/PickBridge';

export interface PickStage {
  getBoundingClientRect(): {
    readonly left: number;
    readonly top: number;
    readonly width: number;
    readonly height: number;
  };
}

export function pickAt(
  stage: PickStage,
  bridge: PickBridgeHandle,
  layout: ProjectLayout,
  raycaster: Raycaster,
  ndc: Vector2,
  clientX: number,
  clientY: number,
): string | null | undefined {
  const { camera, progress } = bridge;

  if (camera === null || progress === null) return undefined;

  const expectedLength = layout.layers.length + layout.components.length;

  if (progress.length !== expectedLength) return undefined;

  const rect = stage.getBoundingClientRect();

  if (rect.width <= 0 || rect.height <= 0) return undefined;

  ndc.set(
    ((clientX - rect.left) / rect.width) * 2 - 1,
    -((clientY - rect.top) / rect.height) * 2 + 1,
  );
  camera.updateMatrixWorld();
  raycaster.setFromCamera(ndc, camera);

  const index = pick(
    {
      origin: [raycaster.ray.origin.x, raycaster.ray.origin.y, raycaster.ray.origin.z],
      direction: [raycaster.ray.direction.x, raycaster.ray.direction.y, raycaster.ray.direction.z],
    },
    layout,
    progress,
  );

  return index === null ? null : (layout.components[index]?.id ?? null);
}
