
import { PrismaClient } from '@prisma/client';

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
  // Prefer non-pooled connection strings to avoid PgBouncer instability in serverless
  const direct = process.env.DIRECT_URL;
  const db = process.env.DATABASE_URL;
  const supabaseSession = process.env.SUPABASE_SESSION_URL;

  const candidates = [direct, db, supabaseSession].filter(Boolean) as string[];
  const nonPooled = candidates.find((u) => !isPooled(u));
  return nonPooled || candidates[0];
}

const dbUrl = resolveDbUrl();

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient(dbUrl ? { datasources: { db: { url: dbUrl } } } : undefined);

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
