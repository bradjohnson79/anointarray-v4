import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/supabase-auth';
import { createSupabaseAdminClient } from '@/lib/supabaseClient';

export const dynamic = 'force-dynamic';

export async function POST(_req: NextRequest) {
  try {
    await requireAdmin();

    const sampleNames = [
      'Harmonic Seal – Vitality',
      'Clarity Seal – Insight',
      'Guardian Array – Protection',
    ];

    // Find sample products
    const s = createSupabaseAdminClient();
    const { data: products } = await s
      .from('products')
      .select('id, name')
      .in('name', sampleNames);

    if (products.length === 0) {
      return NextResponse.json({ message: 'No sample products found' });
    }

    const ids = products.map((p: { id: string }) => p.id);

    // delete variants then order_items then products
    await s.from('product_variants').delete().in('productId', ids);
    await s.from('order_items').delete().in('productId', ids);
    await s.from('products').delete().in('id', ids);

    return NextResponse.json({ message: `Removed ${products.length} sample product(s)` });
  } catch (error: any) {
    console.error('Cleanup samples error:', error);
    return NextResponse.json({ error: error?.message || 'Cleanup failed' }, { status: 500 });
  }
}
