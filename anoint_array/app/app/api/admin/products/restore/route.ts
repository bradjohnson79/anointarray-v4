import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { createSupabaseAdminClient } from '@/lib/supabaseClient';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Restores products + variants from the latest backup in Supabase Storage (configs/backups/...json)
export async function POST() {
  try {
    await requireAdmin();
    const s = createSupabaseAdminClient();
    const bucket = process.env.SUPABASE_CONFIGS_BUCKET || 'configs';

    // List backups and pick the latest by name (they include timestamp in filename)
    const { data: files, error: listErr } = await s.storage.from(bucket).list('backups');
    if (listErr) throw new Error(listErr.message);
    const backups = (files || []).filter((f:any)=> (f?.name||'').endsWith('.json')).sort((a:any,b:any)=> (a.name > b.name ? -1 : 1));
    if (!backups.length) return NextResponse.json({ error: 'No backups found in configs/backups' }, { status: 404 });
    const latest = backups[0].name as string;

    const { data: dl, error: dlErr } = await s.storage.from(bucket).download(`backups/${latest}`);
    if (dlErr || !dl) throw new Error(dlErr?.message || 'Download failed');
    const text = await (dl as any).text?.() || Buffer.from(await (dl as any).arrayBuffer()).toString('utf8');
    const snapshot = JSON.parse(text || '{}');
    const products = Array.isArray(snapshot?.products) ? snapshot.products : [];

    // Wipe current data then insert snapshot (safe for small sets)
    await s.from('product_variants').delete().neq('id','');
    await s.from('products').delete().neq('id','');

    // Insert products
    if (products.length) {
      const bare = products.map((p:any)=>{
        const { variants, ...rest } = p;
        return rest;
      });
      const { error: piErr } = await s.from('products').insert(bare);
      if (piErr) throw new Error(piErr.message);

      // Insert variants in batches
      const allVars = products.flatMap((p:any)=> (p.variants||[]));
      if (allVars.length) {
        for (let i=0;i<allVars.length;i+=500) {
          const chunk = allVars.slice(i, i+500);
          const { error: viErr } = await s.from('product_variants').insert(chunk);
          if (viErr) throw new Error(viErr.message);
        }
      }
    }

    return NextResponse.json({ ok: true, restored: products.length, backup: latest });
  } catch (e:any) {
    return NextResponse.json({ error: e?.message || 'Restore failed' }, { status: 500 });
  }
}
