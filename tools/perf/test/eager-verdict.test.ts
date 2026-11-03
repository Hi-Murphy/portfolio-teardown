import { spawn } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, test } from 'vitest';

import type { LighthouseSummary } from '../src/lighthouse.ts';

const cli = fileURLToPath(new URL('../src/cli/eager-verdict.ts', import.meta.url));
const passFixture = new URL('./fixtures/eager-verdict-summary-pass.json', import.meta.url);
const slowFixture = new URL('./fixtures/eager-verdict-summary-slow.json', import.meta.url);

interface CliResult {
  code: number | null;
  stdout: string;
  stderr: string;
}

function runCli(args: string[]): Promise<CliResult> {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [cli, ...args], { cwd: process.cwd() });
    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (chunk: Buffer) => {
      stdout += chunk.toString();
    });
    child.stderr.on('data', (chunk: Buffer) => {
      stderr += chunk.toString();
    });
    child.on('close', (code) => {
      resolve({ code, stdout, stderr });
    });
  });
}

async function fixture(url: URL): Promise<LighthouseSummary> {
  return JSON.parse(await readFile(url, 'utf8')) as LighthouseSummary;
}

async function writeSummaries(
  root: string,
  override?: (build: string, route: string, summary: LighthouseSummary, invocation: number) => void,
): Promise<void> {
  const pass = await fixture(passFixture);

  for (const build of ['gated', 'eager']) {
    for (const route of ['home', 'project']) {
      for (const invocation of [1, 2]) {
        const summary = structuredClone(pass);
        override?.(build, route, summary, invocation);

        const dir = join(root, `${build}-${route}-r${invocation}`);
        await mkdir(dir, { recursive: true });
        await writeFile(join(dir, 'lighthouse-summary.json'), `${JSON.stringify(summary)}\n`);
      }
    }
  }
}

describe('eager-verdict', () => {
  test('prints every run, both medians, and the AC6 pass verdict', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'eager-verdict-'));

    try {
      await writeSummaries(dir);
      const result = await runCli(['--dir', dir]);

      expect(result.code).toBe(0);
      expect(result.stderr).toBe('');
      expect(result.stdout).toContain('| r1-1 | 0.9 | 10 | 1000 | 0 | 3000 |');
      expect(result.stdout).toContain('| r1 median | 0.96 | 40 | 1100 | 0 | 3200 |');
      expect(result.stdout).toContain('| r2 median | 0.96 | 40 | 1100 | 0 | 3200 |');
      expect(result.stdout).toContain('| two-invocation median | 0.96 | 40 | 1100 | 0 | 3200 |');
      expect(result.stdout).toContain('Median runs: r1 #2, r2 #2.');
      expect(result.stdout).toMatch(/\*\*Verdict:\*\* recommend retiring D-19\n$/);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  test('keeps the gate when an eager route exceeds 200 ms TBT', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'eager-verdict-'));

    try {
      await writeSummaries(dir);
      const result = await runCli(['--dir', dir]);
      expect(result.stdout).toMatch(/\*\*Verdict:\*\* recommend retiring D-19\n$/);

      const slow = await fixture(slowFixture);
      for (const invocation of [1, 2]) {
        const target = join(dir, `eager-project-r${invocation}`, 'lighthouse-summary.json');
        await writeFile(target, `${JSON.stringify(slow)}\n`);
      }

      const kept = await runCli(['--dir', dir]);
      expect(kept.code).toBe(0);
      expect(kept.stdout).toMatch(/\*\*Verdict:\*\* keep the gate\n$/);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  test('keeps the gate when an eager route scores below 0.95', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'eager-verdict-'));

    try {
      await writeSummaries(dir, (build, route, summary) => {
        if (build !== 'eager' || route !== 'home') return;
        for (const summaryRun of summary.runs) summaryRun.performance = 0.9;
      });
      const result = await runCli(['--dir', dir]);

      expect(result.code).toBe(0);
      expect(result.stdout).toMatch(/\*\*Verdict:\*\* keep the gate\n$/);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  test('prints the five longest long tasks per build and route', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'eager-verdict-'));

    try {
      await writeSummaries(dir, (build, route, summary, invocation) => {
        if (build !== 'eager' || route !== 'project') return;
        summary.runs[0]!.longTasks = [
          {
            url: `http://127.0.0.1:4320/_next/static/chunks/r${invocation}-first.js`,
            startMs: 100,
            durMs: invocation === 1 ? 120 : 110,
          },
          {
            url: `http://127.0.0.1:4320/_next/static/chunks/r${invocation}-second.js`,
            startMs: 200,
            durMs: invocation === 1 ? 100 : 90,
          },
        ];
        summary.runs[1]!.longTasks = [
          {
            url: `http://127.0.0.1:4320/_next/static/chunks/r${invocation}-third.js`,
            startMs: 300,
            durMs: invocation === 1 ? 80 : 70,
          },
          {
            url: `http://127.0.0.1:4320/_next/static/chunks/r${invocation}-fourth.js`,
            startMs: 400,
            durMs: invocation === 1 ? 60 : 50,
          },
        ];
        summary.runs[2]!.longTasks = [
          {
            url: `http://127.0.0.1:4320/_next/static/chunks/r${invocation}-fifth.js`,
            startMs: 500,
            durMs: invocation === 1 ? 40 : 30,
          },
        ];
      });

      const result = await runCli(['--dir', dir]);
      const section = result.stdout.split('## eager / project')[1]?.split('**Verdict:**')[0];

      expect(result.code).toBe(0);
      expect(section).toContain(
        [
          '| r1-1 | r1-first.js | 100 | 120 |',
          '| r2-1 | r2-first.js | 100 | 110 |',
          '| r1-1 | r1-second.js | 200 | 100 |',
          '| r2-1 | r2-second.js | 200 | 90 |',
          '| r1-2 | r1-third.js | 300 | 80 |',
        ].join('\n'),
      );
      expect(section).not.toContain('r2-third.js');
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  test('accepts an eager-only artifact directory', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'eager-verdict-'));

    try {
      await writeSummaries(dir);
      for (const route of ['home', 'project']) {
        for (const invocation of [1, 2]) {
          await rm(join(dir, `gated-${route}-r${invocation}`), { recursive: true, force: true });
        }
      }

      const result = await runCli(['--dir', dir]);

      expect(result.code).toBe(0);
      expect(result.stdout).toContain('## eager / home');
      expect(result.stdout).toContain('## eager / project');
      expect(result.stdout).not.toContain('## gated /');
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  test('exits 3 when the artifact directory has no summaries', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'eager-verdict-'));

    try {
      const result = await runCli(['--dir', dir]);
      expect(result.code).toBe(3);
      expect(result.stderr).toContain('error: no Lighthouse summaries found under:');
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
