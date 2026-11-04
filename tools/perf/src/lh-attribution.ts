import type { BundleManifest } from './bundle-manifest.ts';
import { summarizeCpuProfile, type CpuProfile, type CpuProfileFunction } from './cpu-profile.ts';
import { longTasksFrom, type LHR } from './lighthouse.ts';

const MICROSECONDS_PER_MILLISECOND = 1000;
const DEFAULT_CPU_MULTIPLIER = 4;
const MATCH_TOLERANCE_PCT = 25;
const LOOSE_MATCH_TOLERANCE_PCT = 50;
const TOP_FUNCTION_SHARE_PCT = 5;
const WEBGL_SHARE_PCT = 20;
const REACT_SHARE_PCT = 40;
const MODULE_EVAL_SHARE_PCT = 40;
const RUN_TASK = 'RunTask';
const MAIN_THREAD_NAME = 'CrRendererMain';
const BUILD_ID_PATTERN = /_next\/static\/[^/]+\//;
const BUILD_ID_PLACEHOLDER = '_next/static/<build-id>/';
const WEBGL_FUNCTION = /webgl|hasWebgl|WebGLRenderer/i;
const REACT_FUNCTION =
  /performWorkOnRoot|commitRoot|commitMutationEffects|renderRoot|performUnitOfWork|beginWork|completeWork/;
const TRANSITION_FUNCTION = /transition/i;
const MODULE_EVAL_FUNCTION =
  /^v8\.evaluateModule$|^EvaluateScript$|^moduleEval$|^__webpack_require__$/;
const SNIPPET_LENGTH = 120;

interface ProfileCallFrame {
  functionName: string;
  url: string;
  lineNumber?: number;
  columnNumber?: number;
}

interface TraceProfileNode {
  id: number;
  callFrame: {
    functionName?: string;
    url?: string;
    lineNumber?: number;
    columnNumber?: number;
  };
  parent?: number;
}

interface ProfileNode {
  id: number;
  callFrame: ProfileCallFrame;
  parent?: number;
}

interface AttributionCpuProfile extends Omit<CpuProfile, 'nodes'> {
  nodes: ProfileNode[];
}

interface ProfileData {
  nodes?: TraceProfileNode[];
  samples?: number[];
  timeDeltas?: number[];
  startTime?: number;
}

interface TraceData {
  name?: string;
  frames?: Array<{
    processId?: number;
    isMainFrame?: boolean;
    isOutermostMainFrame?: boolean;
    parent?: string;
  }>;
  cpuProfile?: ProfileData;
  timeDeltas?: number[];
  startTime?: number;
  url?: string;
  fileName?: string;
  scriptName?: string;
  sourceURL?: string;
  stackTrace?: Array<{ url?: string }>;
}

export interface AttributionTraceEvent {
  name?: string;
  cat?: string;
  ph?: string;
  id?: string;
  pid?: number;
  tid?: number;
  ts?: number;
  dur?: number;
  args?: {
    name?: string;
    data?: TraceData;
  };
}

interface ObservedTask {
  startUs: number;
  endUs: number;
  durMs: number;
  urls: Set<string>;
  runTaskUrls: Set<string>;
}

interface MergedProfile {
  profile: AttributionCpuProfile;
  chunks: number;
}

interface ProfileSample {
  node: ProfileNode;
  startUs: number;
  endUs: number;
}

export type AttributionHypothesis = 'H1' | 'H2' | 'H3' | 'H4';
export type AttributionMatchQuality = 'exact' | 'loose';

export interface AttributionStackFrame {
  fn: string;
  url: string;
  chunk: string;
  lineNumber: number | null;
  columnNumber: number | null;
  snippet: string | null;
}

export interface AttributionFunction {
  fn: string;
  chunk: string;
  module: string | null;
  selfMs: number;
  selfPct: number;
  lineNumber: number | null;
  columnNumber: number | null;
  snippet: string | null;
  stack: AttributionStackFrame[];
}

export interface AttributionTask {
  url: string;
  simulatedStartMs: number;
  simulatedMs: number;
  observedStartMs: number | null;
  observedMs: number | null;
  matched: boolean;
  matchQuality: AttributionMatchQuality | null;
  matchErrorPct: number | null;
  tbtMs: number;
  tbtSharePct: number;
  chunk: string | null;
  module: string | null;
  topFunctions: AttributionFunction[];
  hypotheses: AttributionHypothesis[];
}

