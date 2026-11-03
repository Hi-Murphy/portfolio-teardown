import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { beforeEach, describe, expect, test, vi } from 'vitest';

import { launch } from '../src/browser.ts';
import {
  assertLighthouse,
  parseCategories,
  pickMedianRun,
  runLighthouse,
  summarizeLighthouse,
  type LHR,
} from '../src/lighthouse.ts';
import { renderLighthouseMarkdown, writeLighthouseStepSummary } from '../src/summary-md.ts';

const mocks = vi.hoisted(() => ({
  lighthouse: vi.fn(),
  launch: vi.fn(),
}));

vi.mock('lighthouse', () => ({ default: mocks.lighthouse }));
vi.mock('playwright', () => ({ chromium: { launch: mocks.launch } }));

beforeEach(() => {
  mocks.lighthouse.mockReset();
  mocks.launch.mockReset();
  mocks.launch.mockResolvedValue({ close: vi.fn() });
});

async function fixture(name: string): Promise<LHR> {
  const contents = await readFile(new URL(`./fixtures/${name}.json`, import.meta.url), 'utf8');
  return JSON.parse(contents) as LHR;
}

async function passingLhrs(): Promise<LHR[]> {
  return await Promise.all([fixture('lhr-pass-a'), fixture('lhr-pass-b'), fixture('lhr-pass-c')]);
}

describe('Lighthouse summary', () => {
  test('summarizes all runs and picks the median by score with LCP tie-break', async () => {
    const lhrs = await passingLhrs();
    const summary = summarizeLighthouse(lhrs);

    expect(summary.medianRun).toBe(0);
    expect(summary.runs).toHaveLength(3);
    expect(summary.runs[0]).toMatchObject({ performance: 0.97, lcpMs: 2100, cls: 0 });
    expect(summary.runs[1]).toMatchObject({ performance: 0.98, accessibility: null });
    expect(summary.tools).toEqual({ lighthouse: '13.6.0', chromium: '156.0.8078.4' });
    expect(summary.pass).toBe(true);

    const tied = await passingLhrs();
    const second = tied[1];
    if (second?.categories?.performance) second.categories.performance.score = 0.97;
    if (second?.audits?.['largest-contentful-paint']) {
      second.audits['largest-contentful-paint'].numericValue = 1800;
    }
    expect(pickMedianRun(tied)).toBe(1);
  });

  test('uses raw inclusive/exclusive budget thresholds', async () => {
    const lhrs = await passingLhrs();
    const scores = [0.95, 0.99, 0.93];
    for (const [index, lhr] of lhrs.entries()) {
      if (lhr.categories?.performance) lhr.categories.performance.score = scores[index] ?? 0;
    }

    const first = lhrs[0];
    if (first?.audits?.['largest-contentful-paint']) {
      first.audits['largest-contentful-paint'].numericValue = 2500;
    }
    if (first?.audits?.['cumulative-layout-shift']) {
      first.audits['cumulative-layout-shift'].numericValue = 0.001;
    }

    const summary = summarizeLighthouse(lhrs);
    const assertions = assertLighthouse(summary);

    expect(assertions.find((assertion) => assertion.id === 'performance')?.pass).toBe(true);
    expect(assertions.find((assertion) => assertion.id === 'lcp')?.pass).toBe(false);
    expect(assertions.find((assertion) => assertion.id === 'cls')?.pass).toBe(false);
    expect(summary.pass).toBe(false);
  });

  test('reports every failed assertion on the median run', async () => {
    const summary = summarizeLighthouse(
      await Promise.all([
        fixture('lhr-budget-a'),
        fixture('lhr-budget-b'),
        fixture('lhr-budget-c'),
      ]),
    );

    expect(summary.medianRun).toBe(1);
    expect(summary.assertions).toEqual([
      {
        id: 'performance',
        threshold: '>= 0.95',
        actual: 0.94,
        scope: 'median',
        pass: false,
      },
      {
        id: 'lcp',
        threshold: '< 2500',
        actual: 2600,
        scope: 'median',
        pass: false,
      },
      {
        id: 'cls',
        threshold: '=== 0',
        actual: [0, 0.01, 0],
        scope: 'every-run',
        pass: false,
      },
    ]);
    expect(summary.pass).toBe(false);
  });

  test('copies long-task details into every run and defaults to an empty list', async () => {
    const lhrs = await passingLhrs();
    const first = lhrs[0];
    if (first) {
      first.audits = {
        ...first.audits,
        'long-tasks': {
          details: {
            items: [
              {
                url: 'http://127.0.0.1:4173/_next/static/chunks/main.js',
                startTime: 1250,
                duration: 75,
              },
              {
                url: 'http://127.0.0.1:4173/_next/static/chunks/scene.js',
                startTime: 2400,
                duration: 42.5,
              },
            ],
          },
        },
      };
    }

    const summary = summarizeLighthouse(lhrs);

    expect(summary.runs[0]?.longTasks).toEqual([
      { url: 'http://127.0.0.1:4173/_next/static/chunks/main.js', startMs: 1250, durMs: 75 },
      {
        url: 'http://127.0.0.1:4173/_next/static/chunks/scene.js',
        startMs: 2400,
        durMs: 42.5,
      },
    ]);
    expect(summary.runs[1]?.longTasks).toEqual([]);
    expect(summary.assertions.map((assertion) => assertion.pass)).toEqual([true, true, true]);
  });
});

