import { execFileSync } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import type { Page } from 'playwright';

import { parseCli } from '../args.ts';
import { chromiumVersion, launch } from '../browser.ts';
import { CliError, EXIT, EXIT_DESCRIPTIONS } from '../exit-codes.ts';
import { run } from '../log.ts';

interface HostMetaArgs {
  values: {
    out?: string;
    gl?: string;
    help?: boolean;
  };
  positionals: string[];
}

export interface BenchmarkIndexSummary {
  readonly min: number;
  readonly median: number;
  readonly max: number;
}

export type WebglBackend = 'swiftshader' | `angle-${string}` | 'none';

export interface WebglMeta {
  readonly available: boolean;
  readonly renderer: string | null;
  readonly vendor: string | null;
  readonly backend: WebglBackend;
}

export interface HostMeta {
  readonly attemptId: string;
  readonly runnerName: string;
  readonly imageVersion: string;
  readonly chromium: string;
  readonly benchmarkIndex: BenchmarkIndexSummary;
  readonly webgl: WebglMeta;
  readonly git: { readonly sha: string };
}

interface WebglObservation {
  readonly available: boolean;
  readonly renderer: string | null;
  readonly vendor: string | null;
}

const DATA_URL = 'data:text/html,<canvas></canvas>';
const BENCHMARK_RUNS = 3;
const LOCAL_PATH_TOKEN = '<local-path>';
const RUNNER_HOME_TOKEN = '<runner-home>';
const ABSOLUTE_PATH_PATTERN =
  /(?:file:\/\/\/[^\s"',]+|[A-Za-z]:\\[^\s"',]+|\/(?:Users|home|private|tmp|var|opt|Applications|Volumes)\/[^\s"',]+)/g;

const require = createRequire(import.meta.url);
const lighthousePageFunctions = require('lighthouse/core/lib/page-functions.js') as {
  pageFunctions: { computeBenchmarkIndex: () => number };
};

const usage = `Usage: pnpm perf:host [--gl swiftshader] [--out file]

Records the harness Chromium, benchmark index, WebGL backend, runner identity, and git SHA.`;

