import Link from 'next/link';

import { ProjectCard } from '../components/project-card';
import { SiteFooter } from '../components/site-footer';
import { SiteNav } from '../components/site-nav';
import { SkipLink } from '../components/skip-link';
import { PROJECTS, cardModel } from '../content/projects';
import { SITE } from '../content/site';

const RECOVERY_LINK_CLASS =
  'inline-flex min-h-11 items-center justify-center rounded-sm border border-line px-5 text-sm font-medium text-fg hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent';

export default function NotFound() {
  const projects: readonly (typeof PROJECTS)[number][] = PROJECTS;

  return (
    <div className="flex min-h-dvh flex-col">
      <SkipLink />
      <SiteNav />
      <main id="main" tabIndex={-1} className="flex-1">
        <div className="mx-auto w-full max-w-4xl px-5 py-10 sm:px-8 sm:py-14">
          <h1 className="text-[clamp(2.25rem,6vw,4rem)] font-semibold leading-none tracking-tight text-fg">
            Page not found
          </h1>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/" className={RECOVERY_LINK_CLASS}>
              Home
            </Link>
            <Link href="/projects" className={RECOVERY_LINK_CLASS}>
              {SITE.projects.title}
            </Link>
          </div>
          {projects.length === 0 ? null : (
            <div className="mt-8 grid gap-4 md:grid-cols-2">
              {projects.map((project) => (
                <ProjectCard
                  key={project.meta.slug}
                  model={cardModel(project)}
                  variant="compact"
                  headingLevel={2}
                />
              ))}
            </div>
          )}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
