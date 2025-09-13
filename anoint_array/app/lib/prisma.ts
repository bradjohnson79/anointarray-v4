
import { PrismaClient } from '@prisma/client';
import { withAccelerate } from '@prisma/extension-accelerate';

function isPooled(url?: string | null) {
  if (!url) return false;
  try {
    const host = new URL(url).hostname;
    return /pooler\./i.test(host);
  } catch {
    return false;
  }
}

function resolveDbUrl(): string | undefined {
  // If Prisma Accelerate Data Proxy DSN is provided via DATABASE_URL (prisma://...), use it first
  const db = process.env.DATABASE_URL;
  if (db && /^prisma:\/\//i.test(db)) return db;

  // Otherwise prefer non-pooled direct URLs to avoid PgBouncer instability
  const direct = process.env.DIRECT_URL;
  const supabaseSession = process.env.SUPABASE_SESSION_URL;

  const candidates = [direct, db, supabaseSession].filter(Boolean) as string[];
  const nonPooled = candidates.find((u) => !isPooled(u));
  return nonPooled || candidates[0];
}

const dbUrl = resolveDbUrl();

const globalForPrisma = globalThis as unknown as { prisma: ReturnType<PrismaClient['$extends']> | PrismaClient | undefined };

function createClient() {
  const base = new PrismaClient(dbUrl ? { datasources: { db: { url: dbUrl } } } : undefined);
  const accelUrl = process.env.PRISMA_ACCELERATE_URL || process.env.ACCELERATE_URL;
  if (accelUrl) {
    try {
      return base.$extends(withAccelerate({ accelerateURL: accelUrl }));
    } catch (_) {
      // If extension init fails for any reason, fall back to base client.
      return base;
    }
  }
  return base;
}

export const prisma = (globalForPrisma.prisma as any) ?? createClient();

if (process.env.NODE_ENV !== 'production') (globalForPrisma as any).prisma = prisma;

// Small helper to expose which DSN type is selected (for diagnostics only)
export function selectedDbUrl(): string | undefined {
  return dbUrl;
}
