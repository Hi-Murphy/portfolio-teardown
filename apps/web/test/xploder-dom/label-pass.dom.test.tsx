// @vitest-environment jsdom

import { act, useEffect, type RefObject } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeAll, beforeEach, expect, test, vi } from 'vitest';
import { parseProject } from 'xploder';
import { createFakeClock, projectAJson } from 'xploder/fixtures';
import { fitZoom, layoutProject, VIEW } from 'xploder/layout';
import { TeardownViewer, useTeardownViewer, type TeardownViewerHandle } from 'xploder/react';

import { labelPass } from '../../../../packages/xploder/src/labels/pass';
import type { LabelPassResult } from '../../../../packages/xploder/src/labels/types';
import { resolveViewerLayoutOptions } from '../../../../packages/xploder/src/look/product';
import { look } from '../../../../packages/xploder/src/look/tokens';
import { resolveMotion } from '../../../../packages/xploder/src/motion';
import { overlayBaseModel } from '../../../../packages/xploder/src/overlay/model';
import { overlayFrame } from '../../../../packages/xploder/src/overlay/project';
import {
  BlueprintOverlay,
  type BlueprintOverlayHandle,
} from '../../../../packages/xploder/src/react/overlay/BlueprintOverlay';
import type { OverlayEvent } from '../../../../packages/xploder/src/react/scene/OverlayProjector';
import type { PickBridgeHandle } from '../../../../packages/xploder/src/react/scene/PickBridge';
import { blueprint } from '../../../../packages/xploder/src/theme';

vi.mock('../../../../packages/xploder/src/labels/pass', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('../../../../packages/xploder/src/labels/pass')>();

  return {
    ...actual,
    labelPass: vi.fn((input: Parameters<typeof actual.labelPass>[0]) => {
      const result = actual.labelPass(input);

      if (result.lettering === null) return result;

      return {
        ...result,
        lettering: {
          ...result.lettering,
          items: result.lettering.items.slice(0, 1),
        },
      };
    }),
  };
});

vi.mock('../../../../packages/xploder/src/overlay/model', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('../../../../packages/xploder/src/overlay/model')>();

  return {
    ...actual,
    overlayBaseModel: vi.fn((input: Parameters<typeof actual.overlayBaseModel>[0]) =>
      actual.overlayBaseModel(input),
    ),
  };
});

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
const componentIds = project.layers.flatMap((layer) =>
  layer.components.map((component) => component.id),
);
const layerId = project.layers[0]?.id;
const flowId = project.flows?.[1]?.id;
const labelPassSpy = vi.mocked(labelPass);
const overlayBaseModelSpy = vi.mocked(overlayBaseModel);

if (layerId === undefined) throw new Error('fixture has no layer');
if (flowId === undefined) throw new Error('fixture has no second flow');

interface SceneStubProps {
  readonly pickBridgeRef?: RefObject<PickBridgeHandle>;
  readonly onOverlay?: (event: OverlayEvent) => void;
  readonly onPhase?: (phase: 'imploded' | 'exploded') => void;
}

type ViewerClock = ReturnType<typeof createFakeClock>;
type CameraHandle = NonNullable<PickBridgeHandle['camera']>;

const IDENTITY = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1] as const;
const OBLIQUE = [1, 0, 0, 0, 0, 0.5, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1] as const;

const viewerCapture: { current: TeardownViewerHandle | null } = { current: null };

