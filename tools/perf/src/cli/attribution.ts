import { readFileSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve, sep } from 'node:path';
import { gunzipSync } from 'node:zlib';

import { parseCli } from '../args.ts';
import type { BundleManifest } from '../bundle-manifest.ts';
import { CliError, EXIT } from '../exit-codes.ts';
import {
  analyzeAttribution,
  renderAttributionMarkdown,
  type AttributionTraceEvent,
} from '../lh-attribution.ts';
import type { LHR } from '../lighthouse.ts';
import { run } from '../log.ts';

interface AttributionArgs {
  values: {
    lhr?: string;
    trace?: string;
    manifest?: string;
    out?: string;
    'out-dir'?: string;
    help?: boolean;
  };
  positionals: string[];
}

const usage =
  'Usage: pnpm perf:attribution --lhr <lighthouse.json> --trace <trace.json[.gz]> --manifest <manifest.json> --out <directory> [--out-dir <export directory>]';

async function readJson(path: string): Promise<unknown> {
  try {
    const contents = await readFile(path);
    const json = path.endsWith('.gz') ? gunzipSync(contents) : contents;
    return JSON.parse(json.toString('utf8')) as unknown;
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new CliError(EXIT.USAGE, `could not read ${path}: ${detail}`);
  }
}

function required(value: string | undefined, flag: string): string {
  if (value === undefined || value === '') {
    throw new CliError(EXIT.USAGE, `${flag} is required`);
  }
  return resolve(process.cwd(), value);
}

function traceEvents(value: unknown): AttributionTraceEvent[] {
  if (typeof value !== 'object' || value === null || !('traceEvents' in value)) {
    throw new CliError(EXIT.USAGE, 'trace JSON must contain traceEvents');
  }
  const events = value.traceEvents;
  if (!Array.isArray(events)) {
    throw new CliError(EXIT.USAGE, 'traceEvents must be an array');
  }
  return events as AttributionTraceEvent[];
}

function manifestValue(value: unknown): BundleManifest {
  if (
    typeof value !== 'object' ||
    value === null ||
    !('kind' in value) ||
    value.kind !== 'bundle-manifest' ||
    !('files' in value) ||
    !Array.isArray(value.files) ||
    !('routes' in value) ||
    !Array.isArray(value.routes)
  ) {
    throw new CliError(EXIT.USAGE, 'manifest is not a bundle-manifest');
  }
  return value as BundleManifest;
}

function servedPath(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
    return decodeURIComponent(parsed.pathname);
  } catch {
    if (/^[A-Za-z][A-Za-z\d+.-]*:/.test(url) || url.startsWith('//')) return null;
    try {
      return decodeURIComponent(url.split(/[?#]/, 1)[0] ?? '');
    } catch {
      return null;
    }
  }
}

function servedChunkReader(outDir: string): (url: string) => string | null {
  const root = resolve(outDir);
  return (url) => {
    const path = servedPath(url);
    if (path === null) return null;
    const target = resolve(root, path.replace(/^\/+/, ''));
    if (!target.startsWith(`${root}${sep}`)) return null;
    try {
      return readFileSync(target, 'utf8');
    } catch {
      return null;
    }
  };
}

export async function main(argv: string[]): Promise<number> {
  const { values } = parseCli<AttributionArgs>(argv, {
    options: {
      lhr: { type: 'string' },
      trace: { type: 'string' },
      manifest: { type: 'string' },
      out: { type: 'string' },
      'out-dir': { type: 'string' },
      help: { type: 'boolean' },
    },
    allowPositionals: false,
  });

  if (values.help === true) {
    console.log(usage);
    return EXIT.OK;
  }

  const lhrPath = required(values.lhr, '--lhr');
  const tracePath = required(values.trace, '--trace');
  const manifestPath = required(values.manifest, '--manifest');
  const out = resolve(process.cwd(), values.out ?? '.evidence/attribution');
  const outDir = values['out-dir'] === undefined ? null : resolve(process.cwd(), values['out-dir']);
  const [lhr, trace, manifest] = await Promise.all([
    readJson(lhrPath),
    readJson(tracePath),
    readJson(manifestPath),
  ]);
  const report = analyzeAttribution(
    lhr as LHR,
    traceEvents(trace),
    manifestValue(manifest),
    outDir === null ? {} : { readChunkSource: servedChunkReader(outDir) },
  );

  await mkdir(out, { recursive: true });
  await writeFile(`${out}/per-task.json`, `${JSON.stringify(report, null, 2)}\n`);
  await writeFile(`${out}/per-task.md`, renderAttributionMarkdown(report));

  const matched = report.tasks.filter((task) => task.matched).length;
  console.log(`source: ${report.source} (${report.lantern.profileChunks} ProfileChunk events)`);
  console.log(`tasks: ${report.tasks.length}; matched: ${matched}`);
  console.log(`per-task.json: ${out}/per-task.json`);
  console.log(`per-task.md: ${out}/per-task.md`);
  return EXIT.OK;
}

await run(main);
