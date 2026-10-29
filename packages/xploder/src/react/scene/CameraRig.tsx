import { useThree, useFrame } from '@react-three/fiber';
import { useLayoutEffect, useMemo, useRef } from 'react';
import type { OrthographicCamera } from 'three';

import { azimuthOf, createTurnTween, type RigState } from '../../engine/camera';
import { fitZoom, VIEW, type ProjectLayout } from '../../layout';
import type { MotionTokens } from '../../motion';

export interface CameraRigProps {
  readonly layout: ProjectLayout;
  readonly tokens: MotionTokens;
  readonly rig: RigState;
  readonly now: () => number;
  readonly onAzimuth?: (azimuth: number) => void;
}

const NEAR = 0.1;
const DISTANCE_MULTIPLIER = 4;

function distanceFor(bounds: ProjectLayout['bounds']['exploded']): number {
  const width = bounds.max[0] - bounds.min[0];
  const height = bounds.max[1] - bounds.min[1];
  const depth = bounds.max[2] - bounds.min[2];

  return DISTANCE_MULTIPLIER * (Math.hypot(width, height, depth) / 2);
}

function placeCamera(camera: OrthographicCamera, azimuth: number, distance: number): void {
  const radius = distance * Math.cos(VIEW.elevation);

  camera.position.set(
    radius * Math.sin(azimuth),
    distance * Math.sin(VIEW.elevation),
    radius * Math.cos(azimuth),
  );
  camera.lookAt(0, 0, 0);
}

export function CameraRig({ layout, tokens, rig, now, onAzimuth }: CameraRigProps) {
  const { size, camera, invalidate } = useThree();
  const turnTween = useMemo(() => createTurnTween(tokens), [tokens]);
  const distance = useMemo(() => distanceFor(layout.bounds.exploded), [layout.bounds.exploded]);
  const onAzimuthRef = useRef(onAzimuth);
  const lastAzimuthRef = useRef<number | null>(null);

  useLayoutEffect(() => {
    onAzimuthRef.current = onAzimuth;
  }, [onAzimuth]);

  useLayoutEffect(() => {
    const orthographicCamera = camera as OrthographicCamera;

    // eslint-disable-next-line react-hooks/immutability -- R3F cameras are mutable scene objects.
    orthographicCamera.zoom = fitZoom(layout.bounds.exploded, size) * rig.zoomFactor;
    orthographicCamera.near = NEAR;
    orthographicCamera.far = 2 * distance;
    orthographicCamera.updateProjectionMatrix();
    invalidate();
  }, [camera, distance, invalidate, layout.bounds.exploded, rig.zoomFactor, size]);

  useLayoutEffect(() => {
    const timestamp = now();

    turnTween.setTarget(azimuthOf(rig.turns), timestamp);

    const { azimuth } = turnTween.sample(timestamp);

    placeCamera(camera as OrthographicCamera, azimuth, distance);
    lastAzimuthRef.current = azimuth;
    onAzimuthRef.current?.(azimuth);
    invalidate();
  }, [camera, distance, invalidate, now, rig.turns, turnTween]);

  useFrame(() => {
    const { azimuth, settled } = turnTween.sample(now());

    placeCamera(camera as OrthographicCamera, azimuth, distance);

    if (lastAzimuthRef.current !== azimuth) {
      lastAzimuthRef.current = azimuth;
      onAzimuthRef.current?.(azimuth);
    }

    if (!settled) invalidate();
  });

  return null;
}
