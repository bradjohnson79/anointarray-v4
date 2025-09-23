

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { callConvex } from '@/lib/convexHttp';

export const dynamic = 'force-dynamic';

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '') // Remove special characters but keep spaces and hyphens
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
    .replace(/(^-|-$)/g, '') || 'product'; // Remove leading/trailing hyphens, fallback to 'product'
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();

    // Get products via Convex and filter those missing slugs
    const all: any[] = await callConvex({ functionPath: 'products:list', args: {} });
    const productsWithoutSlugs = (all || []).filter((p:any)=> !p.slug);

    const updatedProducts = [];

    for (const product of productsWithoutSlugs) {
      let baseSlug = generateSlug(product.name);
      let finalSlug = baseSlug;
      let counter = 0;

      // Check for uniqueness
      // Ensure unique among existing convex slugs
      const existingSlugs = new Set((all || []).map((p:any)=> p.slug));
      while (existingSlugs.has(finalSlug)) { counter++; finalSlug = `${baseSlug}-${counter}`; }
      await callConvex({ functionPath: 'products:updateBySlug', args: { slug: product.slug || baseSlug, patch: { slug: finalSlug } as any } });
      updatedProducts.push({ id: product._id || product.slug, name: product.name, slug: finalSlug });
    }

    return NextResponse.json({
      success: true,
      message: `Generated slugs for ${updatedProducts.length} products`,
      updatedProducts,
    });

  } catch (error) {
    console.error('Error generating slugs:', error);
    return NextResponse.json(
      { error: 'Failed to generate slugs' },
      { status: 500 }
    );
  }
}
