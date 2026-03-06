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

// Solo en desarrollo local / Cloudflare. En Vercel no cargar workerd (evita GLIBC_2.35).
if (process.env.VERCEL !== '1') {
  initOpenNextCloudflareForDev();
}
