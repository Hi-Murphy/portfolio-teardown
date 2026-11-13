/**
 * Engine DOM contract for the hero camera and leader line. `xploder/react` renders the stage
 * scroller and trace-pad markers; these selectors are the only engine DOM this feature reads.
 */
export const HERO_STAGE_SELECTOR = '[data-xploder-stage]' as const;
export const HERO_TRACE_PAD_SELECTOR = '[data-xploder-trace-pad]' as const;
export const HERO_TRACE_PAD_ATTRIBUTE = 'data-xploder-trace-pad' as const;
export const HERO_ANNOTATION_SELECTOR = '[data-hero-annotation]' as const;

export function findHeroStage(root: ParentNode | null): HTMLElement | null {
  if (root === null) return null;

  const stage = root.querySelector(HERO_STAGE_SELECTOR);
  return stage instanceof HTMLElement ? stage : null;
}

export function findHeroTracePad(
  root: ParentNode | null,
  componentId: string,
): SVGCircleElement | null {
  if (root === null) return null;

  for (const pad of root.querySelectorAll<SVGCircleElement>(HERO_TRACE_PAD_SELECTOR)) {
    if (pad.getAttribute(HERO_TRACE_PAD_ATTRIBUTE) === componentId) return pad;
  }

  return null;
}

export interface HeroLeaderGeometry {
  readonly x1: number;
  readonly y1: number;
  readonly x2: number;
  readonly y2: number;
}

export function readHeroLeaderGeometry(
  root: Element | null,
  componentId: string,
): HeroLeaderGeometry | null {
  if (root === null) return null;

  const annotation = root.querySelector(HERO_ANNOTATION_SELECTOR);
  const pad = findHeroTracePad(root, componentId);
  if (!(annotation instanceof HTMLElement) || pad === null) return null;

  const area = root.getBoundingClientRect();
  const start = annotation.getBoundingClientRect();
  const end = pad.getBoundingClientRect();

  return {
    x1: start.left - area.left,
    y1: start.top - area.top,
    x2: end.left + end.width / 2 - area.left,
    y2: end.top + end.height / 2 - area.top,
  };
}
