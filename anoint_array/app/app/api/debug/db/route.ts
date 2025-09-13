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
    const host = (()=>{ try { return dsn ? new URL(dsn).hostname : undefined; } catch { return undefined; } })();
    return NextResponse.json({ ok: true, result: r, usingAccelerate, host });
  } catch (e: any) {
    // Sanitize the message to avoid leaking DSN
    let msg = String(e?.message || e || 'DB probe failed');
    msg = msg.replace(/postgresql:\/\/[^@]+@/gi, 'postgresql://***:***@');
    throw new HttpError(500, msg, 'DB_PROBE_FAILED');
  }
}

export const GET = withApiErrorHandling(handler, '/api/debug/db');
