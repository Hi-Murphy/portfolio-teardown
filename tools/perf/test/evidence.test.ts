import { resolve } from 'node:path';

import { describe, expect, test } from 'vitest';

import {
  defaultEvidenceDir,
  EVIDENCE_ARTIFACTS,
  executeEvidenceSteps,
  evidenceExitCode,
  evidenceTimestamp,
  hostSlug,
  isEvidenceMeta,
  parseColorScheme,
  parseRuns,
  type EvidenceMeta,
} from '../src/evidence.ts';
import { CliError, EXIT } from '../src/exit-codes.ts';

function validMeta(): EvidenceMeta {
  return {
    kind: 'evidence-meta',
    version: 1,
    url: 'https://example.vercel.app/',
    finalUrl: 'https://example.vercel.app/',
    httpStatus: 200,
    startedAt: '2026-10-29T15:00:00.000Z',
    finishedAt: '2026-10-29T15:00:05.000Z',
    durationMs: 5000,
    argv: ['https://example.vercel.app/'],
    colorScheme: 'light',
    git: { sha: 'abc123', dirty: false },
    tools: {
      evidence: '0.0.0',
      lighthouse: '13.6.0',
      playwright: '1.64.1',
      chromium: '156.0.8078.4',
      node: 'v24.19.0',
      os: 'darwin',
      arch: 'arm64',
    },
    steps: [
      { name: 'screenshot-mobile', ok: true, ms: 10 },
      { name: 'screenshot-desktop', ok: true, ms: 20 },
      { name: 'lighthouse', ok: true, ms: 1000 },
    ],
    artifacts: [...EVIDENCE_ARTIFACTS],
    exitCode: 0,
  };
}

describe('default evidence directory', () => {
  test('uses a UTC timestamp and a host slug', () => {
    const url = new URL('https://Portfolio-Example.vercel.app/projects/one');
    const now = new Date('2026-10-29T15:04:05.123Z');

    expect(evidenceTimestamp(now)).toBe('20261029-150405');
    expect(hostSlug(url)).toBe('portfolio-example-vercel-app');
    expect(defaultEvidenceDir(url, now, '/tmp/workspace')).toBe(
      resolve('/tmp/workspace/.evidence/20261029-150405-portfolio-example-vercel-app'),
    );
  });

  test('keeps IP hosts and strips separators', () => {
    expect(hostSlug(new URL('http://127.0.0.1:4173/'))).toBe('127-0-0-1');
  });
});

describe('evidence options', () => {
  test('defaults to three Lighthouse runs', () => {
    expect(parseRuns(undefined)).toBe(3);
    expect(parseRuns('1')).toBe(1);

    for (const value of ['0', '-1', '1.5', 'many']) {
      try {
        parseRuns(value);
        throw new Error(`expected ${value} to fail`);
      } catch (error) {
        expect(error).toBeInstanceOf(CliError);
        expect((error as CliError).code).toBe(EXIT.USAGE);
      }
    }
  });

  test('accepts light and dark color schemes only', () => {
    expect(parseColorScheme(undefined)).toBe('light');
    expect(parseColorScheme('dark')).toBe('dark');
    expect(() => parseColorScheme('system')).toThrow(CliError);
  });
});

describe('evidence steps', () => {
  test('runs every step after a failure and reports partial evidence', async () => {
    const ran: string[] = [];
    const steps = await executeEvidenceSteps([
      {
        name: 'screenshot-mobile',
        run: () => {
          ran.push('screenshot-mobile');
          throw new Error('mobile failed');
        },
      },
      {
        name: 'screenshot-desktop',
        run: () => {
          ran.push('screenshot-desktop');
        },
      },
      {
        name: 'lighthouse',
        run: () => {
          ran.push('lighthouse');
        },
      },
    ]);

    expect(ran).toEqual(['screenshot-mobile', 'screenshot-desktop', 'lighthouse']);
    expect(steps[0]).toMatchObject({
      name: 'screenshot-mobile',
      ok: false,
      error: 'mobile failed',
    });
    expect(steps.slice(1).every((step) => step.ok)).toBe(true);
    expect(evidenceExitCode(steps)).toBe(EXIT.PARTIAL);
  });

  test('returns success when every step succeeds', async () => {
    const steps = await executeEvidenceSteps([
      { name: 'one', run: () => undefined },
      { name: 'two', run: async () => undefined },
    ]);

    expect(steps.every((step) => step.ok)).toBe(true);
    expect(evidenceExitCode(steps)).toBe(EXIT.OK);
  });
});

describe('evidence meta schema', () => {
  test('accepts the documented artifact set and metadata', () => {
    const meta = validMeta();
    expect(meta.artifacts).toEqual([...EVIDENCE_ARTIFACTS]);
    expect(isEvidenceMeta(meta)).toBe(true);
  });

  test('accepts optional git metadata being absent', () => {
    const meta = validMeta();
    delete meta.git;
    expect(isEvidenceMeta(meta)).toBe(true);
  });

  test('rejects malformed metadata', () => {
    for (const mutate of [
      (meta: Record<string, unknown>) => delete meta.steps,
      (meta: Record<string, unknown>) => {
        meta.exitCode = '0';
      },
      (meta: Record<string, unknown>) => {
        meta.artifacts = ['screenshot-mobile.png'];
      },
      (meta: Record<string, unknown>) => {
        meta.steps = [{ name: 'lighthouse', ok: 'yes', ms: 1 }];
      },
    ]) {
      const meta = validMeta() as unknown as Record<string, unknown>;
      mutate(meta);
      expect(isEvidenceMeta(meta)).toBe(false);
    }
  });
});
