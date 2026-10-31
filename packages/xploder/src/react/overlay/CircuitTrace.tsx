import { useLayoutEffect, useRef } from 'react';

import type { LookTokens } from '../../look/tokens';
import type { MotionTokens } from '../../motion';
import type { OverlayTourStatus, TraceModel } from '../../overlay/model';
import type { Vec2 } from '../../overlay/project';
import type { Palette } from '../../theme';

export interface CircuitTraceProps {
  readonly active: boolean;
  readonly step: number;
  readonly status: OverlayTourStatus;
  readonly model: TraceModel | null;
  readonly palette: Palette;
  readonly tokens: MotionTokens;
  readonly look: LookTokens;
}

function polylineLength(points: readonly Vec2[]): number {
  let total = 0;

  for (let index = 1; index < points.length; index += 1) {
    const from = points[index - 1];
    const to = points[index];

    if (from !== undefined && to !== undefined) {
      total += Math.hypot(to[0] - from[0], to[1] - from[1]);
    }
  }

  return total;
}

function geometryLength(element: SVGPolylineElement, points: readonly Vec2[]): number {
  try {
    const measured = element.getTotalLength();

    if (Number.isFinite(measured) && measured > 0) return measured;
  } catch {
    // Polyline geometry measurement is not available in every DOM implementation.
  }

  return polylineLength(points);
}

function pointsAttribute(points: readonly Vec2[]): string {
  return points.map((point) => point.join(',')).join(' ');
}

export function CircuitTrace({
  active,
  step,
  status,
  model,
  palette,
  tokens,
  look,
}: CircuitTraceProps) {
  const hopRef = useRef<SVGPolylineElement>(null);
  const dotRef = useRef<SVGPolylineElement>(null);
  const lastAnimatedStepRef = useRef<number | null>(null);

  useLayoutEffect(() => {
    const hop = hopRef.current;
    const dot = dotRef.current;
    const newestHop = model?.hops[model.hops.length - 1];
    const animations: Animation[] = [];
    let frame: number | null = null;

    if (!active || model === null || newestHop === undefined) return;

    const draw = model.draw;
    const length =
      hop === null ? polylineLength(newestHop.points) : geometryLength(hop, newestHop.points);
    const canAnimate = typeof hop?.animate === 'function';

    if (length <= 0) return;

    if (hop !== null) {
      if (draw !== null && lastAnimatedStepRef.current !== step) {
        if (canAnimate) {
          hop.style.strokeDasharray = String(length);
          hop.style.strokeDashoffset = String(length);
          const start = () => {
            lastAnimatedStepRef.current = step;
            animations.push(
              hop.animate([{ strokeDashoffset: length }, { strokeDashoffset: 0 }], {
                duration: draw.ms,
                delay: draw.delayMs,
                easing: tokens.easings.tourPulse.css,
                fill: 'both',
              }),
            );
          };

          if (typeof requestAnimationFrame === 'function') {
            frame = requestAnimationFrame(start);
          } else {
            start();
          }
        } else {
          lastAnimatedStepRef.current = step;
        }
      } else {
        hop.style.removeProperty('stroke-dasharray');
        hop.style.removeProperty('stroke-dashoffset');
      }
    }

    if (model.dot && dot !== null && typeof dot.animate === 'function' && model.dotPeriodMs > 0) {
      dot.style.strokeDasharray = `0 ${length}`;
      dot.style.strokeDashoffset = '0';
      animations.push(
        dot.animate([{ strokeDashoffset: 0 }, { strokeDashoffset: -length }], {
          duration: model.dotPeriodMs,
          easing: tokens.easings.tourPulse.css,
          iterations: Infinity,
        }),
      );
    }

    return () => {
      if (frame !== null) cancelAnimationFrame(frame);
      for (const animation of animations) animation.cancel();
    };
  }, [active, model, step, status, tokens]);

  if (!active || model === null || model.points.length === 0) return null;

  const newestHop = model.hops[model.hops.length - 1];
  const prefix =
    newestHop !== undefined
      ? model.points.slice(0, model.points.length - newestHop.points.length + 1)
      : [];
  const casingWidth = look.trace.strokePx + 2 * look.trace.casingPx;

  return (
    <g data-xploder-trace-group="" fill="none" strokeLinecap="round" strokeLinejoin="round">
      <polyline
        data-xploder-trace-casing=""
        points={pointsAttribute(model.points)}
        stroke={palette[look.trace.casingRole]}
        strokeWidth={casingWidth}
      />
      {newestHop !== undefined ? (
        <>
          {prefix.length >= 2 ? (
            <polyline
              data-xploder-trace-line=""
              points={pointsAttribute(prefix)}
              stroke={palette[look.trace.role]}
              strokeWidth={look.trace.strokePx}
            />
          ) : null}
          <polyline
            ref={hopRef}
            data-xploder-trace-hop=""
            points={pointsAttribute(newestHop.points)}
            stroke={palette[look.trace.role]}
            strokeWidth={look.trace.strokePx}
          />
        </>
      ) : (
        <polyline
          data-xploder-trace-line=""
          points={pointsAttribute(model.points)}
          stroke={palette[look.trace.role]}
          strokeWidth={look.trace.strokePx}
        />
      )}
      {model.pads.map((pad, index) => (
        <circle
          key={`${model.vertices[index] ?? index}`}
          data-xploder-trace-pad={model.vertices[index] ?? index}
          cx={pad[0]}
          cy={pad[1]}
          r={look.trace.padPx}
          fill={palette[look.trace.role]}
          stroke="none"
        />
      ))}
      {model.dot && newestHop !== undefined ? (
        <polyline
          ref={dotRef}
          data-xploder-trace-dot=""
          points={pointsAttribute(newestHop.points)}
          stroke={palette[look.trace.role]}
          strokeWidth={2 * look.trace.strokePx}
          strokeLinecap="round"
        />
      ) : null}
      {model.current === null ? null : (
        <circle
          data-xploder-trace-current=""
          cx={model.current[0]}
          cy={model.current[1]}
          r={look.trace.padPx}
          fill="none"
          stroke={palette[look.trace.role]}
          strokeWidth={look.trace.strokePx}
        />
      )}
    </g>
  );
}
