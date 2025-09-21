import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/supabase-auth';
import { callConvex } from '@/lib/convexHttp';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  try { await requireAdmin(); } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }
  try {
    if (!process.env.CONVEX_URL || !(process.env.CONVEX_ADMIN_KEY || process.env.CONVEX_TEAM_ACCESS_TOKEN)) {
      return NextResponse.json({ error: 'Convex not configured (missing CONVEX_URL/CONVEX_ADMIN_KEY or TEAM token)' }, { status: 501 });
    }
    const out = await callConvex({ functionPath: 'products:list', args: {} });
    const items = Array.isArray(out) ? out : (Array.isArray((out as any)?.result) ? (out as any).result : []);
    return NextResponse.json({ ok: true, count: items.length, sample: items.slice(0, 3) });
  } catch (e:any) {
    return NextResponse.json({ error: e?.message || 'Convex list failed' }, { status: 500 });
  }
}

