import type { TechCategory } from 'xploder';

import type { ProjectCardModel } from '../content/projects';

const TECH_DOT_CLASSES = {
  language: 'bg-tech-language',
  platform: 'bg-tech-platform',
  framework: 'bg-tech-framework',
  library: 'bg-tech-library',
  storage: 'bg-tech-storage',
  network: 'bg-tech-network',
  tooling: 'bg-tech-tooling',
  ai: 'bg-tech-ai',
} satisfies Record<TechCategory, string>;

export interface TechChipListProps {
  readonly chips: ProjectCardModel['chips'];
  readonly className?: string;
}

export function TechChipList({ chips, className }: TechChipListProps) {
  return (
    <ul aria-label="Tech" className={['flex flex-wrap gap-2', className].filter(Boolean).join(' ')}>
      {chips.map((chip) => (
        <li
          key={chip.id}
          className="inline-flex items-center gap-1.5 rounded-full border border-line-muted/40 bg-bg px-2.5 py-1 font-mono text-xs text-fg"
        >
          <span
            aria-hidden="true"
            className={`h-2 w-2 rounded-full ${TECH_DOT_CLASSES[chip.category]}`}
          />
          <span>{chip.label}</span>
          <span className="sr-only">{`, ${chip.category}`}</span>
        </li>
      ))}
    </ul>
  );
}
