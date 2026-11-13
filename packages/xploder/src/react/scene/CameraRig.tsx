import { useThree, useFrame } from '@react-three/fiber';
import { useLayoutEffect, useMemo, useRef } from 'react';
import type { OrthographicCamera } from 'three';

import { azimuthOf, createTurnTween, createZoomTween, type RigState } from '../../engine/camera';
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

interface CameraZoomTarget {
  readonly dataset?: { xploderCameraZoom?: string };
}

function publishCameraZoom(element: CameraZoomTarget, zoomFactor: number): void {
  if (element.dataset === undefined) return;

  element.dataset.xploderCameraZoom = String(zoomFactor);
}

export function CameraRig({ layout, tokens, rig, now, onAzimuth }: CameraRigProps) {
  const { size, camera, gl, invalidate } = useThree();
  const turnTween = useMemo(() => createTurnTween(tokens), [tokens]);
  const zoomTween = useMemo(() => createZoomTween(tokens), [tokens]);
  const distance = useMemo(() => distanceFor(layout.bounds.exploded), [layout.bounds.exploded]);
  const smoothZoom = rig.smoothZoom === true;
  const onAzimuthRef = useRef(onAzimuth);
  const lastAzimuthRef = useRef<number | null>(null);

  useLayoutEffect(() => {
    onAzimuthRef.current = onAzimuth;
  }, [onAzimuth]);

  useLayoutEffect(() => {
    if (!smoothZoom) return;

    zoomTween.setTarget(rig.zoomFactor, now());
  }, [now, rig.zoomFactor, smoothZoom, zoomTween]);

  useLayoutEffect(() => {
    const orthographicCamera = camera as OrthographicCamera;
    const zoomFactor = smoothZoom ? zoomTween.sample(now()).zoomFactor : rig.zoomFactor;

    // eslint-disable-next-line react-hooks/immutability -- R3F cameras are mutable scene objects.
    orthographicCamera.zoom = fitZoom(layout.bounds.exploded, size) * zoomFactor;
    orthographicCamera.near = NEAR;
    orthographicCamera.far = 2 * distance;
    orthographicCamera.updateProjectionMatrix();
    if (smoothZoom) publishCameraZoom(gl.domElement, zoomFactor);
    invalidate();
  }, [
    camera,
    distance,
    gl,
    invalidate,
    layout.bounds.exploded,
    now,
    rig.zoomFactor,
    size,
    smoothZoom,
    zoomTween,
  ]);

  useLayoutEffect(() => {
    const timestamp = now();

    turnTween.setTarget(azimuthOf(rig.turns), timestamp);

    const { azimuth } = turnTween.sample(timestamp);

    placeCamera(camera as OrthographicCamera, azimuth, distance);
    lastAzimuthRef.current = azimuth;
    onAzimuthRef.current?.(azimuth);
    invalidate();
  }, [camera, distance, invalidate, now, rig.turns, turnTween]);

  // eslint-disable-next-line react-hooks/immutability -- R3F cameras and renderer DOM elements are mutable scene objects.
  useFrame(() => {
    const timestamp = now();
    const { azimuth, settled } = turnTween.sample(timestamp);

    placeCamera(camera as OrthographicCamera, azimuth, distance);

    if (lastAzimuthRef.current !== azimuth) {
      lastAzimuthRef.current = azimuth;
      onAzimuthRef.current?.(azimuth);
    }

    let zoomSettled = true;

    if (smoothZoom) {
      const sampled = zoomTween.sample(timestamp);
      const orthographicCamera = camera as OrthographicCamera;
      const zoom = fitZoom(layout.bounds.exploded, size) * sampled.zoomFactor;

      if (orthographicCamera.zoom !== zoom) {
        // eslint-disable-next-line react-hooks/immutability -- R3F cameras are mutable scene objects.
        orthographicCamera.zoom = zoom;
        orthographicCamera.updateProjectionMatrix();
      }

      publishCameraZoom(gl.domElement, sampled.zoomFactor);
      zoomSettled = sampled.settled;
    }

    if (!settled || !zoomSettled) invalidate();
  });

  return null;
}
