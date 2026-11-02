'use client';

import dynamic from 'next/dynamic';
import { useEffect, useRef, useState } from 'react';

import { waitForFirstInteraction, waitForIdle } from '../interaction-gate';

const WorkbenchClient = dynamic(
  () => import('./workbench-client').then((module) => module.WorkbenchClient),
  { ssr: false, loading: () => null },
);

export function WorkbenchLoader({ slug }: { readonly slug: string }) {
  const rootRef = useRef<HTMLSpanElement>(null);
  const startedRef = useRef(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    const signal = controller.signal;
    const root = rootRef.current?.closest<HTMLElement>('[data-site-workbench]') ?? null;
    const control = root?.querySelector<HTMLButtonElement>('[data-site-control="explore-3d"]');

    const start = () => {
      if (signal.aborted || startedRef.current) return;

      startedRef.current = true;
      setMounted(true);
    };
    const onClick = () => {
      if (signal.aborted || startedRef.current) return;

      control?.setAttribute('aria-busy', 'true');
      const label = control?.querySelector<HTMLElement>('[data-site-control-label]');
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
      {mounted ? <WorkbenchClient slug={slug} /> : null}
    </>
  );
}
