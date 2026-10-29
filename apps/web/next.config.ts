import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'export',
  images: { unoptimized: true },
  reactStrictMode: true,
  transpilePackages: ['xploder'],
  generateBuildId: async () => process.env.VERCEL_GIT_COMMIT_SHA ?? null,
};

export default nextConfig;
