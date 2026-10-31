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

import type { Phase } from '../../engine/explode';
import type { ProjectLayout } from '../../layout';
import type { LookTokens } from '../../look/tokens';
import type { MotionTokens } from '../../motion';
import {
  overlayBaseModel,
  overlayStateModel,
  overlayVisible,
  traceModel,
  type OverlayLabel,
  type OverlayModel,
  type OverlayTitleBlock,
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
  readonly phase: Phase | null;
  readonly tour: Pick<TeardownViewerHandle['tour'], 'flowId' | 'status' | 'step'>;
  readonly focus: TeardownViewerHandle['focus'];
  readonly highlight: string | null;
  readonly look: LookTokens;
  readonly onTitleBlockShown?: (shown: boolean) => void;
}

export interface BlueprintOverlayHandle {
  update(event: OverlayEvent): void;
  setScroll(offsetY: number): void;
}

interface SettledFrame {
  readonly frame: Extract<OverlayEvent, { kind: 'settled' }>['frame'];
  readonly layout: ProjectLayout;
  readonly width: number;
  readonly height: number;
  readonly offsetY: number;
  readonly target: TeardownTarget;
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
  } else if (label.kind === 'part' || label.kind === 'tag') {
    style.color = palette[look.annotation.partRole];
    style.background = palette[look.annotation.balloonFillRole];
    style.border = `1px solid ${
      palette[label.emphasis === true ? look.callouts.emphasisRole : look.annotation.balloonRole]
    }`;
    style.borderRadius = '999px';
  } else {
    style.color = palette[look.annotation.dimensionRole];
    style.background = palette[look.annotation.labelFillRole];
  }

  if (transition !== undefined) style.transition = transition;

  return style;
}

function titleBlockStyle(
  titleBlock: OverlayTitleBlock,
  palette: Palette,
  look: LookTokens,
): CSSProperties {
  const columns = titleBlock.columns;

  return {
    position: 'absolute',
    boxSizing: 'border-box',
    width: titleBlock.w,
    height: titleBlock.h,
    padding: `${look.annotation.padYPx}px ${look.annotation.padXPx}px`,
    overflow: 'hidden',
    whiteSpace: 'nowrap',
    pointerEvents: 'auto',
    userSelect: 'text',
    transform: `translate(${titleBlock.x}px, ${titleBlock.y}px)`,
    transformOrigin: 'top left',
    font: `${look.annotation.fontPx}px/${look.annotation.lineEm} var(--font-mono, ui-monospace, monospace)`,
    background: palette[look.titleBlock.fillRole],
    border: `1px solid ${palette[look.titleBlock.borderRole]}`,
    ...(columns > 1
      ? {
          display: 'grid',
          gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
          columnGap: look.annotation.padXPx * 2,
          alignContent: 'start',
        }
      : {}),
  };
}

