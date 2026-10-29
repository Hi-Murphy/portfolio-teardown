import { readFile } from 'node:fs/promises';

import { describe, expect, test } from 'vitest';

import { analyzeTrace, inBand, type TraceEvent } from '../src/fps.ts';

const WINDOW_START_US = 272216900000;
const WINDOW_END_US = 272217400000;

async function fixture(): Promise<{ events: TraceEvent[]; raw: string }> {
  const raw = await readFile(new URL('./fixtures/mini-trace.json', import.meta.url), 'utf8');
  return { events: JSON.parse(raw) as TraceEvent[], raw };
}

describe('analyzeTrace', () => {
  test('clips to the window and selects the busiest DrawFrame pid when metadata is absent', async () => {
    const { events } = await fixture();
    const result = analyzeTrace(events, WINDOW_START_US, WINDOW_END_US);

    expect(result).toMatchObject({
      fps: 60,
      frames: 30,
      droppedFrames: 30,
      windowMs: 500,
      pid: 97521,
      pidSource: 'draw-frame-frequency-fallback',
      source: 'trace:DrawFrame',
    });
    expect(result.intervalsMs.p50).toBeCloseTo(16.671, 3);
    expect(result.intervalsMs.p95).toBeCloseTo(18.465, 3);
    expect(result.intervalsMs.max).toBeCloseTo(18.551, 3);
  });

  test('uses the main-frame renderer pid from TracingStartedInBrowser metadata', async () => {
    const { events } = await fixture();
    const withMetadata: TraceEvent[] = [
      ...events,
      {
        cat: 'devtools.timeline',
        name: 'TracingStartedInBrowser',
        ph: 'I',
        pid: 97519,
        tid: 1,
        ts: WINDOW_START_US - 1,
        args: {
          data: {
            frames: [
              { processId: 97520, isOutermostMainFrame: true },
              { processId: 97521, isOutermostMainFrame: false },
            ],
          },
        },
      },
    ];

    const result = analyzeTrace(withMetadata, WINDOW_START_US, WINDOW_END_US);

    expect(result).toMatchObject({
      fps: 40,
      frames: 20,
      pid: 97520,
      pidSource: 'trace-metadata',
    });
  });

  test('counts only DrawFrame events in the frame category', async () => {
    const { events } = await fixture();
    const withWrongCategory: TraceEvent[] = [
      ...events,
      {
        cat: 'devtools.timeline',
        name: 'DrawFrame',
        ph: 'I',
        pid: 97521,
        tid: 1,
        ts: WINDOW_START_US + 1,
      },
    ];

    const result = analyzeTrace(withWrongCategory, WINDOW_START_US, WINDOW_END_US);

    expect(result.frames).toBe(30);
    expect(result.fps).toBe(60);
  });

  test('keeps the recorded fixture at 200 events or fewer and local-only', async () => {
    const { events, raw } = await fixture();
    expect(events.length).toBeLessThanOrEqual(200);
    expect(raw.match(/https?:\/\/[^"\s]+/g) ?? []).toEqual([]);
  });
});

describe('inBand', () => {
  test('includes both edges of the 60 fps ±10% band', () => {
    expect(inBand(54, 60, 0.1)).toBe(true);
    expect(inBand(66, 60, 0.1)).toBe(true);
  });

  test('rejects values outside the band', () => {
    expect(inBand(53.9, 60, 0.1)).toBe(false);
    expect(inBand(66.1, 60, 0.1)).toBe(false);
  });
});
