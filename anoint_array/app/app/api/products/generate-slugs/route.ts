

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

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
    const session = await getServerSession(authOptions);
    
    if (!session || session.user?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Get all products that have empty slugs
    const productsWithoutSlugs = await prisma.product.findMany({
      where: {
        slug: '',
      },
      select: {
        id: true,
        name: true,
        slug: true,
      },
    });

    const updatedProducts = [];

    for (const product of productsWithoutSlugs) {
      let baseSlug = generateSlug(product.name);
      let finalSlug = baseSlug;
      let counter = 0;

      // Check for uniqueness
      while (true) {
        const existingProduct = await prisma.product.findUnique({
          where: { slug: finalSlug },
          select: { id: true },
        });

        if (!existingProduct || existingProduct.id === product.id) break;
        
        counter++;
        finalSlug = `${baseSlug}-${counter}`;
      }

      // Update the product with the new slug
      const updatedProduct = await prisma.product.update({
        where: { id: product.id },
        data: { slug: finalSlug },
        select: {
          id: true,
          name: true,
          slug: true,
        },
      });

      updatedProducts.push(updatedProduct);
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

