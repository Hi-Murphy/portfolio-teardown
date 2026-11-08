import { mkdir, readFile, stat } from 'node:fs/promises';
import { join, resolve } from 'node:path';

import { parseCli, parseUrl } from '../args.ts';
import { freePort } from '../browser.ts';
import { CliError, EXIT, EXIT_DESCRIPTIONS } from '../exit-codes.ts';
import {
  HOME_PROBE_DEFAULT_GROUPS,
  HOME_PROBE_GROUPS,
  runHomeProbe,
  type HomeProbeGroup,
} from '../home-probe.ts';
import { run } from '../log.ts';
import { serveDir, type ServedDir } from '../serve.ts';

interface HomeProbeArgs {
  values: {
    serve?: string;
    group?: string | string[];
    approved?: string;
    out?: string;
    help?: boolean;
  };
  positionals: string[];
}

const DEFAULT_APPROVED = '.specify/features/home-composition/g1-approved.txt';

const usage = `Usage: pnpm home:probe <url> | --serve <dir> [options]

Probes the home composition at the responsive widths used by S11.9.

Options:
  --serve <dir>      serve a static export on a free local port
  --group <name>     run one group or a comma-separated list
                     (default: ${HOME_PROBE_DEFAULT_GROUPS.join(',')})
  --approved <file>  approved section list (default: ${DEFAULT_APPROVED})
  --out <dir>        output directory (default: .evidence/home-probe)
  --help             show this help

Groups: ${HOME_PROBE_GROUPS.join(', ')}
The copy group is opt-in until T011.`;

function exitCodeTable(): string {
  return Object.entries(EXIT)
    .map(([name, code]) => `${code} ${EXIT_DESCRIPTIONS[name as keyof typeof EXIT]}`)
    .join('\n');
}

function selectedGroups(values: HomeProbeArgs['values']): readonly HomeProbeGroup[] {
  if (values.group === undefined) return HOME_PROBE_DEFAULT_GROUPS;
  const requested = (typeof values.group === 'string' ? [values.group] : values.group).flatMap(
    (value) => value.split(','),
  );
  const groups: HomeProbeGroup[] = [];
  for (const name of requested) {
    if (!(HOME_PROBE_GROUPS as readonly string[]).includes(name)) {
      throw new CliError(
        EXIT.USAGE,
        `invalid --group ${name}; expected one of ${HOME_PROBE_GROUPS.join(', ')}`,
      );
    }
    if (!groups.includes(name as HomeProbeGroup)) groups.push(name as HomeProbeGroup);
  }
  return groups;
}

async function directoryExists(path: string): Promise<boolean> {
  try {
    return (await stat(path)).isDirectory();
  } catch {
    return false;
  }
}

async function serveExport(dir: string): Promise<ServedDir> {
  const resolved = resolve(process.cwd(), dir);
  if (!(await directoryExists(resolved))) {
    throw new CliError(EXIT.USAGE, `directory not found: ${resolved}`);
  }
  try {
    return await serveDir(resolved, { port: await freePort() });
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new CliError(EXIT.INTERNAL, `could not serve ${resolved}: ${detail}`);
  }
}

async function approvedSections(path: string): Promise<readonly string[]> {
  const resolved = resolve(process.cwd(), path);
  let source: string;
  try {
    source = await readFile(resolved, 'utf8');
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new CliError(EXIT.USAGE, `could not read --approved: ${detail}`);
  }
  const ids = source
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line !== '' && !line.startsWith('#'));
  if (ids.length === 0) throw new CliError(EXIT.USAGE, `--approved is empty: ${resolved}`);
  return ids;
}

export async function main(argv: string[]): Promise<number> {
  const { values, positionals } = parseCli<HomeProbeArgs>(argv, {
    options: {
      serve: { type: 'string' },
      group: { type: 'string', multiple: true },
      approved: { type: 'string' },
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
  if (positionals.length > 1) throw new CliError(EXIT.USAGE, 'expected at most one URL');
  if (positionals.length === 0 && values.serve === undefined) {
    throw new CliError(EXIT.USAGE, 'expected a URL or --serve <dir>');
  }

  const groups = selectedGroups(values);
  const approved = await approvedSections(values.approved ?? DEFAULT_APPROVED);
  const outDir = values.out ?? join(process.cwd(), '.evidence', 'home-probe');
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
    const report = await runHomeProbe({ base, outDir, groups, approved });
    console.log(`home-probe: ${report.pass ? 'PASS' : 'FAIL'}`);
    console.log(`artifacts: ${outDir}`);
    return report.pass ? EXIT.OK : EXIT.BUDGET;
  } finally {
    await server?.close();
  }
}

await run(main);
