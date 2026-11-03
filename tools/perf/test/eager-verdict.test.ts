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
  override?: (build: string, route: string, summary: LighthouseSummary) => void,
): Promise<void> {
  const pass = await fixture(passFixture);

  for (const build of ['gated', 'eager']) {
    for (const route of ['home', 'project']) {
      for (const invocation of [1, 2]) {
        const summary = structuredClone(pass);
        override?.(build, route, summary);

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
