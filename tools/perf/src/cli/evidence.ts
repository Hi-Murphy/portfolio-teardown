import { parseCli, parseUrl } from '../args.ts';
import {
  defaultEvidenceDir,
  gatherEvidence,
  outDirIsGitIgnored,
  parseColorScheme,
  parseRuns,
} from '../evidence.ts';
import { CliError, EXIT, EXIT_DESCRIPTIONS } from '../exit-codes.ts';
import { run } from '../log.ts';

interface EvidenceArgs {
  values: {
    out?: string;
    runs?: string;
    'color-scheme'?: string;
    'full-page'?: boolean;
    'wait-for'?: string;
    help?: boolean;
  };
  positionals: string[];
}

const usage = `Usage: pnpm evidence <url> [options]

Captures mobile and desktop screenshots plus a Lighthouse evidence bundle.

Options:
  --out <dir>                 output directory (default: .evidence/<timestamp>-<host>)
  --runs <n>                  Lighthouse runs (default: 3)
  --color-scheme <scheme>     light or dark (default: light)
  --full-page                 capture full-page screenshots
  --wait-for <css>            wait for a CSS selector before capturing
  --help                      show this help`;

function exitCodeTable(): string {
  return Object.entries(EXIT)
    .map(([name, code]) => `${code} ${EXIT_DESCRIPTIONS[name as keyof typeof EXIT]}`)
    .join('\n');
}

export async function main(argv: string[]): Promise<number> {
  const helpRequested = argv.includes('--help');
  const { values, positionals } = parseCli<EvidenceArgs>(argv, {
    options: {
      out: { type: 'string' },
      runs: { type: 'string' },
      'color-scheme': { type: 'string' },
      'full-page': { type: 'boolean' },
      'wait-for': { type: 'string' },
      help: { type: 'boolean' },
    },
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
  const outDir = values.out ?? defaultEvidenceDir(url);
  if (!outDirIsGitIgnored(outDir)) {
    console.error(`warning: --out is not git-ignored: ${outDir}`);
  }

  const result = await gatherEvidence(url, {
    outDir,
    runs: parseRuns(values.runs),
    colorScheme: parseColorScheme(values['color-scheme']),
    fullPage: values['full-page'] ?? false,
    waitFor: values['wait-for'],
    argv: [...argv],
  });

  for (const step of result.meta.steps) {
    const status = step.ok ? 'ok' : 'FAILED';
    const suffix = step.error ? `: ${step.error}` : '';
    console.log(`${status} ${step.name} (${step.ms} ms)${suffix}`);
  }
  console.log(`evidence: ${result.outDir}`);

  return result.exitCode;
}

await run(main);
