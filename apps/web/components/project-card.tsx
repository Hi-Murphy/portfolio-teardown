import Link from 'next/link';
import type { Project } from 'xploder';

import type { ProjectCardModel } from '../content/projects';
import { TechChipList } from './tech-chip-list';
import { TeardownPoster } from './teardown-poster';

interface ProjectCardBaseProps {
  readonly model: ProjectCardModel;
  readonly className?: string;
  /** Heading level of the card title; 2 when the card sits directly under the page h1. */
  readonly headingLevel?: 2 | 3;
}

export interface CompactProjectCardProps extends ProjectCardBaseProps {
  readonly variant: 'compact';
}

export interface ListProjectCardProps extends ProjectCardBaseProps {
  readonly variant: 'list';
  readonly project: Project;
}

export type ProjectCardProps = CompactProjectCardProps | ListProjectCardProps;

const STRETCHED_LINK =
  'font-semibold text-fg underline decoration-line underline-offset-4 after:absolute after:inset-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent';

function projectMetaLine(project: Project): string | undefined {
  const parts = [project.meta.year?.toString(), project.meta.role].filter(
    (part): part is string => part !== undefined,
  );

  return parts.length > 0 ? parts.join(' · ') : undefined;
}

export function ProjectCard(props: ProjectCardProps) {
  const { model, variant, className, headingLevel = variant === 'list' ? 2 : 3 } = props;
  const Heading = headingLevel === 2 ? 'h2' : 'h3';
  const cardClassName = [
    'group relative rounded border border-line/30 bg-surface p-4 sm:p-5',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  if (variant === 'compact') {
    return (
      <article data-site-card={model.slug} className={cardClassName}>
        <div className="flex flex-col gap-3">
          <Heading className="text-lg leading-tight">
            <Link href={`/projects/${model.slug}`} className={STRETCHED_LINK}>
              {model.name}
            </Link>
          </Heading>
          {model.tagline === undefined ? null : (
            <p className="text-sm leading-relaxed text-muted">{model.tagline}</p>
          )}
          <TechChipList chips={model.chips} />
        </div>
      </article>
    );
  }

  const { project } = props;
  const metaLine = projectMetaLine(project);
  const sourceLink = project.meta.links.find((link) => link.label.toLowerCase() === 'source');

  return (
    <article
      data-site-card={model.slug}
      className={`${cardClassName} grid gap-4 sm:grid-cols-[10rem_minmax(0,1fr)] sm:items-start`}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none aspect-[4/3] w-full rounded border border-line/20 bg-bg p-2"
      >
        <TeardownPoster project={project} className="h-full w-full" />
      </div>
      <div className="flex min-w-0 flex-col gap-3">
        <div className="flex flex-col gap-2">
          <Heading className="text-lg leading-tight">
            <Link href={`/projects/${model.slug}`} className={STRETCHED_LINK}>
              {model.name}
            </Link>
          </Heading>
          {metaLine === undefined ? null : (
            <p className="font-mono text-xs text-muted">{metaLine}</p>
          )}
          {model.tagline === undefined ? null : (
            <p className="text-sm leading-relaxed text-fg">{model.tagline}</p>
          )}
          {project.meta.summary === undefined ? null : (
            <p className="text-sm leading-relaxed text-muted">{project.meta.summary}</p>
          )}
        </div>
        <TechChipList chips={model.chips} />
        {sourceLink === undefined ? null : (
          <a
            href={sourceLink.url}
            className="relative z-10 inline-flex min-h-11 w-fit items-center text-sm font-medium text-fg underline decoration-line underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            {sourceLink.label}
          </a>
        )}
      </div>
    </article>
  );
}
