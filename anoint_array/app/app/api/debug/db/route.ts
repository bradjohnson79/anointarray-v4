import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withApiErrorHandling } from '@/lib/api-handler';

export const dynamic = 'force-dynamic';

export const runtime = 'nodejs';

async function handler(_req: NextRequest) {
  const r = await prisma.$queryRawUnsafe('SELECT 1 as one');
  return NextResponse.json({ ok: true, result: r });
}

export const GET = withApiErrorHandling(handler, '/api/debug/db');
