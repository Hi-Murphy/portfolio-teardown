import type { RefObject } from 'react';

import type { Phase } from '../../engine/explode';
import type { RigState } from '../../engine/camera';
import type { ProjectLayout } from '../../layout';
import type { MotionTokens } from '../../motion';
import type { Palette } from '../../theme';
import { CameraRig } from './CameraRig';
import { useEmphasisDriver, type EmphasisPhase, type EmphasisState } from './Emphasis';
import { Lights } from './Lights';
import { PickBridge, type PickBridgeHandle } from './PickBridge';
import { Slabs } from './Slabs';
import { Stats, type ViewerStats } from './Stats';

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
      />
      <CameraRig layout={layout} tokens={tokens} rig={rig} now={now} onAzimuth={onAzimuth} />
      {pickBridgeRef === undefined ? null : (
        <PickBridge bridgeRef={pickBridgeRef} progressRef={progressRef} />
      )}
      <Lights />
      <Stats layout={layout} onStats={onStats} />
    </>
  );
}
