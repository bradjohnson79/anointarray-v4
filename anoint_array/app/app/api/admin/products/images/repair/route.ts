import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { runConvex } from '@/lib/convexCli';

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
    let list: any[] = [];
    try { list = await runConvex<any>('products:list', {}); } catch {}
    if (!Array.isArray(list)) list = [];
    let updated = 0;
    for (const p of list) {
      const slug = p.slug as string;
      const currUrl = p.imageUrl || null;
      const currGal = Array.isArray(p.imageGallery) ? p.imageGallery : [];
      const nextUrl = normalizeSupabasePublicUrl(currUrl);
      const nextGallery = currGal.map((u: any)=> normalizeSupabasePublicUrl(u));
      const changed = nextUrl !== currUrl || JSON.stringify(nextGallery) !== JSON.stringify(currGal);
      if (changed) {
        await runConvex('products:updateImages', { slug, imageUrl: nextUrl, imageGallery: nextGallery });
        updated++;
      }
    }
    return NextResponse.json({ ok: true, updated, source: 'convex' });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed to repair image URLs' }, { status: 500 });
  }
}
