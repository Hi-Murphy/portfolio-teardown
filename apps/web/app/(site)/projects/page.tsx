import type { Metadata } from 'next';

import { ProjectCard } from '../../../components/project-card';
import { PROJECTS, cardModel } from '../../../content/projects';
import { SITE } from '../../../content/site';

export const metadata: Metadata = {
  title: SITE.projects.title,
  description: SITE.meta.description,
};

export default function ProjectsPage() {
  const projects: readonly (typeof PROJECTS)[number][] = PROJECTS;

  return (
    <div className="mx-auto w-full max-w-4xl px-5 py-10 sm:px-8 sm:py-14">
      <h1 className="text-[clamp(2.25rem,6vw,4rem)] font-semibold leading-none tracking-tight text-fg">
        {SITE.projects.title}
      </h1>
      {projects.length === 0 ? (
        <p className="mt-6 text-sm leading-relaxed text-muted">{SITE.projects.emptyNote}</p>
      ) : (
        <div className="mt-8 flex flex-col gap-5">
          {projects.map((project) => (
            <ProjectCard
              key={project.meta.slug}
              model={cardModel(project)}
              project={project}
              variant="list"
            />
          ))}
        </div>
      )}
    </div>
  );
}
