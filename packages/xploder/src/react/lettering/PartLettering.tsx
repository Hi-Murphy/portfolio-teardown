import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useLayoutEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type RefObject,
} from 'react';
import { Vector3 } from 'three';

import type { Phase } from '../../engine/explode';
import { labelPass } from '../../labels/pass';
import type { LabelPassResult } from '../../labels/types';
import type { ProjectLayout } from '../../layout';
import { compactColumnTextScale, type CompactColumn } from '../../lettering/column';
import type { LayerLettering } from '../../lettering/layers';
import { LETTERING_LOOK } from '../../lettering/look';
import type { ComponentLettering } from '../../lettering/model';
import type { LookTokens } from '../../look/tokens';
import { emphasis } from '../../motion/emphasis';
import type { MotionTokens } from '../../motion';
import { overlayTiming } from '../../overlay/timing';
import type { Palette } from '../../theme';
import { snapshotFaces, stageExtent } from '../labels/faces';
import type { OverlayEvent } from '../scene/OverlayProjector';
import type { PickBridgeHandle } from '../scene/PickBridge';
import type { TeardownTarget, TourStatus, ViewerProject } from '../useTeardownViewer';

export const LETTERING_TAG_HIDE_CSS =
  '[data-xploder-lettering-on] [data-xploder-callouts="tags"] [data-xploder-label^="part:"]{visibility:hidden}';
export const LETTERING_HIDE_CSS = LETTERING_TAG_HIDE_CSS;

// S6 layer labels are hidden per layer, only where the plate lettering succeeded, so S6's
// collision-free label stays as the fallback for a layer whose plate has no room (G2 round 3).
function layerHideCss(scope: string, layerIds: readonly string[]): string {
  return layerIds
    .map(
      (id) =>
        `[data-xploder-lettering-scope="${scope}"] [data-xploder-label="layer:${id.replace(/["\\]/g, '')}"]{visibility:hidden}`,
    )
    .join('');
}

export interface PartLetteringHandle {
  update(event: OverlayEvent, result?: LabelPassResult): void;
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
  readonly zoomFactor?: number;
}

