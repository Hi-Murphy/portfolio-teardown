import type { TraceEvent as FpsTraceEvent } from './fps.ts';

const MICROSECONDS_PER_MILLISECOND = 1000;
const LONG_TASK_THRESHOLD_MS = 50;
const LONG_TASK_WINDOW_MS = 5000;
const SETTLE_TAIL_MS = 1000;
const FRAME_CATEGORY = 'disabled-by-default-devtools.timeline.frame';

const RUN_TASK_NAMES = new Set(['RunTask', 'ThreadControllerImpl::RunTask']);
const COMPILE_NAMES = new Set(['v8.compile', 'v8.compileModule', 'V8.CompileCode']);
const EVALUATE_SCRIPT_NAMES = new Set(['EvaluateScript', 'v8.evaluateModule']);
const BACKGROUND_PARSE_NAMES = new Set(['v8.parseOnBackground']);
const IDLE_NAMES = new Set(['FireIdleCallback', 'RunIdleCallback']);
const GEOMETRY_NAMES = new Set(['bufferData', 'bufferSubData']);
const PROGRAM_NAMES = new Set(['createProgram']);
const SHADER_NAMES = new Set(['compileShader', 'linkProgram']);
const PROGRAM_QUERY_NAMES = new Set([
  'getProgramParameter',
  'getShaderParameter',
  'getUniformLocation',
  'getProgramInfoLog',
]);
const TEXTURE_NAMES = new Set(['texImage2D', 'texStorage2D', 'texSubImage2D']);
const INSTANCED_DRAW_NAMES = new Set(['drawArraysInstanced', 'drawElementsInstanced']);
const DOM_LAYOUT_NAMES = new Set(['Layout', 'UpdateLayoutTree']);

const PHASE_IDS = ['P0', 'P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7', 'P8', 'P9'] as const;

interface TraceArgsData {
  frames?: TraceFrame[];
  requestId?: string;
  url?: string;
  fileName?: string;
  scriptName?: string;
  sourceURL?: string;
  resourceType?: string;
  name?: string;
  [key: string]: unknown;
}

interface TraceArgs {
  name?: string;
  data?: TraceArgsData;
  [key: string]: unknown;
}

interface TraceFrame {
  processId?: number;
  isMainFrame?: boolean;
  isOutermostMainFrame?: boolean;
}

export type TraceEvent = Omit<FpsTraceEvent, 'args'> & {
  dur?: number;
  args?: TraceArgs;
};

export interface GlSpan {
  name: string;
  start: number;
  dur: number;
  connected?: boolean;
  contextType?: string | null;
  src?: string | null;
  depth?: number;
}

export interface ProbeContexts {
  count: number;
  ms: number;
}

export interface LayoutShiftEntry {
  startTime: number;
  value: number;
  hadRecentInput: boolean;
}

export interface PageMarks {
  /** Trace timestamp corresponding to `performance.now() === 0`, in microseconds. */
  traceTimeOriginUs: number;
  /** Page `performance.now()` timestamp for the load event, in milliseconds. */
  loadMs: number;
  /** Page `performance.now()` timestamp for engagement, in milliseconds. */
  engageMs: number;
  /** Page `performance.now()` timestamp when the viewer became ready, in milliseconds. */
  readyMs?: number | null;
  layoutShifts?: LayoutShiftEntry[];
}

export type PhaseId = (typeof PHASE_IDS)[number];
export type StartupPhase = PhaseId | 'other';

export interface StartupPhaseReport {
  ms: number;
  mainThreadMs: number;
  count?: number;
  domLayoutMs?: number;
}

export interface LongTask {
  /** Page `performance.now()` timestamp, in milliseconds. */
  start: number;
  dur: number;
  phase: StartupPhase;
}

export interface StartupReport {
  kind: 'startup';
  version: 1;
  /** Page `performance.now()` timestamp for engagement, in milliseconds. */
  t0: number;
  /** Page `performance.now()` timestamp for the first content frame, in milliseconds. */
  firstFrame: number | null;
  firstFrameSource: 'draw-frame' | 'ready-mark' | null;
  phases: Record<PhaseId, StartupPhaseReport | null>;
  mainThreadCostMs: number;
  attributedMs: number;
  otherMs: number;
  longTasks: LongTask[];
  blockingMs: number;
  cls: {
    raw: number;
    filtered: number;
    entries: LayoutShiftEntry[];
  };
  textures: {
    ms: number;
    count: number;
  };
  probeContexts: ProbeContexts;
}