function ViewerHarness({ clock }: { readonly clock: ViewerClock }) {
  const viewer = useTeardownViewer({ project, clock, initial: 'exploded' });

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
  clock = createFakeClock();
  viewerCapture.current = null;
  labelPassSpy.mockClear();
  overlayBaseModelSpy.mockClear();
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

function viewer(): TeardownViewerHandle {
  if (viewerCapture.current === null) throw new Error('viewer handle was not captured');
  return viewerCapture.current;
}

function sceneProps(): SceneStubProps {
  const props = sceneCapture.props.at(-1);

  if (props === undefined) throw new Error('Scene was not rendered');
  return props as unknown as SceneStubProps;
}

function installBridge(camera: CameraHandle | null): void {
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

function settled(at = 1): OverlayEvent {
  return {
    kind: 'settled',
    at,
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
}

async function drive(event: OverlayEvent): Promise<void> {
  await act(async () => sceneProps().onOverlay?.(event));
}

async function drivePhase(phase: 'imploded' | 'exploded'): Promise<void> {
  await act(async () => sceneProps().onPhase?.(phase));
}

function result(index = 0): LabelPassResult {
  const value = labelPassSpy.mock.results[index]?.value;

  if (value === undefined) throw new Error(`labelPass call ${index} has no result`);
  return value;
}

function expectLettering(resultValue: LabelPassResult): void {
  const items = resultValue.lettering?.items ?? [];
  const rendered = Array.from(wrapper().querySelectorAll('[data-xploder-lettering]')).map(
    (element) => element.getAttribute('data-xploder-lettering'),
  );

  expect(wrapper().dataset.xploderLetteringCount).toBe(String(items.length));
  expect(wrapper().dataset.xploderLetteringMarks).toBe(
    String(items.filter((item) => item.lettering.kind === 'mark').length),
  );
  expect(rendered).toEqual(items.map((item) => item.id));
}

test('one settle runs one pass and the lettering renders that result', async () => {
  await mount();

  await drive(settled());

  expect(wrapper().dataset.xploderLabelPasses).toBe('1');
  expect(labelPassSpy).toHaveBeenCalledTimes(1);
  expect(result().lettering?.items).toHaveLength(1);
  expectLettering(result());
});

test('the overlay renders the pass model after one base-model call', async () => {
  await mount();

  await drivePhase('exploded');
  await drive(settled());

  expect(labelPassSpy).toHaveBeenCalledTimes(1);
  expect(overlayBaseModelSpy).toHaveBeenCalledTimes(1);

  const rendered = Array.from(wrapper().querySelectorAll<HTMLElement>('[data-xploder-label]')).map(
    (element) => ({
      key: element.dataset.xploderLabel,
      text: element.firstChild?.textContent,
    }),
  );

  expect(rendered).toEqual(
    result().overlay.labels.map((label) => ({ key: label.key, text: label.text })),
  );
});

test('an apply-time target mismatch re-passes once and renders the returned overlay', async () => {
  const tokens = resolveMotion(false);
  const overlayHandle: { current: BlueprintOverlayHandle | null } = { current: null };
  const input = {
    frame,
    faces: null,
    viewport,
    offsetY: 0,
    extentPx: null,
    zoomFactor: 1,
    target: 'exploded' as const,
    layout,
    project,
    look,
  };
  const initial = labelPass(input);
  let repassedValue: LabelPassResult | null = null;
  const onRepass = vi.fn((_event: OverlayEvent, target: 'imploded' | 'exploded') => {
    const repassed = labelPass({ ...input, target });
    const value: LabelPassResult = {
      ...repassed,
      overlay: {
        ...repassed.overlay,
        labels: [
          ...repassed.overlay.labels,
          {
            key: 'repass:proof',
            kind: 'layer',
            layerIndex: 0,
            x: 0,
            y: 0,
            w: 80,
            h: 16,
            text: 'REPASS PROOF',
            opacity: 1,
          },
        ],
      },
    };

    repassedValue = value;
    return value;
  });
  const render = async (target: 'imploded' | 'exploded', phase: 'imploded' | 'exploded' | null) => {
    await act(async () =>
      root?.render(
        <BlueprintOverlay
          ref={overlayHandle}
          project={project}
          layout={layout}
          palette={blueprint.light}
          tokens={tokens}
          target={target}
          phase={phase}
          tour={{ flowId: null, status: 'idle', step: -1 }}
          focus={{ layerId: null, suspended: false }}
          highlight={null}
          look={look}
          onRepass={onRepass}
        />,
      ),
    );
  };

  await render('exploded', null);
  const pendingEvent = settled();

  await act(async () => overlayHandle.current?.update(pendingEvent, initial));
  expect(onRepass).not.toHaveBeenCalled();

  await render('imploded', 'imploded');

  expect(onRepass).toHaveBeenCalledOnce();
  expect(onRepass).toHaveBeenCalledWith(pendingEvent, 'imploded');
  expect(repassedValue).not.toBeNull();
  expect((repassedValue as LabelPassResult | null)?.pass).toBe(initial.pass + 1);
  expect(
    Array.from(container?.querySelectorAll('[data-xploder-label]') ?? []).map((element) =>
      element.getAttribute('data-xploder-label'),
    ),
  ).toContain('repass:proof');
});

test('a re-render from emphasis and tour state does not run another pass', async () => {
  await mount();

  await drive(settled());
  await act(async () => {
    viewer().actions.highlight(componentIds[0] ?? null);
    viewer().actions.toggleFocus(layerId);
    viewer().actions.selectFlow(flowId);
    viewer().actions.play();
  });

  expect(viewer().tour.status).toBe('playing');
  expect(wrapper().dataset.xploderLabelPasses).toBe('1');
  expect(labelPassSpy).toHaveBeenCalledTimes(1);
  expectLettering(result());
});

test('a moving event does not run a pass', async () => {
  await mount();

  await drive(settled());
  await drive({ kind: 'moving', at: 2 });

  expect(wrapper().dataset.xploderLabelPasses).toBe('1');
  expect(labelPassSpy).toHaveBeenCalledTimes(1);
});

test('a second settled event object runs a second pass', async () => {
  await mount();

  await drive(settled(1));
  await drive(settled(2));

  expect(wrapper().dataset.xploderLabelPasses).toBe('2');
  expect(labelPassSpy).toHaveBeenCalledTimes(2);
  expectLettering(result(1));
});

test('a missing camera still counts the pass but keeps the prior lettering state', async () => {
  await mount();

  await drive(settled(1));
  const previousCount = wrapper().dataset.xploderLetteringCount;

  installBridge(null);
  await drive(settled(2));

  expect(wrapper().dataset.xploderLabelPasses).toBe('2');
  expect(labelPassSpy).toHaveBeenCalledTimes(2);
  expect(result(1).lettering).toBeNull();
  expect(wrapper().dataset.xploderLetteringCount).toBe(previousCount);
  expectLettering(result(0));
});
