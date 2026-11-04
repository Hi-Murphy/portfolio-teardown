import { mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises';
import { join, relative, resolve, sep } from 'node:path';

import { parseCli, parseUrl } from '../args.ts';
import { freePort, launch } from '../browser.ts';
import {
  eagerProbeExitCode,
  eagerProbeFileName,
  eagerProbeRouteName,
  runEagerProbe,
  type EagerProbeMotion,
  type EagerProbeRun,
} from '../eager-probe.ts';
import { CliError, EXIT, EXIT_DESCRIPTIONS } from '../exit-codes.ts';
import { run } from '../log.ts';
import { serveDir, type ServedDir } from '../serve.ts';

interface EagerProbeArgs {
  values: {
    serve?: string;
    route?: string;
    runs?: string;
    'reduced-motion'?: boolean;
    out?: string;
    help?: boolean;
  };
  positionals: string[];
}

const DEFAULT_RUNS = 2;
const MAX_RUNS = 10;
const THREE_CHUNK_MARKERS = [
  'WebGLRenderer',
  '@react-three/fiber',
  'react-three-fiber',
  'R3F',
] as const;

const usage = `Usage: pnpm eager:probe <url> | --serve <dir> --route <path> [options]

Probes the eager teardown with a fresh mobile context and zero user interaction.

Options:
  --serve <dir>       serve a static export on a free local port
  --route <path>      route to probe, for example / or /projects/websocket-inspector
  --runs <n>          runs to execute (default: ${DEFAULT_RUNS})
  --reduced-motion    use prefers-reduced-motion: reduce and observe until load + 5 s
  --out <dir>         output directory (default: .evidence/eager-probe)
  --help              show this help`;

function exitCodeTable(): string {
  return Object.entries(EXIT)
    .map(([name, code]) => `${code} ${EXIT_DESCRIPTIONS[name as keyof typeof EXIT]}`)
    .join('\n');
}

function parseRuns(raw: string | undefined): number {
  if (raw === undefined) return DEFAULT_RUNS;
  if (!/^\d+$/.test(raw)) throw new CliError(EXIT.USAGE, `--runs must be an integer: ${raw}`);
  const runs = Number.parseInt(raw, 10);
  if (runs < 1 || runs > MAX_RUNS) {
    throw new CliError(EXIT.USAGE, `--runs must be between 1 and ${MAX_RUNS}`);
  }
  return runs;
}

async function isDirectory(path: string): Promise<boolean> {
  try {
    return (await stat(path)).isDirectory();
  } catch {
    return false;
  }
}

async function serveExport(dir: string): Promise<ServedDir> {
  const resolved = resolve(process.cwd(), dir);
  if (!(await isDirectory(resolved))) {
    throw new CliError(EXIT.USAGE, `directory not found: ${resolved}`);
  }

  try {
    return await serveDir(resolved, { port: await freePort() });
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new CliError(EXIT.INTERNAL, `could not serve ${resolved}: ${detail}`);
  }
}

async function jsFilesBelow(root: string): Promise<string[]> {
  const found: string[] = [];

  async function walk(directory: string): Promise<void> {
    const entries = await readdir(directory, { withFileTypes: true });
    entries.sort((left, right) => left.name.localeCompare(right.name));
    for (const entry of entries) {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) await walk(path);
      else if (entry.isFile() && entry.name.endsWith('.js')) found.push(path);
    }
  }

  if (await isDirectory(root)) await walk(root);
  return found;
}

async function detectThreeChunkPaths(exportDir: string): Promise<Set<string>> {
  const found = new Set<string>();
  const staticDir = join(resolve(exportDir), '_next', 'static');

  for (const path of await jsFilesBelow(staticDir)) {
    const contents = await readFile(path, 'utf8');
    if (!THREE_CHUNK_MARKERS.some((marker) => contents.includes(marker))) continue;
    found.add(`/${relative(resolve(exportDir), path).split(sep).join('/')}`);
  }

  return found;
}

function printRun(result: EagerProbeRun): void {
  console.log(
    `eager-probe: ${result.routeName}/${result.motion} r${result.run} ${result.pass ? 'PASS' : 'FAIL'}`,
  );
  for (const entry of result.verdict.checks) {
    if (entry.pass) continue;
    console.log(
      `  ${entry.name}: ${JSON.stringify(entry.actual)} (expected ${JSON.stringify(entry.expected)})`,
    );
  }
}

export async function main(argv: string[]): Promise<number> {
  const { values, positionals } = parseCli<EagerProbeArgs>(argv, {
    options: {
      serve: { type: 'string' },
      route: { type: 'string' },
      runs: { type: 'string' },
      'reduced-motion': { type: 'boolean' },
      out: { type: 'string' },
      help: { type: 'boolean' },
    },
    allowPositionals: true,
    requiredPositionals: 0,
  });

  if (values.help) {
    console.log(`${usage}\n\nExit codes:\n${exitCodeTable()}`);
    return EXIT.OK;
  }
  if (values.serve !== undefined && positionals.length > 0) {
    throw new CliError(EXIT.USAGE, 'provide either a URL or --serve <dir>, not both');
  }
  if (values.serve === undefined && positionals.length !== 1) {
    throw new CliError(EXIT.USAGE, 'expected exactly one URL or --serve <dir>');
  }
  if (values.route === undefined) throw new CliError(EXIT.USAGE, 'missing --route');
  if (!values.route.startsWith('/') || values.route.includes('://')) {
    throw new CliError(EXIT.USAGE, `--route must be an absolute path: ${values.route}`);
  }

  const runs = parseRuns(values.runs);
  const motion: EagerProbeMotion = values['reduced-motion'] === true ? 'reduce' : 'normal';
  const outDir = values.out ?? join(process.cwd(), '.evidence', 'eager-probe');
  try {
    await mkdir(outDir, { recursive: true });
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new CliError(EXIT.USAGE, `--out is not writable: ${detail}`);
  }

  let server: ServedDir | undefined;
  try {
    const base =
      values.serve === undefined
        ? parseUrl(positionals[0])
        : (server = await serveExport(values.serve)).url;
    const threeChunkPaths =
      values.serve === undefined ? undefined : await detectThreeChunkPaths(values.serve);
    const browser = await launch();
    const results: EagerProbeRun[] = [];
    try {
      for (let runNumber = 1; runNumber <= runs; runNumber += 1) {
        const result = await runEagerProbe({
          browser,
          base,
          route: values.route,
          run: runNumber,
          motion,
          outDir,
          ...(threeChunkPaths === undefined ? {} : { threeChunkPaths }),
        });
        const artifact = join(
          outDir,
          eagerProbeFileName(eagerProbeRouteName(values.route), motion, runNumber, 'json'),
        );
        await writeFile(artifact, `${JSON.stringify(result, null, 2)}\n`, 'utf8');
        printRun(result);
        results.push(result);
      }
    } finally {
      await browser.close().catch(() => undefined);
    }

    const pass = results.every((result) => result.pass);
    console.log(`eager-probe: ${pass ? 'PASS' : 'FAIL'} (${results.length} runs)`);
    console.log(`artifacts: ${outDir}`);
    return eagerProbeExitCode(results);
  } finally {
    await server?.close();
  }
}

await run(main);
