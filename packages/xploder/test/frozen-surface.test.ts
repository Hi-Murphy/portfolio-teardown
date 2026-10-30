import { describe, expect, test } from 'vitest';

import manifestJson from './frozen-surface.manifest.json';

interface FrozenSurfaceManifest {
  readonly base: string;
  readonly note: string;
  readonly files: Readonly<Record<string, string>>;
}

const REQUIRED_FILES = [
  'src/schema/project.ts',
  'src/motion/index.ts',
  'src/engine/camera.ts',
  'src/react/scene/CameraRig.tsx',
  'test/scene.test.tsx',
] as const;

type RawImportMeta = ImportMeta & {
  glob(
    pattern: string,
    options: { query: '?raw'; import: 'default'; eager: true },
  ): Record<string, string>;
};

function normalizePath(path: string): string {
  const segments: string[] = [];

  for (const segment of path.split('/')) {
    if (!segment || segment === '.') continue;
    if (segment === '..') segments.pop();
    else segments.push(segment);
  }

  return segments.join('/');
}

function under(directory: string, path: string): string {
  const normalized = normalizePath(path);

  return normalized.startsWith(`${directory}/`) ? normalized : `${directory}/${normalized}`;
}

const packageFiles = Object.entries(
  (import.meta as RawImportMeta).glob('../package.json', {
    query: '?raw',
    import: 'default',
    eager: true,
  }),
).map(([path, contents]) => [normalizePath(path), contents] as const);
const sourceFiles = Object.entries(
  (import.meta as RawImportMeta).glob('../src/**/*', {
    query: '?raw',
    import: 'default',
    eager: true,
  }),
).map(([path, contents]) => [under('src', path), contents] as const);
const testFiles = Object.entries(
  (import.meta as RawImportMeta).glob('../test/**/*', {
    query: '?raw',
    import: 'default',
    eager: true,
  }),
).map(([path, contents]) => [under('test', path), contents] as const);
const snapshotFiles = Object.entries(
  (import.meta as RawImportMeta).glob('../test/__snapshots__/*.snap', {
    query: '?raw',
    import: 'default',
    eager: true,
  }),
).map(([path, contents]) => [under('test', path), contents] as const);
const rawFiles = Object.fromEntries([
  ...packageFiles,
  ...sourceFiles,
  ...testFiles,
  ...snapshotFiles,
]);
async function sha256(contents: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(contents));

  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

describe('frozen S2/S4 surface', () => {
  test('matches every hash recorded from the base commit', async () => {
    const manifest = manifestJson as FrozenSurfaceManifest;
    const entries = Object.entries(manifest.files);

    expect(manifest.base).toBe('53b2b2b');
    expect(manifest.note).toBe(
      'S05 freeze (RFC D1/R5). A later slice that changes a listed file regenerates this manifest in the same diff and states why.',
    );
    expect(entries.length).toBeGreaterThanOrEqual(40);

    for (const path of REQUIRED_FILES) {
      expect(manifest.files).toHaveProperty(path);
    }

    for (const [path, expected] of entries) {
      const workingCopy = rawFiles[path];

      if (workingCopy === undefined) throw new Error(`Missing working copy for ${path}`);

      expect(await sha256(workingCopy), path).toBe(expected);
    }
  });

  test('the hash helper detects a one-byte change', async () => {
    const before = new TextEncoder().encode('frozen-surface');
    const after = before.slice();

    after[0] = (after[0] ?? 0) ^ 1;

    expect(await sha256(new TextDecoder().decode(before))).not.toBe(
      await sha256(new TextDecoder().decode(after)),
    );
    expect(await sha256('abc')).toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    );
  });
});
