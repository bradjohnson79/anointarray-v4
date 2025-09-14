
import { PrismaClient } from '@prisma/client';

function ensureDirect5432(url?: string | null) {
  if (!url) throw new Error('DATABASE_URL is not set');
  if (/^prisma:\/\//i.test(url)) throw new Error('prisma:// (Data Proxy/Accelerate) is not allowed by DATABASE_RULES.md');
  if (/pgbouncer=true/i.test(url)) throw new Error('Pooled (pgBouncer) flags are not allowed by DATABASE_RULES.md');
  try {
    const u = new URL(url);
    const host = u.hostname;
    const port = Number(u.port || 5432);
    if (/pooler\./i.test(host)) throw new Error('Pooler host is not allowed by DATABASE_RULES.md');
    if (port !== 5432) throw new Error('Only direct port 5432 is allowed by DATABASE_RULES.md');
  } catch {
    // If parsing fails, let Prisma fail later; but we keep the guard.
  }
  return url;
}

function resolveDbUrl(): string | undefined {
  // Guardrail: always use direct 5432 (no pooler, no data proxy)
  const db = process.env.DATABASE_URL;
  if (db) return ensureDirect5432(db);
  // Optional dev fallback: allow DIRECT_URL if explicitly set and valid
  const direct = process.env.DIRECT_URL;
  if (direct) return ensureDirect5432(direct);
  return undefined;
}

const dbUrl = resolveDbUrl();

const globalForPrisma = globalThis as unknown as { prisma: ReturnType<PrismaClient['$extends']> | PrismaClient | undefined };

function createClient() {
  if (!dbUrl) {
    throw new Error('Direct 5432 DATABASE_URL not configured. See DATABASE_RULES.md');
  }
  return new PrismaClient({ datasources: { db: { url: dbUrl } } });
}

export const prisma = (globalForPrisma.prisma as any) ?? createClient();

if (process.env.NODE_ENV !== 'production') (globalForPrisma as any).prisma = prisma;

// Small helper to expose which DSN type is selected (for diagnostics only)
export function selectedDbUrl(): string | undefined {
  return dbUrl;
}
