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
  const narrating =
    (showcase.phase === 'capture' || showcase.phase === 'inspect') &&
    showcase.flowLabel !== null &&
    showcase.componentName !== null &&
    showcase.componentSummary !== null &&
    showcase.step >= 0 &&
    showcase.total >= 1;
  const flowLabel = narrating ? showcase.flowLabel : null;
  const componentName = narrating ? showcase.componentName : tagline;
  const componentSummary = narrating ? showcase.componentSummary : null;
  const position = narrating ? `${showcase.step + 1}/${showcase.total}` : null;

  return (
    <>
      <div
        data-hero-annotation=""
        className="relative mt-3 flex h-[6.5rem] items-end gap-3 lg:ml-auto lg:mt-5 lg:w-full lg:max-w-[30rem]"
      >
        <div
          aria-hidden="true"
          {...(narrating ? { 'data-hero-narration': '' } : {})}
          className="flex h-full min-w-0 flex-1 flex-col gap-1 border-l-2 border-accent pl-3"
        >
          <div className="flex min-w-0 items-center gap-1.5 font-mono text-[0.6875rem] uppercase tracking-[0.14em] text-muted">
            <span className="truncate">{name}</span>
            {flowLabel === null ? null : (
              <>
                <span aria-hidden="true">·</span>
                <span className="truncate">{flowLabel}</span>
              </>
            )}
            {position === null ? null : <span className="ml-auto shrink-0">{position}</span>}
          </div>
          {componentName === undefined ? null : (
            <p
              className={`${narrating ? 'truncate' : 'line-clamp-2'} text-base font-semibold leading-snug text-fg`}
            >
              {componentName}
            </p>
          )}
          {componentSummary === null ? null : (
            <p className="line-clamp-2 min-h-[2.75rem] text-base leading-snug text-muted">
              {componentSummary}
            </p>
          )}
        </div>
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
