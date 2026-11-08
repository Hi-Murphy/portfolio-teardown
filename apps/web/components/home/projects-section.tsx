import { ProjectCard } from '../project-card';
import { PROJECTS, cardModel } from '../../content/projects';
import { SITE } from '../../content/site';
import { SectionFrame } from './section-frame';

export function ProjectsSection() {
  const projects: readonly (typeof PROJECTS)[number][] = PROJECTS;

  return (
    <SectionFrame id="projects" sectionId="projects" labelledBy="projects-title">
      <h2 id="projects-title" className="text-2xl leading-tight text-fg">
        {SITE.projects.title}
      </h2>
      {projects.length === 0 ? (
        <p className="mt-5 text-sm leading-relaxed text-muted">{SITE.projects.emptyNote}</p>
      ) : (
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {projects.map((project) => (
            <ProjectCard key={project.meta.slug} model={cardModel(project)} variant="compact" />
          ))}
          <div className="flex items-center rounded border border-dashed border-line/30 p-4 sm:p-5">
            <p className="text-base leading-relaxed text-muted">{SITE.projects.emptyNote}</p>
          </div>
        </div>
      )}
    </SectionFrame>
  );
}
