import type { NextConfig } from 'next';
import { PHASE_DEVELOPMENT_SERVER } from 'next/constants';

const DEFAULT_PAGE_EXTENSIONS = ['tsx', 'ts', 'jsx', 'js'];

export default function nextConfig(phase: string): NextConfig {
  const fixtureBuild = process.env.PERF_FIXTURES === '1';

  if (fixtureBuild && process.env.VERCEL) {
    throw new Error('PERF_FIXTURES must never be set on Vercel');
  }

  const fixtures = phase === PHASE_DEVELOPMENT_SERVER || fixtureBuild;

  return {
    output: 'export',
    images: { unoptimized: true },
    reactStrictMode: true,
    transpilePackages: ['xploder'],
    generateBuildId: async () => process.env.VERCEL_GIT_COMMIT_SHA ?? null,
    pageExtensions: fixtures
      ? [...DEFAULT_PAGE_EXTENSIONS, 'fixture.tsx']
      : DEFAULT_PAGE_EXTENSIONS,
    ...(fixtureBuild ? { distDir: '../../out-fixtures' } : {}),
  };
}
