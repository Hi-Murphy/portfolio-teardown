import { createHash } from 'node:crypto';
import { readdir, readFile, stat } from 'node:fs/promises';
import { relative, resolve, sep } from 'node:path';

export interface BundleFile {
  readonly path: string;
  readonly bytes: number;
  readonly sha256: string;
}

export interface BundleRoute {
  readonly route: string;
  readonly html: string;
  readonly scripts: readonly string[];
}

export interface BundleManifest {
  readonly kind: 'bundle-manifest';
  readonly version: 1;
  readonly files: readonly BundleFile[];
  readonly routes: readonly BundleRoute[];
  readonly totalJsBytes: number;
}

export type BundleFileVerdict = 'added' | 'removed' | 'grown' | 'shrunk' | 'changed' | 'unchanged';

export interface BundleFileDiff {
  readonly path: string;
  readonly verdict: BundleFileVerdict;
  readonly beforeBytes: number | null;
  readonly afterBytes: number | null;
  readonly bytesDelta: number;
  readonly beforeSha256: string | null;
  readonly afterSha256: string | null;
}

export interface BundleScriptDiff {
  readonly route: string;
  readonly html: string;
  readonly script: string;
  readonly verdict: 'added' | 'removed';
}

export interface BundleManifestDiff {
  readonly beforeTotalBytes: number;
  readonly afterTotalBytes: number;
  readonly bytesDelta: number;
  readonly files: readonly BundleFileDiff[];
  readonly scripts: readonly BundleScriptDiff[];
  readonly addedFiles: readonly BundleFileDiff[];
  readonly removedFiles: readonly BundleFileDiff[];
  readonly grownFiles: readonly BundleFileDiff[];
  readonly addedScripts: readonly BundleScriptDiff[];
  readonly removedScripts: readonly BundleScriptDiff[];
  readonly pass: boolean;
}

function toPosix(path: string): string {
  return path.split(sep).join('/');
}

function normalizeRelative(root: string, path: string): string {
  return toPosix(relative(root, path));
}

async function filesBelow(root: string, extension: string): Promise<string[]> {
  const found: string[] = [];

  async function walk(directory: string): Promise<void> {
    const entries = await readdir(directory, { withFileTypes: true });
    entries.sort((left, right) => left.name.localeCompare(right.name));

    for (const entry of entries) {
      const path = resolve(directory, entry.name);
      if (entry.isDirectory()) {
        await walk(path);
      } else if (entry.isFile() && entry.name.endsWith(extension)) {
        found.push(path);
      }
    }
  }

  await walk(root);
  return found;
}

export function routeForHtml(html: string): string {
  const withoutExtension = html.slice(0, -'.html'.length);
  if (withoutExtension === 'index') return '/';
  if (withoutExtension.endsWith('/index')) return `/${withoutExtension.slice(0, -'/index'.length)}`;
  return `/${withoutExtension}`;
}

function decodeAttribute(value: string): string {
  return value
    .replaceAll('&amp;', '&')
    .replaceAll('&quot;', '"')
    .replaceAll('&#39;', "'")
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>');
}

export function scriptSources(html: string): string[] {
  const scripts: string[] = [];
  const tags = html.matchAll(/<script\b[^>]*>/gi);

  for (const tag of tags) {
    const src = /\bsrc\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/i.exec(tag[0]);
    const value = src?.[1] ?? src?.[2] ?? src?.[3];
    if (value !== undefined && value !== '') scripts.push(decodeAttribute(value));
  }

  return [...new Set(scripts)];
}

export const BUILD_ID_PLACEHOLDER = '<build-id>';

// Next writes _buildManifest.js under _next/static/<buildId>/. Local builds get a random build id, so the
// segment is replaced with a placeholder to make manifests from different builds comparable.
export function buildIdOf(paths: readonly string[]): string | undefined {
  const manifest = paths.find((path) => path.endsWith('/_buildManifest.js'));

  return manifest?.split('/').at(-2);
}

export function normalizeBuildId(path: string, buildId: string | undefined): string {
  if (buildId === undefined) return path;

  return path.replace(`_next/static/${buildId}/`, `_next/static/${BUILD_ID_PLACEHOLDER}/`);
}

export async function createBundleManifest(outDir: string): Promise<BundleManifest> {
  const root = resolve(outDir);
  const staticDir = resolve(root, '_next', 'static');
  const jsFiles = await filesBelow(staticDir, '.js');
  const buildId = buildIdOf(jsFiles.map((path) => normalizeRelative(root, path)));
  const files: BundleFile[] = [];

  for (const path of jsFiles) {
    const [contents, details] = await Promise.all([readFile(path), stat(path)]);
    files.push({
      path: normalizeBuildId(normalizeRelative(root, path), buildId),
      bytes: details.size,
      sha256: createHash('sha256').update(contents).digest('hex'),
    });
  }

  const htmlFiles = await filesBelow(root, '.html');
  const routes: BundleRoute[] = [];
  for (const path of htmlFiles) {
    const html = normalizeRelative(root, path);
    routes.push({
      route: routeForHtml(html),
      html,
      scripts: scriptSources(await readFile(path, 'utf8')).map((script) =>
        normalizeBuildId(script, buildId),
      ),
    });
  }

  const totalJsBytes = files.reduce((total, file) => total + file.bytes, 0);
  return { kind: 'bundle-manifest', version: 1, files, routes, totalJsBytes };
}

