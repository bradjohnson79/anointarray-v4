import { NextRequest, NextResponse } from 'next/server';
import { runConvex } from '@/lib/convexCli';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(_req: NextRequest, { params }: { params: { slug: string } }) {
  try {
    const slug = decodeURIComponent(params.slug);
    const convexReady = !!(process.env.CONVEX_URL && (process.env.CONVEX_ADMIN_KEY || process.env.CONVEX_TEAM_ACCESS_TOKEN));
    if (convexReady) {
      const out = await runConvex('products:bySlug', { slug });
      if (!out) return NextResponse.json({ error: 'Not found' }, { status: 404 });
      // Ensure numeric fields are numbers
      const data: any = { ...out, price: Number(out.price || 0) };
      return NextResponse.json(data);
    }
    // Fallback (legacy) — can be removed once Convex is fully live
    return NextResponse.json({ error: 'Convex not configured' }, { status: 500 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed' }, { status: 500 });
  }
}
