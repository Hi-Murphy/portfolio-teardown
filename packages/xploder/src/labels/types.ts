import type { CompactColumn } from '../lettering/column';
import type { FaceQuad } from '../lettering/faces';
import type { LayerLettering } from '../lettering/layers';
import type { ComponentLettering } from '../lettering/model';
import type { ProjectLayout } from '../layout';
import type { LookTokens } from '../look/tokens';
import type { OverlayModel } from '../overlay/model';
import type { OverlayFrame, Vec2 } from '../overlay/project';
import type { ViewerProject } from '../react/useTeardownViewer';

export type LabelKind =
  | 'titleblock'
  | 'column-layer'
  | 'column-part'
  | 'column-rail'
  | 'column-footprint'
  | 'plate'
  | 'face'
  | 'compact-row'
  | 'mark'
  | 'callout-layer'
  | 'callout-part'
  | 'dimension'
  | 'tag';

export type LabelPriority = 0 | 1 | 2 | 3 | 4 | 5 | 6;
export type LabelQuad = readonly [Vec2, Vec2, Vec2, Vec2];
export type LabelSource = 'overlay' | 'lettering';

export interface LabelItem {
  readonly key: string;
  readonly kind: LabelKind;
  readonly quad: LabelQuad;
  readonly priority: LabelPriority;
  readonly visible: boolean;
  readonly source: LabelSource;
}

export interface LabelPassInput {
  readonly frame: OverlayFrame;
  readonly faces: readonly FaceQuad[] | null;
  readonly viewport: { readonly width: number; readonly height: number };
  readonly offsetY: number;
  readonly extentPx: number | null;
  readonly zoomFactor: number;
  readonly target: 'imploded' | 'exploded';
  readonly layout: ProjectLayout;
  readonly project: ViewerProject;
  readonly look: LookTokens;
}

export interface LetteringPassResult {
  readonly items: readonly ComponentLettering[];
  readonly column: CompactColumn | null;
  readonly layerLabels: readonly LayerLettering[];
  readonly layersShown: boolean;
}

export interface LabelPassResult {
  readonly overlay: OverlayModel;
  readonly lettering: LetteringPassResult | null;
  readonly labels: readonly LabelItem[];
  readonly guarded: number;
  readonly pass: number;
  readonly target: 'imploded' | 'exploded';
}
