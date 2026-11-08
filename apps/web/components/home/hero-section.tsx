import Link from 'next/link';

import { POSTER_FADE_CLASS } from '../hero/hero-classes';
import { HeroLive } from '../hero/hero-live';
import { TeardownPoster } from '../teardown-poster';
import { PROJECTS } from '../../content/projects';
import { SITE } from '../../content/site';

const PRIMARY_CTA_CLASS =
  'inline-flex min-h-11 items-center justify-center rounded-sm bg-accent px-5 text-sm font-semibold text-bg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent';
const SECONDARY_CTA_CLASS =
  'inline-flex min-h-11 items-center justify-center rounded-sm border border-line px-5 text-sm font-medium text-fg hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent';

export function HeroSection() {
  const projects: readonly (typeof PROJECTS)[number][] = PROJECTS;
  const heroProject = projects[0];

  return (
    <section
      data-site-hero=""
      data-home-section="hero"
      aria-labelledby="hero-title"
      className="grid gap-8 py-10 sm:py-14 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-center lg:gap-12"
    >
      <div className="flex flex-col items-start gap-5">
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-muted">
          {SITE.hero.eyebrow}
        </p>
        <h1
          id="hero-title"
          className="max-w-[13ch] text-[clamp(2.5rem,8vw,5.5rem)] font-semibold leading-[0.98] tracking-tight text-fg"
        >
          {SITE.hero.headline}
        </h1>
        <p className="max-w-[58ch] text-base leading-relaxed text-muted sm:text-lg">
          {SITE.hero.subline}
        </p>
        <div className="flex flex-wrap gap-3">
          <Link href={SITE.hero.primaryCta.href} className={PRIMARY_CTA_CLASS}>
            {SITE.hero.primaryCta.label}
          </Link>
          <Link href={SITE.hero.secondaryCta.href} className={SECONDARY_CTA_CLASS}>
            {SITE.hero.secondaryCta.label}
          </Link>
        </div>
      </div>

      {heroProject === undefined ? null : (
        <figure aria-labelledby="hero-caption" className="flex min-w-0 flex-col gap-3">
          <div className="relative aspect-[4/3] overflow-hidden rounded border border-line/30 bg-surface sm:aspect-[16/9]">
            <HeroLive project={heroProject} />
            <TeardownPoster project={heroProject} state="exploded" className={POSTER_FADE_CLASS} />
          </div>
          <figcaption id="hero-caption" className="text-sm leading-relaxed text-muted">
            {heroProject.meta.name}
            {heroProject.meta.tagline === undefined ? null : ` — ${heroProject.meta.tagline}`}
          </figcaption>
        </figure>
      )}
    </section>
  );
}
