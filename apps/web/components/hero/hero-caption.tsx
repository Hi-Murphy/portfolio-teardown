'use client';

import { HeroLoopButton, type HeroLoopLabels } from './hero-loop-button';
import { useHeroShowcase } from './hero-showcase';

export interface HeroCaptionProps {
  readonly name: string;
  readonly tagline: string | undefined;
  readonly labels: HeroLoopLabels;
}

export function HeroCaption({ name, tagline, labels }: HeroCaptionProps) {
  const showcase = useHeroShowcase();
  const staticCaption = tagline === undefined ? name : `${name} — ${tagline}`;

  return (
    <>
      <div
        data-hero-annotation=""
        className="relative mt-3 flex h-[6.5rem] items-end gap-3 lg:ml-auto lg:mt-5 lg:w-full lg:max-w-[30rem]"
      >
        <p
          data-hero-project-line=""
          className="min-w-0 flex-1 border-l-2 border-accent pl-3 text-base leading-snug text-fg"
        >
          {staticCaption}
        </p>
        <div data-hero-loop-slot="" className="h-11 w-11 shrink-0">
          {showcase.available ? (
            <HeroLoopButton paused={showcase.paused} labels={labels} onToggle={showcase.toggle} />
          ) : (
            <span aria-hidden="true" className="block h-11 w-11" />
          )}
        </div>
      </div>
      <figcaption id="hero-caption" className="sr-only">
        {staticCaption}
      </figcaption>
    </>
  );
}
