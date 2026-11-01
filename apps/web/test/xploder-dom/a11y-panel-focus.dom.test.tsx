// @vitest-environment jsdom

import { act, useEffect } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeAll, beforeEach, expect, test, vi } from 'vitest';
import { parseProject } from 'xploder';
import { projectAJson } from 'xploder/fixtures';
import { resolveMotion } from 'xploder/motion';
import {
  TeardownViewer,
  useTeardownViewer,
  useViewerPanels,
  type TeardownViewerHandle,
  type ViewerPanelsHandle,
} from 'xploder/react';
import { blueprint } from 'xploder/theme';

import type { OverlayFrame } from '../../../../packages/xploder/src/overlay/project';
import {
  PanelLayer,
  type PanelLayerHandle,
} from '../../../../packages/xploder/src/react/panel/PanelLayer';
import type { OverlayEvent } from '../../../../packages/xploder/src/react/scene/OverlayProjector';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const project = parseProject(projectAJson);

const frame: OverlayFrame = {
  layers: project.layers.map((layer, index) => ({
    id: layer.id,
    index,
    corners: [
      [20, 20],
      [40, 20],
      [40, 40],
      [20, 40],
    ],
  })),
  components: project.layers.flatMap((layer, layerIndex) =>
    layer.components.map((component, slot) => ({
      id: component.id,
      layerId: layer.id,
      layerIndex,
      slot,
      anchor: [125, 110],
      hull: [
        [100, 100],
        [150, 100],
        [155, 120],
        [105, 120],
      ],
    })),
  ),
};

const settledWide: OverlayEvent = {
  kind: 'settled',
  frame,
  width: 800,
  height: 600,
  offsetY: 0,
};

const settledNarrow: OverlayEvent = {
  kind: 'settled',
  frame,
  width: 480,
  height: 600,
  offsetY: 0,
};

interface ViewerCapture {
  readonly viewer: TeardownViewerHandle;
  readonly panels: ViewerPanelsHandle;
}

const viewerCapture: { current: ViewerCapture | null } = { current: null };

function ViewerHarness() {
  const viewer = useTeardownViewer({ project, now: () => 0 });
  const panels = useViewerPanels();

  useEffect(() => {
    viewerCapture.current = { viewer, panels };
  }, [panels, viewer]);

  return <TeardownViewer project={project} viewer={viewer} panels={panels} />;
}

let root: Root | null = null;
let container: HTMLDivElement | null = null;

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
  viewerCapture.current = null;
});

afterEach(async () => {
  await act(async () => root?.unmount());
  root = null;
  container?.remove();
  container = null;
  viewerCapture.current = null;
  vi.restoreAllMocks();
});

function heading(): HTMLHeadingElement {
  if (container === null) throw new Error('test container was not mounted');

  const element = container.querySelector<HTMLHeadingElement>('#detail-focus-test');

  if (element === null) throw new Error('detail heading was not rendered');
  return element;
}

test('focuses the detail heading on open and after a dock change or visibility restore', async () => {
  const panelRef: { current: PanelLayerHandle | null } = { current: null };
  const wrapperRef = { current: document.createElement('div') };
  const onClose = vi.fn();

  document.body.append(wrapperRef.current);
  await act(async () =>
    root?.render(
      <PanelLayer
        ref={panelRef}
        state={{ kind: 'detail', componentId: 'tide-repository' }}
        project={project}
        palette={blueprint.light}
        tokens={resolveMotion(true)}
        wrapperRef={wrapperRef}
        headingIds={{ detail: 'detail-focus-test', caseStudy: 'case-study-focus-test' }}
        onClose={onClose}
      />,
    ),
  );

  await act(async () => panelRef.current?.update(settledWide));

  if (container === null) throw new Error('test container was not mounted');

  const firstDock = container
    .querySelector('[data-xploder-panel-surface]')
    ?.getAttribute('data-xploder-panel-dock');

  expect(document.activeElement).toBe(heading());

  await act(async () => panelRef.current?.update(settledNarrow));

  const secondDock = container
    .querySelector('[data-xploder-panel-surface]')
    ?.getAttribute('data-xploder-panel-dock');

  expect(firstDock).not.toBeNull();
  expect(secondDock).not.toBe(firstDock);
  expect(document.activeElement).toBe(heading());

  await act(async () => panelRef.current?.update({ kind: 'moving' }));
  await act(async () => panelRef.current?.update(settledNarrow));

  expect(document.activeElement).toBe(heading());
  wrapperRef.current.remove();
});

test('closes through TeardownViewer and returns focus to the recorded proxy opener', async () => {
  await act(async () => root?.render(<ViewerHarness />));

  if (container === null) throw new Error('test container was not mounted');
  if (viewerCapture.current === null) throw new Error('viewer handles were not captured');

  const proxy = document.createElement('button');
  proxy.type = 'button';
  proxy.dataset.xploderProxy = 'tide-repository';
  container.append(proxy);
  proxy.focus();

  await act(async () => viewerCapture.current?.panels.actions.openDetail('tide-repository'));

  expect(viewerCapture.current.panels.state).toEqual({
    kind: 'detail',
    componentId: 'tide-repository',
  });

  await act(async () =>
    document.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }),
    ),
  );

  expect(viewerCapture.current.panels.state).toEqual({ kind: 'closed' });
  expect(document.activeElement).toBe(proxy);
});
