import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/supabase-auth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function nowStamp() {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    d.getFullYear() +
    pad(d.getMonth() + 1) +
    pad(d.getDate()) + '-' +
    pad(d.getHours()) +
    pad(d.getMinutes()) +
    pad(d.getSeconds())
  );
}

export async function GET(req: NextRequest) {
  try { await requireAdmin(); } catch { return NextResponse.json({ error: 'Admin access required' }, { status: 403 }); }
  try {
    const { searchParams } = new URL(req.url);
    const dry = searchParams.get('dry') === '1' || searchParams.get('check') === '1';
    const { createSupabaseServerClient } = await import('@/lib/supabase-server');
    const supabase = createSupabaseServerClient();

    // Fetch products and variants directly via Supabase REST (service role)
    const { data: products, error: pErr } = await supabase
      .from('products')
      .select('*')
      .order('createdAt', { ascending: true });
    if (pErr) throw new Error(`Products fetch failed: ${pErr.message || pErr}`);

    const { data: variants, error: vErr } = await supabase
      .from('product_variants')
      .select('*');
    if (vErr) throw new Error(`Variants fetch failed: ${vErr.message || vErr}`);

    // Group variants by productId
    const byProduct: Record<string, any[]> = {};
    (variants || []).forEach((v: any) => {
      const k = String(v.productId || '');
      if (!byProduct[k]) byProduct[k] = [];
      byProduct[k].push(v);
    });

    const snapshot = {
      exportedAt: new Date().toISOString(),
      count: (products || []).length,
      products: (products || []).map((p: any) => ({ ...p, variants: byProduct[p.id] || [] })),
    };

    // In dry mode, just return counts to test permissions
    if (dry) {
      return NextResponse.json({ ok: true, count: snapshot.count });
    }

    // Persist to Supabase Storage (configs/backups)
    const { CONFIGS_BUCKET } = await import('@/lib/supabase-server');
    const bucket = CONFIGS_BUCKET || process.env.SUPABASE_CONFIGS_BUCKET || 'configs';
    const path = `backups/products-${nowStamp()}.json`;
    const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json' });
    const { error: upErr } = await supabase.storage.from(bucket).upload(path, blob, { upsert: true, contentType: 'application/json' });
    if (upErr) throw new Error(`Upload failed: ${upErr.message || upErr}`);

    // Create a short-lived signed URL for convenience
    const { data: signed, error: sErr } = await supabase.storage.from(bucket).createSignedUrl(path, 60 * 10);
    if (sErr) {
      // Fallback: return path without signed URL
      return NextResponse.json({ ok: true, count: snapshot.count, bucket, path, note: 'Signed URL unavailable' });
    }

    return NextResponse.json({ ok: true, count: snapshot.count, bucket, path, signedUrl: signed?.signedUrl });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Backup failed' }, { status: 500 });
  }
}
