'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Project } from 'xploder';

import { LiveViewer, useLiveViewer } from '../viewer/live-viewer';
import { createHeroFollow } from './hero-follow';
import {
  HERO_WATCHDOG_MS,
  INITIAL_HERO_SEQUENCE_STATE,
  createHeroSequence,
  type HeroLoopState,
  type HeroSequence,
  type HeroSequenceState,
  type HeroTourState,
  type HeroTourStatus,
} from './hero-loop';
import { showcaseForSequence, type HeroShowcaseState } from './hero-showcase';

const CAPTURE_FLOW = 'capture-path';
const INSPECT_FLOW = 'inspect-path';

interface TourWatchState {
  status: HeroTourStatus;
  step: number;
  changedAt: number;
  nudged: boolean;
  nudging: boolean;
}

export interface HeroLoopControl {
  toggle(): void;
}

export interface HeroStageProps {
  readonly project: Project;
  readonly onFirstFrame: () => void;
  readonly onLoopStateChange?: (state: HeroLoopState) => void;
  readonly onLoopControl?: (control: HeroLoopControl | null) => void;
  readonly onShowcaseChange?: (state: HeroShowcaseState) => void;
}

export function HeroStage({
  project,
  onFirstFrame,
  onLoopStateChange,
  onLoopControl,
  onShowcaseChange,
}: HeroStageProps) {
  const viewer = useLiveViewer({ project, initial: 'imploded', smoothZoom: true });
  const wrapperRef = useRef<HTMLDivElement>(null);
  const controllerRef = useRef<HeroSequence | null>(null);
  const tourRef = useRef<HeroTourState>(viewer.tour);
  const actionsRef = useRef(viewer.actions);
  const watchRef = useRef<TourWatchState>({
    status: 'idle',
    step: -1,
    changedAt: 0,
    nudged: false,
    nudging: false,
  });
  const [sequence, setSequence] = useState<HeroSequenceState>(INITIAL_HERO_SEQUENCE_STATE);
  const [userPaused, setUserPaused] = useState(false);
  const [hidden, setHidden] = useState(
    typeof document !== 'undefined' && document.visibilityState === 'hidden',
  );
  const [offscreen, setOffscreen] = useState(false);

  useEffect(() => {
    tourRef.current = viewer.tour;
    actionsRef.current = viewer.actions;
  }, [viewer.actions, viewer.tour]);

  const publish = useCallback(
    (next: HeroSequenceState) => {
      setSequence(next);
      onLoopStateChange?.(next.status);
      onShowcaseChange?.(showcaseForSequence(project, next));
    },
    [onLoopStateChange, onShowcaseChange, project],
  );

  useEffect(() => {
    const follow = createHeroFollow({ root: () => wrapperRef.current, project });
    const controller = createHeroSequence({
      actions: {
        explode: () => viewer.actions.explode(),
        implode: () => viewer.actions.implode(),
        zoomIn: () => viewer.actions.zoomIn(),
        zoomReset: () => viewer.actions.zoomReset(),
        rotateRight: () => viewer.actions.rotateRight(),
        selectFlow: (flowId) => viewer.actions.selectFlow(flowId),
        playTour: () => viewer.actions.play(),
        pauseTour: () => viewer.actions.pause(),
        stopTour: () => viewer.actions.stop(),
      },
      follow,
      captureFlow: CAPTURE_FLOW,
      inspectFlow: INSPECT_FLOW,
      schedule: (callback, delayMs) => window.setTimeout(callback, delayMs),
      cancel: (handle) => window.clearTimeout(handle as number),
      onChange: publish,
    });
    controllerRef.current = controller;

    return () => {
      controller.dispose();
      controllerRef.current = null;
    };
  }, [project, publish, viewer.actions]);

  useEffect(() => {
    onLoopControl?.({
      toggle: () => setUserPaused((current) => !current),
    });

    return () => onLoopControl?.(null);
  }, [onLoopControl]);

  useEffect(() => {
    const controller = controllerRef.current;
    if (controller === null || !sequence.started) return;

    if (userPaused || hidden || offscreen) controller.pause();
    else controller.resume();
  }, [hidden, offscreen, sequence.started, userPaused]);

  const tourStatus = viewer.tour.status;
  const tourFlowId = viewer.tour.flowId;
  const tourStep = viewer.tour.step;
  const tourTotal = viewer.tour.total;

  useEffect(() => {
    const watchingTour =
      sequence.status === 'running' &&
      !hidden &&
      !offscreen &&
      (sequence.phase === 'capture' || sequence.phase === 'inspect');
    if (!watchingTour) return;

    let frame: number | null = null;
    let stopped = false;
    watchRef.current = {
      status: tourRef.current.status,
      step: tourRef.current.step,
      changedAt: performance.now(),
      nudged: false,
      nudging: false,
    };

    const watch = (): void => {
      frame = null;
      if (stopped) return;

      const tour = tourRef.current;
      const now = performance.now();
      const previous = watchRef.current;

      if (tour.step !== previous.step) {
        previous.step = tour.step;
        previous.changedAt = now;
        previous.nudged = false;
      }

      if (previous.nudging) {
        previous.nudging = false;
        if (tour.status === 'paused') actionsRef.current.play();
        previous.status = tour.status;
        if (tour.status !== 'playing') previous.changedAt = now;
      } else if (tour.status === 'playing') {
        if (previous.status !== 'playing') {
          previous.status = tour.status;
          previous.changedAt = now;
        } else if (!previous.nudged && now - previous.changedAt > HERO_WATCHDOG_MS.overdue) {
          previous.nudging = true;
          previous.nudged = true;
          actionsRef.current.pause();
        }
      } else {
        previous.status = tour.status;
        previous.changedAt = now;
      }

      frame = window.requestAnimationFrame(watch);
    };

    frame = window.requestAnimationFrame(watch);

    return () => {
      stopped = true;
      if (frame !== null) window.cancelAnimationFrame(frame);
    };
  }, [hidden, offscreen, sequence.phase, sequence.status]);

  useEffect(() => {
    controllerRef.current?.updateTour({
      status: tourStatus,
      flowId: tourFlowId,
      step: tourStep,
      total: tourTotal,
    });
  }, [tourFlowId, tourStatus, tourStep, tourTotal]);

  useEffect(() => {
    const onVisibilityChange = () => {
      setHidden(document.visibilityState === 'hidden');
    };

    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => document.removeEventListener('visibilitychange', onVisibilityChange);
  }, []);

  useEffect(() => {
    const node = wrapperRef.current;
    if (node === null || typeof IntersectionObserver === 'undefined') return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries.at(-1);
        if (entry === undefined) return;

        setOffscreen(!entry.isIntersecting);
      },
      { threshold: 0 },
    );
    observer.observe(node);

    return () => observer.disconnect();
  }, []);

  const handleFirstFrame = useCallback(() => {
    onFirstFrame();
    controllerRef.current?.start();
  }, [onFirstFrame]);

  return (
    <div
      ref={wrapperRef}
      data-hero-loop={sequence.status}
      data-hero-phase={sequence.phase}
      data-hero-tour-step={sequence.tour.step}
      className="h-full w-full"
    >
      <LiveViewer
        project={project}
        viewer={viewer}
        initial="imploded"
        onFirstFrame={handleFirstFrame}
        fallback={null}
        className="h-full w-full"
      />
    </div>
  );
}
