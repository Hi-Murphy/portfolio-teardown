import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterAll, beforeAll, describe, expect, test } from 'vitest';

import { CliError, EXIT } from '../src/exit-codes.ts';
import { assertReachable } from '../src/reach.ts';
import { serveDir, type ServedDir } from '../src/serve.ts';

let dir: string;
let serving: ServedDir;

beforeAll(async () => {
  dir = await mkdtemp(join(tmpdir(), 'perf-reach-'));
  await writeFile(join(dir, 'index.html'), '<h1>reachable</h1>');
  serving = await serveDir(dir);
});

afterAll(async () => {
  await serving.close();
  await rm(dir, { recursive: true, force: true });
});

describe('assertReachable', () => {
  test('returns the status and final URL for a 200 response', async () => {
    await expect(assertReachable(serving.url)).resolves.toEqual({
      status: 200,
      finalUrl: serving.url.href,
    });
  });

  test('maps a 404 to UNREACHABLE', async () => {
    try {
      await assertReachable(new URL('/missing', serving.url));
      throw new Error('expected assertReachable to fail');
    } catch (error) {
      expect(error).toBeInstanceOf(CliError);
      expect((error as CliError).code).toBe(EXIT.UNREACHABLE);
    }
  });

  test('maps a closed port to UNREACHABLE', async () => {
    const closed = await serveDir(dir);
    const closedUrl = closed.url;
    await closed.close();

    try {
      await assertReachable(closedUrl);
      throw new Error('expected assertReachable to fail');
    } catch (error) {
      expect(error).toBeInstanceOf(CliError);
      expect((error as CliError).code).toBe(EXIT.UNREACHABLE);
    }
  });
});
