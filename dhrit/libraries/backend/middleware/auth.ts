import { TRPCError } from '@trpc/server';
import { verifyToken } from '../utils/jwt';
import type { Context } from '../trpc';

export async function authMiddleware(opts: { ctx: Context }) {
  const { ctx } = opts;
  
  const token = ctx.req?.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'No token provided'
    });
  }

  try {
    const payload = verifyToken(token);
    
    const user = await ctx.prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
      }
    });

    if (!user) {
      throw new TRPCError({
        code: 'UNAUTHORIZED',
        message: 'User not found'
      });
    }

    return {
      ctx: {
        ...ctx,
        user,
      }
    };
  } catch (error) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'Invalid token'
    });
  }
}

export function requireRole(roles: string[]) {
  return async (opts: { ctx: Context & { user: any } }) => {
    const { ctx } = opts;
    
    if (!ctx.user) {
      throw new TRPCError({
        code: 'UNAUTHORIZED',
        message: 'Not authenticated'
      });
    }

    if (!roles.includes(ctx.user.role)) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Insufficient permissions'
      });
    }

    return { ctx };
  };
}
