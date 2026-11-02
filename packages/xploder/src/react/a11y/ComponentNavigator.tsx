import {
  forwardRef,
  useImperativeHandle,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type RefObject,
} from 'react';

import { REVEAL_MARGIN_PX } from '../../a11y/look';
import { navigatorItems, navigatorKey, type NavigatorProject } from '../../a11y/navigator';
import { revealScrollTop } from '../../a11y/reveal';
import type { Vec2 } from '../../overlay/project';
import type { Palette } from '../../theme';
import type { OverlayEvent } from '../scene/OverlayProjector';

export interface ComponentNavigatorHandle {
  update(event: OverlayEvent): void;
  setScroll(offsetY: number): void;
}

export interface ComponentNavigatorProps {
  readonly project: NavigatorProject;
  readonly palette: Palette;
  readonly stageRef: RefObject<HTMLDivElement | null>;
  readonly highlight: string | null;
  readonly detailOpenId: string | null;
  readonly detailId: string;
  readonly onHighlight: (id: string | null) => void;
  readonly onActivate: (id: string, proxy: HTMLButtonElement) => void;
}

type SettledEvent = Extract<OverlayEvent, { kind: 'settled' }>;

interface FrameView {
  readonly event: SettledEvent;
  readonly offsetY: number;
}

interface ProxyRect {
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
}

const EMPTY_PROXY_RECT: ProxyRect = { left: 0, top: 0, width: 1, height: 1 };

const NAVIGATOR_STYLE: CSSProperties = {
  position: 'absolute',
  top: 0,
  left: 0,
  pointerEvents: 'none',
};

const LIST_STYLE: CSSProperties = {
  listStyle: 'none',
  margin: 0,
  padding: 0,
};

function proxyRect(hull: readonly Vec2[] | undefined, offsetY: number): ProxyRect {
  if (hull === undefined || hull.length === 0) return EMPTY_PROXY_RECT;

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const [x, y] of hull) {
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  }

  return {
    left: minX,
    top: minY - offsetY,
    width: Math.max(1, maxX - minX),
    height: Math.max(1, maxY - minY),
  };
}

function proxyStyle(rect: ProxyRect): CSSProperties {
  return {
    position: 'absolute',
    left: rect.left,
    top: rect.top,
    width: rect.width,
    height: rect.height,
    opacity: 0,
    pointerEvents: 'none',
    border: 0,
    margin: 0,
    padding: 0,
    background: 'transparent',
    color: 'transparent',
  };
}

function hullPoints(hull: readonly Vec2[] | undefined, offsetY: number): string | null {
  if (hull === undefined || hull.length < 3) return null;

  return hull.map(([x, y]) => `${x},${y - offsetY}`).join(' ');
}

