import { useThree, useFrame } from '@react-three/fiber';
import { useLayoutEffect, useMemo, useRef, type RefObject } from 'react';
import { BoxGeometry, InstancedMesh, MeshLambertMaterial, Object3D } from 'three';

import { createExplodeTimeline, type ExplodeTimeline, type Phase } from '../../engine/explode';
import type { ProjectLayout } from '../../layout';
import type { MotionTokens } from '../../motion';
import type { Palette } from '../../theme';

export interface SlabsProps {
  readonly layout: ProjectLayout;
  readonly palette: Palette;
  readonly tokens: MotionTokens;
  readonly target: 'imploded' | 'exploded';
  readonly slug: string;
  readonly now: () => number;
  readonly onPhase?: (phase: Phase) => void;
  readonly onSettled?: (state: 'imploded' | 'exploded') => void;
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
): void {
  if (mesh === null) return;

  placements.forEach((placement, index) => {
    const amount = progress[offset + index] ?? 0;

    dummy.position.set(
      placement.imploded[0] + (placement.exploded[0] - placement.imploded[0]) * amount,
      placement.imploded[1] + (placement.exploded[1] - placement.imploded[1]) * amount,
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
): void {
  writeInstances(layers.current, layout.layers, progress, 0, dummy);
  writeInstances(components.current, layout.components, progress, layout.layers.length, dummy);
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
}: SlabsProps) {
  const { invalidate } = useThree();
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
    writeMatrices(layersRef, componentsRef, layout, progress, dummy);

    if (settled) {
      onSettledRef.current?.(timeline.target === 1 ? 'exploded' : 'imploded');
    }

    invalidate();
  }, [dummy, invalidate, layout, now, progress, target, tokens]);

  useFrame(() => {
    const timeline = timelineRef.current;

    if (timeline === null || !pendingSettlementRef.current) return;

    const timestamp = now();
    const settled = timeline.sample(timestamp, progress);
    const phase = timeline.phase(timestamp);

    if (phaseRef.current !== phase) {
      phaseRef.current = phase;
      onPhaseRef.current?.(phase);
    }

    writeMatrices(layersRef, componentsRef, layout, progress, dummy);
    pendingSettlementRef.current = !settled;

    if (settled) {
      onSettledRef.current?.(timeline.target === 1 ? 'exploded' : 'imploded');
    } else {
      invalidate();
    }
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