export interface LanternPair {
  url: string;
  simulatedStartMs: number;
  observedStartMs: number;
  startGapMs: number;
  simulatedMs: number;
  observedMs: number;
  observedEquivalentMs: number;
}

export interface AttributionReport {
  source: 'lighthouse-profile' | 'fallback';
  tasks: AttributionTask[];
  lantern: {
    url: string;
    route: string;
    cpuMultiplier: number;
    profileChunks: number;
    simulatedTbtMs: number;
    observedBlockingMs: number;
    differenceMs: number;
    differencePct: number | null;
    pairs: LanternPair[];
    note?: string;
  };
}

export interface AttributionOptions {
  readChunkSource?: (url: string) => string | null | undefined;
}

function finite(value: number | undefined): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function urlPath(value: string): string | null {
  try {
    return new URL(value).pathname;
  } catch {
    return null;
  }
}

function normalizeUrl(value: string): string {
  try {
    const url = new URL(value);
    url.hash = '';
    return url.href;
  } catch {
    return value;
  }
}

function sameUrl(left: string, right: string): boolean {
  if (left === right || normalizeUrl(left) === normalizeUrl(right)) return true;
  return urlPath(left) !== null && urlPath(left) === urlPath(right);
}

function manifestPath(pathOrUrl: string): string {
  const raw = urlPath(pathOrUrl) ?? pathOrUrl;
  const withoutLeadingSlash = raw.replace(/^\/+/, '');
  return withoutLeadingSlash.replace(BUILD_ID_PATTERN, BUILD_ID_PLACEHOLDER);
}

function scriptPath(value: string): string {
  return manifestPath(value);
}

function threadName(event: AttributionTraceEvent): string | null {
  const name = event.args?.name ?? event.args?.data?.name;
  return typeof name === 'string' ? name : null;
}

function pageProcessId(events: readonly AttributionTraceEvent[]): number | null {
  for (let index = events.length - 1; index >= 0; index -= 1) {
    const event = events[index];
    if (event?.name !== 'TracingStartedInBrowser') continue;
    const frames = event.args?.data?.frames;
    if (!Array.isArray(frames)) continue;
    const mainFrame =
      frames.find((frame) => frame.isMainFrame === true || frame.isOutermostMainFrame === true) ??
      frames.find((frame) => frame.parent === undefined);
    if (finite(mainFrame?.processId)) return mainFrame.processId;
  }

  return events.find((event) => threadName(event) === MAIN_THREAD_NAME)?.pid ?? null;
}

function mainThreadId(events: readonly AttributionTraceEvent[], pid: number): number | null {
  const named = events.find(
    (event) =>
      event.pid === pid &&
      event.ph === 'M' &&
      event.name === 'thread_name' &&
      threadName(event) === MAIN_THREAD_NAME &&
      finite(event.tid),
  );
  return named && finite(named.tid) ? named.tid : null;
}

function eventUrls(event: AttributionTraceEvent): string[] {
  const data = event.args?.data;
  if (data === undefined) return [];

  return [
    data.url,
    data.fileName,
    data.scriptName,
    data.sourceURL,
    ...(data.stackTrace ?? []).map((entry) => entry.url),
  ].filter((value): value is string => typeof value === 'string' && value !== '');
}

function observedTasks(
  events: readonly AttributionTraceEvent[],
  pid: number,
  tid: number,
): ObservedTask[] {
  const byStart = new Map<number, AttributionTraceEvent>();
  for (const event of events) {
    if (
      event.name !== RUN_TASK ||
      event.ph !== 'X' ||
      event.pid !== pid ||
      event.tid !== tid ||
      !finite(event.ts) ||
      !finite(event.dur)
    ) {
      continue;
    }

    const prior = byStart.get(event.ts);
    if (prior === undefined || (finite(prior.dur) && event.dur > prior.dur)) {
      byStart.set(event.ts, event);
    }
  }

  const tasks: ObservedTask[] = [];
  let lastEndUs = Number.NEGATIVE_INFINITY;
  for (const event of [...byStart.values()].sort(
    (left, right) => (left.ts ?? 0) - (right.ts ?? 0) || (right.dur ?? 0) - (left.dur ?? 0),
  )) {
    if (!finite(event.ts) || !finite(event.dur) || event.ts < lastEndUs) continue;
    const endUs = event.ts + event.dur;
    const urls = new Set(eventUrls(event));
    tasks.push({
      startUs: event.ts,
      endUs,
      durMs: event.dur / MICROSECONDS_PER_MILLISECOND,
      urls,
      runTaskUrls: new Set(urls),
    });
    lastEndUs = endUs;
  }
  return tasks;
}

