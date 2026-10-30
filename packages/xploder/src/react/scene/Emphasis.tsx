import { useThree } from '@react-three/fiber';
import { useLayoutEffect, useMemo, useRef } from 'react';
import { Color, type InstancedMesh } from 'three';

import {
  componentWeights,
  createChannels,
  emphasisTargets,
  layerWeight,
  liftWorld,
  pulseAt,
  type EmphasisInput,
} from '../../interaction/emphasis';
import { VIEW, type ProjectLayout } from '../../layout';
import type { MotionTokens } from '../../motion';
import { easeFromToken } from '../../motion/ease';
import { emphasis as emphasisTokens } from '../../motion/emphasis';
import type { Palette } from '../../theme';
import type { EmphasisDriver } from './Slabs';

export interface EmphasisState extends EmphasisInput {
  readonly tourPlaying?: boolean;
  readonly stepStartedAt?: number | null;
}

export interface EmphasisPhase {
  readonly tweening: boolean;
  readonly pulse: boolean;
}

export interface UseEmphasisDriverOptions {
  readonly layout: ProjectLayout;
  readonly palette: Palette;
  readonly tokens: MotionTokens;
  readonly now: () => number;
  readonly state?: EmphasisState;
  readonly onPhase?: (phase: EmphasisPhase) => void;
}

const DIVISOR_EPSILON = Number.EPSILON;

function colorRatio(target: Color, base: Color): readonly [number, number, number] {
  return [
    target.r / Math.max(base.r, DIVISOR_EPSILON),
    target.g / Math.max(base.g, DIVISOR_EPSILON),
    target.b / Math.max(base.b, DIVISOR_EPSILON),
  ];
}

function writeMeshColors(
  mesh: InstancedMesh,
  placements: ProjectLayout['layers'] | ProjectLayout['components'],
  base: Color,
  targetAt: (index: number, target: Color) => boolean,
  target: Color,
): boolean {
  const attribute = mesh.instanceColor;

  if (attribute === null) return false;

  let changed = false;

  placements.forEach((_, index) => {
    const neutral = targetAt(index, target);
    const values = neutral ? ([1, 1, 1] as const) : colorRatio(target, base);
    const offset = index * 3;

    values.forEach((value, channel) => {
      const position = offset + channel;

      if (attribute.array[position] !== value) {
        attribute.array[position] = value;
        changed = true;
      }
    });
  });

  if (changed) attribute.needsUpdate = true;
  return changed;
}

