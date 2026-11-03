import { readFile, readdir, stat, writeFile } from 'node:fs/promises';
import { basename, dirname, join, relative, resolve } from 'node:path';

import { parseCli } from '../args.ts';
import { CliError, EXIT } from '../exit-codes.ts';
import type { LighthouseLongTask, LighthouseRun, LighthouseSummary } from '../lighthouse.ts';
import { run } from '../log.ts';

interface EagerVerdictArgs {
  values: {
    dir?: string | string[];
    rule?: string;
    help?: boolean;
  };
  positionals: string[];
}

type Build = 'eager' | 'gated';
type Route = 'home' | 'project';

interface SummaryFile {
  build: Build;
  route: Route;
  invocation: number;
  summary: LighthouseSummary;
}

interface SummaryGroup {
  build: Build;
  route: Route;
  invocations: SummaryFile[];
}

interface HostMeta {
  readonly runnerName?: unknown;
  readonly capturedAt?: unknown;
  readonly timestamp?: unknown;
  readonly startedAt?: unknown;
}

interface S117AttemptInput {
  readonly rawDir: string;
  readonly dir: string;
  readonly index: number;
  readonly hostMeta: HostMeta | null;
  readonly timestampMs: number | null;
  readonly groups: SummaryGroup[];
}

export interface S117RouteVerdict {
  readonly eager: Metrics;
  readonly gated: Metrics;
  readonly ruleA: boolean;
  readonly ruleB: boolean;
  readonly pass: boolean;
}

export interface S117Attempt {
  readonly dir: string;
  readonly runnerName: string | null;
  readonly timestampMs: number | null;
  readonly benchmarkIndex: {
    readonly min: number;
    readonly max: number;
    readonly median: number;
  };
  readonly qualifying: boolean;
  readonly counted: boolean;
  readonly routes: {
    readonly home: S117RouteVerdict;
    readonly project: S117RouteVerdict;
  };
  readonly pass: boolean;
}

interface Metrics {
  performance: number;
  tbtMs: number;
  lcpMs: number;
  cls: number;
  benchmarkIndex: number;
}

interface AttributedLongTask extends LighthouseLongTask {
  run: string;
}

const BUILD_ORDER: readonly Build[] = ['gated', 'eager'];
const ROUTE_ORDER: readonly Route[] = ['home', 'project'];
const SUMMARY_NAME = /^(eager|gated)-(home|project)-r([1-9]\d*)$/;
const SLOW_CLASS_MIN = 1_900;
const SLOW_CLASS_MAX = 2_600;
const usage = `Usage: node tools/perf/src/cli/eager-verdict.ts --dir <artifact-directory>
       node tools/perf/src/cli/eager-verdict.ts --rule s11.7 --dir <attempt-directory>...`;

function inputError(message: string): never {
  throw new CliError(EXIT.UNREACHABLE, message);
}

function metric(run: LighthouseRun, key: keyof Metrics): number {
  const value = run[key];
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`summary run is missing numeric metric ${key}`);
  }
  return value;
}

function median(values: number[]): number {
  if (values.length === 0) {
    throw new Error('cannot calculate a median from zero values');
  }

  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) {
    return sorted[middle] ?? 0;
  }

  return ((sorted[middle - 1] ?? 0) + (sorted[middle] ?? 0)) / 2;
}

function mean(values: number[]): number {
  return values.reduce((total, value) => total + value, 0) / values.length;
}

function invocationMedian(summary: LighthouseSummary): Metrics {
  return {
    performance: median(summary.runs.map((run) => metric(run, 'performance'))),
    tbtMs: median(summary.runs.map((run) => metric(run, 'tbtMs'))),
    lcpMs: median(summary.runs.map((run) => metric(run, 'lcpMs'))),
    cls: median(summary.runs.map((run) => metric(run, 'cls'))),
    benchmarkIndex: median(summary.runs.map((run) => metric(run, 'benchmarkIndex'))),
  };
}

