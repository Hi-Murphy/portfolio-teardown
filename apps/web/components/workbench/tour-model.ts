export type TourModelStatus = 'idle' | 'playing' | 'paused' | 'ended';

export interface TourModelProject {
  readonly flows?: readonly {
    readonly id: string;
    readonly label?: string;
    readonly description?: string;
    readonly path: readonly string[];
  }[];
  readonly layers: readonly {
    readonly components: readonly {
      readonly id: string;
      readonly name?: string;
      readonly summary?: string;
    }[];
  }[];
}

export interface TourStep {
  readonly index: number;
  readonly id: string;
  readonly name: string;
  readonly summary: string;
}

export interface TourFlow {
  readonly id: string;
  readonly label: string;
  readonly description: string;
  readonly steps: readonly TourStep[];
}

export type TourJumpAction = 'stop' | 'step' | 'play';

export function buildTourFlows(project: TourModelProject): readonly TourFlow[] {
  const components = new Map(
    project.layers.flatMap((layer) =>
      layer.components.map((component) => [component.id, component] as const),
    ),
  );

  return (project.flows ?? []).map((flow) => ({
    id: flow.id,
    label: flow.label ?? flow.id,
    description: flow.description ?? '',
    steps: flow.path.map((id, index) => {
      const component = components.get(id);

      return {
        index,
        id,
        name: component?.name ?? id,
        summary: component?.summary ?? '',
      };
    }),
  }));
}

export function findTourFlow(
  flows: readonly TourFlow[],
  flowId: string | null,
): TourFlow | undefined {
  return flowId === null ? undefined : flows.find((flow) => flow.id === flowId);
}

export function tourStepAt(flow: TourFlow | undefined, stepIndex: number): TourStep | undefined {
  return flow?.steps[stepIndex];
}

export function jumpSequence(stepIndex: number, resume: boolean): readonly TourJumpAction[] {
  const steps = Array.from({ length: stepIndex + 1 }, () => 'step' as const);

  return ['stop', ...steps, ...(resume ? (['play'] as const) : [])];
}
