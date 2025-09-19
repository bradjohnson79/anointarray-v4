import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

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
  const session = await getServerSession(authOptions);
  if (!session || session.user?.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const products = await prisma.product.findMany({
      select: { id: true, imageUrl: true, imageGallery: true },
    });

    let updated = 0;
    for (const p of products) {
      const nextUrl = normalizeSupabasePublicUrl(p.imageUrl);
      const nextGallery = (Array.isArray(p.imageGallery) ? p.imageGallery : [])
        .map((u: any) => normalizeSupabasePublicUrl(u));
      const changed = nextUrl !== p.imageUrl || JSON.stringify(nextGallery) !== JSON.stringify(p.imageGallery || []);
      if (changed) {
        await prisma.product.update({
          where: { id: p.id },
          data: { imageUrl: nextUrl, imageGallery: nextGallery },
        });
        updated++;
      }
    }

    return NextResponse.json({ ok: true, updated });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed to repair image URLs' }, { status: 500 });
  }
}

