import lighthouse from 'lighthouse';

import { A11Y_MIN_SCORE, CLS_MAX, LCP_MAX_MS, PERF_MIN_SCORE } from './budgets.ts';
import { freePort, launch } from './browser.ts';
import { CliError, EXIT } from './exit-codes.ts';

export interface LighthouseAudit {
  numericValue?: number | null;
  details?: unknown;
}

export interface LighthouseAuditItem {
  url?: string;
  startTime?: number;
  duration?: number;
}

export interface LighthouseCategory {
  score?: number | null;
}

export interface LighthouseLhr {
  requestedUrl?: string;
  mainDocumentUrl?: string;
  finalUrl?: string;
  finalDisplayedUrl?: string;
  lighthouseVersion?: string;
  userAgent?: string;
  environment?: {
    hostUserAgent?: string;
    benchmarkIndex?: number;
  };
  configSettings?: {
    formFactor?: 'mobile' | 'desktop';
    throttlingMethod?: string;
  };
  categories?: Record<string, LighthouseCategory>;
  audits?: Record<string, LighthouseAudit>;
  runtimeError?: {
    code?: string;
    message?: string;
  };
}

export type LHR = LighthouseLhr;

export interface LighthouseLongTask {
  url: string;
  startMs: number;
  durMs: number;
}

export interface LighthouseRun {
  performance: number;
  accessibility: number | null;
  lcpMs: number;
  cls: number;
  tbtMs: number;
  fcpMs: number;
  siMs: number;
  totalByteWeight: number;
  benchmarkIndex: number;
  longTasks: LighthouseLongTask[];
}

export interface Assertion {
  id: 'performance' | 'lcp' | 'cls' | 'accessibility';
  threshold: string;
  actual: number | number[];
  scope: 'median' | 'every-run';
  pass: boolean;
}

export interface LighthouseSummary {
  kind: 'lighthouse-summary';
  version: 1;
  url: string;
  finalUrl: string;
  tools: {
    lighthouse: string;
    chromium: string;
  };
  formFactor: 'mobile' | 'desktop';
  throttling: string;
  runs: LighthouseRun[];
  medianRun: number;
  assertions: Assertion[];
  pass: boolean;
  profiled?: true;
}

export interface LighthouseProfiledRun {
  lhr: LHR;
  trace: { traceEvents: unknown[] };
  devtoolsLog: unknown[];
}

export interface LighthouseRunOptions {
  runs: number;
  categories: string[];
  profile?: boolean;
  cpuMultiplier?: number;
  gl?: 'swiftshader';
}

const PROFILE_TRACE_CATEGORY = 'disabled-by-default-v8.cpu_profiler';
const SWIFTSHADER_ARGS = ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] as const;

function auditValue(lhr: LHR, id: string): number {
  const value = lhr.audits?.[id]?.numericValue;
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`Lighthouse result is missing numeric audit ${id}`);
  }

  return value;
}

function performanceScore(lhr: LHR): number {
  const score = lhr.categories?.performance?.score;
  if (typeof score !== 'number' || !Number.isFinite(score)) {
    throw new Error('Lighthouse result is missing a performance score');
  }

  return score;
}

function chromiumVersion(lhrs: LHR[]): string {
  for (const lhr of lhrs) {
    const userAgent = lhr.environment?.hostUserAgent ?? lhr.userAgent ?? '';
    const match = /(?:HeadlessChrome|Chrome)\/([^\s;]+)/.exec(userAgent);
    if (match?.[1]) {
      return match[1];
    }
  }

  return 'unknown';
}

export function longTasksFrom(lhr: LHR): LighthouseLongTask[] {
  const details = lhr.audits?.['long-tasks']?.details;
  if (typeof details !== 'object' || details === null || !('items' in details)) return [];

  const items = details.items;
  if (!Array.isArray(items)) return [];

  return items.flatMap((item) => {
    if (typeof item !== 'object' || item === null) return [];

    const { url, startTime, duration } = item as LighthouseAuditItem;
    if (
      typeof url !== 'string' ||
      typeof startTime !== 'number' ||
      !Number.isFinite(startTime) ||
      typeof duration !== 'number' ||
      !Number.isFinite(duration)
    ) {
      return [];
    }

    return [{ url, startMs: startTime, durMs: duration }];
  });
}

