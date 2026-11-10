import type { Project } from 'xploder';

import { heroProofEntries } from '../../content/projects';

export interface HeroProofProps {
  readonly project: Project;
  readonly proof: readonly number[];
}

export function HeroProof({ project, proof }: HeroProofProps) {
  const entries = heroProofEntries(project, proof);

  if (entries.length === 0) return null;

  return (
    <ul
      data-hero-proof=""
      className="col-span-full grid grid-cols-1 gap-4 border-t border-line/30 sm:grid-cols-3 sm:gap-0 sm:divide-x sm:divide-line/30"
    >
      {entries.map((entry, index) => (
        <li
          key={`${entry.metric}-${index}`}
          data-hero-proof-item=""
          className="py-3 sm:px-4 sm:first:pl-0 sm:last:pr-0"
        >
          <span data-hero-proof-label="" className="block font-mono text-xs text-muted">
            {entry.label}
          </span>
          <span data-hero-proof-value="" className="mt-1 block text-base leading-relaxed text-fg">
            {entry.value}
          </span>
        </li>
      ))}
    </ul>
  );
}
