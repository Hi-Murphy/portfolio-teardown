'use client';

import { useEffect, useRef, useState } from 'react';

import { readHeroLeaderGeometry } from './hero-dom';
import { useHeroShowcase } from './hero-showcase';

export function HeroLeader() {
  const { phase, componentId, paused } = useHeroShowcase();
  const rootRef = useRef<SVGSVGElement>(null);
  const lineRef = useRef<SVGLineElement>(null);
  const dotRef = useRef<SVGCircleElement>(null);
  const [heroVisible, setHeroVisible] = useState(true);
  const [documentVisible, setDocumentVisible] = useState(
    () => typeof document === 'undefined' || document.visibilityState !== 'hidden',
  );
  const active = (phase === 'capture' || phase === 'inspect') && componentId !== null;

  useEffect(() => {
    const svg = rootRef.current;
    if (svg === null || typeof IntersectionObserver === 'undefined') return;

    const observer = new IntersectionObserver(
      (entries) => setHeroVisible(entries.at(-1)?.isIntersecting ?? false),
      { threshold: 0 },
    );
    observer.observe(svg.closest('figure') ?? svg);

    return () => observer.disconnect();
  }, [active]);

  useEffect(() => {
    const onVisibilityChange = () => setDocumentVisible(document.visibilityState !== 'hidden');

    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => document.removeEventListener('visibilitychange', onVisibilityChange);
  }, []);

  useEffect(() => {
    if (!active || paused || !heroVisible || !documentVisible) return;

    let frame: number | null = null;
    const update = () => {
      const svg = rootRef.current;
      const line = lineRef.current;
      const dot = dotRef.current;
      if (svg === null || line === null || dot === null) return;

      const figure = svg.closest('figure');
      const geometry = componentId === null ? null : readHeroLeaderGeometry(figure, componentId);
      if (geometry === null) {
        svg.dataset.heroLeaderReady = 'false';
        line.setAttribute('visibility', 'hidden');
        dot.setAttribute('visibility', 'hidden');
        frame = requestAnimationFrame(update);
        return;
      }

      line.setAttribute('x1', String(geometry.x1));
      line.setAttribute('y1', String(geometry.y1));
      line.setAttribute('x2', String(geometry.x2));
      line.setAttribute('y2', String(geometry.y2));
      line.setAttribute('visibility', 'visible');
      dot.setAttribute('cx', String(geometry.x2));
      dot.setAttribute('cy', String(geometry.y2));
      dot.setAttribute('visibility', 'visible');
      svg.dataset.heroLeaderReady = 'true';
      frame = requestAnimationFrame(update);
    };

    frame = requestAnimationFrame(update);
    return () => {
      if (frame !== null) cancelAnimationFrame(frame);
    };
  }, [active, componentId, documentVisible, heroVisible, paused]);

  if (!active) return null;

  return (
    <svg
      ref={rootRef}
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
  );
}
