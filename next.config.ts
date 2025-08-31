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
  typescript: {
    ignoreBuildErrors: true,
  },
};

// Only apply PWA in production to avoid Turbopack conflicts
const config = process.env.NODE_ENV === 'production' 
  ? withPWA({
      dest: 'public',
      register: true,
      skipWaiting: true,
      disable: false,
      // Volunteer-focused PWA configuration
      sw: 'sw.js',
      fallbacks: {
        document: '/offline.html',
        image: '/icons/icon-192x192.png',
      },
      // Comprehensive caching strategies with background sync
      workboxOptions: {
        swDest: 'public/sw.js',
        // Import background sync functionality
        importScripts: ['/sw-background-sync.js'],
        // Don't cache everything by default - we'll be selective
        globPatterns: [
          '**/*.{js,css,html,png,svg,ico,woff,woff2}',
        ],
        modifyURLPrefix: {
          'static/': '_next/static/',
        },
        runtimeCaching: [
          // Static assets - Cache First with performance optimization
          {
            urlPattern: /^https?.*\.(png|jpe?g|webp|svg|gif|tiff|js|css)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'static-assets',
              expiration: {
                maxEntries: 150, // Increased for better cache hit rate
                maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
                purgeOnQuotaError: true, // Auto cleanup on quota errors
              },
              cacheKeyWillBeUsed: async ({ request }) => {
                // Remove query parameters for better cache efficiency
                const url = new URL(request.url);
                url.search = '';
                return url.href;
              },
              plugins: [
                {
                  cacheWillUpdate: async ({ response }) => {
                    // Only cache successful responses
                    return response.status === 200;
                  },
                },
              ],
            },
          },
          // API calls - Network First with background sync fallback
          {
            urlPattern: /^https?.*\/api\/trpc\/.*/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 5 * 60, // 5 minutes
              },
              networkTimeoutSeconds: 10,
              plugins: [
                {
                  cacheKeyWillBeUsed: async ({ request }) => {
                    // Include user context in cache key for volunteer-specific data
                    const url = new URL(request.url);
                    const userId = url.searchParams.get('userId') || 'anonymous';
                    const venueId = url.searchParams.get('venueId') || 'default';
                    return `${request.url}-${userId}-${venueId}`;
                  },
                  requestWillFetch: async ({ request }) => {
                    // Add volunteer context headers
                    const modifiedRequest = request.clone();
                    modifiedRequest.headers.set('X-Volunteer-Context', 'true');
                    return modifiedRequest;
                  },
                  fetchDidFail: async ({ originalRequest, request, error }) => {
                    // Queue failed requests for background sync
                    console.log('[SW] API call failed, queuing for background sync:', request.url);
                    
                    // Register background sync for failed API calls
                    try {
                      await self.registration.sync.register('volunteer-sync-failed-api');
                    } catch (syncError) {
                      console.error('[SW] Failed to register background sync:', syncError);
                    }
                  },
                },
              ],
            },
          },
          // Volunteer pages - Stale While Revalidate with optimization
          {
            urlPattern: /^https?.*\/volunteer\/.*/,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'volunteer-pages',
              expiration: {
                maxEntries: 30, // Increased for better coverage
                maxAgeSeconds: 24 * 60 * 60, // 24 hours
                purgeOnQuotaError: true,
              },
              plugins: [
                {
                  cacheKeyWillBeUsed: async ({ request }) => {
                    // Include volunteer context in cache key
                    const url = new URL(request.url);
                    const venueId = url.searchParams.get('venueId') || 'default';
                    const role = url.searchParams.get('role') || 'volunteer';
                    return `${url.pathname}-${venueId}-${role}`;
                  },
                },
              ],
            },
          },
          // Dashboard and critical pages - Network First with optimization
          {
            urlPattern: /^https?.*\/(dashboard|venues|teams)\/.*/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'critical-pages',
              expiration: {
                maxEntries: 50, // Increased for better coverage
                maxAgeSeconds: 2 * 60 * 60, // Increased to 2 hours for better performance
                purgeOnQuotaError: true,
              },
              networkTimeoutSeconds: 3, // Reduced timeout for faster fallback
              plugins: [
                {
                  cacheWillUpdate: async ({ response }) => {
                    // Cache successful responses and 304 not modified
                    return response.status === 200 || response.status === 304;
                  },
                  requestWillFetch: async ({ request }) => {
                    // Add cache-control headers for better caching
                    const modifiedRequest = request.clone();
                    if (request.method === 'GET') {
                      modifiedRequest.headers.set('Cache-Control', 'max-age=300'); // 5 minutes
                    }
                    return modifiedRequest;
                  },
                },
              ],
            },
          },
          // Media uploads - Cache First with intelligent sizing
          {
            urlPattern: /^https?.*\.(mp4|avi|mov|wmv|flv|webm|m4v)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'media-cache',
              expiration: {
                maxEntries: 15, // Reduced due to large file sizes
                maxAgeSeconds: 7 * 24 * 60 * 60, // 7 days
                purgeOnQuotaError: true,
              },
              plugins: [
                {
                  cacheWillUpdate: async ({ request, response }) => {
                    // Only cache successful responses and check size limits
                    if (response.status !== 200) return false;
                    
                    const contentLength = response.headers.get('content-length');
                    if (contentLength) {
                      const size = parseInt(contentLength, 10);
                      // Don't cache videos larger than 50MB
                      if (size > 50 * 1024 * 1024) return false;
                    }
                    
                    return true;
                  },
                  fetchDidFail: async ({ originalRequest }) => {
                    // Queue media for background sync if fetch fails
                    try {
                      await self.registration.sync.register('volunteer-media-sync');
                    } catch (error) {
                      console.error('[SW] Failed to register media sync:', error);
                    }
                  },
                },
              ],
            },
          },
          // Add new caching strategy for data endpoints
          {
            urlPattern: /^https?.*\/api\/data\/.*/,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'data-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 10 * 60, // 10 minutes
                purgeOnQuotaError: true,
              },
              plugins: [
                {
                  cacheKeyWillBeUsed: async ({ request }) => {
                    // Smart cache key generation for data endpoints
                    const url = new URL(request.url);
                    const params = new URLSearchParams();
                    
                    // Only include essential parameters in cache key
                    const essentialParams = ['venueId', 'userId', 'date', 'sport'];
                    essentialParams.forEach(param => {
                      const value = url.searchParams.get(param);
                      if (value) params.set(param, value);
                    });
                    
                    return `${url.pathname}?${params.toString()}`;
                  },
                  requestWillFetch: async ({ request }) => {
                    // Add performance headers
                    const modifiedRequest = request.clone();
                    modifiedRequest.headers.set('X-Requested-With', 'ServiceWorker');
                    modifiedRequest.headers.set('Accept-Encoding', 'gzip, deflate, br');
                    return modifiedRequest;
                  },
                },
              ],
            },
          },
        ],
        // Enhanced plugins for background sync integration
        plugins: [
          {
            cacheKeyWillBeUsed: async ({ request, mode }) => {
              // Enhanced cache key generation with volunteer context
              const url = new URL(request.url);
              
              // Include volunteer-specific parameters in cache key
              const volunteerParams = ['userId', 'venueId', 'teamId', 'matchId'];
              const paramString = volunteerParams
                .map(param => url.searchParams.get(param))
                .filter(Boolean)
                .join('-');
              
              const baseKey = mode === 'read' 
                ? request.url 
                : `${request.url}-${Date.now()}`;
              
              return paramString ? `${baseKey}-${paramString}` : baseKey;
            },
            requestWillFetch: async ({ request }) => {
              // Add metadata for tracking volunteer operations
              if (request.url.includes('/api/trpc/')) {
                const modifiedRequest = request.clone();
                modifiedRequest.headers.set('X-SW-Timestamp', Date.now().toString());
                modifiedRequest.headers.set('X-SW-Version', '2.0');
                return modifiedRequest;
              }
              return request;
            },
          },
        ],
        // Background sync configuration
        mode: 'production',
        clientsClaim: true,
        skipWaiting: true,
      },
    })(nextConfig)
  : nextConfig;

export default config;
