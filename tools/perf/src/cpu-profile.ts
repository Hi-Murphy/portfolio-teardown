const MICROSECONDS_PER_MILLISECOND = 1000;

export const PROFILE_TASK_THRESHOLD_MS = 16.7;

interface CpuProfileCallFrame {
  functionName: string;
  url: string;
}

interface CpuProfileNode {
  id: number;
  callFrame: CpuProfileCallFrame;
}

export interface CpuProfile {
  nodes: CpuProfileNode[];
  startTime: number;
  endTime: number;
  samples?: number[];
  timeDeltas?: number[];
}

export interface CpuProfileTraceData {
  startTime?: number;
  cpuProfile?: Partial<CpuProfile>;
  timeDeltas?: number[];
}

export interface CpuProfileTraceEvent {
  name?: string;
  id?: string;
  pid?: number;
  ts?: number;
  args?: {
    data?: CpuProfileTraceData;
  };
}

export interface CpuProfileSample {
  node: CpuProfileNode;
  startUs: number;
  endUs: number;
}

export interface CpuProfileTaskWindow {
  /** Trace timestamp for the task start, in microseconds. */
  startUs: number;
  durUs: number;
}

export interface CpuProfileChunk {
  chunk: string;
  selfMs: number;
  pct: number;
}

export interface CpuProfileFunction {
  fn: string;
  chunk: string;
  selfMs: number;
  pct: number;
}

export interface CpuProfileTask {
  start: number;
  dur: number;
  byChunk: CpuProfileChunk[];
  topFunctions: CpuProfileFunction[];
}

export interface CpuProfileSummary {
  route: string;
  engage: string;
  run: number;
  tasks: CpuProfileTask[];
}

export interface CpuProfileContext {
  route: string;
  engage: string;
  run: number;
  traceTimeOriginUs: number;
}

interface SelfTime {
  selfUs: number;
}

function finite(value: number | undefined): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function chunkName(url: string): string | null {
  if (url.length === 0) return null;

  try {
    const parsed = new URL(url);
    return parsed.pathname.split('/').filter(Boolean).at(-1) ?? url;
  } catch {
    return url.split(/[\\/]/).filter(Boolean).at(-1) ?? url;
  }
}

function profileSamples(profile: CpuProfile): CpuProfileSample[] {
  const samples = profile.samples ?? [];
  const deltas = profile.timeDeltas ?? [];
  const nodes = new Map(profile.nodes.map((node) => [node.id, node]));
  const result: CpuProfileSample[] = [];
  let timestampUs = profile.startTime;

  for (let index = 0; index < samples.length; index += 1) {
    const deltaUs = deltas[index];
    if (!finite(deltaUs) || deltaUs < 0) continue;

    const sampleId = samples[index];
    if (sampleId === undefined) continue;
    const node = nodes.get(sampleId);
    if (node === undefined) continue;

    const endUs = timestampUs + deltaUs;
    result.push({ node, startUs: timestampUs, endUs });
    timestampUs = endUs;
  }

  return result;
}

function traceProcessId(trace: readonly CpuProfileTraceEvent[]): number | null {
  for (let index = trace.length - 1; index >= 0; index -= 1) {
    const event = trace[index];
    if (event?.name !== 'TracingStartedInBrowser') continue;
    const data = event.args?.data as
      | {
          frames?: Array<{
            processId?: unknown;
            isMainFrame?: unknown;
            isOutermostMainFrame?: unknown;
          }>;
        }
      | undefined;
    const frames = data?.frames;
    if (!Array.isArray(frames)) continue;
    const frame =
      frames.find((entry) => entry.isMainFrame === true || entry.isOutermostMainFrame === true) ??
      (frames.length === 1 ? frames[0] : undefined);
    if (typeof frame?.processId === 'number' && Number.isFinite(frame.processId)) {
      return frame.processId;
    }
  }
  return null;
}

function mergeTraceProfiles(trace: readonly CpuProfileTraceEvent[]): CpuProfile[] {
  const processId = traceProcessId(trace);
  const profiles = new Map<string, CpuProfile>();

  for (const event of trace) {
    if (event.name !== 'Profile' && event.name !== 'ProfileChunk') continue;
    if (processId !== null && event.pid !== processId) continue;
    if (event.id === undefined) continue;

    const data = event.args?.data;
    const cpuProfile = data?.cpuProfile;
    const current = profiles.get(event.id) ?? {
      nodes: [],
      startTime: data?.startTime ?? cpuProfile?.startTime ?? event.ts ?? 0,
      endTime: 0,
      samples: [],
      timeDeltas: [],
    };
    current.nodes.push(...(cpuProfile?.nodes ?? []));
    current.samples?.push(...(cpuProfile?.samples ?? []));
    current.timeDeltas?.push(...(data?.timeDeltas ?? cpuProfile?.timeDeltas ?? []));
    profiles.set(event.id, current);
  }

  for (const profile of profiles.values()) {
    profile.endTime =
      profile.startTime +
      (profile.timeDeltas ?? []).reduce(
        (total, delta) => total + (finite(delta) && delta > 0 ? delta : 0),
        0,
      );
  }
  return [...profiles.values()].sort((left, right) => left.startTime - right.startTime);
}

