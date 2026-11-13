import type { Project } from 'xploder';
import { motion } from 'xploder/motion';

import { findHeroStage, findHeroTracePad } from './hero-dom';
import { MS_PER_SECOND, type HeroFollowDriver } from './hero-loop';

const FOLLOW_MS = (motion.durations.tourPulse + motion.staggers.tourStep) * MS_PER_SECOND;

export interface HeroFollowOptions {
  readonly root: () => ParentNode | null;
  readonly project: Project;
}

function componentAtStep(project: Project, flowId: string, step: number): string | null {
  return project.flows?.find((flow) => flow.id === flowId)?.path[step] ?? null;
}

function smoothstep(progress: number): number {
  return progress * progress * (3 - 2 * progress);
}

export function createHeroFollow({ root, project }: HeroFollowOptions): HeroFollowDriver {
  let componentId: string | null = null;
  let stepKey = '';
  let mode: 'follow' | 'reset' | null = null;
  let paused = false;
  let disposed = false;
  let frame: number | null = null;
  let startedAt = 0;
  let startScrollTop = 0;
  let targetScrollTop: number | null = null;

  const cancelFrame = (): void => {
    if (frame === null) return;

    cancelAnimationFrame(frame);
    frame = null;
  };

  const scheduleFrame = (): void => {
    if (frame !== null || paused || disposed || mode === null) return;

    frame = requestAnimationFrame(tick);
  };

  const getGeometry = (): {
    readonly stage: HTMLElement;
    readonly target: number | null;
  } | null => {
    const stage = findHeroStage(root());
    if (stage === null) return null;

    if (mode === 'reset') return { stage, target: 0 };
    if (componentId === null) return null;

    const pad = findHeroTracePad(root(), componentId);
    if (pad === null) return { stage, target: null };

    const stageBox = stage.getBoundingClientRect();
    const padBox = pad.getBoundingClientRect();
    const baseY = padBox.top + stage.scrollTop;
    const maximum = stage.scrollHeight - stage.clientHeight;
    const target = Math.min(maximum, Math.max(0, baseY - (stageBox.top + stage.clientHeight / 2)));

    return { stage, target };
  };

  const tick = (): void => {
    frame = null;
    if (paused || disposed || mode === null) return;

    const geometry = getGeometry();
    if (geometry === null) return;

    if (geometry.target === null) {
      scheduleFrame();
      return;
    }

    if (targetScrollTop === null) {
      targetScrollTop = geometry.target;
      startScrollTop = geometry.stage.scrollTop;
      startedAt = performance.now();
    }

    const progress = Math.min(1, Math.max(0, (performance.now() - startedAt) / FOLLOW_MS));
    geometry.stage.scrollTop =
      startScrollTop + (targetScrollTop - startScrollTop) * smoothstep(progress);

    if (progress < 1) scheduleFrame();
  };

  const restart = (): void => {
    cancelFrame();
    targetScrollTop = null;
    scheduleFrame();
  };

  return {
    start: (flowId) => {
      componentId = null;
      stepKey = `start:${flowId}`;
      mode = null;
      cancelFrame();
    },
    follow: (flowId, step) => {
      const nextKey = `${flowId}:${step}`;
      if (nextKey === stepKey && mode === 'follow') return;

      stepKey = nextKey;
      componentId = componentAtStep(project, flowId, step);
      mode = 'follow';
      restart();
    },
    pause: () => {
      paused = true;
      cancelFrame();
    },
    resume: () => {
      if (!paused) return;

      paused = false;
      restart();
    },
    reset: () => {
      componentId = null;
      stepKey = '';
      mode = 'reset';
      restart();
    },
    stop: () => {
      componentId = null;
      stepKey = '';
      mode = null;
      cancelFrame();
    },
    dispose: () => {
      disposed = true;
      mode = null;
      cancelFrame();
    },
  };
}
