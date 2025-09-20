import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/supabase-auth';
import { createSupabaseAdminClient } from '@/lib/supabaseClient';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST() {
  try { await requireAdmin(); } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }
  try {
    const s = createSupabaseAdminClient();
    const { data: products } = await s
      .from('products')
      .select('id, featured, name, createdAt')
      .order('featured', { ascending: false })
      .order('name', { ascending: true })
      .order('createdAt', { ascending: true });
    let i = 100;
    for (const p of (products || [])) {
      await s.from('products').update({ sortOrder: i }).eq('id', (p as any).id);
      i += 10;
    }
    return NextResponse.json({ ok: true, count: (products || []).length, from: 100, step: 10 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed to resequence' }, { status: 500 });
  }
}
