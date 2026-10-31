import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from 'react';

import type { ProjectLayout } from '../../layout';
import type { LookTokens } from '../../look/tokens';
import type { MotionTokens } from '../../motion';
import {
  overlayModel,
  traceModel,
  type OverlayLabel,
  type OverlayModel,
  type TraceModel,
} from '../../overlay/model';
import { overlayTiming } from '../../overlay/timing';
import type { Palette } from '../../theme';
import type { OverlayEvent } from '../scene/OverlayProjector';
import type { TeardownTarget, TeardownViewerHandle, ViewerProject } from '../useTeardownViewer';
import { CircuitTrace } from './CircuitTrace';

export interface BlueprintOverlayProps {
  readonly project: ViewerProject;
  readonly layout: ProjectLayout;
  readonly palette: Palette;
  readonly tokens: MotionTokens;
  readonly target: TeardownTarget;
  readonly tour: Pick<TeardownViewerHandle['tour'], 'flowId' | 'status' | 'step'>;
  readonly focus: TeardownViewerHandle['focus'];
  readonly look: LookTokens;
}

export interface BlueprintOverlayHandle {
  update(event: OverlayEvent): void;
  setScroll(offsetY: number): void;
}

interface SettledFrame {
  readonly frame: Extract<OverlayEvent, { kind: 'settled' }>['frame'];
  readonly width: number;
  readonly height: number;
  readonly offsetY: number;
}

const ROOT_STYLE: CSSProperties = {
  position: 'absolute',
  inset: 0,
  overflow: 'hidden',
  pointerEvents: 'none',
  opacity: 0,
};

const GROUP_STYLE: CSSProperties = {
  position: 'absolute',
  inset: 0,
  transformOrigin: '0 0',
};

const SVG_STYLE: CSSProperties = {
  position: 'absolute',
  inset: 0,
  overflow: 'visible',
  pointerEvents: 'none',
};

const VISUALLY_HIDDEN_STYLE: CSSProperties = {
  position: 'absolute',
  width: '1px',
  height: '1px',
  overflow: 'hidden',
  clip: 'rect(0 0 0 0)',
  clipPath: 'inset(50%)',
  whiteSpace: 'nowrap',
  margin: '-1px',
  padding: 0,
  border: 0,
};

function opacityTransition(tokens: MotionTokens): string | undefined {
  const { fadeMs } = overlayTiming(tokens);

  return fadeMs <= 0 ? undefined : `opacity ${fadeMs}ms ${tokens.easings.hover.css}`;
}

function labelStyle(
  label: OverlayLabel,
  palette: Palette,
  look: LookTokens,
  transition: string | undefined,
): CSSProperties {
  const style: CSSProperties = {
    position: 'absolute',
    boxSizing: 'border-box',
    width: label.w,
    height: label.h,
    padding: `${look.annotation.padYPx}px ${look.annotation.padXPx}px`,
    overflow: 'hidden',
    whiteSpace: 'nowrap',
    pointerEvents: 'auto',
    userSelect: 'text',
    transform: `translate(${label.x}px, ${label.y}px)`,
    transformOrigin: 'top left',
    font: `${look.annotation.fontPx}px/${look.annotation.lineEm} var(--font-mono, ui-monospace, monospace)`,
    opacity: label.opacity,
  };

  if (label.kind === 'layer') {
    style.color = palette[look.annotation.textRole];
    style.background = palette[look.annotation.labelFillRole];
    style.textTransform = 'uppercase';
  } else if (label.kind === 'part') {
    style.color = palette[look.annotation.partRole];
    style.background = palette[look.annotation.balloonFillRole];
    style.border = `1px solid ${palette[look.annotation.balloonRole]}`;
    style.borderRadius = '999px';
  } else {
    style.color = palette[look.annotation.dimensionRole];
    style.background = palette[look.annotation.labelFillRole];
  }

  if (transition !== undefined) style.transition = transition;

  return style;
}

