import { mkdir, stat } from 'node:fs/promises';
import { join, resolve } from 'node:path';

import { parseCli, parseUrl } from '../args.ts';
import { freePort } from '../browser.ts';
import { CliError, EXIT, EXIT_DESCRIPTIONS } from '../exit-codes.ts';
import { run } from '../log.ts';
import { serveDir, type ServedDir } from '../serve.ts';
import { runClsProbe } from '../site-probe.ts';

interface SiteProbeArgs {
  values: {
    serve?: string;
    fixtures?: string;
    out?: string;
    group?: string | string[];
    help?: boolean;
  };
  positionals: string[];
}

const GROUPS = ['cls'] as const;
type SiteProbeGroup = (typeof GROUPS)[number];

const usage = `Usage: pnpm site:probe <url> | --serve <dir> | --fixtures <dir> [options]

Runs the site probe against a static export or fixture export.

Options:
  --serve <dir>     serve a site export and probe its routes
  --fixtures <dir>  serve an export containing the engine fixture routes
  --group <name>    run cls (default: cls)
  --out <dir>       output directory (default: .evidence/site-probe)
  --help            show this help`;

function exitCodeTable(): string {
  return Object.entries(EXIT)
    .map(([name, code]) => `${code} ${EXIT_DESCRIPTIONS[name as keyof typeof EXIT]}`)
    .join('\n');
}

function selectedGroups(values: SiteProbeArgs['values']): readonly SiteProbeGroup[] {
  if (values.group === undefined) return GROUPS;

  const requested = (typeof values.group === 'string' ? [values.group] : values.group).flatMap(
    (value) => value.split(','),
  );
  const groups: SiteProbeGroup[] = [];

  for (const name of requested) {
    if (!(GROUPS as readonly string[]).includes(name)) {
      throw new CliError(
        EXIT.USAGE,
        `invalid --group ${name}; expected one of ${GROUPS.join(', ')}`,
      );
    }
    if (!groups.includes(name as SiteProbeGroup)) groups.push(name as SiteProbeGroup);
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

export async function main(argv: string[]): Promise<number> {
  const { values, positionals } = parseCli<SiteProbeArgs>(argv, {
    options: {
      serve: { type: 'string' },
      fixtures: { type: 'string' },
      out: { type: 'string' },
      group: { type: 'string', multiple: true },
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
  if (positionals.length > 1) {
    throw new CliError(EXIT.USAGE, 'expected at most one URL');
  }
  if (positionals.length === 0 && values.serve === undefined && values.fixtures === undefined) {
    throw new CliError(EXIT.USAGE, 'expected a URL, --serve <dir>, or --fixtures <dir>');
  }

  selectedGroups(values);

  const outDir = values.out ?? join(process.cwd(), '.evidence', 'site-probe');
  try {
    await mkdir(outDir, { recursive: true });
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new CliError(EXIT.USAGE, `--out is not writable: ${detail}`);
  }

  let siteServer: ServedDir | undefined;
  let fixturesServer: ServedDir | undefined;

  try {
    const siteBase =
      positionals.length === 1
        ? parseUrl(positionals[0])
        : values.serve === undefined
          ? undefined
          : (siteServer = await serveExport(values.serve)).url;
    const fixturesBase =
      values.fixtures === undefined
        ? undefined
        : (fixturesServer = await serveExport(values.fixtures)).url;

    const report = await runClsProbe({ siteBase, fixturesBase, outDir });
    console.log(`site-probe: ${report.pass ? 'PASS' : 'FAIL'}`);
    console.log(`artifacts: ${outDir}`);
    return report.pass ? EXIT.OK : EXIT.BUDGET;
  } finally {
    await siteServer?.close();
    await fixturesServer?.close();
  }
}

await run(main);
