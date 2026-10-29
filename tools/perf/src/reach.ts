import { CliError, EXIT } from './exit-codes.ts';

export interface ReachResult {
  status: number;
  finalUrl: string;
}

export async function assertReachable(url: URL): Promise<ReachResult> {
  let response: Response;

  try {
    response = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
      signal: AbortSignal.timeout(30_000),
    });
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new CliError(EXIT.UNREACHABLE, `unreachable: ${url.href}: ${detail}`);
  }

  try {
    await response.body?.cancel();
  } catch {
    // The status is already known; a cancelled body has no bearing on reachability.
  }

  if (response.status >= 400) {
    throw new CliError(
      EXIT.UNREACHABLE,
      `unreachable: ${url.href} returned HTTP ${response.status}`,
    );
  }

  return {
    status: response.status,
    finalUrl: response.url || url.href,
  };
}
