import { NextRequest, NextResponse } from 'next/server';
import { prisma, selectedDbUrl } from '@/lib/prisma';
import { withApiErrorHandling } from '@/lib/api-handler';
import { HttpError } from '@/lib/http-errors';

export const dynamic = 'force-dynamic';

export const runtime = 'nodejs';

async function handler(_req: NextRequest) {
  try {
    const r = await prisma.$queryRawUnsafe('SELECT 1 as one');
    const usingAccelerate = !!(process.env.PRISMA_ACCELERATE_URL || process.env.ACCELERATE_URL);
    const dsn = selectedDbUrl();
    let host: string | undefined;
    let port: number | undefined;
    try {
      if (dsn) {
        const u = new URL(dsn);
        host = u.hostname;
        port = Number(u.port || 5432);
      }
    } catch {}
    const envSource = process.env.DATABASE_URL ? 'DATABASE_URL' : (process.env.DIRECT_URL ? 'DIRECT_URL' : undefined);
    return NextResponse.json({ ok: true, result: r, usingAccelerate, host, port, envSource });
  } catch (e: any) {
    // Sanitize the message to avoid leaking DSN
    let msg = String(e?.message || e || 'DB probe failed');
    msg = msg.replace(/postgresql:\/\/[^@]+@/gi, 'postgresql://***:***@');
    // Add basic policy details to help diagnose env issues (no secrets leaked)
    const source = process.env.DATABASE_URL ? 'DATABASE_URL' : (process.env.DIRECT_URL ? 'DIRECT_URL' : 'none');
    const policy = {
      source,
      hasPrismaProxyVar: !!(process.env.PRISMA_ACCELERATE_URL || process.env.ACCELERATE_URL),
    };
    throw new HttpError(500, `${msg}\nPolicy: ${JSON.stringify(policy)}`, 'DB_PROBE_FAILED');
  }
}

export const GET = withApiErrorHandling(handler, '/api/debug/db');
