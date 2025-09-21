import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { callConvex } from '@/lib/convexHttp';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(_req: NextRequest, { params }: { params: { slug: string } }) {
  try {
    const slug = decodeURIComponent(params.slug);
    const convexReady = !!(process.env.CONVEX_URL && (process.env.CONVEX_ADMIN_KEY || process.env.CONVEX_TEAM_ACCESS_TOKEN));
    if (convexReady) {
      const out = await callConvex({ functionPath: 'products:bySlug', args: { slug } });
      if (!out) return NextResponse.json({ error: 'Not found' }, { status: 404 });
      // Ensure numeric fields are numbers
      const data: any = { ...out, price: Number(out.price || 0) };
      return NextResponse.json(data);
    }
    // Fallback (legacy) — can be removed once Convex is fully live
    const supabase = createSupabaseServerClient();
    const { data: list, error } = await supabase.from('products').select('*, variants(*)').eq('slug', slug).limit(1);
    if (error) throw new Error(error.message || 'Fetch failed');
    const p = (list && list[0]) || null;
    if (!p) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    const data: any = { ...p, price: Number(p.price || 0), variants: Array.isArray((p as any).variants) ? (p as any).variants.map((v: any) => ({ ...v, price: Number(v.price) })) : [] };
    return NextResponse.json(data);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed' }, { status: 500 });
  }
}
