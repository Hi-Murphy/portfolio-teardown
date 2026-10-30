import { useThree, useFrame } from '@react-three/fiber';
import { useLayoutEffect, useMemo, useRef, type RefObject } from 'react';
import {
  BoxGeometry,
  InstancedBufferAttribute,
  InstancedMesh,
  MeshLambertMaterial,
  Object3D,
} from 'three';

import { createExplodeTimeline, type ExplodeTimeline, type Phase } from '../../engine/explode';
import type { ProjectLayout } from '../../layout';
import type { MotionTokens } from '../../motion';
import type { Palette } from '../../theme';

export interface EmphasisDriver {
  sample(now: number, zoom: number): boolean;
  readonly lift: Float32Array;
  writeColors(layers: InstancedMesh, components: InstancedMesh): boolean;
}

export interface SlabsProps {
  readonly layout: ProjectLayout;
  readonly palette: Palette;
  readonly tokens: MotionTokens;
  readonly target: 'imploded' | 'exploded';
  readonly slug: string;
  readonly now: () => number;
  readonly onPhase?: (phase: Phase) => void;
  readonly onSettled?: (state: 'imploded' | 'exploded') => void;
  readonly emphasis?: EmphasisDriver;
  readonly progressRef?: RefObject<Float32Array | null>;
}

type TimelineKey = {
  layout: ProjectLayout | null;
  tokens: MotionTokens | null;
};

function targetValue(target: 'imploded' | 'exploded'): 0 | 1 {
  return target === 'exploded' ? 1 : 0;
}

function writeInstances(
  mesh: InstancedMesh | null,
  placements: ProjectLayout['layers'] | ProjectLayout['components'],
  progress: Float32Array,
  offset: number,
  dummy: Object3D,
  lift?: ArrayLike<number>,
): void {
  if (mesh === null) return;

  placements.forEach((placement, index) => {
    const amount = progress[offset + index] ?? 0;
    const liftY = lift?.[index] ?? 0;

    dummy.position.set(
      placement.imploded[0] + (placement.exploded[0] - placement.imploded[0]) * amount,
      placement.imploded[1] + (placement.exploded[1] - placement.imploded[1]) * amount + liftY,
      placement.imploded[2] + (placement.exploded[2] - placement.imploded[2]) * amount,
    );
    dummy.scale.set(placement.size[0], placement.size[1], placement.size[2]);
    dummy.updateMatrix();
    mesh.setMatrixAt(index, dummy.matrix);
  });

  mesh.instanceMatrix.needsUpdate = true;
}

function writeMatrices(
  layers: RefObject<InstancedMesh | null>,
  components: RefObject<InstancedMesh | null>,
  layout: ProjectLayout,
  progress: Float32Array,
  dummy: Object3D,
  lift?: ArrayLike<number>,
): void {
  writeInstances(layers.current, layout.layers, progress, 0, dummy);
  writeInstances(
    components.current,
    layout.components,
    progress,
    layout.layers.length,
    dummy,
    lift,
  );
}

function initializeInstanceColor(mesh: InstancedMesh | null, count: number): void {
  if (mesh === null) return;

  mesh.instanceColor = new InstancedBufferAttribute(new Float32Array(count * 3).fill(1), 3);
}

