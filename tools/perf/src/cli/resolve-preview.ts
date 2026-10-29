import { appendFile } from 'node:fs/promises';

import { parseCli, parseUrl } from '../args.ts';
import { CliError, EXIT, EXIT_DESCRIPTIONS } from '../exit-codes.ts';
import { run } from '../log.ts';
import { createGh, resolvePreviewUrl, waitForSha, waitForVercelStatus } from '../preview.ts';

interface ResolveArgs {
  values: {
    repo?: string;
    pr?: string;
    sha?: string;
    project?: string;
    production?: boolean;
    url?: string;
    'skip-sha-check'?: boolean;
    help?: boolean;
  };
  positionals: string[];
}

const usage = `Usage:
  resolve-preview.ts --repo <owner/repo> --pr <number> --sha <sha> [--project <name>]
  resolve-preview.ts --production --url <url> --sha <sha> [--repo <owner/repo>]

Resolves a Vercel preview URL for a pull request, or checks the production URL for a
specific build. The GitHub token is read from GITHUB_TOKEN and is never printed.

Options:
  --repo <owner/repo>   repository (default: GITHUB_REPOSITORY)
  --pr <number>         pull request number (preview mode)
  --sha <sha>           full 40-character commit SHA to verify
  --project <name>      Vercel project name (default: portfolio-teardown)
  --production          check --url instead of resolving a PR comment
  --url <url>           deployed production URL (production mode)
  --skip-sha-check      TEST ONLY: accept a preview built before build-id support
  --help                show this help`;

function exitCodeTable(): string {
  return Object.entries(EXIT)
    .map(([name, code]) => `${code} ${EXIT_DESCRIPTIONS[name as keyof typeof EXIT]}`)
    .join('\n');
}

function parseSha(raw: string | undefined): string {
  const sha = raw?.trim();
  if (!sha || !/^[a-f\d]{40}$/i.test(sha)) {
    throw new CliError(EXIT.USAGE, '--sha must be a full 40-character hexadecimal SHA');
  }
  return sha;
}

function parsePr(raw: string | undefined): number {
  if (!raw || !/^[1-9]\d*$/.test(raw)) {
    throw new CliError(EXIT.USAGE, '--pr must be a positive integer');
  }
  return Number(raw);
}

function parseRepo(raw: string | undefined): string {
  const repo = raw?.trim() ?? process.env.GITHUB_REPOSITORY?.trim();
  if (!repo || !/^[A-Za-z\d_.-]+\/[A-Za-z\d_.-]+$/.test(repo)) {
    throw new CliError(EXIT.USAGE, '--repo is required (or set GITHUB_REPOSITORY)');
  }
  return repo;
}

async function emitUrl(url: URL): Promise<void> {
  const output = `url=${url.href}`;
  const outputFile = process.env.GITHUB_OUTPUT;
  if (outputFile) {
    await appendFile(outputFile, `${output}\n`, 'utf8');
  } else {
    console.log(output);
  }
}

export async function main(argv: string[]): Promise<number> {
  const { values } = parseCli<ResolveArgs>(argv, {
    options: {
      repo: { type: 'string' },
      pr: { type: 'string' },
      sha: { type: 'string' },
      project: { type: 'string' },
      production: { type: 'boolean' },
      url: { type: 'string' },
      'skip-sha-check': { type: 'boolean' },
      help: { type: 'boolean' },
    },
    allowPositionals: false,
  });

  if (values.help) {
    console.log(`${usage}\n\nExit codes:\n${exitCodeTable()}`);
    return EXIT.OK;
  }

  const sha = parseSha(values.sha);
  const repo = parseRepo(values.repo);
  const token = process.env.GITHUB_TOKEN?.trim();
  if (!token) {
    throw new CliError(EXIT.USAGE, 'GITHUB_TOKEN is required');
  }

  if (values['skip-sha-check']) {
    console.error('warning: --skip-sha-check is test-only and is forbidden in perf.yml');
  }

  let url: URL;
  if (values.production) {
    if (!values.url) {
      throw new CliError(EXIT.USAGE, '--production requires --url');
    }
    url = parseUrl(values.url);
    const gh = createGh(repo, token);
    await waitForVercelStatus(gh, sha);
    if (!values['skip-sha-check']) await waitForSha(url, sha);
  } else {
    if (!values.pr) {
      throw new CliError(EXIT.USAGE, 'preview mode requires --pr');
    }
    if (values.url) {
      throw new CliError(EXIT.USAGE, '--url is only valid with --production');
    }
    url = await resolvePreviewUrl({
      repo,
      pr: parsePr(values.pr),
      sha,
      token,
      project: values.project,
      skipShaCheck: values['skip-sha-check'] ?? false,
    });
  }

  await emitUrl(url);
  return EXIT.OK;
}

await run(main);
