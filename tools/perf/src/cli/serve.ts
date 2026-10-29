import { stat } from 'node:fs/promises';
import { resolve } from 'node:path';

import { parseCli } from '../args.ts';
import { CliError, EXIT, EXIT_DESCRIPTIONS } from '../exit-codes.ts';
import { run } from '../log.ts';
import { serveDir } from '../serve.ts';

interface ServeArgs {
  values: {
    dir?: string;
    port?: string;
    help?: boolean;
  };
  positionals: string[];
}

const DEFAULT_DIR = 'apps/web/out';
const DEFAULT_PORT = '4173';

const usage = `Usage: pnpm serve:out [--dir apps/web/out] [--port 4173]`;

function exitCodeTable(): string {
  return Object.entries(EXIT)
    .map(([name, code]) => `${code} ${EXIT_DESCRIPTIONS[name as keyof typeof EXIT]}`)
    .join('\n');
}

function parsePort(raw: string): number {
  if (!/^\d+$/.test(raw)) {
    throw new CliError(EXIT.USAGE, `invalid --port: ${raw}`);
  }

  const port = Number(raw);
  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new CliError(EXIT.USAGE, `invalid --port: ${raw}`);
  }

  return port;
}

function waitForSignal(): Promise<void> {
  return new Promise((resolveSignal) => {
    const stop = (): void => {
      process.off('SIGINT', stop);
      process.off('SIGTERM', stop);
      resolveSignal();
    };

    process.once('SIGINT', stop);
    process.once('SIGTERM', stop);
  });
}

export async function main(argv: string[]): Promise<number> {
  const { values } = parseCli<ServeArgs>(argv, {
    options: {
      dir: { type: 'string', default: DEFAULT_DIR },
      port: { type: 'string', default: DEFAULT_PORT },
      help: { type: 'boolean' },
    },
    allowPositionals: false,
  });

  if (values.help) {
    console.log(`${usage}\n\nExit codes:\n${exitCodeTable()}`);
    return EXIT.OK;
  }

  const dir = resolve(process.cwd(), values.dir ?? DEFAULT_DIR);
  const port = parsePort(values.port ?? DEFAULT_PORT);

  let info;
  try {
    info = await stat(dir);
  } catch {
    throw new CliError(EXIT.USAGE, `directory not found: ${dir}`);
  }

  if (!info.isDirectory()) {
    throw new CliError(EXIT.USAGE, `not a directory: ${dir}`);
  }

  let serving;
  try {
    serving = await serveDir(dir, { port });
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new CliError(EXIT.INTERNAL, `could not serve ${dir}: ${detail}`);
  }

  console.log(serving.url.href);

  try {
    await waitForSignal();
  } finally {
    await serving.close();
  }

  return EXIT.OK;
}

await run(main);