export function samplesInWindow(
  trace: readonly CpuProfileTraceEvent[],
  startUs: number,
  endUs: number,
): CpuProfileSample[] {
  const start = Math.min(startUs, endUs);
  const end = Math.max(startUs, endUs);
  return mergeTraceProfiles(trace)
    .flatMap(profileSamples)
    .filter((sample) => Math.min(sample.endUs, end) > Math.max(sample.startUs, start))
    .sort(
      (left, right) =>
        left.startUs - right.startUs || left.endUs - right.endUs || left.node.id - right.node.id,
    );
}

function addSelfTime(values: Map<string, SelfTime>, key: string, selfUs: number): void {
  const prior = values.get(key);
  if (prior === undefined) values.set(key, { selfUs });
  else prior.selfUs += selfUs;
}

function sortedBySelfTime<T extends SelfTime>(
  entries: Iterable<[string, T]>,
  limit = Number.POSITIVE_INFINITY,
): Array<[string, T]> {
  return [...entries]
    .sort(([leftKey, left], [rightKey, right]) => {
      return right.selfUs - left.selfUs || leftKey.localeCompare(rightKey);
    })
    .slice(0, limit);
}

export function summarizeCpuProfile(
  profile: CpuProfile,
  tasks: readonly CpuProfileTaskWindow[],
  context: CpuProfileContext,
): CpuProfileSummary {
  const samples = profileSamples(profile);
  const thresholdUs = PROFILE_TASK_THRESHOLD_MS * MICROSECONDS_PER_MILLISECOND;

  const summaryTasks = tasks
    .filter(
      (task) => Number.isFinite(task.startUs) && finite(task.durUs) && task.durUs > thresholdUs,
    )
    .map((task) => {
      const taskEndUs = task.startUs + task.durUs;
      const byChunk = new Map<string, SelfTime>();
      const byFunction = new Map<string, SelfTime & { fn: string; chunk: string }>();

      for (const sample of samples) {
        const overlapUs =
          Math.min(sample.endUs, taskEndUs) - Math.max(sample.startUs, task.startUs);
        if (overlapUs <= 0) continue;

        const functionName = sample.node.callFrame.functionName.trim();
        if (functionName === '(idle)') continue;

        const url = sample.node.callFrame.url;
        const chunk = url.length === 0 ? '(native)' : chunkName(url);
        if (chunk === null) continue;

        const fn = functionName || (chunk === '(native)' ? '(native)' : '(anonymous)');
        addSelfTime(byChunk, chunk, overlapUs);
        const functionKey = `${chunk}\0${fn}`;
        const functionEntry = byFunction.get(functionKey);
        if (functionEntry === undefined) {
          byFunction.set(functionKey, { chunk, fn, selfUs: overlapUs });
        } else {
          functionEntry.selfUs += overlapUs;
        }
      }

      const dur = task.durUs / MICROSECONDS_PER_MILLISECOND;
      const chunkEntries = sortedBySelfTime(byChunk).map(([chunk, value]) => ({
        chunk,
        selfMs: value.selfUs / MICROSECONDS_PER_MILLISECOND,
        pct: task.durUs === 0 ? 0 : (value.selfUs / task.durUs) * 100,
      }));
      const functionEntries = sortedBySelfTime(byFunction, 8).map(([, value]) => ({
        fn: value.fn,
        chunk: value.chunk,
        selfMs: value.selfUs / MICROSECONDS_PER_MILLISECOND,
        pct: task.durUs === 0 ? 0 : (value.selfUs / task.durUs) * 100,
      }));

      return {
        start: (task.startUs - context.traceTimeOriginUs) / MICROSECONDS_PER_MILLISECOND,
        dur,
        byChunk: chunkEntries,
        topFunctions: functionEntries,
      };
    });

  return {
    route: context.route,
    engage: context.engage,
    run: context.run,
    tasks: summaryTasks,
  };
}
