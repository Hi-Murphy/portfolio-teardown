import { spawn } from 'node:child_process';
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { parseCli } from '../args.ts';
import { freePort } from '../browser.ts';
import { FPS_NOMINAL, FPS_TOLERANCE } from '../budgets.ts';
import { CliError, EXIT, EXIT_DESCRIPTIONS } from '../exit-codes.ts';
import { run } from '../log.ts';
import { serveDir } from '../serve.ts';

interface FpsEngineArgs {
  values: { out?: string; 'no-build'?: boolean; help?: boolean };
  positionals: string[];
}

interface FpsArtifact extends Record<string, unknown> {
  fps: number;
  droppedFrames: number;
  pass?: boolean;
}

const REPO_ROOT = fileURLToPath(new URL('../../../../', import.meta.url));
const FIXTURE_DIR = join(REPO_ROOT, 'out-fixtures');
const RULE = 'literal60 (Merlin R3, RFC §9.7)';

const usage = `Usage: pnpm fps:engine [options]

Builds the fixture export, serves it on 127.0.0.1, and measures
/dev/engine?fixture=a&cycle=1 with the S3 FPS harness.

Options:
  --no-build      use an existing out-fixtures/ export
  --out <dir>     output directory for fps.json
  --help          show this help`;

function exitCodeTable(): string {
  return Object.entries(EXIT)
    .map(([name, code]) => `${code} ${EXIT_DESCRIPTIONS[name as keyof typeof EXIT]}`)
    .join('\n');
}

function stamp(date: Date): string {
  const values = [
    date.getFullYear(),
    date.getMonth() + 1,
    date.getDate(),
    date.getHours(),
    date.getMinutes(),
    date.getSeconds(),
  ].map((value) => String(value).padStart(2, '0'));
  return `${values[0]}${values[1]}${values[2]}-${values[3]}${values[4]}${values[5]}`;
}

function defaultOut(): string {
  if (process.env.CI === 'true') return join(process.cwd(), '.evidence', 'ci', 'fps-engine');
  return join(process.cwd(), '.evidence', `${stamp(new Date())}-fps-engine`);
}

async function runCommand(command: string, args: string[]): Promise<number | null> {
  return await new Promise<number | null>((resolveCode, reject) => {
    const child = spawn(command, args, { cwd: REPO_ROOT, stdio: 'inherit' });
    child.once('error', reject);
    child.once('exit', (code) => resolveCode(code));
  }).catch((error: unknown) => {
    const detail = error instanceof Error ? error.message : String(error);
    throw new CliError(EXIT.INTERNAL, `could not run ${command}: ${detail}`);
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readFpsArtifact(raw: string): FpsArtifact {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new CliError(EXIT.INTERNAL, `invalid fps.json: ${detail}`);
  }

  if (
    !isRecord(parsed) ||
    typeof parsed.fps !== 'number' ||
    !Number.isFinite(parsed.fps) ||
    typeof parsed.droppedFrames !== 'number' ||
    !Number.isInteger(parsed.droppedFrames) ||
    (parsed.pass !== undefined && typeof parsed.pass !== 'boolean')
  ) {
    throw new CliError(EXIT.INTERNAL, 'invalid fps.json: missing fps or droppedFrames');
  }

  return parsed as FpsArtifact;
}

export async function main(argv: string[]): Promise<number> {
  const { values } = parseCli<FpsEngineArgs>(argv, {
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
    const buildCode = await runCommand('pnpm', ['build:fixtures']);
    if (buildCode !== 0) {
      throw new CliError(
        EXIT.INTERNAL,
        `pnpm build:fixtures exited with ${buildCode ?? 'a signal'}`,
      );
    }
  }

  try {
    const directory = await stat(FIXTURE_DIR);
    if (!directory.isDirectory()) throw new Error('not a directory');
  } catch {
    throw new CliError(EXIT.USAGE, `fixture export not found: ${FIXTURE_DIR}`);
  }

  const outDir = values.out ?? defaultOut();
  await mkdir(outDir, { recursive: true });
  const port = await freePort();
  const server = await serveDir(FIXTURE_DIR, { port });

  try {
    const fixtureUrl = new URL('dev/engine', server.url);
    fixtureUrl.searchParams.set('fixture', 'a');
    fixtureUrl.searchParams.set('cycle', '1');
    console.log(`fixture: ${fixtureUrl.href}`);

    const harnessCode = await runCommand('pnpm', [
      'fps',
      fixtureUrl.href,
      '--expect',
      String(FPS_NOMINAL),
      '--tolerance',
      String(FPS_TOLERANCE),
      '--out',
      outDir,
    ]);

    if (harnessCode !== EXIT.OK && harnessCode !== EXIT.BUDGET) {
      throw new CliError(
        harnessCode ?? EXIT.INTERNAL,
        `pnpm fps exited with ${harnessCode ?? 'a signal'}`,
      );
    }
  } finally {
    await server.close();
  }

  const artifact = join(outDir, 'fps.json');
  const result = readFpsArtifact(await readFile(artifact, 'utf8'));
  const verdicts = {
    literal60: result.fps >= FPS_NOMINAL,
    r1: result.pass === true && result.droppedFrames === 0,
  };
  const report = { ...result, verdicts, rule: RULE };
  await writeFile(artifact, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

  console.log(`literal60: ${verdicts.literal60}`);
  console.log(`r1: ${verdicts.r1}`);
  console.log(`rule: ${RULE}`);
  console.log(`fps.json: ${artifact}`);
  return verdicts.r1 ? EXIT.OK : EXIT.BUDGET;
}

await run(main);
