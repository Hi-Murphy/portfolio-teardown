'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Project } from 'xploder';
import { motion } from 'xploder/motion';

import { waitForFirstInteraction, waitForIdle } from '../interaction-gate';
import { LIVE_CLASS } from './hero-classes';

export interface HeroLiveProps {
  readonly project: Project;
}

type LiveState = 'idle' | 'loading' | 'revealed' | 'skipped';
type HeroStageComponent = (typeof import('./hero-stage'))['HeroStage'];

function waitForEvent(
  target: EventTarget,
  type: string,
  ready: () => boolean,
  signal: AbortSignal,
): Promise<boolean> {
  if (ready()) return Promise.resolve(true);
  if (signal.aborted) return Promise.resolve(false);

  return new Promise((resolve) => {
    const finish = (result: boolean) => {
      target.removeEventListener(type, check);
      signal.removeEventListener('abort', abort);
      resolve(result);
    };
    const check = () => {
      if (ready()) finish(true);
    };
    const abort = () => finish(false);

    target.addEventListener(type, check);
    signal.addEventListener('abort', abort, { once: true });
    check();
  });
}

export function HeroLive({ project }: HeroLiveProps) {
  const [state, setState] = useState<LiveState>('idle');
  const [HeroStage, setHeroStage] = useState<HeroStageComponent | null>(null);
  const inFlightRef = useRef(false);
  const revealedRef = useRef(false);

  const reveal = useCallback(() => {
    if (revealedRef.current) return;

    revealedRef.current = true;
    setState((current) => (current === 'skipped' ? current : 'revealed'));
  }, []);

  useEffect(() => {
    if (inFlightRef.current) return;

    inFlightRef.current = true;
    const controller = new AbortController();
    const signal = controller.signal;
    const media = window.matchMedia(motion.reducedMotion.query);
    const skip = () => {
      controller.abort();
      setHeroStage(null);
      setState('skipped');
    };
    const onMotionChange = () => {
      if (media.matches) skip();
    };

    media.addEventListener('change', onMotionChange);

    if (media.matches) {
      skip();
    } else {
      const connection = (navigator as Navigator & { connection?: { saveData?: boolean } })
        .connection;

      if (connection?.saveData === true) {
        skip();
      } else {
        void (async () => {
          const loaded = await waitForEvent(
            window,
            'load',
            () => document.readyState === 'complete',
            signal,
          );
          if (!loaded) return;

          const visible = await waitForEvent(
            document,
            'visibilitychange',
            () => document.visibilityState === 'visible',
            signal,
          );
          if (!visible) return;

          // RFC §9.15 (A): the ambient hero costs nothing at load; the 3D starts after the
          // visitor's first interaction, in the next idle moment (never inside the handler).
          if (!__XP_EAGER_3D__) {
            if (!(await waitForFirstInteraction(signal))) return;
          }

          const idle = await waitForIdle(signal);
          if (!idle || signal.aborted) return;

          setState('loading');

          try {
            const { bootHeroStage } = await import('./hero-boot');
            if (signal.aborted) return;
            await bootHeroStage(signal, setHeroStage);
          } catch {
            if (!signal.aborted) setState('skipped');
          }
        })();
      }
    }

    return () => {
      media.removeEventListener('change', onMotionChange);
      controller.abort();
      inFlightRef.current = false;
    };
  }, []);

  return (
    <div
      data-site-live=""
      data-site-live-state={state}
      className={LIVE_CLASS}
      inert
      aria-hidden="true"
    >
      {HeroStage === null ? null : <HeroStage project={project} onFirstFrame={reveal} />}
    </div>
  );
}
