'use client';

import { useRef, useState, type KeyboardEvent } from 'react';

import { LayersPanel } from './layers-panel';
import { TourPanel, type TourPanelProps } from './tour-panel';
import type { LayerModel } from './tour-model';

export type ExploreMode = 'layers' | 'flows';

const MODES = [
  { id: 'layers', label: 'Layers' },
  { id: 'flows', label: 'Flows' },
] as const satisfies readonly { readonly id: ExploreMode; readonly label: string }[];

const TAB =
  'inline-flex h-11 min-w-0 items-center justify-center gap-2 rounded-full px-4 text-xs font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent';
const TAB_SELECTED = 'bg-accent text-bg';
const TAB_IDLE = 'text-muted hover:bg-surface hover:text-fg active:bg-surface active:text-fg';

function LayersIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className="h-4 w-4 shrink-0"
    >
      <path d="m12 4 8 4-8 4-8-4 8-4Z" />
      <path d="m4 12 8 4 8-4M4 16l8 4 8-4" />
    </svg>
  );
}

function FlowsIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className="h-4 w-4 shrink-0"
    >
      <circle cx="6" cy="6" r="2" />
      <circle cx="18" cy="18" r="2" />
      <path d="M8 6h4a4 4 0 0 1 4 4v4" />
      <path d="m13 11 3 3 3-3" />
    </svg>
  );
}

export interface ExplorePanelProps extends TourPanelProps {
  readonly layers: readonly LayerModel[];
  readonly focusedLayerId: string | null;
  readonly onToggleLayer: (layerId: string) => void;
  readonly onEnterLayers: () => void;
  readonly onEnterFlows: () => void;
}

export function ExplorePanel({
  layers,
  focusedLayerId,
  onToggleLayer,
  onEnterLayers,
  onEnterFlows,
  ...tourProps
}: ExplorePanelProps) {
  const [mode, setMode] = useState<ExploreMode>('layers');
  const tabsRef = useRef<(HTMLButtonElement | null)[]>([]);

  const activate = (next: ExploreMode) => {
    if (next === mode) return;

    if (next === 'flows') onEnterFlows();
    else onEnterLayers();

    setMode(next);
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
    tabsRef.current[nextIndex]?.focus();
  };

  return (
    <div data-site-explore="" className="flex h-full min-w-0 flex-col gap-4 p-4 sm:p-5">
      <div
        role="tablist"
        aria-label="Explore mode"
        data-site-explore-tablist=""
        className="mx-auto flex w-fit max-w-full shrink-0 items-center gap-1 rounded-full border border-line bg-bg p-1"
      >
        {MODES.map((candidate, index) => {
          const selected = mode === candidate.id;

          return (
            <button
              key={candidate.id}
              ref={(node) => {
                tabsRef.current[index] = node;
              }}
              type="button"
              role="tab"
              id={`explore-tab-${candidate.id}`}
              data-site-explore-tab={candidate.id}
              aria-selected={selected}
              aria-controls={`explore-panel-${candidate.id}`}
              tabIndex={selected ? 0 : -1}
              className={`${TAB} ${selected ? TAB_SELECTED : TAB_IDLE}`}
              onClick={() => activate(candidate.id)}
              onKeyDown={(event) => onTabKeyDown(event, index)}
            >
              {candidate.id === 'layers' ? <LayersIcon /> : <FlowsIcon />}
              <span>{candidate.label}</span>
            </button>
          );
        })}
      </div>

      <div className="relative min-h-0 flex-1">
        <div
          role="tabpanel"
          id="explore-panel-layers"
          aria-labelledby="explore-tab-layers"
          data-site-explore-panel="layers"
          hidden={mode !== 'layers'}
          className="h-full"
        >
          <LayersPanel
            layers={layers}
            focusedLayerId={focusedLayerId}
            onToggleLayer={onToggleLayer}
          />
        </div>
        <div
          role="tabpanel"
          id="explore-panel-flows"
          aria-labelledby="explore-tab-flows"
          data-site-explore-panel="flows"
          hidden={mode !== 'flows'}
          className="h-full"
        >
          <TourPanel {...tourProps} />
        </div>
      </div>
    </div>
  );
}
