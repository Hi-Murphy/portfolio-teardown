// @vitest-environment jsdom

import { act, useEffect, type RefObject } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeAll, beforeEach, expect, test, vi } from 'vitest';
import { parseProject } from 'xploder';
import { createFakeClock, projectAJson } from 'xploder/fixtures';
import { fitZoom, layoutProject, VIEW } from 'xploder/layout';
import {
  TeardownViewer,
  useTeardownViewer,
  useViewerPanels,
  type TeardownViewerHandle,
  type ViewerPanelsHandle,
} from 'xploder/react';

import { panelsMetadataOf } from '../../../../packages/xploder/src/react/panel/useViewerPanels';
import { resolveViewerLayoutOptions } from '../../../../packages/xploder/src/look/product';
import { overlayFrame } from '../../../../packages/xploder/src/overlay/project';
import type { OverlayEvent } from '../../../../packages/xploder/src/react/scene/OverlayProjector';
import type { PickBridgeHandle } from '../../../../packages/xploder/src/react/scene/PickBridge';

vi.mock('../../../../packages/xploder/src/react/a11y/webgl', () => ({
  hasWebgl: () => true,
}));

vi.mock('@react-three/fiber', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@react-three/fiber')>();

  return { ...actual, Canvas: ({ children }: { children?: unknown }) => children };
});

const sceneCapture = vi.hoisted(() => ({ props: [] as Array<Record<string, unknown>> }));

vi.mock('../../../../packages/xploder/src/react/scene/Scene', () => ({
  Scene: (props: Record<string, unknown>) => {
    sceneCapture.props.push(props);
    return null;
  },
}));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const project = parseProject(projectAJson);
const layout = layoutProject(project, resolveViewerLayoutOptions());
const viewport = { width: 390, height: 844 } as const;
const view = {
  azimuth: VIEW.baseAzimuth,
  zoom: fitZoom(layout.bounds.exploded, viewport),
  ...viewport,
};
const frame = overlayFrame(layout, 1, view);
const A = 'beachgoer';
const B = 'tide-view-model';

interface SceneStubProps {
  readonly pickBridgeRef?: RefObject<PickBridgeHandle>;
  readonly onOverlay?: (event: OverlayEvent) => void;
  readonly onPhase?: (phase: 'imploded' | 'exploded') => void;
  readonly emphasis?: {
    readonly highlight?: string | null;
    readonly selected?: string | null;
  };
}

type ViewerClock = ReturnType<typeof createFakeClock>;
type CameraHandle = NonNullable<PickBridgeHandle['camera']>;

const IDENTITY = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1] as const;
const OBLIQUE = [1, 0, 0, 0, 0, 0.5, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1] as const;

interface ViewerCapture {
  readonly viewer: TeardownViewerHandle;
  readonly panels: ViewerPanelsHandle;
}

const viewerCapture: { current: ViewerCapture | null } = { current: null };

function ViewerHarness({ clock }: { readonly clock: ViewerClock }) {
  const viewer = useTeardownViewer({ project, clock, initial: 'exploded' });
  const panels = useViewerPanels();

  useEffect(() => {
    viewerCapture.current = { viewer, panels };
  }, [panels, viewer]);

  return <TeardownViewer project={project} viewer={viewer} panels={panels} />;
}

let root: Root | null = null;
let container: HTMLDivElement | null = null;
let clock: ViewerClock | null = null;

beforeAll(() => {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => undefined,
      removeListener: () => undefined,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      dispatchEvent: () => false,
    }),
  });
});

beforeEach(() => {
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => {
    throw new Error('jsdom canvas context is unavailable');
  });
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
  clock = createFakeClock();
  viewerCapture.current = null;
  sceneCapture.props.length = 0;
});

afterEach(async () => {
  await act(async () => root?.unmount());
  root = null;
  container?.remove();
  container = null;
  clock = null;
  viewerCapture.current = null;
  sceneCapture.props.length = 0;
  vi.restoreAllMocks();
});

function wrapper(): HTMLElement {
  if (container === null) throw new Error('test container was not mounted');

  const element = container.querySelector<HTMLElement>('[data-xploder-webgl]');

  if (element === null) throw new Error('viewer wrapper was not rendered');
  return element;
}

function capture(): ViewerCapture {
  if (viewerCapture.current === null) throw new Error('viewer handles were not captured');
  return viewerCapture.current;
}

function sceneProps(): SceneStubProps {
  const props = sceneCapture.props.at(-1);

  if (props === undefined) throw new Error('Scene was not rendered');
  return props as unknown as SceneStubProps;
}

function installBridge(camera: CameraHandle): void {
  const bridgeRef = sceneProps().pickBridgeRef;

  if (bridgeRef === undefined) throw new Error('Scene did not receive the pick bridge');

  bridgeRef.current = {
    camera,
    progress: new Float32Array(layout.layers.length + layout.components.length).fill(1),
    onFrame: null,
  };
}

