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
import { hexToLinear, highlightFill, kindFill, layerFill, type Rgb } from '../../look/fills';
import type { LookTokens } from '../../look/tokens';
import type { ProjectLayout } from '../../layout';
import type { MotionTokens } from '../../motion';
import { emphasis as emphasisTokens } from '../../motion/emphasis';
import type { ComponentKind } from '../../schema/constants';
import type { Palette } from '../../theme';
import { blueprintUniformsFor, type BlueprintUniforms } from './blueprintMaterial';

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
  readonly look?: LookTokens;
  readonly kinds?: readonly ComponentKind[];
}

interface FillMesh extends InstancedMesh {
  instanceFill?: InstancedBufferAttribute;
}

interface BlueprintMaterials {
  readonly layers: BlueprintUniforms;
  readonly components: BlueprintUniforms;
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

function initializeInstanceFill(mesh: FillMesh | null, count: number): void {
  if (mesh === null) return;

  const attribute = new InstancedBufferAttribute(new Float32Array(count * 3), 3);

  mesh.instanceFill = attribute;
  mesh.geometry.setAttribute('instanceFill', attribute);
}

function setFill(attribute: InstancedBufferAttribute, index: number, fill: Rgb): void {
  attribute.array[index * 3] = fill[0];
  attribute.array[index * 3 + 1] = fill[1];
  attribute.array[index * 3 + 2] = fill[2];
}

function writeLayerFill(mesh: FillMesh | null, palette: Palette): void {
  const attribute = mesh?.instanceFill;

  if (mesh === null || attribute === undefined) return;

  const fill = layerFill(palette);

  for (let index = 0; index < mesh.count; index += 1) setFill(attribute, index, fill);

  attribute.needsUpdate = true;
}

function writeComponentFill(
  mesh: FillMesh | null,
  layout: ProjectLayout,
  palette: Palette,
  kinds: readonly ComponentKind[] | undefined,
): void {
  const attribute = mesh?.instanceFill;

  if (mesh === null || attribute === undefined) return;

  layout.components.forEach((_, index) => {
    setFill(attribute, index, kindFill(palette, kinds?.[index] ?? 'module'));
  });
  attribute.needsUpdate = true;
}

function setLinearColor(
  colour: { setRGB(red: number, green: number, blue: number): void },
  value: Rgb,
): void {
  colour.setRGB(value[0], value[1], value[2]);
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
  look,
  kinds,
}: SlabsProps) {
  const { camera, invalidate, viewport } = useThree();
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
  const layerGeometry = useMemo(() => new BoxGeometry(1, 1, 1), []);
  const componentGeometry = useMemo(() => new BoxGeometry(1, 1, 1), []);
  const layerMaterial = useMemo(() => new MeshLambertMaterial(), []);
  const componentMaterial = useMemo(() => new MeshLambertMaterial(), []);
  const dummy = useMemo(() => new Object3D(), []);
  const edgeUniformsRef = useRef<{
    readonly layers: BlueprintUniforms['uEdgePx'];
    readonly components: BlueprintUniforms['uEdgePx'];
  } | null>(null);
  const blueprintMaterials = useMemo<BlueprintMaterials | null>(() => {
    if (look === undefined) return null;

    const layers = blueprintUniformsFor(layerMaterial);
    const components = blueprintUniformsFor(componentMaterial);

    layers.uFaces.value.set(look.faces.top, look.faces.left, look.faces.right);
    components.uFaces.value.set(look.faces.top, look.faces.left, look.faces.right);

    return { layers, components };
  }, [componentMaterial, layerMaterial, look]);

  useLayoutEffect(() => {
    edgeUniformsRef.current =
      blueprintMaterials === null
        ? null
        : {
            layers: blueprintMaterials.layers.uEdgePx,
            components: blueprintMaterials.components.uEdgePx,
          };
  }, [blueprintMaterials]);

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

    if (look !== undefined) {
      initializeInstanceFill(layersRef.current, layout.layers.length);
      initializeInstanceFill(componentsRef.current, layout.components.length);
    }

    invalidate();
  }, [invalidate, layout, look, slug]);

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

  useLayoutEffect(() => {
    if (blueprintMaterials === null || look === undefined) return;

    const accent = hexToLinear(palette[emphasisTokens.highlight.role]);
    const paper = hexToLinear(palette[emphasisTokens.dim.toward]);
    const highlight = highlightFill(palette);

    for (const uniforms of [blueprintMaterials.layers, blueprintMaterials.components]) {
      setLinearColor(uniforms.uAccent.value, accent);
      setLinearColor(uniforms.uPaper.value, paper);
      setLinearColor(uniforms.uHighlightFill.value, highlight);
    }

    writeLayerFill(layersRef.current as FillMesh | null, palette);
    writeComponentFill(componentsRef.current as FillMesh | null, layout, palette, kinds);
    invalidate();
  }, [blueprintMaterials, invalidate, kinds, layout, look, palette]);

  useLayoutEffect(
    () => () => {
      layerGeometry.dispose();
      componentGeometry.dispose();
      layerMaterial.dispose();
      componentMaterial.dispose();
    },
    [componentGeometry, componentMaterial, layerGeometry, layerMaterial],
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
    const edgeUniforms = edgeUniformsRef.current;

    if (edgeUniforms !== null && look !== undefined) {
      const dpr = viewport.dpr;

      edgeUniforms.layers.value = look.edge.layerPx * dpr;
      edgeUniforms.components.value = look.edge.componentPx * dpr;
    }

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
        args={[layerGeometry, layerMaterial, layout.layers.length]}
        frustumCulled={false}
        dispose={null}
      />
      <instancedMesh
        key={`${slug}-components`}
        ref={componentsRef}
        args={[componentGeometry, componentMaterial, layout.components.length]}
        frustumCulled={false}
        dispose={null}
      />
    </>
  );
}