function mergeProfile(
  profile: AttributionCpuProfile | undefined,
  event: AttributionTraceEvent,
): AttributionCpuProfile {
  const data = event.args?.data;
  const cpuProfile = data?.cpuProfile;
  const target = profile ?? {
    nodes: [],
    startTime: data?.startTime ?? cpuProfile?.startTime ?? event.ts ?? 0,
    endTime: 0,
    samples: [],
    timeDeltas: [],
  };
  target.nodes.push(
    ...(cpuProfile?.nodes ?? []).map((node) => ({
      id: node.id,
      callFrame: {
        functionName: node.callFrame.functionName ?? '',
        url: node.callFrame.url ?? '',
        ...(finite(node.callFrame.lineNumber) ? { lineNumber: node.callFrame.lineNumber } : {}),
        ...(finite(node.callFrame.columnNumber)
          ? { columnNumber: node.callFrame.columnNumber }
          : {}),
      },
      ...(finite(node.parent) ? { parent: node.parent } : {}),
    })),
  );
  target.samples?.push(...(cpuProfile?.samples ?? []));
  target.timeDeltas?.push(...(data?.timeDeltas ?? cpuProfile?.timeDeltas ?? []));
  return target;
}

function mergedProfiles(
  events: readonly AttributionTraceEvent[],
  pid: number,
  tid: number,
): MergedProfile[] {
  const profiles = new Map<string, MergedProfile>();

  for (const event of events) {
    if (
      (event.name !== 'Profile' && event.name !== 'ProfileChunk') ||
      event.pid !== pid ||
      (event.name === 'Profile' && event.tid !== tid) ||
      typeof event.id !== 'string'
    ) {
      continue;
    }

    const existing = profiles.get(event.id);
    const profile = mergeProfile(existing?.profile, event);
    const chunks = (existing?.chunks ?? 0) + (event.name === 'ProfileChunk' ? 1 : 0);
    profiles.set(event.id, { profile, chunks });
  }

  for (const { profile } of profiles.values()) {
    const deltaUs = (profile.timeDeltas ?? []).reduce(
      (sum, value) => sum + (finite(value) && value > 0 ? value : 0),
      0,
    );
    profile.endTime = profile.startTime + deltaUs;
  }

  return [...profiles.values()].sort(
    (left, right) => left.profile.startTime - right.profile.startTime,
  );
}

function profileSamples(profile: AttributionCpuProfile): ProfileSample[] {
  const nodes = new Map(profile.nodes.map((node) => [node.id, node]));
  const samples = profile.samples ?? [];
  const deltas = profile.timeDeltas ?? [];
  const result: ProfileSample[] = [];
  let timestampUs = profile.startTime;

  for (let index = 0; index < samples.length; index += 1) {
    const deltaUs = deltas[index];
    const node = nodes.get(samples[index] ?? Number.NaN);
    if (!finite(deltaUs) || deltaUs < 0 || node === undefined) continue;
    const endUs = timestampUs + deltaUs;
    result.push({ node, startUs: timestampUs, endUs });
    timestampUs = endUs;
  }

  return result;
}

function profilesForTask(profiles: readonly MergedProfile[], task: ObservedTask): MergedProfile[] {
  return profiles.filter(({ profile }) =>
    profileSamples(profile).some(
      (sample) => Math.min(sample.endUs, task.endUs) > Math.max(sample.startUs, task.startUs),
    ),
  );
}

function addProfileUrls(tasks: readonly ObservedTask[], profiles: readonly MergedProfile[]): void {
  const samples = profiles.flatMap(({ profile }) => profileSamples(profile));
  for (const task of tasks) {
    for (const sample of samples) {
      if (Math.min(sample.endUs, task.endUs) <= Math.max(sample.startUs, task.startUs)) continue;
      const url = sample.node.callFrame.url;
      if (url !== '') task.urls.add(url);
    }
  }
}

