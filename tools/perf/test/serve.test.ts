import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { request as httpRequest, type IncomingHttpHeaders } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { gunzipSync } from 'node:zlib';

import { afterAll, beforeAll, describe, expect, test } from 'vitest';

import { serveDir, type ServedDir } from '../src/serve.ts';

interface Response {
  status: number;
  headers: IncomingHttpHeaders;
  body: Buffer;
}

let dir: string;
let serving: ServedDir;

async function get(
  path: string,
  options: { method?: string; headers?: Record<string, string> } = {},
): Promise<Response> {
  return await new Promise<Response>((resolveResponse, reject) => {
    const req = httpRequest(
      {
        hostname: serving.url.hostname,
        port: Number(serving.url.port),
        path,
        method: options.method ?? 'GET',
        headers: options.headers,
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on('data', (chunk: Buffer | string) => {
          chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        });
        res.on('end', () => {
          resolveResponse({
            status: res.statusCode ?? 0,
            headers: res.headers,
            body: Buffer.concat(chunks),
          });
        });
      },
    );

    req.on('error', reject);
    req.end();
  });
}

beforeAll(async () => {
  dir = await mkdtemp(join(tmpdir(), 'perf-serve-'));
  await mkdir(join(dir, 'docs'), { recursive: true });
  await mkdir(join(dir, '_next', 'static', 'chunks'), { recursive: true });
  await writeFile(join(dir, 'index.html'), '<h1>home</h1>');
  await writeFile(join(dir, 'about.html'), '<h1>about</h1>');
  await writeFile(join(dir, 'docs', 'index.html'), '<h1>docs</h1>');
  await writeFile(join(dir, 'app.js'), 'console.log("app");\n');
  await writeFile(join(dir, '_next', 'static', 'chunks', 'app.js'), 'console.log("static");\n');
  await writeFile(join(dir, '404.html'), '<h1>custom not found</h1>');
  serving = await serveDir(dir);
});

afterAll(async () => {
  await serving.close();
  await rm(dir, { recursive: true, force: true });
});

describe('serveDir', () => {
  test('maps clean URLs to html files and directory indexes', async () => {
    const home = await get('/');
    expect(home.status).toBe(200);
    expect(home.body.toString()).toContain('home');

    const about = await get('/about');
    expect(about.status).toBe(200);
    expect(about.body.toString()).toContain('about');

    const docsWithSlash = await get('/docs/');
    expect(docsWithSlash.status).toBe(200);
    expect(docsWithSlash.body.toString()).toContain('docs');

    const docsWithoutSlash = await get('/docs');
    expect(docsWithoutSlash.status).toBe(200);
    expect(docsWithoutSlash.body.toString()).toContain('docs');
  });

  test('returns a 404 with the custom 404 page when present', async () => {
    const response = await get('/missing');
    expect(response.status).toBe(404);
    expect(response.body.toString()).toContain('custom not found');
  });

  test('gzips compressible responses and reports the encoding on HEAD', async () => {
    const response = await get('/app.js', { headers: { 'Accept-Encoding': 'gzip' } });
    expect(response.status).toBe(200);
    expect(response.headers['content-encoding']).toBe('gzip');
    expect(response.headers.vary).toBe('Accept-Encoding');
    expect(gunzipSync(response.body).toString()).toBe('console.log("app");\n');

    const head = await get('/', {
      method: 'HEAD',
      headers: { 'Accept-Encoding': 'gzip' },
    });
    expect(head.status).toBe(200);
    expect(head.headers['content-encoding']).toBe('gzip');
    expect(head.body.byteLength).toBe(0);
  });

  test('sets immutable cache headers only under /_next/static', async () => {
    const staticAsset = await get('/_next/static/chunks/app.js');
    expect(staticAsset.headers['cache-control']).toBe('public, max-age=31536000, immutable');

    const app = await get('/app.js');
    expect(app.headers['cache-control']).toBe('public, max-age=0, must-revalidate');
  });

  test('rejects path traversal', async () => {
    const plain = await get('/../package.json');
    expect(plain.status).toBe(403);

    const encoded = await get('/%2e%2e/package.json');
    expect(encoded.status).toBe(403);
  });
});