function runFromLhr(lhr: LHR): LighthouseRun {
  return {
    performance: performanceScore(lhr),
    accessibility: lhr.categories?.accessibility?.score ?? null,
    lcpMs: auditValue(lhr, 'largest-contentful-paint'),
    cls: auditValue(lhr, 'cumulative-layout-shift'),
    tbtMs: auditValue(lhr, 'total-blocking-time'),
    fcpMs: auditValue(lhr, 'first-contentful-paint'),
    siMs: auditValue(lhr, 'speed-index'),
    totalByteWeight: auditValue(lhr, 'total-byte-weight'),
    benchmarkIndex: lhr.environment?.benchmarkIndex ?? 0,
    longTasks: longTasksFrom(lhr),
  };
}

function finalUrlFrom(lhrs: LHR[]): string {
  const last = lhrs[lhrs.length - 1];
  return (
    last?.mainDocumentUrl ?? last?.finalUrl ?? last?.finalDisplayedUrl ?? last?.requestedUrl ?? ''
  );
}

export function runLighthouse(
  url: URL,
  opts: LighthouseRunOptions & { profile: true },
): Promise<LighthouseProfiledRun[]>;
export function runLighthouse(
  url: URL,
  opts: LighthouseRunOptions & { profile?: false },
): Promise<LHR[]>;
export async function runLighthouse(
  url: URL,
  opts: LighthouseRunOptions,
): Promise<LHR[] | LighthouseProfiledRun[]> {
  if (!Number.isInteger(opts.runs) || opts.runs < 1) {
    throw new CliError(EXIT.USAGE, 'runs must be a positive integer');
  }

  if (opts.categories.length === 0) {
    throw new CliError(EXIT.USAGE, 'at least one Lighthouse category is required');
  }

  if (
    opts.cpuMultiplier !== undefined &&
    (!Number.isFinite(opts.cpuMultiplier) || opts.cpuMultiplier <= 0)
  ) {
    throw new CliError(EXIT.USAGE, 'cpuMultiplier must be a positive number');
  }

  const lhrs: LHR[] = [];
  const profiledRuns: LighthouseProfiledRun[] = [];
  for (let run = 0; run < opts.runs; run += 1) {
    const port = await freePort();
    const browser = await launch(
      opts.gl === 'swiftshader'
        ? { cdpPort: port, args: [...SWIFTSHADER_ARGS] }
        : { cdpPort: port },
    );

    try {
      const result = await lighthouse(url.href, {
        port,
        hostname: '127.0.0.1',
        output: 'json',
        logLevel: 'error',
        onlyCategories: opts.categories,
        formFactor: 'mobile',
        ...(opts.profile === true ? { additionalTraceCategories: PROFILE_TRACE_CATEGORY } : {}),
        ...(opts.cpuMultiplier === undefined
          ? {}
          : { throttling: { cpuSlowdownMultiplier: opts.cpuMultiplier } }),
      });

      if (!result) {
        throw new Error('Lighthouse returned no result');
      }

      if (result.lhr.runtimeError) {
        const { code, message } = result.lhr.runtimeError;
        throw new CliError(
          EXIT.INTERNAL,
          `Lighthouse failed${code ? ` (${code})` : ''}: ${message ?? 'unknown error'}`,
        );
      }

      if (opts.profile === true) {
        const trace = result.artifacts.Trace;
        const devtoolsLog = result.artifacts.DevtoolsLog;
        if (!Array.isArray(trace.traceEvents) || !Array.isArray(devtoolsLog)) {
          throw new Error('Lighthouse did not retain the trace and DevTools log');
        }
        profiledRuns.push({ lhr: result.lhr, trace, devtoolsLog });
      } else {
        lhrs.push(result.lhr);
      }
    } finally {
      await browser.close();
    }
  }

  return opts.profile === true ? profiledRuns : lhrs;
}

