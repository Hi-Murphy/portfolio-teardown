import { STAGES_3D } from '../build/stage-3d';

type SchedulerWindow = Window & {
  scheduler?: {
    yield?: () => Promise<void>;
  };
};

export type Stage = () => Promise<unknown>;

export { STAGES_3D };

export function yieldToMain(): Promise<void> {
  const scheduler = (window as SchedulerWindow).scheduler;
  if (typeof scheduler?.yield === 'function') return scheduler.yield();

  return new Promise((resolve) => {
    const channel = new MessageChannel();
    channel.port1.onmessage = () => {
      channel.port1.close();
      resolve();
    };
    channel.port2.postMessage(null);
  });
}

export async function loadStaged(stages: readonly Stage[], signal: AbortSignal): Promise<boolean> {
  for (const stage of stages) {
    if (signal.aborted) return false;
    await stage();
    if (signal.aborted) return false;
    await yieldToMain();
    if (signal.aborted) return false;
  }
  return true;
}
