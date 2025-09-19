
import { PrismaClient } from '@prisma/client';

// Force Accelerate first; fallback to DATABASE_URL/DIRECT_URL only if Accelerate is not provided.
const accelerateUrl = process.env.PRISMA_ACCELERATE_URL;
const directUrl = process.env.DATABASE_URL || process.env.DIRECT_URL;
const datasourceUrl = accelerateUrl || directUrl || '';

if (!datasourceUrl) {
  throw new Error('Missing PRISMA_ACCELERATE_URL or DATABASE_URL/DIRECT_URL');
}

// Single client instance across hot reloads in dev
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

export const prisma: PrismaClient =
  globalForPrisma.prisma ?? new PrismaClient({ datasourceUrl });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export function selectedDbUrl(): string | undefined { return datasourceUrl; }
