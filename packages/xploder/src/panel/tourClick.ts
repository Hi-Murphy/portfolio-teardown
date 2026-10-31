import type { TourStatus } from '../interaction/tour';

export type TourCommand =
  | { readonly type: 'jump'; readonly step: number; readonly resume: boolean }
  | { readonly type: 'pause' };

export type PanelClickEvent =
  { readonly type: 'slab'; readonly hit: string | null } | { readonly type: 'closeControl' };

export interface SlabClickInput {
  readonly hit: string | null;
  readonly tour: {
    readonly status: TourStatus;
    readonly flowId: string | null;
    readonly step: number;
  };
  readonly flows: readonly { readonly id: string; readonly path: readonly string[] }[];
}

export interface SlabClickDecision {
  readonly panelEvent: PanelClickEvent | null;
  readonly tour: TourCommand | null;
}

export function stepForComponent(
  path: readonly string[],
  id: string,
  current: number,
): number | null {
  const next = path.findIndex((componentId, index) => index > current && componentId === id);

  if (next !== -1) return next;

  const first = path.indexOf(id);
  return first === -1 ? null : first;
}

export function resolveSlabClick(input: SlabClickInput): SlabClickDecision {
  const { hit, tour, flows } = input;

  if (tour.status !== 'idle' && hit !== null) {
    const flow = flows.find((candidate) => candidate.id === tour.flowId);
    const target = flow === undefined ? null : stepForComponent(flow.path, hit, tour.step);

    if (target !== null) {
      return {
        panelEvent: { type: 'closeControl' },
        tour: { type: 'jump', step: target, resume: tour.status === 'playing' },
      };
    }

    return {
      panelEvent: { type: 'slab', hit },
      tour: tour.status === 'playing' ? { type: 'pause' } : null,
    };
  }

  return { panelEvent: { type: 'slab', hit }, tour: null };
}

export function jumpSequence(step: number, resume: boolean): readonly ('stop' | 'step' | 'play')[] {
  const steps = Array.from({ length: step + 1 }, () => 'step' as const);
  return ['stop', ...steps, ...(resume ? (['play'] as const) : [])];
}