export function useEmphasisDriver({
  layout,
  palette,
  tokens,
  now,
  state,
  onPhase,
}: UseEmphasisDriverOptions): EmphasisDriver | undefined {
  const { invalidate } = useThree();
  const onPhaseRef = useRef(onPhase);
  const highlight = state?.highlight ?? null;
  const focusLayerId = state?.focusLayerId ?? null;
  const focusSuspended = state?.focusSuspended ?? false;
  const tourComponentId = state?.tourComponentId ?? null;
  const tourPlaying = state?.tourPlaying ?? false;
  const stepStartedAt = state?.stepStartedAt ?? null;
  const enabled = state !== undefined;

  useLayoutEffect(() => {
    onPhaseRef.current = onPhase;
  }, [onPhase]);

  const targets = useMemo(
    () =>
      !enabled
        ? null
        : emphasisTargets(layout, {
            highlight,
            focusLayerId,
            focusSuspended,
            tourComponentId,
          }),
    [enabled, focusLayerId, focusSuspended, highlight, layout, tourComponentId],
  );

  const channels = useMemo(() => {
    const hoverTiming = {
      rise: tokens.durations.hoverLift,
      fall: tokens.durations.hoverSettle,
      ease: easeFromToken(tokens.easings.hover),
    };
    const dimTiming = {
      rise: tokens.durations.hoverSettle,
      fall: tokens.durations.hoverSettle,
      ease: easeFromToken(tokens.easings.hover),
    };
    const tourTiming = {
      rise: tokens.durations.tourPulse,
      fall: tokens.durations.tourPulse,
      ease: easeFromToken(tokens.easings.tourPulse),
    };

    return {
      hover: createChannels(layout.components.length, hoverTiming),
      tour: createChannels(layout.components.length, tourTiming),
      dim: createChannels(layout.layers.length, dimTiming),
    };
  }, [layout.components.length, layout.layers.length, tokens]);

  useLayoutEffect(() => {
    if (targets === null) return;

    const timestamp = now();

    channels.hover.setTargets(targets.hover, timestamp);
    channels.tour.setTargets(targets.tour, timestamp);
    channels.dim.setTargets(targets.dim, timestamp);
    invalidate();
  }, [channels, invalidate, now, targets]);

  useLayoutEffect(() => {
    invalidate();
  }, [invalidate, palette]);

  const driver = useMemo<EmphasisDriver | undefined>(() => {
    if (!enabled) return undefined;

    const hoverValues = new Float32Array(layout.components.length);
    const tourValues = new Float32Array(layout.components.length);
    const dimValues = new Float32Array(layout.layers.length);
    const lift = new Float32Array(layout.components.length);
    const layerBase = new Color(palette.lineMuted);
    const componentBase = new Color(palette.line);
    const accent = new Color(palette[emphasisTokens.highlight.role]);
    const paper = new Color(palette[emphasisTokens.dim.toward]);
    const target = new Color();
    let pulse = 1;
    let previousPhase: EmphasisPhase | null = null;

    function report(tweening: boolean, pulseActive: boolean): void {
      if (
        previousPhase !== null &&
        previousPhase.tweening === tweening &&
        previousPhase.pulse === pulseActive
      ) {
        return;
      }

      previousPhase = { tweening, pulse: pulseActive };
      onPhaseRef.current?.(previousPhase);
    }

    function sample(timestamp: number, zoom: number): boolean {
      const hoverSettled = channels.hover.sample(timestamp, hoverValues);
      const tourSettled = channels.tour.sample(timestamp, tourValues);
      const dimSettled = channels.dim.sample(timestamp, dimValues);
      const pulseActive =
        tourPlaying &&
        stepStartedAt !== null &&
        tourComponentId !== null &&
        tokens.durations.tourPulse > 0;

      pulse = pulseActive
        ? pulseAt(timestamp, stepStartedAt ?? timestamp, tokens, emphasisTokens.tourPulse.floor)
        : 1;

      layout.components.forEach((_, index) => {
        lift[index] = liftWorld(
          tokens.distances.hoverLift * (hoverValues[index] ?? 0),
          zoom,
          VIEW.elevation,
        );
      });

      const tweening = !(hoverSettled && tourSettled && dimSettled);

      report(tweening, pulseActive);
      return tweening || pulseActive;
    }

    function writeColors(layers: InstancedMesh, components: InstancedMesh): boolean {
      const layersChanged = writeMeshColors(
        layers,
        layout.layers,
        layerBase,
        (index, colour) => {
          const weight = layerWeight(dimValues[index] ?? 0, emphasisTokens.dim.level);

          if (weight === 0) return true;

          colour.copy(layerBase).lerp(paper, weight);
          return false;
        },
        target,
      );
      const componentsChanged = writeMeshColors(
        components,
        layout.components,
        componentBase,
        (index, colour) => {
          const weights = componentWeights(
            hoverValues[index] ?? 0,
            tourValues[index] ?? 0,
            pulse,
            dimValues[layout.components[index]?.layerIndex ?? -1] ?? 0,
            emphasisTokens.dim.level,
          );

          if (weights.tint === 0 && weights.toPaper === 0) return true;

          colour.copy(componentBase).lerp(accent, weights.tint).lerp(paper, weights.toPaper);
          return false;
        },
        target,
      );

      return layersChanged || componentsChanged;
    }

    return { sample, lift, writeColors };
  }, [
    channels,
    layout.components,
    layout.layers,
    enabled,
    palette,
    stepStartedAt,
    tokens,
    tourComponentId,
    tourPlaying,
  ]);

  // A rebuilt driver (pause/resume, new step, palette) must draw at least one frame,
  // otherwise a pulse stopped mid-dip would stay frozen at a partial tint.
  useLayoutEffect(() => {
    invalidate();
  }, [driver, invalidate]);

  return driver;
}
