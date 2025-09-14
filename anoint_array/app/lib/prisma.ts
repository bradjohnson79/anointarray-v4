
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
  // Always prefer a direct, non‑pooled Postgres URL if provided
  const direct = process.env.DIRECT_URL;
  if (direct) return direct;

  const db = process.env.DATABASE_URL;
  // If DATABASE_URL is non‑pooled Postgres, prefer it
  if (db && !/^prisma:\/\//i.test(db) && !isPooled(db)) return db;

  // Avoid pooled session URLs unless nothing else is available
  const supabaseSession = process.env.SUPABASE_SESSION_URL;
  if (db) return db; // fallback (may be prisma:// or pooled depending on env)
  if (supabaseSession) return supabaseSession;
  return undefined;
}

const dbUrl = resolveDbUrl();

const globalForPrisma = globalThis as unknown as { prisma: ReturnType<PrismaClient['$extends']> | PrismaClient | undefined };

function createClient() {
  const base = new PrismaClient(dbUrl ? { datasources: { db: { url: dbUrl } } } : undefined);
  const accelUrl = process.env.PRISMA_ACCELERATE_URL || process.env.ACCELERATE_URL;
  // Only use Accelerate extension when explicitly on prisma:// or no direct URL was resolved
  const shouldUseAccelerate = !!accelUrl && (process.env.DIRECT_URL ? false : (process.env.DATABASE_URL || '').startsWith('prisma://'));
  if (shouldUseAccelerate) {
    try {
      // withAccelerate reads PRISMA_ACCELERATE_URL from env; no args needed
      return (base as any).$extends(withAccelerate());
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
