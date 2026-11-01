import { useLayoutEffect, useMemo, useRef, type RefObject } from 'react';
import { Raycaster, Vector2 } from 'three';

import type { ProjectLayout } from '../../layout';
import type { PickBridgeHandle } from '../scene/PickBridge';
import { pickAt } from './pickAt';

export function useSlabClick(
  stageRef: RefObject<HTMLElement | null>,
  bridgeRef: RefObject<PickBridgeHandle>,
  layout: ProjectLayout,
  onSlabClick: (hit: string | null) => void,
): void {
  const raycaster = useMemo(() => new Raycaster(), []);
  const ndc = useMemo(() => new Vector2(), []);
  const onSlabClickRef = useRef(onSlabClick);

  useLayoutEffect(() => {
    onSlabClickRef.current = onSlabClick;
  }, [onSlabClick]);

  useLayoutEffect(() => {
    const stage = stageRef.current;

    if (stage === null) return;

    const onClick = (event: MouseEvent) => {
      const hit = pickAt(
        stage,
        bridgeRef.current,
        layout,
        raycaster,
        ndc,
        event.clientX,
        event.clientY,
      );

      if (hit === undefined) return;
      onSlabClickRef.current(hit);
    };

    stage.addEventListener('click', onClick);

    return () => stage.removeEventListener('click', onClick);
  }, [bridgeRef, layout, ndc, raycaster, stageRef]);
}
