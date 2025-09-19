import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(_req: NextRequest, { params }: { params: { slug: string } }) {
  try {
    const slug = decodeURIComponent(params.slug);
    const supabase = createSupabaseServerClient();
    const { data: list, error } = await supabase
      .from('products')
      .select('*, variants(*)')
      .eq('slug', slug)
      .limit(1);
    if (error) throw new Error(error.message || 'Fetch failed');
    const p = (list && list[0]) || null;
    if (!p) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    const data: any = {
      ...p,
      price: Number(p.price || 0),
      weight: p.weight ? Number(p.weight) : null,
      variants: Array.isArray((p as any).variants) ? (p as any).variants.map((v: any) => ({ ...v, price: Number(v.price) })) : [],
    };
    return NextResponse.json(data);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed' }, { status: 500 });
  }
}
