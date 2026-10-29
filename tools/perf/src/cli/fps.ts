import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';

import { parseCli, parseUrl } from '../args.ts';
import { launch } from '../browser.ts';
import { FPS_TOLERANCE } from '../budgets.ts';
import { CliError, EXIT, EXIT_DESCRIPTIONS } from '../exit-codes.ts';
import { inBand, measureFps, type FpsResult } from '../fps.ts';
import { run } from '../log.ts';
import { assertReachable } from '../reach.ts';

interface FpsArgs {
  values: {
    out?: string;
    warmup?: string;
    duration?: string;
    expect?: string;
    tolerance?: string;
    trace?: boolean;
    help?: boolean;
  };
  positionals: string[];
}

interface FpsReport extends Omit<FpsResult, 'trace'> {
  kind: 'fps';
  version: 1;
  url: string;
}

const usage = `Usage: pnpm fps <url> [options]

Options:
  --warmup <ms>          warm-up before tracing (default: 1000)
  --duration <ms>        trace window (default: 5000)
  --expect <fps>         pass band centre; requires trace FPS in band
  --tolerance <fraction> fractional pass band (default: ${FPS_TOLERANCE})
  --trace                write the raw trace as fps-trace.json.gz
  --out <dir>            output directory (default: .evidence/<timestamp>-fps)
  --help                 show this help`;

const NAVIGATION_TIMEOUT_MS = 30_000;

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
  if (process.env.CI === 'true') return join(process.cwd(), '.evidence', 'ci', 'fps');
  return join(process.cwd(), '.evidence', `${stamp(new Date())}-fps`);
}

function numeric(value: string | undefined, name: string, fallback: number): number {
  if (value === undefined) return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    throw new CliError(EXIT.USAGE, `invalid --${name}: ${value}`);
  }
  return parsed;
}

function reportJson(result: FpsResult, url: URL): FpsReport {
  return {
    kind: 'fps',
    version: 1,
    url: url.href,
    fps: result.fps,
    frames: result.frames,
    droppedFrames: result.droppedFrames,
    windowMs: result.windowMs,
    intervalsMs: result.intervalsMs,
    rafFps: result.rafFps,
    source: result.source,
    chromium: result.chromium,
    pid: result.pid,
    pidSource: result.pidSource,
    ...(result.expect === undefined ? {} : { expect: result.expect }),
    ...(result.tolerance === undefined ? {} : { tolerance: result.tolerance }),
    ...(result.pass === undefined ? {} : { pass: result.pass }),
  };
}

function printResult(result: FpsResult): void {
  console.log(
    `fps: ${result.fps.toFixed(2)} (${result.frames} frames / ${result.windowMs.toFixed(0)} ms)`,
  );
  console.log(`rafFps: ${result.rafFps.toFixed(2)}`);
  console.log(`droppedFrames: ${result.droppedFrames}`);
  console.log(
    `intervalsMs: p50=${result.intervalsMs.p50.toFixed(2)} p95=${result.intervalsMs.p95.toFixed(2)} max=${result.intervalsMs.max.toFixed(2)}`,
  );
  console.log(`pid: ${result.pid ?? 'unknown'} (${result.pidSource})`);
  console.log(`chromium: ${result.chromium}`);
  console.log(`source: ${result.source}`);
  if (result.expect !== undefined && result.tolerance !== undefined) {
    const lower = result.expect * (1 - result.tolerance);
    const upper = result.expect * (1 + result.tolerance);
    console.log(
      `pass: ${result.pass === true} (${result.expect} ± ${(result.tolerance * 100).toFixed(1)}%, ${lower.toFixed(2)}–${upper.toFixed(2)})`,
    );
  }
}

export async function main(argv: string[]): Promise<number> {
  const helpRequested = argv.includes('--help');
  const { values, positionals } = parseCli<FpsArgs>(argv, {
    options: {
      out: { type: 'string' },
      warmup: { type: 'string' },
      duration: { type: 'string' },
      expect: { type: 'string' },
      tolerance: { type: 'string' },
      trace: { type: 'boolean' },
      help: { type: 'boolean' },
    },
    allowPositionals: true,
    requiredPositionals: helpRequested ? 0 : 1,
  });

  if (values.help) {
    console.log(`${usage}\n\nExit codes:\n${exitCodeTable()}`);
    return EXIT.OK;
  }
  if (positionals.length !== 1) {
    throw new CliError(EXIT.USAGE, 'expected exactly one URL');
  }

  const url = parseUrl(positionals[0]);
  const warmupMs = numeric(values.warmup, 'warmup', 1000);
  const durationMs = numeric(values.duration, 'duration', 5000);
  if (warmupMs < 0) throw new CliError(EXIT.USAGE, '--warmup must be >= 0');
  if (durationMs <= 0) throw new CliError(EXIT.USAGE, '--duration must be > 0');

  let expect: number | undefined;
  let tolerance: number | undefined;
  if (values.expect !== undefined) {
    expect = numeric(values.expect, 'expect', 0);
    tolerance = numeric(values.tolerance, 'tolerance', FPS_TOLERANCE);
    if (expect <= 0) throw new CliError(EXIT.USAGE, '--expect must be > 0');
    if (tolerance < 0 || tolerance >= 1) {
      throw new CliError(EXIT.USAGE, '--tolerance must be >= 0 and < 1');
    }
  } else if (values.tolerance !== undefined) {
    throw new CliError(EXIT.USAGE, '--tolerance requires --expect');
  }

  await assertReachable(url);
  const browser = await launch();
  let result: FpsResult;
  try {
    const context = await browser.newContext();
    const page = await context.newPage();
    try {
      await page.goto(url.href, { waitUntil: 'load', timeout: NAVIGATION_TIMEOUT_MS });
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      throw new CliError(EXIT.UNREACHABLE, `unreachable: ${url.href}: ${detail}`);
    }

    result = await measureFps(page, {
      warmupMs,
      durationMs,
      keepTrace: values.trace ?? false,
    });
  } finally {
    await browser.close();
  }

  if (expect !== undefined && tolerance !== undefined) {
    result.expect = expect;
    result.tolerance = tolerance;
    result.pass = inBand(result.fps, expect, tolerance);
  }

  const out = values.out ?? defaultOut();
  await mkdir(out, { recursive: true });
  const report = reportJson(result, url);
  const artifact = join(out, 'fps.json');
  await writeFile(artifact, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

  if (values.trace && result.trace) {
    const traceArtifact = join(out, 'fps-trace.json.gz');
    await writeFile(traceArtifact, gzipSync(JSON.stringify(result.trace)));
    console.log(`fps-trace.json.gz: ${traceArtifact}`);
  }

  printResult(result);
  console.log(`fps.json: ${artifact}`);
  return result.pass === false ? EXIT.BUDGET : EXIT.OK;
}

await run(main);
