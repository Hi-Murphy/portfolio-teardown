import Link from 'next/link';

import { HeroCaption } from '../hero/hero-caption';
import { POSTER_FADE_CLASS } from '../hero/hero-classes';
import { HeroLive } from '../hero/hero-live';
import { HeroProof } from '../hero/hero-proof';
import { HeroShowcaseProvider } from '../hero/hero-showcase';
import { TeardownPoster } from '../teardown-poster';
import { PROJECTS } from '../../content/projects';
import { SITE } from '../../content/site';

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
      className="grid gap-8 py-10 sm:py-14 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:items-center lg:gap-12"
    >
      <div className="flex flex-col items-start gap-5">
        <p className="text-base font-semibold text-fg">{SITE.identity.name}</p>
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-muted">
          {SITE.hero.eyebrow}
        </p>
        <h1
          id="hero-title"
          className="max-w-[13ch] text-[clamp(2.25rem,7vw,4.25rem)] font-semibold leading-[0.98] tracking-tight text-fg"
        >
          {SITE.hero.headline}
        </h1>
        <p className="max-w-[58ch] text-base leading-relaxed text-muted sm:text-lg">
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
          <figure aria-labelledby="hero-caption" className="flex min-w-0 flex-col gap-3">
            <div className="relative aspect-[4/3] overflow-hidden rounded border border-line/30 bg-surface [&_[data-xploder-caption]]:hidden sm:aspect-[16/9]">
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
          <HeroProof project={heroProject} proof={SITE.hero.proof} />
        </HeroShowcaseProvider>
      )}
    </section>
  );
}
