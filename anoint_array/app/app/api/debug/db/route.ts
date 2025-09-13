import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { withApiErrorHandling } from '@/lib/api-handler';
import { HttpError } from '@/lib/http-errors';

export const dynamic = 'force-dynamic';

export const runtime = 'nodejs';

async function handler(_req: NextRequest) {
  // Use DIRECT_URL explicitly for probe to bypass pooler issues
  // Prefer explicit Supabase session URL if provided, then DATABASE_URL, then DIRECT_URL
  // Use the canonical session pooler URL; no fallback to keep signal clear
  const url = process.env.SUPABASE_SESSION_URL || process.env.DATABASE_URL;
  const client = new PrismaClient(url ? { datasources: { db: { url } } } : undefined);
  try {
    const r = await client.$queryRawUnsafe('SELECT 1 as one');
    return NextResponse.json({ ok: true, result: r });
  } catch (e: any) {
    // Sanitize the message to avoid leaking DSN
    let msg = String(e?.message || e || 'DB probe failed');
    msg = msg.replace(/postgresql:\/\/[^@]+@/gi, 'postgresql://***:***@');
    throw new HttpError(500, msg, 'DB_PROBE_FAILED');
  }
  finally {
    await client.$disconnect();
  }
}

export const GET = withApiErrorHandling(handler, '/api/debug/db');
