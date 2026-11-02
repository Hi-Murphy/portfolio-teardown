import { afterEach, describe, expect, test, vi } from 'vitest';

import { absoluteUrl, resolveSiteUrl, SITE_ORIGIN, SiteUrlError } from '../seo/site-url';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('resolveSiteUrl', () => {
  test('SITE_URL wins and is normalized to an origin', () => {
    expect(resolveSiteUrl({ SITE_URL: 'https://hi-murphy.me/' })).toBe('https://hi-murphy.me');
    expect(resolveSiteUrl({ SITE_URL: 'https://hi-murphy.me/x' })).toBe('https://hi-murphy.me');
    expect(
      resolveSiteUrl({
        SITE_URL: 'https://hi-murphy.me/projects/',
        VERCEL_ENV: 'preview',
        VERCEL_URL: 'preview.vercel.app',
      }),
    ).toBe('https://hi-murphy.me');
  });

  test('HTTP is accepted only for localhost', () => {
    expect(resolveSiteUrl({ SITE_URL: 'http://localhost:4000/path' })).toBe(
      'http://localhost:4000',
    );
    expect(() => resolveSiteUrl({ SITE_URL: 'http://hi-murphy.me' })).toThrow(SiteUrlError);
  });

  test('production uses the Vercel production hostname', () => {
    expect(
      resolveSiteUrl({
        VERCEL_ENV: 'production',
        VERCEL_PROJECT_PRODUCTION_URL: 'portfolio.example.com',
        VERCEL_URL: 'preview.example.com',
      }),
    ).toBe('https://portfolio.example.com');
  });

  test.each(['preview', 'development'])('%s uses the Vercel deployment hostname', (vercelEnv) => {
    expect(
      resolveSiteUrl({
        VERCEL_ENV: vercelEnv,
        VERCEL_URL: 'preview.example.com',
      }),
    ).toBe('https://preview.example.com');
  });

  test('falls back to localhost and warns when no URL source is set', () => {
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    expect(resolveSiteUrl({})).toBe('http://localhost:3000');
    expect(warning).toHaveBeenCalledTimes(1);
    expect(warning.mock.calls[0]?.[0]).toContain('http://localhost:3000');
  });

  test('throws when Vercel resolves to localhost', () => {
    expect(() => resolveSiteUrl({ VERCEL: '1' })).toThrow(SiteUrlError);
    expect(() => resolveSiteUrl({ VERCEL: '1', SITE_URL: 'http://localhost:3000' })).toThrow(
      SiteUrlError,
    );
  });

  test('throws when production resolves to the preview deployment URL', () => {
    expect(() =>
      resolveSiteUrl({
        VERCEL_ENV: 'production',
        VERCEL_PROJECT_PRODUCTION_URL: 'preview.example.com',
        VERCEL_URL: 'preview.example.com',
      }),
    ).toThrow(SiteUrlError);
  });
});

describe('absoluteUrl', () => {
  test('returns the bare origin for home (Next's canonical form)', () => {
    expect(absoluteUrl('/')).toBe(SITE_ORIGIN);
  });

  test('returns canonical route URLs without a trailing slash', () => {
    expect(absoluteUrl('/projects')).toBe(`${SITE_ORIGIN}/projects`);
    expect(absoluteUrl('/projects/')).toBe(`${SITE_ORIGIN}/projects`);
  });

  test('rejects a path without a leading slash', () => {
    expect(() => absoluteUrl('projects')).toThrow(SiteUrlError);
  });
});