interface ResourceRequest {
  id: string;
  url: string;
  startUs: number;
  resourceType: string;
  finishUs: number | null;
}

interface TaskTiming {
  startUs: number;
  endUs: number;
  durUs: number;
}

interface ThreadTaskTiming extends TaskTiming {
  threadKey: string;
}

interface TimeInterval {
  startUs: number;
  endUs: number;
}

interface PhaseInterval {
  phase: StartupPhase;
  startUs: number;
  endUs: number;
}

function finite(value: number | null | undefined): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function eventEndUs(event: TraceEvent): number | null {
  if (!finite(event.ts)) return null;
  const duration = finite(event.dur) ? Math.max(0, event.dur) : 0;
  return event.ts + duration;
}

function sumEventUs(events: readonly TraceEvent[]): number {
  return events.reduce((sum, event) => sum + (finite(event.dur) ? Math.max(0, event.dur) : 0), 0);
}

function hasFrameCategory(event: TraceEvent): boolean {
  return event.cat?.split(',').includes(FRAME_CATEGORY) ?? false;
}

function metadataProcessId(events: readonly TraceEvent[]): number | null {
  for (let index = events.length - 1; index >= 0; index -= 1) {
    const event = events[index];
    if (event?.name !== 'TracingStartedInBrowser') continue;

    const frames = event.args?.data?.frames;
    if (!Array.isArray(frames)) continue;

    const mainFrame =
      frames.find((frame) => frame.isMainFrame === true || frame.isOutermostMainFrame === true) ??
      (frames.length === 1 ? frames[0] : undefined);
    if (finite(mainFrame?.processId)) return mainFrame.processId;
  }

  return null;
}