export const BlueprintOverlay = forwardRef<BlueprintOverlayHandle, BlueprintOverlayProps>(
  function BlueprintOverlay(
    {
      project,
      layout,
      palette,
      tokens,
      target,
      phase,
      tour,
      focus,
      highlight,
      look,
      onTitleBlockShown,
    },
    ref,
  ) {
    const rootRef = useRef<HTMLDivElement>(null);
    const groupRef = useRef<HTMLDivElement>(null);
    const fadeAnimationRef = useRef<Animation | null>(null);
    const targetRef = useRef(target);
    const phaseRef = useRef(phase);
    const layoutRef = useRef(layout);
    const [settled, setSettled] = useState<SettledFrame | null>(null);
    const [moving, setMoving] = useState(false);

    useLayoutEffect(() => {
      targetRef.current = target;
    }, [target]);

    useLayoutEffect(() => {
      phaseRef.current = phase;
    }, [phase]);

    const setScroll = useCallback((offsetY: number) => {
      const group = groupRef.current;

      if (group !== null) group.style.transform = `translateY(${-offsetY}px)`;
    }, []);

    // A settled frame can arrive a frame before React commits the explode phase that
    // produced it; keep it pending and apply it once phase and target agree.
    const pendingRef = useRef<Omit<SettledFrame, 'target'> | null>(null);

    useLayoutEffect(() => {
      layoutRef.current = layout;
      pendingRef.current = null;
      fadeAnimationRef.current?.cancel();
      fadeAnimationRef.current = null;
      setSettled(null);

      if (rootRef.current !== null) rootRef.current.style.opacity = '0';
    }, [layout]);

    const applyPending = useCallback(() => {
      const pending = pendingRef.current;
      const settledPhase = phaseRef.current;

      if (pending === null) return;
      if (settledPhase !== 'imploded' && settledPhase !== 'exploded') return;
      if (settledPhase !== targetRef.current) return;

      pendingRef.current = null;
      setScroll(pending.offsetY);
      setMoving(false);
      setSettled({ ...pending, target: targetRef.current });
    }, [setScroll]);

    const update = useCallback(
      (event: OverlayEvent) => {
        if (event.kind === 'moving') {
          pendingRef.current = null;
          fadeAnimationRef.current?.cancel();
          fadeAnimationRef.current = null;

          if (rootRef.current !== null) rootRef.current.style.opacity = '0';

          setMoving(true);
          return;
        }

        pendingRef.current = {
          frame: event.frame,
          layout: layoutRef.current,
          width: event.width,
          height: event.height,
          offsetY: event.offsetY,
        };
        applyPending();
      },
      [applyPending],
    );

    useLayoutEffect(() => {
      applyPending();
    }, [applyPending, phase, target]);

    useImperativeHandle(ref, () => ({ update, setScroll }), [setScroll, update]);

    const layoutMatches = settled?.layout === layout;
    const visible = overlayVisible({
      moving,
      settledTarget: settled?.target ?? null,
      target,
      phase,
      layoutMatches,
    });

    const baseModel = useMemo<OverlayModel | null>(() => {
      if (settled === null) return null;

      return overlayBaseModel({
        frame: settled.frame,
        layout,
        project,
        viewport: { width: settled.width, height: settled.height },
        offsetY: settled.offsetY,
        target: settled.target,
        look,
      });
    }, [layout, look, project, settled]);

    const model = useMemo<OverlayModel | null>(() => {
      if (baseModel === null) return null;

      return overlayStateModel(baseModel, project, focus, tour, highlight, look);
    }, [baseModel, focus, highlight, look, project, tour]);

    const trace = useMemo<TraceModel | null>(() => {
      if (settled === null || !visible) return null;

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
    }, [look, project.flows, settled, tokens, tour.flowId, tour.status, tour.step, visible]);

    useLayoutEffect(() => {
      if (visible) return;

      fadeAnimationRef.current?.cancel();
      fadeAnimationRef.current = null;

      if (rootRef.current !== null) rootRef.current.style.opacity = '0';
    }, [visible]);

    useLayoutEffect(() => {
      if (settled === null || !visible) return;

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
    }, [settled, tokens, visible]);

    const shown = visible && model?.shown === true;
    const hidden = model?.hidden ?? 0;
    const transition = opacityTransition(tokens);
    const titleBlock = model?.titleBlock ?? null;
    const titleBlockShown = visible && titleBlock !== null;

    useLayoutEffect(() => {
      onTitleBlockShown?.(titleBlockShown);
    }, [onTitleBlockShown, titleBlockShown]);

    return (
      <div
        ref={rootRef}
        data-xploder-overlay={shown ? 'shown' : 'hidden'}
        data-xploder-callouts={shown ? (model?.calloutMode ?? 'none') : 'none'}
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
            {(visible ? (model?.strokes ?? []) : []).map((stroke) => (
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
            {visible ? (
              <CircuitTrace
                active={visible && settled !== null && tour.status !== 'idle'}
                step={tour.step}
                status={tour.status}
                model={trace}
                palette={palette}
                tokens={tokens}
                look={look}
              />
            ) : null}
          </svg>
          {(visible ? (model?.labels ?? []) : []).map((label) => (
            <span
              key={label.key}
              data-xploder-label={label.key}
              data-xploder-emphasis={label.emphasis === true ? 'true' : undefined}
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
          {!visible || titleBlock === null ? null : (
            <div data-xploder-titleblock-box="" style={titleBlockStyle(titleBlock, palette, look)}>
              <div
                style={{
                  color: palette[look.titleBlock.titleRole],
                  textTransform: 'uppercase',
                  gridColumn: titleBlock.columns > 1 ? '1 / -1' : undefined,
                }}
              >
                {titleBlock.title}
              </div>
              <div
                style={{
                  color: palette[look.titleBlock.metaRole],
                  gridColumn: titleBlock.columns > 1 ? '1 / -1' : undefined,
                }}
              >
                {titleBlock.meta}
              </div>
              {titleBlock.rows.map((row) => (
                <div
                  key={row.layerIndex}
                  style={{
                    color: palette[look.titleBlock.rowRole],
                    opacity: row.opacity,
                    ...(transition === undefined ? {} : { transition }),
                  }}
                >
                  {row.text}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  },
);
