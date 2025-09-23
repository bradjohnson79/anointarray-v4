import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/supabase-auth';
import { runConvex } from '@/lib/convexCli';
import { callConvex } from '@/lib/convexHttp';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST() {
  try { await requireAdmin(); } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }
  try {
    let out: any;
    try { out = await runConvex('products:normalizeSort', {}); }
    catch { out = await callConvex({ functionPath: 'products:normalizeSort', args: {} }); }
    if (!out?.ok) return NextResponse.json({ error: out?.error || 'Failed' }, { status: 500 });
    return NextResponse.json(out);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed to resequence' }, { status: 500 });
  }
}
