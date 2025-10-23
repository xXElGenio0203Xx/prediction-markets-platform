import { PrismaClient } from '@prisma/client';
import { config } from '../config.js';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: config.isDev ? ['query', 'error', 'warn'] : ['error'],
    datasources: {
      db: {
        url: config.DATABASE_URL,
      },
    },
  });

if (config.isDev) globalForPrisma.prisma = prisma;

// Health check helper
export async function checkDatabaseHealth(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch {
    return false;
  }
}

// Graceful shutdown
export async function closePrisma(): Promise<void> {
  await prisma.$disconnect();
  console.log('[Prisma] Connection closed');
}
