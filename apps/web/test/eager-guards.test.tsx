// @vitest-environment jsdom

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

const { bootWorkbench, bootModuleLoaded } = vi.hoisted(() => ({
  bootWorkbench: vi.fn(),
  bootModuleLoaded: vi.fn(),
}));

vi.mock('../components/workbench/workbench-boot', () => {
  bootModuleLoaded();
  return { bootWorkbench };
});

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

type WorkbenchLoaderComponent =
  (typeof import('../components/workbench/workbench-loader'))['WorkbenchLoader'];

function BootedWorkbench() {
  return <span data-testid="workbench-booted">Booted</span>;
}

let WorkbenchLoader: WorkbenchLoaderComponent;
let root: Root | null = null;
let container: HTMLDivElement | null = null;
let reduced = false;
let motionListeners = new Set<() => void>();
let readyStateDescriptor: PropertyDescriptor | undefined;
let connectionDescriptor: PropertyDescriptor | undefined;

function setReduced(next: boolean): void {
  reduced = next;
  for (const listener of motionListeners) listener();
}

function setReadyState(value: DocumentReadyState): void {
  Object.defineProperty(document, 'readyState', { configurable: true, value });
}

function setSaveData(value: boolean): void {
  Object.defineProperty(navigator, 'connection', {
    configurable: true,
    value: { saveData: value },
  });
}

async function flush(): Promise<void> {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
  });
}

async function renderLoader(): Promise<void> {
  await act(async () => {
    root?.render(
      <div data-site-workbench="">
        <button type="button" data-site-control="explore-3d">
          <span data-site-control-label="">Explore in 3D</span>
        </button>
        <WorkbenchLoader slug="websocket-inspector" />
      </div>,
    );
  });
}

async function clickExplore(): Promise<void> {
  const control = container?.querySelector<HTMLButtonElement>('[data-site-control="explore-3d"]');
  if (control === null || control === undefined)
    throw new Error('explore control was not rendered');

  await act(async () => {
    control.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
  await flush();
}

beforeEach(async () => {
  vi.stubGlobal('__XP_EAGER_3D__', true);
  reduced = false;
  motionListeners = new Set<() => void>();
  bootWorkbench.mockReset();
  bootModuleLoaded.mockReset();
  bootWorkbench.mockResolvedValue(BootedWorkbench);

  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: (query: string) =>
      ({
        get matches() {
          return reduced;
        },
        media: query,
        onchange: null,
        addListener: () => undefined,
        removeListener: () => undefined,
        addEventListener: (type: string, listener: () => void) => {
          if (type === 'change') motionListeners.add(listener);
        },
        removeEventListener: (type: string, listener: () => void) => {
          if (type === 'change') motionListeners.delete(listener);
        },
        dispatchEvent: () => false,
      }) as unknown as MediaQueryList,
  });

  readyStateDescriptor = Object.getOwnPropertyDescriptor(document, 'readyState');
  connectionDescriptor = Object.getOwnPropertyDescriptor(navigator, 'connection');
  setReadyState('complete');

  ({ WorkbenchLoader } = await import('../components/workbench/workbench-loader'));

  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => root?.unmount());
  root = null;
  container?.remove();
  container = null;

  if (readyStateDescriptor === undefined) Reflect.deleteProperty(document, 'readyState');
  else Object.defineProperty(document, 'readyState', readyStateDescriptor);

  if (connectionDescriptor === undefined) Reflect.deleteProperty(navigator, 'connection');
  else Object.defineProperty(navigator, 'connection', connectionDescriptor);

  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('eager workbench guards', () => {
  test('reduced motion leaves the poster in place without importing the boot module', async () => {
    reduced = true;

    await renderLoader();
    await flush();

    expect(bootModuleLoaded).not.toHaveBeenCalled();
    expect(bootWorkbench).not.toHaveBeenCalled();
  });

  test('saveData leaves the poster in place without importing the boot module', async () => {
    setSaveData(true);

    await renderLoader();
    await flush();

    expect(bootModuleLoaded).not.toHaveBeenCalled();
    expect(bootWorkbench).not.toHaveBeenCalled();
  });

  test('a change to reduced motion while waiting aborts the eager boot', async () => {
    setReadyState('loading');

    await renderLoader();
    expect(bootModuleLoaded).not.toHaveBeenCalled();
    expect(bootWorkbench).not.toHaveBeenCalled();

    await act(async () => setReduced(true));
    setReadyState('complete');
    await act(async () => window.dispatchEvent(new Event('load')));
    await flush();

    expect(bootWorkbench).not.toHaveBeenCalled();
  });

  test('the explore control still imports and mounts the workbench', async () => {
    reduced = true;

    await renderLoader();
    await clickExplore();

    expect(bootModuleLoaded).toHaveBeenCalledTimes(1);
    expect(bootWorkbench).toHaveBeenCalledTimes(1);
    expect(container?.querySelector('[data-testid="workbench-booted"]')).not.toBeNull();
  });
});
