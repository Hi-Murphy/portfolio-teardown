import { useThree, type Frameloop } from '@react-three/fiber';
import { useCallback, useLayoutEffect, useMemo, useRef, useState, type RefObject } from 'react';

import type { Phase } from '../../engine/explode';
import type { RigState } from '../../engine/camera';
import type { LookTokens } from '../../look/tokens';
import type { ProjectLayout } from '../../layout';
import type { MotionTokens } from '../../motion';
import type { ComponentKind } from '../../schema/constants';
import type { Palette } from '../../theme';
import { clockFromNow, createEngineClock, type ClockReader } from '../../time/clock';
import { CameraRig } from './CameraRig';
import { useEmphasisDriver, type EmphasisPhase, type EmphasisState } from './Emphasis';
import { Lights } from './Lights';
import { OverlayProjector, type OverlayEvent } from './OverlayProjector';
import { PickBridge, type PickBridgeHandle } from './PickBridge';
import { Slabs } from './Slabs';
import { Stats, type ViewerStats } from './Stats';
import { ViewScroll } from './ViewScroll';

export interface SceneProps {
  readonly layout: ProjectLayout;
  readonly palette: Palette;
  readonly tokens: MotionTokens;
  readonly target: 'imploded' | 'exploded';
  readonly rig: RigState;
  readonly clock?: ClockReader;
  readonly now?: () => number;
  readonly slug?: string;
  readonly onPhase?: (phase: Phase) => void;
  readonly onSettled?: (state: 'imploded' | 'exploded') => void;
  readonly onStats?: (stats: ViewerStats) => void;
  readonly onAzimuth?: (azimuth: number) => void;
  readonly emphasis?: EmphasisState;
  readonly onEmphasisPhase?: (phase: EmphasisPhase) => void;
  readonly progressRef?: RefObject<Float32Array | null>;
  readonly pickBridgeRef?: RefObject<PickBridgeHandle>;
  readonly scrollRef?: RefObject<HTMLDivElement | null>;
  readonly onScrollExtent?: (extent: number) => void;
  readonly look?: LookTokens;
  readonly kinds?: readonly ComponentKind[];
  readonly onOverlay?: (event: OverlayEvent) => void;
  readonly onOverlayScroll?: (offsetY: number) => void;
}

function ignoreOverlayScroll(): void {}

interface ClockGateProps {
  readonly clock: ClockReader;
  readonly palette: Palette;
  readonly look?: LookTokens;
  readonly layout: ProjectLayout;
  readonly kinds?: readonly ComponentKind[];
}

function ClockGate({ clock, palette, look, layout, kinds }: ClockGateProps) {
  const setFrameloop = useThree((state) => state.setFrameloop);
  const invalidate = useThree((state) => state.invalidate);
  const advance = useThree((state) => state.advance);
  const getState = useThree((state) => state.get);
  const size = useThree((state) => state.size);
  const dpr = useThree((state) => state.viewport.dpr);
  const resumeFrameloop = useRef<Frameloop>('never');
  const mounted = useRef(false);

  useLayoutEffect(() => {
    const pause = (): void => {
      resumeFrameloop.current = getState().frameloop;
      setFrameloop('never');
    };

    if (clock.paused) pause();

    return clock.subscribe((paused) => {
      if (paused) {
        pause();
        return;
      }

      setFrameloop(resumeFrameloop.current);
      invalidate();
    });
  }, [clock, getState, invalidate, setFrameloop]);

  useLayoutEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }

    if (clock.paused) advance(clock.now());
  }, [advance, clock, dpr, kinds, layout, look, palette, size.height, size.width]);

  return null;
}

export function Scene({
  layout,
  palette,
  tokens,
  target,
  rig,
  clock,
  now,
  slug = layout.layers[0]?.id ?? 'xploder',
  onPhase,
  onSettled,
  onStats,
  onAzimuth,
  emphasis,
  onEmphasisPhase,
  progressRef,
  pickBridgeRef,
  scrollRef,
  onScrollExtent,
  look,
  kinds,
  onOverlay,
  onOverlayScroll,
}: SceneProps) {
  const [ownedClock] = useState(() => createEngineClock());
  const legacyClock = useMemo(() => (now === undefined ? null : clockFromNow(now)), [now]);
  const resolvedClock = clock ?? legacyClock ?? ownedClock;
  const engineNow = resolvedClock.now;
  const azimuthRef = useRef<number | null>(null);
  const handleAzimuth = useCallback(
    (azimuth: number) => {
      azimuthRef.current = azimuth;
      onAzimuth?.(azimuth);
    },
    [onAzimuth],
  );
  const emphasisDriver = useEmphasisDriver({
    layout,
    palette,
    tokens,
    now: engineNow,
    state: emphasis,
    onPhase: onEmphasisPhase,
  });

  return (
    <>
      <Slabs
        layout={layout}
        palette={palette}
        tokens={tokens}
        target={target}
        slug={slug}
        now={engineNow}
        onPhase={onPhase}
        onSettled={onSettled}
        emphasis={emphasisDriver}
        progressRef={progressRef}
        look={look}
        kinds={kinds}
      />
      <CameraRig
        layout={layout}
        tokens={tokens}
        rig={rig}
        now={engineNow}
        onAzimuth={handleAzimuth}
      />
      {scrollRef === undefined ? null : (
        <ViewScroll layout={layout} rig={rig} scrollRef={scrollRef} onExtent={onScrollExtent} />
      )}
      {pickBridgeRef === undefined ? null : (
        <PickBridge bridgeRef={pickBridgeRef} progressRef={progressRef} />
      )}
      {onOverlay === undefined ? null : (
        <OverlayProjector
          layout={layout}
          progressRef={progressRef}
          clock={resolvedClock}
          target={target}
          rig={rig}
          azimuthRef={azimuthRef}
          onOverlay={onOverlay}
          onOverlayScroll={onOverlayScroll ?? ignoreOverlayScroll}
        />
      )}
      <Lights />
      <Stats layout={layout} onStats={onStats} />
      <ClockGate
        clock={resolvedClock}
        palette={palette}
        look={look}
        layout={layout}
        kinds={kinds}
      />
    </>
  );
}
