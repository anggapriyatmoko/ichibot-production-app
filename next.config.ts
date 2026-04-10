import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  experimental: {
    serverActions: {
      bodySizeLimit: '5mb', // Allow up to 5MB so our validation runs first
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'store.ichibot.id',
      },
    ],
  },
  // Prevent "Failed to find Server Action" errors after redeployment
  // by ensuring browsers don't serve stale JS bundles
  async headers() {
    return [
      {
        // HTML pages: revalidate but allow browser cache for faster navigation
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
          {
            key: 'Cache-Control',
            value: 'private, no-cache',
          },
        ],
      },
      {
        // Static assets (hashed filenames) can be cached long-term
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },
  /* config options here */
};

export default nextConfig;

