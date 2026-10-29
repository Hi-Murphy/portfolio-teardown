import { parseCli, parseUrl } from '../args.ts';
import { CliError, EXIT, EXIT_DESCRIPTIONS } from '../exit-codes.ts';
import { run } from '../log.ts';
import { assertFixtureAbsent } from '../preview.ts';

interface AssertAbsentArgs {
  values: { help?: boolean };
  positionals: string[];
}

const usage = `Usage: assert-absent.ts <url>

Exits 0 only when <url> returns HTTP 404 without the data-perf-fixture marker.`;

function exitCodeTable(): string {
  return Object.entries(EXIT)
    .map(([name, code]) => `${code} ${EXIT_DESCRIPTIONS[name as keyof typeof EXIT]}`)
    .join('\n');
}

export async function main(argv: string[]): Promise<number> {
  const helpRequested = argv.includes('--help');
  const { values, positionals } = parseCli<AssertAbsentArgs>(argv, {
    options: { help: { type: 'boolean' } },
    allowPositionals: true,
    requiredPositionals: helpRequested ? 0 : 1,
  });

  if (values.help) {
    console.log(`${usage}\n\nExit codes:\n${exitCodeTable()}`);
    return EXIT.OK;
  }
  if (positionals.length !== 1) {
    throw new CliError(EXIT.USAGE, 'expected exactly one URL');
  }

  const url = parseUrl(positionals[0]);
  await assertFixtureAbsent(url);
  console.log(`absent: ${url.href} returned HTTP 404 without data-perf-fixture`);
  return EXIT.OK;
}

await run(main);
