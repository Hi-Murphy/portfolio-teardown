import { useFrame, useThree } from '@react-three/fiber';
import { useCallback, useLayoutEffect, useRef, type RefObject } from 'react';
import { Vector3, type OrthographicCamera } from 'three';

import type { RigState } from '../../engine/camera';
import { offsetFor, scrollExtent } from '../../interaction/scroll';
import { VIEW, type Box, type ProjectLayout } from '../../layout';

export interface ViewScrollProps {
  readonly layout: ProjectLayout;
  readonly rig: RigState;
  readonly scrollRef: RefObject<HTMLDivElement | null>;
  readonly onExtent?: (extent: number) => void;
}

interface ProjectedExtent {
  readonly top: number;
  readonly bottom: number;
}

interface AppliedView {
  readonly width: number;
  readonly height: number;
  readonly offset: number;
}

const EXTENT_EPSILON = 0.01;

function projectedExtent(
  camera: OrthographicCamera,
  bounds: Box,
  viewportHeight: number,
  corner: Vector3,
): ProjectedExtent {
  let top = Infinity;
  let bottom = -Infinity;

  camera.updateMatrixWorld(true);

  for (const x of [bounds.min[0], bounds.max[0]]) {
    for (const y of [bounds.min[1], bounds.max[1]]) {
      for (const z of [bounds.min[2], bounds.max[2]]) {
        const ndc = corner.set(x, y, z).project(camera);
        const screenY = ((1 - ndc.y) * viewportHeight) / 2;

        top = Math.min(top, screenY);
        bottom = Math.max(bottom, screenY);
      }
    }
  }

  return { top, bottom };
}

function normalizedExtent(extent: number): number {
  return extent <= EXTENT_EPSILON ? 0 : extent;
}

export function ViewScroll({ layout, rig, scrollRef, onExtent }: ViewScrollProps) {
  const { camera, size, invalidate } = useThree();
  const corner = useRef(new Vector3());
  const extentRef = useRef(0);
  const appliedRef = useRef<AppliedView | null>(null);
  const onExtentRef = useRef(onExtent);

  useLayoutEffect(() => {
    onExtentRef.current = onExtent;
  }, [onExtent]);

  const sync = useCallback(() => {
    const orthographicCamera = camera as OrthographicCamera;
    const stage = scrollRef.current;
    const viewportHeight = size.height;

    if (viewportHeight <= 0 || size.width <= 0) return;

    const projected = projectedExtent(
      orthographicCamera,
      layout.bounds.exploded,
      viewportHeight,
      corner.current,
    );
    const extent = normalizedExtent(
      scrollExtent(
        projected.top,
        projected.bottom,
        viewportHeight,
        VIEW.fitMargin * viewportHeight,
      ),
    );
    const offset = offsetFor(stage?.scrollTop ?? 0, extent);
    const previousExtent = extentRef.current;

    if (Math.abs(extent - previousExtent) > EXTENT_EPSILON) {
      extentRef.current = extent;
      onExtentRef.current?.(extent);
    }

    if (stage !== null) stage.dataset.xploderScrollExtent = String(extent);

    const applied = appliedRef.current;

    if (
      applied !== null &&
      applied.width === size.width &&
      applied.height === size.height &&
      Math.abs(applied.offset - offset) <= EXTENT_EPSILON
    ) {
      return;
    }

    appliedRef.current = { width: size.width, height: size.height, offset };

    if (extent === 0) {
      orthographicCamera.clearViewOffset();
    } else {
      orthographicCamera.setViewOffset(size.width, size.height, 0, offset, size.width, size.height);
    }

    orthographicCamera.updateProjectionMatrix();
    invalidate();
  }, [camera, invalidate, layout.bounds.exploded, scrollRef, size.height, size.width]);

  useLayoutEffect(() => {
    sync();
  }, [rig.turns, rig.zoomFactor, size.height, size.width, sync]);

  useLayoutEffect(() => {
    const stage = scrollRef.current;

    if (stage === null) return;

    stage.addEventListener('scroll', sync, { passive: true });

    return () => stage.removeEventListener('scroll', sync);
  }, [scrollRef, sync]);

  useFrame(sync);

  return null;
}