function twoInvocationMedian(invocations: SummaryFile[]): Metrics {
  const medians = invocations.map(({ summary }) => invocationMedian(summary));
  return {
    performance: mean(medians.map((run) => run.performance)),
    tbtMs: mean(medians.map((run) => run.tbtMs)),
    lcpMs: mean(medians.map((run) => run.lcpMs)),
    cls: mean(medians.map((run) => run.cls)),
    benchmarkIndex: mean(medians.map((run) => run.benchmarkIndex)),
  };
}

function formatMetric(value: number): string {
  return String(Math.round(value * 10_000) / 10_000);
}

function row(label: string, values: Metrics): string {
  return `| ${label} | ${formatMetric(values.performance)} | ${formatMetric(values.tbtMs)} | ${formatMetric(values.lcpMs)} | ${formatMetric(values.cls)} | ${formatMetric(values.benchmarkIndex)} |`;
}

function runMetrics(run: LighthouseRun): Metrics {
  return {
    performance: metric(run, 'performance'),
    tbtMs: metric(run, 'tbtMs'),
    lcpMs: metric(run, 'lcpMs'),
    cls: metric(run, 'cls'),
    benchmarkIndex: metric(run, 'benchmarkIndex'),
  };
}

function longTasks(run: LighthouseRun): LighthouseLongTask[] {
  return Array.isArray(run.longTasks) ? run.longTasks : [];
}

function taskUrl(url: string): string {
  try {
    return basename(new URL(url).pathname) || '/';
  } catch {
    return basename(url) || '/';
  }
}

function longestTasks(group: SummaryGroup): AttributedLongTask[] {
  return group.invocations
    .flatMap(({ invocation, summary }) =>
      summary.runs.flatMap((summaryRun, index) =>
        longTasks(summaryRun).map((task) => ({
          ...task,
          run: `r${invocation}-${index + 1}`,
        })),
      ),
    )
    .sort(
      (left, right) =>
        right.durMs - left.durMs ||
        left.startMs - right.startMs ||
        left.run.localeCompare(right.run),
    )
    .slice(0, 5);
}

function renderLongestTasks(group: SummaryGroup): string {
  const tasks = longestTasks(group);
  const lines = [
    '**Five longest tasks**',
    '',
    '| Run | URL | Start (ms) | Duration (ms) |',
    '|---:|---|---:|---:|',
  ];

  if (tasks.length === 0) {
    lines.push('', 'None recorded.');
  } else {
    for (const task of tasks) {
      lines.push(
        `| ${task.run} | ${taskUrl(task.url)} | ${formatMetric(task.startMs)} | ${formatMetric(task.durMs)} |`,
      );
    }
  }

  return lines.join('\n');
}

