import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/supabase-auth';
import { createSupabaseAdminClient } from '@/lib/supabaseClient';
import { runConvex } from '@/lib/convexCli';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: Request) {
  const internal = process.env.MIGRATION_TOKEN && (req.headers.get('x-internal-token') === process.env.MIGRATION_TOKEN);
  if (!internal) { try { await requireAdmin(); } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); } }
  try {
    if (!process.env.CONVEX_URL || !process.env.CONVEX_ADMIN_KEY) {
      return NextResponse.json({ error: 'Convex not configured (missing CONVEX_URL/CONVEX_ADMIN_KEY)' }, { status: 501 });
    }
    const s = createSupabaseAdminClient();
    const bucket = process.env.SUPABASE_CONFIGS_BUCKET || 'configs';
    const list = await s.storage.from(bucket).list('backups');
    if (list.error) throw new Error(list.error.message);
    const backups = (list.data || []).filter((f:any)=> String(f?.name||'').endsWith('.json')).sort((a:any,b:any)=> a.name > b.name ? -1 : 1);
    if (!backups.length) return NextResponse.json({ error: 'No backups found in configs/backups' }, { status: 404 });
    const latest = backups[0].name as string;
    const dl = await s.storage.from(bucket).download('backups/' + latest);
    if (dl.error || !dl.data) throw new Error(dl.error?.message || 'Download failed');
    const text = await (dl.data as any).text?.() || Buffer.from(await (dl.data as any).arrayBuffer()).toString('utf8');
    const snapshot = JSON.parse(text || '{}');
    const products = Array.isArray(snapshot?.products) ? snapshot.products : [];
    const out = await runConvex('products:importSnapshot', { products });
    return NextResponse.json({ ok: true, backup: latest, convex: out });
  } catch (e:any) {
    return NextResponse.json({ error: e?.message || 'Restore to Convex failed' }, { status: 500 });
  }
}
