import { agentFleetSource } from '../../../apps/web/content/projects/agent-fleet.source.ts';
import { jevToolkitSource } from '../../../apps/web/content/projects/jev-toolkit.source.ts';
import { websocketInspectorSource } from '../../../apps/web/content/projects/websocket-inspector.source.ts';

export const PROJECT_SOURCES = [
  websocketInspectorSource,
  jevToolkitSource,
  agentFleetSource,
] as const;

export type ProjectSource = (typeof PROJECT_SOURCES)[number];

export function projectPath(source: ProjectSource): string {
  return `/projects/${source.meta.slug}`;
}

export function projectOutlinePath(source: ProjectSource): string {
  return `projects/${source.meta.slug}.html`;
}
