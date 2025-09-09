

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

interface RouteParams {
  params: {
    slug: string;
  };
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const product = await prisma.product.findUnique({
      where: { slug: params.slug },
      select: {
        id: true,
        name: true,
        slug: true,
        teaserDescription: true,
        fullDescription: true,
        price: true,
        category: true,
        isVip: true,
        inStock: true,
        isPhysical: true,
        isDigital: true,
        imageUrl: true,
        imageGallery: true,
        featured: true,
        comingSoon: true,
        inventory: true,
        weight: true,
        dimensions: true,
        digitalFileUrl: true,
        instructionManualUrl: true,
        videoEmbedCode: true,
        hsCode: true,
        countryOfOrigin: true,
        customsDescription: true,
        defaultCustomsValueCad: true,
        massGrams: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    // Convert Decimal fields to numbers for JSON serialization
    const serializedProduct = {
      ...product,
      price: Number(product.price),
      weight: product.weight ? Number(product.weight) : null,
      defaultCustomsValueCad: product.defaultCustomsValueCad ? Number(product.defaultCustomsValueCad) : null,
      youtubeUrl: null, // Add this field for frontend compatibility
    };

    return NextResponse.json(serializedProduct);

  } catch (error) {
    console.error('Error fetching product by slug:', error);
    return NextResponse.json(
      { error: 'Failed to fetch product' },
      { status: 500 }
    );
  }
}

