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
        // Prevent stale JS bundles: HTML pages must always revalidate
        // This fixes "Failed to find Server Action" after redeployment
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
          {
            key: 'Cache-Control',
            value: 'no-store, must-revalidate',
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

