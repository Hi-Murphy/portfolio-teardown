import { createHash } from 'node:crypto';
import { mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises';
import { basename, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import type { Browser, Page } from 'playwright';

import { parseCli, parseUrl } from '../args.ts';
import { chromiumVersion, freePort, launch, PROFILES } from '../browser.ts';
import { CliError, EXIT, EXIT_DESCRIPTIONS } from '../exit-codes.ts';
import { run } from '../log.ts';
import {
  compareRgba,
  decodePng,
  diffRgbaMask,
  encodeGrayscalePng,
  type RgbaImage,
} from '../png.ts';
import { serveDir, type ServedDir } from '../serve.ts';

type ParityViewport = 'mobile' | 'desktop';
type ParityColorScheme = 'light' | 'dark';
export type ParityRoute = 'home' | 'project';

interface ShotDefinition {
  readonly id: string;
  readonly route: 'home' | 'project';
  readonly path: string;
  readonly viewport: ParityViewport;
  readonly colorScheme: ParityColorScheme;
}

interface ParityShot extends ShotDefinition {
  readonly file: string;
  readonly width: number;
  readonly height: number;
  readonly pngSha256: string;
  readonly rgbaSha256: string;
}

interface ParityBaseline {
  readonly kind: 'parity-baseline';
  readonly version: 1;
  readonly chromium: string;
  readonly routes?: readonly ParityRoute[];
  readonly shots: ParityShot[];
}

interface ParityCompareShot {
  readonly id: string;
  readonly pass: boolean;
  readonly differingPixels: number | null;
  readonly baselineFile: string;
  readonly currentFile: string;
  readonly diffMaskFile: string | null;
  readonly error?: string;
}

interface ParityCompare {
  readonly kind: 'parity-compare';
  readonly version: 1;
  readonly pass: boolean;
  readonly totalDifferingPixels: number;
  readonly shots: ParityCompareShot[];
}

interface ParityArgs {
  values: {
    serve?: string;
    write?: string;
    compare?: string;
    out?: string;
    'no-engage'?: boolean;
    route?: string;
    help?: boolean;
  };
  positionals: string[];
}

const ROUTES = [
  { route: 'home', path: '/' },
  { route: 'project', path: '/projects/websocket-inspector' },
] as const;
const VIEWPORTS: readonly ParityViewport[] = ['mobile', 'desktop'];
const COLOR_SCHEMES: readonly ParityColorScheme[] = ['light', 'dark'];
const SHOTS: readonly ShotDefinition[] = ROUTES.flatMap((route) =>
  VIEWPORTS.flatMap((viewport) =>
    COLOR_SCHEMES.map((colorScheme) => ({
      id: `${route.route}-${viewport}-${colorScheme}`,
      route: route.route,
      path: route.path,
      viewport,
      colorScheme,
    })),
  ),
);

export function parityShotsForRoute(route?: ParityRoute): readonly ShotDefinition[] {
  return route === undefined ? SHOTS : SHOTS.filter((shot) => shot.route === route);
}
const NAVIGATION_TIMEOUT_MS = 45_000;
const WAIT_TIMEOUT_MS = 30_000;
const FRAME_COUNT = 2;

const usage = `Usage: pnpm perf:parity <url> | --serve <dir> (--write <dir> | --compare <dir>) [--out <dir>]

Captures the eight rest-state screenshots and compares decoded RGBA pixels.

Options:
  --serve <dir>     serve a static export on a free local port
  --write <dir>     capture the baseline PNGs and parity.json
  --compare <dir>   compare fresh captures against a baseline manifest and PNGs
  --out <dir>       comparison output directory (default: .evidence/parity-compare)
  --no-engage       capture from load only, without pointer engagement
  --route <name>    limit capture and comparison to home or project
  --help            show this help`;

function exitCodeTable(): string {
  return Object.entries(EXIT)
    .map(([name, code]) => `${code} ${EXIT_DESCRIPTIONS[name as keyof typeof EXIT]}`)
    .join('\n');
}

function sha256(data: Uint8Array | string): string {
  return createHash('sha256').update(data).digest('hex');
}

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isMissing(error: unknown): boolean {
  return (
    error instanceof Error &&
    'code' in error &&
    (error.code === 'ENOENT' || error.code === 'ENOTDIR')
  );
}

async function isDirectory(path: string): Promise<boolean> {
  try {
    return (await stat(path)).isDirectory();
  } catch {
    return false;
  }
}

async function isFile(path: string): Promise<boolean> {
  try {
    return (await stat(path)).isFile();
  } catch {
    return false;
  }
}

function parseShot(value: unknown): ParityShot {
  if (
    !record(value) ||
    typeof value.id !== 'string' ||
    (value.route !== 'home' && value.route !== 'project') ||
    typeof value.path !== 'string' ||
    (value.viewport !== 'mobile' && value.viewport !== 'desktop') ||
    (value.colorScheme !== 'light' && value.colorScheme !== 'dark') ||
    typeof value.file !== 'string' ||
    basename(value.file) !== value.file ||
    !Number.isInteger(value.width) ||
    !Number.isInteger(value.height) ||
    typeof value.pngSha256 !== 'string' ||
    typeof value.rgbaSha256 !== 'string'
  ) {
    throw new Error('invalid parity shot entry');
  }

  return value as unknown as ParityShot;
}

function parseBaseline(value: unknown): ParityBaseline {
  if (
    !record(value) ||
    value.kind !== 'parity-baseline' ||
    value.version !== 1 ||
    typeof value.chromium !== 'string' ||
    !Array.isArray(value.shots)
  ) {
    throw new Error('invalid parity baseline manifest');
  }

  return {
    kind: 'parity-baseline',
    version: 1,
    chromium: value.chromium,
    shots: value.shots.map(parseShot),
  };
}

async function loadBaseline(
  dir: string,
): Promise<{ manifestPath: string; manifest: ParityBaseline }> {
  const names = (await readdir(dir))
    .filter((name) => name.endsWith('.json') && name.toLowerCase().includes('parity'))
    .filter((name) => !name.toLowerCase().includes('compare'))
    .sort((left, right) => {
      if (left === 'parity.json') return -1;
      if (right === 'parity.json') return 1;
      return left.localeCompare(right);
    });

  for (const name of names) {
    const manifestPath = join(dir, name);
    let text: string;
    try {
      text = await readFile(manifestPath, 'utf8');
    } catch (error) {
      if (isMissing(error)) continue;
      throw error;
    }

    try {
      return { manifestPath, manifest: parseBaseline(JSON.parse(text) as unknown) };
    } catch (error) {
      if (name === 'parity.json') {
        const detail = error instanceof Error ? error.message : String(error);
        throw new CliError(EXIT.INTERNAL, `${manifestPath}: ${detail}`);
      }
    }
  }

  throw new CliError(EXIT.USAGE, `parity baseline manifest not found in ${dir}`);
}

async function resolveBaselineFile(dir: string, shot: ParityShot): Promise<string> {
  const direct = join(dir, shot.file);
  if (await isFile(direct)) return direct;

  const suffix = `screenshot-${shot.id}.png`;
  const matches = (await readdir(dir)).filter((name) => name.endsWith(suffix)).sort();
  if (matches.length === 1) return join(dir, matches[0] as string);
  if (matches.length > 1) {
    throw new CliError(EXIT.USAGE, `ambiguous baseline file for ${shot.id}: ${matches.join(', ')}`);
  }

  throw new CliError(EXIT.USAGE, `baseline PNG not found for ${shot.id}: ${shot.file}`);
}

async function waitForFrames(page: Page, count: number): Promise<void> {
  await page.evaluate(async (frameCount) => {
    for (let index = 0; index < frameCount; index += 1) {
      await new Promise<void>((resolveFrame) => {
        requestAnimationFrame(() => resolveFrame());
      });
    }
  }, count);
}

async function waitForHydration(page: Page): Promise<void> {
  await page.locator('button[aria-label^="Switch to "]').waitFor({
    state: 'visible',
    timeout: WAIT_TIMEOUT_MS,
  });
}

async function waitForRestState(page: Page, shot: ShotDefinition): Promise<void> {
  await page.locator('[data-xploder-ready="true"]').waitFor({
    state: 'attached',
    timeout: WAIT_TIMEOUT_MS,
  });
  await page.waitForFunction(
    (palette) => {
      const root = document.documentElement;
      if (!root.classList.contains(palette)) return false;

      const viewer = document.querySelector('[data-xploder-ready="true"]');
      if (viewer === null) return false;
      if (viewer.getAttribute('data-xploder-state') !== 'exploded') return false;
      if (viewer.getAttribute('data-xploder-tweening') !== 'false') return false;

      const live = document.querySelector('[data-site-live][data-site-live-state]');
      return live?.getAttribute('data-site-live-state') === 'revealed';
    },
    shot.colorScheme,
    { timeout: WAIT_TIMEOUT_MS },
  );

  await page.evaluate(async () => {
    await document.fonts.ready;
  });
  await waitForFrames(page, FRAME_COUNT);
}

async function captureShot(
  browser: Browser,
  base: URL,
  shot: ShotDefinition,
  engage: boolean,
): Promise<{ screenshot: Buffer; image: RgbaImage }> {
  const profile = PROFILES[shot.viewport];
  const context = await browser.newContext({
    viewport: {
      width: profile.screenEmulation.width,
      height: profile.screenEmulation.height,
    },
    deviceScaleFactor: profile.screenEmulation.deviceScaleFactor,
    isMobile: profile.formFactor === 'mobile',
    hasTouch: profile.formFactor === 'mobile',
    userAgent: profile.userAgent,
    colorScheme: shot.colorScheme,
    reducedMotion: 'no-preference',
  });

  try {
    const page = await context.newPage();
    page.setDefaultTimeout(WAIT_TIMEOUT_MS);

    const response = await page.goto(new URL(shot.path, base).href, {
      waitUntil: 'load',
      timeout: NAVIGATION_TIMEOUT_MS,
    });
    if (response === null) {
      throw new CliError(EXIT.UNREACHABLE, `${shot.id}: navigation returned no response`);
    }
    if (response.status() >= 400) {
      throw new CliError(EXIT.UNREACHABLE, `${shot.id}: HTTP ${response.status()}`);
    }

    await waitForHydration(page);
    // prettier-ignore
    if (engage)
    await page.mouse.move(16, 16);

    try {
      await waitForRestState(page, shot);
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      throw new CliError(EXIT.UNREACHABLE, `${shot.id}: rest state timeout: ${detail}`);
    }

    const screenshot = await page.screenshot({
      type: 'png',
      fullPage: false,
      caret: 'hide',
      animations: 'disabled',
    });
    return { screenshot, image: decodePng(screenshot) };
  } finally {
    await context.close();
  }
}

async function writeParity(
  browser: Browser,
  base: URL,
  outDir: string,
  engage: boolean,
  route?: ParityRoute,
): Promise<number> {
  await mkdir(outDir, { recursive: true });
  const shots: ParityShot[] = [];

  for (const shot of parityShotsForRoute(route)) {
    const { screenshot, image } = await captureShot(browser, base, shot, engage);
    const file = `screenshot-${shot.id}.png`;
    await writeFile(join(outDir, file), screenshot);

    shots.push({
      ...shot,
      file,
      width: image.width,
      height: image.height,
      pngSha256: sha256(screenshot),
      rgbaSha256: sha256(image.data),
    });
    console.log(`${shot.id}: ${image.width}x${image.height} ${file}`);
  }

  const manifest: ParityBaseline = {
    kind: 'parity-baseline',
    version: 1,
    chromium: chromiumVersion(browser),
    ...(route === undefined ? {} : { routes: [route] }),
    shots,
  };
  await writeFile(join(outDir, 'parity.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(`parity: WROTE ${shots.length} shots`);
  console.log(`parity: baseline ${join(outDir, 'parity.json')}`);
  return EXIT.OK;
}

async function compareParity(
  browser: Browser,
  base: URL,
  baselineDir: string,
  outDir: string,
  engage: boolean,
  route?: ParityRoute,
): Promise<number> {
  const { manifestPath, manifest } = await loadBaseline(baselineDir);
  const selectedShots = parityShotsForRoute(route);
  const expectedIds = new Set(selectedShots.map((shot) => shot.id));
  const baselineShots = new Map<string, ParityShot>();

  for (const shot of manifest.shots) {
    if (!expectedIds.has(shot.id)) continue;
    if (baselineShots.has(shot.id)) {
      throw new CliError(EXIT.USAGE, `duplicate baseline shot ${shot.id}`);
    }
    baselineShots.set(shot.id, shot);
  }
  for (const shot of selectedShots) {
    if (!baselineShots.has(shot.id)) {
      throw new CliError(EXIT.USAGE, `baseline manifest is missing ${shot.id}`);
    }
  }

  const baselines = new Map<string, { file: string; bytes: Buffer; image: RgbaImage }>();
  for (const shot of selectedShots) {
    const entry = baselineShots.get(shot.id) as ParityShot;
    const file = await resolveBaselineFile(baselineDir, entry);
    const bytes = await readFile(file);
    const image = decodePng(bytes);
    if (sha256(bytes) !== entry.pngSha256 || sha256(image.data) !== entry.rgbaSha256) {
      throw new CliError(EXIT.INTERNAL, `baseline hash mismatch for ${shot.id}: ${basename(file)}`);
    }
    baselines.set(shot.id, { file: basename(file), bytes, image });
  }

  await mkdir(outDir, { recursive: true });
  const comparisons: ParityCompareShot[] = [];
  let totalDifferingPixels = 0;

  for (const shot of selectedShots) {
    const baseline = baselines.get(shot.id);
    if (baseline === undefined) throw new Error(`missing baseline for ${shot.id}`);

    const { screenshot, image } = await captureShot(browser, base, shot, engage);
    const currentFile = `screenshot-${shot.id}.png`;
    await writeFile(join(outDir, currentFile), screenshot);

    let differingPixels: number | null = null;
    let errorMessage: string | undefined;
    let diffMaskFile: string | null = null;

    try {
      differingPixels = compareRgba(baseline.image, image);
      totalDifferingPixels += differingPixels;
      const mask = diffRgbaMask(baseline.image, image);
      diffMaskFile = `diff-${shot.id}.png`;
      await writeFile(
        join(outDir, diffMaskFile),
        encodeGrayscalePng(image.width, image.height, mask),
      );
    } catch (error) {
      errorMessage = error instanceof Error ? error.message : String(error);
    }

    const pass = errorMessage === undefined && differingPixels === 0;
    comparisons.push({
      id: shot.id,
      pass,
      differingPixels,
      baselineFile: baseline.file,
      currentFile,
      diffMaskFile,
      ...(errorMessage === undefined ? {} : { error: errorMessage }),
    });

    if (pass) {
      console.log(`${shot.id}: 0 px`);
    } else if (differingPixels !== null) {
      console.log(`${shot.id}: ${differingPixels} px`);
    } else {
      console.log(`${shot.id}: ERROR ${errorMessage ?? 'comparison failed'}`);
    }
  }

  const pass = comparisons.every((shot) => shot.pass);
  const report: ParityCompare = {
    kind: 'parity-compare',
    version: 1,
    pass,
    totalDifferingPixels,
    shots: comparisons,
  };
  await writeFile(join(outDir, 'parity-compare.json'), `${JSON.stringify(report, null, 2)}\n`);

  console.log(
    `parity: ${pass ? 'PASS' : 'FAIL'} (${comparisons.length} shots, ${totalDifferingPixels} px)`,
  );
  console.log(`parity: baseline ${basename(manifestPath)}`);
  console.log(`parity: comparison ${join(outDir, 'parity-compare.json')}`);
  return pass ? EXIT.OK : EXIT.BUDGET;
}

export async function main(argv: string[]): Promise<number> {
  const { values, positionals } = parseCli<ParityArgs>(argv, {
    options: {
      serve: { type: 'string' },
      write: { type: 'string' },
      compare: { type: 'string' },
      out: { type: 'string' },
      'no-engage': { type: 'boolean' },
      route: { type: 'string' },
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
  if ((values.write === undefined) === (values.compare === undefined)) {
    throw new CliError(EXIT.USAGE, 'provide exactly one of --write <dir> or --compare <dir>');
  }
  if (values.out !== undefined && values.compare === undefined) {
    throw new CliError(EXIT.USAGE, '--out is only valid with --compare');
  }
  if (values.route !== undefined && values.route !== 'home' && values.route !== 'project') {
    throw new CliError(EXIT.USAGE, `--route must be home or project: ${values.route}`);
  }
  const route = values.route as ParityRoute | undefined;

  let server: ServedDir | undefined;
  let base: URL;

  try {
    if (values.serve !== undefined) {
      const dir = resolve(process.cwd(), values.serve);
      if (!(await isDirectory(dir))) {
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

    const writeDir = values.write === undefined ? undefined : resolve(process.cwd(), values.write);
    const baselineDir =
      values.compare === undefined ? undefined : resolve(process.cwd(), values.compare);
    if (baselineDir !== undefined && !(await isDirectory(baselineDir))) {
      throw new CliError(EXIT.USAGE, `baseline directory not found: ${baselineDir}`);
    }

    const outDir =
      values.out ??
      (baselineDir === undefined ? undefined : join(process.cwd(), '.evidence', 'parity-compare'));
    if (baselineDir !== undefined && outDir !== undefined && resolve(outDir) === baselineDir) {
      throw new CliError(
        EXIT.USAGE,
        '--out must differ from --compare so the baseline is not overwritten',
      );
    }

    const browser = await launch();
    try {
      const engage = values['no-engage'] !== true;
      if (writeDir !== undefined) {
        return await writeParity(browser, base, writeDir, engage, route);
      }
      if (baselineDir === undefined || outDir === undefined) {
        throw new Error('missing comparison directories');
      }
      return await compareParity(browser, base, baselineDir, outDir, engage, route);
    } finally {
      await browser.close().catch(() => undefined);
    }
  } finally {
    await server?.close();
  }
}

const entrypoint = process.argv[1];
if (entrypoint !== undefined && import.meta.url === pathToFileURL(entrypoint).href) {
  await run(main);
}
