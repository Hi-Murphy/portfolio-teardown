import lighthouse from 'lighthouse';

import { CLS_MAX, LCP_MAX_MS, PERF_MIN_SCORE } from './budgets.ts';
import { freePort, launch } from './browser.ts';
import { CliError, EXIT } from './exit-codes.ts';

export interface LighthouseAudit {
  numericValue?: number | null;
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
}

export interface Assertion {
  id: 'performance' | 'lcp' | 'cls';
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
}

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
  };
}

function finalUrlFrom(lhrs: LHR[]): string {
  const last = lhrs[lhrs.length - 1];
  return (
    last?.mainDocumentUrl ?? last?.finalUrl ?? last?.finalDisplayedUrl ?? last?.requestedUrl ?? ''
  );
}

export async function runLighthouse(
  url: URL,
  opts: { runs: number; categories: string[] },
): Promise<LHR[]> {
  if (!Number.isInteger(opts.runs) || opts.runs < 1) {
    throw new CliError(EXIT.USAGE, 'runs must be a positive integer');
  }

  if (opts.categories.length === 0) {
    throw new CliError(EXIT.USAGE, 'at least one Lighthouse category is required');
  }

  const lhrs: LHR[] = [];
  for (let run = 0; run < opts.runs; run += 1) {
    const port = await freePort();
    const browser = await launch({ cdpPort: port });

    try {
      const result = await lighthouse(url.href, {
        port,
        hostname: '127.0.0.1',
        output: 'json',
        logLevel: 'error',
        onlyCategories: opts.categories,
        formFactor: 'mobile',
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

      lhrs.push(result.lhr);
    } finally {
      await browser.close();
    }
  }

  return lhrs;
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

export function assertLighthouse(summary: LighthouseSummary): Assertion[] {
  const median = summary.runs[summary.medianRun];
  if (!median) {
    throw new Error(`summary has no run at median index ${summary.medianRun}`);
  }

  return [
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
}

export function summarizeLighthouse(lhrs: LHR[]): LighthouseSummary {
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
  };

  const assertions = assertLighthouse(summary);
  return {
    ...summary,
    assertions,
    pass: assertions.every((assertion) => assertion.pass),
  };
}
