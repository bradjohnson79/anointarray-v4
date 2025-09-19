import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  try {
    const { createSupabaseServerClient, PRODUCT_IMAGES_BUCKET } = await import('@/lib/supabase-server');
    const supabase = createSupabaseServerClient();
    const { data, error } = await supabase.storage.from(PRODUCT_IMAGES_BUCKET).list('', { limit: 5 });
    if (error) {
      try { console.error('[debug/supabase] list error:', error?.message || error); } catch {}
      return NextResponse.json({ ok: false, error: String(error?.message || error) }, { status: 500 });
    }
    return NextResponse.json({ ok: true, bucket: PRODUCT_IMAGES_BUCKET, count: (data || []).length, sample: data?.slice(0, 3) || [] });
  } catch (e: any) {
    try { console.error('[debug/supabase] general error:', e?.message || e); } catch {}
    return NextResponse.json({ ok: false, error: e?.message || 'failed' }, { status: 500 });
  }
}

