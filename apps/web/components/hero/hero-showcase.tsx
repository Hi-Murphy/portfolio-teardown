'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { Project } from 'xploder';

import type { HeroSequencePhase, HeroSequenceState } from './hero-loop';

export interface HeroShowcaseState {
  readonly phase: HeroSequencePhase;
  readonly flowLabel: string | null;
  readonly step: number;
  readonly total: number;
  readonly componentId: string | null;
  readonly componentName: string | null;
  readonly componentSummary: string | null;
  readonly paused: boolean;
  readonly available: boolean;
}

export const EMPTY_HERO_SHOWCASE: HeroShowcaseState = {
  phase: 'idle',
  flowLabel: null,
  step: -1,
  total: 0,
  componentId: null,
  componentName: null,
  componentSummary: null,
  paused: true,
  available: false,
};

interface HeroShowcaseContextValue extends HeroShowcaseState {
  publish(state: HeroShowcaseState): void;
  registerToggle(toggle: (() => void) | null): void;
  toggle(): void;
}

const NOOP = (): void => undefined;

const HeroShowcaseContext = createContext<HeroShowcaseContextValue>({
  ...EMPTY_HERO_SHOWCASE,
  publish: NOOP,
  registerToggle: NOOP,
  toggle: NOOP,
});

function sameShowcase(left: HeroShowcaseState, right: HeroShowcaseState): boolean {
  return (
    left.phase === right.phase &&
    left.flowLabel === right.flowLabel &&
    left.step === right.step &&
    left.total === right.total &&
    left.componentId === right.componentId &&
    left.componentName === right.componentName &&
    left.componentSummary === right.componentSummary &&
    left.paused === right.paused &&
    left.available === right.available
  );
}

export function showcaseForSequence(
  project: Project,
  sequence: HeroSequenceState,
): HeroShowcaseState {
  const flow = project.flows?.find((candidate) => candidate.id === sequence.tour.flowId);
  const componentId = flow?.path[sequence.tour.step];
  const component = project.layers
    .flatMap((layer) => layer.components)
    .find((candidate) => candidate.id === componentId);

  return {
    phase: sequence.phase,
    flowLabel: flow?.label ?? flow?.id ?? null,
    step: sequence.tour.step,
    total: sequence.tour.total,
    componentId: componentId ?? null,
    componentName: component?.name ?? null,
    componentSummary: component?.summary ?? null,
    paused: sequence.status !== 'running',
    available: sequence.started,
  };
}

export function heroNarration(state: HeroShowcaseState): string | null {
  if (
    (state.phase !== 'capture' && state.phase !== 'inspect') ||
    state.flowLabel === null ||
    state.componentName === null ||
    state.componentSummary === null ||
    state.step < 0 ||
    state.total < 1
  ) {
    return null;
  }

  return `${state.flowLabel} · ${state.step + 1}/${state.total} · ${state.componentName} — ${state.componentSummary}`;
}

export interface HeroShowcaseProviderProps {
  readonly children: ReactNode;
}

export function HeroShowcaseProvider({ children }: HeroShowcaseProviderProps) {
  const [state, setState] = useState<HeroShowcaseState>(EMPTY_HERO_SHOWCASE);
  const toggleRef = useRef<(() => void) | null>(null);
  const publish = useCallback((next: HeroShowcaseState) => {
    setState((current) => (sameShowcase(current, next) ? current : next));
  }, []);
  const registerToggle = useCallback((toggle: (() => void) | null) => {
    toggleRef.current = toggle;
  }, []);
  const toggle = useCallback(() => toggleRef.current?.(), []);
  const value = useMemo(
    () => ({ ...state, publish, registerToggle, toggle }),
    [publish, registerToggle, state, toggle],
  );

  return <HeroShowcaseContext value={value}>{children}</HeroShowcaseContext>;
}

export function useHeroShowcase(): HeroShowcaseContextValue {
  return useContext(HeroShowcaseContext);
}
