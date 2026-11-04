import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { gzipSync } from 'node:zlib';

import { parseCli, parseUrl } from '../args.ts';
import { LIGHTHOUSE_RUNS } from '../budgets.ts';
import { CliError, EXIT, EXIT_DESCRIPTIONS } from '../exit-codes.ts';
import { parseCategories, runLighthouse, summarizeLighthouse } from '../lighthouse.ts';
import { run } from '../log.ts';
import { assertReachable } from '../reach.ts';
import { writeLighthouseStepSummary } from '../summary-md.ts';

interface LighthouseGateArgs {
  values: {
    out?: string;
    categories?: string;
    profile?: boolean;
    'cpu-multiplier'?: string;
    gl?: string;
    help?: boolean;
  };
  positionals: string[];
}

const usage =
  'Usage: pnpm perf:lighthouse <url> [--out directory] [--categories performance,accessibility] [--profile] [--cpu-multiplier number] [--gl swiftshader]';

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

function parseCpuMultiplier(value: string | undefined): number | undefined {
  if (value === undefined) return undefined;

  const multiplier = Number(value);
  if (!Number.isFinite(multiplier) || multiplier <= 0) {
    throw new CliError(EXIT.USAGE, '--cpu-multiplier must be a positive number');
  }
  return multiplier;
}

function parseGl(value: string | undefined): 'swiftshader' | undefined {
  if (value === undefined || value === 'swiftshader') return value;
  throw new CliError(EXIT.USAGE, '--gl must be swiftshader');
}

export async function main(argv: string[]): Promise<number> {
  const { values, positionals } = parseCli<LighthouseGateArgs>(argv, {
    options: {
      out: { type: 'string' },
      categories: { type: 'string' },
      profile: { type: 'boolean' },
      'cpu-multiplier': { type: 'string' },
      gl: { type: 'string' },
      help: { type: 'boolean' },
    },
    allowPositionals: true,
    requiredPositionals: argv.includes('--help') ? 0 : 1,
  });

  if (values.help) {
    console.log(`${usage}\n\nExit codes:\n${exitCodeTable()}`);
    return EXIT.OK;
  }

  const categories = parseCategories(values.categories);
  const cpuMultiplier = parseCpuMultiplier(values['cpu-multiplier']);
  const gl = parseGl(values.gl);
  const url = parseUrl(positionals[0]);
  await assertReachable(url);

  const out = values.out ?? defaultOutDir();
  await mkdir(out, { recursive: true });

  if (values.profile === true) {
    const runs = await runLighthouse(url, {
      runs: 1,
      categories,
      profile: true,
      ...(cpuMultiplier === undefined ? {} : { cpuMultiplier }),
      ...(gl === undefined ? {} : { gl }),
    });

    for (const [index, run] of runs.entries()) {
      await writeFile(
        `${out}/lighthouse-run-${index}.json`,
        `${JSON.stringify(run.lhr, null, 2)}\n`,
      );
      await writeFile(
        `${out}/lighthouse-run-${index}.devtoolslog.json`,
        `${JSON.stringify(run.devtoolsLog, null, 2)}\n`,
      );
      await writeFile(
        `${out}/lighthouse-run-${index}.trace.json.gz`,
        gzipSync(Buffer.from(`${JSON.stringify(run.trace)}\n`), { level: 9 }),
      );
    }

    const summary = summarizeLighthouse(
      runs.map((run) => run.lhr),
      {
        accessibility: categories.includes('accessibility'),
        profiled: true,
      },
    );
    await writeFile(`${out}/lighthouse-summary.json`, `${JSON.stringify(summary, null, 2)}\n`);

    for (const assertion of summary.assertions) {
      const measured = Array.isArray(assertion.actual)
        ? assertion.actual.join(', ')
        : assertion.actual;
      console.log(
        `${assertion.id}: ${measured} ${assertion.threshold} (${assertion.scope}) ${assertion.pass ? 'pass' : 'fail'}`,
      );
    }

    for (const [index] of runs.entries()) {
      console.log(`trace: ${out}/lighthouse-run-${index}.trace.json.gz`);
    }
    console.log(`summary: ${out}/lighthouse-summary.json`);
    console.log('profiled: informational run; excluded from gate medians');
    return EXIT.OK;
  }

  const lhrs = await runLighthouse(url, {
    runs: LIGHTHOUSE_RUNS,
    categories,
    ...(cpuMultiplier === undefined ? {} : { cpuMultiplier }),
    ...(gl === undefined ? {} : { gl }),
  });

  for (const [index, lhr] of lhrs.entries()) {
    await writeFile(`${out}/lighthouse-run-${index}.json`, `${JSON.stringify(lhr, null, 2)}\n`);
  }

  const summary = summarizeLighthouse(lhrs, {
    accessibility: categories.includes('accessibility'),
  });
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
