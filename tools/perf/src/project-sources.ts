import { agentFleetSource } from '../../../apps/web/content/projects/agent-fleet.source.ts';
import { jevToolkitSource } from '../../../apps/web/content/projects/jev-toolkit.source.ts';
import { websocketInspectorSource } from '../../../apps/web/content/projects/websocket-inspector.source.ts';
import { siteSource } from '../../../apps/web/content/site.source.ts';

export const PROJECT_SOURCES = [
  websocketInspectorSource,
  jevToolkitSource,
  agentFleetSource,
] as const;

export type ProjectSource = (typeof PROJECT_SOURCES)[number];

// Mirrors apps/web HeroSection: the hero shows site.hero.project, else the first project.
export function heroProjectSource(): ProjectSource {
  return (
    PROJECT_SOURCES.find((source) => source.meta.slug === siteSource.hero.project) ??
    PROJECT_SOURCES[0]
  );
}

export function projectPath(source: ProjectSource): string {
  return `/projects/${source.meta.slug}`;
}

export function projectOutlinePath(source: ProjectSource): string {
  return `projects/${source.meta.slug}.html`;
}
