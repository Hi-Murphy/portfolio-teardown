'use client';

import { startTransition, useEffect, useRef, useState } from 'react';

import { waitForFirstInteraction, waitForIdle } from '../interaction-gate';
import type { WorkbenchClientComponent } from './workbench-boot';

export function WorkbenchLoader({ slug }: { readonly slug: string }) {
  const rootRef = useRef<HTMLSpanElement>(null);
  const startedRef = useRef(false);
  const [WorkbenchClient, setWorkbenchClient] = useState<WorkbenchClientComponent | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    const signal = controller.signal;
    const root = rootRef.current?.closest<HTMLElement>('[data-site-workbench]') ?? null;
    const control = root?.querySelector<HTMLButtonElement>('[data-site-control="explore-3d"]');
    const label = control?.querySelector<HTMLElement>('[data-site-control-label]');
    const originalLabel = label?.textContent ?? '';

    const start = () => {
      if (signal.aborted || startedRef.current) return;

      startedRef.current = true;
      void (async () => {
        try {
          const { bootWorkbench } = await import('./workbench-boot');
          if (signal.aborted) return;

          const LoadedWorkbenchClient = await bootWorkbench(signal);
          if (LoadedWorkbenchClient === null || signal.aborted) return;

          startTransition(() => setWorkbenchClient(() => LoadedWorkbenchClient));
        } catch {
          if (!signal.aborted) {
            startedRef.current = false;
            control?.removeAttribute('aria-busy');
            if (label !== null && label !== undefined) label.textContent = originalLabel;
          }
        }
      })();
    };
    const onClick = () => {
      if (signal.aborted || startedRef.current) return;

      control?.setAttribute('aria-busy', 'true');
      if (label !== null && label !== undefined) label.textContent = 'Loading 3D…';
      start();
    };

    control?.addEventListener('click', onClick);

    void (async () => {
      const interacted = await waitForFirstInteraction(
        signal,
        (event) => event.target instanceof Node && control?.contains(event.target) === true,
      );
      if (!interacted || signal.aborted || startedRef.current) return;

      const idle = await waitForIdle(signal);
      if (!idle || signal.aborted || startedRef.current) return;

      start();
    })();

    return () => {
      controller.abort();
      control?.removeEventListener('click', onClick);
    };
  }, []);

  return (
    <>
      <span ref={rootRef} hidden />
      {WorkbenchClient === null ? null : <WorkbenchClient slug={slug} />}
    </>
  );
}
