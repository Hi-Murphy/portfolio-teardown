import { stat } from 'node:fs/promises';
import { resolve } from 'node:path';

import { parseCli } from '../args.ts';
import { CliError, EXIT, EXIT_DESCRIPTIONS } from '../exit-codes.ts';
import { run } from '../log.ts';
import {
  readSeoExpectation,
  runSeoProbe,
  type SeoProbeReport,
  type SeoProbeStep,
} from '../seo-probe.ts';

interface SeoProbeArgs {
  values: {
    'out-dir'?: string;
    'site-url'?: string;
    expect?: string;
    compare?: string;
    out?: string;
    help?: boolean;
  };
  positionals: string[];
}

const usage = `Usage: pnpm seo:probe --out-dir <dir> --site-url <origin> --expect <json> [options]

Verifies the static SEO export against content-derived expectations.

Options:
  --out-dir <dir>    static export directory (for example apps/web/out)
  --site-url <url>   expected public origin
  --expect <json>    expectation file written by pnpm --filter web seo:expect
  --compare <json>   previous og-hashes.json from the first build
  --out <dir>        evidence output directory (default: .evidence/seo-probe)
  --help             show this help`;

function exitCodeTable(): string {
  return Object.entries(EXIT)
    .map(([name, code]) => `${code} ${EXIT_DESCRIPTIONS[name as keyof typeof EXIT_DESCRIPTIONS]}`)
    .join('\n');
}

function requiredString(value: string | undefined, option: string): string {
  if (!value?.trim()) throw new CliError(EXIT.USAGE, `missing ${option}`);
  return value;
}

function parseOrigin(value: string | undefined): string {
  const raw = requiredString(value, '--site-url');
  let url: URL;

  try {
    url = new URL(raw);
  } catch {
    throw new CliError(EXIT.USAGE, `invalid --site-url: ${raw}`);
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new CliError(EXIT.USAGE, '--site-url must use http or https');
  }
  if (url.username || url.password || url.pathname !== '/' || url.search || url.hash) {
    throw new CliError(
      EXIT.USAGE,
      '--site-url must be an origin with no path, query, or credentials',
    );
  }

  return url.origin;
}

function failedStepSteps(report: SeoProbeReport): SeoProbeStep[] {
  return report.routes.flatMap((route) =>
    route.steps.filter((item) => !item.pass).map((item) => item.step),
  );
}

export async function main(argv: string[]): Promise<number> {
  const { values, positionals } = parseCli<SeoProbeArgs>(argv, {
    options: {
      'out-dir': { type: 'string' },
      'site-url': { type: 'string' },
      expect: { type: 'string' },
      compare: { type: 'string' },
      out: { type: 'string' },
      help: { type: 'boolean' },
    },
    allowPositionals: false,
    requiredPositionals: 0,
  });

  if (values.help) {
    console.log(`${usage}\n\nExit codes:\n${exitCodeTable()}`);
    return EXIT.OK;
  }
  if (positionals.length > 0) throw new CliError(EXIT.USAGE, 'unexpected positional arguments');

  const outDir = resolve(requiredString(values['out-dir'], '--out-dir'));
  const expectationPath = resolve(requiredString(values.expect, '--expect'));
  const siteUrl = parseOrigin(values['site-url']);
  const outputDir = values.out ?? resolve(process.cwd(), '.evidence', 'seo-probe');

  try {
    if (!(await stat(outDir)).isDirectory()) {
      throw new CliError(EXIT.USAGE, `--out-dir is not a directory: ${outDir}`);
    }
    if (!(await stat(expectationPath)).isFile()) {
      throw new CliError(EXIT.USAGE, `--expect is not a file: ${expectationPath}`);
    }
    if (values.compare !== undefined) await stat(resolve(values.compare));
  } catch (error) {
    if (error instanceof CliError) throw error;
    throw new CliError(EXIT.USAGE, error instanceof Error ? error.message : String(error));
  }

  let expectation;
  try {
    expectation = await readSeoExpectation(expectationPath);
  } catch (error) {
    throw new CliError(
      EXIT.USAGE,
      `invalid expectation file: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  const report = await runSeoProbe({
    outDir,
    siteUrl,
    expectation,
    expectationPath,
    outputDir,
    ...(values.compare === undefined ? {} : { comparePath: resolve(values.compare) }),
  });

  console.log(`seo-probe: ${report.result}`);
  console.log(`artifacts: ${outputDir}`);
  if (report.result === 'FAIL') {
    for (const route of report.routes.filter((candidate) => !candidate.pass)) {
      for (const item of route.steps.filter((candidate) => !candidate.pass)) {
        for (const failed of item.checks.filter((candidate) => !candidate.pass)) {
          console.error(`FAIL ${route.path} ${item.step}: ${failed.name}: ${failed.detail}`);
        }
      }
    }
    for (const coverage of report.htmlCoverage.filter((candidate) => !candidate.pass)) {
      for (const failed of coverage.checks.filter((candidate) => !candidate.pass)) {
        console.error(`FAIL ${coverage.htmlPath} coverage: ${failed.name}: ${failed.detail}`);
      }
    }
    if (report.hashComparison?.pass === false) {
      console.error('FAIL card hashes differ between the two builds');
    }
    const failed = [...new Set(failedStepSteps(report))];
    if (failed.length > 0) console.error(`failed steps: ${failed.join(', ')}`);
    return EXIT.BUDGET;
  }

  return EXIT.OK;
}

await run(main);