function taskProfile(
  profiles: readonly MergedProfile[],
  task: ObservedTask,
): AttributionCpuProfile | null {
  const overlapping = profilesForTask(profiles, task);
  if (overlapping.length === 0) return null;
  return (
    overlapping
      .map(({ profile }) => ({
        profile,
        overlapUs: profileSamples(profile).reduce(
          (sum, sample) =>
            sum +
            Math.max(
              0,
              Math.min(sample.endUs, task.endUs) - Math.max(sample.startUs, task.startUs),
            ),
          0,
        ),
      }))
      .sort((left, right) => right.overlapUs - left.overlapUs)[0]?.profile ?? null
  );
}

function manifestMaps(manifest: BundleManifest): {
  byPath: Map<string, string>;
  byBasename: Map<string, string>;
} {
  const byPath = new Map<string, string>();
  const byBasename = new Map<string, string>();
  for (const file of [...manifest.files].sort((left, right) =>
    left.path.localeCompare(right.path),
  )) {
    byPath.set(manifestPath(file.path), file.path);
    byBasename.set(file.path.split('/').at(-1) ?? file.path, file.path);
  }
  return { byPath, byBasename };
}

function moduleForChunk(chunk: string, maps: ReturnType<typeof manifestMaps>): string | null {
  return maps.byPath.get(manifestPath(chunk)) ?? maps.byBasename.get(chunk) ?? null;
}

function callFrameChunk(url: string): string {
  if (url === '') return '(native)';
  try {
    return new URL(url).pathname.split('/').filter(Boolean).at(-1) ?? url;
  } catch {
    return url.split(/[\\/]/).filter(Boolean).at(-1) ?? url;
  }
}

function frameFunction(node: ProfileNode): { fn: string; chunk: string } | null {
  const name = node.callFrame.functionName.trim();
  if (name === '(idle)') return null;
  const chunk = callFrameChunk(node.callFrame.url);
  return { fn: name || (chunk === '(native)' ? '(native)' : '(anonymous)'), chunk };
}

function representativeNodes(
  profile: AttributionCpuProfile,
  task: ObservedTask,
): Map<string, { node: ProfileNode; overlapUs: number }> {
  const representatives = new Map<string, Map<number, { node: ProfileNode; overlapUs: number }>>();
  for (const sample of profileSamples(profile)) {
    const overlapUs = Math.min(sample.endUs, task.endUs) - Math.max(sample.startUs, task.startUs);
    if (overlapUs <= 0) continue;
    const identity = frameFunction(sample.node);
    if (identity === null) continue;

    const key = `${identity.chunk}\0${identity.fn}`;
    const byNode = representatives.get(key) ?? new Map();
    const prior = byNode.get(sample.node.id);
    if (prior === undefined) byNode.set(sample.node.id, { node: sample.node, overlapUs });
    else prior.overlapUs += overlapUs;
    representatives.set(key, byNode);
  }

  return new Map(
    [...representatives].map(([key, byNode]) => {
      const best = [...byNode.values()].sort((left, right) => right.overlapUs - left.overlapUs)[0];
      if (best === undefined) throw new Error('representative node is missing');
      return [key, best];
    }),
  );
}

function sourceOffset(source: string, lineNumber: number, columnNumber: number): number | null {
  if (lineNumber < 0 || columnNumber < 0) return null;
  let lineStart = 0;
  for (let line = 0; line < lineNumber; line += 1) {
    const newline = source.indexOf('\n', lineStart);
    if (newline === -1) return null;
    lineStart = newline + 1;
  }

  const lineEnd = source.indexOf('\n', lineStart);
  return Math.min(lineStart + columnNumber, lineEnd === -1 ? source.length : lineEnd);
}

function sourceSnippet(
  node: ProfileNode,
  readChunkSource: (url: string) => string | null,
): string | null {
  const url = node.callFrame.url;
  if (url === '' || !finite(node.callFrame.lineNumber)) return null;
  const source = readChunkSource(url);
  if (source === null) return null;
  const offset = sourceOffset(
    source,
    node.callFrame.lineNumber,
    finite(node.callFrame.columnNumber) ? node.callFrame.columnNumber : 0,
  );
  if (offset === null) return null;
  const snippet = source
    .slice(offset, offset + SNIPPET_LENGTH)
    .replaceAll(/\s+/g, ' ')
    .trim();
  return snippet === '' ? null : snippet;
}

