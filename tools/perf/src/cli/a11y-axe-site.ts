import { stat } from 'node:fs/promises';
import { resolve } from 'node:path';

import { parseCli, parseUrl } from '../args.ts';
import { CliError, EXIT, EXIT_DESCRIPTIONS } from '../exit-codes.ts';
import { run } from '../log.ts';
import { assertReachable } from '../reach.ts';
import { serveDir, type ServedDir } from '../serve.ts';
import { SITE_ROUTE_GROUPS, runSiteAxe, type SiteRouteGroup } from '../site-axe.ts';

interface AxeSiteArgs {
  values: {
    serve?: string;
    out?: string;
    routes?: string;
    help?: boolean;
  };
  positionals: string[];
}

const DEFAULT_OUT = '.evidence/axe-site';

const usage = `Usage: pnpm a11y:axe:site <url> [options]
       pnpm a11y:axe:site --serve <dir> [options]

Runs axe-core across the site palette, viewport and interaction-state matrix.

Options:
  --serve <dir>   serve a static export in-process
  --out <dir>     output directory (default: ${DEFAULT_OUT})
  --routes <list> comma-separated route groups: home, projects, project
  --help          show this help`;

function exitCodeTable(): string {
  return Object.entries(EXIT)
    .map(([name, code]) => `${code} ${EXIT_DESCRIPTIONS[name as keyof typeof EXIT]}`)
    .join('\n');
}

function selectedRouteGroups(raw: string | undefined): readonly SiteRouteGroup[] {
  if (raw === undefined) return SITE_ROUTE_GROUPS;

  const requested = raw
    .split(',')
    .map((value) => value.trim())
    .filter((value) => value.length > 0);
  if (requested.length === 0) throw new CliError(EXIT.USAGE, '--routes must not be empty');

  const unknown = requested.filter((value) => !SITE_ROUTE_GROUPS.includes(value as SiteRouteGroup));
  if (unknown.length > 0) {
    throw new CliError(EXIT.USAGE, `unknown route group: ${unknown.join(', ')}`);
  }

  return [...new Set(requested as SiteRouteGroup[])];
}

async function directory(value: string): Promise<string> {
  const path = resolve(process.cwd(), value);

  try {
    const info = await stat(path);
    if (!info.isDirectory()) throw new Error('not a directory');
  } catch {
    throw new CliError(EXIT.USAGE, `directory not found: ${path}`);
  }

  return path;
}

export async function main(argv: string[]): Promise<number> {
  const { values, positionals } = parseCli<AxeSiteArgs>(argv, {
    options: {
      serve: { type: 'string' },
      out: { type: 'string' },
      routes: { type: 'string' },
      help: { type: 'boolean' },
    },
    allowPositionals: true,
  });

  if (values.help) {
    console.log(`${usage}\n\nExit codes:\n${exitCodeTable()}`);
    return EXIT.OK;
  }
  if (values.serve !== undefined && positionals.length > 0) {
    throw new CliError(EXIT.USAGE, 'use either <url> or --serve <dir>, not both');
  }
  if (values.serve === undefined && positionals.length !== 1) {
    throw new CliError(EXIT.USAGE, 'expected exactly one URL or --serve <dir>');
  }

  const routeGroups = selectedRouteGroups(values.routes);
  const outDir = values.out ?? resolve(process.cwd(), DEFAULT_OUT);
  let serving: ServedDir | undefined;
  let target: URL;

  if (values.serve !== undefined) {
    const dir = await directory(values.serve);

    try {
      serving = await serveDir(dir);
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      throw new CliError(EXIT.INTERNAL, `could not serve ${dir}: ${detail}`);
    }

    target = serving.url;
  } else {
    target = parseUrl(positionals[0]);
  }

  try {
    await assertReachable(target);
    const summary = await runSiteAxe(target, { outDir, routeGroups });
    return summary.exitCode;
  } finally {
    await serving?.close();
  }
}

await run(main);
