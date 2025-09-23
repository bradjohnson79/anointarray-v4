import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { callConvex } from '@/lib/convexHttp';

export const dynamic = 'force-dynamic';

export async function POST(_req: NextRequest) {
  try {
    await requireAdmin();

    const sampleNames = [
      'Harmonic Seal – Vitality',
      'Clarity Seal – Insight',
      'Guardian Array – Protection',
    ];

    // Find sample products in Convex
    const list: any[] = await callConvex({ functionPath: 'products:list', args: {} });
    const targets = (list || []).filter(p => sampleNames.includes(p.name));
    for (const p of targets) {
      await callConvex({ functionPath: 'products:deleteBySlug', args: { slug: p.slug } });
    }
    return NextResponse.json({ message: `Removed ${targets.length} sample product(s)` });
  } catch (error: any) {
    console.error('Cleanup samples error:', error);
    return NextResponse.json({ error: error?.message || 'Cleanup failed' }, { status: 500 });
  }
}