function inclusiveStack(
  node: ProfileNode,
  profile: AttributionCpuProfile,
  readChunkSource: (url: string) => string | null,
): AttributionStackFrame[] {
  const nodes = new Map(profile.nodes.map((candidate) => [candidate.id, candidate]));
  const stack: AttributionStackFrame[] = [];
  const seen = new Set<number>();
  let current: ProfileNode | undefined = node;

  while (current !== undefined && stack.length < 3 && !seen.has(current.id)) {
    seen.add(current.id);
    const identity = frameFunction(current);
    stack.push({
      fn: identity?.fn ?? '(anonymous)',
      url: current.callFrame.url,
      chunk: identity?.chunk ?? '(native)',
      lineNumber: finite(current.callFrame.lineNumber) ? current.callFrame.lineNumber : null,
      columnNumber: finite(current.callFrame.columnNumber) ? current.callFrame.columnNumber : null,
      snippet: sourceSnippet(current, readChunkSource),
    });
    current = current.parent === undefined ? undefined : nodes.get(current.parent);
  }
  return stack;
}

function chunkSourceReader(options: AttributionOptions): (url: string) => string | null {
  const read = options.readChunkSource;
  if (read === undefined) return () => null;
  const cache = new Map<string, string | null>();

  return (url) => {
    const cached = cache.get(url);
    if (cached !== undefined) return cached;
    try {
      const source = read(url);
      const normalized = typeof source === 'string' ? source : null;
      cache.set(url, normalized);
      return normalized;
    } catch {
      cache.set(url, null);
      return null;
    }
  };
}

function route(manifest: BundleManifest, url: string): string {
  return (
    manifest.routes.find((entry) => entry.route === urlPath(url))?.route ?? urlPath(url) ?? url
  );
}

function initialScripts(manifest: BundleManifest, url: string): Set<string> {
  const currentRoute = route(manifest, url);
  const entry = manifest.routes.find((candidate) => candidate.route === currentRoute);
  return new Set((entry?.scripts ?? []).map(scriptPath));
}

function isInitialScript(scriptUrl: string, scripts: ReadonlySet<string>): boolean {
  return scripts.has(scriptPath(scriptUrl));
}

function firstEagerImport(
  profiles: readonly MergedProfile[],
  scripts: ReadonlySet<string>,
): number | null {
  const samples = profiles
    .flatMap(({ profile }) => profileSamples(profile))
    .sort((left, right) => left.startUs - right.startUs);
  const sample = samples.find(({ node }) => {
    const url = node.callFrame.url;
    return (
      MODULE_EVAL_FUNCTION.test(node.callFrame.functionName) &&
      url !== '' &&
      !isInitialScript(url, scripts)
    );
  });
  return sample?.startUs ?? null;
}

function functionShare(
  functions: readonly CpuProfileFunction[],
  totalSelfMs: number,
  pattern: RegExp,
): number {
  if (totalSelfMs === 0) return 0;
  const matching = functions
    .filter((entry) => pattern.test(entry.fn))
    .reduce((sum, entry) => sum + entry.selfMs, 0);
  return (matching / totalSelfMs) * 100;
}

function hypothesesFor(
  functions: readonly CpuProfileFunction[],
  totalSelfMs: number,
  observed: ObservedTask | null,
  eagerImportUs: number | null,
): AttributionHypothesis[] {
  const hypotheses: AttributionHypothesis[] = [];
  const webglShare = functionShare(functions, totalSelfMs, WEBGL_FUNCTION);
  const reactShare = functionShare(functions, totalSelfMs, REACT_FUNCTION);
  const transitionShare = functionShare(functions, totalSelfMs, TRANSITION_FUNCTION);
  const moduleShare = functionShare(functions, totalSelfMs, MODULE_EVAL_FUNCTION);

  if (webglShare >= WEBGL_SHARE_PCT) hypotheses.push('H1');
  if (reactShare >= REACT_SHARE_PCT && transitionShare < REACT_SHARE_PCT) hypotheses.push('H2');
  if (moduleShare >= MODULE_EVAL_SHARE_PCT) hypotheses.push('H3');
  if (observed !== null && eagerImportUs !== null && observed.endUs <= eagerImportUs) {
    hypotheses.push('H4');
  }
  return hypotheses;
}

