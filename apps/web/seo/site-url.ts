const LOCAL_ORIGIN = 'http://localhost:3000';

export type SiteUrlEnv = Record<string, string | undefined>;

export class SiteUrlError extends Error {
  constructor(message: string, fix: string) {
    super(`${message} ${fix}`);
    this.name = 'SiteUrlError';
  }
}

function normalizeOrigin(value: string, fix: string): string {
  let url: URL;

  try {
    url = new URL(value);
  } catch {
    throw new SiteUrlError('The site URL is not a valid absolute URL.', fix);
  }

  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    throw new SiteUrlError('The site URL must use HTTP or HTTPS.', fix);
  }

  if (url.protocol === 'http:' && url.hostname !== 'localhost') {
    throw new SiteUrlError('The site URL must use HTTPS unless the host is localhost.', fix);
  }

  return url.origin;
}

function vercelOrigin(host: string | undefined, key: string): string {
  const value = host?.trim();

  if (!value) {
    throw new SiteUrlError(
      `${key} is required for this Vercel environment.`,
      'Set the Vercel system variable or provide SITE_URL=https://example.com.',
    );
  }

  return normalizeOrigin(
    `https://${value}`,
    `Set ${key} to the Vercel deployment hostname, or provide SITE_URL=https://example.com.`,
  );
}

function assertSafeDeployment(origin: string, env: SiteUrlEnv): void {
  const isLocalhost = new URL(origin).hostname === 'localhost';

  if (env.VERCEL === '1' && isLocalhost) {
    throw new SiteUrlError(
      'A Vercel build resolved the site URL to localhost.',
      'Set SITE_URL to the public production origin.',
    );
  }

  if (env.VERCEL_ENV?.trim().toLowerCase() !== 'production' || !env.VERCEL_URL?.trim()) {
    return;
  }

  const deploymentOrigin = vercelOrigin(env.VERCEL_URL, 'VERCEL_URL');

  if (origin === deploymentOrigin) {
    throw new SiteUrlError(
      'A production build resolved the site URL to its preview deployment URL.',
      'Set VERCEL_PROJECT_PRODUCTION_URL to the production domain or set SITE_URL explicitly.',
    );
  }
}

export function resolveSiteUrl(env: SiteUrlEnv): string {
  const siteUrl = env.SITE_URL?.trim();
  const vercelEnv = env.VERCEL_ENV?.trim().toLowerCase();
  let origin: string;
  let usedLocalFallback = false;

  if (siteUrl) {
    origin = normalizeOrigin(siteUrl, 'Set SITE_URL to an origin such as https://example.com.');
  } else if (vercelEnv === 'production') {
    origin = vercelOrigin(env.VERCEL_PROJECT_PRODUCTION_URL, 'VERCEL_PROJECT_PRODUCTION_URL');
  } else if (vercelEnv === 'preview' || vercelEnv === 'development') {
    origin = vercelOrigin(env.VERCEL_URL, 'VERCEL_URL');
  } else {
    origin = LOCAL_ORIGIN;
    usedLocalFallback = true;
  }

  assertSafeDeployment(origin, env);

  if (usedLocalFallback) {
    console.warn(
      `SITE_URL is not set; using ${LOCAL_ORIGIN} for this local build. Set SITE_URL=https://example.com for a public build.`,
    );
  }

  return origin;
}

export const SITE_ORIGIN = resolveSiteUrl(process.env);

export function absoluteUrl(path: string): string {
  if (!path.startsWith('/')) {
    throw new SiteUrlError(
      'absoluteUrl requires a path with a leading slash.',
      'Pass a rooted path such as /path.',
    );
  }

  // Next prints the home canonical and og:url without a trailing slash, so every self-URL uses that form.
  return `${SITE_ORIGIN}${path.replace(/\/+$/, '')}`;
}
