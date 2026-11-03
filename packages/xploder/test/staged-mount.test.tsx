import ReactThreeTestRenderer from '@react-three/test-renderer';
import { Suspense, use } from 'react';
import { WebGLRenderer } from 'three';
import { afterEach, describe, expect, test, vi } from 'vitest';

import { CanvasBoundary } from '../src/react/a11y/CanvasBoundary';
import { createStagedRenderer, createStagedRendererFactory } from '../src/react/TeardownViewer';
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

type TestWindow = Omit<Window, 'requestIdleCallback'> & {
  requestIdleCallback?: (callback: () => void) => number;
  scheduler?: { yield?: () => Promise<void> };
};

interface FakeMessageChannel {
  readonly port1: {
    close: () => void;
    onmessage: (() => void) | null;
  };
  readonly port2: { postMessage: (value: unknown) => void };
}

function setWindow(value: Partial<TestWindow>): void {
  Object.defineProperty(globalThis, 'window', { configurable: true, value });
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
    setWindow({
      requestIdleCallback: (callback) => {
        callback();
        return 1;
      },
    });

    const defaults = rendererDefaults();
    const renderer = await createStagedRenderer(defaults);

    expect(renderer).toBeInstanceOf(WebGLRenderer);
    expect(mocks.renderer).toHaveBeenCalledTimes(1);
    expect(mocks.renderer).toHaveBeenCalledWith({
      canvas: defaults.canvas,
      powerPreference: 'high-performance',
      antialias: true,
      alpha: true,
    });
  });

  test('waits for the idle callback before constructing the renderer', async () => {
    const idleCallbacks: Array<() => void> = [];
    setWindow({
      requestIdleCallback: (callback) => {
        idleCallbacks.push(callback);
        return 1;
      },
    });

    const pending = createStagedRenderer(rendererDefaults());
    const idle = idleCallbacks[0];

    expect(mocks.renderer).not.toHaveBeenCalled();
    if (idle === undefined) throw new Error('idle callback was not scheduled');

    idle();
    await pending;

    expect(mocks.renderer).toHaveBeenCalledTimes(1);
  });

  test('falls back to a message task when requestIdleCallback is unavailable', async () => {
    let idleHandler: (() => void) | null = null;
    const close = vi.fn();
    const postMessage = vi.fn(() => idleHandler?.());
    const channel: FakeMessageChannel = {
      port1: {
        close,
        set onmessage(handler: (() => void) | null) {
          idleHandler = handler;
        },
        get onmessage() {
          return idleHandler;
        },
      },
      port2: { postMessage },
    };

    setWindow({});
    vi.stubGlobal(
      'MessageChannel',
      class {
        readonly port1 = channel.port1;
        readonly port2 = channel.port2;
      },
    );

    const pending = createStagedRenderer(rendererDefaults());

    expect(mocks.renderer).not.toHaveBeenCalled();
    await pending;

    expect(postMessage).toHaveBeenCalledWith(null);
    expect(close).toHaveBeenCalledTimes(1);
    expect(mocks.renderer).toHaveBeenCalledTimes(1);
  });

  test('a renderer rejection reaches the CanvasBoundary fallback', async () => {
    const failure = new Error('renderer unavailable');
    let fallbackRendered = false;

    mocks.renderer.mockImplementationOnce(() => {
      throw failure;
    });
    setWindow({
      requestIdleCallback: (callback) => {
        callback();
        return 1;
      },
    });

    const pending = createStagedRenderer(rendererDefaults());
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

  test('bumps after the factory promise resolves', async () => {
    const idleCallbacks: Array<() => void> = [];
    const events: string[] = [];
    setWindow({
      requestIdleCallback: (callback) => {
        idleCallbacks.push(callback);
        return 1;
      },
    });
    mocks.renderer.mockImplementationOnce(() => {
      events.push('renderer');
    });

    let factoryResolved = false;
    const factory = createStagedRendererFactory(() =>
      events.push(factoryResolved ? 'bump-after-resolve' : 'bump-before-resolve'),
    );
    factory.setMounted(true);
    const pending = factory(rendererDefaults());
    void pending.then(() => {
      factoryResolved = true;
    });

    const idle = idleCallbacks[0];
    if (idle === undefined) throw new Error('idle callback was not scheduled');
    idle();
    await pending;
    await Promise.resolve();
    await Promise.resolve();

    expect(events).toEqual(['renderer', 'bump-after-resolve']);
  });

  test('does not bump after unmount', async () => {
    const idleCallbacks: Array<() => void> = [];
    const onSettled = vi.fn();
    let mounted = true;
    setWindow({
      requestIdleCallback: (callback) => {
        idleCallbacks.push(callback);
        return 1;
      },
    });

    const factory = createStagedRendererFactory(onSettled);
    factory.setMounted(mounted);
    const pending = factory(rendererDefaults());
    mounted = false;
    factory.setMounted(mounted);

    const idle = idleCallbacks[0];
    if (idle === undefined) throw new Error('idle callback was not scheduled');
    idle();
    await pending;
    await Promise.resolve();
    await Promise.resolve();

    expect(onSettled).not.toHaveBeenCalled();
  });

  test('TeardownViewer passes the staged renderer factory to Canvas', () => {
    expect(source).toContain('const [stagedGl] = useState(() =>');
    expect(source).toContain('createStagedRendererFactory(');
    expect(source).toContain('gl={stagedGl}');
  });
});