export const ComponentNavigator = forwardRef<ComponentNavigatorHandle, ComponentNavigatorProps>(
  function ComponentNavigator(
    { project, palette, stageRef, highlight, detailOpenId, detailId, onHighlight, onActivate },
    ref,
  ) {
    const rootRef = useRef<HTMLDivElement>(null);
    const buttonsRef = useRef<Array<HTMLButtonElement | null>>([]);
    const idPrefix = useId();
    const [view, setView] = useState<FrameView | null>(null);
    const [moving, setMoving] = useState(false);
    const [activeIndex, setActiveIndex] = useState(0);
    const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
    const items = useMemo(() => navigatorItems(project), [project]);
    const groups = useMemo(() => {
      const grouped = new Map<
        string,
        {
          layerId: string;
          layerName: string;
          entries: Array<{ index: number; item: (typeof items)[number] }>;
        }
      >();

      items.forEach((item, index) => {
        const group = grouped.get(item.layerId);

        if (group === undefined) {
          grouped.set(item.layerId, {
            layerId: item.layerId,
            layerName: item.layerName,
            entries: [{ index, item }],
          });
        } else {
          group.entries.push({ index, item });
        }
      });

      return [...grouped.values()];
    }, [items]);
    const frameById = useMemo(
      () =>
        new Map(
          view === null
            ? []
            : view.event.frame.components.map((component) => [component.id, component] as const),
        ),
      [view],
    );

    useImperativeHandle(
      ref,
      () => ({
        update(event: OverlayEvent) {
          if (event.kind === 'moving') {
            setMoving(true);
            return;
          }

          setMoving(false);
          setView({ event, offsetY: event.offsetY });
        },
        setScroll(offsetY: number) {
          setView((current) => (current === null ? null : { ...current, offsetY }));
        },
      }),
      [],
    );

    useLayoutEffect(() => {
      setActiveIndex(0);
      setFocusedIndex(null);

      if (rootRef.current?.contains(document.activeElement) === true) {
        buttonsRef.current[0]?.focus();
      }
    }, [project]);

    function moveTo(index: number) {
      setActiveIndex(index);
      buttonsRef.current[index]?.focus();
    }

    function reveal(itemIndex: number) {
      const stage = stageRef.current;
      const current = view;

      if (stage === null || current === null || moving) return;

      const item = items[itemIndex];
      const hull = item === undefined ? undefined : frameById.get(item.id)?.hull;

      if (hull === undefined) return;

      const next = revealScrollTop({
        hull,
        offsetY: current.offsetY,
        canvasHeight: current.event.height,
        scrollTop: stage.scrollTop,
        extent: Math.max(0, stage.scrollHeight - stage.clientHeight),
        marginPx: REVEAL_MARGIN_PX,
      });

      if (next === null) return;

      stage.scrollTop = next;
      stage.dispatchEvent(new Event('scroll'));
    }

    function onKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
      const action = navigatorKey(event.key, index, items.length);

      if (action === null) return;

      event.preventDefault();
      event.stopPropagation();

      if (action.type === 'move') {
        moveTo(action.index);
        return;
      }

      const item = items[index];

      if (item !== undefined) onActivate(item.id, event.currentTarget);
    }

    const activeItem = items[activeIndex];
    const activeFrame = activeItem === undefined ? undefined : frameById.get(activeItem.id);
    const ring =
      moving ||
      activeItem === undefined ||
      focusedIndex !== activeIndex ||
      activeFrame === undefined
        ? null
        : hullPoints(activeFrame.hull, view?.offsetY ?? 0);

    return (
      <div
        ref={rootRef}
        data-xploder-navigator=""
        role="group"
        aria-label="Components"
        style={{
          ...NAVIGATOR_STYLE,
          width: view?.event.width ?? 0,
          height: view?.event.height ?? 0,
        }}
      >
        {ring === null || view === null ? null : (
          <svg
            data-xploder-focus-ring=""
            aria-hidden="true"
            width={view.event.width}
            height={view.event.height}
            viewBox={`0 0 ${view.event.width} ${view.event.height}`}
            style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
          >
            <polygon
              points={ring}
              fill="none"
              stroke={palette.accent}
              strokeWidth={2}
              vectorEffect="non-scaling-stroke"
            />
          </svg>
        )}

        {groups.map((group) => (
          <ul key={group.layerId} aria-label={group.layerName} style={LIST_STYLE}>
            {group.entries.map(({ index, item }) => {
              const frame = frameById.get(item.id);
              const rect = proxyRect(frame?.hull, view?.offsetY ?? 0);
              const expanded = detailOpenId === item.id;
              const descriptionId = `${idPrefix}-${item.id}-desc`;

              return (
                <li key={item.id}>
                  <button
                    ref={(element) => {
                      buttonsRef.current[index] = element;
                    }}
                    type="button"
                    data-xploder-proxy={item.id}
                    tabIndex={index === activeIndex ? 0 : -1}
                    aria-haspopup="dialog"
                    aria-expanded={expanded}
                    aria-controls={expanded ? detailId : undefined}
                    aria-describedby={descriptionId}
                    style={proxyStyle(rect)}
                    onClick={(event) => onActivate(item.id, event.currentTarget)}
                    onKeyDown={(event) => onKeyDown(event, index)}
                    onFocus={() => {
                      setActiveIndex(index);
                      setFocusedIndex(index);
                      onHighlight(item.id);
                      reveal(index);
                    }}
                    onBlur={() => {
                      setFocusedIndex(null);

                      if (highlight === item.id && detailOpenId !== item.id) onHighlight(null);
                    }}
                  >
                    {item.name}
                  </button>
                  <span id={descriptionId} hidden>
                    Item {item.itemNumber}, {item.layerName} layer, {item.kind}
                  </span>
                </li>
              );
            })}
          </ul>
        ))}
      </div>
    );
  },
);
