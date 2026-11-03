import { readdir, readFile } from 'node:fs/promises';

import { JSDOM } from 'jsdom';
import { describe, expect, test } from 'vitest';

import {
  analyzeStartup,
  findLongTasks,
  phaseModelError,
  type GlSpan,
  type PageMarks,
  type StartupReport,
  type TraceEvent,
} from '../src/startup.ts';
import {
  startupAttributionScript,
  type StartupAttributionOptions,
  type StartupAttributionState,
} from '../src/startup-attribution.ts';

interface StartupFixture {
  events: TraceEvent[];
  spans: GlSpan[];
  marks: PageMarks;
}

async function fixture(name: string): Promise<StartupFixture> {
  const raw = await readFile(new URL(`./fixtures/${name}`, import.meta.url), 'utf8');
  return JSON.parse(raw) as StartupFixture;
}

async function report(name: string): Promise<StartupReport> {
  const input = await fixture(name);
  return analyzeStartup(input.events, input.spans, input.marks);
}

describe('analyzeStartup', () => {
  test('attributes a baseline-like startup to P0-P9 and keeps other cost visible', async () => {
    const result = await report('startup-baseline.json');

    expect(result).toMatchObject({
      kind: 'startup',
      version: 1,
      t0: 1000,
      firstFrame: 1400,
      firstFrameSource: 'draw-frame',
      mainThreadCostMs: 190,
      attributedMs: 141,
      otherMs: 49,
      blockingMs: 0,
      longTasks: [],
      textures: { ms: 2, count: 1 },
    });
    expect(result.phases).toMatchObject({
      P0: { ms: 10, mainThreadMs: 0 },
      P1: { ms: 100, mainThreadMs: 0, count: 1 },
      P2: { ms: 30, mainThreadMs: 10, count: 2 },
      P3: { ms: 20, mainThreadMs: 20, count: 1 },
      P4: { ms: 65, mainThreadMs: 55 },
      P5: { ms: 10, mainThreadMs: 10, count: 1 },
      P6: { ms: 10, mainThreadMs: 10, count: 1 },
      P7: { ms: 24, mainThreadMs: 24, count: 3 },
      P8: { ms: 7, mainThreadMs: 7, count: 1, domLayoutMs: 5 },
      P9: { ms: 10, mainThreadMs: 5 },
    });
  });

  test('reports post-engagement CLS raw and without recent input', async () => {
    const result = await report('startup-baseline.json');

    expect(result.cls.raw).toBeCloseTo(0.08);
    expect(result.cls.filtered).toBeCloseTo(0.03);
    expect(result.cls.entries.map((entry) => entry.startTime)).toEqual([1100, 1200]);
  });

  test('includes a pre-engagement warm task in cost but not in the long-task window', async () => {
    const result = await report('startup-warm.json');

    expect(result).toMatchObject({
      t0: 2000,
      firstFrame: 2200,
      mainThreadCostMs: 310,
      blockingMs: 50,
    });
    expect(result.longTasks).toEqual([{ start: 2080, dur: 100, phase: 'P7' }]);
    expect(result.longTasks.some((task) => task.start === 1800)).toBe(false);
  });

  test('treats 51 ms as a long task and 50 ms as the boundary', async () => {
    const over = await report('startup-long-51.json');
    const atBoundary = await report('startup-long-50.json');

    expect(over.longTasks).toEqual([{ start: 1080, dur: 51, phase: 'other' }]);
    expect(over.blockingMs).toBe(1);
    expect(over.mainThreadCostMs).toBe(51);
    expect(atBoundary.longTasks).toEqual([]);
    expect(atBoundary.blockingMs).toBe(0);
    expect(atBoundary.mainThreadCostMs).toBe(50);
  });

  test('keeps P5-P9 null for a clean trace while still computing cost from the ready mark', async () => {
    const result = await report('startup-no-gl.json');

    expect(result).toMatchObject({
      firstFrame: 1300,
      firstFrameSource: 'ready-mark',
      mainThreadCostMs: 90,
      textures: { ms: 0, count: 0 },
    });
    expect(result.phases.P5).toBeNull();
    expect(result.phases.P3).toBeNull();
    expect(result.phases.P4).toBeNull();
    expect(result.phases.P6).toBeNull();
    expect(result.phases.P7).toBeNull();
    expect(result.phases.P8).toBeNull();
    expect(result.phases.P9).toBeNull();
  });

  test('excludes main-thread work outside the cost and long-task windows', async () => {
    const input = await fixture('startup-outside-window.json');
    const result = analyzeStartup(input.events, input.spans, input.marks);
    const tasks = findLongTasks(
      input.events,
      1_000_000_000,
      1_006_000_000,
      () => 'other',
      input.marks.traceTimeOriginUs,
    );

    expect(result.mainThreadCostMs).toBe(60);
    expect(result.longTasks).toEqual([]);
    expect(tasks).toEqual([]);
    expect(tasks.some((task) => task.start === 6500)).toBe(false);
  });

  test('ignores main-thread-shaped tasks on non-main renderer threads', async () => {
    const result = await report('startup-long-51.json');

    expect(result.mainThreadCostMs).toBe(51);
  });

  test('counts only the outer task when RunTask records are nested', async () => {
    const result = await report('startup-nested-task.json');

    expect(result.mainThreadCostMs).toBe(70);
    expect(result.longTasks).toEqual([{ start: 1000, dur: 70, phase: 'other' }]);
  });

  test('ignores GL spans that start after the first content frame', async () => {
    const result = await report('startup-post-frame-gl.json');

    expect(result.firstFrame).toBe(1400);
    expect(result.phases.P6).toMatchObject({ ms: 10, mainThreadMs: 10, count: 1 });
    expect(result.textures).toEqual({ ms: 0, count: 0 });
  });

  test('attributes phase time exclusively at nested compile and layout boundaries', async () => {
    const result = await report('startup-exclusive-p4.json');

    expect(result.phases.P2).toMatchObject({ ms: 50, mainThreadMs: 10, count: 3 });
    expect(result.phases.P3).toMatchObject({ ms: 30, mainThreadMs: 30, count: 1 });
    expect(result.phases.P4).toMatchObject({ ms: 140, mainThreadMs: 125 });
    expect(result.phases.P5).toMatchObject({ ms: 10, mainThreadMs: 10 });
    expect(result.phases.P8).toMatchObject({ ms: 7, mainThreadMs: 7, domLayoutMs: 5 });
    expect(result.phases.P9).toMatchObject({ ms: 70, mainThreadMs: 40 });
  });

  test('starts P5 at the connected canvas and reports detached probes separately', async () => {
    const result = await report('startup-detached-context.json');

    expect(result.probeContexts).toEqual({ count: 1, ms: 7 });
    expect(result.phases.P3).toMatchObject({ ms: 60, mainThreadMs: 60, count: 1 });
    expect(result.phases.P4).toMatchObject({ ms: 20 });
    expect(result.phases.P5).toMatchObject({ ms: 10, mainThreadMs: 10, count: 1 });
  });

  test('defines P3 from depth-0 chunk module evaluation and P2 from compile/parse', async () => {
    const result = await report('startup-module-eval.json');

    expect(result.phases.P2).toMatchObject({ ms: 90, mainThreadMs: 30, count: 3 });
    expect(result.phases.P3).toMatchObject({ ms: 30, mainThreadMs: 30, count: 1 });
    expect(result.phases.P4).toMatchObject({ ms: 170 });
  });

  test('reports an inconsistent phase model by phase', async () => {
    const result = await report('startup-baseline.json');
    const inconsistent: StartupReport = {
      ...result,
      phases: {
        ...result.phases,
        P4: { ms: -1, mainThreadMs: 0 },
      },
    };

    expect(phaseModelError(inconsistent)).toBe('phase model inconsistent: P4');
    expect(phaseModelError({ ...result, attributedMs: result.mainThreadCostMs + 1 })).toBe(
      'phase model inconsistent: attributedMs',
    );
  });

  test('keeps attributed main-thread time within cost for every fixture', async () => {
    const names = (await readdir(new URL('./fixtures/', import.meta.url)))
      .filter((name) => name.startsWith('startup-') && name.endsWith('.json'))
      .sort();
    const violations: string[] = [];

    for (const name of names) {
      const result = await report(name);
      if (result.attributedMs > result.mainThreadCostMs + 0.5) {
        violations.push(
          `${name}: attributed ${result.attributedMs} > cost ${result.mainThreadCostMs}`,
        );
      }
      if (result.otherMs < -0.5) {
        violations.push(`${name}: other ${result.otherMs}`);
      }
    }

    expect(violations).toEqual([]);
  });
});

