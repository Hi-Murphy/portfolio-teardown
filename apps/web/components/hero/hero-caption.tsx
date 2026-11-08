'use client';

import { HeroLoopButton, type HeroLoopLabels } from './hero-loop-button';
import { heroNarration, useHeroShowcase } from './hero-showcase';

export interface HeroCaptionProps {
  readonly name: string;
  readonly tagline: string | undefined;
  readonly labels: HeroLoopLabels;
}

export function HeroCaption({ name, tagline, labels }: HeroCaptionProps) {
  const showcase = useHeroShowcase();
  const narration = heroNarration(showcase);
  const staticCaption = tagline === undefined ? name : `${name} — ${tagline}`;

  return (
    <figcaption
      id="hero-caption"
      className="flex min-h-[3.25rem] items-start gap-3 text-base leading-relaxed text-muted"
    >
      <div className="grid min-h-[3.25rem] min-w-0 flex-1">
        <span
          className={`col-start-1 row-start-1 line-clamp-2${narration === null ? '' : ' sr-only'}`}
        >
          {staticCaption}
        </span>
        {narration === null ? null : (
          <span
            data-hero-narration=""
            aria-hidden="true"
            className="col-start-1 row-start-1 line-clamp-2"
          >
            {narration}
          </span>
        )}
      </div>
      <div data-hero-loop-slot="" className="h-11 w-11 shrink-0">
        {showcase.available ? (
          <HeroLoopButton paused={showcase.paused} labels={labels} onToggle={showcase.toggle} />
        ) : (
          <span aria-hidden="true" className="block h-11 w-11" />
        )}
      </div>
    </figcaption>
  );
}
