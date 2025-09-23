import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/supabase-auth';
import { runConvex } from '@/lib/convexCli';
import { callConvex } from '@/lib/convexHttp';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function genSku(name: string, style?: string | null) {
  const base = (name || 'SKU').toUpperCase().replace(/[^A-Z0-9]+/g, '').slice(0, 8);
  const sty = (style || '').toUpperCase().replace(/[^A-Z0-9]+/g, '').slice(0, 6);
  const rand = Math.random().toString(36).toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4);
  return [base, sty, rand].filter(Boolean).join('-');
}

export async function POST() {
  await requireAdmin();
  try {
    let out: any;
    try { out = await runConvex('products:repairSkus', {}); }
    catch { out = await callConvex({ functionPath: 'products:repairSkus', args: {} }); }
    if (!out?.ok) return NextResponse.json({ error: out?.error || 'Failed' }, { status: 500 });
    return NextResponse.json({ ok: true, updated: out.updated });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed to repair SKUs' }, { status: 500 });
  }
}
