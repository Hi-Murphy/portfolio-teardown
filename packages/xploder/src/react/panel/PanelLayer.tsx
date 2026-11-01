import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type RefObject,
} from 'react';

import { caseStudyModel, detailModel, type PanelProjectInput } from '../../panel/content';
import { PANEL_LOOK } from '../../panel/look';
import { panelMotion } from '../../panel/motion';
import {
  placePanel,
  visibleSlabRect,
  type Dock,
  type Placement,
  type Rect,
} from '../../panel/place';
import type { PanelState } from '../../panel/state';
import type { MotionTokens } from '../../motion';
import type { TechRegistry } from '../../schema/tech';
import type { Palette } from '../../theme';
import type { OverlayEvent } from '../scene/OverlayProjector';
import { CaseStudyPanel } from './CaseStudyPanel';
import { DetailPanel } from './DetailPanel';

export interface PanelLayerHandle {
  update(event: OverlayEvent): void;
  setScroll(offsetY: number): void;
}

export interface PanelHeadingIds {
  readonly detail: string;
  readonly caseStudy: string;
}

export interface PanelLayerProps {
  readonly state: PanelState;
  readonly project: PanelProjectInput;
  readonly registry?: TechRegistry;
  readonly palette: Palette;
  readonly tokens: MotionTokens;
  readonly wrapperRef: RefObject<HTMLDivElement | null>;
  readonly headingIds: PanelHeadingIds;
  readonly onClose: (reason: 'escape' | 'outside' | 'closeControl') => void;
}

type SettledEvent = Extract<OverlayEvent, { kind: 'settled' }>;

interface SurfaceState {
  readonly kind: 'detail' | 'caseStudy';
  readonly id: string;
  readonly placement: Placement;
  readonly slab: Rect | null;
  readonly key: string;
  readonly phase: 'enter' | 'exit';
  readonly animateEnter: boolean;
  readonly epoch: number;
}

interface Placed {
  readonly kind: 'detail' | 'caseStudy';
  readonly id: string;
  readonly placement: Placement;
  readonly slab: Rect | null;
}

function currentSize(placement: Placement | null): { dock: Dock; size: number } | null {
  return placement === null ? null : { dock: placement.dock, size: placement.size };
}

function surfaceKey(
  kind: 'detail' | 'caseStudy',
  id: string,
  placement: Placement,
  event: SettledEvent,
): string {
  return `${kind}:${id}:${placement.dock}:${Math.round(placement.size)}:${Math.round(event.width)}x${Math.round(event.height)}`;
}

function surfaceStyle(
  surface: SurfaceState,
  canvasHeight: number,
  palette: Palette,
): CSSProperties {
  const inset = PANEL_LOOK.insetPx;
  const sideMaxHeight = Math.max(0, canvasHeight - 2 * inset);
  const size = Math.max(0, surface.placement.size);
  const style: CSSProperties = {
    position: 'absolute',
    pointerEvents: surface.phase === 'exit' ? 'none' : 'auto',
    boxSizing: 'border-box',
    overflowY: 'auto',
    overscrollBehavior: 'contain',
    background: palette.surface,
    color: palette.ink,
    border: `1px solid ${palette.line}`,
    borderRadius: '0.25rem',
    padding: '0.75rem',
  };

  switch (surface.placement.dock) {
    case 'left':
      style.left = inset;
      style.top = inset;
      style.width = size;
      style.maxHeight = sideMaxHeight;
      break;
    case 'right':
      style.right = inset;
      style.top = inset;
      style.width = size;
      style.maxHeight = sideMaxHeight;
      break;
    case 'top':
      style.top = inset;
      style.left = inset;
      style.right = inset;
      style.maxHeight = size;
      break;
    case 'bottom':
      style.bottom = inset;
      style.left = inset;
      style.right = inset;
      style.maxHeight = size;
      break;
  }

  return style;
}

function writePanelAttributes(
  wrapper: HTMLDivElement | null,
  placement: Placement,
  slab: Rect | null,
): void {
  if (wrapper === null) return;

  wrapper.dataset.xploderPanelDock = placement.dock;
  wrapper.dataset.xploderPanelStage = String(placement.stage);
  wrapper.dataset.xploderPanelSlab =
    slab === null
      ? ''
      : [slab.left, slab.top, slab.right, slab.bottom].map((value) => value.toFixed(1)).join(' ');
}

function clearPanelAttributes(wrapper: HTMLDivElement | null): void {
  if (wrapper === null) return;

  delete wrapper.dataset.xploderPanelDock;
  delete wrapper.dataset.xploderPanelStage;
  delete wrapper.dataset.xploderPanelSlab;
  delete wrapper.dataset.xploderPanelReady;
}

