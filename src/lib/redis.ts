// src/lib/redis.ts
import Redis from 'ioredis';

const globalForRedis = globalThis as unknown as {
  redis: Redis | undefined;
};

let redisInstance: Redis | null = null;

try {
  redisInstance = new Redis({
    host: process.env.REDIS_HOST,
    port: parseInt(process.env.REDIS_PORT!, 10),
    ...(process.env.REDIS_USERNAME && { username: process.env.REDIS_USERNAME }),
    ...(process.env.REDIS_PASSWORD && { password: process.env.REDIS_PASSWORD }),
    
    // Use TLS only if explicitly enabled
    ...(process.env.REDIS_TLS === "true" ? { tls: {} } : {}),
    
    // Connection settings
    connectTimeout: 2000,
    lazyConnect: true,
    maxRetriesPerRequest: 1, // Reduce retries to minimize logs
    retryDelayOnFailover: 100,
  });

  // Handle connection errors gracefully
  redisInstance.on('error', (error) => {
    console.warn('Redis connection error:', error.message);
  });

  redisInstance.on('connect', () => {
    console.log('Redis connected successfully');
  });

} catch (error) {
  console.warn('Failed to initialize Redis:', error);
  redisInstance = null;
}

export const redis = globalForRedis.redis ?? redisInstance;

if (process.env.NODE_ENV !== 'production') {
  globalForRedis.redis = redis;
}

// Helper function to safely use Redis
export const safeRedisOperation = async <T>(
  operation: (redis: Redis) => Promise<T>,
  fallback: () => Promise<T>
): Promise<T> => {
  if (!redis) {
    return fallback();
  }
  
  try {
    return await operation(redis);
  } catch (error) {
    console.warn('Redis operation failed, using fallback:', error);
    return fallback();
  }
};
