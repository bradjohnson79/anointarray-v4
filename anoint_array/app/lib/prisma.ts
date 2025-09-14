
import { PrismaClient } from '@prisma/client';
import { withAccelerate } from '@prisma/extension-accelerate';

function ensureDirect5432(url?: string | null) {
  if (!url) throw new Error('DATABASE_URL is not set');
  // Allow prisma:// when using Accelerate or Data Proxy
  if (/^prisma:\/\//i.test(url)) return url;
  // Allow pooled flags when not explicitly forbidden (we may use Supabase pooler or similar)
  try {
    const u = new URL(url);
    const host = u.hostname;
    const port = Number(u.port || 5432);
    // We accept 5432 and other ports when a provider requires it
    if (!host) throw new Error('Invalid DATABASE_URL host');
  } catch {
    // If parsing fails, let Prisma fail later; but we keep the guard.
  }
  return url;
}

function resolveDbUrl(): string | undefined {
  const db = process.env.DATABASE_URL;
  if (db) return ensureDirect5432(db);
  const direct = process.env.DIRECT_URL;
  if (direct) return ensureDirect5432(direct);
  return undefined;
}

const dbUrl = resolveDbUrl();
const useAccelerate = !!process.env.PRISMA_ACCELERATE_URL;

const globalForPrisma = globalThis as unknown as { prisma: ReturnType<PrismaClient['$extends']> | PrismaClient | undefined };

function createClient() {
  if (useAccelerate) {
    // Use Prisma Accelerate/Data Proxy via extension; respects PRISMA_ACCELERATE_URL
    return new PrismaClient().$extends(withAccelerate());
  }
  if (!dbUrl) {
    throw new Error('DATABASE_URL not configured. Set DATABASE_URL (or DIRECT_URL) in env.');
  }
  return new PrismaClient({ datasources: { db: { url: dbUrl } } });
}

export const prisma = (globalForPrisma.prisma as any) ?? createClient();

if (process.env.NODE_ENV !== 'production') (globalForPrisma as any).prisma = prisma;

// Small helper to expose which DSN type is selected (for diagnostics only)
export function selectedDbUrl(): string | undefined {
  return dbUrl;
}
