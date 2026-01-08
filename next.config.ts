import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  serverActions: {
    bodySizeLimit: '5mb', // Allow up to 5MB so our validation runs first
  },
  /* config options here */
} as NextConfig;

export default nextConfig;