export function pickMedianRun(lhrs: LHR[]): number {
  if (lhrs.length === 0) {
    throw new Error('cannot pick a median from zero Lighthouse runs');
  }

  const sorted = lhrs
    .map((lhr, index) => ({
      index,
      performance: performanceScore(lhr),
      lcpMs: auditValue(lhr, 'largest-contentful-paint'),
    }))
    .sort(
      (left, right) =>
        left.performance - right.performance ||
        left.lcpMs - right.lcpMs ||
        left.index - right.index,
    );

  const median = sorted[Math.floor(lhrs.length / 2)];
  if (!median) {
    throw new Error('could not pick a median Lighthouse run');
  }

  return median.index;
}

function lighthouseAssertions(
  summary: LighthouseSummary,
  options: { readonly accessibility?: boolean } = {},
): Assertion[] {
  const median = summary.runs[summary.medianRun];
  if (!median) {
    throw new Error(`summary has no run at median index ${summary.medianRun}`);
  }

  const assertions: Assertion[] = [
    {
      id: 'performance',
      threshold: `>= ${PERF_MIN_SCORE}`,
      actual: median.performance,
      scope: 'median',
      pass: median.performance >= PERF_MIN_SCORE,
    },
    {
      id: 'lcp',
      threshold: `< ${LCP_MAX_MS}`,
      actual: median.lcpMs,
      scope: 'median',
      pass: median.lcpMs < LCP_MAX_MS,
    },
    {
      id: 'cls',
      threshold: `=== ${CLS_MAX}`,
      actual: summary.runs.map((run) => run.cls),
      scope: 'every-run',
      pass: summary.runs.every((run) => run.cls === CLS_MAX),
    },
  ];

  // Asserted only when --categories requested it, so S3 runs keep their three assertions.
  if (options.accessibility === true) {
    assertions.push({
      id: 'accessibility',
      threshold: `>= ${A11Y_MIN_SCORE}`,
      actual: median.accessibility ?? 0,
      scope: 'median',
      pass: median.accessibility !== null && median.accessibility >= A11Y_MIN_SCORE,
    });
  }

  return assertions;
}

export function assertLighthouse(
  summary: LighthouseSummary,
  options: { readonly accessibility?: boolean } = {},
): Assertion[] {
  if (summary.profiled === true) {
    throw new Error('cannot gate a profiled Lighthouse summary');
  }

  return lighthouseAssertions(summary, options);
}

export const LIGHTHOUSE_CATEGORIES = [
  'performance',
  'accessibility',
  'best-practices',
  'seo',
] as const;

/** Parses a --categories list; performance is always included because the gate asserts it. */
export function parseCategories(value: string | undefined): string[] {
  if (value === undefined) return ['performance'];

  const requested = value
    .split(',')
    .map((entry) => entry.trim())
    .filter((entry) => entry !== '');
  const unknown = requested.filter(
    (entry) => !(LIGHTHOUSE_CATEGORIES as readonly string[]).includes(entry),
  );

  if (unknown.length > 0) {
    throw new CliError(EXIT.USAGE, `unknown Lighthouse category: ${unknown.join(', ')}`);
  }

  return [...new Set(['performance', ...requested])];
}

export function summarizeLighthouse(
  lhrs: LHR[],
  options: { readonly accessibility?: boolean; readonly profiled?: boolean } = {},
): LighthouseSummary {
  if (lhrs.length === 0) {
    throw new Error('cannot summarize zero Lighthouse runs');
  }

  const runs = lhrs.map(runFromLhr);
  const medianRun = pickMedianRun(lhrs);
  const first = lhrs[0];
  const finalUrl = finalUrlFrom(lhrs);
  const summary: LighthouseSummary = {
    kind: 'lighthouse-summary',
    version: 1,
    url: first?.requestedUrl ?? finalUrl,
    finalUrl,
    tools: {
      lighthouse: first?.lighthouseVersion ?? 'unknown',
      chromium: chromiumVersion(lhrs),
    },
    formFactor: first?.configSettings?.formFactor ?? 'mobile',
    throttling: first?.configSettings?.throttlingMethod ?? 'simulate',
    runs,
    medianRun,
    assertions: [],
    pass: false,
    ...(options.profiled === true ? { profiled: true as const } : {}),
  };

  const assertions = lighthouseAssertions(summary, options);
  return {
    ...summary,
    assertions,
    pass: assertions.every((assertion) => assertion.pass),
  };
}