export function Slabs({
  layout,
  palette,
  tokens,
  target,
  slug,
  now,
  onPhase,
  onSettled,
  emphasis,
  progressRef,
}: SlabsProps) {
  const { camera, invalidate } = useThree();
  const layersRef = useRef<InstancedMesh>(null);
  const componentsRef = useRef<InstancedMesh>(null);
  const timelineRef = useRef<ExplodeTimeline | null>(null);
  const timelineKeyRef = useRef<TimelineKey>({ layout: null, tokens: null });
  const pendingSettlementRef = useRef(false);
  const phaseRef = useRef<Phase | null>(null);
  const onPhaseRef = useRef(onPhase);
  const onSettledRef = useRef(onSettled);
  const progress = useMemo(
    () => new Float32Array(layout.layers.length + layout.components.length),
    [layout],
  );
  const geometry = useMemo(() => new BoxGeometry(1, 1, 1), []);
  const layerMaterial = useMemo(() => new MeshLambertMaterial(), []);
  const componentMaterial = useMemo(() => new MeshLambertMaterial(), []);
  const dummy = useMemo(() => new Object3D(), []);

  useLayoutEffect(() => {
    onPhaseRef.current = onPhase;
  }, [onPhase]);

  useLayoutEffect(() => {
    onSettledRef.current = onSettled;
  }, [onSettled]);

  // Keyed on the layout (not just counts): meshes remount per project slug, and a
  // remounted mesh needs its colour buffer before its shader first compiles.
  useLayoutEffect(() => {
    initializeInstanceColor(layersRef.current, layout.layers.length);
    initializeInstanceColor(componentsRef.current, layout.components.length);
    invalidate();
  }, [invalidate, layout, slug]);

  useLayoutEffect(() => {
    if (progressRef !== undefined) progressRef.current = progress;

    return () => {
      if (progressRef?.current === progress) progressRef.current = null;
    };
  }, [progress, progressRef]);

  useLayoutEffect(() => {
    layerMaterial.color.set(palette.lineMuted);
    componentMaterial.color.set(palette.line);
    invalidate();
  }, [componentMaterial, invalidate, layerMaterial, palette.line, palette.lineMuted]);

  useLayoutEffect(
    () => () => {
      geometry.dispose();
      layerMaterial.dispose();
      componentMaterial.dispose();
    },
    [componentMaterial, geometry, layerMaterial],
  );

  useLayoutEffect(() => {
    const timestamp = now();
    const nextTarget = targetValue(target);
    const timelineKey = timelineKeyRef.current;
    const timelineChanged = timelineKey.layout !== layout || timelineKey.tokens !== tokens;
    let changed = false;
    let timeline = timelineRef.current;

    if (timelineChanged || timeline === null) {
      timeline = createExplodeTimeline(layout, tokens, nextTarget);
      timelineRef.current = timeline;
      timelineKeyRef.current = { layout, tokens };
      changed = true;
    } else if (timeline.target !== nextTarget) {
      timeline.setTarget(nextTarget, timestamp);
      changed = true;
    }

    if (!changed) return;

    const settled = timeline.sample(timestamp, progress);
    const phase = timeline.phase(timestamp);

    if (phaseRef.current !== phase) {
      phaseRef.current = phase;
      onPhaseRef.current?.(phase);
    }

    pendingSettlementRef.current = !settled;
    writeMatrices(layersRef, componentsRef, layout, progress, dummy, emphasis?.lift);

    if (settled) {
      onSettledRef.current?.(timeline.target === 1 ? 'exploded' : 'imploded');
    }

    invalidate();
  }, [dummy, emphasis?.lift, invalidate, layout, now, progress, target, tokens]);

  useFrame(() => {
    const timeline = timelineRef.current;
    const timelinePending = timeline !== null && pendingSettlementRef.current;

    if (!timelinePending && emphasis === undefined) return;

    const timestamp = now();
    const emphasisMoving = emphasis?.sample(timestamp, camera.zoom) ?? false;

    let settled = true;

    if (timelinePending && timeline !== null) {
      settled = timeline.sample(timestamp, progress);

      const phase = timeline.phase(timestamp);

      if (phaseRef.current !== phase) {
        phaseRef.current = phase;
        onPhaseRef.current?.(phase);
      }

      pendingSettlementRef.current = !settled;

      if (settled) {
        onSettledRef.current?.(timeline.target === 1 ? 'exploded' : 'imploded');
      }
    }

    writeMatrices(layersRef, componentsRef, layout, progress, dummy, emphasis?.lift);

    if (emphasis !== undefined && layersRef.current !== null && componentsRef.current !== null) {
      emphasis.writeColors(layersRef.current, componentsRef.current);
    }

    if ((timelinePending && !settled) || emphasisMoving) invalidate();
  });

  return (
    <>
      <instancedMesh
        key={`${slug}-layers`}
        ref={layersRef}
        args={[geometry, layerMaterial, layout.layers.length]}
        frustumCulled={false}
        dispose={null}
      />
      <instancedMesh
        key={`${slug}-components`}
        ref={componentsRef}
        args={[geometry, componentMaterial, layout.components.length]}
        frustumCulled={false}
        dispose={null}
      />
    </>
  );
}
