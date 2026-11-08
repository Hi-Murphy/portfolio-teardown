import type { ReactNode } from 'react';

import type { PageSectionId } from '../../content/home-sections';

export interface SectionFrameProps {
  readonly sectionId: PageSectionId;
  readonly labelledBy: string;
  readonly id?: string;
  readonly className?: string;
  readonly children: ReactNode;
}

export function SectionFrame({
  sectionId,
  labelledBy,
  id,
  className,
  children,
}: SectionFrameProps) {
  const classes = ['border-t border-line/30 py-10 sm:py-14', className].filter(Boolean).join(' ');

  return (
    <section id={id} data-home-section={sectionId} aria-labelledby={labelledBy} className={classes}>
      {children}
    </section>
  );
}