function exitCodeTable(): string {
  return Object.entries(EXIT)
    .map(([name, code]) => `${code} ${EXIT_DESCRIPTIONS[name as keyof typeof EXIT]}`)
    .join('\n');
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function finite(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function replaceKnownPath(value: string, path: string | undefined, token: string): string {
  if (!path || path === '/') return value;
  return value.replace(new RegExp(escapeRegExp(path), 'g'), token);
}

export function sanitizeHostValue(value: string, env: NodeJS.ProcessEnv = process.env): string {
  const onRunner = env.CI === 'true' || env.GITHUB_ACTIONS === 'true';
  let sanitized = value;

  sanitized = replaceKnownPath(sanitized, env.RUNNER_WORKSPACE, RUNNER_HOME_TOKEN);
  sanitized = replaceKnownPath(
    sanitized,
    env.HOME,
    onRunner ? RUNNER_HOME_TOKEN : LOCAL_PATH_TOKEN,
  );
  sanitized = sanitized.replace(ABSOLUTE_PATH_PATTERN, LOCAL_PATH_TOKEN);
  return sanitized;
}

export function hostAttemptId(env: NodeJS.ProcessEnv = process.env): string {
  const runId = env.GITHUB_RUN_ID?.trim();
  const runAttempt = env.GITHUB_RUN_ATTEMPT?.trim();
  const shard = env.SHARD?.trim();

  return runId && runAttempt && shard ? `${runId}-${runAttempt}-s${shard}` : 'local';
}

function vendorSlug(vendor: string | null): string {
  return (vendor ?? '')
    .toLowerCase()
    .replace(/\b(?:inc|corp|corporation|ltd|llc)\b\.?/g, '')
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function angleVendor(renderer: string | null, vendor: string | null): string {
  const match = /ANGLE\s*\(([^,)]+)/i.exec(renderer ?? '');
  return vendorSlug(match?.[1] ?? vendor) || 'unknown';
}

export function classifyWebgl(observation: WebglObservation): WebglMeta {
  if (!observation.available) {
    return { available: false, renderer: null, vendor: null, backend: 'none' };
  }

  const renderer = observation.renderer;
  const vendor = observation.vendor;
  const backendText = `${vendor ?? ''} ${renderer ?? ''}`;
  let backend: WebglBackend;

  if (/swiftshader/i.test(backendText)) {
    backend = 'swiftshader';
  } else {
    backend = `angle-${angleVendor(renderer, vendor)}` as const;
  }

  return { available: true, renderer, vendor, backend };
}

export function summariseBenchmarkIndex(values: readonly number[]): BenchmarkIndexSummary {
  if (values.length === 0 || values.some((value) => !finite(value))) {
    throw new CliError(EXIT.INTERNAL, 'benchmark index requires finite samples');
  }

  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  const median =
    sorted.length % 2 === 1
      ? (sorted[middle] ?? 0)
      : ((sorted[middle - 1] ?? 0) + (sorted[middle] ?? 0)) / 2;

  return { min: sorted[0] ?? 0, median, max: sorted.at(-1) ?? 0 };
}

export function parseHostMeta(raw: string): HostMeta {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new CliError(EXIT.UNREACHABLE, 'invalid host meta JSON');
  }

  if (!isRecord(parsed)) throw new CliError(EXIT.UNREACHABLE, 'invalid host meta');

  const benchmarkIndex = parsed.benchmarkIndex;
  const webgl = parsed.webgl;
  const git = parsed.git;
  const backend = isRecord(webgl) ? webgl.backend : null;
  const validBackend =
    backend === 'swiftshader' ||
    backend === 'none' ||
    (typeof backend === 'string' && /^angle-[a-z0-9-]+$/.test(backend));

  if (
    typeof parsed.attemptId !== 'string' ||
    typeof parsed.runnerName !== 'string' ||
    typeof parsed.imageVersion !== 'string' ||
    typeof parsed.chromium !== 'string' ||
    !isRecord(benchmarkIndex) ||
    !finite(benchmarkIndex.min) ||
    !finite(benchmarkIndex.median) ||
    !finite(benchmarkIndex.max) ||
    !isRecord(webgl) ||
    typeof webgl.available !== 'boolean' ||
    (webgl.renderer !== null && typeof webgl.renderer !== 'string') ||
    (webgl.vendor !== null && typeof webgl.vendor !== 'string') ||
    !validBackend ||
    !isRecord(git) ||
    typeof git.sha !== 'string'
  ) {
    throw new CliError(EXIT.UNREACHABLE, 'invalid host meta');
  }

  return parsed as unknown as HostMeta;
}

async function readWebgl(page: Page): Promise<WebglMeta> {
  const observation = await page.evaluate((): WebglObservation => {
    const canvas = document.createElement('canvas');
    let context: WebGLRenderingContext | WebGL2RenderingContext | null = null;
    try {
      context = canvas.getContext('webgl2') ?? canvas.getContext('webgl');
    } catch {
      return { available: false, renderer: null, vendor: null };
    }

    if (context === null) return { available: false, renderer: null, vendor: null };

    const debug = context.getExtension('WEBGL_debug_renderer_info');
    const parameter = (name: number): string | null => {
      try {
        const value = context.getParameter(name) as unknown;
        return typeof value === 'string' ? value : null;
      } catch {
        return null;
      }
    };

    return {
      available: true,
      renderer: parameter(debug?.UNMASKED_RENDERER_WEBGL ?? context.RENDERER),
      vendor: parameter(debug?.UNMASKED_VENDOR_WEBGL ?? context.VENDOR),
    };
  });

  return classifyWebgl(observation);
}

function gitSha(env: NodeJS.ProcessEnv): string {
  const supplied = env.GITHUB_SHA?.trim();
  if (supplied) return supplied;

  try {
    return execFileSync('git', ['rev-parse', 'HEAD'], {
      cwd: process.cwd(),
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return 'unknown';
  }
}

export async function collectHostMeta(
  opts: { gl?: 'swiftshader'; env?: NodeJS.ProcessEnv } = {},
): Promise<HostMeta> {
  const env = opts.env ?? process.env;
  const browser = await launch({
    args:
      opts.gl === 'swiftshader'
        ? ['--use-angle=swiftshader', '--enable-unsafe-swiftshader']
        : undefined,
  });

  try {
    const context = await browser.newContext();
    try {
      const page = await context.newPage();
      await page.goto('about:blank');
      await page.goto(DATA_URL);

      const samples: number[] = [];
      for (let sample = 0; sample < BENCHMARK_RUNS; sample += 1) {
        samples.push(
          await page.evaluate(
            lighthousePageFunctions.pageFunctions.computeBenchmarkIndex as () => number,
          ),
        );
      }

      const webgl = await readWebgl(page);
      return {
        attemptId: hostAttemptId(env),
        runnerName: sanitizeHostValue(env.RUNNER_NAME?.trim() || 'local', env),
        imageVersion: sanitizeHostValue((env.ImageVersion ?? env.ImageOS ?? 'local').trim(), env),
        chromium: chromiumVersion(browser),
        benchmarkIndex: summariseBenchmarkIndex(samples),
        webgl: {
          ...webgl,
          renderer: webgl.renderer === null ? null : sanitizeHostValue(webgl.renderer, env),
          vendor: webgl.vendor === null ? null : sanitizeHostValue(webgl.vendor, env),
        },
        git: { sha: gitSha(env) },
      };
    } finally {
      await context.close();
    }
  } finally {
    await browser.close();
  }
}

function defaultOut(): string {
  const stamp = new Date().toISOString().slice(0, 19).replace(/\D/g, '');
  return resolve('.evidence', `${stamp}-host-meta.json`);
}

export async function main(argv: string[]): Promise<number> {
  const { values } = parseCli<HostMetaArgs>(argv, {
    options: {
      out: { type: 'string' },
      gl: { type: 'string' },
      help: { type: 'boolean' },
    },
    allowPositionals: false,
  });

  if (values.help) {
    console.log(`${usage}\n\nExit codes:\n${exitCodeTable()}`);
    return EXIT.OK;
  }

  if (values.gl !== undefined && values.gl !== 'swiftshader') {
    throw new CliError(EXIT.USAGE, `--gl must be swiftshader: ${values.gl}`);
  }

  const gl = values.gl === 'swiftshader' ? 'swiftshader' : undefined;
  const meta = await collectHostMeta({ gl });
  const out = values.out ?? defaultOut();
  await mkdir(dirname(out), { recursive: true });
  await writeFile(out, `${JSON.stringify(meta, null, 2)}\n`);

  console.log(`benchmarkIndex: ${meta.benchmarkIndex.median}`);
  console.log(`webgl: ${meta.webgl.backend} ${meta.webgl.renderer ?? 'unavailable'}`);
  console.log(`wrote: ${out}`);
  return EXIT.OK;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  await run(main);
}