function topFunctions(
  functions: readonly CpuProfileFunction[],
  totalSelfMs: number,
  maps: ReturnType<typeof manifestMaps>,
  profile: AttributionCpuProfile | null,
  task: ObservedTask | null,
  readChunkSource: (url: string) => string | null,
): AttributionFunction[] {
  const representatives =
    profile === null || task === null ? new Map() : representativeNodes(profile, task);

  return functions
    .map((entry) => {
      const representative = representatives.get(`${entry.chunk}\0${entry.fn}`)?.node ?? null;
      const stack =
        representative === null || profile === null
          ? []
          : inclusiveStack(representative, profile, readChunkSource);
      const ownFrame = stack[0];
      return {
        fn: entry.fn,
        chunk: entry.chunk,
        module: moduleForChunk(entry.chunk, maps),
        selfMs: entry.selfMs,
        selfPct: totalSelfMs === 0 ? 0 : (entry.selfMs / totalSelfMs) * 100,
        lineNumber: ownFrame?.lineNumber ?? null,
        columnNumber: ownFrame?.columnNumber ?? null,
        snippet: ownFrame?.snippet ?? null,
        stack,
      };
    })
    .filter((entry) => entry.selfPct >= TOP_FUNCTION_SHARE_PCT);
}

function lhrTbt(lhr: LHR): number {
  const measured = lhr.audits?.['total-blocking-time']?.numericValue;
  if (typeof measured === 'number' && Number.isFinite(measured)) return measured;
  return longTasksFrom(lhr).reduce((sum, task) => sum + Math.max(0, task.durMs - 50), 0);
}

function traceOrigin(
  events: readonly AttributionTraceEvent[],
  tasks: readonly ObservedTask[],
): number {
  const started = events.find(
    (event) => event.name === 'TracingStartedInBrowser' && finite(event.ts),
  );
  return started?.ts ?? tasks[0]?.startUs ?? 0;
}

interface TaskMatch {
  task: ObservedTask;
  errorPct: number;
  quality: AttributionMatchQuality;
}

function isUrlLess(url: string): boolean {
  const value = url.trim();
  return value === '' || value.toLowerCase() === 'unattributable';
}

function durationErrorPct(task: ObservedTask, simulatedMs: number, multiplier: number): number {
  if (simulatedMs === 0) return Number.POSITIVE_INFINITY;
  return (Math.abs(task.durMs * multiplier - simulatedMs) / simulatedMs) * 100;
}

function candidatesFor(
  longTask: { url: string; durMs: number },
  tasks: readonly ObservedTask[],
  tolerancePct: number,
  multiplier: number,
): Array<{ task: ObservedTask; errorPct: number }> {
  const urlLess = isUrlLess(longTask.url);
  return tasks
    .filter((task) =>
      urlLess
        ? task.runTaskUrls.size === 0
        : [...task.urls].some((taskUrl) => sameUrl(taskUrl, longTask.url)),
    )
    .map((task) => ({ task, errorPct: durationErrorPct(task, longTask.durMs, multiplier) }))
    .filter((candidate) => candidate.errorPct <= tolerancePct)
    .sort(
      (left, right) => left.errorPct - right.errorPct || left.task.startUs - right.task.startUs,
    );
}

function matchTask(
  longTask: { url: string; durMs: number },
  tasks: readonly ObservedTask[],
  multiplier: number,
): TaskMatch | undefined {
  const exact = candidatesFor(longTask, tasks, MATCH_TOLERANCE_PCT, multiplier)[0];
  if (exact !== undefined) return { ...exact, quality: 'exact' };
  if (isUrlLess(longTask.url)) return undefined;

  const loose = candidatesFor(longTask, tasks, LOOSE_MATCH_TOLERANCE_PCT, multiplier)[0];
  return loose === undefined ? undefined : { ...loose, quality: 'loose' };
}

