import { NextResponse } from 'next/server';
import { clearSessionCookie } from '@/lib/jwt-auth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST() {
  clearSessionCookie();
  return NextResponse.json({ ok: true });
}

