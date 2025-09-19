import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/supabase-auth';
import { createSupabaseAdminClient } from '@/lib/supabaseClient';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function normalizeSupabasePublicUrl(url: any): any {
  if (!url || typeof url !== 'string') return url;
  try {
    const u = new URL(url);
    if (u.hostname.includes('.supabase.co') && u.pathname.includes('/storage/v1/object/')) {
      u.pathname = u.pathname.replace('/storage/v1/object/sign/', '/storage/v1/object/public/');
      u.search = '';
      return u.toString();
    }
  } catch {}
  return url;
}

export async function POST() {
  try {
    await requireAdmin();

    const s = createSupabaseAdminClient();
    const { data: products, error } = await s
      .from('products')
      .select('id, imageUrl, imageGallery');
    if (error) throw error;

    let updated = 0;
    for (const p of products) {
      const nextUrl = normalizeSupabasePublicUrl(p.imageUrl);
      const nextGallery = (Array.isArray(p.imageGallery) ? p.imageGallery : [])
        .map((u: any) => normalizeSupabasePublicUrl(u));
      const changed = nextUrl !== p.imageUrl || JSON.stringify(nextGallery) !== JSON.stringify(p.imageGallery || []);
      if (changed) {
        await s.from('products').update({ imageUrl: nextUrl, imageGallery: nextGallery }).eq('id', (p as any).id);
        updated++;
      }
    }

    return NextResponse.json({ ok: true, updated });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed to repair image URLs' }, { status: 500 });
  }
}