const GL_METHODS = [
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
] as const;

function attributedWindow(options: StartupAttributionOptions): {
  window: Window & typeof globalThis;
  context: Record<string, (...args: unknown[]) => unknown>;
  calls: string[];
  runFrame(time: number): void;
  setNow(value: number): void;
} {
  const dom = new JSDOM('<!doctype html><html><body><canvas id="viewer"></canvas></body></html>', {
    pretendToBeVisual: true,
    runScripts: 'outside-only',
  });
  const window = dom.window as unknown as Window & typeof globalThis;
  const target = window as unknown as Record<string, unknown>;
  const calls: string[] = [];
  let now = 0;
  window.performance.now = (() => now) as typeof window.performance.now;

  class FakeWebGLContext {
    getSupportedExtensions(): string[] {
      return ['EXT_color_buffer_float', 'WEBGL_debug_renderer_info'];
    }

    getExtension(name: string): { UNMASKED_RENDERER_WEBGL: number } | null {
      return name === 'WEBGL_debug_renderer_info' ? { UNMASKED_RENDERER_WEBGL: 0x9246 } : null;
    }

    getParameter(parameter: number): string | null {
      return parameter === 0x9246 ? 'Fake Renderer' : null;
    }
  }

  for (const name of GL_METHODS) {
    (FakeWebGLContext.prototype as unknown as Record<string, (...args: unknown[]) => unknown>)[
      name
    ] = (...args: unknown[]) => {
      void args;
      calls.push(name);
      return name === 'createProgram' ? { program: true } : null;
    };
  }

  target.WebGL2RenderingContext = FakeWebGLContext;
  target.WebGLRenderingContext = FakeWebGLContext;
  const fakeContext = new FakeWebGLContext();
  const context = fakeContext as unknown as Record<string, (...args: unknown[]) => unknown>;
  window.HTMLCanvasElement.prototype.getContext = ((...args: unknown[]): FakeWebGLContext => {
    void args;
    return fakeContext;
  }) as unknown as typeof window.HTMLCanvasElement.prototype.getContext;

  let frame: FrameRequestCallback | undefined;
  window.requestAnimationFrame = ((callback: FrameRequestCallback): number => {
    frame = callback;
    return 1;
  }) as typeof window.requestAnimationFrame;

  window.eval(startupAttributionScript(options));

  return {
    window,
    context,
    calls,
    runFrame: (time: number) => {
      frame?.(time);
    },
    setNow: (value: number) => {
      now = value;
    },
  };
}

