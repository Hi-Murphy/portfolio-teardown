import { appendFile, mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { parseCli, parseUrl } from '../args.ts';
import { WEIGHT_BUDGET_BYTES } from '../budgets.ts';
import { CliError, EXIT, EXIT_DESCRIPTIONS } from '../exit-codes.ts';
import { run } from '../log.ts';
import { assertReachable } from '../reach.ts';
import {
  assertWeight,
  measureWeight,
  type ProfileName,
  type WeightProfileResult,
  type WeightReport,
} from '../weight.ts';

interface WeightArgs {
  values: {
    out?: string;
    help?: boolean;
  };
  positionals: string[];
}

const usage = `Usage: pnpm perf:weight <url> [--out <dir>]`;
const PROFILES = ['mobile', 'desktop'] as const;

function exitCodeTable(): string {
  return Object.entries(EXIT)
    .map(([name, code]) => `${code} ${EXIT_DESCRIPTIONS[name as keyof typeof EXIT]}`)
    .join('\n');
}

function stamp(date: Date): string {
  const values = [
    date.getFullYear(),
    date.getMonth() + 1,
    date.getDate(),
    date.getHours(),
    date.getMinutes(),
    date.getSeconds(),
  ].map((value) => String(value).padStart(2, '0'));

  return `${values[0]}${values[1]}${values[2]}-${values[3]}${values[4]}${values[5]}`;
}

function defaultOut(): string {
  if (process.env.CI === 'true') return join(process.cwd(), '.evidence', 'ci', 'weight');
  return join(process.cwd(), '.evidence', `${stamp(new Date())}-weight`);
}

function escapeCell(value: string): string {
  return value.replaceAll('|', '\\|');
}

function summaryMarkdown(url: URL, profiles: Record<ProfileName, WeightProfileResult>): string {
  const lines = [
    '## Weight budget',
    '',
    `URL: ${url.href}`,
    `Budget: ${WEIGHT_BUDGET_BYTES} bytes per profile (strict <)`,
    '',
    '| Profile | Measured | Budget | Pass |',
    '| --- | ---: | ---: | --- |',
  ];

  for (const profile of PROFILES) {
    const result = profiles[profile];
    lines.push(
      `| ${profile} | ${result.totalBytes} B | ${WEIGHT_BUDGET_BYTES} B | ${result.pass ? 'yes' : 'no'} |`,
    );
  }

  for (const profile of PROFILES) {
    lines.push(
      '',
      `### ${profile[0]?.toUpperCase()}${profile.slice(1)} top requests`,
      '',
      '| # | Request | Type | Bytes | Origin |',
      '| ---: | --- | --- | ---: | --- |',
    );

    profiles[profile].top.slice(0, 5).forEach((request, index) => {
      lines.push(
        `| ${index + 1} | ${escapeCell(request.url)} | ${request.type} | ${request.bytes} | ${request.thirdParty ? 'third' : 'first'} |`,
      );
    });
  }

  return `${lines.join('\n')}\n`;
}

function printProfile(name: ProfileName, result: WeightProfileResult): void {
  console.log(
    `${name}: ${result.totalBytes} bytes, ${result.requests} requests, ${result.pass ? 'PASS' : 'FAIL'}`,
  );
  for (const request of result.top.slice(0, 5)) {
    console.log(`  ${request.bytes} B  ${request.type}  ${request.url}`);
  }
}

export async function main(argv: string[]): Promise<number> {
  const parsed = parseCli<WeightArgs>(argv, {
    options: {
      out: { type: 'string' },
      help: { type: 'boolean' },
    },
    allowPositionals: true,
  });

  if (parsed.values.help) {
    console.log(`${usage}\n\nExit codes:\n${exitCodeTable()}`);
    return EXIT.OK;
  }

  if (parsed.positionals.length !== 1) {
    throw new CliError(EXIT.USAGE, 'expected exactly one URL');
  }

  const url = parseUrl(parsed.positionals[0]);
  const out = parsed.values.out ?? defaultOut();

  await assertReachable(url);

  const profiles = {} as Record<ProfileName, WeightProfileResult>;
  for (const profile of PROFILES) {
    profiles[profile] = await measureWeight(url, profile);
  }

  const report: WeightReport = {
    kind: 'weight',
    version: 1,
    url: url.href,
    budgetBytes: WEIGHT_BUDGET_BYTES,
    profiles,
    pass: PROFILES.every((profile) => profiles[profile].pass),
  };

  await mkdir(out, { recursive: true });
  const artifact = join(out, 'weight.json');
  await writeFile(artifact, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

  for (const profile of PROFILES) printProfile(profile, profiles[profile]);
  console.log(`pass: ${report.pass}`);
  console.log(`weight.json: ${artifact}`);

  const assertions = assertWeight(report);
  if (assertions.some((assertion) => !assertion.pass)) {
    console.error(`over budget: ${WEIGHT_BUDGET_BYTES} bytes per profile`);
  }

  const stepSummary = process.env.GITHUB_STEP_SUMMARY;
  if (stepSummary) {
    await appendFile(stepSummary, summaryMarkdown(url, profiles), 'utf8');
  }

  return report.pass ? EXIT.OK : EXIT.BUDGET;
}

await run(main);