function busiestDrawFrameProcess(events: readonly TraceEvent[]): number | null {
  const counts = new Map<number, number>();
  for (const event of events) {
    if (event.name !== 'DrawFrame' || !hasFrameCategory(event) || !finite(event.pid)) continue;
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

function threadName(event: TraceEvent): string | null {
  const name = event.args?.name ?? event.args?.data?.name;
  return typeof name === 'string' ? name : null;
}

function addressableProcessId(events: readonly TraceEvent[]): number | null {
  const metadataPid = metadataProcessId(events);
  if (metadataPid !== null) return metadataPid;

  const drawFramePid = busiestDrawFrameProcess(events);
  if (drawFramePid !== null) return drawFramePid;

  return events.find((event) => threadName(event) === 'CrRendererMain')?.pid ?? null;
}

function mainThreadForProcess(
  events: readonly TraceEvent[],
  pid: number | null,
): { pid: number | null; tid: number | null } {
  if (pid === null) return { pid: null, tid: null };

  const namedMainThread = events.find(
    (event) => event.pid === pid && threadName(event) === 'CrRendererMain' && finite(event.tid),
  );
  if (namedMainThread && finite(namedMainThread.tid)) {
    return { pid, tid: namedMainThread.tid };
  }

  const counts = new Map<number, number>();
  for (const event of events) {
    if (event.pid !== pid || !finite(event.tid) || !event.name || !RUN_TASK_NAMES.has(event.name)) {
      continue;
    }
    counts.set(event.tid, (counts.get(event.tid) ?? 0) + 1);
  }

  let tid: number | null = null;
  let most = 0;
  for (const [candidate, count] of counts) {
    if (count > most) {
      tid = candidate;
      most = count;
    }
  }
  return { pid, tid };
}

function mainThread(
  events: readonly TraceEvent[],
  requireMetadata: boolean,
): { pid: number | null; tid: number | null } {
  const pid = requireMetadata ? metadataProcessId(events) : addressableProcessId(events);
  return mainThreadForProcess(events, pid);
}

function onMainThread(
  event: TraceEvent,
  thread: { pid: number | null; tid: number | null },
): boolean {
  if (thread.pid === null) return true;
  if (event.pid !== thread.pid) return false;
  return thread.tid === null || event.tid === thread.tid;
}

function mainThreadTasks(events: readonly TraceEvent[], requireMetadata: boolean): TaskTiming[] {
  const thread = mainThread(events, requireMetadata);
  if (requireMetadata && thread.pid === null) return [];
  const tasks = new Map<string, ThreadTaskTiming>();

  for (const event of events) {
    if (!event.name || !RUN_TASK_NAMES.has(event.name) || !finite(event.ts)) continue;
    if (!onMainThread(event, thread)) continue;

    const durUs = finite(event.dur) ? Math.max(0, event.dur) : 0;
    const key = `${event.pid ?? ''}:${event.tid ?? ''}:${event.ts}`;
    const threadKey = `${event.pid ?? ''}:${event.tid ?? ''}`;
    const prior = tasks.get(key);
    if (prior === undefined || durUs > prior.durUs) {
      tasks.set(key, { startUs: event.ts, endUs: event.ts + durUs, durUs, threadKey });
    }
  }

  const sorted = [...tasks.values()].sort(
    (left, right) => left.startUs - right.startUs || right.endUs - left.endUs,
  );
  const kept: TaskTiming[] = [];
  const lastEndByThread = new Map<string, number>();

  for (const task of sorted) {
    const lastEndUs = lastEndByThread.get(task.threadKey);
    if (lastEndUs !== undefined && task.startUs < lastEndUs) continue;

    kept.push({ startUs: task.startUs, endUs: task.endUs, durUs: task.durUs });
    lastEndByThread.set(task.threadKey, task.endUs);
  }

  return kept;
}

function eventUrls(event: TraceEvent): string[] {
  const data = event.args?.data;
  return [data?.url, data?.fileName, data?.scriptName, data?.sourceURL].filter(
    (url): url is string => typeof url === 'string' && url.length > 0,
  );
}

function isScriptRequest(url: string, resourceType: string): boolean {
  return resourceType.toLowerCase().includes('script') || /\.m?js(?:[?#]|$)/i.test(url);
}

function resourceRequests(events: readonly TraceEvent[], loadUs: number): ResourceRequest[] {
  const requests = new Map<string, ResourceRequest>();

  for (const event of events) {
    if (event.name !== 'ResourceSendRequest' || !finite(event.ts)) continue;
    const id = event.args?.data?.requestId;
    const url = event.args?.data?.url;
    if (typeof id !== 'string' || typeof url !== 'string' || event.ts < loadUs) continue;

    const resourceType = event.args?.data?.resourceType;
    if (!isScriptRequest(url, typeof resourceType === 'string' ? resourceType : '')) continue;
    requests.set(id, {
      id,
      url,
      startUs: event.ts,
      resourceType: typeof resourceType === 'string' ? resourceType : '',
      finishUs: null,
    });
  }

  for (const event of events) {
    if (event.name !== 'ResourceFinish' || !finite(event.ts)) continue;
    const id = event.args?.data?.requestId;
    if (typeof id !== 'string') continue;
    const request = requests.get(id);
    if (request !== undefined) request.finishUs = event.ts;
  }

  return [...requests.values()].sort((left, right) => left.startUs - right.startUs);
}

function chunkEvents(
  events: readonly TraceEvent[],
  names: ReadonlySet<string>,
  urls: ReadonlySet<string>,
): TraceEvent[] {
  return events.filter(
    (event) =>
      typeof event.name === 'string' &&
      names.has(event.name) &&
      finite(event.ts) &&
      eventUrls(event).some((url) => urls.has(url)),
  );
}

function toTraceUs(milliseconds: number, originUs: number): number {
  return originUs + milliseconds * MICROSECONDS_PER_MILLISECOND;
}

function toPageMs(microseconds: number, originUs: number): number {
  return (microseconds - originUs) / MICROSECONDS_PER_MILLISECOND;
}

function spanStartUs(span: GlSpan, originUs: number): number {
  return toTraceUs(span.start, originUs);
}

function spanEndUs(span: GlSpan, originUs: number): number {
  return spanStartUs(span, originUs) + Math.max(0, span.dur) * MICROSECONDS_PER_MILLISECOND;
}

function spansNamed(spans: readonly GlSpan[], names: ReadonlySet<string>): GlSpan[] {
  return spans
    .filter(
      (span) => names.has(span.name) && Number.isFinite(span.start) && Number.isFinite(span.dur),
    )
    .sort((left, right) => left.start - right.start);
}

function moduleEvalSpans(spans: readonly GlSpan[], chunkUrls: ReadonlySet<string>): GlSpan[] {
  return spans
    .filter(
      (span) =>
        span.name === 'moduleEval' &&
        (span.depth ?? 0) === 0 &&
        typeof span.src === 'string' &&
        chunkUrls.has(span.src),
    )
    .sort((left, right) => left.start - right.start);
}

function detachedContextSpans(spans: readonly GlSpan[]): GlSpan[] {
  return spans.filter((span) => span.name === 'getContext' && span.connected === false);
}

function firstSyncQueries(programs: readonly GlSpan[], queries: readonly GlSpan[]): GlSpan[] {
  const selected: GlSpan[] = [];

  for (let programIndex = 0; programIndex < programs.length; programIndex += 1) {
    const program = programs[programIndex];
    const nextProgram = programs[programIndex + 1];
    if (program === undefined) continue;

    for (const name of PROGRAM_QUERY_NAMES) {
      const query = queries.find(
        (candidate) =>
          candidate.name === name &&
          candidate.start >= program.start &&
          (nextProgram === undefined || candidate.start < nextProgram.start),
      );
      if (query !== undefined) selected.push(query);
    }
  }

  return selected;
}

function eventInterval(event: TraceEvent): TimeInterval | null {
  if (!finite(event.ts)) return null;
  return { startUs: event.ts, endUs: eventEndUs(event) ?? event.ts };
}

function spanInterval(span: GlSpan, originUs: number): TimeInterval {
  return { startUs: spanStartUs(span, originUs), endUs: spanEndUs(span, originUs) };
}

function clippedInterval(interval: TimeInterval, startUs: number, endUs: number): TimeInterval {
  return {
    startUs: Math.max(interval.startUs, startUs),
    endUs: Math.min(interval.endUs, endUs),
  };
}

function mergeIntervals(intervals: readonly TimeInterval[]): TimeInterval[] {
  const sorted = intervals
    .filter((interval) => interval.endUs > interval.startUs)
    .map((interval) => ({ ...interval }))
    .sort((left, right) => left.startUs - right.startUs || left.endUs - right.endUs);
  const merged: TimeInterval[] = [];

  for (const interval of sorted) {
    const prior = merged.at(-1);
    if (prior !== undefined && interval.startUs <= prior.endUs) {
      prior.endUs = Math.max(prior.endUs, interval.endUs);
    } else {
      merged.push(interval);
    }
  }

  return merged;
}

function intervalDurationMs(intervals: readonly TimeInterval[]): number {
  return (
    intervals.reduce((sum, interval) => sum + Math.max(0, interval.endUs - interval.startUs), 0) /
    MICROSECONDS_PER_MILLISECOND
  );
}

function intervalIntersectionMs(
  leftIntervals: readonly TimeInterval[],
  rightIntervals: readonly TimeInterval[],
): number {
  let leftIndex = 0;
  let rightIndex = 0;
  let overlapUs = 0;

  while (leftIndex < leftIntervals.length && rightIndex < rightIntervals.length) {
    const left = leftIntervals[leftIndex];
    const right = rightIntervals[rightIndex];
    if (left === undefined || right === undefined) break;

    const startUs = Math.max(left.startUs, right.startUs);
    const endUs = Math.min(left.endUs, right.endUs);
    overlapUs += Math.max(0, endUs - startUs);

    if (left.endUs <= right.endUs) {
      leftIndex += 1;
    } else {
      rightIndex += 1;
    }
  }

  return overlapUs / MICROSECONDS_PER_MILLISECOND;
}

function exclusiveTaskOverlapMs(
  tasks: readonly TaskTiming[],
  startUs: number,
  endUs: number,
  exclusions: readonly TimeInterval[],
): number {
  if (endUs <= startUs) return 0;

  const taskIntervals = mergeIntervals(tasks.map((task) => clippedInterval(task, startUs, endUs)));
  const exclusionIntervals = mergeIntervals(
    exclusions.map((interval) => clippedInterval(interval, startUs, endUs)),
  );
  const taskMs = intervalDurationMs(taskIntervals);
  const excludedMs = intervalIntersectionMs(taskIntervals, exclusionIntervals);
  return Math.max(0, taskMs - excludedMs);
}

function phaseForTask(intervals: readonly PhaseInterval[], task: TaskTiming): StartupPhase {
  let selected: StartupPhase = 'other';
  let selectedOverlap = 0;

  for (const interval of intervals) {
    const overlap = Math.min(task.endUs, interval.endUs) - Math.max(task.startUs, interval.startUs);
    if (overlap > selectedOverlap) {
      selected = interval.phase;
      selectedOverlap = overlap;
    }
  }

  return selected;
}

export function findLongTasks(
  events: readonly TraceEvent[],
  startUs: number,
  endUs: number,
  phaseAt: (startUs: number, durUs: number) => StartupPhase = () => 'other',
  originUs = 0,
  requireMetadata = false,
): LongTask[] {
  return mainThreadTasks(events, requireMetadata)
    .filter(
      (task) =>
        task.startUs >= startUs &&
        task.startUs <= endUs &&
        task.durUs > LONG_TASK_THRESHOLD_MS * MICROSECONDS_PER_MILLISECOND,
    )
    .map((task) => ({
      start: toPageMs(task.startUs, originUs),
      dur: task.durUs / MICROSECONDS_PER_MILLISECOND,
      phase: phaseAt(task.startUs, task.durUs),
    }));
}

export function findTasksOver(
  events: readonly TraceEvent[],
  startUs: number,
  endUs: number,
  thresholdMs: number,
  originUs = 0,
  requireMetadata = false,
): Array<{ start: number; dur: number }> {
  return mainThreadTasks(events, requireMetadata)
    .filter(
      (task) =>
        task.startUs >= startUs &&
        task.startUs <= endUs &&
        task.durUs > thresholdMs * MICROSECONDS_PER_MILLISECOND,
    )
    .map((task) => ({
      start: toPageMs(task.startUs, originUs),
      dur: task.durUs / MICROSECONDS_PER_MILLISECOND,
    }));
}

export function countMainThreadTasks(
  events: readonly TraceEvent[],
  startUs: number,
  endUs: number,
  requireMetadata = false,
): number {
  return mainThreadTasks(events, requireMetadata).filter(
    (task) => task.startUs >= startUs && task.startUs <= endUs,
  ).length;
}

export function phaseModelError(report: StartupReport): string | null {
  for (const phase of PHASE_IDS) {
    const value = report.phases[phase];
    if (value === null) continue;
    if (
      !Number.isFinite(value.ms) ||
      value.ms < 0 ||
      !Number.isFinite(value.mainThreadMs) ||
      value.mainThreadMs < 0
    ) {
      return `phase model inconsistent: ${phase}`;
    }
  }

  if (
    !Number.isFinite(report.attributedMs) ||
    report.attributedMs > report.mainThreadCostMs + 0.5
  ) {
    return 'phase model inconsistent: attributedMs';
  }

  return null;
}

function phaseIntervals(
  phaseRanges: Partial<Record<StartupPhase, Array<{ startUs: number; endUs: number }>>>,
): PhaseInterval[] {
  const intervals: PhaseInterval[] = [];
  for (const phase of PHASE_IDS) {
    for (const range of phaseRanges[phase] ?? []) {
      if (range.endUs > range.startUs) intervals.push({ phase, ...range });
    }
  }
  return intervals;
}

export function analyzeStartup(
  events: readonly TraceEvent[],
  spans: readonly GlSpan[],
  marks: PageMarks,
): StartupReport {
  if (!Number.isFinite(marks.traceTimeOriginUs)) {
    throw new Error('marks.traceTimeOriginUs must be finite');
  }
  if (!Number.isFinite(marks.loadMs) || !Number.isFinite(marks.engageMs)) {
    throw new Error('marks.loadMs and marks.engageMs must be finite');
  }

  const originUs = marks.traceTimeOriginUs;
  const loadUs = toTraceUs(marks.loadMs, originUs);
  const t0Us = toTraceUs(marks.engageMs, originUs);
  const requests = resourceRequests(events, loadUs);
  const chunkUrls = new Set(requests.map((request) => request.url));
  const compileEvents = chunkEvents(events, COMPILE_NAMES, chunkUrls);
  const evaluateScriptEvents = chunkEvents(events, EVALUATE_SCRIPT_NAMES, chunkUrls);
  const backgroundParseEvents = chunkEvents(events, BACKGROUND_PARSE_NAMES, chunkUrls);
  const p2Events = [...compileEvents, ...evaluateScriptEvents, ...backgroundParseEvents];
  const tasks = mainThreadTasks(events, false);
  const thread = mainThread(events, false);
  const allSpans = spans
    .filter((span) => Number.isFinite(span.start) && Number.isFinite(span.dur))
    .slice()
    .sort((left, right) => left.start - right.start);
  const moduleSpans = moduleEvalSpans(allSpans, chunkUrls);

  const idleEvent = events
    .filter(
      (event) =>
        typeof event.name === 'string' &&
        IDLE_NAMES.has(event.name) &&
        finite(event.ts) &&
        event.ts >= t0Us,
    )
    .sort((left, right) => (left.ts ?? 0) - (right.ts ?? 0))[0];
  const idleUs = finite(idleEvent?.ts) ? idleEvent.ts : null;

  const initialDrawSpans = spansNamed(allSpans, INSTANCED_DRAW_NAMES);
  const initialFirstDraw = initialDrawSpans[0];
  const initialFirstDrawUs =
    initialFirstDraw === undefined ? null : spanStartUs(initialFirstDraw, originUs);

  const drawFrame = events
    .filter(
      (event) =>
        event.name === 'DrawFrame' &&
        hasFrameCategory(event) &&
        finite(event.ts) &&
        (initialFirstDrawUs === null || event.ts >= initialFirstDrawUs),
    )
    .sort((left, right) => (left.ts ?? 0) - (right.ts ?? 0))[0];
  const readyUs =
    finite(marks.readyMs) && marks.readyMs !== null ? toTraceUs(marks.readyMs, originUs) : null;
  const firstFrameUs =
    initialFirstDrawUs !== null && finite(drawFrame?.ts) ? drawFrame.ts : readyUs;
  const firstFrameSource =
    initialFirstDrawUs !== null && finite(drawFrame?.ts)
      ? 'draw-frame'
      : readyUs === null
        ? null
        : 'ready-mark';

  const preFrameSpans =
    firstFrameUs === null
      ? allSpans
      : allSpans.filter((span) => spanStartUs(span, originUs) <= firstFrameUs);
  const geometryEndUs =
    preFrameSpans.length === 0
      ? null
      : Math.max(...preFrameSpans.map((span) => spanEndUs(span, originUs)));

  const chunkFirstRequestUs =
    requests.length === 0 ? null : Math.min(...requests.map((request) => request.startUs));
  const chunkFinishUs = requests.reduce<number | null>((latest, request) => {
    if (request.finishUs === null) return latest;
    return latest === null ? request.finishUs : Math.max(latest, request.finishUs);
  }, null);
  const attributableMoments = [
    chunkFirstRequestUs,
    ...p2Events.map((event) => event.ts ?? Number.POSITIVE_INFINITY),
    ...moduleSpans.map((span) => spanStartUs(span, originUs)),
    ...preFrameSpans.map((span) => spanStartUs(span, originUs)),
  ].filter((moment): moment is number => finite(moment));
  const containingTask = tasks.find((task) =>
    attributableMoments.some((moment) => moment >= task.startUs && moment <= task.endUs),
  );
  const costStartUs = Math.min(t0Us, containingTask?.startUs ?? t0Us);
  const costEndUs =
    (firstFrameUs ?? (geometryEndUs !== null ? geometryEndUs : t0Us)) +
    SETTLE_TAIL_MS * MICROSECONDS_PER_MILLISECOND;
  const costTasks = tasks.filter(
    (task) => task.startUs >= costStartUs && task.startUs <= costEndUs,
  );
  const mainThreadCostMs =
    costTasks.reduce((sum, task) => sum + task.durUs, 0) / MICROSECONDS_PER_MILLISECOND;

  const orderedSpans =
    firstFrameUs === null
      ? []
      : allSpans.filter((span) => {
          const startUs = spanStartUs(span, originUs);
          return startUs >= costStartUs && startUs <= firstFrameUs;
        });

  const contextSpans = orderedSpans.filter((span) => span.name === 'getContext');
  const contextSpan = contextSpans.find((span) => span.connected !== false);
  const contextUs = contextSpan === undefined ? null : spanStartUs(contextSpan, originUs);
  const probeSpans = detachedContextSpans(allSpans);
  const probeContexts: ProbeContexts = {
    count: probeSpans.length,
    ms: probeSpans.reduce((sum, span) => sum + Math.max(0, span.dur), 0),
  };
  const programSpans = spansNamed(orderedSpans, PROGRAM_NAMES);
  const firstProgram = programSpans.find(
    (span) => contextUs === null || spanStartUs(span, originUs) >= contextUs,
  );
  const firstProgramUs = firstProgram === undefined ? null : spanStartUs(firstProgram, originUs);

  const geometrySpans = spansNamed(orderedSpans, GEOMETRY_NAMES);
  const shaderSpans = spansNamed(orderedSpans, SHADER_NAMES);
  const querySpans = spansNamed(orderedSpans, PROGRAM_QUERY_NAMES);
  const selectedQueries = firstSyncQueries(programSpans, querySpans);
  const shaderWorkSpans = [...shaderSpans, ...selectedQueries].sort(
    (left, right) => left.start - right.start,
  );
  const textureSpans = spansNamed(orderedSpans, TEXTURE_NAMES);
  const drawSpans = spansNamed(orderedSpans, INSTANCED_DRAW_NAMES);
  const firstDraw = drawSpans[0];
  const firstDrawUs = firstDraw === undefined ? null : spanStartUs(firstDraw, originUs);

  const p3EndUs =
    moduleSpans.length === 0
      ? null
      : Math.max(...moduleSpans.map((span) => spanEndUs(span, originUs)));

  const phases: Record<PhaseId, StartupPhaseReport | null> = {
    P0: null,
    P1: null,
    P2: null,
    P3: null,
    P4: null,
    P5: null,
    P6: null,
    P7: null,
    P8: null,
    P9: null,
  };

  if (idleUs !== null) {
    phases.P0 = { ms: (idleUs - t0Us) / MICROSECONDS_PER_MILLISECOND, mainThreadMs: 0 };
  }

  if (chunkFirstRequestUs !== null) {
    phases.P1 = {
      ms:
        chunkFinishUs === null
          ? 0
          : (chunkFinishUs - chunkFirstRequestUs) / MICROSECONDS_PER_MILLISECOND,
      mainThreadMs: 0,
      count: requests.length,
    };
  }

  const mainP2Intervals = mergeIntervals(
    p2Events
      .filter((event) => onMainThread(event, thread))
      .map(eventInterval)
      .filter((interval): interval is TimeInterval => interval !== null),
  );
  const moduleIntervals = moduleSpans.map((span) => spanInterval(span, originUs));
  const nestedModuleMs = intervalIntersectionMs(mainP2Intervals, moduleIntervals);
  const geometryIntervals = geometrySpans.map((span) => spanInterval(span, originUs));
  const shaderIntervals = shaderWorkSpans.map((span) => spanInterval(span, originUs));
  const textureIntervals = textureSpans.map((span) => spanInterval(span, originUs));
  const domLayoutEvents =
    p3EndUs === null || firstFrameUs === null
      ? []
      : events.filter(
          (event) =>
            typeof event.name === 'string' &&
            DOM_LAYOUT_NAMES.has(event.name) &&
            finite(event.ts) &&
            event.ts >= p3EndUs &&
            event.ts <= firstFrameUs &&
            onMainThread(event, thread),
        );
  const domLayoutIntervals = mergeIntervals(
    domLayoutEvents
      .map(eventInterval)
      .filter((interval): interval is TimeInterval => interval !== null),
  );
  const segmentExclusions = [
    ...mainP2Intervals,
    ...geometryIntervals,
    ...shaderIntervals,
    ...textureIntervals,
    ...domLayoutIntervals,
  ];

  if (p2Events.length > 0) {
    phases.P2 = {
      ms: sumEventUs(p2Events) / MICROSECONDS_PER_MILLISECOND,
      mainThreadMs: Math.max(0, intervalDurationMs(mainP2Intervals) - nestedModuleMs),
      count: p2Events.length,
    };
  }

  if (moduleSpans.length > 0) {
    const moduleMs = moduleSpans.reduce((sum, span) => sum + Math.max(0, span.dur), 0);
    phases.P3 = {
      ms: moduleMs,
      mainThreadMs: moduleMs,
      count: moduleSpans.length,
    };
  }

  if (p3EndUs !== null && contextUs !== null) {
    phases.P4 = {
      ms: (contextUs - p3EndUs) / MICROSECONDS_PER_MILLISECOND,
      mainThreadMs: exclusiveTaskOverlapMs(tasks, p3EndUs, contextUs, segmentExclusions),
    };
  }

  if (orderedSpans.length === 0) {
    for (const phase of ['P5', 'P6', 'P7', 'P8', 'P9'] as const) phases[phase] = null;
  } else {
    if (contextUs !== null && firstProgramUs !== null) {
      phases.P5 = {
        ms: (firstProgramUs - contextUs) / MICROSECONDS_PER_MILLISECOND,
        mainThreadMs: exclusiveTaskOverlapMs(tasks, contextUs, firstProgramUs, segmentExclusions),
        count: 1,
      };
    }

    const geometryMs = geometrySpans.reduce((sum, span) => sum + Math.max(0, span.dur), 0);
    phases.P6 = { ms: geometryMs, mainThreadMs: geometryMs, count: geometrySpans.length };

    const shaderMs = shaderWorkSpans.reduce((sum, span) => sum + Math.max(0, span.dur), 0);
    phases.P7 = { ms: shaderMs, mainThreadMs: shaderMs, count: shaderWorkSpans.length };

    const textureMs = textureSpans.reduce((sum, span) => sum + Math.max(0, span.dur), 0);
    const domLayoutMs = sumEventUs(domLayoutEvents) / MICROSECONDS_PER_MILLISECOND;
    phases.P8 = {
      ms: textureMs + domLayoutMs,
      mainThreadMs: textureMs + domLayoutMs,
      count: textureSpans.length,
      domLayoutMs,
    };

    if (firstDrawUs !== null && firstFrameUs !== null) {
      phases.P9 = {
        ms: Math.max(0, (firstFrameUs - firstDrawUs) / MICROSECONDS_PER_MILLISECOND),
        mainThreadMs: exclusiveTaskOverlapMs(tasks, firstDrawUs, firstFrameUs, segmentExclusions),
      };
    }
  }

  const attributedMs = (['P2', 'P3', 'P4', 'P5', 'P6', 'P7', 'P8', 'P9'] as const).reduce(
    (sum, phase) => sum + (phases[phase]?.mainThreadMs ?? 0),
    0,
  );

  const phaseRanges: Partial<Record<StartupPhase, Array<{ startUs: number; endUs: number }>>> = {};
  const addRange = (phase: StartupPhase, startUs: number, endUs: number): void => {
    if (endUs <= startUs) return;
    phaseRanges[phase] ??= [];
    phaseRanges[phase].push({ startUs, endUs });
  };

  if (idleUs !== null) addRange('P0', t0Us, idleUs);
  for (const event of p2Events) addRange('P2', event.ts ?? 0, eventEndUs(event) ?? 0);
  for (const span of moduleSpans) {
    addRange('P3', spanStartUs(span, originUs), spanEndUs(span, originUs));
  }
  if (p3EndUs !== null && contextUs !== null) addRange('P4', p3EndUs, contextUs);
  if (contextUs !== null && firstProgramUs !== null) addRange('P5', contextUs, firstProgramUs);
  for (const span of geometrySpans) {
    addRange('P6', spanStartUs(span, originUs), spanEndUs(span, originUs));
  }
  for (const span of shaderWorkSpans) {
    addRange('P7', spanStartUs(span, originUs), spanEndUs(span, originUs));
  }
  for (const span of textureSpans) {
    addRange('P8', spanStartUs(span, originUs), spanEndUs(span, originUs));
  }
  if (p3EndUs !== null && firstFrameUs !== null) {
    for (const event of events) {
      if (
        typeof event.name !== 'string' ||
        !DOM_LAYOUT_NAMES.has(event.name) ||
        !finite(event.ts) ||
        event.ts < p3EndUs ||
        event.ts > firstFrameUs ||
        !onMainThread(event, thread)
      ) {
        continue;
      }
      addRange('P8', event.ts, eventEndUs(event) ?? event.ts);
    }
  }
  if (firstDrawUs !== null && firstFrameUs !== null) addRange('P9', firstDrawUs, firstFrameUs);

  const intervals = phaseIntervals(phaseRanges);
  const longTasks = findLongTasks(
    events,
    t0Us,
    t0Us + LONG_TASK_WINDOW_MS * 1000,
    (startUs, durUs) => phaseForTask(intervals, { startUs, endUs: startUs + durUs, durUs }),
    originUs,
  );
  const blockingMs = longTasks.reduce(
    (sum, task) => sum + Math.max(0, task.dur - LONG_TASK_THRESHOLD_MS),
    0,
  );

  const shifts = (marks.layoutShifts ?? []).filter(
    (entry) =>
      Number.isFinite(entry.startTime) &&
      entry.startTime >= marks.engageMs &&
      entry.startTime <= marks.engageMs + LONG_TASK_WINDOW_MS,
  );
  const clsRaw = shifts.reduce((sum, entry) => sum + entry.value, 0);
  const clsFiltered = shifts
    .filter((entry) => !entry.hadRecentInput)
    .reduce((sum, entry) => sum + entry.value, 0);

  return {
    kind: 'startup',
    version: 1,
    t0: marks.engageMs,
    firstFrame: firstFrameUs === null ? null : toPageMs(firstFrameUs, originUs),
    firstFrameSource,
    phases,
    mainThreadCostMs,
    attributedMs,
    otherMs: mainThreadCostMs - attributedMs,
    longTasks,
    blockingMs,
    cls: { raw: clsRaw, filtered: clsFiltered, entries: shifts },
    textures: {
      ms: textureSpans.reduce((sum, span) => sum + Math.max(0, span.dur), 0),
      count: textureSpans.length,
    },
    probeContexts,
  };
}