describe('Lighthouse Markdown', () => {
  test('renders thresholds, all runs, and the median marker', async () => {
    const markdown = renderLighthouseMarkdown(summarizeLighthouse(await passingLhrs()));

    expect(markdown).toContain('| performance | >= 0.95 | 0.97 | median | pass |');
    expect(markdown).toContain('| 1 | 0.97 | 2100 | 0 | 24 | 900 | 1100 | 147000 | median |');
    expect(markdown).toContain('| 3 | 0.96 | 800 | 0 | 31 | 700 | 900 | 147000 |  |');
  });

  test('writes a step summary only when GITHUB_STEP_SUMMARY is set', async () => {
    const summary = summarizeLighthouse(await passingLhrs());
    const dir = await mkdtemp(join(tmpdir(), 'lighthouse-summary-'));
    const target = join(dir, 'step-summary.md');

    try {
      await expect(writeLighthouseStepSummary(summary, '')).resolves.toBe(false);
      await expect(writeLighthouseStepSummary(summary, target)).resolves.toBe(true);
      await expect(readFile(target, 'utf8')).resolves.toContain('## Lighthouse gate — mobile');
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});

describe('Lighthouse categories (S10 T015)', () => {
  function withAccessibility(lhrs: LHR[], scores: readonly number[]): LHR[] {
    return lhrs.map((lhr, index) => ({
      ...lhr,
      categories: { ...lhr.categories, accessibility: { score: scores[index] ?? 0 } },
    })) as LHR[];
  }

  test('defaults to performance only, so S3 runs keep their three assertions', async () => {
    expect(parseCategories(undefined)).toEqual(['performance']);

    const summary = summarizeLighthouse(await passingLhrs());

    expect(summary.assertions.map((assertion) => assertion.id)).toEqual([
      'performance',
      'lcp',
      'cls',
    ]);
  });

  test('always keeps performance and de-duplicates the list', () => {
    expect(parseCategories('accessibility')).toEqual(['performance', 'accessibility']);
    expect(parseCategories('performance, accessibility,performance')).toEqual([
      'performance',
      'accessibility',
    ]);
  });

  test('rejects an unknown category as a usage error', () => {
    expect(() => parseCategories('performance,acessibility')).toThrow(
      /unknown Lighthouse category: acessibility/,
    );
  });

  test('asserts accessibility >= 0.95 on the median when it was scored', async () => {
    const passing = summarizeLighthouse(withAccessibility(await passingLhrs(), [1, 1, 1]), {
      accessibility: true,
    });
    const failing = summarizeLighthouse(withAccessibility(await passingLhrs(), [0.9, 0.9, 0.9]), {
      accessibility: true,
    });

    expect(passing.assertions.at(-1)).toMatchObject({ id: 'accessibility', pass: true });
    expect(passing.pass).toBe(true);
    expect(failing.assertions.at(-1)).toMatchObject({ id: 'accessibility', pass: false });
    expect(failing.pass).toBe(false);
  });
});

describe('Lighthouse profile and emulation flags (S11.7 T002)', () => {
  test('keeps the default Lighthouse call and summary shape byte-identical', async () => {
    const lhr = await fixture('lhr-pass-a');
    mocks.lighthouse.mockResolvedValue({
      lhr,
      report: '',
      artifacts: { Trace: { traceEvents: [] }, DevtoolsLog: [] },
    });

    const url = new URL('http://127.0.0.1:4321/projects/example');
    const runs = await runLighthouse(url, {
      runs: 1,
      categories: ['performance'],
    });

    expect(runs).toEqual([lhr]);
    const flags = mocks.lighthouse.mock.calls[0]?.[1] as Record<string, unknown>;
    expect(mocks.lighthouse).toHaveBeenCalledWith(url.href, {
      port: expect.any(Number),
      hostname: '127.0.0.1',
      output: 'json',
      logLevel: 'error',
      onlyCategories: ['performance'],
      formFactor: 'mobile',
    });
    expect(Object.keys(flags)).toEqual([
      'port',
      'hostname',
      'output',
      'logLevel',
      'onlyCategories',
      'formFactor',
    ]);

    const port = flags.port;
    expect(mocks.launch).toHaveBeenCalledWith({
      channel: 'chromium',
      headless: true,
      args: [`--remote-debugging-port=${String(port)}`],
    });
    expect(Object.keys(summarizeLighthouse(runs))).toEqual([
      'kind',
      'version',
      'url',
      'finalUrl',
      'tools',
      'formFactor',
      'throttling',
      'runs',
      'medianRun',
      'assertions',
      'pass',
    ]);
  });

  test('appends GL arguments after the existing browser arguments', async () => {
    await launch({
      cdpPort: 9333,
      args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
    });

    expect(mocks.launch).toHaveBeenCalledWith({
      channel: 'chromium',
      headless: true,
      args: [
        '--remote-debugging-port=9333',
        '--use-angle=swiftshader',
        '--enable-unsafe-swiftshader',
      ],
    });
  });

  test('captures trace and DevTools artifacts only for profiled runs', async () => {
    const lhr = await fixture('lhr-pass-a');
    const trace = { traceEvents: [{ name: 'ProfileChunk', ph: 'P' }] };
    const devtoolsLog = [{ method: 'Page.enable', params: {} }];
    mocks.lighthouse.mockResolvedValue({
      lhr,
      report: '',
      artifacts: { Trace: trace, DevtoolsLog: devtoolsLog },
    });

    const url = new URL('http://127.0.0.1:4321/projects/example');
    const runs = await runLighthouse(url, {
      runs: 1,
      categories: ['performance'],
      profile: true,
      cpuMultiplier: 4,
      gl: 'swiftshader',
    });

    expect(runs).toEqual([{ lhr, trace, devtoolsLog }]);
    expect(mocks.lighthouse).toHaveBeenCalledWith(url.href, {
      port: expect.any(Number),
      hostname: '127.0.0.1',
      output: 'json',
      logLevel: 'error',
      onlyCategories: ['performance'],
      formFactor: 'mobile',
      additionalTraceCategories: 'disabled-by-default-v8.cpu_profiler',
      throttling: { cpuSlowdownMultiplier: 4 },
    });
    const flags = mocks.lighthouse.mock.calls[0]?.[1] as { port: number };
    expect(mocks.launch).toHaveBeenCalledWith({
      channel: 'chromium',
      headless: true,
      args: [
        `--remote-debugging-port=${String(flags.port)}`,
        '--use-angle=swiftshader',
        '--enable-unsafe-swiftshader',
      ],
    });
  });

  test('marks profiled summaries and refuses to gate them', async () => {
    const summary = summarizeLighthouse([await fixture('lhr-pass-a')], { profiled: true });

    expect(summary.profiled).toBe(true);
    expect(() => assertLighthouse(summary)).toThrow(/profiled/);
  });
});