interface SettledLettering {
  readonly items: readonly ComponentLettering[];
  readonly column: CompactColumn | null;
  readonly layerLabels: readonly LayerLettering[];
  readonly layersShown: boolean;
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

function layerIdsByComponent(layout: ProjectLayout): ReadonlyMap<string, string> {
  return new Map(layout.components.map((component) => [component.id, component.layerId]));
}

function layerIdsByIndex(layout: ProjectLayout): ReadonlyMap<number, string> {
  return new Map(layout.layers.map((layer) => [layer.index, layer.id]));
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
      zoomFactor = 1,
    },
    ref,
  ) {
    const rootRef = useRef<HTMLDivElement>(null);
    const groupRef = useRef<HTMLDivElement>(null);
    const offsetRef = useRef(0);
    const fadeAnimationRef = useRef<Animation | null>(null);
    const vector = useMemo(() => new Vector3(), []);
    const layerIds = useMemo(() => layerIdsByComponent(layout), [layout]);
    const scope = useId();
    const layerIdsByLayerIndex = useMemo(() => layerIdsByIndex(layout), [layout]);
    const zoomFactorRef = useRef(zoomFactor);
    const [settled, setSettled] = useState<SettledLettering | null>(null);
    const [moving, setMoving] = useState(false);

    const setScroll = useCallback((offsetY: number) => {
      offsetRef.current = offsetY;

      const group = groupRef.current;

      if (group !== null) group.style.transform = `translateY(${-offsetY}px)`;
    }, []);

    const update = useCallback(
      (event: OverlayEvent, result?: LabelPassResult) => {
        if (event.kind === 'moving') {
          fadeAnimationRef.current?.cancel();
          fadeAnimationRef.current = null;

          if (rootRef.current !== null) rootRef.current.style.opacity = '0';

          setMoving(true);
          return;
        }

        const pass =
          result ??
          labelPass({
            frame: event.frame,
            faces: snapshotFaces(bridgeRef.current, layout, event, vector),
            viewport: { width: event.width, height: event.height },
            offsetY: event.offsetY,
            extentPx: stageExtent(wrapperRef.current),
            zoomFactor: zoomFactorRef.current,
            target,
            layout,
            project,
            look,
          });

        if (pass.lettering === null) {
          setMoving(false);
          return;
        }

        offsetRef.current = event.offsetY;
        setScroll(event.offsetY);
        setMoving(false);
        setSettled({
          ...pass.lettering,
          width: event.width,
          height: event.height,
        });
      },
      [bridgeRef, layout, look, project, setScroll, target, vector, wrapperRef],
    );

    useImperativeHandle(ref, () => ({ update, setScroll }), [setScroll, update]);

    useLayoutEffect(() => {
      zoomFactorRef.current = zoomFactor;
    }, [zoomFactor]);

    const items = settled?.items ?? [];
    const column = settled?.column ?? null;
    const visible =
      target === 'exploded' &&
      phase === 'exploded' &&
      tourStatus === 'idle' &&
      !moving &&
      items.length > 0;
    const columnShown = visible && column !== null;
    const layerLabelsShown = visible && settled?.layersShown === true;
    const markCount = items.filter((item) => item.lettering.kind === 'mark').length;
    const layerFaceIds = layerLabelsShown
      ? (settled?.layerLabels ?? [])
          .filter((label) => label.kind === 'face')
          .map((label) => label.id)
      : [];

    useLayoutEffect(() => {
      const wrapper = wrapperRef.current;

      if (wrapper === null) return;

      wrapper.dataset.xploderLettering = visible ? 'shown' : 'hidden';
      wrapper.dataset.xploderLetteringCount = String(items.length);
      wrapper.dataset.xploderLetteringMarks = String(markCount);
      wrapper.dataset.xploderLetteringColumn = columnShown ? 'shown' : 'hidden';

      wrapper.dataset.xploderLetteringScope = scope;
      wrapper.dataset.xploderLetteringLayers = String(layerFaceIds.length);
    }, [columnShown, items.length, layerFaceIds.length, markCount, scope, visible, wrapperRef]);

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
    const layerOpacityByIndex = (index: number): number => {
      const layerId = layerIdsByLayerIndex.get(index);

      return focus.layerId !== null && !focus.suspended && layerId !== focus.layerId
        ? emphasis.dim.level
        : 1;
    };
    const numberColor = (id: string): string =>
      highlight === id ? palette[look.callouts.emphasisRole] : palette[look.annotation.partRole];
    const faceNumberColor = (id: string): string =>
      highlight === id ? palette.ink : palette[look.annotation.partRole];
    const faceNameColor = (id: string): string =>
      highlight === id ? palette.ink : palette[look.annotation.textRole] || palette.label;

    return (
      <div ref={rootRef} data-xploder-lettering-layer="" aria-hidden="true" style={ROOT_STYLE}>
        {layerFaceIds.length === 0 ? null : <style>{layerHideCss(scope, layerFaceIds)}</style>}
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
          {columnShown
            ? column.rows.map((row) => {
                const opacity = layerOpacityByIndex(row.layerIndex);
                const emphasized = highlight === row.id;
                const nameColor = emphasized ? palette[look.callouts.emphasisRole] : palette.label;
                const firstLine = row.lines[0] ?? row.number;
                const firstRemainder = firstLine.startsWith(row.number)
                  ? firstLine.slice(row.number.length)
                  : firstLine;
                const rowWidth =
                  settled?.width === undefined
                    ? 0
                    : Math.max(0, settled.width - LETTERING_LOOK.columnInsetPx - column.x);
                const scale = compactColumnTextScale(row.lines, rowWidth, LETTERING_LOOK);

                return (
                  <div
                    key={row.id}
                    data-xploder-column-row={row.id}
                    data-xploder-column-layer={row.layerIndex}
                    style={{
                      position: 'absolute',
                      left: column.x,
                      top: row.y,
                      width: settled?.width === undefined ? undefined : rowWidth,
                      height: row.h,
                      pointerEvents: 'auto',
                      userSelect: 'text',
                      whiteSpace: 'pre',
                      font: `${LETTERING_LOOK.compactColumnPx}px/${LETTERING_LOOK.lineEm} ${MONO_FONT}`,
                      opacity,
                      ...(transition === undefined ? {} : { transition }),
                    }}
                  >
                    <div
                      style={{
                        width: scale <= 0 ? rowWidth : rowWidth / scale,
                        transform: `scaleX(${scale})`,
                        transformOrigin: '0 0',
                      }}
                    >
                      <div>
                        <span
                          style={{
                            fontWeight: 600,
                            color: emphasized
                              ? palette[look.callouts.emphasisRole]
                              : palette[look.annotation.partRole],
                          }}
                        >
                          {row.number}
                        </span>
                        <span style={{ color: nameColor, textTransform: 'uppercase' }}>
                          {firstRemainder}
                        </span>
                      </div>
                      {row.lines.slice(1).map((line, index) => (
                        <div
                          key={`${row.id}-line-${index}`}
                          style={{ color: nameColor, textTransform: 'uppercase' }}
                        >
                          {line}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })
            : null}
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
                  color: faceNumberColor(item.id),
                  borderColor: numberColor(item.id),
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
                          color: faceNameColor(item.id),
                        }}
                      >
                        {line}
                      </div>
                    ))}
              </div>
            );
          })}
          {layerLabelsShown
            ? (settled?.layerLabels ?? []).map((label) => {
                const opacity = layerOpacityByIndex(label.layerIndex);
                const common = {
                  position: 'absolute' as const,
                  overflow: 'hidden',
                  pointerEvents: 'auto' as const,
                  userSelect: 'text' as const,
                  whiteSpace: 'nowrap' as const,
                  font: `${label.fontPx}px/${LETTERING_LOOK.lineEm} ${MONO_FONT}`,
                  color: palette[look.annotation.textRole],
                  textTransform: 'uppercase' as const,
                  opacity,
                  ...(transition === undefined ? {} : { transition }),
                };

                if (label.kind === 'face') {
                  return (
                    <div
                      key={`layer-label:${label.id}`}
                      data-xploder-lettering-layer-label={label.id}
                      data-xploder-lettering-layer-kind="face"
                      style={{
                        ...common,
                        left: 0,
                        top: 0,
                        width: label.w,
                        height: label.h,
                        transformOrigin: '0 0',
                        transform: `matrix(${label.matrix.join(',')})`,
                      }}
                    >
                      {label.text}
                    </div>
                  );
                }

                return null;
              })
            : null}
        </div>
      </div>
    );
  },
);
