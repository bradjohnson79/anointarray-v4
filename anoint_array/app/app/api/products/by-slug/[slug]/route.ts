import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(_req: NextRequest, { params }: { params: { slug: string } }) {
  try {
    const slug = decodeURIComponent(params.slug);
    const p = await prisma.product.findUnique({
      where: { slug },
      select: {
        id: true, name: true, slug: true, teaserDescription: true, fullDescription: true,
        price: true, category: true, isVip: true, inStock: true, isPhysical: true, isDigital: true,
        featured: true, comingSoon: true, imageUrl: true, imageGallery: true, videoEmbedCode: true,
        inventory: true, weight: true, dimensions: true, digitalFileUrl: true, instructionManualUrl: true,
        createdAt: true, updatedAt: true,
        variants: { select: { id: true, style: true, price: true, quantity: true, sku: true } },
      }
    });
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