export function analyzeAttribution(
  lhr: LHR,
  events: readonly AttributionTraceEvent[],
  manifest: BundleManifest,
  options: AttributionOptions = {},
): AttributionReport {
  const url =
    lhr.finalDisplayedUrl ?? lhr.mainDocumentUrl ?? lhr.finalUrl ?? lhr.requestedUrl ?? '';
  // Lantern scales observed tasks by the run's own multiplier (4 by default; --cpu-multiplier locally).
  const multiplier =
    lhr.configSettings?.throttling?.cpuSlowdownMultiplier ?? DEFAULT_CPU_MULTIPLIER;
  const pid = pageProcessId(events);
  const tid = pid === null ? null : mainThreadId(events, pid);
  const tasks = pid === null || tid === null ? [] : observedTasks(events, pid, tid);
  const profiles = pid === null || tid === null ? [] : mergedProfiles(events, pid, tid);
  addProfileUrls(tasks, profiles);

  const originUs = traceOrigin(events, tasks);
  const maps = manifestMaps(manifest);
  const scripts = initialScripts(manifest, url);
  const eagerImportUs = firstEagerImport(profiles, scripts);
  const simulatedTbtMs = lhrTbt(lhr);
  const longTasks = [...longTasksFrom(lhr)].sort((left, right) => left.startMs - right.startMs);
  const unmatched = [...tasks];
  const reportTasks: AttributionTask[] = [];
  const readChunkSource = chunkSourceReader(options);

  for (const longTask of longTasks) {
    const match = matchTask(longTask, unmatched, multiplier);
    if (match !== undefined) {
      unmatched.splice(unmatched.indexOf(match.task), 1);
    }

    const profile = match === undefined ? null : taskProfile(profiles, match.task);
    const cpuSummary =
      profile === null || match === undefined
        ? null
        : summarizeCpuProfile(
            profile,
            [
              {
                startUs: match.task.startUs,
                durUs: match.task.durMs * MICROSECONDS_PER_MILLISECOND,
              },
            ],
            { route: route(manifest, url), engage: 'load', run: 0, traceTimeOriginUs: originUs },
          ).tasks[0];
    const totalSelfMs = (cpuSummary?.byChunk ?? []).reduce((sum, entry) => sum + entry.selfMs, 0);
    const functions = cpuSummary?.topFunctions ?? [];
    const dominantChunk = cpuSummary?.byChunk[0]?.chunk ?? null;
    const tbtMs = Math.max(0, longTask.durMs - 50);

    reportTasks.push({
      url: longTask.url,
      simulatedStartMs: longTask.startMs,
      simulatedMs: longTask.durMs,
      observedStartMs:
        match === undefined ? null : (match.task.startUs - originUs) / MICROSECONDS_PER_MILLISECOND,
      observedMs: match?.task.durMs ?? null,
      matched: match !== undefined,
      matchQuality: match?.quality ?? null,
      matchErrorPct: match?.errorPct ?? null,
      tbtMs,
      tbtSharePct: simulatedTbtMs === 0 ? 0 : (tbtMs / simulatedTbtMs) * 100,
      chunk: dominantChunk,
      module: dominantChunk === null ? null : moduleForChunk(dominantChunk, maps),
      topFunctions: topFunctions(
        functions,
        totalSelfMs,
        maps,
        profile,
        match?.task ?? null,
        readChunkSource,
      ),
      hypotheses: hypothesesFor(functions, totalSelfMs, match?.task ?? null, eagerImportUs),
    });
  }

  const observedBlockingMs = tasks.reduce(
    (sum, task) => sum + Math.max(0, task.durMs * multiplier - 50),
    0,
  );
  const differenceMs = observedBlockingMs - simulatedTbtMs;
  const profileChunks = profiles.reduce((sum, profile) => sum + profile.chunks, 0);
  const source = profileChunks > 0 ? 'lighthouse-profile' : 'fallback';

  return {
    source,
    tasks: reportTasks,
    lantern: {
      url,
      route: route(manifest, url),
      cpuMultiplier: multiplier,
      profileChunks,
      simulatedTbtMs,
      observedBlockingMs,
      differenceMs,
      differencePct: simulatedTbtMs === 0 ? null : (Math.abs(differenceMs) / simulatedTbtMs) * 100,
      pairs: reportTasks.flatMap((task) =>
        task.observedStartMs === null || task.observedMs === null
          ? []
          : [
              {
                url: task.url,
                simulatedStartMs: task.simulatedStartMs,
                observedStartMs: task.observedStartMs,
                startGapMs: task.observedStartMs - task.simulatedStartMs,
                simulatedMs: task.simulatedMs,
                observedMs: task.observedMs,
                observedEquivalentMs: task.observedMs * multiplier,
              },
            ],
      ),
      ...(source === 'fallback'
        ? {
            note: 'No ProfileChunk events were present; observed timings are reported without function or module attribution.',
          }
        : {}),
    },
  };
}

function escapeCell(value: string): string {
  return value.replaceAll('|', '\\|').replaceAll('\n', ' ');
}

function inlineCode(value: string): string {
  return `\`${value.replaceAll('\\', '\\\\').replaceAll('`', '\\`')}\``;
}

function number(value: number): string {
  return value.toFixed(1);
}

