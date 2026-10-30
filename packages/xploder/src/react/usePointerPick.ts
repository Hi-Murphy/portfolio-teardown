import {
  useCallback,
  useLayoutEffect,
  useMemo,
  useRef,
  type Dispatch,
  type RefObject,
} from 'react';
import { Raycaster, Vector2 } from 'three';

import { pick } from '../interaction/pick';
import type { PointerInput, PointerState } from '../interaction/pointer';
import type { ProjectLayout } from '../layout';
import type { PickBridgeHandle } from './scene/PickBridge';

interface PointerPosition {
  readonly x: number;
  readonly y: number;
}

function cursorFor(hit: string | null): string {
  return hit === null ? '' : 'pointer';
}

export function usePointerPick(
  stageRef: RefObject<HTMLDivElement | null>,
  bridgeRef: RefObject<PickBridgeHandle>,
  layout: ProjectLayout,
  dispatch: Dispatch<PointerInput>,
  pointer: PointerState,
): void {
  const raycaster = useMemo(() => new Raycaster(), []);
  const ndc = useMemo(() => new Vector2(), []);
  const pointerInsideRef = useRef(false);
  const pointerPositionRef = useRef<PointerPosition | null>(null);
  const lastPointerDownTypeRef = useRef<string | null>(null);
  const lastDispatchedHitRef = useRef<string | null>(null);

  const setCursor = useCallback(
    (hit: string | null) => {
      const canvas = stageRef.current?.querySelector('canvas');

      if (canvas !== null && canvas !== undefined) canvas.style.cursor = cursorFor(hit);
    },
    [stageRef],
  );

  const pickAt = useCallback(
    (clientX: number, clientY: number): string | null | undefined => {
      const stage = stageRef.current;
      const bridge = bridgeRef.current;
      const { camera, progress } = bridge;

      if (stage === null || camera === null || progress === null) return undefined;

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
          direction: [
            raycaster.ray.direction.x,
            raycaster.ray.direction.y,
            raycaster.ray.direction.z,
          ],
        },
        layout,
        progress,
      );

      return index === null ? null : (layout.components[index]?.id ?? null);
    },
    [bridgeRef, layout, ndc, raycaster, stageRef],
  );

  const dispatchMove = useCallback(
    (hit: string | null) => {
      if (hit === lastDispatchedHitRef.current) return;

      lastDispatchedHitRef.current = hit;
      dispatch({ type: 'move', hit });
    },
    [dispatch],
  );

  const repick = useCallback(() => {
    const position = pointerPositionRef.current;

    if (!pointerInsideRef.current || position === null) return;

    const hit = pickAt(position.x, position.y);

    if (hit === undefined) return;

    setCursor(hit);
    dispatchMove(hit);
  }, [dispatchMove, pickAt, setCursor]);

  useLayoutEffect(() => {
    const bridge = bridgeRef.current;

    bridge.onFrame = repick;

    return () => {
      if (bridge.onFrame === repick) bridge.onFrame = null;
    };
  }, [bridgeRef, repick]);

  useLayoutEffect(() => {
    const stage = stageRef.current;

    if (stage === null) return;

    const onPointerMove = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse') return;

      pointerInsideRef.current = true;
      pointerPositionRef.current = { x: event.clientX, y: event.clientY };

      const hit = pickAt(event.clientX, event.clientY);

      if (hit === undefined) return;

      setCursor(hit);
      dispatchMove(hit);
    };

    const onPointerLeave = () => {
      pointerInsideRef.current = false;
      pointerPositionRef.current = null;
      lastDispatchedHitRef.current = null;
      setCursor(null);
      dispatch({ type: 'leave' });
    };

    const onPointerDown = (event: PointerEvent) => {
      lastPointerDownTypeRef.current = event.pointerType;

      if (event.pointerType !== 'mouse') pointerInsideRef.current = false;
    };

    const onClick = (event: MouseEvent) => {
      const pointerType = lastPointerDownTypeRef.current;

      lastPointerDownTypeRef.current = null;

      if (pointerType === null || pointerType === 'mouse') return;

      const hit = pickAt(event.clientX, event.clientY);

      if (hit === undefined) return;

      lastDispatchedHitRef.current = hit;
      pointerInsideRef.current = false;
      dispatch({ type: 'tap', hit });
    };

    stage.addEventListener('pointermove', onPointerMove);
    stage.addEventListener('pointerleave', onPointerLeave);
    stage.addEventListener('pointerdown', onPointerDown);
    stage.addEventListener('click', onClick);

    return () => {
      stage.removeEventListener('pointermove', onPointerMove);
      stage.removeEventListener('pointerleave', onPointerLeave);
      stage.removeEventListener('pointerdown', onPointerDown);
      stage.removeEventListener('click', onClick);
      setCursor(null);
    };
  }, [dispatch, dispatchMove, pickAt, setCursor, stageRef]);

  useLayoutEffect(() => {
    if (pointer.source !== 'touch') return;

    const onOutsidePointerDown = (event: PointerEvent) => {
      const stage = stageRef.current;

      if (stage === null) return;

      const viewer = stage.parentElement ?? stage;

      if (event.target instanceof Node && !viewer.contains(event.target)) {
        dispatch({ type: 'outsideTap' });
      }
    };

    document.addEventListener('pointerdown', onOutsidePointerDown);

    return () => document.removeEventListener('pointerdown', onOutsidePointerDown);
  }, [dispatch, pointer.source, stageRef]);
}
