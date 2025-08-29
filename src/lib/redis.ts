// src/lib/redis.ts
import Redis from 'ioredis';

const globalForRedis = globalThis as unknown as {
  redis: Redis | undefined;
};

export const redis =
  globalForRedis.redis ??
  new Redis({
    host: process.env.REDIS_HOST,
    port: parseInt(process.env.REDIS_PORT!, 10),
    ...(process.env.REDIS_USERNAME && { username: process.env.REDIS_USERNAME }),
    ...(process.env.REDIS_PASSWORD && { password: process.env.REDIS_PASSWORD }),

    // Use TLS only if explicitly enabled
    ...(process.env.REDIS_TLS === "true" ? { tls: {} } : {}),
  });

if (process.env.NODE_ENV !== 'production') {
  globalForRedis.redis = redis;
}