function fileDiff(before: BundleFile | undefined, after: BundleFile | undefined): BundleFileDiff {
  const beforeBytes = before?.bytes ?? null;
  const afterBytes = after?.bytes ?? null;
  const bytesDelta = (afterBytes ?? 0) - (beforeBytes ?? 0);
  let verdict: BundleFileVerdict;

  if (before === undefined) {
    verdict = 'added';
  } else if (after === undefined) {
    verdict = 'removed';
  } else if (after.bytes > before.bytes) {
    verdict = 'grown';
  } else if (after.bytes < before.bytes) {
    verdict = 'shrunk';
  } else if (after.sha256 !== before.sha256) {
    verdict = 'changed';
  } else {
    verdict = 'unchanged';
  }

  return {
    path: after?.path ?? before?.path ?? '',
    verdict,
    beforeBytes,
    afterBytes,
    bytesDelta,
    beforeSha256: before?.sha256 ?? null,
    afterSha256: after?.sha256 ?? null,
  };
}

function compareScripts(
  beforeRoutes: ReadonlyMap<string, BundleRoute>,
  afterRoutes: ReadonlyMap<string, BundleRoute>,
): BundleScriptDiff[] {
  const differences: BundleScriptDiff[] = [];
  const routeNames = [...new Set([...beforeRoutes.keys(), ...afterRoutes.keys()])].sort();

  for (const route of routeNames) {
    const before = beforeRoutes.get(route);
    const after = afterRoutes.get(route);
    const beforeScripts = new Set(before?.scripts ?? []);
    const afterScripts = new Set(after?.scripts ?? []);
    const html = after?.html ?? before?.html ?? route;

    for (const script of afterScripts) {
      if (!beforeScripts.has(script)) {
        differences.push({ route, html, script, verdict: 'added' });
      }
    }
    for (const script of beforeScripts) {
      if (!afterScripts.has(script)) {
        differences.push({ route, html, script, verdict: 'removed' });
      }
    }
  }

  return differences;
}

export function diffBundleManifests(
  before: BundleManifest,
  after: BundleManifest,
): BundleManifestDiff {
  const beforeFiles = new Map(before.files.map((file) => [file.path, file]));
  const afterFiles = new Map(after.files.map((file) => [file.path, file]));
  const paths = [...new Set([...beforeFiles.keys(), ...afterFiles.keys()])].sort();
  const files = paths.map((path) => fileDiff(beforeFiles.get(path), afterFiles.get(path)));
  const scripts = compareScripts(
    new Map(before.routes.map((route) => [route.route, route])),
    new Map(after.routes.map((route) => [route.route, route])),
  );
  const addedFiles = files.filter((file) => file.verdict === 'added');
  const removedFiles = files.filter((file) => file.verdict === 'removed');
  const grownFiles = files.filter((file) => file.verdict === 'grown');
  const addedScripts = scripts.filter((script) => script.verdict === 'added');
  const removedScripts = scripts.filter((script) => script.verdict === 'removed');
  const bytesDelta = after.totalJsBytes - before.totalJsBytes;

  return {
    beforeTotalBytes: before.totalJsBytes,
    afterTotalBytes: after.totalJsBytes,
    bytesDelta,
    files,
    scripts,
    addedFiles,
    removedFiles,
    grownFiles,
    addedScripts,
    removedScripts,
    pass: addedFiles.length === 0 && addedScripts.length === 0 && bytesDelta <= 0,
  };
}

function signed(value: number): string {
  return value > 0 ? `+${value}` : String(value);
}

export function formatBundleManifestDiff(diff: BundleManifestDiff): string {
  const lines = [
    `TOTAL-JS ${diff.beforeTotalBytes} -> ${diff.afterTotalBytes} (${signed(diff.bytesDelta)})`,
  ];

  for (const file of diff.files) {
    if (file.verdict === 'unchanged') continue;
    if (file.verdict === 'added') {
      lines.push(`ADDED-JS ${file.path} bytes=${file.afterBytes}`);
    } else if (file.verdict === 'removed') {
      lines.push(`REMOVED-JS ${file.path} bytes=${file.beforeBytes}`);
    } else if (file.verdict === 'changed') {
      lines.push(`CHANGED-JS ${file.path} bytes=${file.afterBytes}`);
    } else {
      lines.push(
        `${file.verdict.toUpperCase()}-JS ${file.path} ${file.beforeBytes} -> ${file.afterBytes} (${signed(file.bytesDelta)})`,
      );
    }
  }

  for (const script of diff.scripts) {
    lines.push(`${script.verdict.toUpperCase()}-SCRIPT ${script.route} ${script.script}`);
  }

  lines.push(diff.pass ? 'DIFF-PASS' : 'DIFF-FAIL');
  return `${lines.join('\n')}\n`;
}
