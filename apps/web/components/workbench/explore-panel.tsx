'use client';

import type { KeyboardEvent } from 'react';

import { ExploreView, type ExploreMode } from './explore-view';
import type { TourPanelProps } from './tour-panel';
import type { LayerModel } from './tour-model';
import { TourPanel } from './tour-panel';

export type { ExploreMode } from './explore-view';

const MODES = [
  { id: 'layers', label: 'Layers' },
  { id: 'flows', label: 'Flows' },
] as const satisfies readonly { readonly id: ExploreMode; readonly label: string }[];

export interface ExplorePanelProps extends TourPanelProps {
  readonly mode: ExploreMode;
  readonly onModeChange: (mode: ExploreMode) => void;
  readonly layers: readonly LayerModel[];
  readonly focusedLayerId: string | null;
  readonly onToggleLayer: (layerId: string) => void;
}

export function ExplorePanel({
  mode,
  onModeChange,
  layers,
  focusedLayerId,
  onToggleLayer,
  ...tourProps
}: ExplorePanelProps) {
  const activate = (next: ExploreMode) => {
    if (next !== mode) onModeChange(next);
  };

  const onTabKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    let nextIndex: number | undefined;

    if (event.key === 'ArrowLeft') nextIndex = (index + MODES.length - 1) % MODES.length;
    else if (event.key === 'ArrowRight') nextIndex = (index + 1) % MODES.length;
    else if (event.key === 'Home') nextIndex = 0;
    else if (event.key === 'End') nextIndex = MODES.length - 1;

    if (nextIndex === undefined) return;

    event.preventDefault();
    activate(MODES[nextIndex]!.id);
    event.currentTarget
      .closest<HTMLElement>('[role="tablist"]')
      ?.querySelectorAll<HTMLButtonElement>('[role="tab"]')
      .item(nextIndex)
      ?.focus();
  };

  return (
    <ExploreView
      mode={mode}
      layers={layers}
      focusedLayerId={focusedLayerId}
      flowsBody={<TourPanel {...tourProps} />}
      handlers={{ onModeChange: activate, onTabKeyDown, onToggleLayer }}
    />
  );
}
