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
  async redirects() {
    return [
      {
        source: '/',
        destination: '/en',
        permanent: true, // set to true if this should be a permanent redirect (SEO)
      },
    ];
  },
};

export default nextConfig;
