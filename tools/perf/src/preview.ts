import { CliError, EXIT } from './exit-codes.ts';

export type FetchLike = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;

export interface GhResponse {
  data: unknown;
  headers: Headers;
}

export interface Gh {
  readonly repo: string;
  get(path: string): Promise<GhResponse>;
}

export interface PollOptions {
  timeoutMs?: number;
  intervalMs?: number;
  fetchImpl?: FetchLike;
}

export interface ResolvePreviewOptions {
  repo: string;
  pr: number;
  sha: string;
  token: string;
  project?: string;
  gh?: Gh;
  fetchImpl?: FetchLike;
  statusWait?: PollOptions;
  shaWait?: PollOptions;
  skipShaCheck?: boolean;
}

interface VercelStatus {
  context: string;
  state: string;
}

interface IssueComment {
  body: string;
  createdAt: string;
  login: string;
}

const DEFAULT_STATUS_TIMEOUT_MS = 12 * 60_000;
const DEFAULT_STATUS_INTERVAL_MS = 10_000;
const DEFAULT_SHA_TIMEOUT_MS = 3 * 60_000;
const DEFAULT_SHA_INTERVAL_MS = 10_000;
const GITHUB_API = 'https://api.github.com';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isVercelPreviewHost(hostname: string): boolean {
  return hostname === 'vercel.app' || hostname.endsWith('.vercel.app');
}

function normalizePreviewUrl(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const withProtocol = /^[a-z][a-z\d+.-]*:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;

  try {
    const url = new URL(withProtocol);
    if (url.protocol !== 'https:' || url.username || url.password || url.port) return null;
    if (!isVercelPreviewHost(url.hostname)) return null;
    return url.href;
  } catch {
    return null;
  }
}

function previewFromPayload(body: string, project: string): string | null {
  const match = body.match(/^\[vc\]: #[^\s:]+:([A-Za-z\d+/=]+)\s*$/m);
  if (!match?.[1]) return null;

  let decoded: unknown;
  try {
    decoded = JSON.parse(Buffer.from(match[1], 'base64').toString('utf8')) as unknown;
  } catch {
    return null;
  }

  if (!isRecord(decoded) || !Array.isArray(decoded.projects)) return null;
  for (const candidate of decoded.projects) {
    if (!isRecord(candidate) || candidate.name !== project) continue;
    if (typeof candidate.previewUrl !== 'string') return null;
    return normalizePreviewUrl(candidate.previewUrl);
  }

  return null;
}

export function parseVercelComment(body: string, project: string): string | null {
  const fromPayload = previewFromPayload(body, project);
  if (fromPayload) return fromPayload;

  const link = body.match(/\]\((https:\/\/[^)\s]+\.vercel\.app(?:\/[^)\s]*)?)\)/i);
  return link?.[1] ? normalizePreviewUrl(link[1]) : null;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolveSleep) => {
    setTimeout(resolveSleep, ms);
  });
}

function nextLink(header: string | null): string | null {
  if (!header) return null;
  for (const part of header.split(',')) {
    if (!/;\s*rel="next"/i.test(part)) continue;
    const match = part.match(/<([^>]+)>/);
    if (match?.[1]) return match[1];
  }
  return null;
}

export function createGh(repo: string, token: string, fetchImpl: FetchLike = fetch): Gh {
  return {
    repo,
    async get(path: string): Promise<GhResponse> {
      let response: Response;
      try {
        response = await fetchImpl(new URL(path, GITHUB_API), {
          headers: {
            Accept: 'application/vnd.github+json',
            Authorization: `Bearer ${token}`,
            'X-GitHub-Api-Version': '2022-11-28',
          },
          signal: AbortSignal.timeout(30_000),
        });
      } catch (error) {
        const detail = error instanceof Error ? error.message : String(error);
        throw new CliError(EXIT.UNREACHABLE, `GitHub API request failed: ${detail}`);
      }

      if (!response.ok) {
        await response.body?.cancel();
        throw new CliError(EXIT.UNREACHABLE, `GitHub API returned HTTP ${response.status}`);
      }

      let data: unknown;
      try {
        data = (await response.json()) as unknown;
      } catch {
        throw new CliError(EXIT.UNREACHABLE, 'GitHub API returned invalid JSON');
      }

      return { data, headers: response.headers };
    },
  };
}

function statusesFrom(data: unknown): VercelStatus[] {
  if (!Array.isArray(data)) {
    throw new CliError(EXIT.UNREACHABLE, 'GitHub status response was not an array');
  }

  return data.flatMap((item): VercelStatus[] => {
    if (!isRecord(item) || item.context !== 'Vercel' || typeof item.state !== 'string') {
      return [];
    }
    return [{ context: item.context, state: item.state }];
  });
}

