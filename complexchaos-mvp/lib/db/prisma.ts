/**
 * Prisma Client Singleton
 * 
 * This module exports a single Prisma Client instance to be reused across the application.
 * 
 * Why a singleton?
 * - Prevents database connection exhaustion
 * - Ensures consistent connection pooling
 * - Required for Next.js hot-reload during development
 * 
 * For LLM maintainers:
 * - This is the ONLY place where Prisma Client should be instantiated
 * - Import this module whenever you need database access
 * - DO NOT create new PrismaClient() elsewhere
 * 
 * @example
 * ```typescript
 * import { prisma } from '@/lib/db/prisma';
 * 
 * const users = await prisma.user.findMany();
 * ```
 */

import { PrismaClient } from '@prisma/client';

/**
 * Global type augmentation for development hot-reload
 * 
 * In development, Next.js clears the module cache on save, which would create
 * multiple Prisma Client instances. We store the instance on globalThis to persist
 * it across hot reloads.
 */
declare global {
  var prisma: PrismaClient | undefined;
}

/**
 * Prisma Client instance with logging configuration
 * 
 * Logging levels:
 * - 'query': Log all SQL queries (dev only, performance impact)
 * - 'error': Log errors (always enabled)
 * - 'warn': Log warnings (always enabled)
 * 
 * Connection pooling:
 * - Default: 10 connections per instance
 * - Configure via DATABASE_URL: ?connection_limit=20
 */
export const prisma =
  global.prisma ||
  new PrismaClient({
    log:
      process.env.NODE_ENV === 'development'
        ? ['error', 'warn'] // Reduce noise in dev
        : ['error'],
  });

// Store instance globally in development for hot-reload persistence
if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma;
}

/**
 * Graceful shutdown handler
 * 
 * Ensures database connections are closed when the process terminates.
 * Critical for zero-downtime deploys.
 * 
 * @example
 * ```typescript
 * process.on('SIGTERM', async () => {
 *   await prisma.$disconnect();
 *   process.exit(0);
 * });
 * ```
 */
if (process.env.NODE_ENV === 'production') {
  process.on('beforeExit', async () => {
    await prisma.$disconnect();
  });
}
