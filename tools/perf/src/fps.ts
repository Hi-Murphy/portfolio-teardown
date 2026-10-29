import type { CDPSession, Page } from 'playwright';

import { chromiumVersion } from './browser.ts';

const TRACE_CATEGORIES = 'devtools.timeline,disabled-by-default-devtools.timeline.frame';
const FRAME_CATEGORY = 'disabled-by-default-devtools.timeline.frame';
const DEFAULT_WARMUP_MS = 1000;
const DEFAULT_DURATION_MS = 5000;
const RAF_WARNING_RATIO = 0.1;
const RAF_RECORDER_KEY = '__perfFpsRafRecorder';

interface TraceFrame {
  processId?: unknown;
  isMainFrame?: unknown;
  isOutermostMainFrame?: unknown;
}

export interface TraceEvent {
  name?: string;
  cat?: string;
  ph?: string;
  pid?: number;
  tid?: number;
  ts?: number;
  args?: {
    data?: {
      frames?: TraceFrame[];
    };
  };
}

export type PidSource = 'trace-metadata' | 'draw-frame-frequency-fallback';

export interface FpsOptions {
  warmupMs?: number;
  durationMs?: number;
  trigger?: (page: Page) => Promise<void>;
  keepTrace?: boolean;
}

export interface FpsIntervals {
  p50: number;
  p95: number;
  max: number;
}

export interface FpsResult {
  fps: number;
  frames: number;
  droppedFrames: number;
  windowMs: number;
  intervalsMs: FpsIntervals;
  rafFps: number;
  source: 'trace:DrawFrame';
  chromium: string;
  pid: number | null;
  pidSource: PidSource;
  expect?: number;
  tolerance?: number;
  pass?: boolean;
  trace?: TraceEvent[];
}

interface RafRecorder {
  running: boolean;
  samples: number[];
}

interface PerformanceMetric {
  name: string;
  value: number;
}

interface PerformanceMetrics {
  metrics: PerformanceMetric[];
}

function hasFrameCategory(event: TraceEvent): boolean {
  return event.cat?.split(',').includes(FRAME_CATEGORY) ?? false;
}

function isFrameEvent(event: TraceEvent, name: 'DrawFrame' | 'DroppedFrame'): boolean {
  return event.name === name && hasFrameCategory(event) && typeof event.ts === 'number';
}

function timestampInWindow(event: TraceEvent, windowStartUs: number, windowEndUs: number): boolean {
  return typeof event.ts === 'number' && event.ts >= windowStartUs && event.ts <= windowEndUs;
}

function metadataProcessId(events: TraceEvent[]): number | null {
  for (let index = events.length - 1; index >= 0; index -= 1) {
    const event = events[index];
    if (event?.name !== 'TracingStartedInBrowser') continue;

    const frames = event.args?.data?.frames;
    if (!Array.isArray(frames)) continue;

    const mainFrame =
      frames.find((frame) => frame.isMainFrame === true || frame.isOutermostMainFrame === true) ??
      (frames.length === 1 ? frames[0] : undefined);
    if (typeof mainFrame?.processId === 'number') return mainFrame.processId;
  }

  return null;
}

function busiestDrawFrameProcess(events: TraceEvent[]): number | null {
  const counts = new Map<number, number>();
  for (const event of events) {
    if (!isFrameEvent(event, 'DrawFrame') || typeof event.pid !== 'number') continue;
    counts.set(event.pid, (counts.get(event.pid) ?? 0) + 1);
  }

  let busiest: number | null = null;
  let most = 0;
  for (const [pid, count] of counts) {
    if (count > most) {
      busiest = pid;
      most = count;
    }
  }
  return busiest;
}

function percentile(sorted: number[], fraction: number): number {
  if (sorted.length === 0) return 0;
  const rank = Math.ceil(fraction * sorted.length) - 1;
  return sorted[Math.min(sorted.length - 1, Math.max(0, rank))] ?? 0;
}

function frameIntervals(events: TraceEvent[]): FpsIntervals {
  if (events.length < 2) return { p50: 0, p95: 0, max: 0 };

  const sortedTimes = events
    .map((event) => event.ts)
    .filter((ts): ts is number => typeof ts === 'number')
    .sort((left, right) => left - right);
  const intervals = sortedTimes
    .slice(1)
    .map((ts, index) => (ts - (sortedTimes[index] ?? ts)) / 1000);
  intervals.sort((left, right) => left - right);
  const max = intervals.at(-1) ?? 0;

  return {
    p50: percentile(intervals, 0.5),
    p95: percentile(intervals, 0.95),
    max,
  };
}

