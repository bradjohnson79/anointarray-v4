
import { PrismaClient } from '@prisma/client';
// Accelerate is intentionally not used; we require direct, non‑pooled connections

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
  // Always prefer a direct, non‑pooled Postgres URL. Never use prisma:// or poolers.
  const direct = process.env.DIRECT_URL;
  if (direct) return direct;

  const db = process.env.DATABASE_URL;
  if (db && !/^prisma:\/\//i.test(db) && !isPooled(db)) return db;

  // Do NOT fallback to pooled/session URLs — explicit by project policy
  return undefined;
}

const dbUrl = resolveDbUrl();

const globalForPrisma = globalThis as unknown as { prisma: ReturnType<PrismaClient['$extends']> | PrismaClient | undefined };

function createClient() {
  if (!dbUrl) {
    // Hard fail to avoid accidental pooled/proxy connections
    throw new Error('Non-pooled Postgres URL not configured. Set DIRECT_URL or a non-pooled DATABASE_URL.');
  }
  const base = new PrismaClient({ datasources: { db: { url: dbUrl } } });
  return base;
}

export const prisma = (globalForPrisma.prisma as any) ?? createClient();

if (process.env.NODE_ENV !== 'production') (globalForPrisma as any).prisma = prisma;

// Small helper to expose which DSN type is selected (for diagnostics only)
export function selectedDbUrl(): string | undefined {
  return dbUrl;
}
