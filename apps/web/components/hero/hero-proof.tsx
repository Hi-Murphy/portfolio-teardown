'use client';

import type { Project } from 'xploder';

import { heroProofEntries, type HeroProofReference } from '../../content/projects';
import { useHeroShowcase } from './hero-showcase';

const ITEM_CLASS = 'rounded border p-3';
const ITEM_ACTIVE_CLASS = 'border-accent';
const ITEM_IDLE_CLASS = 'border-line/30';
const VALUE_CLASS = 'mt-1 block text-base leading-relaxed';
const VALUE_ACTIVE_CLASS = 'text-fg';
const VALUE_IDLE_CLASS = 'text-muted';

export interface HeroProofProps {
  readonly project: Project;
  readonly proof: readonly HeroProofReference[];
}

export function HeroProof({ project, proof }: HeroProofProps) {
  const showcase = useHeroShowcase();
  const entries = heroProofEntries(project, proof);
  const touring = showcase.phase === 'capture' || showcase.phase === 'inspect';

  if (entries.length === 0) return null;

  return (
    <ul data-hero-proof="" className="col-span-full grid grid-cols-1 gap-3 sm:grid-cols-3">
      {entries.map((entry) => {
        const active = touring && entry.layerId !== null && showcase.layerId === entry.layerId;

        return (
          <li
            key={`${entry.metric}-${entry.layerId ?? 'none'}`}
            data-hero-proof-item=""
            data-hero-proof-layer={entry.layerId ?? 'none'}
            className={`${ITEM_CLASS} ${active ? ITEM_ACTIVE_CLASS : ITEM_IDLE_CLASS}`}
          >
            <span data-hero-proof-label="" className="block font-mono text-xs text-muted">
              {entry.label}
            </span>
            <span
              data-hero-proof-value=""
              className={`${VALUE_CLASS} ${active ? VALUE_ACTIVE_CLASS : VALUE_IDLE_CLASS}`}
            >
              {entry.value}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
