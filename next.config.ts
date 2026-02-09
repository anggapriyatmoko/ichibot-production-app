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
  /* config options here */
};

export default nextConfig;

