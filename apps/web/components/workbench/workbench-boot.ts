import { loadStaged, STAGES_3D, yieldToMain } from '../boot-3d';

export type WorkbenchClientComponent = (typeof import('./workbench-client'))['WorkbenchClient'];

export async function bootWorkbench(signal: AbortSignal): Promise<WorkbenchClientComponent | null> {
  const staged = await loadStaged(STAGES_3D, signal);
  if (!staged || signal.aborted) return null;

  const { WorkbenchClient } = await import('./workbench-client');
  if (signal.aborted) return null;

  await yieldToMain();
  if (signal.aborted) return null;

  return WorkbenchClient;
}
