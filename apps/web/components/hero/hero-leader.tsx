'use client';

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { durations, easings, motion } from 'xploder/motion';

import { readHeroLabelGeometry } from './hero-dom';
import { MS_PER_SECOND } from './hero-loop';
import {
  EMPTY_HERO_LABEL_STATE,
  createHeroLabelController,
  type HeroLabelController,
  type HeroLabelState,
  type HeroStepLabel,
} from './hero-label';
import { useHeroShowcase, type HeroShowcaseState } from './hero-showcase';

const HERO_DESKTOP_QUERY = '(min-width: 64rem)';

function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(query).matches,
  );

  useEffect(() => {
    const media = window.matchMedia(query);
    const update = () => setMatches(media.matches);

    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, [query]);

  return matches;
}

function stepLabelForShowcase(
  state: Pick<
    HeroShowcaseState,
    'phase' | 'flowLabel' | 'step' | 'total' | 'componentId' | 'componentName' | 'componentSummary'
  >,
): HeroStepLabel | null {
  if (
    (state.phase !== 'capture' && state.phase !== 'inspect') ||
    state.flowLabel === null ||
    state.step < 0 ||
    state.total < 1 ||
    state.componentId === null ||
    state.componentName === null ||
    state.componentSummary === null
  ) {
    return null;
  }

  return {
    key: `${state.flowLabel}:${state.step}:${state.componentId}`,
    flowLabel: state.flowLabel,
    step: state.step,
    total: state.total,
    componentId: state.componentId,
    componentName: state.componentName,
    componentSummary: state.componentSummary,
  };
}

export interface HeroLeaderProps {
  readonly name: string;
}

