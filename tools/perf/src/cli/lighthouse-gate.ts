import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import { parseCli, parseUrl } from '../args.ts';
import { LIGHTHOUSE_RUNS } from '../budgets.ts';
import { CliError, EXIT, EXIT_DESCRIPTIONS } from '../exit-codes.ts';
import { runLighthouse, summarizeLighthouse } from '../lighthouse.ts';
import { run } from '../log.ts';
import { assertReachable } from '../reach.ts';
import { writeLighthouseStepSummary } from '../summary-md.ts';

interface LighthouseGateArgs {
  values: {
    out?: string;
    help?: boolean;
  };
  positionals: string[];
}

const usage = 'Usage: pnpm perf:lighthouse <url> [--out directory]';

function exitCodeTable(): string {
  return Object.entries(EXIT)
    .map(([name, code]) => `${code} ${EXIT_DESCRIPTIONS[name as keyof typeof EXIT]}`)
    .join('\n');
}

function defaultOutDir(): string {
  if (process.env.CI === 'true') {
    return resolve('.evidence/ci/lighthouse');
  }

  const stamp = new Date().toISOString().slice(0, 19).replace(/\D/g, '');
  return resolve('.evidence', `${stamp}-lighthouse`);
}

export async function main(argv: string[]): Promise<number> {
  const { values, positionals } = parseCli<LighthouseGateArgs>(argv, {
    options: {
      out: { type: 'string' },
      help: { type: 'boolean' },
    },
    allowPositionals: true,
    requiredPositionals: argv.includes('--help') ? 0 : 1,
  });

  if (values.help) {
    console.log(`${usage}\n\nExit codes:\n${exitCodeTable()}`);
    return EXIT.OK;
  }

  const url = parseUrl(positionals[0]);
  await assertReachable(url);

  const out = values.out ?? defaultOutDir();
  await mkdir(out, { recursive: true });

  const lhrs = await runLighthouse(url, {
    runs: LIGHTHOUSE_RUNS,
    categories: ['performance'],
  });

  for (const [index, lhr] of lhrs.entries()) {
    await writeFile(`${out}/lighthouse-run-${index}.json`, `${JSON.stringify(lhr, null, 2)}\n`);
  }

  const summary = summarizeLighthouse(lhrs);
  await writeFile(`${out}/lighthouse-summary.json`, `${JSON.stringify(summary, null, 2)}\n`);
  await writeLighthouseStepSummary(summary);

  for (const assertion of summary.assertions) {
    const measured = Array.isArray(assertion.actual)
      ? assertion.actual.join(', ')
      : assertion.actual;
    console.log(
      `${assertion.id}: ${measured} ${assertion.threshold} (${assertion.scope}) ${assertion.pass ? 'pass' : 'fail'}`,
    );
  }

  console.log(`summary: ${out}/lighthouse-summary.json`);
  if (!summary.pass) {
    throw new CliError(EXIT.BUDGET, 'Lighthouse budget violated');
  }

  return EXIT.OK;
}

await run(main);
