import { readFile, readdir } from 'node:fs/promises';
import { basename, join, resolve } from 'node:path';

import { parseCli } from '../args.ts';
import { CliError, EXIT } from '../exit-codes.ts';
import type { LighthouseLongTask, LighthouseRun, LighthouseSummary } from '../lighthouse.ts';
import { run } from '../log.ts';

interface EagerVerdictArgs {
  values: {
    dir?: string;
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
const usage = 'Usage: node tools/perf/src/cli/eager-verdict.ts --dir <artifact-directory>';

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

export async function main(argv: string[]): Promise<number> {
  const { values } = parseCli<EagerVerdictArgs>(argv, {
    options: {
      dir: { type: 'string' },
      help: { type: 'boolean' },
    },
    allowPositionals: false,
  });

  if (values.help) {
    console.log(usage);
    return EXIT.OK;
  }

  if (!values.dir) {
    return inputError('missing --dir');
  }

  const groups = await readGroups(resolve(values.dir));
  process.stdout.write(renderMarkdown(groups));
  return EXIT.OK;
}

await run(main);
