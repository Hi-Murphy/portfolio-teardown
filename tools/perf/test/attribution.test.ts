import { readFile } from 'node:fs/promises';

import { describe, expect, test } from 'vitest';

import type { BundleManifest } from '../src/bundle-manifest.ts';
import {
  analyzeAttribution,
  renderAttributionMarkdown,
  type AttributionTraceEvent,
} from '../src/lh-attribution.ts';
import type { LHR } from '../src/lighthouse.ts';

async function jsonFixture(name: string): Promise<unknown> {
  return JSON.parse(
    await readFile(new URL(`./fixtures/${name}.json`, import.meta.url), 'utf8'),
  ) as unknown;
}

async function inputs(): Promise<{
  lhr: LHR;
  events: AttributionTraceEvent[];
  manifest: BundleManifest;
}> {
  const [lhr, trace, manifest] = await Promise.all([
    jsonFixture('lhr-attribution'),
    jsonFixture('trace-attribution'),
    jsonFixture('manifest-attribution'),
  ]);
  return {
    lhr: lhr as LHR,
    events: (trace as { traceEvents: AttributionTraceEvent[] }).traceEvents,
    manifest: manifest as BundleManifest,
  };
}

describe('Lighthouse per-task attribution', () => {
  test('matches RunTask events by URL and observed-to-simulated duration', async () => {
    const input = await inputs();
    const report = analyzeAttribution(input.lhr, input.events, input.manifest);

    expect(report.source).toBe('lighthouse-profile');
    expect(report.tasks).toHaveLength(3);
    expect(report.tasks.map((task) => task.observedStartMs)).toEqual([100, 200, null]);
    expect(report.tasks.map((task) => task.observedMs)).toEqual([50, 30, null]);
    expect(report.tasks.map((task) => task.matched)).toEqual([true, true, false]);
    expect(report.tasks.map((task) => task.matchQuality)).toEqual(['exact', 'exact', null]);
    expect(report.tasks.map((task) => task.matchErrorPct)).toEqual([0, 0, null]);
    const shares = report.tasks.map((task) => task.tbtSharePct);
    expect(shares[0]).toBeCloseTo(60);
    expect(shares[1]).toBeCloseTo(28);
    expect(shares[2]).toBeCloseTo(12);
  });

  test('matches with the CPU multiplier of the run (local --cpu-multiplier runs)', async () => {
    const input = await inputs();
    const lhr = structuredClone(input.lhr) as LHR & {
      audits: { 'long-tasks': { details: { items: Array<{ duration: number }> } } };
    };
    lhr.configSettings = { ...lhr.configSettings, throttling: { cpuSlowdownMultiplier: 8 } };
    for (const item of lhr.audits['long-tasks'].details.items) item.duration *= 2;

    const report = analyzeAttribution(lhr, input.events, input.manifest);

    expect(report.lantern.cpuMultiplier).toBe(8);
    expect(report.tasks.map((task) => task.matched)).toEqual([true, true, false]);
    expect(report.tasks.map((task) => task.observedMs)).toEqual([50, 30, null]);
  });

  test('attributes functions, chunks, modules, and hypotheses', async () => {
    const input = await inputs();
    const report = analyzeAttribution(input.lhr, input.events, input.manifest);

    expect(report.tasks[0]).toMatchObject({
      chunk: 'main.js',
      module: '_next/static/chunks/main.js',
      hypotheses: ['H2', 'H4'],
    });
    expect(report.tasks[0]?.topFunctions).toEqual([
      {
        fn: 'performWorkOnRoot',
        chunk: 'main.js',
        module: '_next/static/chunks/main.js',
        selfMs: 30,
        selfPct: 60,
        lineNumber: null,
        columnNumber: null,
        snippet: null,
        stack: [
          {
            fn: 'performWorkOnRoot',
            url: 'http://127.0.0.1:4321/_next/static/chunks/main.js',
            chunk: 'main.js',
            lineNumber: null,
            columnNumber: null,
            snippet: null,
          },
        ],
      },
      {
        fn: 'renderMain',
        chunk: 'main.js',
        module: '_next/static/chunks/main.js',
        selfMs: 20,
        selfPct: 40,
        lineNumber: null,
        columnNumber: null,
        snippet: null,
        stack: [
          {
            fn: 'renderMain',
            url: 'http://127.0.0.1:4321/_next/static/chunks/main.js',
            chunk: 'main.js',
            lineNumber: null,
            columnNumber: null,
            snippet: null,
          },
        ],
      },
    ]);
    expect(report.tasks[1]).toMatchObject({
      chunk: 'viewer.js',
      module: '_next/static/chunks/viewer.js',
      hypotheses: ['H1', 'H3'],
    });
    expect(report.tasks[1]?.topFunctions.map((entry) => entry.fn)).toEqual([
      'hasWebgl',
      'moduleEval',
    ]);
    expect(report.tasks[2]?.topFunctions).toEqual([]);
  });

  test('compares observed Lantern blocking totals with the LHR TBT', async () => {
    const input = await inputs();
    const report = analyzeAttribution(input.lhr, input.events, input.manifest);

    expect(report.lantern).toMatchObject({
      cpuMultiplier: 4,
      profileChunks: 1,
      simulatedTbtMs: 250,
      observedBlockingMs: 250,
      differenceMs: 0,
      differencePct: 0,
    });
    expect(report.lantern.pairs.map((pair) => pair.observedStartMs)).toEqual([100, 200]);
    expect(report.lantern.pairs.map((pair) => pair.observedEquivalentMs)).toEqual([200, 120]);
  });

  test('keeps unmatched long tasks with null observed timing', async () => {
    const input = await inputs();
    const trace = structuredClone(input.events);
    const mainTask = trace.find(
      (event) =>
        event.name === 'RunTask' && event.args?.data?.url?.endsWith('/_next/static/chunks/main.js'),
    );
    if (mainTask !== undefined) mainTask.dur = 100_000;

    const report = analyzeAttribution(input.lhr, trace, input.manifest);

    expect(report.tasks[0]).toMatchObject({
      matched: false,
      observedMs: null,
      observedStartMs: null,
    });
    expect(report.tasks[0]?.topFunctions).toEqual([]);
  });

  test('matches URL-less long tasks to RunTasks without an attributable script URL', async () => {
    const input = await inputs();
    const lhr = structuredClone(input.lhr);
    const trace = structuredClone(input.events);
    const items = (
      lhr.audits?.['long-tasks']?.details as
        { items?: Array<{ url?: string; duration?: number }> } | undefined
    )?.items;
    const otherLongTask = items?.[2];
    if (otherLongTask === undefined) throw new Error('fixture long task is missing');
    otherLongTask.url = 'Unattributable';

    const otherTask = trace.find((event) => event.name === 'RunTask' && event.dur === 20_000);
    if (otherTask === undefined) throw new Error('fixture RunTask is missing');
    delete otherTask.args;
    otherTask.ts = 2_140_000;

    const report = analyzeAttribution(lhr, trace, input.manifest);

    expect(report.tasks[2]).toMatchObject({
      url: 'Unattributable',
      matched: true,
      matchQuality: 'exact',
      observedStartMs: 240,
      observedMs: 20,
      matchErrorPct: 0,
    });
  });

  test('falls back to the nearest URL candidate within 50% and marks it loose', async () => {
    const input = await inputs();
    const lhr = structuredClone(input.lhr);
    const trace = structuredClone(input.events);
    const mainUrl = 'http://127.0.0.1:4321/_next/static/chunks/main.js';
    const items = (
      lhr.audits?.['long-tasks']?.details as
        { items?: Array<{ url?: string; duration?: number }> } | undefined
    )?.items;
    if (items?.[0] === undefined || items[1] === undefined || items[0].duration === undefined) {
      throw new Error('fixture long tasks are missing');
    }
    items[0].duration = 280;
    items[1].url = mainUrl;
    items[1].duration = 280;

    const viewerTask = trace.find((event) => event.name === 'RunTask' && event.dur === 30_000);
    if (viewerTask === undefined) throw new Error('fixture viewer RunTask is missing');
    viewerTask.dur = 45_000;
    viewerTask.args = { data: { url: mainUrl } };

    const report = analyzeAttribution(lhr, trace, input.manifest);

    expect(report.tasks.slice(0, 2)).toMatchObject([
      {
        matched: true,
        matchQuality: 'loose',
        observedMs: 50,
      },
      {
        matched: true,
        matchQuality: 'loose',
        observedMs: 45,
      },
    ]);
    expect(report.tasks[0]?.matchErrorPct).toBeCloseTo(28.57142857142857);
    expect(report.tasks[1]?.matchErrorPct).toBeCloseTo(35.714285714285715);
    expect(renderAttributionMarkdown(report)).toContain('| loose |');
  });

  test('records callFrame positions and source snippets for the top three inclusive frames', async () => {
    const input = await inputs();
    const trace = structuredClone(input.events);
    const profileChunk = trace.find((event) => event.name === 'ProfileChunk');
    const nodes = profileChunk?.args?.data?.cpuProfile?.nodes;
    if (nodes === undefined) throw new Error('fixture profile nodes are missing');

    const performWork = nodes.find((node) => node.callFrame.functionName === 'performWorkOnRoot');
    const renderMain = nodes.find((node) => node.callFrame.functionName === 'renderMain');
    const root = nodes.find((node) => node.callFrame.functionName === '(root)');
    if (performWork === undefined || renderMain === undefined || root === undefined) {
      throw new Error('fixture call frames are missing');
    }

    const performAt = 4;
    const source = `PREFIXperformWorkOnRoot(\n  request) ${'x'.repeat(80)}renderMain-${'y'.repeat(200)}`;
    const renderLineStart = source.indexOf('\n') + 1;
    const renderAt = source.indexOf('renderMain') - renderLineStart;
    performWork.callFrame.lineNumber = 0;
    performWork.callFrame.columnNumber = performAt;
    performWork.parent = root.id;
    renderMain.callFrame.lineNumber = 1;
    renderMain.callFrame.columnNumber = renderAt;
    renderMain.parent = performWork.id;

    const report = analyzeAttribution(input.lhr, trace, input.manifest, {
      readChunkSource: (url) =>
        url === 'http://127.0.0.1:4321/_next/static/chunks/main.js' ? source : null,
    });
    const top = report.tasks[0]?.topFunctions.find((entry) => entry.fn === 'renderMain');

    expect(top).toMatchObject({
      lineNumber: 1,
      columnNumber: renderAt,
      snippet: source.slice(renderLineStart + renderAt, renderLineStart + renderAt + 120),
    });
    expect(top?.stack.map((frame) => frame.fn)).toEqual([
      'renderMain',
      'performWorkOnRoot',
      '(root)',
    ]);
    expect(top?.stack[1]?.snippet).toContain('performWorkOnRoot( request)');
    expect(top?.stack[1]?.snippet).not.toContain('\n');
    expect(top?.stack[2]?.snippet).toBeNull();

    const markdown = renderAttributionMarkdown(report);
    expect(markdown).toContain('## Task details');
    expect(markdown).toContain('parent: `performWorkOnRoot`');
    expect(markdown).toContain('grandparent: `(root)`');
  });

  test('names the fallback when the trace has no ProfileChunk events', async () => {
    const input = await inputs();
    const trace = input.events.filter(
      (event) => event.name !== 'Profile' && event.name !== 'ProfileChunk',
    );

    const report = analyzeAttribution(input.lhr, trace, input.manifest);

    expect(report.source).toBe('fallback');
    expect(report.lantern.profileChunks).toBe(0);
    expect(report.lantern.note).toMatch(/No ProfileChunk events/);
    expect(report.tasks[0]).toMatchObject({ matched: true, topFunctions: [], hypotheses: [] });
  });

  test('renders the per-task and Lantern tables', async () => {
    const input = await inputs();
    const markdown = renderAttributionMarkdown(
      analyzeAttribution(input.lhr, input.events, input.manifest),
    );

    expect(markdown).toContain('Source: lighthouse-profile (1 ProfileChunk events, 4x');
    expect(markdown).toContain('performWorkOnRoot 30.0 ms (60.0%)');
    expect(markdown).toContain('| H1, H3 |');
    expect(markdown).toContain('## Task details');
    expect(markdown).toContain('Simulated TBT: 250.0 ms');
    expect(markdown).toContain('Observed Σ max(0, 4 × duration − 50): 250.0 ms');
  });
});
