import type { TourPosition } from '../interaction/tour';
import type { ComponentKind } from '../schema/constants';

interface AnnounceComponent {
  readonly id: string;
  readonly name?: string;
  readonly summary?: string;
  readonly kind?: ComponentKind;
}

interface AnnounceFlow {
  readonly id: string;
  readonly label?: string;
  readonly description?: string;
}

export interface AnnounceProject {
  readonly meta: {
    readonly slug: string;
    readonly name?: string;
  };
  readonly layers: readonly {
    readonly components: readonly AnnounceComponent[];
  }[];
  readonly flows?: readonly AnnounceFlow[];
}

export type AnnounceEvent =
  | { readonly type: 'tourStep'; readonly flowId: string; readonly position: TourPosition }
  | { readonly type: 'tourJump'; readonly flowId: string; readonly position: TourPosition }
  | { readonly type: 'tourPausedOpen'; readonly componentId: string }
  | { readonly type: 'detailOpen'; readonly componentId: string }
  | { readonly type: 'detailClose'; readonly componentId: string }
  | { readonly type: 'caseStudyOpen' }
  | { readonly type: 'caseStudyClose' };

export const ANNOUNCE = { detailOpen: true } as const;

function componentFor(
  project: AnnounceProject,
  componentId: string,
): AnnounceComponent | undefined {
  return project.layers
    .flatMap((layer) => layer.components)
    .find((component) => component.id === componentId);
}

function componentName(project: AnnounceProject, componentId: string): string {
  const component = componentFor(project, componentId);

  return component?.name ?? component?.id ?? componentId;
}

function detailOpenMessage(project: AnnounceProject, componentId: string): string {
  const component = componentFor(project, componentId);
  const name = component?.name ?? component?.id ?? componentId;
  const kind = component?.kind ?? 'module';
  const message = `${name}, ${kind}.`;

  return component?.summary === undefined ? message : `${message} ${component.summary}`;
}

function tourStepMessage(project: AnnounceProject, flowId: string, position: TourPosition): string {
  const flow = project.flows?.find((candidate) => candidate.id === flowId);

  if (flow === undefined) return '';

  const component =
    position.componentId === null ? undefined : componentFor(project, position.componentId);
  const heading = `${flow.label ?? flow.id} · Step ${position.step + 1} of ${position.total}`;
  const componentLabel = component?.name ?? component?.id ?? position.componentId ?? '';
  const summary = component?.summary ?? null;
  const description = position.step === 0 ? (flow.description ?? null) : null;

  return [heading, componentLabel, summary, description]
    .filter((part): part is string => part !== null)
    .join('. ');
}

export function announce(event: AnnounceEvent, project: AnnounceProject): string {
  switch (event.type) {
    case 'tourStep':
      return tourStepMessage(project, event.flowId, event.position);
    case 'tourJump':
      return `Jumped to ${tourStepMessage(project, event.flowId, event.position)}`;
    case 'tourPausedOpen':
      return `Tour paused. ${detailOpenMessage(project, event.componentId)}`;
    case 'detailOpen':
      return ANNOUNCE.detailOpen ? detailOpenMessage(project, event.componentId) : '';
    case 'detailClose':
      return `${componentName(project, event.componentId)} details closed.`;
    case 'caseStudyOpen':
      return `Case study: ${project.meta.name ?? project.meta.slug}.`;
    case 'caseStudyClose':
      return 'Case study closed.';
  }
}
