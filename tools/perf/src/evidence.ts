import { execFileSync, spawnSync } from 'node:child_process';
import { constants, readFileSync } from 'node:fs';
import { access, mkdir, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { arch, platform } from 'node:os';
import { resolve } from 'node:path';

import type { Browser, Page } from 'playwright';

import { launch, PROFILES } from './browser.ts';
import { CliError, EXIT } from './exit-codes.ts';
import { runLighthouse, summarizeLighthouse, type LHR } from './lighthouse.ts';
import { assertReachable } from './reach.ts';

export const EVIDENCE_ARTIFACTS = [
  'screenshot-mobile.png',
  'screenshot-desktop.png',
  'lighthouse-summary.json',
  'lighthouse-report.json',
  'meta.json',
] as const;

const ANIMATION_CAP_MS = 2_000;
const NAVIGATION_TIMEOUT_MS = 45_000;
const NETWORK_IDLE_TIMEOUT_MS = 15_000;
const require = createRequire(import.meta.url);

export type EvidenceColorScheme = 'light' | 'dark';

export interface EvidenceStep {
  name: string;
  ok: boolean;
  ms: number;
  error?: string;
}

export interface EvidenceMeta {
  kind: 'evidence-meta';
  version: 1;
  url: string;
  finalUrl: string;
  httpStatus: number;
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  argv: string[];
  colorScheme: EvidenceColorScheme;
  git?: {
    sha: string;
    dirty: boolean;
  };
  tools: {
    evidence: string;
    lighthouse: string;
    playwright: string;
    chromium: string;
    node: string;
    os: string;
    arch: string;
  };
  steps: EvidenceStep[];
  artifacts: string[];
  exitCode: number;
}

export interface EvidenceOptions {
  outDir: string;
  runs: number;
  colorScheme: EvidenceColorScheme;
  fullPage: boolean;
  waitFor?: string;
  argv: string[];
}

export interface EvidenceResult {
  outDir: string;
  meta: EvidenceMeta;
  exitCode: number;
}

export interface EvidenceStepSpec {
  name: string;
  run: () => void | Promise<void>;
}

function stringField(value: unknown): value is string {
  return typeof value === 'string';
}

function finiteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function validStep(value: unknown): value is EvidenceStep {
  return (
    record(value) &&
    stringField(value.name) &&
    typeof value.ok === 'boolean' &&
    finiteNumber(value.ms) &&
    (value.error === undefined || stringField(value.error))
  );
}

function validGit(value: unknown): boolean {
  return record(value) && stringField(value.sha) && typeof value.dirty === 'boolean';
}

function validTools(value: unknown): boolean {
  return (
    record(value) &&
    stringField(value.evidence) &&
    stringField(value.lighthouse) &&
    stringField(value.playwright) &&
    stringField(value.chromium) &&
    stringField(value.node) &&
    stringField(value.os) &&
    stringField(value.arch)
  );
}

export function isEvidenceMeta(value: unknown): value is EvidenceMeta {
  return (
    record(value) &&
    value.kind === 'evidence-meta' &&
    value.version === 1 &&
    stringField(value.url) &&
    stringField(value.finalUrl) &&
    finiteNumber(value.httpStatus) &&
    stringField(value.startedAt) &&
    stringField(value.finishedAt) &&
    finiteNumber(value.durationMs) &&
    Array.isArray(value.argv) &&
    value.argv.every(stringField) &&
    (value.colorScheme === 'light' || value.colorScheme === 'dark') &&
    (value.git === undefined || validGit(value.git)) &&
    validTools(value.tools) &&
    Array.isArray(value.steps) &&
    value.steps.every(validStep) &&
    Array.isArray(value.artifacts) &&
    value.artifacts.length === EVIDENCE_ARTIFACTS.length &&
    value.artifacts.every((artifact, index) => artifact === EVIDENCE_ARTIFACTS[index]) &&
    Number.isInteger(value.exitCode)
  );
}

export function evidenceTimestamp(now = new Date()): string {
  const [date, time] = now.toISOString().slice(0, 19).split('T');
  return `${date?.replace(/\D/g, '')}-${time?.replace(/\D/g, '')}`;
}

export function hostSlug(url: URL): string {
  return url.hostname
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function defaultEvidenceDir(url: URL, now = new Date(), cwd = process.cwd()): string {
  return resolve(cwd, '.evidence', `${evidenceTimestamp(now)}-${hostSlug(url)}`);
}

export function parseRuns(raw: string | undefined): number {
  if (raw === undefined) {
    return 3;
  }

  const runs = Number(raw);
  if (!Number.isInteger(runs) || runs < 1) {
    throw new CliError(EXIT.USAGE, '--runs must be a positive integer');
  }

  return runs;
}

export function parseColorScheme(raw: string | undefined): EvidenceColorScheme {
  if (raw === undefined) {
    return 'light';
  }

  if (raw !== 'light' && raw !== 'dark') {
    throw new CliError(EXIT.USAGE, '--color-scheme must be light or dark');
  }

  return raw;
}

export async function executeEvidenceSteps(specs: EvidenceStepSpec[]): Promise<EvidenceStep[]> {
  const steps: EvidenceStep[] = [];

  for (const spec of specs) {
    const started = Date.now();
    try {
      await spec.run();
      steps.push({ name: spec.name, ok: true, ms: Date.now() - started });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      steps.push({ name: spec.name, ok: false, ms: Date.now() - started, error: message });
    }
  }

  return steps;
}

export function evidenceExitCode(steps: EvidenceStep[]): number {
  return steps.every((step) => step.ok) ? EXIT.OK : EXIT.PARTIAL;
}

export function outDirIsGitIgnored(outDir: string, cwd = process.cwd()): boolean {
  const result = spawnSync('git', ['check-ignore', '-q', '--', outDir], {
    cwd,
    stdio: 'ignore',
  });
  return result.status === 0;
}

function packageVersion(name: string): string {
  try {
    const manifest = JSON.parse(readFileSync(require.resolve(`${name}/package.json`), 'utf8')) as {
      version?: unknown;
    };
    return typeof manifest.version === 'string' ? manifest.version : 'unknown';
  } catch {
    return 'unknown';
  }
}

function evidenceVersion(): string {
  try {
    const manifest = JSON.parse(
      readFileSync(new URL('../package.json', import.meta.url), 'utf8'),
    ) as {
      version?: unknown;
    };
    return typeof manifest.version === 'string' ? manifest.version : 'unknown';
  } catch {
    return 'unknown';
  }
}

function gitInfo(cwd = process.cwd()): EvidenceMeta['git'] {
  try {
    const sha = execFileSync('git', ['rev-parse', 'HEAD'], {
      cwd,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
    const status = execFileSync('git', ['status', '--porcelain'], {
      cwd,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
    return { sha, dirty: status.length > 0 };
  } catch {
    return undefined;
  }
}

async function createOutputDir(outDir: string): Promise<void> {
  try {
    await mkdir(outDir, { recursive: true });
    await access(outDir, constants.W_OK);
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new CliError(EXIT.USAGE, `output directory is not writable: ${outDir}: ${detail}`);
  }
}

async function waitForAnimations(page: Page): Promise<void> {
  await page.evaluate(async (capMs) => {
    const finite = document.getAnimations().filter((animation) => {
      const timing = animation.effect?.getComputedTiming();
      return (
        timing !== undefined &&
        timing !== null &&
        typeof timing.endTime === 'number' &&
        Number.isFinite(timing.endTime)
      );
    });

    const finished = Promise.all(
      finite.map((animation) =>
        animation.finished.then(
          () => undefined,
          () => undefined,
        ),
      ),
    );
    await Promise.race([
      finished,
      new Promise<void>((resolveCap) => setTimeout(resolveCap, capMs)),
    ]);
  }, ANIMATION_CAP_MS);
}

async function waitForStablePage(page: Page, waitFor?: string): Promise<void> {
  if (waitFor) {
    await page.locator(waitFor).first().waitFor({ state: 'visible' });
  }

  await page.waitForLoadState('networkidle', { timeout: NETWORK_IDLE_TIMEOUT_MS });
  await page.evaluate(async () => {
    await document.fonts.ready;
  });
  await waitForAnimations(page);
  await page.evaluate(
    () =>
      new Promise<void>((resolveFrame) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolveFrame()));
      }),
  );
}

async function captureScreenshot(
  browser: Browser,
  url: URL,
  profileName: 'mobile' | 'desktop',
  opts: EvidenceOptions,
): Promise<{ status: number; finalUrl: string }> {
  const profile = PROFILES[profileName];
  const context = await browser.newContext({
    viewport: {
      width: profile.screenEmulation.width,
      height: profile.screenEmulation.height,
    },
    deviceScaleFactor: profile.screenEmulation.deviceScaleFactor,
    isMobile: profile.name === 'mobile',
    hasTouch: profile.name === 'mobile',
    userAgent: profile.userAgent,
    colorScheme: opts.colorScheme,
  });

  try {
    const page = await context.newPage();
    const response = await page.goto(url.href, {
      waitUntil: 'load',
      timeout: NAVIGATION_TIMEOUT_MS,
    });
    if (!response) {
      throw new Error('navigation returned no response');
    }

    await waitForStablePage(page, opts.waitFor);
    await page.screenshot({
      path: resolve(opts.outDir, `screenshot-${profileName}.png`),
      type: 'png',
      fullPage: opts.fullPage,
    });

    return { status: response.status(), finalUrl: page.url() };
  } finally {
    await context.close();
  }
}

export async function gatherEvidence(url: URL, opts: EvidenceOptions): Promise<EvidenceResult> {
  const started = Date.now();
  const startedAt = new Date(started).toISOString();
  const reach = await assertReachable(url);
  await createOutputDir(opts.outDir);

  const browser = await launch();
  let finalUrl = reach.finalUrl;
  let httpStatus = reach.status;
  let medianLhr: LHR | undefined;

  const steps = await executeEvidenceSteps([
    {
      name: 'screenshot-mobile',
      run: async () => {
        const result = await captureScreenshot(browser, url, 'mobile', opts);
        finalUrl = result.finalUrl;
        httpStatus = result.status;
      },
    },
    {
      name: 'screenshot-desktop',
      run: async () => {
        const result = await captureScreenshot(browser, url, 'desktop', opts);
        finalUrl = result.finalUrl;
        httpStatus = result.status;
      },
    },
    {
      name: 'lighthouse',
      run: async () => {
        const lhrs = await runLighthouse(url, {
          runs: opts.runs,
          categories: ['performance', 'accessibility'],
        });
        const summary = summarizeLighthouse(lhrs);
        medianLhr = lhrs[summary.medianRun];
        if (!medianLhr) {
          throw new Error(`no Lighthouse result at median index ${summary.medianRun}`);
        }

        await writeFile(
          resolve(opts.outDir, 'lighthouse-summary.json'),
          `${JSON.stringify(summary, null, 2)}\n`,
        );
        await writeFile(
          resolve(opts.outDir, 'lighthouse-report.json'),
          `${JSON.stringify(medianLhr, null, 2)}\n`,
        );
        finalUrl = summary.finalUrl || finalUrl;
      },
    },
  ]);

  const chromium = browser.version();
  await browser.close().catch(() => undefined);

  const finished = Date.now();
  const exitCode = evidenceExitCode(steps);
  const meta: EvidenceMeta = {
    kind: 'evidence-meta',
    version: 1,
    url: url.href,
    finalUrl,
    httpStatus,
    startedAt,
    finishedAt: new Date(finished).toISOString(),
    durationMs: finished - started,
    argv: opts.argv,
    colorScheme: opts.colorScheme,
    git: gitInfo(),
    tools: {
      evidence: evidenceVersion(),
      lighthouse: packageVersion('lighthouse'),
      playwright: packageVersion('playwright'),
      chromium,
      node: process.version,
      os: platform(),
      arch: arch(),
    },
    steps,
    artifacts: [...EVIDENCE_ARTIFACTS],
    exitCode,
  };

  await writeFile(resolve(opts.outDir, 'meta.json'), `${JSON.stringify(meta, null, 2)}\n`);
  return { outDir: opts.outDir, meta, exitCode };
}
