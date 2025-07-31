import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com',
        pathname: '/v0/b/isha-gramotsavam.firebasestorage.app/**',
      },
      {
        protocol: 'https',
        hostname: 'storage.googleapis.com',
        pathname: '/isha-gramotsavam.firebasestorage.app/**',
      },
      {
        protocol: 'https',
        hostname: 'ishalogin.sadhguru.org',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;
