import { TRPCError } from '@trpc/server';
import type { Context } from '../trpc';

interface RateLimitOptions {
  windowMs: number;
  maxRequests: number;
  keyGenerator?: (ctx: Context) => string;
}

const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

export function rateLimit(options: RateLimitOptions) {
  const { windowMs, maxRequests, keyGenerator = (ctx) => ctx.req?.ip || 'unknown' } = options;

  return async (opts: { ctx: Context }) => {
    const { ctx } = opts;
    const key = keyGenerator(ctx);
    const now = Date.now();
    
    const record = rateLimitStore.get(key);
    
    if (!record || now > record.resetTime) {
      rateLimitStore.set(key, {
        count: 1,
        resetTime: now + windowMs,
      });
      return { ctx };
    }
    
    if (record.count >= maxRequests) {
      throw new TRPCError({
        code: 'TOO_MANY_REQUESTS',
        message: 'Rate limit exceeded'
      });
    }
    
    record.count++;
    return { ctx };
  };
}

// Cleanup expired entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of rateLimitStore.entries()) {
    if (now > record.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}, 60000); // Clean up every minute
