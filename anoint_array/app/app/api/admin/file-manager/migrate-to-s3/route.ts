import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/supabase-auth';
import { createSupabaseAdminClient } from '@/lib/supabaseClient';
import { uploadFile, getPublicUrl } from '@/lib/s3';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: Request) {
  const internal = process.env.MIGRATION_TOKEN && (req.headers.get('x-internal-token') === process.env.MIGRATION_TOKEN);
  if (!internal) { try { await requireAdmin(); } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); } }
  try {
    const bucket = process.env.SUPABASE_PRODUCT_IMAGES_BUCKET || 'product-images';
    const s = createSupabaseAdminClient();
    const list = await s.storage.from(bucket).list('', { limit: 1000 });
    if (list.error) return NextResponse.json({ error: list.error.message }, { status: 500 });
    const files = (list.data || []).filter((f:any)=> !!f?.name);
    let copied = 0, skipped = 0, errors: Array<{name:string,error:string}> = [];
    for (const f of files) {
      const name = f.name as string;
      const dl = await s.storage.from(bucket).download(name);
      if (dl.error || !dl.data) { errors.push({ name, error: dl.error?.message || 'download failed' }); continue; }
      try {
        const arr = (dl.data as any).arrayBuffer ? await (dl.data as any).arrayBuffer() : null;
        const buf = arr ? Buffer.from(arr) : Buffer.from(await (dl.data as any).text?.() || '', 'utf8');
        const contentType = (f as any)?.metadata?.mimetype || (f as any)?.mimetype || undefined;
        const res = await uploadFile(buf, name, contentType);
        if (res.success) copied++; else errors.push({ name, error: res.error || 'upload failed' });
      } catch (e:any) {
        errors.push({ name, error: e?.message || String(e) });
      }
    }
    return NextResponse.json({ ok: true, total: files.length, copied, skipped, errorsCount: errors.length, errors: errors.slice(0,5) });
  } catch (e:any) {
    return NextResponse.json({ error: e?.message || 'Migration failed' }, { status: 500 });
  }
}