function renderGroup(group: SummaryGroup): string {
  const lines = [
    `## ${group.build} / ${group.route}`,
    '',
    '| Run | Performance | TBT (ms) | LCP (ms) | CLS | benchmarkIndex |',
    '|---:|---:|---:|---:|---:|---:|',
  ];

  for (const invocation of group.invocations) {
    for (const [index, summaryRun] of invocation.summary.runs.entries()) {
      lines.push(row(`r${invocation.invocation}-${index + 1}`, runMetrics(summaryRun)));
    }
    lines.push(row(`r${invocation.invocation} median`, invocationMedian(invocation.summary)));
  }

  lines.push(row('two-invocation median', twoInvocationMedian(group.invocations)));
  lines.push(
    '',
    `Median runs: ${group.invocations
      .map(({ invocation, summary }) => `r${invocation} #${summary.medianRun + 1}`)
      .join(', ')}.`,
    '',
    renderLongestTasks(group),
    '',
  );

  return lines.join('\n');
}

function isEagerPass(group: SummaryGroup): boolean {
  const combined = twoInvocationMedian(group.invocations);
  return combined.performance >= 0.95 && combined.tbtMs <= 200;
}

function renderMarkdown(groups: SummaryGroup[]): string {
  const eager = groups.filter(({ build }) => build === 'eager');
  const pass = eager.length === ROUTE_ORDER.length && eager.every(isEagerPass);
  const verdict = pass ? 'recommend retiring D-19' : 'keep the gate';

  return [
    '# Eager 3D Lighthouse',
    '',
    'AC6 uses the eager two-invocation median on both routes: performance >= 0.95 and TBT <= 200 ms.',
    '',
    ...groups.map(renderGroup),
    `**Verdict:** ${verdict}`,
    '',
  ].join('\n');
}

function parseSummary(contents: string, path: string): LighthouseSummary {
  let summary: LighthouseSummary;
  try {
    summary = JSON.parse(contents) as LighthouseSummary;
  } catch {
    return inputError(`invalid Lighthouse summary JSON: ${path}`);
  }

  if (
    summary.kind !== 'lighthouse-summary' ||
    !Array.isArray(summary.runs) ||
    summary.runs.length === 0 ||
    !Number.isInteger(summary.medianRun) ||
    summary.medianRun < 0 ||
    summary.medianRun >= summary.runs.length
  ) {
    return inputError(`invalid Lighthouse summary: ${path}`);
  }

  for (const summaryRun of summary.runs) {
    for (const key of [
      'performance',
      'tbtMs',
      'lcpMs',
      'cls',
      'benchmarkIndex',
    ] satisfies (keyof Metrics)[]) {
      metric(summaryRun, key);
    }
  }

  return summary;
}

async function readSummary(path: string): Promise<LighthouseSummary> {
  try {
    return parseSummary(await readFile(path, 'utf8'), path);
  } catch (error) {
    if (error instanceof CliError) throw error;
    return inputError(`missing Lighthouse summary: ${path}`);
  }
}

async function readGroups(dir: string): Promise<SummaryGroup[]> {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return inputError(`cannot read artifact directory: ${dir}`);
  }

  const summaries: SummaryFile[] = [];
  for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
    if (!entry.isDirectory()) continue;

    const match = SUMMARY_NAME.exec(entry.name);
    if (!match) continue;

    const summary = await readSummary(join(dir, entry.name, 'lighthouse-summary.json'));
    summaries.push({
      build: match[1] as Build,
      route: match[2] as Route,
      invocation: Number.parseInt(match[3] ?? '', 10),
      summary,
    });
  }

  if (summaries.length === 0) {
    return inputError(`no Lighthouse summaries found under: ${dir}`);
  }

  const groups: SummaryGroup[] = [];
  for (const build of BUILD_ORDER) {
    const buildSummaries = summaries.filter((summary) => summary.build === build);
    if (buildSummaries.length === 0) continue;

    for (const route of ROUTE_ORDER) {
      const invocations = buildSummaries
        .filter((summary) => summary.route === route)
        .sort((left, right) => left.invocation - right.invocation);

      if (
        invocations.length !== 2 ||
        invocations[0]?.invocation !== 1 ||
        invocations[1]?.invocation !== 2
      ) {
        return inputError(`expected r1 and r2 summaries for ${build}/${route}`);
      }

      groups.push({ build, route, invocations });
    }
  }

  return groups;
}

function isMissing(error: unknown): boolean {
  return (
    error instanceof Error &&
    'code' in error &&
    (error.code === 'ENOENT' || error.code === 'ENOTDIR')
  );
}

function directories(values: EagerVerdictArgs['values']): string[] {
  if (values.dir === undefined) return [];
  return typeof values.dir === 'string' ? [values.dir] : values.dir;
}

async function readHostMeta(dir: string): Promise<HostMeta | null> {
  const path = join(dir, 'host-meta.json');
  let contents: string;
  try {
    contents = await readFile(path, 'utf8');
  } catch (error) {
    if (isMissing(error)) return null;
    return inputError(`cannot read host metadata: ${path}`);
  }

  let value: unknown;
  try {
    value = JSON.parse(contents) as unknown;
  } catch {
    return inputError(`invalid host metadata JSON: ${path}`);
  }
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return inputError(`invalid host metadata: ${path}`);
  }
  return value as HostMeta;
}

function hostRunnerName(meta: HostMeta | null): string | null {
  if (meta === null || typeof meta.runnerName !== 'string') return null;
  const name = meta.runnerName.trim();
  return name.length === 0 ? null : name;
}

function hostTimestamp(meta: HostMeta | null): number | null {
  if (meta === null) return null;
  for (const value of [meta.capturedAt, meta.timestamp, meta.startedAt]) {
    if (typeof value !== 'string' && typeof value !== 'number') continue;
    const timestamp = new Date(value).getTime();
    if (Number.isFinite(timestamp)) return timestamp;
  }
  return null;
}

async function readAttempt(rawDir: string, index: number): Promise<S117AttemptInput> {
  const dir = resolve(rawDir);
  const [hostMeta, groups, details] = await Promise.all([
    readHostMeta(dir),
    readGroups(dir),
    stat(dir).catch(() => null),
  ]);
  return {
    rawDir,
    dir,
    index,
    hostMeta,
    timestampMs: hostTimestamp(hostMeta) ?? details?.mtimeMs ?? null,
    groups,
  };
}

function groupFor(groups: SummaryGroup[], build: Build, route: Route): SummaryGroup {
  const group = groups.find((candidate) => candidate.build === build && candidate.route === route);
  if (group === undefined) {
    return inputError(`missing ${build}/${route} summaries in attempt`);
  }
  return group;
}

function benchmarkRange(groups: SummaryGroup[]): {
  min: number;
  max: number;
  median: number;
} {
  const values = groups.flatMap((group) =>
    group.invocations.flatMap(({ summary }) =>
      summary.runs.map((summaryRun) => metric(summaryRun, 'benchmarkIndex')),
    ),
  );
  return {
    min: Math.min(...values),
    max: Math.max(...values),
    median: median(values),
  };
}

function routeVerdict(groups: SummaryGroup[], route: Route): S117RouteVerdict {
  const eager = twoInvocationMedian(groupFor(groups, 'eager', route).invocations);
  const gated = twoInvocationMedian(groupFor(groups, 'gated', route).invocations);
  const ruleA = eager.performance >= 0.95 && eager.tbtMs <= 200;
  const ruleB = eager.tbtMs - gated.tbtMs <= 50;
  return { eager, gated, ruleA, ruleB, pass: ruleA || ruleB };
}

export function evaluateS117Attempts(inputs: readonly S117AttemptInput[]): {
  attempts: S117Attempt[];
  pass: boolean;
  reasons: string[];
} {
  const ordered = [...inputs].sort(
    (left, right) =>
      (left.timestampMs ?? Number.POSITIVE_INFINITY) -
        (right.timestampMs ?? Number.POSITIVE_INFINITY) || left.index - right.index,
  );
  const preliminary = ordered.map((input) => {
    const benchmarkIndex = benchmarkRange(input.groups);
    const qualifying = benchmarkIndex.min >= SLOW_CLASS_MIN && benchmarkIndex.max <= SLOW_CLASS_MAX;
    const routes = {
      home: routeVerdict(input.groups, 'home'),
      project: routeVerdict(input.groups, 'project'),
    };
    return {
      dir: input.rawDir,
      runnerName: hostRunnerName(input.hostMeta),
      timestampMs: input.timestampMs,
      benchmarkIndex,
      qualifying,
      counted: false,
      routes,
      pass: routes.home.pass && routes.project.pass,
    } satisfies S117Attempt;
  });

  const qualifying = preliminary.filter((attempt) => attempt.qualifying);
  const deciding = new Set(qualifying.slice(0, 2));
  const attempts = preliminary.map((attempt) => ({
    ...attempt,
    counted: deciding.has(attempt),
  }));
  const firstTwo = attempts.filter((attempt) => attempt.counted);
  const distinctRunners =
    firstTwo.length === 2 &&
    firstTwo[0]?.runnerName !== null &&
    firstTwo[1]?.runnerName !== null &&
    firstTwo[0]?.runnerName !== firstTwo[1]?.runnerName;
  const bothRoutesPass = firstTwo.length === 2 && firstTwo.every((attempt) => attempt.pass);
  const reasons: string[] = [];
  if (qualifying.length < 2) reasons.push('fewer than two qualifying attempts');
  if (firstTwo.length === 2 && !distinctRunners) {
    reasons.push('the first two qualifying attempts do not have distinct runner names');
  }
  if (firstTwo.length === 2 && !bothRoutesPass) {
    reasons.push('both routes must pass on the first two qualifying attempts');
  }

  return {
    attempts,
    pass: distinctRunners && bothRoutesPass,
    reasons,
  };
}

function s117RouteCell(route: S117RouteVerdict): string {
  return `${route.pass ? 'PASS' : 'FAIL'} (a:${route.ruleA ? 'Y' : 'N'} b:${route.ruleB ? 'Y' : 'N'}; eager TBT ${formatMetric(route.eager.tbtMs)}, gated ${formatMetric(route.gated.tbtMs)})`;
}

export function renderS117Markdown(result: {
  attempts: S117Attempt[];
  pass: boolean;
  reasons: string[];
}): string {
  const lines = [
    '# Eager 3D Lighthouse — S11.7 AC3',
    '',
    `Qualification: every Lighthouse run has benchmarkIndex in [${SLOW_CLASS_MIN}, ${SLOW_CLASS_MAX}].`,
    'The first two qualifying attempts in time order decide AC3; later qualifying attempts are listed only.',
    '',
    '| Attempt | Runner | benchmarkIndex (min/median/max) | Qualifies | Counted | Home | Project |',
    '|---|---|---:|---|---|---|---|',
  ];

  for (const attempt of result.attempts) {
    lines.push(
      `| ${attempt.dir} | ${attempt.runnerName ?? 'unknown'} | ${formatMetric(attempt.benchmarkIndex.min)} / ${formatMetric(attempt.benchmarkIndex.median)} / ${formatMetric(attempt.benchmarkIndex.max)} | ${attempt.qualifying ? 'yes' : 'no'} | ${attempt.counted ? 'yes' : 'no'} | ${s117RouteCell(attempt.routes.home)} | ${s117RouteCell(attempt.routes.project)} |`,
    );
  }
  if (result.attempts.length === 0) lines.push('| none | unknown | - | no | no | - | - |');

  lines.push('', `**AC3:** ${result.pass ? 'PASS' : 'FAIL'}`);
  for (const reason of result.reasons) lines.push(`- ${reason}`);
  lines.push('');
  return lines.join('\n');
}

export function s117Json(result: {
  attempts: S117Attempt[];
  pass: boolean;
  reasons: string[];
}): string {
  return `${JSON.stringify(
    {
      kind: 'eager-verdict-s11.7',
      version: 1,
      rule: 's11.7',
      pass: result.pass,
      verdict: result.pass ? 'AC3 PASS' : 'AC3 FAIL',
      reasons: result.reasons,
      attempts: result.attempts,
    },
    null,
    2,
  )}\n`;
}

function commonDirectory(paths: readonly string[]): string {
  let common = resolve(paths[0] ?? process.cwd());
  for (const path of paths.slice(1)) {
    const target = resolve(path);
    for (;;) {
      const fromCommon = relative(common, target);
      if (
        fromCommon === '' ||
        (fromCommon !== '..' &&
          !fromCommon.startsWith(`..${process.platform === 'win32' ? '\\' : '/'}`))
      ) {
        break;
      }
      const parent = dirname(common);
      if (parent === common) break;
      common = parent;
    }
  }
  return common;
}

export async function main(argv: string[]): Promise<number> {
  const { values, positionals } = parseCli<EagerVerdictArgs>(argv, {
    options: {
      dir: { type: 'string', multiple: true },
      rule: { type: 'string' },
      help: { type: 'boolean' },
    },
    allowPositionals: true,
  });

  if (values.help) {
    console.log(usage);
    return EXIT.OK;
  }

  const dirs = [...directories(values), ...positionals];
  if (dirs.length === 0) {
    return inputError('missing --dir');
  }

  if (values.rule === undefined) {
    if (dirs.length !== 1) return inputError('default mode accepts exactly one --dir');
    const groups = await readGroups(resolve(dirs[0] as string));
    process.stdout.write(renderMarkdown(groups));
    return EXIT.OK;
  }
  if (values.rule !== 's11.7') {
    return inputError(`unknown rule: ${values.rule}`);
  }

  const attempts = await Promise.all(dirs.map(readAttempt));
  const result = evaluateS117Attempts(attempts);
  process.stdout.write(renderS117Markdown(result));
  const outputDir = commonDirectory(dirs);
  const artifact = join(outputDir, 'ac3-verdict.json');
  await writeFile(artifact, s117Json(result), 'utf8');
  console.log(`ac3-verdict: ${artifact}`);
  return EXIT.OK;
}

await run(main);
