import { mkdir, stat } from 'node:fs/promises';
import { join, resolve } from 'node:path';

import { parseCli, parseUrl } from '../args.ts';
import { A11Y_GROUPS, runA11yProbe, type A11yGroup, type A11yProbeReport } from '../a11y-probe.ts';
import { freePort } from '../browser.ts';
import { CliError, EXIT, EXIT_DESCRIPTIONS } from '../exit-codes.ts';
import { run } from '../log.ts';
import { serveDir, type ServedDir } from '../serve.ts';

interface A11yProbeArgs {
  values: {
    serve?: string;
    out?: string;
    group?: string | string[];
    ci?: boolean;
    help?: boolean;
  };
  positionals: string[];
}

const CI_GROUPS: readonly A11yGroup[] = ['drill', 'aria', 'announce'];

const usage = `Usage: pnpm a11y:probe <url> | --serve <dir> [options]

Runs the S08 accessibility probe against a fixture export. <url> must be an
http(s) URL that serves out-fixtures (for example, http://127.0.0.1:4199/).

Options:
  --serve <dir>    serve a static fixture export on a free local port
  --group <name>   run drill, aria, announce, contrast, reduced-motion,
                   fallbacks, presentation or metrics; repeat for several
  --ci             run only drill, aria and announce
  --out <dir>      output directory (default: .evidence/a11y-probe)
  --help           show this help`;

function exitCodeTable(): string {
  return Object.entries(EXIT)
    .map(([name, code]) => `${code} ${EXIT_DESCRIPTIONS[name as keyof typeof EXIT]}`)
    .join('\n');
}

function selectedGroups(values: A11yProbeArgs['values']): readonly A11yGroup[] {
  if (values.ci === true) {
    if (values.group !== undefined) {
      throw new CliError(EXIT.USAGE, '--ci cannot be combined with --group');
    }
    return CI_GROUPS;
  }

  if (values.group === undefined) return A11Y_GROUPS;

  const requested = typeof values.group === 'string' ? [values.group] : values.group;
  const groups: A11yGroup[] = [];

  for (const name of requested) {
    if (!(A11Y_GROUPS as readonly string[]).includes(name)) {
      throw new CliError(
        EXIT.USAGE,
        `invalid --group ${name}; expected one of ${A11Y_GROUPS.join(', ')}`,
      );
    }
    if (!groups.includes(name as A11yGroup)) groups.push(name as A11yGroup);
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

function printReport(report: A11yProbeReport, outDir: string): void {
  for (const group of report.groups) {
    console.log(`${group.group}: ${group.pass ? 'PASS' : 'FAIL'}`);
  }
  console.log(`a11y-probe: ${report.pass ? 'PASS' : 'FAIL'}`);
  console.log(`artifacts: ${outDir}`);
}

export async function main(argv: string[]): Promise<number> {
  const { values, positionals } = parseCli<A11yProbeArgs>(argv, {
    options: {
      serve: { type: 'string' },
      out: { type: 'string' },
      group: { type: 'string', multiple: true },
      ci: { type: 'boolean' },
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

  const groups = selectedGroups(values);
  const outDir = values.out ?? join(process.cwd(), '.evidence', 'a11y-probe');
  try {
    await mkdir(outDir, { recursive: true });
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new CliError(EXIT.USAGE, `--out is not writable: ${detail}`);
  }

  let server: ServedDir | undefined;
  let base: URL;

  try {
    if (values.serve !== undefined) {
      const dir = resolve(process.cwd(), values.serve);
      if (!(await directoryExists(dir))) {
        throw new CliError(EXIT.USAGE, `directory not found: ${dir}`);
      }
      try {
        server = await serveDir(dir, { port: await freePort() });
      } catch (error) {
        const detail = error instanceof Error ? error.message : String(error);
        throw new CliError(EXIT.INTERNAL, `could not serve ${dir}: ${detail}`);
      }
      base = server.url;
    } else {
      base = parseUrl(positionals[0]);
    }

    const report = await runA11yProbe({ base, outDir, groups });
    printReport(report, outDir);
    return report.pass ? EXIT.OK : EXIT.BUDGET;
  } finally {
    await server?.close();
  }
}

await run(main);