export function renderAttributionMarkdown(report: AttributionReport): string {
  const lines = [
    '# Lighthouse per-task attribution',
    '',
    `LHR: ${report.lantern.url}`,
    `Route: ${report.lantern.route}`,
    `Source: ${report.source} (${report.lantern.profileChunks} ProfileChunk events, ${report.lantern.cpuMultiplier}x observed-to-simulated multiplier)`,
  ];
  if (report.lantern.note !== undefined) lines.push('', `Fallback note: ${report.lantern.note}`);

  lines.push(
    '',
    '| # | Simulated start | Simulated | Observed | Match | TBT | TBT share | URL | Chunk | Module | Top functions (self time) | Hypotheses |',
    '| ---: | ---: | ---: | ---: | --- | ---: | ---: | --- | --- | --- | --- | --- |',
  );

  report.tasks.forEach((task, index) => {
    const functions =
      task.topFunctions.length === 0
        ? '—'
        : task.topFunctions
            .map(
              (entry) =>
                `${escapeCell(entry.fn)} ${number(entry.selfMs)} ms (${number(entry.selfPct)}%)`,
            )
            .join('<br>');
    lines.push(
      `| ${index + 1} | ${number(task.simulatedStartMs)} ms | ${number(task.simulatedMs)} ms | ${task.observedMs === null ? 'not matched' : `${number(task.observedMs)} ms`} | ${task.matchQuality ?? '—'} | ${number(task.tbtMs)} ms | ${number(task.tbtSharePct)}% | ${escapeCell(task.url)} | ${escapeCell(task.chunk ?? '—')} | ${escapeCell(task.module ?? '—')} | ${functions} | ${task.hypotheses.length === 0 ? '—' : task.hypotheses.join(', ')} |`,
    );
  });

  lines.push('', '## Task details');
  report.tasks.forEach((task, index) => {
    lines.push(
      '',
      `### Task ${index + 1} — ${number(task.simulatedStartMs)} ms simulated`,
      '',
      `- URL: ${inlineCode(task.url)}`,
      `- Simulated: ${number(task.simulatedMs)} ms; observed: ${task.observedMs === null ? 'not matched' : `${number(task.observedMs)} ms`}; match: ${task.matchQuality ?? '—'}`,
    );

    if (task.topFunctions.length === 0) {
      lines.push('- Top functions: none ≥ 5% self time');
      return;
    }

    for (const entry of task.topFunctions) {
      lines.push(
        `- ${inlineCode(entry.fn)} — ${number(entry.selfMs)} ms (${number(entry.selfPct)}%), chunk ${inlineCode(entry.chunk)}, module ${inlineCode(entry.module ?? '—')}, lineNumber ${entry.lineNumber ?? '—'}, columnNumber ${entry.columnNumber ?? '—'}`,
      );
      if (entry.stack.length === 0) {
        lines.push('  - Profile stack: unavailable');
        continue;
      }
      entry.stack.forEach((frame, frameIndex) => {
        const label = frameIndex === 0 ? 'self' : frameIndex === 1 ? 'parent' : 'grandparent';
        lines.push(
          `  - ${label}: ${inlineCode(frame.fn)} at ${inlineCode(frame.chunk)} lineNumber ${frame.lineNumber ?? '—'}, columnNumber ${frame.columnNumber ?? '—'} — ${frame.snippet === null ? 'source unavailable' : inlineCode(frame.snippet)}`,
        );
      });
    }
  });

  lines.push(
    '',
    '## Lantern check',
    '',
    `Simulated TBT: ${number(report.lantern.simulatedTbtMs)} ms`,
    `Observed Σ max(0, ${report.lantern.cpuMultiplier} × duration − 50): ${number(report.lantern.observedBlockingMs)} ms`,
    `Difference: ${number(report.lantern.differenceMs)} ms (${report.lantern.differencePct === null ? 'n/a' : `${number(report.lantern.differencePct)}%`})`,
    '',
    '| URL | Simulated start | Observed start | Start gap | Simulated duration | Observed duration | Observed × multiplier |',
    '| --- | ---: | ---: | ---: | ---: | ---: | ---: |',
  );

  for (const pair of report.lantern.pairs) {
    lines.push(
      `| ${escapeCell(pair.url)} | ${number(pair.simulatedStartMs)} ms | ${number(pair.observedStartMs)} ms | ${number(pair.startGapMs)} ms | ${number(pair.simulatedMs)} ms | ${number(pair.observedMs)} ms | ${number(pair.observedEquivalentMs)} ms |`,
    );
  }

  return `${lines.join('\n')}\n`;
}