export const BlueprintOverlay = forwardRef<BlueprintOverlayHandle, BlueprintOverlayProps>(
  function BlueprintOverlay({ project, layout, palette, tokens, target, tour, focus, look }, ref) {
    const rootRef = useRef<HTMLDivElement>(null);
    const groupRef = useRef<HTMLDivElement>(null);
    const fadeAnimationRef = useRef<Animation | null>(null);
    const [settled, setSettled] = useState<SettledFrame | null>(null);
    const [moving, setMoving] = useState(false);

    const setScroll = useCallback((offsetY: number) => {
      const group = groupRef.current;

      if (group !== null) group.style.transform = `translateY(${-offsetY}px)`;
    }, []);

    const update = useCallback(
      (event: OverlayEvent) => {
        if (event.kind === 'moving') {
          fadeAnimationRef.current?.cancel();
          fadeAnimationRef.current = null;

          if (rootRef.current !== null) rootRef.current.style.opacity = '0';

          setMoving(true);
          return;
        }

        setScroll(event.offsetY);
        setMoving(false);
        setSettled({
          frame: event.frame,
          width: event.width,
          height: event.height,
          offsetY: event.offsetY,
        });
      },
      [setScroll],
    );

    useImperativeHandle(ref, () => ({ update, setScroll }), [setScroll, update]);

    const model = useMemo<OverlayModel | null>(() => {
      if (settled === null) return null;

      return overlayModel({
        frame: settled.frame,
        layout,
        project,
        viewport: { width: settled.width, height: settled.height },
        offsetY: settled.offsetY,
        target,
        tour,
        focus,
        look,
      });
    }, [focus, layout, look, project, settled, target, tour]);

    const trace = useMemo<TraceModel | null>(() => {
      if (settled === null) return null;

      const flow =
        tour.flowId === null
          ? undefined
          : project.flows?.find((candidate) => candidate.id === tour.flowId);

      return traceModel({
        frame: settled.frame,
        flow,
        step: tour.step,
        status: tour.status,
        offsetY: settled.offsetY,
        tokens,
        look,
      });
    }, [look, project.flows, settled, tokens, tour.flowId, tour.status, tour.step]);

    useLayoutEffect(() => {
      if (settled === null) return;

      const root = rootRef.current;

      if (root === null) return;

      fadeAnimationRef.current?.cancel();
      root.style.opacity = '0';

      const { fadeMs } = overlayTiming(tokens);

      if (fadeMs <= 0 || typeof root.animate !== 'function') {
        root.style.opacity = '1';
        return;
      }

      const animation = root.animate([{ opacity: 0 }, { opacity: 1 }], {
        duration: fadeMs,
        easing: tokens.easings.hover.css,
        fill: 'both',
      });

      fadeAnimationRef.current = animation;
      root.style.opacity = '1';

      return () => animation.cancel();
    }, [settled, tokens]);

    const shown = !moving && model?.shown === true;
    const hidden = model?.hidden ?? 0;
    const transition = opacityTransition(tokens);

    return (
      <div
        ref={rootRef}
        data-xploder-overlay={shown ? 'shown' : 'hidden'}
        data-xploder-overlay-hidden={hidden}
        style={ROOT_STYLE}
      >
        <div ref={groupRef} style={GROUP_STYLE}>
          <svg
            aria-hidden="true"
            width={settled?.width ?? 0}
            height={settled?.height ?? 0}
            viewBox={`0 0 ${settled?.width ?? 0} ${settled?.height ?? 0}`}
            style={SVG_STYLE}
          >
            {(model?.strokes ?? []).map((stroke) => (
              <polyline
                key={stroke.key}
                data-xploder-stroke={stroke.kind}
                points={stroke.points.map((point) => point.join(',')).join(' ')}
                fill="none"
                stroke={palette[stroke.role]}
                strokeWidth={1}
                vectorEffect="non-scaling-stroke"
                style={{
                  opacity: stroke.opacity,
                  ...(transition === undefined ? {} : { transition }),
                }}
              />
            ))}
            <CircuitTrace
              active={!moving && settled !== null && tour.status !== 'idle'}
              step={tour.step}
              status={tour.status}
              model={trace}
              palette={palette}
              tokens={tokens}
              look={look}
            />
          </svg>
          {(model?.labels ?? []).map((label) => (
            <span
              key={label.key}
              data-xploder-label={label.key}
              style={labelStyle(label, palette, look, transition)}
            >
              {label.text}
              {label.srText === undefined ? null : (
                <>
                  {' '}
                  <span style={VISUALLY_HIDDEN_STYLE}>{label.srText}</span>
                </>
              )}
            </span>
          ))}
        </div>
      </div>
    );
  },
);
