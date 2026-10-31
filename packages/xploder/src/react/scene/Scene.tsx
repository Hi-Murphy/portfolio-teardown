import type { RefObject } from 'react';

import type { Phase } from '../../engine/explode';
import type { RigState } from '../../engine/camera';
import type { LookTokens } from '../../look/tokens';
import type { ProjectLayout } from '../../layout';
import type { MotionTokens } from '../../motion';
import type { ComponentKind } from '../../schema/constants';
import type { Palette } from '../../theme';
import { CameraRig } from './CameraRig';
import { useEmphasisDriver, type EmphasisPhase, type EmphasisState } from './Emphasis';
import { Lights } from './Lights';
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
}

function defaultNow(): number {
  return performance.now() / 1000;
}

export function Scene({
  layout,
  palette,
  tokens,
  target,
  rig,
  now = defaultNow,
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
}: SceneProps) {
  const emphasisDriver = useEmphasisDriver({
    layout,
    palette,
    tokens,
    now,
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
        now={now}
        onPhase={onPhase}
        onSettled={onSettled}
        emphasis={emphasisDriver}
        progressRef={progressRef}
        look={look}
        kinds={kinds}
      />
      <CameraRig layout={layout} tokens={tokens} rig={rig} now={now} onAzimuth={onAzimuth} />
      {scrollRef === undefined ? null : (
        <ViewScroll layout={layout} rig={rig} scrollRef={scrollRef} onExtent={onScrollExtent} />
      )}
      {pickBridgeRef === undefined ? null : (
        <PickBridge bridgeRef={pickBridgeRef} progressRef={progressRef} />
      )}
      <Lights />
      <Stats layout={layout} onStats={onStats} />
    </>
  );
}