describe('startup attribution init script', () => {
  test('records wrapped GL spans, per-rAF draw counts and the extension list', () => {
    const { window, context, calls, runFrame } = attributedWindow({
      attribute: true,
      observers: false,
    });
    const canvas = window.document.querySelector('canvas');
    if (canvas === null) throw new Error('canvas missing');

    canvas.getContext('webgl2');
    context.createProgram?.();
    context.linkProgram?.();
    window.requestAnimationFrame(() => {
      context.drawElements?.();
      context.drawElements?.();
      context.drawArrays?.();
    });
    runFrame(123.5);

    const state = (window as unknown as Record<string, StartupAttributionState>).__xpPerf;
    if (state === undefined) throw new Error('attribution state missing');
    expect(calls).toEqual([
      'createProgram',
      'linkProgram',
      'drawElements',
      'drawElements',
      'drawArrays',
    ]);
    expect(state.spans.map((span) => span.name)).toEqual(
      expect.arrayContaining(['getContext', 'createProgram', 'linkProgram', 'drawElements']),
    );
    expect(state.spans.find((span) => span.name === 'getContext')).toMatchObject({
      connected: true,
      contextType: 'webgl2',
    });
    expect(state.spans.every((span) => Number.isFinite(span.start) && span.dur >= 0)).toBe(true);
    expect(state.draws).toEqual([{ time: 123.5, draws: 3 }]);
    expect(state.extensions).toEqual(['EXT_color_buffer_float', 'WEBGL_debug_renderer_info']);
    expect(state.renderer).toBe('Fake Renderer');
  });

  test('leaves GL calls unwrapped without --attribute', () => {
    const { window, context, calls } = attributedWindow({
      attribute: false,
      observers: false,
    });
    const canvas = window.document.querySelector('canvas');
    if (canvas === null) throw new Error('canvas missing');

    canvas.getContext('webgl2');
    context.createProgram?.();
    const state = (window as unknown as Record<string, StartupAttributionState>).__xpPerf;
    if (state === undefined) throw new Error('attribution state missing');

    expect(calls).toEqual(['createProgram']);
    expect(state.spans).toEqual([]);
  });

  test('records detached probes with their connection state and context type', () => {
    const { window } = attributedWindow({ attribute: true, observers: false });
    const detached = window.document.createElement('canvas');
    const connected = window.document.querySelector('canvas');
    if (connected === null) throw new Error('canvas missing');

    detached.getContext('webgl2');
    connected.getContext('webgl');

    const state = (window as unknown as Record<string, StartupAttributionState>).__xpPerf;
    if (state === undefined) throw new Error('attribution state missing');
    expect(
      state.spans
        .filter((span) => span.name === 'getContext')
        .map((span) => ({ connected: span.connected, contextType: span.contextType })),
    ).toEqual([
      { connected: false, contextType: 'webgl2' },
      { connected: true, contextType: 'webgl' },
    ]);
  });

  test('times Turbopack factories in both registry phases and preserves call semantics', () => {
    const { window } = attributedWindow({ attribute: true, observers: false });
    const target = window as unknown as {
      TURBOPACK: { push: (entry: unknown) => unknown };
    };
    const src = 'https://example.test/_next/static/chunks/turbopack.js';
    const script = { src };
    const calls: string[] = [];
    const entry: unknown[] = [
      script,
      7,
      function (this: unknown, value: number): unknown {
        calls.push('outer');
        return Reflect.apply(entry[4] as (...args: unknown[]) => unknown, this, [value + 1]);
      },
      8,
      function (this: unknown, value: number): { value: number; self: unknown } {
        calls.push('inner');
        return { value, self: this };
      },
    ];

    const pending = target.TURBOPACK as unknown as {
      push: (entry: unknown) => unknown;
      forEach: (callback: (entry: unknown) => unknown) => void;
    };
    pending.push(entry);
    const registered: unknown[] = [];
    const register = (value: unknown): unknown => {
      registered.push(value);
      return value;
    };
    target.TURBOPACK = { push: register };
    pending.forEach(register);

    const context = { marker: true };
    const result = Reflect.apply(entry[2] as (...args: unknown[]) => unknown, context, [3]) as {
      value: number;
      self: unknown;
    };
    expect(result).toEqual({ value: 4, self: context });
    expect(calls).toEqual(['outer', 'inner']);
    expect(registered).toEqual([entry]);

    const throwing: unknown[] = [
      script,
      9,
      function (): never {
        throw new Error('boom');
      },
    ];
    target.TURBOPACK.push(throwing);
    expect(() => (throwing[2] as () => unknown)()).toThrow('boom');

    const state = (window as unknown as Record<string, StartupAttributionState>).__xpPerf;
    if (state === undefined) throw new Error('attribution state missing');
    expect(
      state.spans
        .filter((span) => span.name === 'moduleEval')
        .map((span) => ({ src: span.src, depth: span.depth })),
    ).toEqual([
      { src, depth: 1 },
      { src, depth: 0 },
      { src, depth: 0 },
    ]);
  });

  test('records the first instanced draw, ready flip and live-state changes by rAF', async () => {
    const { window, context, runFrame, setNow } = attributedWindow({
      attribute: true,
      observers: true,
    });
    const live = window.document.createElement('div');
    live.setAttribute('data-site-live-state', 'idle');
    setNow(10);
    window.document.body.append(live);
    await new Promise<void>((resolve) => window.setTimeout(resolve, 0));

    setNow(20);
    live.setAttribute('data-site-live-state', 'loading');
    await new Promise<void>((resolve) => window.setTimeout(resolve, 0));

    setNow(50);
    window.requestAnimationFrame(() => {
      setNow(60);
      context.drawElementsInstanced?.();
      setNow(70);
      window.document.body.setAttribute('data-xploder-ready', 'true');
    });
    runFrame(123.5);
    await new Promise<void>((resolve) => window.setTimeout(resolve, 0));

    setNow(80);
    live.setAttribute('data-site-live-state', 'revealed');
    await new Promise<void>((resolve) => window.setTimeout(resolve, 0));

    const state = (window as unknown as Record<string, StartupAttributionState>).__xpPerf;
    if (state === undefined) throw new Error('attribution state missing');
    expect(state.sequence).toEqual({
      firstInstancedDraw: { t: 60, raf: 1 },
      ready: { t: 70, raf: 1 },
      liveStates: [
        { value: 'idle', t: 10, raf: 0 },
        { value: 'loading', t: 20, raf: 0 },
        { value: 'revealed', t: 80, raf: 1 },
      ],
    });
  });
});
