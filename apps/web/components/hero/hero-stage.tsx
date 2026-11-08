'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Project } from 'xploder';

import { LiveViewer, useLiveViewer } from '../viewer/live-viewer';
import { createHeroLoop, type HeroLoop, type HeroLoopState } from './hero-loop';

export interface HeroLoopControl {
  toggle(): void;
}

export interface HeroStageProps {
  readonly project: Project;
  readonly onFirstFrame: () => void;
  readonly onLoopStateChange?: (state: HeroLoopState) => void;
  readonly onLoopControl?: (control: HeroLoopControl | null) => void;
}

export function HeroStage({
  project,
  onFirstFrame,
  onLoopStateChange,
  onLoopControl,
}: HeroStageProps) {
  const viewer = useLiveViewer({ project, initial: 'exploded' });
  const wrapperRef = useRef<HTMLDivElement>(null);
  const loopRef = useRef<HeroLoop | null>(null);
  const startedRef = useRef(false);
  const userPausedRef = useRef(false);
  const hiddenRef = useRef(
    typeof document !== 'undefined' && document.visibilityState === 'hidden',
  );
  const offscreenRef = useRef(false);
  const [loopState, setLoopState] = useState<HeroLoopState>('paused');

  const publish = useCallback(
    (next: HeroLoopState) => {
      setLoopState(next);
      onLoopStateChange?.(next);
    },
    [onLoopStateChange],
  );

  const sync = useCallback(() => {
    const loop = loopRef.current;
    if (loop === null || !startedRef.current) return;

    if (userPausedRef.current || hiddenRef.current || offscreenRef.current) loop.pause();
    else loop.resume();
    publish(loop.state);
  }, [publish]);

  useEffect(() => {
    const loop = createHeroLoop({
      actions: {
        explode: () => viewer.actions.explode(),
        implode: () => viewer.actions.implode(),
        rotateRight: () => viewer.actions.rotateRight(),
      },
      schedule: (callback, delayMs) => window.setTimeout(callback, delayMs),
      cancel: (handle) => window.clearTimeout(handle as number),
    });
    loopRef.current = loop;
    onLoopControl?.({
      toggle: () => {
        if (!startedRef.current) return;

        userPausedRef.current = !userPausedRef.current;
        sync();
      },
    });
    if (startedRef.current) sync();

    return () => {
      loop.dispose();
      loopRef.current = null;
      onLoopControl?.(null);
    };
  }, [onLoopControl, sync, viewer.actions]);

  useEffect(() => {
    const onVisibilityChange = () => {
      hiddenRef.current = document.visibilityState === 'hidden';
      sync();
    };

    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => document.removeEventListener('visibilitychange', onVisibilityChange);
  }, [sync]);

  useEffect(() => {
    const node = wrapperRef.current;
    if (node === null || typeof IntersectionObserver === 'undefined') return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries.at(-1);
        if (entry === undefined) return;

        offscreenRef.current = !entry.isIntersecting;
        sync();
      },
      { threshold: 0 },
    );
    observer.observe(node);

    return () => observer.disconnect();
  }, [sync]);

  const handleFirstFrame = useCallback(() => {
    onFirstFrame();
    startedRef.current = true;
    sync();
  }, [onFirstFrame, sync]);

  return (
    <div ref={wrapperRef} data-hero-loop={loopState} className="h-full w-full">
      <LiveViewer
        project={project}
        viewer={viewer}
        initial="exploded"
        onFirstFrame={handleFirstFrame}
        fallback={null}
        className="h-full w-full"
      />
    </div>
  );
}
