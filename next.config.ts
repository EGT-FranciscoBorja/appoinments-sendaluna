import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'cdn.responsibletravelsa.com',
        pathname: '/mail/**',
      },
      {
        protocol: 'https',
        hostname: 'cdn.responsibletravelsa.com',
        pathname: '/assets/logos/**',
      },
    ],
  },
};

export default nextConfig;

initOpenNextCloudflareForDev();
