import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ['query'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db

// Ensure connection is established
export async function ensureConnection() {
  try {
    await db.$connect();
    return true;
  } catch (error) {
    console.error('Database connection failed:', error);
    return false;
  }
}