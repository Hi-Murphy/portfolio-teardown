import { appendFile } from 'node:fs/promises';

import type { LighthouseRun, LighthouseSummary } from './lighthouse.ts';

function runsTable(summary: LighthouseSummary): string {
  const rows = summary.runs.map((run: LighthouseRun, index: number) => {
    const median = index === summary.medianRun ? 'median' : '';
    return `| ${index + 1} | ${run.performance} | ${run.lcpMs} | ${run.cls} | ${run.tbtMs} | ${run.fcpMs} | ${run.siMs} | ${run.totalByteWeight} | ${median} |`;
  });

  return [
    '| Run | Performance | LCP (ms) | CLS | TBT (ms) | FCP (ms) | SI (ms) | Bytes | Median |',
    '|---:|---:|---:|---:|---:|---:|---:|---:|---|',
    ...rows,
  ].join('\n');
}

export function renderLighthouseMarkdown(summary: LighthouseSummary): string {
  const assertionRows = summary.assertions.map(
    (assertion) =>
      `| ${assertion.id} | ${assertion.threshold} | ${Array.isArray(assertion.actual) ? assertion.actual.join(', ') : assertion.actual} | ${assertion.scope} | ${assertion.pass ? 'pass' : 'fail'} |`,
  );

  return [
    '## Lighthouse gate — mobile',
    '',
    `URL: ${summary.url}`,
    `Final URL: ${summary.finalUrl}`,
    `Tools: Lighthouse ${summary.tools.lighthouse}, Chromium ${summary.tools.chromium}`,
    `Result: ${summary.pass ? 'PASS' : 'FAIL'}`,
    '',
    '| Threshold | Measured | Scope | Result |',
    '|---|---|---|---|',
    ...assertionRows,
    '',
    '### Runs',
    '',
    runsTable(summary),
    '',
  ].join('\n');
}

export async function writeLighthouseStepSummary(
  summary: LighthouseSummary,
  target = process.env.GITHUB_STEP_SUMMARY,
): Promise<boolean> {
  if (!target) {
    return false;
  }

  await appendFile(target, renderLighthouseMarkdown(summary));
  return true;
}
