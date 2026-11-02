'use client';

import type { LayerModel } from './tour-model';

const LAYER_CHIP =
  'inline-flex h-11 min-w-0 items-center gap-2 rounded-full border px-3 text-left text-xs focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent';
const LAYER_CHIP_SELECTED = 'border-accent bg-accent text-bg';
const LAYER_CHIP_IDLE =
  'border-line/60 bg-bg text-fg hover:border-accent hover:text-accent active:border-accent active:bg-surface';

export interface LayersPanelProps {
  readonly layers: readonly LayerModel[];
  readonly focusedLayerId: string | null;
  readonly onToggleLayer: (layerId: string) => void;
}

export function LayersPanel({ layers, focusedLayerId, onToggleLayer }: LayersPanelProps) {
  const focused = layers.find((layer) => layer.id === focusedLayerId);

  return (
    <div data-site-layers-panel="" className="flex h-full min-w-0 flex-col gap-4">
      <div data-site-layer-chips="" className="flex flex-wrap content-start gap-2">
        {layers.map((layer, index) => {
          const selected = layer.id === focusedLayerId;

          return (
            <button
              key={layer.id}
              type="button"
              data-site-layer-chip={layer.id}
              aria-pressed={selected}
              className={`${LAYER_CHIP} ${selected ? LAYER_CHIP_SELECTED : LAYER_CHIP_IDLE}`}
              onClick={() => onToggleLayer(layer.id)}
            >
              <span className={`min-w-0 truncate ${selected ? 'text-bg' : 'text-fg'}`}>
                {`${index + 1} ${layer.name}`}
              </span>
              <span aria-hidden="true" className="opacity-55">
                ·
              </span>
              <span className={`shrink-0 font-mono ${selected ? 'text-bg/80' : 'text-muted'}`}>
                {`${layer.partCount} parts`}
              </span>
            </button>
          );
        })}
      </div>

      <div data-site-layer-now="" className="rounded border border-line/30 bg-bg/60 p-3">
        <p className="font-mono text-[0.625rem] uppercase tracking-[0.16em] text-muted">Now</p>
        <p
          data-site-layer-description=""
          aria-live="polite"
          className="mt-1 text-xs leading-snug text-muted"
        >
          {focused === undefined ? 'Pick a layer to isolate it.' : focused.description}
        </p>
        {focused === undefined ? null : (
          <ul
            data-site-layer-parts=""
            aria-label={`Parts in ${focused.name}`}
            className="mt-3 grid gap-x-4 gap-y-2 sm:grid-cols-2"
          >
            {focused.parts.map((part) => (
              <li key={part.id} className="min-w-0 text-xs leading-snug">
                <span className="font-medium text-fg">{part.name}</span>
                {part.summary === '' ? null : (
                  <span className="text-muted">{` — ${part.summary}`}</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