export const PanelLayer = forwardRef<PanelLayerHandle, PanelLayerProps>(function PanelLayer(
  { state, project, registry, palette, tokens, wrapperRef, headingIds, onClose },
  ref,
) {
  const layerRef = useRef<HTMLDivElement>(null);
  const motionRef = useRef<HTMLDivElement>(null);
  const settledRef = useRef<SettledEvent | null>(null);
  const offsetRef = useRef(0);
  const stateRef = useRef(state);
  const surfaceRef = useRef<SurfaceState | null>(null);
  const lastPairRef = useRef<string | null>(null);
  const onCloseRef = useRef(onClose);
  const [settled, setSettled] = useState<SettledEvent | null>(null);
  const [moving, setMoving] = useState(false);
  const [surface, setSurface] = useState<SurfaceState | null>(null);

  const showSurface = useCallback((next: SurfaceState) => {
    surfaceRef.current = next;
    setSurface(next);
  }, []);

  const placeFor = useCallback(
    (
      currentState: PanelState,
      event: SettledEvent,
      offsetY: number,
      current: { dock: Dock; size: number } | null,
    ): Placed | null => {
      const canvas = { width: event.width, height: event.height };

      if (currentState.kind === 'closed') return null;

      if (currentState.kind === 'caseStudy') {
        return {
          kind: 'caseStudy',
          id: project.meta.slug,
          placement: placePanel({ canvas, slab: null, kind: 'caseStudy', current }),
          slab: null,
        };
      }

      const hull = event.frame.components.find(
        (component) => component.id === currentState.componentId,
      )?.hull;
      const slab = hull === undefined ? null : visibleSlabRect(hull, offsetY, canvas);

      return {
        kind: 'detail',
        id: currentState.componentId,
        placement: placePanel({ canvas, slab, kind: 'detail', current }),
        slab,
      };
    },
    [project.meta.slug],
  );

  useImperativeHandle(
    ref,
    () => ({
      update(event: OverlayEvent) {
        if (event.kind === 'moving') {
          const wrapper = wrapperRef.current;

          setMoving(true);
          if (wrapper !== null) {
            if (stateRef.current.kind === 'closed') {
              delete wrapper.dataset.xploderPanelReady;
            } else {
              wrapper.dataset.xploderPanelReady = 'false';
            }
          }
          return;
        }

        settledRef.current = event;
        offsetRef.current = event.offsetY;
        setMoving(false);
        setSettled(event);
      },
      setScroll(offsetY: number) {
        offsetRef.current = offsetY;

        const event = settledRef.current;
        const currentState = stateRef.current;
        const current = surfaceRef.current;

        if (event === null || currentState.kind === 'closed' || current === null) return;

        const placed = placeFor(currentState, event, offsetY, currentSize(current.placement));

        if (placed === null) return;

        writePanelAttributes(wrapperRef.current, placed.placement, placed.slab);

        if (
          placed.placement.dock === current.placement.dock &&
          Math.round(placed.placement.size) === Math.round(current.placement.size)
        ) {
          return;
        }

        showSurface({
          ...placed,
          key: surfaceKey(placed.kind, placed.id, placed.placement, event),
          phase: 'enter',
          animateEnter: false,
          epoch: current.epoch + 1,
        });
      },
    }),
    [placeFor, showSurface, wrapperRef],
  );

  useLayoutEffect(() => {
    stateRef.current = state;
  }, [state]);

  useLayoutEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useLayoutEffect(() => {
    const wrapper = wrapperRef.current;

    if (state.kind === 'closed') {
      clearPanelAttributes(wrapper);
      lastPairRef.current = null;

      const shown = surfaceRef.current;

      if (shown !== null && shown.phase !== 'exit') {
        showSurface({ ...shown, phase: 'exit', epoch: shown.epoch + 1 });
      }
      return;
    }

    if (settled === null) return;

    const placed = placeFor(state, settled, offsetRef.current, null);

    if (placed === null) return;

    writePanelAttributes(wrapper, placed.placement, placed.slab);

    const pair = `${placed.kind}:${placed.id}`;
    const animateEnter = pair !== lastPairRef.current;
    const previous = surfaceRef.current;

    lastPairRef.current = pair;
    showSurface({
      ...placed,
      key: surfaceKey(placed.kind, placed.id, placed.placement, settled),
      phase: 'enter',
      animateEnter,
      epoch: previous === null ? 1 : previous.epoch + 1,
    });
  }, [placeFor, settled, showSurface, state, wrapperRef]);

  const finishExit = useCallback((key: string) => {
    const current = surfaceRef.current;

    if (current === null || current.key !== key || current.phase !== 'exit') return;

    surfaceRef.current = null;
    setSurface(null);
  }, []);

  useLayoutEffect(() => {
    const element = motionRef.current;
    const wrapper = wrapperRef.current;
    const shown = surface;

    if (element === null || wrapper === null || shown === null) return;

    if (shown.phase === 'exit') {
      delete wrapper.dataset.xploderPanelReady;

      const motion = panelMotion(tokens, shown.placement.dock, 'exit');

      if (motion === null || typeof element.animate !== 'function') {
        finishExit(shown.key);
        return;
      }

      const animation = element.animate(motion.keyframes, motion.options);
      let active = true;

      animation.finished.then(
        () => {
          if (active) finishExit(shown.key);
        },
        () => {},
      );

      return () => {
        active = false;
        animation.cancel();
      };
    }

    wrapper.dataset.xploderPanelReady = 'false';

    const motion = shown.animateEnter ? panelMotion(tokens, shown.placement.dock, 'enter') : null;

    if (motion === null || typeof element.animate !== 'function') {
      wrapper.dataset.xploderPanelReady = 'true';
      return;
    }

    const animation = element.animate(motion.keyframes, motion.options);
    let active = true;

    animation.finished.then(
      () => {
        if (active) wrapper.dataset.xploderPanelReady = 'true';
      },
      () => {},
    );

    return () => {
      active = false;
      animation.cancel();
    };
  }, [finishExit, surface, tokens, wrapperRef]);

  useEffect(() => {
    if (state.kind === 'closed') return;

    // React may flush this effect while the opening click is still bubbling to `document`;
    // events created before the listeners existed never close the panel they opened.
    const listeningSince = performance.now();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.timeStamp < listeningSince) return;
      if (event.key !== 'Escape' || event.defaultPrevented) return;

      event.preventDefault();
      onCloseRef.current('escape');
    };

    const onClick = (event: MouseEvent) => {
      if (event.timeStamp < listeningSince) return;

      const wrapper = wrapperRef.current;
      const target = event.target as Node | null;

      if (wrapper === null || target === null) return;

      if (!wrapper.contains(target)) {
        onCloseRef.current('outside');
        return;
      }

      const stage = wrapper.querySelector('[data-xploder-stage]');
      const layer = layerRef.current;
      const insideStage = stage?.contains(target) ?? false;
      const insideLayer = layer?.contains(target) ?? false;

      if (!insideStage && !insideLayer) onCloseRef.current('outside');
    };

    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('click', onClick);

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('click', onClick);
    };
  }, [state.kind, wrapperRef]);

  const model = useMemo(
    () => (surface?.kind === 'detail' ? detailModel(project, surface.id, registry) : null),
    [project, registry, surface?.id, surface?.kind],
  );
  const caseStudy = useMemo(
    () => (surface?.kind === 'caseStudy' ? caseStudyModel(project) : null),
    [project, surface?.kind],
  );
  const caseStudyHeadingId = `${headingIds.caseStudy}-heading`;

  if (settled === null) return null;

  const layoutVisible = !moving && surface !== null && surface.placement.size >= 1;
  const layerStyle: CSSProperties = {
    position: 'absolute',
    top: 0,
    left: 0,
    width: settled.width,
    height: settled.height,
    pointerEvents: 'none',
    zIndex: PANEL_LOOK.zIndex,
    visibility: layoutVisible ? 'visible' : 'hidden',
  };

  return (
    <div ref={layerRef} data-xploder-panel-layer="" style={layerStyle}>
      {surface === null ? null : (
        <section
          key={surface.key}
          role="dialog"
          aria-modal="false"
          aria-labelledby={surface.kind === 'detail' ? headingIds.detail : caseStudyHeadingId}
          id={surface.kind === 'caseStudy' ? headingIds.caseStudy : undefined}
          data-xploder-panel-surface=""
          data-xploder-panel-dock={surface.placement.dock}
          data-xploder-panel-exiting={surface.phase === 'exit' ? '' : undefined}
          style={surfaceStyle(surface, settled.height, palette)}
          onKeyDown={(event) => {
            if (event.key !== 'Escape') event.stopPropagation();
          }}
        >
          <div ref={motionRef} data-xploder-panel-motion="">
            {surface.kind === 'detail' && model !== null ? (
              <DetailPanel
                model={model}
                palette={palette}
                headingId={headingIds.detail}
                onClose={() => onCloseRef.current('closeControl')}
              />
            ) : null}
            {surface.kind === 'caseStudy' && caseStudy !== null ? (
              <CaseStudyPanel
                model={caseStudy}
                palette={palette}
                headingId={caseStudyHeadingId}
                onClose={() => onCloseRef.current('closeControl')}
              />
            ) : null}
          </div>
        </section>
      )}
    </div>
  );
});