export function analyzeTrace(
  events: TraceEvent[],
  windowStartUs: number,
  windowEndUs: number,
): Omit<FpsResult, 'rafFps' | 'chromium' | 'trace'> {
  if (!Number.isFinite(windowStartUs) || !Number.isFinite(windowEndUs)) {
    throw new Error('trace window must use finite microsecond timestamps');
  }
  if (windowEndUs < windowStartUs) {
    throw new Error('trace window end must not precede its start');
  }

  const inWindow = events.filter((event) => timestampInWindow(event, windowStartUs, windowEndUs));
  const metadataPid = metadataProcessId(events);
  const pid = metadataPid ?? busiestDrawFrameProcess(inWindow);
  const pidSource: PidSource =
    metadataPid === null ? 'draw-frame-frequency-fallback' : 'trace-metadata';

  const draws = inWindow
    .filter((event) => isFrameEvent(event, 'DrawFrame') && event.pid === pid)
    .sort((left, right) => (left.ts ?? 0) - (right.ts ?? 0));
  const droppedFrames = inWindow.filter((event) => isFrameEvent(event, 'DroppedFrame')).length;
  const windowMs = (windowEndUs - windowStartUs) / 1000;
  const frames = draws.length;

  return {
    fps: windowMs > 0 ? frames / (windowMs / 1000) : 0,
    frames,
    droppedFrames,
    windowMs,
    intervalsMs: frameIntervals(draws),
    source: 'trace:DrawFrame',
    pid,
    pidSource,
  };
}

export function inBand(fps: number, expect: number, tolerance: number): boolean {
  const lower = expect * (1 - tolerance);
  const upper = expect * (1 + tolerance);
  return fps >= lower && fps <= upper;
}

function rafFps(samples: number[]): number {
  if (samples.length < 2) return 0;
  const first = samples[0];
  const last = samples.at(-1);
  if (first === undefined || last === undefined || last <= first) return 0;
  return ((samples.length - 1) * 1000) / (last - first);
}

async function startRafRecorder(page: Page): Promise<void> {
  await page.evaluate((key) => {
    const target = window as unknown as Record<string, RafRecorder>;
    const recorder: RafRecorder = { running: true, samples: [] };
    target[key] = recorder;

    const record = (timestamp: number): void => {
      if (!recorder.running) return;
      recorder.samples.push(timestamp);
      requestAnimationFrame(record);
    };
    requestAnimationFrame(record);
  }, RAF_RECORDER_KEY);
}

async function stopRafRecorder(page: Page): Promise<number[]> {
  return await page.evaluate((key) => {
    const target = window as unknown as Record<string, RafRecorder | undefined>;
    const recorder = target[key];
    if (!recorder) return [];
    recorder.running = false;
    const samples = [...recorder.samples];
    delete target[key];
    return samples;
  }, RAF_RECORDER_KEY);
}

async function performanceTimestamp(session: CDPSession): Promise<number> {
  const result = (await session.send('Performance.getMetrics')) as PerformanceMetrics;
  const timestamp = result.metrics.find((metric) => metric.name === 'Timestamp')?.value;
  if (timestamp === undefined || !Number.isFinite(timestamp)) {
    throw new Error('Chromium did not expose Performance.getMetrics.Timestamp');
  }
  return timestamp;
}

export async function measureFps(page: Page, opts: FpsOptions = {}): Promise<FpsResult> {
  const warmupMs = opts.warmupMs ?? DEFAULT_WARMUP_MS;
  const durationMs = opts.durationMs ?? DEFAULT_DURATION_MS;
  if (!Number.isFinite(warmupMs) || warmupMs < 0) throw new Error('warmupMs must be >= 0');
  if (!Number.isFinite(durationMs) || durationMs <= 0) throw new Error('durationMs must be > 0');

  if (warmupMs > 0) await page.waitForTimeout(warmupMs);
  if (opts.trigger) await opts.trigger(page);

  const session = await page.context().newCDPSession(page);
  const events: TraceEvent[] = [];
  session.on('Tracing.dataCollected', (payload: { value: TraceEvent[] }) => {
    events.push(...payload.value);
  });

  let tracingStarted = false;
  let tracingEnded = false;
  try {
    await session.send('Performance.enable');
    const windowStartSeconds = await performanceTimestamp(session);
    const tracingComplete = new Promise<void>((resolve) => {
      session.once('Tracing.tracingComplete', () => resolve());
    });

    await session.send('Tracing.start', {
      categories: TRACE_CATEGORIES,
      transferMode: 'ReportEvents',
    });
    tracingStarted = true;
    await startRafRecorder(page);

    await page.waitForTimeout(durationMs);
    const windowEndSeconds = await performanceTimestamp(session);
    const samples = await stopRafRecorder(page);

    await session.send('Tracing.end');
    tracingEnded = true;
    await tracingComplete;

    const analyzed = analyzeTrace(
      events,
      Math.round(windowStartSeconds * 1_000_000),
      Math.round(windowEndSeconds * 1_000_000),
    );
    const browser = page.context().browser();
    const result: FpsResult = {
      ...analyzed,
      rafFps: rafFps(samples),
      chromium: browser ? chromiumVersion(browser) : 'unknown',
      ...(opts.keepTrace ? { trace: events } : {}),
    };

    const difference = Math.abs(result.fps - result.rafFps);
    if (
      Math.max(result.fps, result.rafFps) > 0 &&
      difference / Math.max(result.fps, result.rafFps) > RAF_WARNING_RATIO
    ) {
      console.warn(
        `warning: trace FPS ${result.fps.toFixed(2)} and rAF FPS ${result.rafFps.toFixed(2)} differ by more than 10%`,
      );
    }

    return result;
  } finally {
    if (tracingStarted && !tracingEnded) {
      try {
        await session.send('Tracing.end');
      } catch {
        // Preserve the original measurement error.
      }
    }
    try {
      await session.detach();
    } catch {
      // Detachment is best-effort during failure cleanup.
    }
  }
}
