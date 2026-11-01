// @vitest-environment jsdom

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { parseProject } from 'xploder';
import { projectAJson } from 'xploder/fixtures';
import { blueprint } from 'xploder/theme';

import {
  ComponentNavigator,
  type ComponentNavigatorHandle,
} from '../../../../packages/xploder/src/react/a11y/ComponentNavigator';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const project = parseProject(projectAJson);
const ids = project.layers.flatMap((layer) => layer.components.map((component) => component.id));

const frame = {
  layers: [],
  components: project.layers.flatMap((layer, layerIndex) =>
    layer.components.map((component, slot) => ({
      id: component.id,
      layerId: layer.id,
      layerIndex,
      slot,
      anchor: [50 + slot * 10, 60 + layerIndex * 20] as const,
      hull: [
        [40 + slot * 10, 50 + layerIndex * 20],
        [55 + slot * 10, 52 + layerIndex * 20],
        [50 + slot * 10, 70 + layerIndex * 20],
      ] as const,
    })),
  ),
};

let root: Root | null = null;
let container: HTMLDivElement | null = null;
const navigatorRef: { current: ComponentNavigatorHandle | null } = { current: null };
const stageRef: { current: HTMLDivElement | null } = { current: null };
const onActivate = vi.fn<(id: string, proxy: HTMLButtonElement) => void>();
const onHighlight = vi.fn<(id: string | null) => void>();

beforeEach(() => {
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => root?.unmount());
  root = null;
  container?.remove();
  container = null;
  navigatorRef.current = null;
  stageRef.current = null;
  onActivate.mockClear();
  onHighlight.mockClear();
});

function activeProxy(): HTMLButtonElement {
  if (container === null) throw new Error('test container was not mounted');

  const proxy = container.querySelector<HTMLButtonElement>('[data-xploder-proxy][tabindex="0"]');

  if (proxy === null) throw new Error('no active proxy');
  return proxy;
}

function press(key: string): KeyboardEvent {
  const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });

  act(() => activeProxy().dispatchEvent(event));
  return event;
}

test('rovings through items, activates, bubbles other keys and rings only after focus', async () => {
  await act(async () =>
    root?.render(
      <div>
        <div ref={stageRef} />
        <ComponentNavigator
          ref={navigatorRef}
          project={project}
          palette={blueprint.light}
          stageRef={stageRef}
          highlight={null}
          detailOpenId={null}
          detailId="detail-test"
          onHighlight={onHighlight}
          onActivate={onActivate}
        />
      </div>,
    ),
  );

  if (container === null) throw new Error('test container was not mounted');

  expect(ids).toHaveLength(8);
  expect(container.querySelectorAll('[data-xploder-proxy]')).toHaveLength(8);
  expect(container.querySelectorAll('[data-xploder-proxy][tabindex="0"]')).toHaveLength(1);
  expect(container.querySelector('[data-xploder-focus-ring]')).toBeNull();

  act(() =>
    navigatorRef.current?.update({
      kind: 'settled',
      frame,
      width: 640,
      height: 480,
      offsetY: 20,
    }),
  );

  expect(container.querySelector('[data-xploder-focus-ring]')).toBeNull();
  act(() => activeProxy().focus());
  expect(container.querySelector('[data-xploder-focus-ring] polygon')).not.toBeNull();

  for (let index = 0; index < 9; index += 1) press('ArrowDown');
  expect(activeProxy().dataset.xploderProxy).toBe(ids[1]);

  press('End');
  expect(activeProxy().dataset.xploderProxy).toBe(ids[7]);

  press('Enter');
  expect(onActivate).toHaveBeenLastCalledWith(ids[7], activeProxy());

  const left = press('ArrowLeft');
  expect(left.defaultPrevented).toBe(false);
});
