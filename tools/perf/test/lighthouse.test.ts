import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, test } from 'vitest';

import {
  assertLighthouse,
  pickMedianRun,
  summarizeLighthouse,
  type LHR,
} from '../src/lighthouse.ts';
import { renderLighthouseMarkdown, writeLighthouseStepSummary } from '../src/summary-md.ts';

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
