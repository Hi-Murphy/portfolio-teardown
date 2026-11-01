import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type RefObject,
} from 'react';
import { Vector3 } from 'three';

import type { Phase } from '../../engine/explode';
import type { ProjectLayout } from '../../layout';
import { topFaceQuad } from '../../lettering/faces';
import { LETTERING_LOOK } from '../../lettering/look';
import { letteringModel, type ComponentLettering } from '../../lettering/model';
import type { LookTokens } from '../../look/tokens';
import { emphasis } from '../../motion/emphasis';
import type { MotionTokens } from '../../motion';
import { overlayTiming } from '../../overlay/timing';
import type { Palette } from '../../theme';
import type { OverlayEvent } from '../scene/OverlayProjector';
import type { PickBridgeHandle } from '../scene/PickBridge';
import type { TeardownTarget, TourStatus, ViewerProject } from '../useTeardownViewer';

export const LETTERING_TAG_HIDE_CSS =
  '[data-xploder-lettering-on] [data-xploder-callouts="tags"] [data-xploder-label^="part:"]{visibility:hidden}';

export interface PartLetteringHandle {
  update(event: OverlayEvent): void;
  setScroll(offsetY: number): void;
}

export interface PartLetteringProps {
  readonly layout: ProjectLayout;
  readonly project: ViewerProject;
  readonly palette: Palette;
  readonly tokens: MotionTokens;
  readonly look: LookTokens;
  readonly bridgeRef: RefObject<PickBridgeHandle>;
  readonly target: TeardownTarget;
  readonly phase: Phase | null;
  readonly tourStatus: TourStatus;
  readonly focus: { readonly layerId: string | null; readonly suspended: boolean };
  readonly highlight: string | null;
  readonly wrapperRef: RefObject<HTMLDivElement | null>;
}