function camera(): CameraHandle {
  return {
    matrixWorldInverse: { elements: IDENTITY },
    projectionMatrix: { elements: OBLIQUE },
    updateMatrixWorld() {},
  } as unknown as CameraHandle;
}

function settled(): OverlayEvent {
  return {
    kind: 'settled',
    at: 1,
    phase: 'exploded',
    frame,
    width: viewport.width,
    height: viewport.height,
    offsetY: 0,
  };
}

async function mount(): Promise<void> {
  const currentClock = clock;

  if (currentClock === null) throw new Error('test clock was not created');

  await act(async () => root?.render(<ViewerHarness clock={currentClock} />));
  installBridge(camera());
  await act(async () => sceneProps().onPhase?.('exploded'));
  await act(async () => sceneProps().onOverlay?.(settled()));
}

function proxy(id: string): HTMLButtonElement {
  if (container === null) throw new Error('test container was not mounted');

  const element = container.querySelector<HTMLButtonElement>(`[data-xploder-proxy="${id}"]`);

  if (element === null) throw new Error(`missing ${id} navigator proxy`);
  return element;
}

function emphasized(selector: string): string | null {
  if (container === null) throw new Error('test container was not mounted');

  const element = container.querySelector<HTMLElement>(selector);

  if (element === null) throw new Error(`missing ${selector}`);
  return element.getAttribute('data-xploder-emphasis-slot');
}

function label(id: string): string | null {
  return emphasized(`[data-xploder-label="part:${id}"]`);
}

function lettering(id: string): string | null {
  return emphasized(`[data-xploder-lettering="${id}"]`);
}

function columnRow(id: string): string | null {
  return emphasized(`[data-xploder-column-row="${id}"]`);
}

function viewed(): { highlight: string | null; selected: string | null } {
  return {
    highlight: wrapper().getAttribute('data-xploder-highlight'),
    selected: wrapper().getAttribute('data-xploder-selected'),
  };
}

function expectRow(
  slots: { readonly a: string | null; readonly b: string | null },
  viewedSlots: { readonly highlight: string | null; readonly selected: string | null },
): void {
  expect(label(A)).toBe(slots.a);
  expect(lettering(A)).toBe(slots.a);
  expect(columnRow(A)).toBe(slots.a);
  expect(label(B)).toBe(slots.b);
  expect(lettering(B)).toBe(slots.b);
  expect(columnRow(B)).toBe(slots.b);
  expect(viewed()).toEqual(viewedSlots);

  const emphasis = sceneProps().emphasis;

  expect({
    highlight: emphasis?.highlight ?? null,
    selected: emphasis?.selected ?? null,
  }).toEqual({ highlight: viewedSlots.highlight, selected: viewedSlots.selected });
}

async function move(hit: string | null): Promise<void> {
  await act(async () => capture().viewer.onPointerInput({ type: 'move', hit }));
}

async function leave(): Promise<void> {
  await act(async () => capture().viewer.onPointerInput({ type: 'leave' }));
}

async function open(id: string): Promise<void> {
  await act(async () => panelsMetadataOf(capture().panels).dispatch({ type: 'openDetail', id }));
}

async function closeWithControl(): Promise<void> {
  if (container === null) throw new Error('test container was not mounted');

  const control = container.querySelector<HTMLButtonElement>('[data-xploder-panel-close]');

  if (control === null) throw new Error('missing detail panel close control');
  await act(async () => control.click());
}

test('row 1: A open plus B hovered assigns selected and hover', async () => {
  await mount();
  await open(A);
  await move(B);

  expectRow({ a: 'selected', b: 'hover' }, { highlight: B, selected: A });
});

test('row 2: leaving B keeps A selected', async () => {
  await mount();
  await open(A);
  await move(B);
  await leave();

  expectRow({ a: 'selected', b: null }, { highlight: null, selected: A });
});

test('row 3: closing A with the pointer elsewhere clears both slots', async () => {
  await mount();
  await open(A);
  await closeWithControl();
  await move(null);

  expectRow({ a: null, b: null }, { highlight: null, selected: null });
});

test('row 4: closing A while hovering it keeps the hover slot', async () => {
  await mount();
  await move(A);
  await open(A);
  await closeWithControl();

  expectRow({ a: 'hover', b: null }, { highlight: A, selected: null });
});

test('row 5: keyboard focus on A without a panel fills both slots', async () => {
  await mount();
  await act(async () => proxy(A).focus());

  expectRow({ a: 'hover selected', b: null }, { highlight: A, selected: A });
});

test('row 6: keyboard focus on A plus B hover keeps focus as selected', async () => {
  await mount();
  await act(async () => proxy(A).focus());
  await move(B);

  expectRow({ a: 'selected', b: 'hover' }, { highlight: B, selected: A });
});
