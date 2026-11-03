import { readdir, readFile } from 'node:fs/promises';

import { describe, expect, test } from 'vitest';

import {
  analyzeStartup,
  findLongTasks,
  type GlSpan,
  type PageMarks,
  type StartupReport,
  type TraceEvent,
} from '../src/startup.ts';

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
      P2: { ms: 10, mainThreadMs: 10, count: 1 },
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

    expect(result.phases.P2).toMatchObject({ ms: 20, mainThreadMs: 20, count: 2 });
    expect(result.phases.P3).toMatchObject({ ms: 30, mainThreadMs: 20, count: 1 });
    expect(result.phases.P4).toMatchObject({ ms: 140, mainThreadMs: 125 });
    expect(result.phases.P5).toMatchObject({ ms: 10, mainThreadMs: 10 });
    expect(result.phases.P8).toMatchObject({ ms: 7, mainThreadMs: 7, domLayoutMs: 5 });
    expect(result.phases.P9).toMatchObject({ ms: 70, mainThreadMs: 40 });
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
