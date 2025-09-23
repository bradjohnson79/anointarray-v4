import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import bcrypt from 'bcryptjs';
import { runConvex } from '@/lib/convexCli';
import { callConvex } from '@/lib/convexHttp';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

async function convex(fn: string, args: any) {
  try { return await runConvex(fn as any, args); } catch { return await callConvex({ functionPath: fn, args }); }
}

export async function GET(req: NextRequest) {
  try { await requireAdmin(); } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }
  try {
    // List users from Convex
    const items = await convex('users:list' as any, {} as any).catch(async () => {
      // Fallback: no list function; approximate by known emails in orders? Return minimal demo.
      return [] as any[];
    });
    return NextResponse.json(Array.isArray(items) ? items : []);
  } catch (e:any) {
    return NextResponse.json({ error: e?.message || 'Failed to list users' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try { await requireAdmin(); } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }
  try {
    const body = await req.json();
    const email = String(body?.email || '').toLowerCase();
    const name = String(body?.name || '').trim();
    const password = String(body?.password || '').trim();
    const role = (String(body?.role || 'USER').toUpperCase() === 'ADMIN') ? 'ADMIN' : 'USER';
    if (!email || !password) return NextResponse.json({ error: 'Email and password required' }, { status: 400 });
    const existing = await convex('users:byEmail', { email });
    if (existing) return NextResponse.json({ error: 'User exists' }, { status: 409 });
    const hash = await bcrypt.hash(password, 10);
    await convex('users:setPasswordHash', { email, passwordHash: hash });
    await convex('users:upsertByEmail', { email, name });
    if (role === 'ADMIN') await convex('users:updateByEmail', { email, role: 'ADMIN' });
    return NextResponse.json({ ok: true, email, role, name });
  } catch (e:any) {
    return NextResponse.json({ error: e?.message || 'Failed to create user' }, { status: 500 });
  }
}

