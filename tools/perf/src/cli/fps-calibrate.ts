import { spawn } from 'node:child_process';
import { stat } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { parseCli } from '../args.ts';
import { freePort } from '../browser.ts';
import { FPS_NOMINAL, FPS_TOLERANCE } from '../budgets.ts';
import { CliError, EXIT, EXIT_DESCRIPTIONS } from '../exit-codes.ts';
import { run } from '../log.ts';
import { serveDir } from '../serve.ts';

interface CalibrateArgs {
  values: {
    out?: string;
    'no-build'?: boolean;
    help?: boolean;
  };
  positionals: string[];
}

const REPO_ROOT = fileURLToPath(new URL('../../../../', import.meta.url));
const FIXTURE_DIR = join(REPO_ROOT, 'out-fixtures');
const FIXTURE_PATH = '/fixtures/fps-calibration';

const usage = `Usage: pnpm fps:calibrate [options]

Builds the fixture export, serves it on 127.0.0.1, and measures ${FIXTURE_PATH}
against the ${FPS_NOMINAL} fps nominal value ± ${(FPS_TOLERANCE * 100).toFixed(0)}%.

Options:
  --no-build      use an existing out-fixtures/ export
  --out <dir>     output directory for fps.json
  --help          show this help`;

function exitCodeTable(): string {
  return Object.entries(EXIT)
    .map(([name, code]) => `${code} ${EXIT_DESCRIPTIONS[name as keyof typeof EXIT]}`)
    .join('\n');
}

async function runCommand(command: string, args: string[]): Promise<void> {
  const exitCode = await new Promise<number | null>((resolve, reject) => {
    const child = spawn(command, args, { cwd: REPO_ROOT, stdio: 'inherit' });
    child.once('error', reject);
    child.once('exit', (code) => resolve(code));
  }).catch((error: unknown) => {
    const detail = error instanceof Error ? error.message : String(error);
    throw new CliError(EXIT.INTERNAL, `could not run ${command}: ${detail}`);
  });

  if (exitCode !== 0) {
    throw new CliError(
      EXIT.INTERNAL,
      `${command} ${args.join(' ')} exited with ${exitCode ?? 'a signal'}`,
    );
  }
}

export async function main(argv: string[]): Promise<number> {
  const { values } = parseCli<CalibrateArgs>(argv, {
    options: {
      out: { type: 'string' },
      'no-build': { type: 'boolean' },
      help: { type: 'boolean' },
    },
    allowPositionals: false,
  });

  if (values.help) {
    console.log(`${usage}\n\nExit codes:\n${exitCodeTable()}`);
    return EXIT.OK;
  }

  if (!values['no-build']) {
    console.log('building fixture export...');
    await runCommand('pnpm', ['build:fixtures']);
  }

  try {
    const directory = await stat(FIXTURE_DIR);
    if (!directory.isDirectory()) throw new Error('not a directory');
  } catch {
    throw new CliError(EXIT.USAGE, `fixture export not found: ${FIXTURE_DIR}`);
  }

  const port = await freePort();
  const server = await serveDir(FIXTURE_DIR, { port });
  try {
    const fixtureUrl = new URL(FIXTURE_PATH, server.url);
    console.log(`fixture: ${fixtureUrl.href}`);
    const fpsArgs = [
      'fps',
      fixtureUrl.href,
      '--expect',
      String(FPS_NOMINAL),
      '--tolerance',
      String(FPS_TOLERANCE),
    ];
    if (values.out) fpsArgs.push('--out', values.out);
    await runCommand('pnpm', fpsArgs);
  } finally {
    await server.close();
  }

  return EXIT.OK;
}

await run(main);