export async function waitForVercelStatus(
  gh: Gh,
  sha: string,
  options: PollOptions = {},
): Promise<void> {
  const timeoutMs = options.timeoutMs ?? DEFAULT_STATUS_TIMEOUT_MS;
  const intervalMs = options.intervalMs ?? DEFAULT_STATUS_INTERVAL_MS;
  const deadline = Date.now() + timeoutMs;

  for (;;) {
    const response = await gh.get(
      `/repos/${gh.repo}/commits/${encodeURIComponent(sha)}/statuses?per_page=100`,
    );
    const vercel = statusesFrom(response.data)[0];

    if (vercel?.state === 'success') return;
    if (vercel?.state === 'failure' || vercel?.state === 'error') {
      throw new CliError(EXIT.UNREACHABLE, `Vercel deployment failed for ${sha}: ${vercel.state}`);
    }

    const remaining = deadline - Date.now();
    if (remaining <= 0) {
      const observed = vercel ? vercel.state : 'missing';
      throw new CliError(
        EXIT.UNREACHABLE,
        `timed out waiting for Vercel status for ${sha} (last: ${observed})`,
      );
    }

    await sleep(Math.min(intervalMs, remaining));
  }
}

export async function waitForSha(url: URL, sha: string, options: PollOptions = {}): Promise<void> {
  const timeoutMs = options.timeoutMs ?? DEFAULT_SHA_TIMEOUT_MS;
  const intervalMs = options.intervalMs ?? DEFAULT_SHA_INTERVAL_MS;
  const fetchImpl = options.fetchImpl ?? fetch;
  const deadline = Date.now() + timeoutMs;
  let lastDetail = 'no response';

  for (;;) {
    const remaining = deadline - Date.now();
    if (remaining <= 0) {
      throw new CliError(
        EXIT.UNREACHABLE,
        `timed out waiting for build ${sha} at ${url.href} (last: ${lastDetail})`,
      );
    }

    try {
      const response = await fetchImpl(url, {
        redirect: 'follow',
        headers: { 'cache-control': 'no-cache', pragma: 'no-cache' },
        signal: AbortSignal.timeout(Math.max(1, Math.min(30_000, remaining))),
      });
      const body = await response.text();
      lastDetail = `HTTP ${response.status}`;
      if (response.ok && body.includes(sha)) return;
    } catch (error) {
      lastDetail = error instanceof Error ? error.message : String(error);
    }

    const nextRemaining = deadline - Date.now();
    if (nextRemaining <= 0) {
      throw new CliError(
        EXIT.UNREACHABLE,
        `timed out waiting for build ${sha} at ${url.href} (last: ${lastDetail})`,
      );
    }
    await sleep(Math.min(intervalMs, nextRemaining));
  }
}

function commentsFrom(data: unknown): IssueComment[] {
  if (!Array.isArray(data)) {
    throw new CliError(EXIT.UNREACHABLE, 'GitHub comments response was not an array');
  }

  return data.flatMap((item): IssueComment[] => {
    if (
      !isRecord(item) ||
      typeof item.body !== 'string' ||
      typeof item.created_at !== 'string' ||
      !isRecord(item.user) ||
      typeof item.user.login !== 'string'
    ) {
      return [];
    }
    return [{ body: item.body, createdAt: item.created_at, login: item.user.login }];
  });
}

async function newestVercelComment(gh: Gh, pr: number): Promise<IssueComment | null> {
  const comments: IssueComment[] = [];
  let path: string | null = `/repos/${gh.repo}/issues/${pr}/comments?per_page=100`;

  for (let page = 0; path && page < 100; page += 1) {
    const response = await gh.get(path);
    comments.push(...commentsFrom(response.data));
    path = nextLink(response.headers.get('link'));
  }

  const vercelComments = comments.filter((comment) => comment.login === 'vercel[bot]');
  vercelComments.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  return vercelComments[0] ?? null;
}

export async function resolvePreviewUrl(options: ResolvePreviewOptions): Promise<URL> {
  const project = options.project ?? 'portfolio-teardown';
  const gh = options.gh ?? createGh(options.repo, options.token, options.fetchImpl);

  await waitForVercelStatus(gh, options.sha, options.statusWait);

  const comment = await newestVercelComment(gh, options.pr);
  if (!comment) {
    throw new CliError(EXIT.UNREACHABLE, `no vercel[bot] comment found for PR #${options.pr}`);
  }

  const preview = parseVercelComment(comment.body, project);
  if (!preview) {
    throw new CliError(
      EXIT.UNREACHABLE,
      `no ${project} preview URL found in the newest vercel[bot] comment for PR #${options.pr}`,
    );
  }

  const url = new URL(preview);
  if (!options.skipShaCheck) {
    await waitForSha(url, options.sha, {
      ...options.shaWait,
      fetchImpl: options.shaWait?.fetchImpl ?? options.fetchImpl,
    });
  }
  return url;
}

export async function assertFixtureAbsent(url: URL, fetchImpl: FetchLike = fetch): Promise<void> {
  let response: Response;
  try {
    response = await fetchImpl(url, {
      redirect: 'follow',
      headers: { 'cache-control': 'no-cache', pragma: 'no-cache' },
      signal: AbortSignal.timeout(30_000),
    });
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new CliError(EXIT.UNREACHABLE, `unreachable: ${url.href}: ${detail}`);
  }

  const body = await response.text();
  const hasFixtureMarker = body.includes('data-perf-fixture');
  if (response.status === 404 && !hasFixtureMarker) return;

  throw new CliError(
    EXIT.BUDGET,
    `fixture route is not absent: ${url.href} returned HTTP ${response.status}` +
      (hasFixtureMarker ? ' and contained data-perf-fixture' : ''),
  );
}
