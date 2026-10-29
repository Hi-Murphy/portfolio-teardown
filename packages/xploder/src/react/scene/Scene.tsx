import type { Phase } from '../../engine/explode';
import type { RigState } from '../../engine/camera';
import type { ProjectLayout } from '../../layout';
import type { MotionTokens } from '../../motion';
import type { Palette } from '../../theme';
import { CameraRig } from './CameraRig';
import { Lights } from './Lights';
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
}: SceneProps) {
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
      />
      <CameraRig layout={layout} tokens={tokens} rig={rig} now={now} onAzimuth={onAzimuth} />
      <Lights />
      <Stats layout={layout} onStats={onStats} />
    </>
  );
}
