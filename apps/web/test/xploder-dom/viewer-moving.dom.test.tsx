// @vitest-environment jsdom

import { act, forwardRef, useEffect, useImperativeHandle, type Ref } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeAll, beforeEach, expect, test, vi } from 'vitest';
import { parseProject } from 'xploder';
import { createFakeClock, projectAJson } from 'xploder/fixtures';
import { TeardownViewer, useTeardownViewer, type TeardownViewerHandle } from 'xploder/react';

import type { OverlayEvent } from '../../../../packages/xploder/src/react/scene/OverlayProjector';

interface OverlayHandleStub {
  update(event: OverlayEvent): void;
  setScroll(offsetY: number): void;
}

const records = vi.hoisted(() => ({
  blueprint: [] as OverlayEvent[],
  lettering: [] as OverlayEvent[],
  panel: [] as OverlayEvent[],
  navigator: [] as OverlayEvent[],
}));

function useRecorder(ref: Ref<OverlayHandleStub>, events: OverlayEvent[]): void {
  useImperativeHandle(
    ref,
    () => ({
      update(event) {
        events.push(event);
      },
      setScroll() {},
    }),
    [events],
  );
}

vi.mock('../../../../packages/xploder/src/react/a11y/webgl', () => ({
  hasWebgl: () => true,
}));

vi.mock('@react-three/fiber', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@react-three/fiber')>();

  return { ...actual, Canvas: () => null };
});

vi.mock('../../../../packages/xploder/src/react/overlay/BlueprintOverlay', () => ({
  BlueprintOverlay: forwardRef<OverlayHandleStub>(function BlueprintOverlayStub(_props, ref) {
    useRecorder(ref, records.blueprint);
    return null;
  }),
}));

vi.mock('../../../../packages/xploder/src/react/lettering/PartLettering', () => ({
  LETTERING_HIDE_CSS: '',
  PartLettering: forwardRef<OverlayHandleStub>(function PartLetteringStub(_props, ref) {
    useRecorder(ref, records.lettering);
    return null;
  }),
}));

vi.mock('../../../../packages/xploder/src/react/panel/PanelLayer', () => ({
  PanelLayer: forwardRef<OverlayHandleStub>(function PanelLayerStub(_props, ref) {
    useRecorder(ref, records.panel);
    return null;
  }),
}));

vi.mock('../../../../packages/xploder/src/react/a11y/ComponentNavigator', () => ({
  ComponentNavigator: forwardRef<OverlayHandleStub>(function ComponentNavigatorStub(_props, ref) {
    useRecorder(ref, records.navigator);
    return null;
  }),
}));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const project = parseProject(projectAJson);
const componentId = 'tide-view-model';

type ViewerClock = ReturnType<typeof createFakeClock>;

const viewerCapture: { current: TeardownViewerHandle | null } = { current: null };

function ViewerHarness({ clock }: { readonly clock: ViewerClock }) {
  const viewer = useTeardownViewer({ project, clock });

  useEffect(() => {
    viewerCapture.current = viewer;
  }, [viewer]);

  return <TeardownViewer project={project} viewer={viewer} />;
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
  clock = createFakeClock(2.5);
  viewerCapture.current = null;
  clearRecords();
});

afterEach(async () => {
  await act(async () => root?.unmount());
  root = null;
  container?.remove();
  container = null;
  clock = null;
  viewerCapture.current = null;
  clearRecords();
  vi.restoreAllMocks();
});

function clearRecords(): void {
  records.blueprint.length = 0;
  records.lettering.length = 0;
  records.panel.length = 0;
  records.navigator.length = 0;
}

function viewer(): TeardownViewerHandle {
  if (viewerCapture.current === null) throw new Error('viewer handle was not captured');
  return viewerCapture.current;
}

async function mount(): Promise<void> {
  const currentClock = clock;

  if (currentClock === null) throw new Error('test clock was not created');
  await act(async () => root?.render(<ViewerHarness clock={currentClock} />));
}

function expectMoving(): void {
  if (clock === null) throw new Error('test clock was not created');
  const moving = { kind: 'moving', at: clock.now() };

  expect(records.blueprint).toEqual([moving]);
  expect(records.lettering).toEqual([moving]);
  expect(records.panel).toEqual([moving]);
  expect(records.navigator).toEqual([moving]);
}

function expectNoMoving(): void {
  expect(records.blueprint.filter((event) => event.kind === 'moving')).toEqual([]);
  expect(records.lettering.filter((event) => event.kind === 'moving')).toEqual([]);
  expect(records.panel.filter((event) => event.kind === 'moving')).toEqual([]);
  expect(records.navigator.filter((event) => event.kind === 'moving')).toEqual([]);
}

test('a turn sends one moving to every overlay consumer before a frame', async () => {
  await mount();
  clearRecords();

  await act(async () => viewer().actions.rotateRight());

  expectMoving();
});

test('a zoom sends one moving to every overlay consumer before a frame', async () => {
  await mount();
  clearRecords();

  await act(async () => viewer().actions.zoomIn());

  expectMoving();
});

test('an explode sends one moving to every overlay consumer before a frame', async () => {
  await mount();
  clearRecords();

  await act(async () => viewer().actions.explode());

  expectMoving();
});

test('mount sends no moving', async () => {
  await mount();

  expectNoMoving();
});

test('a re-render without a target, turn, or zoom change sends no moving', async () => {
  await mount();
  clearRecords();

  await act(async () => viewer().actions.highlight(componentId));

  expect(records.blueprint).toEqual([]);
  expect(records.lettering).toEqual([]);
  expect(records.panel).toEqual([]);
  expect(records.navigator).toEqual([]);
});
