/**
 * Engine DOM contract for the hero camera and leader line. `xploder/react` renders the stage
 * scroller and trace-pad markers; these selectors are the only engine DOM this feature reads.
 */
export const HERO_STAGE_SELECTOR = '[data-xploder-stage]' as const;
export const HERO_TRACE_PAD_SELECTOR = '[data-xploder-trace-pad]' as const;
export const HERO_TRACE_PAD_ATTRIBUTE = 'data-xploder-trace-pad' as const;
export const HERO_ANNOTATION_SELECTOR = '[data-hero-annotation]' as const;
export const HERO_MODEL_SELECTOR = '[data-hero-model]' as const;

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

export interface HeroLabelGeometry {
  readonly x: number;
  readonly y: number;
  readonly leader: HeroLeaderGeometry | null;
}

const LABEL_MARGIN_PX = 12;
const LABEL_GAP_PX = 18;
const MOBILE_LABEL_GAP_PX = 0;

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

export function readHeroLabelGeometry(
  root: Element | null,
  label: HTMLElement | null,
  componentId: string,
  desktop: boolean,
): HeroLabelGeometry | null {
  if (root === null || label === null) return null;

  const pad = findHeroTracePad(root, componentId);
  if (pad === null) return null;

  const area = root.getBoundingClientRect();
  const labelBox = label.getBoundingClientRect();
  const padBox = pad.getBoundingClientRect();
  const maximumX = Math.max(LABEL_MARGIN_PX, area.width - labelBox.width - LABEL_MARGIN_PX);
  const maximumY = Math.max(LABEL_MARGIN_PX, area.height - labelBox.height - LABEL_MARGIN_PX);

  if (!desktop) {
    const model = root.querySelector(HERO_MODEL_SELECTOR);
    if (!(model instanceof HTMLElement)) return null;

    const modelBox = model.getBoundingClientRect();
    return {
      x: clamp((area.width - labelBox.width) / 2, LABEL_MARGIN_PX, maximumX),
      y: clamp(
        modelBox.top + modelBox.height - area.top + MOBILE_LABEL_GAP_PX,
        LABEL_MARGIN_PX,
        maximumY,
      ),
      leader: null,
    };
  }

  const padX = padBox.left + padBox.width / 2 - area.left;
  const padY = padBox.top + padBox.height / 2 - area.top;
  const x = clamp(padX + LABEL_GAP_PX, LABEL_MARGIN_PX, maximumX);
  const y = clamp(padY - labelBox.height / 2, LABEL_MARGIN_PX, maximumY);

  return {
    x,
    y,
    leader: {
      x1: x,
      y1: y + labelBox.height / 2,
      x2: padX,
      y2: padY,
    },
  };
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
