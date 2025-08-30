import type { NextConfig } from "next";

// @ts-ignore - next-pwa does&apos;t have TypeScript definitions
const withPWA = require('next-pwa');

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
      {
        protocol: 'https',
        hostname: 'mvvbnuzqngloikfyzjya.supabase.co',
        pathname: '/storage/v1/object/public/**',
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
  // Turbopack configuration (moved from experimental as it's now stable)
  turbopack: {
    // Disable Turbopack for development if it causes issues
    rules: {},
  },

};

// Only apply PWA in production to avoid Turbopack conflicts
const config = process.env.NODE_ENV === 'production' 
  ? withPWA({
      dest: 'public',
      register: true,
      skipWaiting: true,
      disable: false,
    })(nextConfig)
  : nextConfig;

export default config;
