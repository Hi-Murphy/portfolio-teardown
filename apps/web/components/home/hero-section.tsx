import Link from 'next/link';

import { HeroCaption } from '../hero/hero-caption';
import { POSTER_FADE_CLASS } from '../hero/hero-classes';
import { HeroLive } from '../hero/hero-live';
import { HeroShowcaseProvider } from '../hero/hero-showcase';
import { TeardownPoster } from '../teardown-poster';
import { PROJECTS } from '../../content/projects';
import { SITE } from '../../content/site';
import { BlueprintSheet } from './blueprint-sheet';

const PRIMARY_CTA_CLASS =
  'inline-flex min-h-11 items-center gap-2 text-base font-semibold text-accent underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent';

export function HeroSection() {
  const projects: readonly (typeof PROJECTS)[number][] = PROJECTS;
  const heroProject = projects[0];

  return (
    <section
      data-site-hero=""
      data-home-section="hero"
      aria-labelledby="hero-title"
      className="relative flex min-h-[calc(100svh-2.8125rem)] flex-col overflow-hidden"
    >
      <BlueprintSheet />
      <div className="relative z-10 mx-auto flex w-full max-w-[86rem] flex-1 flex-col px-5 pb-14 pt-5 sm:px-8 sm:pb-16 sm:pt-8 lg:grid lg:grid-cols-[minmax(0,0.82fr)_minmax(0,1.18fr)] lg:items-center lg:gap-10 lg:py-12">
        <div className="flex flex-col items-start gap-4 sm:gap-5">
          <p className="text-base font-semibold text-fg">{SITE.identity.name}</p>
          <p className="flex items-center gap-2.5 font-mono text-xs uppercase tracking-[0.18em] text-muted">
            <span aria-hidden="true" className="h-px w-[22px] shrink-0 bg-accent" />
            {SITE.hero.eyebrow}
          </p>
          <h1
            id="hero-title"
            className="max-w-[13ch] text-[clamp(2.625rem,6vw,5rem)] font-semibold leading-[0.96] tracking-[-0.025em] text-fg"
          >
            {SITE.hero.headline}
          </h1>
          <p className="max-w-[34ch] text-base leading-relaxed text-muted sm:text-lg">
            {SITE.hero.subline}
          </p>
          <div>
            <Link
              href={SITE.hero.primaryCta.href}
              className={PRIMARY_CTA_CLASS}
              data-hero-primary-cta=""
            >
              {SITE.hero.primaryCta.label}
              <svg
                aria-hidden="true"
                focusable="false"
                viewBox="0 0 16 16"
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <path d="M3 8h10M9 4l4 4-4 4" />
              </svg>
            </Link>
          </div>
        </div>

        {heroProject === undefined ? null : (
          <HeroShowcaseProvider>
            <figure
              aria-labelledby="hero-caption"
              className="mt-5 flex min-w-0 flex-col sm:mt-7 lg:mt-0"
            >
              <div className="relative mx-auto h-[15rem] w-full max-w-[23rem] sm:h-[20rem] sm:max-w-[28rem] lg:h-[28rem] lg:max-w-none [&_[data-xploder-caption]]:hidden">
                <HeroLive project={heroProject} />
                <TeardownPoster
                  project={heroProject}
                  state="exploded"
                  className={POSTER_FADE_CLASS}
                />
              </div>
              <HeroCaption
                name={heroProject.meta.name}
                tagline={heroProject.meta.tagline}
                labels={{ pause: SITE.hero.loopPause, play: SITE.hero.loopPlay }}
              />
            </figure>
          </HeroShowcaseProvider>
        )}
      </div>
      <span
        aria-hidden="true"
        className="absolute bottom-3 left-1/2 h-7 w-px -translate-x-1/2 bg-gradient-to-b from-line-muted to-transparent sm:bottom-4"
      />
    </section>
  );
}
