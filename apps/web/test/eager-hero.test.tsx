// @vitest-environment jsdom

import type { Project } from 'xploder';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

const { bootHeroModuleLoaded, bootHeroStage, bootWorkbench, bootWorkbenchModuleLoaded } =
  vi.hoisted(() => ({
    bootHeroModuleLoaded: vi.fn(),
    bootHeroStage: vi.fn(),
    bootWorkbench: vi.fn(),
    bootWorkbenchModuleLoaded: vi.fn(),
  }));

vi.mock('../components/hero/hero-boot', () => {
  bootHeroModuleLoaded();
  return { bootHeroStage };
});

vi.mock('../components/workbench/workbench-boot', () => {
  bootWorkbenchModuleLoaded();
  return { bootWorkbench };
});

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

type HeroLiveComponent = (typeof import('../components/hero/hero-live'))['HeroLive'];
type WorkbenchLoaderComponent =
  (typeof import('../components/workbench/workbench-loader'))['WorkbenchLoader'];

function BootedHeroStage() {
  return <span data-testid="hero-booted">Booted hero</span>;
}

function BootedWorkbench() {
  return <span data-testid="workbench-booted">Booted workbench</span>;
}

let HeroLive: HeroLiveComponent;
let WorkbenchLoader: WorkbenchLoaderComponent;
let root: Root | null = null;
let container: HTMLDivElement | null = null;
let reduced = false;
let motionListeners = new Set<() => void>();
let readyStateDescriptor: PropertyDescriptor | undefined;
let connectionDescriptor: PropertyDescriptor | undefined;
let idleDescriptor: PropertyDescriptor | undefined;
let cancelIdleDescriptor: PropertyDescriptor | undefined;

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
    await Promise.resolve();
  });
}

async function renderHero(): Promise<void> {
  await act(async () => {
    root?.render(<HeroLive project={{} as Project} />);
  });
  await flush();
}

async function renderWorkbench(): Promise<void> {
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
  vi.stubGlobal('__XP_EAGER_HERO__', true);
  vi.stubGlobal('__XP_EAGER_3D__', false);
  reduced = false;
  motionListeners = new Set<() => void>();
  bootHeroModuleLoaded.mockReset();
  bootHeroStage.mockReset();
  bootHeroStage.mockImplementation(async (_signal, mount) => {
    mount(() => BootedHeroStage);
  });
  bootWorkbench.mockReset();
  bootWorkbenchModuleLoaded.mockReset();
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
  idleDescriptor = Object.getOwnPropertyDescriptor(window, 'requestIdleCallback');
  cancelIdleDescriptor = Object.getOwnPropertyDescriptor(window, 'cancelIdleCallback');
  setReadyState('complete');
  setSaveData(false);
  Object.defineProperty(window, 'requestIdleCallback', {
    configurable: true,
    value: (callback: () => void) => {
      callback();
      return 1;
    },
  });
  Object.defineProperty(window, 'cancelIdleCallback', {
    configurable: true,
    value: () => undefined,
  });

  ({ HeroLive } = await import('../components/hero/hero-live'));
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

  if (idleDescriptor === undefined) Reflect.deleteProperty(window, 'requestIdleCallback');
  else Object.defineProperty(window, 'requestIdleCallback', idleDescriptor);

  if (cancelIdleDescriptor === undefined) Reflect.deleteProperty(window, 'cancelIdleCallback');
  else Object.defineProperty(window, 'cancelIdleCallback', cancelIdleDescriptor);

  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('hero-only eager flag', () => {
  test('boots the hero without an interaction event', async () => {
    await renderHero();

    expect(bootHeroStage).toHaveBeenCalledTimes(1);
    expect(container?.querySelector('[data-testid="hero-booted"]')).not.toBeNull();
  });

  test('reduced motion skips the hero boot', async () => {
    setReduced(true);

    await renderHero();

    expect(bootHeroStage).not.toHaveBeenCalled();
    expect(container?.querySelector('[data-testid="hero-booted"]')).toBeNull();
  });

  test('saveData skips the hero boot', async () => {
    setSaveData(true);

    await renderHero();

    expect(bootHeroStage).not.toHaveBeenCalled();
    expect(container?.querySelector('[data-testid="hero-booted"]')).toBeNull();
  });

  test('the workbench still waits for interaction', async () => {
    await renderWorkbench();
    await flush();

    expect(bootWorkbenchModuleLoaded).not.toHaveBeenCalled();
    expect(bootWorkbench).not.toHaveBeenCalled();

    await clickExplore();

    expect(bootWorkbenchModuleLoaded).toHaveBeenCalledTimes(1);
    expect(bootWorkbench).toHaveBeenCalledTimes(1);
    expect(container?.querySelector('[data-testid="workbench-booted"]')).not.toBeNull();
  });
});
