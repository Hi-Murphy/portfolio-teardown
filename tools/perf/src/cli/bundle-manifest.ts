import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

import { parseCli } from '../args.ts';
import {
  createBundleManifest,
  diffBundleManifests,
  formatBundleManifestDiff,
  type BundleManifest,
} from '../bundle-manifest.ts';
import { EXIT } from '../exit-codes.ts';
import { run } from '../log.ts';

interface BundleManifestArgs {
  values: {
    'out-dir'?: string;
    write?: string;
    diff?: boolean;
    help?: boolean;
  };
  positionals: string[];
}

const usage = `Usage:
  pnpm bundle:manifest --out-dir <out> [--write <file>]
  pnpm bundle:manifest --diff <before.json> <after.json>

Writes every JS file under _next/static, every HTML route's script src list, and total JS bytes.
Diff exits ${EXIT.BUDGET} when a JS file or route script was added, or total JS bytes grew.`;

async function readManifest(path: string): Promise<BundleManifest> {
  return JSON.parse(await readFile(resolve(process.cwd(), path), 'utf8')) as BundleManifest;
}

export async function main(argv: string[]): Promise<number> {
  const { values, positionals } = parseCli<BundleManifestArgs>(argv, {
    options: {
      'out-dir': { type: 'string' },
      write: { type: 'string' },
      diff: { type: 'boolean' },
      help: { type: 'boolean' },
    },
    allowPositionals: true,
    requiredPositionals: 0,
  });

  if (values.help) {
    console.log(usage);
    return EXIT.OK;
  }

  if (values.diff === true) {
    if (values['out-dir'] !== undefined || values.write !== undefined || positionals.length !== 2) {
      console.error('error: --diff requires exactly two manifest paths and no build options');
      return EXIT.USAGE;
    }

    const before = await readManifest(positionals[0]!);
    const after = await readManifest(positionals[1]!);
    const diff = diffBundleManifests(before, after);
    process.stdout.write(formatBundleManifestDiff(diff));
    return diff.pass ? EXIT.OK : EXIT.BUDGET;
  }

  if (positionals.length > 0 || values['out-dir'] === undefined) {
    console.error(usage);
    return EXIT.USAGE;
  }

  const outDir = resolve(process.cwd(), values['out-dir']);
  let manifest: BundleManifest;
  try {
    manifest = await createBundleManifest(outDir);
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    console.error(`error: could not read ${outDir}: ${detail}`);
    return EXIT.USAGE;
  }

  const json = `${JSON.stringify(manifest, null, 2)}\n`;
  if (values.write === undefined) {
    process.stdout.write(json);
  } else {
    const writePath = resolve(process.cwd(), values.write);
    await mkdir(dirname(writePath), { recursive: true });
    await writeFile(writePath, json);
    console.log(
      `bundle-manifest: ${manifest.files.length} JS files, ${manifest.totalJsBytes} bytes`,
    );
    console.log(`routes: ${manifest.routes.length}`);
    console.log(`wrote: ${writePath}`);
  }

  return EXIT.OK;
}

await run(main);