export function HeroLeader({ name }: HeroLeaderProps) {
  const showcase = useHeroShowcase();
  const reducedMotion = useMediaQuery(motion.reducedMotion.query);
  const desktop = useMediaQuery(HERO_DESKTOP_QUERY);
  const [labelState, setLabelState] = useState<HeroLabelState>(EMPTY_HERO_LABEL_STATE);
  const controllerRef = useRef<HeroLabelController | null>(null);
  const labelRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const lineRef = useRef<SVGLineElement>(null);
  const dotRef = useRef<SVGCircleElement>(null);
  const [heroVisible, setHeroVisible] = useState(true);
  const [documentVisible, setDocumentVisible] = useState(
    () => typeof document === 'undefined' || document.visibilityState !== 'hidden',
  );
  const { phase, flowLabel, step, total, componentId, componentName, componentSummary } = showcase;
  const target = useMemo(
    () =>
      stepLabelForShowcase({
        phase,
        flowLabel,
        step,
        total,
        componentId,
        componentName,
        componentSummary,
      }),
    [componentId, componentName, componentSummary, flowLabel, phase, step, total],
  );
  const hasDisplay = labelState.display !== null;
  const active =
    (showcase.phase === 'capture' || showcase.phase === 'inspect') && showcase.componentId !== null;
  const leaderLabel =
    desktop && active && labelState.display?.componentId === showcase.componentId
      ? labelState.display
      : null;

  useEffect(() => {
    const controller = createHeroLabelController({
      schedule: (callback, delayMs) => window.setTimeout(callback, delayMs),
      cancel: (handle) => window.clearTimeout(handle as number),
      onChange: setLabelState,
    });
    controllerRef.current = controller;

    return () => {
      controller.dispose();
      controllerRef.current = null;
    };
  }, []);

  useEffect(() => {
    controllerRef.current?.update(target, reducedMotion);
  }, [reducedMotion, target]);

  useEffect(() => {
    if (!hasDisplay || typeof IntersectionObserver === 'undefined') return;

    const node = labelRef.current;
    const figure = node?.closest('figure') ?? null;
    if (figure === null) return;

    const observer = new IntersectionObserver(
      (entries) => setHeroVisible(entries.at(-1)?.isIntersecting ?? false),
      { threshold: 0 },
    );
    observer.observe(figure);

    return () => observer.disconnect();
  }, [hasDisplay]);

  useEffect(() => {
    const onVisibilityChange = () => setDocumentVisible(document.visibilityState !== 'hidden');

    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => document.removeEventListener('visibilitychange', onVisibilityChange);
  }, []);

  useEffect(() => {
    const display = labelState.display;
    const node = labelRef.current;
    if (display === null || node === null || !heroVisible || !documentVisible) return;

    if (node.dataset.heroLabelPositionedComponent !== display.componentId) {
      node.dataset.heroLabelReady = 'false';
      node.dataset.heroLabelPositionedComponent = display.componentId;
    }

    let frame: number | null = null;
    const update = () => {
      const figure = node.closest('figure');
      const geometry = readHeroLabelGeometry(figure, node, display.componentId, desktop);
      if (geometry === null) {
        if (lineRef.current !== null) lineRef.current.setAttribute('visibility', 'hidden');
        if (dotRef.current !== null) dotRef.current.setAttribute('visibility', 'hidden');
        if (!showcase.paused) frame = requestAnimationFrame(update);
        return;
      }

      node.style.transform = `translate3d(${geometry.x}px, ${geometry.y}px, 0)`;
      node.dataset.heroLabelReady = 'true';

      const line = lineRef.current;
      const dot = dotRef.current;
      const svg = svgRef.current;
      if (line !== null && dot !== null && geometry.leader !== null) {
        line.setAttribute('x1', String(geometry.leader.x1));
        line.setAttribute('y1', String(geometry.leader.y1));
        line.setAttribute('x2', String(geometry.leader.x2));
        line.setAttribute('y2', String(geometry.leader.y2));
        line.setAttribute('visibility', 'visible');
        dot.setAttribute('cx', String(geometry.leader.x2));
        dot.setAttribute('cy', String(geometry.leader.y2));
        dot.setAttribute('visibility', 'visible');
        if (svg !== null) svg.dataset.heroLeaderReady = 'true';
      }

      if (!showcase.paused) frame = requestAnimationFrame(update);
    };

    frame = requestAnimationFrame(update);
    return () => {
      if (frame !== null) cancelAnimationFrame(frame);
    };
  }, [desktop, documentVisible, heroVisible, labelState.display, showcase.paused]);

  useLayoutEffect(() => {
    const node = labelRef.current;
    if (node === null || labelState.display === null) return;

    if (reducedMotion) {
      node.style.opacity = labelState.opacity === 1 ? '1' : '0';
      return;
    }

    if (labelState.stage !== 'exit' && labelState.stage !== 'enter') return;

    const exit = labelState.stage === 'exit';
    const animation = node.animate([{ opacity: exit ? 1 : 0 }, { opacity: exit ? 0 : 1 }], {
      duration: (exit ? durations.panelExit : durations.panelEnter) * MS_PER_SECOND,
      easing: (exit ? easings.panelExit : easings.panelEnter).css,
      fill: 'forwards',
    });

    void animation.finished
      .then(() => {
        if (exit) {
          requestAnimationFrame(() => controllerRef.current?.transitionEnd());
        } else {
          controllerRef.current?.entered();
        }
      })
      .catch(() => undefined);

    return () => animation.cancel();
  }, [labelState.display, labelState.opacity, labelState.stage, reducedMotion]);

  const label = labelState.display;

  return (
    <>
      {label === null ? null : (
        <div
          ref={labelRef}
          aria-hidden="true"
          data-hero-step-label=""
          data-hero-label-ready="false"
          data-hero-step-label-state={labelState.stage}
          data-hero-step-label-step={label.step}
          data-hero-step-label-component={label.componentId}
          className="pointer-events-none invisible absolute left-0 top-0 z-30 w-[min(18rem,calc(100%-2.5rem))] border-l-2 border-accent bg-bg/90 py-1 pl-3 pr-2 data-[hero-label-ready=true]:visible"
          style={{
            opacity: 1,
            willChange: 'transform, opacity',
          }}
        >
          <div className="flex min-w-0 items-center gap-1.5 font-mono text-[0.6875rem] uppercase tracking-[0.14em] text-muted">
            <span className="truncate">{name}</span>
            <span aria-hidden="true">·</span>
            <span className="truncate">{label.flowLabel}</span>
            <span className="ml-auto shrink-0">{`${label.step + 1}/${label.total}`}</span>
          </div>
          <p className="truncate text-base font-semibold leading-snug text-fg">
            {label.componentName}
          </p>
          <p className="line-clamp-1 text-base leading-snug text-muted lg:line-clamp-2">
            {label.componentSummary}
          </p>
        </div>
      )}

      {leaderLabel === null ? null : (
        <svg
          ref={svgRef}
          aria-hidden="true"
          focusable="false"
          data-hero-leader=""
          data-hero-leader-ready="false"
          className="pointer-events-none absolute inset-0 z-20 hidden h-full w-full overflow-visible text-accent lg:block"
        >
          <line
            ref={lineRef}
            data-hero-leader-line=""
            x1="0"
            y1="0"
            x2="0"
            y2="0"
            stroke="currentColor"
            strokeOpacity="0.8"
            strokeWidth="1"
            visibility="hidden"
          />
          <circle
            ref={dotRef}
            data-hero-leader-dot=""
            cx="0"
            cy="0"
            r="3"
            fill="currentColor"
            visibility="hidden"
          />
        </svg>
      )}
    </>
  );
}
