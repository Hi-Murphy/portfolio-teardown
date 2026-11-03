import ReactThreeTestRenderer from '@react-three/test-renderer';
import { Suspense, use } from 'react';
import { WebGLRenderer } from 'three';
import { afterEach, describe, expect, test, vi } from 'vitest';

import { CanvasBoundary } from '../src/react/a11y/CanvasBoundary';
import { createStagedRenderer } from '../src/react/TeardownViewer';
// @ts-expect-error Vitest's Vite loader handles ?raw; the package tsconfig has no vite/client types.
import source from '../src/react/TeardownViewer.tsx?raw';

const mocks = vi.hoisted(() => ({ renderer: vi.fn() }));

vi.mock('three', async (importOriginal) => {
  const actual = await importOriginal<typeof import('three')>();

  class MockWebGLRenderer {
    constructor(parameters: unknown) {
      mocks.renderer(parameters);
    }
  }

  return { ...actual, WebGLRenderer: MockWebGLRenderer };
});

type TestWindow = Window & { scheduler?: { yield?: () => Promise<void> } };

function setWindow(value: Partial<TestWindow>): void {
  Object.defineProperty(globalThis, 'window', { configurable: true, value });
}

function controlledYields(): Array<() => void> {
  const yields: Array<() => void> = [];
  setWindow({
    scheduler: {
      yield: () =>
        new Promise((resolve) => {
          yields.push(resolve);
        }),
    },
  });
  return yields;
}

function rendererDefaults(): Parameters<typeof createStagedRenderer>[0] {
  return {
    canvas: {} as HTMLCanvasElement,
    powerPreference: 'high-performance',
  };
}

afterEach(() => {
  Reflect.deleteProperty(globalThis, 'window');
  vi.unstubAllGlobals();
  mocks.renderer.mockReset();
});

describe('staged renderer', () => {
  test('constructs the renderer with the R3F defaults and today flags', async () => {
    const yields = controlledYields();
    const defaults = rendererDefaults();
    const pending = createStagedRenderer(defaults);

    yields.shift()?.();
    await Promise.resolve();
    yields.shift()?.();
    const renderer = await pending;

    expect(renderer).toBeInstanceOf(WebGLRenderer);
    expect(mocks.renderer).toHaveBeenCalledTimes(1);
    expect(mocks.renderer).toHaveBeenCalledWith({
      canvas: defaults.canvas,
      powerPreference: 'high-performance',
      antialias: true,
      alpha: true,
    });
  });

  test('waits for a task before constructing the renderer', async () => {
    const yields = controlledYields();
    const pending = createStagedRenderer(rendererDefaults());

    expect(mocks.renderer).not.toHaveBeenCalled();
    expect(yields).toHaveLength(1);
    yields.shift()?.();
    await Promise.resolve();

    expect(mocks.renderer).toHaveBeenCalledTimes(1);
    yields.shift()?.();
    await pending;
  });

  test('stays pending for one more task after construction', async () => {
    const yields = controlledYields();
    const pending = createStagedRenderer(rendererDefaults());
    let resolved = false;
    void pending.then(() => {
      resolved = true;
    });

    yields.shift()?.();
    await Promise.resolve();

    expect(mocks.renderer).toHaveBeenCalledTimes(1);
    expect(resolved).toBe(false);
    expect(yields).toHaveLength(1);

    yields.shift()?.();
    await pending;

    expect(resolved).toBe(true);
  });

  test('falls back to timer tasks when scheduler.yield is unavailable', async () => {
    const timers: Array<() => void> = [];
    const timerCalls: unknown[][] = [];
    vi.stubGlobal('setTimeout', (...args: unknown[]) => {
      timerCalls.push(args);
      timers.push(args[0] as () => void);
      return 0;
    });
    setWindow({});
    const pending = createStagedRenderer(rendererDefaults());

    expect(mocks.renderer).not.toHaveBeenCalled();
    timers.shift()?.();
    await Promise.resolve();
    expect(mocks.renderer).toHaveBeenCalledTimes(1);
    timers.shift()?.();
    await pending;

    expect(timerCalls.map(([, delay]) => delay)).toEqual([undefined, undefined]);
  });

  test('a renderer rejection reaches the CanvasBoundary fallback', async () => {
    const failure = new Error('renderer unavailable');
    let fallbackRendered = false;

    mocks.renderer.mockImplementationOnce(() => {
      throw failure;
    });
    const yields = controlledYields();

    const pending = createStagedRenderer(rendererDefaults());
    yields.shift()?.();
    await expect(pending).rejects.toBe(failure);

    function RendererConsumer({ renderer }: { renderer: Promise<WebGLRenderer> }) {
      use(renderer);
      return null;
    }

    function Fallback() {
      fallbackRendered = true;
      return null;
    }

    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    try {
      await ReactThreeTestRenderer.create(
        <CanvasBoundary fallback={<Fallback />}>
          <Suspense fallback={null}>
            <RendererConsumer renderer={pending} />
          </Suspense>
        </CanvasBoundary>,
      );
    } finally {
      consoleError.mockRestore();
    }

    expect(fallbackRendered).toBe(true);
  });

  test('TeardownViewer schedules the re-render after the factory resolves', () => {
    expect(source).toMatch(/const \[, rerender\] = useReducer\(\(n: number\) => n \+ 1, 0\);/);
    expect(source).toMatch(
      /createStagedRenderer\(defaults\)\.then\(\(renderer\) => \{[\s\S]*?rerender\(\);[\s\S]*?return renderer;/,
    );
    expect(source).not.toContain('createStagedRendererFactory');
  });

  test('TeardownViewer passes the staged renderer to Canvas', () => {
    expect(source).toMatch(/const \[stagedGl\] = useState<StagedRendererFactory>\(/);
    expect(source).toContain('gl={stagedGl}');
  });
});
