import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { JsonLd } from '../../../../components/json-ld';
import { Workbench } from '../../../../components/workbench/workbench';
import { PROJECT_SLUGS, getProject } from '../../../../content/projects';
import { projectLd } from '../../../../seo/json-ld';
import { routeMetadata } from '../../../../seo/metadata';
import { routeForSlug } from '../../../../seo/routes';

interface ProjectPageProps {
  readonly params: Promise<{ readonly slug: string }>;
}

export const dynamicParams = false;

export function generateStaticParams() {
  return PROJECT_SLUGS.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: ProjectPageProps): Promise<Metadata> {
  const { slug } = await params;
  const route = routeForSlug(slug);

  if (route === undefined) return {};

  return routeMetadata(route);
}

function projectMetaLine(project: NonNullable<ReturnType<typeof getProject>>): string | undefined {
  const parts = [project.meta.year?.toString(), project.meta.role].filter(
    (part): part is string => part !== undefined,
  );

  return parts.length > 0 ? parts.join(' · ') : undefined;
}

export default async function ProjectPage({ params }: ProjectPageProps) {
  const { slug } = await params;
  const project = getProject(slug);

  if (project === undefined) notFound();

  const metaLine = projectMetaLine(project);

  return (
    <div className="mx-auto w-full max-w-6xl px-5 py-10 sm:px-8 sm:py-14">
      <JsonLd data={projectLd(project)} />
      <header className="mb-8 flex flex-col gap-4">
        <Link
          href="/projects"
          className="inline-flex min-h-11 w-fit items-center text-sm font-medium text-muted underline decoration-line underline-offset-4 hover:text-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          ← All projects
        </Link>
        <div className="flex flex-col gap-3">
          <h1 className="text-[clamp(2.25rem,6vw,4rem)] font-semibold leading-none tracking-tight text-fg">
            {project.meta.name}
          </h1>
          {project.meta.tagline === undefined ? null : (
            <p className="max-w-[62ch] text-lg leading-relaxed text-muted">
              {project.meta.tagline}
            </p>
          )}
          {metaLine === undefined ? null : (
            <p className="font-mono text-xs text-muted">{metaLine}</p>
          )}
          {project.meta.links.length === 0 ? null : (
            <ul aria-label="Project links" className="flex flex-wrap gap-x-4 gap-y-2">
              {project.meta.links.map((link) => (
                <li key={`${link.label}-${link.url}`}>
                  <a
                    href={link.url}
                    className="inline-flex min-h-11 items-center text-sm font-medium text-fg underline decoration-line underline-offset-4 hover:decoration-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
      </header>
      <Workbench project={project} />
    </div>
  );
}
