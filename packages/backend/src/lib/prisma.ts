import { PrismaClient } from '@prisma/client';
import { env } from '@/config/env.js';

// Extend globalThis to hold a cached Prisma instance in development.
// This prevents creating multiple connections during hot module replacement (HMR).
declare global {
  var __prisma: PrismaClient | undefined;
}

const createPrismaClient = (): PrismaClient =>
  new PrismaClient({
    log:
      env.NODE_ENV === 'development'
        ? ['query', 'warn', 'error']
        : ['warn', 'error'],
  });

export const prisma: PrismaClient =
  globalThis.__prisma ?? createPrismaClient();

if (env.NODE_ENV !== 'production') {
  globalThis.__prisma = prisma;
}
