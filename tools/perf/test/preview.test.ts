import { existsSync, readFileSync } from 'node:fs';

import { describe, expect, test, vi } from 'vitest';

import { CliError, EXIT } from '../src/exit-codes.ts';
import {
  assertFixtureAbsent,
  parseVercelComment,
  resolvePreviewUrl,
  waitForSha,
  waitForVercelStatus,
  type FetchLike,
  type Gh,
} from '../src/preview.ts';

const fixture = readFileSync(new URL('./fixtures/vercel-comment.md', import.meta.url), 'utf8');
const sha = '0123456789abcdef0123456789abcdef01234567';
const previewUrl = 'https://portfolio-teardown-git-task-s02-contracts-tokens-example.vercel.app/';

function ghWith(get: Gh['get']): Gh {
  return { repo: 'example/portfolio-teardown', get };
}

async function expectExit(promise: Promise<unknown>, code: number): Promise<void> {
  try {
    await promise;
    throw new Error('expected the promise to reject');
  } catch (error) {
    expect(error).toBeInstanceOf(CliError);
    expect((error as CliError).code).toBe(code);
  }
}

describe('parseVercelComment', () => {
  test('decodes the sanitized [vc] payload for the named project', () => {
    expect(parseVercelComment(fixture, 'portfolio-teardown')).toBe(previewUrl);
    expect(parseVercelComment(fixture, 'another-project')).toBe(previewUrl);
    expect(parseVercelComment(fixture.split('\n\n')[0] ?? '', 'another-project')).toBeNull();
  });

  test('falls back to the Preview Markdown link', () => {
    const body = `Ready. [Preview](${previewUrl})`;
    expect(parseVercelComment(body, 'portfolio-teardown')).toBe(previewUrl);
  });

  test('ignores malformed payloads and non-Vercel links', () => {
    expect(parseVercelComment('[vc]: #sig:not-base64!', 'portfolio-teardown')).toBeNull();
    expect(
      parseVercelComment('[Preview](https://example.com/portfolio)', 'portfolio-teardown'),
    ).toBeNull();
  });
});

describe('waitForVercelStatus', () => {
  test('returns when the latest Vercel status is success', async () => {
    const get = vi.fn(async () => ({
      data: [{ context: 'Vercel', state: 'success' }],
      headers: new Headers(),
    }));

    await expect(
      waitForVercelStatus(ghWith(get), sha, { timeoutMs: 20, intervalMs: 1 }),
    ).resolves.toBeUndefined();
    expect(get).toHaveBeenCalledOnce();
  });

  test('maps failure and timeout to UNREACHABLE', async () => {
    const failed = ghWith(async () => ({
      data: [{ context: 'Vercel', state: 'failure' }],
      headers: new Headers(),
    }));
    await expectExit(
      waitForVercelStatus(failed, sha, { timeoutMs: 20, intervalMs: 1 }),
      EXIT.UNREACHABLE,
    );

    const pending = ghWith(async () => ({
      data: [{ context: 'Vercel', state: 'pending' }],
      headers: new Headers(),
    }));
    await expectExit(
      waitForVercelStatus(pending, sha, { timeoutMs: 2, intervalMs: 1 }),
      EXIT.UNREACHABLE,
    );
  });
});

describe('waitForSha', () => {
  test('polls until the deployed HTML contains the requested build SHA', async () => {
    const fetchImpl = vi
      .fn<FetchLike>()
      .mockResolvedValueOnce(new Response('<html>old build</html>'))
      .mockResolvedValueOnce(new Response(`<html>${sha}</html>`));

    await expect(
      waitForSha(new URL(previewUrl), sha, { timeoutMs: 100, intervalMs: 1, fetchImpl }),
    ).resolves.toBeUndefined();
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  test('maps a stale build to UNREACHABLE on timeout', async () => {
    const fetchImpl: FetchLike = async () => new Response('<html>old build</html>');
    await expectExit(
      waitForSha(new URL(previewUrl), sha, { timeoutMs: 2, intervalMs: 1, fetchImpl }),
      EXIT.UNREACHABLE,
    );
  });
});

describe('resolvePreviewUrl', () => {
  test('resolves the newest vercel[bot] comment and verifies the deploy SHA', async () => {
    const get = vi.fn(async (path: string) => {
      if (path.includes('/statuses')) {
        return {
          data: [{ context: 'Vercel', state: 'success' }],
          headers: new Headers(),
        };
      }
      if (path.includes('/comments')) {
        return {
          data: [
            {
              body: '[Preview](https://older-example.vercel.app)',
              created_at: '2026-10-29T04:00:00Z',
              user: { login: 'vercel[bot]' },
            },
            {
              body: fixture,
              created_at: '2026-10-29T05:00:00Z',
              user: { login: 'vercel[bot]' },
            },
          ],
          headers: new Headers(),
        };
      }
      throw new Error(`unexpected GitHub path: ${path}`);
    });
    const fetchImpl: FetchLike = async () => new Response(`<html>${sha}</html>`);

    await expect(
      resolvePreviewUrl({
        repo: 'example/portfolio-teardown',
        pr: 2,
        sha,
        token: 'test-token',
        gh: ghWith(get),
        fetchImpl,
        statusWait: { timeoutMs: 20, intervalMs: 1 },
        shaWait: { timeoutMs: 500, intervalMs: 1 },
      }),
    ).resolves.toEqual(new URL(previewUrl));
  });

  test('the test-only skip flag omits the deployed SHA check', async () => {
    const get = vi.fn(async (path: string) => {
      if (path.includes('/statuses')) {
        return { data: [{ context: 'Vercel', state: 'success' }], headers: new Headers() };
      }
      return {
        data: [
          { body: fixture, created_at: '2026-10-29T05:00:00Z', user: { login: 'vercel[bot]' } },
        ],
        headers: new Headers(),
      };
    });
    const fetchImpl = vi.fn<FetchLike>();

    await expect(
      resolvePreviewUrl({
        repo: 'example/portfolio-teardown',
        pr: 2,
        sha,
        token: 'test-token',
        gh: ghWith(get),
        fetchImpl,
        skipShaCheck: true,
        statusWait: { timeoutMs: 20, intervalMs: 1 },
      }),
    ).resolves.toEqual(new URL(previewUrl));
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});

describe('assertFixtureAbsent', () => {
  test('accepts only a 404 without the fixture marker', async () => {
    const absent: FetchLike = async () => new Response('not found', { status: 404 });
    await expect(assertFixtureAbsent(new URL(previewUrl), absent)).resolves.toBeUndefined();
  });

  test('maps a present fixture or a non-404 response to BUDGET', async () => {
    const marker: FetchLike = async () =>
      new Response('<main data-perf-fixture="fps-calibration">', { status: 404 });
    await expectExit(assertFixtureAbsent(new URL(previewUrl), marker), EXIT.BUDGET);

    const ok: FetchLike = async () => new Response('home page', { status: 200 });
    await expectExit(assertFixtureAbsent(new URL(previewUrl), ok), EXIT.BUDGET);
  });
});

test('perf.yml never uses the test-only --skip-sha-check flag', () => {
  const workflowUrl = new URL('../../../.github/workflows/perf.yml', import.meta.url);
  const workflow = existsSync(workflowUrl) ? readFileSync(workflowUrl, 'utf8') : '';
  expect(workflow).not.toContain('--skip-sha-check');
});
