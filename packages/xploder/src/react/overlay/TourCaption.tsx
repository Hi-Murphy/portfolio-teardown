import { useLayoutEffect, useRef, type CSSProperties } from 'react';

import type { CaptionAnchor } from '../../interaction/caption';
import type { TourPosition } from '../../interaction/tour';
import type { MotionTokens } from '../../motion';
import type { Palette } from '../../theme';
import type { ViewerProject } from '../useTeardownViewer';

export interface TourCaptionProps {
  readonly project: ViewerProject;
  readonly flowId: string;
  readonly position: TourPosition;
  readonly anchor: CaptionAnchor;
  readonly palette: Palette;
  readonly tokens: MotionTokens;
}

const MILLISECONDS_PER_SECOND = 1_000;
const CAPTION_INSET = '0.75rem';

function milliseconds(seconds: number): number {
  return seconds * MILLISECONDS_PER_SECOND;
}

export function TourCaption({
  project,
  flowId,
  position,
  anchor,
  palette,
  tokens,
}: TourCaptionProps) {
  const captionRef = useRef<HTMLDivElement>(null);
  const flow = project.flows?.find((candidate) => candidate.id === flowId);
  const component = project.layers
    .flatMap((layer) => layer.components)
    .find((candidate) => candidate.id === position.componentId);

  useLayoutEffect(() => {
    const element = captionRef.current;
    const duration = milliseconds(tokens.durations.tourPulse);

    if (element === null || duration <= 0 || typeof element.animate !== 'function') return;

    element.animate([{ opacity: 0 }, { opacity: 1 }], {
      duration,
      delay: milliseconds(tokens.staggers.tourStep),
      easing: tokens.easings.tourPulse.css,
      fill: 'backwards',
    });
  }, [flowId, position.step, tokens]);

  if (flow === undefined) return null;

  const style: CSSProperties = {
    position: 'absolute',
    insetBlockStart: anchor === 'top' ? CAPTION_INSET : undefined,
    insetBlockEnd: anchor === 'bottom' ? CAPTION_INSET : undefined,
    insetInlineStart: CAPTION_INSET,
    zIndex: 1,
    boxSizing: 'border-box',
    maxInlineSize: '34ch',
    padding: '0.75rem',
    border: `1px solid ${palette.line}`,
    borderRadius: '0.25rem',
    background: palette.surface,
    color: palette.ink,
    pointerEvents: 'auto',
    userSelect: 'text',
  };
  const secondaryStyle: CSSProperties = { color: palette.label, margin: 0 };
  const bodyStyle: CSSProperties = { color: palette.ink, margin: 0 };

  return (
    <div
      ref={captionRef}
      data-xploder-caption=""
      data-xploder-caption-anchor={anchor}
      aria-live="polite"
      aria-atomic="true"
      style={style}
      onPointerDown={(event) => event.stopPropagation()}
    >
      <p style={secondaryStyle}>
        {flow.label ?? flow.id} · Step {position.step + 1} of {position.total}
      </p>
      <p style={bodyStyle}>{component?.name ?? component?.id ?? position.componentId}</p>
      {component?.summary === undefined ? null : <p style={bodyStyle}>{component.summary}</p>}
      {position.step === 0 && flow.description !== undefined ? (
        <p style={bodyStyle}>{flow.description}</p>
      ) : null}
    </div>
  );
}