interface SettledLettering {
  readonly items: readonly ComponentLettering[];
  readonly width: number;
  readonly height: number;
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

const MONO_FONT = 'var(--font-mono, ui-monospace, monospace)';

function opacityTransition(tokens: MotionTokens): string | undefined {
  const { fadeMs } = overlayTiming(tokens);

  return fadeMs <= 0 ? undefined : `opacity ${fadeMs}ms ${tokens.easings.hover.css}`;
}

function componentNames(project: ViewerProject): ReadonlyMap<string, string> {
  const names = new Map<string, string>();

  for (const layer of project.layers) {
    for (const component of layer.components) {
      names.set(component.id, component.name ?? component.id);
    }
  }

  return names;
}

function layerIdsByComponent(layout: ProjectLayout): ReadonlyMap<string, string> {
  return new Map(layout.components.map((component) => [component.id, component.layerId]));
}

export const PartLettering = forwardRef<PartLetteringHandle, PartLetteringProps>(
  function PartLettering(
    {
      layout,
      project,
      palette,
      tokens,
      look,
      bridgeRef,
      target,
      phase,
      tourStatus,
      focus,
      highlight,
      wrapperRef,
    },
    ref,
  ) {
    const rootRef = useRef<HTMLDivElement>(null);
    const groupRef = useRef<HTMLDivElement>(null);
    const offsetRef = useRef(0);
    const fadeAnimationRef = useRef<Animation | null>(null);
    const vector = useMemo(() => new Vector3(), []);
    const names = useMemo(() => componentNames(project), [project]);
    const layerIds = useMemo(() => layerIdsByComponent(layout), [layout]);
    const [settled, setSettled] = useState<SettledLettering | null>(null);
    const [moving, setMoving] = useState(false);

    const setScroll = useCallback((offsetY: number) => {
      offsetRef.current = offsetY;

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

        const bridge = bridgeRef.current;
        const camera = bridge.camera;
        const progress = bridge.progress;

        if (camera === null || progress === null) {
          setMoving(false);
          return;
        }

        camera.updateMatrixWorld(true);

        const projectPoint = (point: readonly [number, number, number]) => {
          const ndc = vector.set(point[0], point[1], point[2]).project(camera);

          return [
            ((ndc.x + 1) * event.width) / 2,
            ((1 - ndc.y) * event.height) / 2 + event.offsetY,
          ] as const;
        };
        const components = layout.components.map((component, index) => {
          const frameComponent = event.frame.components[index];

          if (frameComponent === undefined) {
            throw new Error(`Missing overlay component ${component.id}`);
          }

          return {
            id: component.id,
            layerIndex: component.layerIndex,
            slot: component.slot,
            quad: topFaceQuad(component, progress[layout.layers.length + index] ?? 0, projectPoint),
            hull: frameComponent.hull,
          };
        });
        const items = letteringModel({
          layout,
          components,
          layers: event.frame.layers,
          names,
        });

        offsetRef.current = event.offsetY;
        setScroll(event.offsetY);
        setMoving(false);
        setSettled({ items, width: event.width, height: event.height });
      },
      [bridgeRef, layout, names, setScroll, vector],
    );

    useImperativeHandle(ref, () => ({ update, setScroll }), [setScroll, update]);

    const items = settled?.items ?? [];
    const visible =
      target === 'exploded' &&
      phase === 'exploded' &&
      tourStatus === 'idle' &&
      !moving &&
      items.length > 0;
    const markCount = items.filter((item) => item.lettering.kind === 'mark').length;

    useLayoutEffect(() => {
      const wrapper = wrapperRef.current;

      if (wrapper === null) return;

      wrapper.dataset.xploderLettering = visible ? 'shown' : 'hidden';
      wrapper.dataset.xploderLetteringCount = String(items.length);
      wrapper.dataset.xploderLetteringMarks = String(markCount);
    }, [items.length, markCount, visible, wrapperRef]);

    useLayoutEffect(() => {
      const root = rootRef.current;

      if (root === null) return;

      fadeAnimationRef.current?.cancel();
      fadeAnimationRef.current = null;
      root.style.opacity = '0';

      if (!visible) return;

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

    const transition = opacityTransition(tokens);
    const layerOpacity = (id: string): number =>
      focus.layerId !== null && !focus.suspended && layerIds.get(id) !== focus.layerId
        ? emphasis.dim.level
        : 1;
    const numberColor = (id: string): string =>
      highlight === id ? palette[look.callouts.emphasisRole] : palette[look.annotation.partRole];

    return (
      <div ref={rootRef} data-xploder-lettering-layer="" style={ROOT_STYLE}>
        <div
          ref={groupRef}
          style={{ ...GROUP_STYLE, transform: `translateY(${-offsetRef.current}px)` }}
        >
          <svg
            aria-hidden="true"
            width={settled?.width ?? 0}
            height={settled?.height ?? 0}
            viewBox={`0 0 ${settled?.width ?? 0} ${settled?.height ?? 0}`}
            style={SVG_STYLE}
          >
            {items.map((item) => {
              const lettering = item.lettering;

              if (lettering.kind !== 'mark') return null;

              const [a, b, c, d, e, f] = lettering.matrix;
              const centerX = e + (lettering.box.w * a) / 2 + (lettering.box.h * c) / 2;
              const centerY = f + (lettering.box.w * b) / 2 + (lettering.box.h * d) / 2;

              return (
                <line
                  key={item.id}
                  data-xploder-lettering-leader={item.id}
                  x1={lettering.anchor[0]}
                  y1={lettering.anchor[1]}
                  x2={centerX}
                  y2={centerY}
                  stroke={palette.steel}
                  strokeWidth={1}
                  vectorEffect="non-scaling-stroke"
                  opacity={layerOpacity(item.id)}
                  style={transition === undefined ? undefined : { transition }}
                />
              );
            })}
          </svg>
          {items.map((item) => {
            const lettering = item.lettering;
            const opacity = layerOpacity(item.id);
            const color = numberColor(item.id);

            if (lettering.kind === 'mark') {
              return (
                <div
                  key={item.id}
                  data-xploder-lettering={item.id}
                  data-xploder-lettering-kind="mark"
                  style={{
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    width: lettering.box.w,
                    height: lettering.box.h,
                    transformOrigin: '0 0',
                    transform: `matrix(${lettering.matrix.join(',')})`,
                    pointerEvents: 'auto',
                    userSelect: 'text',
                    whiteSpace: 'nowrap',
                    font: `600 ${lettering.numberPx}px/${LETTERING_LOOK.lineEm} ${MONO_FONT}`,
                    color,
                    opacity,
                    ...(transition === undefined ? {} : { transition }),
                  }}
                >
                  {item.number}
                </div>
              );
            }

            return (
              <div
                key={item.id}
                data-xploder-lettering={item.id}
                data-xploder-lettering-kind="face"
                style={{
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  width: lettering.box.w,
                  height: lettering.box.h,
                  transformOrigin: '0 0',
                  transform: `matrix(${lettering.matrix.join(',')})`,
                  pointerEvents: 'auto',
                  userSelect: 'text',
                  whiteSpace: 'nowrap',
                  font: `600 ${lettering.numberPx}px/${LETTERING_LOOK.lineEm} ${MONO_FONT}`,
                  color,
                  opacity,
                  ...(transition === undefined ? {} : { transition }),
                }}
              >
                {item.number}
                {lettering.namePx === null
                  ? null
                  : lettering.nameLines.map((line, index) => (
                      <div
                        key={`${item.id}-name-${index}`}
                        style={{
                          font: `${lettering.namePx}px/${LETTERING_LOOK.lineEm} ${MONO_FONT}`,
                          textTransform: 'uppercase',
                          color: palette[look.annotation.textRole] || palette.label,
                        }}
                      >
                        {line}
                      </div>
                    ))}
              </div>
            );
          })}
        </div>
      </div>
    );
  },
);
