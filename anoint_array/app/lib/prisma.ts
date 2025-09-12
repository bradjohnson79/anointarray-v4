
import { PrismaClient } from '@prisma/client';

function resolveDbUrl(): string | undefined {
  // Allow an override env var so we can pivot without touching DATABASE_URL
  const supabaseSession = process.env.SUPABASE_SESSION_URL;
  const db = process.env.DATABASE_URL;
  const direct = process.env.DIRECT_URL;
  return supabaseSession || db || direct;
}

const dbUrl = resolveDbUrl();

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient(dbUrl ? { datasources: { db: { url: dbUrl } } } : undefined);

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
