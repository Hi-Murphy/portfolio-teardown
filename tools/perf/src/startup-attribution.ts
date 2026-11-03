import type { GlSpan, LayoutShiftEntry, LiveStateChange, SequenceMark } from './startup.ts';

export interface StartupAttributionOptions {
  attribute: boolean;
  observers: boolean;
}

export interface GlDrawCount {
  time: number;
  draws: number;
}

export interface StartupAttributionState {
  spans: GlSpan[];
  draws: GlDrawCount[];
  extensions: string[];
  renderer: string | null;
  loadMs: number | null;
  readyMs: number | null;
  layoutShifts: LayoutShiftEntry[];
  sequence: {
    firstInstancedDraw: SequenceMark | null;
    ready: SequenceMark | null;
    liveStates: LiveStateChange[];
  };
}

function installStartupAttribution(config: StartupAttributionOptions): void {
  const scope = window as unknown as Record<string, unknown>;
  if (scope.__xpPerf !== undefined) return;

  const state = {
    spans: [] as GlSpan[],
    draws: [] as GlDrawCount[],
    extensions: [] as string[],
    renderer: null as string | null,
    loadMs: null as number | null,
    readyMs: null as number | null,
    layoutShifts: [] as LayoutShiftEntry[],
    sequence: {
      firstInstancedDraw: null as SequenceMark | null,
      ready: null as SequenceMark | null,
      liveStates: [] as LiveStateChange[],
    },
  };

  scope.__xpPerf = state;
  scope.__xpPerfSpans = state.spans;
  scope.__xpPerfDraws = state.draws;
  scope.__xpPerfExtensions = state.extensions;
  scope.__xpPerfRenderer = state.renderer;
  scope.__xpPerfReadyAt = state.readyMs;
  scope.__xpPerfLoadAt = state.loadMs;
  scope.__xpPerfLayoutShifts = state.layoutShifts;

  let rafIndex = 0;
  let rafTimestamp: number | null = null;
  let activeRaf = 0;
  const enterFrame = (timestamp: number): number => {
    if (rafTimestamp !== timestamp) {
      rafTimestamp = timestamp;
      rafIndex += 1;
    }
    activeRaf = rafIndex;
    return activeRaf;
  };

  const recordLoad = (): void => {
    state.loadMs = performance.now();
    scope.__xpPerfLoadAt = state.loadMs;
  };
  if (document.readyState === 'complete') recordLoad();
  else window.addEventListener('load', recordLoad, { once: true });

  if (config.observers) {
    const markReady = (): void => {
      if (state.readyMs !== null) return;
      const t = performance.now();
      state.readyMs = t;
      scope.__xpPerfReadyAt = state.readyMs;
      if (config.attribute) state.sequence.ready = { t, raf: activeRaf };
    };
    const checkReady = (): void => {
      if (document.querySelector('[data-xploder-ready="true"]') !== null) markReady();
    };
    const readyObserver = new MutationObserver(checkReady);
    readyObserver.observe(document, {
      attributes: true,
      subtree: true,
      attributeFilter: ['data-xploder-ready'],
    });
    checkReady();

    if (config.attribute) {
      const seen = new WeakMap<Element, string>();
      const recordLiveState = (element: Element): void => {
        const value = element.getAttribute('data-site-live-state');
        if (value === null || seen.get(element) === value) return;

        seen.set(element, value);
        state.sequence.liveStates.push({ value, t: performance.now(), raf: activeRaf });
      };
      const recordSubtree = (node: Node): void => {
        if (!(node instanceof Element)) return;
        if (node.hasAttribute('data-site-live-state')) recordLiveState(node);
        for (const element of node.querySelectorAll('[data-site-live-state]')) {
          recordLiveState(element);
        }
      };
      const liveObserver = new MutationObserver((records) => {
        for (const record of records) {
          if (
            record.type === 'attributes' &&
            record.attributeName === 'data-site-live-state' &&
            record.target instanceof Element
          ) {
            recordLiveState(record.target);
            continue;
          }
          for (const node of record.addedNodes) recordSubtree(node);
        }
      });
      liveObserver.observe(document, {
        attributes: true,
        childList: true,
        subtree: true,
        attributeFilter: ['data-site-live-state'],
      });
      recordSubtree(document);
    }

    if (typeof PerformanceObserver === 'function') {
      const layoutObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries() as Array<
          PerformanceEntry & {
            value: number;
            hadRecentInput: boolean;
          }
        >) {
          state.layoutShifts.push({
            startTime: entry.startTime,
            value: entry.value,
            hadRecentInput: entry.hadRecentInput === true,
          });
        }
      });
      try {
        layoutObserver.observe({ type: 'layout-shift', buffered: true });
      } catch {
        // Layout-shift observation is unavailable in this browser.
      }
    }
  }

  if (!config.attribute) return;

  const wrap = (
    owner: Record<string, unknown>,
    name: string,
    before: () => void,
    after: () => void,
  ): void => {
    const original = owner[name];
    if (typeof original !== 'function') return;

    owner[name] = function (this: unknown, ...args: unknown[]): unknown {
      const start = performance.now();
      before();
      try {
        return original.apply(this, args);
      } finally {
        after();
        state.spans.push({ name, start, dur: performance.now() - start });
      }
    };
  };

  let contextCaptured = false;
  const captureContext = (context: WebGLRenderingContext | WebGL2RenderingContext): void => {
    if (contextCaptured) return;
    contextCaptured = true;

    try {
      const extensions = context.getSupportedExtensions();
      if (Array.isArray(extensions)) {
        state.extensions.splice(0, state.extensions.length, ...extensions);
        scope.__xpPerfExtensions = state.extensions;
      }
    } catch {
      // Extension enumeration is best-effort.
    }

    try {
      const extension = context.getExtension('WEBGL_debug_renderer_info');
      const renderer =
        extension === null ? null : context.getParameter(extension.UNMASKED_RENDERER_WEBGL);
      if (typeof renderer === 'string') {
        state.renderer = renderer;
        scope.__xpPerfRenderer = renderer;
      }
    } catch {
      // Renderer strings are unavailable in some contexts.
    }
  };

  const canvasPrototype = HTMLCanvasElement.prototype as unknown as Record<string, unknown>;
  const getContext = canvasPrototype.getContext;
  if (typeof getContext === 'function') {
    canvasPrototype.getContext = function (this: HTMLCanvasElement, ...args: unknown[]): unknown {
      const start = performance.now();
      const requestedType = typeof args[0] === 'string' ? args[0] : null;
      let contextType = requestedType;
      try {
        const context = getContext.apply(this, args) as unknown;
        if (context !== null && typeof context === 'object') {
          const candidate = context as WebGLRenderingContext | WebGL2RenderingContext;
          contextType ??= candidate.constructor?.name ?? null;
          if (typeof candidate.getSupportedExtensions === 'function') captureContext(candidate);
        }
        return context;
      } finally {
        state.spans.push({
          name: 'getContext',
          start,
          dur: performance.now() - start,
          connected: this.isConnected === true,
          contextType,
        });
      }
    };
  }

  let currentFrame: GlDrawCount | null = null;
  const wrappedPrototypes = new Set<unknown>();
  const bucket = (time: number): GlDrawCount => {
    if (currentFrame === null || currentFrame.time !== time) {
      currentFrame = { time, draws: 0 };
      state.draws.push(currentFrame);
    }
    return currentFrame;
  };

  if (typeof requestAnimationFrame === 'function') {
    const requestFrame = requestAnimationFrame.bind(window);
    window.requestAnimationFrame = (callback: FrameRequestCallback): number =>
      requestFrame((time) => {
        enterFrame(time);
        bucket(time);
        return callback(time);
      });
  }

  const wrapGl = (constructorName: 'WebGLRenderingContext' | 'WebGL2RenderingContext'): void => {
    const constructor = scope[constructorName];
    if (typeof constructor !== 'function') return;

    const prototype = (constructor as { prototype: Record<string, unknown> }).prototype;
    if (wrappedPrototypes.has(prototype)) return;
    wrappedPrototypes.add(prototype);
    for (const name of [
      'compileShader',
      'linkProgram',
      'getProgramParameter',
      'getShaderParameter',
      'getUniformLocation',
      'getProgramInfoLog',
      'bufferData',
      'bufferSubData',
      'texImage2D',
      'texStorage2D',
      'texSubImage2D',
      'drawArrays',
      'drawElements',
      'drawArraysInstanced',
      'drawElementsInstanced',
      'createProgram',
    ]) {
      const isDraw =
        name === 'drawArrays' ||
        name === 'drawElements' ||
        name === 'drawArraysInstanced' ||
        name === 'drawElementsInstanced';
      wrap(
        prototype,
        name,
        () => {
          if (isDraw) (currentFrame ?? bucket(performance.now())).draws += 1;
          if (name === 'drawElementsInstanced' && state.sequence.firstInstancedDraw === null) {
            state.sequence.firstInstancedDraw = { t: performance.now(), raf: activeRaf };
          }
        },
        () => undefined,
      );
    }
  };

  wrapGl('WebGL2RenderingContext');
  wrapGl('WebGLRenderingContext');

  let moduleDepth = 0;
  const wrappedFactories = new WeakSet<object>();
  const wrapFactory = (
    factory: (...args: unknown[]) => unknown,
    src: string | null,
  ): ((...args: unknown[]) => unknown) => {
    if (wrappedFactories.has(factory)) return factory;

    const wrapped = function (this: unknown, ...args: unknown[]): unknown {
      const depth = moduleDepth;
      const start = performance.now();
      moduleDepth = depth + 1;
      try {
        return Reflect.apply(factory, this, args);
      } finally {
        moduleDepth = depth;
        state.spans.push({
          name: 'moduleEval',
          start,
          dur: performance.now() - start,
          src,
          depth,
        });
      }
    };

    wrappedFactories.add(wrapped);
    return wrapped;
  };

  const instrumentEntry = (entry: unknown): void => {
    if (!Array.isArray(entry)) return;

    const script = entry[0] as { src?: unknown } | null | undefined;
    const currentScript =
      typeof document === 'undefined' ? null : (document.currentScript as { src?: unknown } | null);
    const src =
      script !== null && typeof script === 'object' && typeof script.src === 'string'
        ? script.src
        : currentScript !== null && typeof currentScript.src === 'string'
          ? currentScript.src
          : null;

    const wrapNested = (value: unknown, startIndex: number): void => {
      if (!Array.isArray(value)) return;
      for (let index = startIndex; index < value.length; index += 1) {
        const item: unknown = value[index];
        if (typeof item === 'function') {
          value[index] = wrapFactory(item as (...args: unknown[]) => unknown, src);
        } else if (Array.isArray(item)) {
          wrapNested(item, 0);
        }
      }
    };

    wrapNested(entry, 1);
  };

  let registry: unknown;
  const pending: unknown[] = [];
  const pendingRegistry = new Proxy(pending, {
    get(target, property, receiver): unknown {
      if (property === 'push') {
        return (...entries: unknown[]): number => {
          for (const entry of entries) instrumentEntry(entry);
          return target.push(...entries);
        };
      }
      if (property === 'forEach') {
        return (
          callback: (entry: unknown, index: number, array: unknown[]) => unknown,
          thisArg?: unknown,
        ): void => {
          target.forEach((entry, index, array) => {
            instrumentEntry(entry);
            callback.call(thisArg, entry, index, array);
          });
        };
      }
      return Reflect.get(target, property, receiver);
    },
  });

  const wrapRegistry = (value: object): object => {
    const originalPush = (value as { push?: unknown }).push;
    if (typeof originalPush !== 'function') return value;

    (value as { push: unknown }).push = function (this: unknown, ...entries: unknown[]): unknown {
      for (const entry of entries) instrumentEntry(entry);
      return Reflect.apply(originalPush, this, entries);
    };
    return value;
  };

  try {
    Object.defineProperty(globalThis, 'TURBOPACK', {
      configurable: true,
      enumerable: true,
      get: () => registry ?? pendingRegistry,
      set: (value: unknown) => {
        registry = value !== null && typeof value === 'object' ? wrapRegistry(value) : value;
      },
    });
  } catch {
    // Module-evaluation timing is best-effort when TURBOPACK is not configurable.
  }
}

export function startupAttributionScript(options: StartupAttributionOptions): string {
  return `(${installStartupAttribution.toString()})(${JSON.stringify(options)});`;
}
