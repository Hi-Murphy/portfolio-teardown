import { startTransition } from 'react';

import { loadStaged, STAGES_3D, yieldToMain } from '../boot-3d';

export type HeroStageComponent = (typeof import('./hero-stage'))['HeroStage'];

// Mounts the hero stage in a transition once the staged 3D modules are evaluated. Living in this
// dynamic chunk keeps the staging and transition code out of the home route's initial JS.
export async function bootHeroStage(
  signal: AbortSignal,
  mount: (stage: () => HeroStageComponent) => void,
): Promise<void> {
  const staged = await loadStaged(STAGES_3D, signal);
  if (!staged || signal.aborted) return;

  const { HeroStage } = await import('./hero-stage');
  if (signal.aborted) return;

  await yieldToMain();
  if (signal.aborted) return;

  startTransition(() => mount(() => HeroStage));
}
