import { describe, expect, test } from 'vitest';

import {
  buildIdOf,
  normalizeBuildId,
  diffBundleManifests,
  type BundleFile,
  type BundleManifest,
} from '../src/bundle-manifest.ts';

function manifest(files: BundleFile[], scripts: string[] = []): BundleManifest {
  return {
    kind: 'bundle-manifest',
    version: 1,
    files,
    routes: [{ route: '/', html: 'index.html', scripts }],
    totalJsBytes: files.reduce((total, file) => total + file.bytes, 0),
  };
}

function file(path: string, bytes: number, sha256 = `${path}:${bytes}`): BundleFile {
  return { path, bytes, sha256 };
}

describe('diffBundleManifests', () => {
  test('reports an added JS file and fails without a byte delta', () => {
    const diff = diffBundleManifests(
      manifest([file('_next/static/app.js', 100)]),
      manifest([file('_next/static/app.js', 100), file('_next/static/new.js', 0)]),
    );

    expect(diff.addedFiles.map((entry) => entry.path)).toEqual(['_next/static/new.js']);
    expect(diff.bytesDelta).toBe(0);
    expect(diff.pass).toBe(false);
  });

  test('reports a removed JS file without failing when total bytes do not grow', () => {
    const diff = diffBundleManifests(
      manifest([file('_next/static/app.js', 100), file('_next/static/old.js', 25)]),
      manifest([file('_next/static/app.js', 100)]),
    );

    expect(diff.removedFiles.map((entry) => entry.path)).toEqual(['_next/static/old.js']);
    expect(diff.bytesDelta).toBe(-25);
    expect(diff.pass).toBe(true);
  });

  test('reports a grown JS file and fails when total bytes grow', () => {
    const diff = diffBundleManifests(
      manifest([file('_next/static/app.js', 100)]),
      manifest([file('_next/static/app.js', 125)]),
    );

    expect(diff.grownFiles).toEqual([
      expect.objectContaining({
        path: '_next/static/app.js',
        verdict: 'grown',
        beforeBytes: 100,
        afterBytes: 125,
        bytesDelta: 25,
      }),
    ]);
    expect(diff.pass).toBe(false);
  });

  test('fails when a route gains a script even if total JS bytes shrink', () => {
    const diff = diffBundleManifests(
      manifest([file('_next/static/app.js', 100)]),
      manifest(
        [file('_next/static/app.js', 100), file('_next/static/extra.js', 0)],
        ['/_next/static/extra.js'],
      ),
    );

    expect(diff.addedScripts).toEqual([
      {
        route: '/',
        html: 'index.html',
        script: '/_next/static/extra.js',
        verdict: 'added',
      },
    ]);
    expect(diff.pass).toBe(false);
  });

  test('passes identical manifests and reports a same-size hash change', () => {
    const before = manifest([file('_next/static/app.js', 100, 'before')]);
    const identical = diffBundleManifests(before, before);
    const rewritten = diffBundleManifests(
      before,
      manifest([file('_next/static/app.js', 100, 'after')]),
    );

    expect(identical.pass).toBe(true);
    expect(identical.files[0]!.verdict).toBe('unchanged');
    expect(rewritten.pass).toBe(true);
    expect(rewritten.files[0]!.verdict).toBe('changed');
  });
});

describe('build id normalization', () => {
  test('replaces the build-id directory so manifests from two builds compare', () => {
    const paths = ['_next/static/chunks/a.js', '_next/static/abc123/_buildManifest.js'];
    const buildId = buildIdOf(paths);

    expect(buildId).toBe('abc123');
    expect(normalizeBuildId('_next/static/abc123/_ssgManifest.js', buildId)).toBe(
      '_next/static/<build-id>/_ssgManifest.js',
    );
    expect(normalizeBuildId('_next/static/chunks/a.js', buildId)).toBe('_next/static/chunks/a.js');
  });
});
