

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

interface RouteParams {
  params: {
    id: string;
  };
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { searchParams } = new URL(request.url);
    const isAdmin = searchParams.get('admin') === 'true';

    // Check admin authentication if admin flag is set
    if (isAdmin) {
      const session = await getServerSession(authOptions);
      if (!session || session.user?.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
      }
    }

    const product = await prisma.product.findUnique({
      where: { id: params.id },
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
        // Customs & Compliance
        hsCode: true,
        countryOfOrigin: true,
        customsDescription: true,
        defaultCustomsValueCad: true,
        massGrams: true,
        createdAt: true,
        updatedAt: true,
        variants: {
          select: { id: true, style: true, price: true, quantity: true, sku: true }
        }
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
      youtubeUrl: null, // Add this field for frontend compatibility
      defaultCustomsValueCad: (product as any).defaultCustomsValueCad != null ? Number((product as any).defaultCustomsValueCad) : null,
      variants: product.variants?.map((v: any) => ({ ...v, price: Number(v.price) })) || [],
    };

    return NextResponse.json(serializedProduct);

  } catch (error) {
    console.error('Error fetching product:', error);
    return NextResponse.json(
      { error: 'Failed to fetch product' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    
    const {
      name,
      teaserDescription,
      fullDescription,
      price,
      category,
      isVip,
      inStock,
      isPhysical,
      isDigital,
      featured,
      comingSoon,
      imageUrl,
      imageGallery,
      videoEmbedCode,
      inventory,
      weight,
      dimensions,
      digitalFileUrl,
      instructionManualUrl,
      variants,
      // Customs & Compliance
      hsCode,
      countryOfOrigin,
      customsDescription,
      defaultCustomsValueCad,
      massGrams,
    } = body;

    // Build update data object
    const updateData: any = {};
    
    if (name !== undefined) {
      updateData.name = name;
      
      // Regenerate slug when name changes
      let baseSlug = name
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s-]/g, '') // Remove special characters but keep spaces and hyphens
        .replace(/\s+/g, '-') // Replace spaces with hyphens
        .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
        .replace(/(^-|-$)/g, '') || 'product'; // Remove leading/trailing hyphens, fallback to 'product'

      // Check for uniqueness
      let finalSlug = baseSlug;
      let counter = 0;
      while (true) {
        const existingProduct = await prisma.product.findUnique({
          where: { slug: finalSlug },
          select: { id: true },
        });

        if (!existingProduct || existingProduct.id === params.id) break;
        
        counter++;
        finalSlug = `${baseSlug}-${counter}`;
      }
      
      updateData.slug = finalSlug;
    }
    if (teaserDescription !== undefined) updateData.teaserDescription = teaserDescription;
    if (fullDescription !== undefined) updateData.fullDescription = fullDescription;
    if (price !== undefined) updateData.price = price;
    if (category !== undefined) updateData.category = category;
    if (isVip !== undefined) updateData.isVip = isVip;
    if (inStock !== undefined) updateData.inStock = inStock;
    if (isPhysical !== undefined) updateData.isPhysical = isPhysical;
    if (isDigital !== undefined) updateData.isDigital = isDigital;
    if (featured !== undefined) updateData.featured = featured;
    if (comingSoon !== undefined) updateData.comingSoon = comingSoon;
    if (imageUrl !== undefined) updateData.imageUrl = imageUrl;
    if (inventory !== undefined) updateData.inventory = inventory;
    if (weight !== undefined) updateData.weight = weight;
    if (dimensions !== undefined) updateData.dimensions = dimensions;
    if (digitalFileUrl !== undefined) updateData.digitalFileUrl = digitalFileUrl;
    if (instructionManualUrl !== undefined) updateData.instructionManualUrl = instructionManualUrl;
    if (videoEmbedCode !== undefined) updateData.videoEmbedCode = videoEmbedCode;
    // Customs & Compliance
    if (hsCode !== undefined) updateData.hsCode = hsCode;
    if (countryOfOrigin !== undefined) updateData.countryOfOrigin = countryOfOrigin;
    if (customsDescription !== undefined) updateData.customsDescription = customsDescription;
    if (defaultCustomsValueCad !== undefined) updateData.defaultCustomsValueCad = Number(defaultCustomsValueCad);
    if (massGrams !== undefined) updateData.massGrams = Number(massGrams);
    
    // Process imageGallery
    if (imageGallery !== undefined && Array.isArray(imageGallery)) {
      const cleanedGallery = imageGallery.filter(url => url && typeof url === 'string' && url.trim() !== '');
      updateData.imageGallery = cleanedGallery;
    }

    // If variants array provided, replace the set atomically
    if (Array.isArray(variants)) {
      await prisma.$transaction([
        prisma.productVariant.deleteMany({ where: { productId: params.id } }),
        prisma.productVariant.createMany({
          data: variants
            .filter((v: any) => v && v.style && v.price != null)
            .map((v: any) => ({ productId: params.id, style: String(v.style), price: v.price, quantity: Number(v.quantity || 0), sku: v.sku || null })),
          skipDuplicates: true,
        }),
      ]);
    }

    const product = await prisma.product.update({
      where: { id: params.id },
      data: updateData,
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
        // Customs & Compliance
        hsCode: true,
        countryOfOrigin: true,
        customsDescription: true,
        defaultCustomsValueCad: true,
        massGrams: true,
        createdAt: true,
        updatedAt: true,
        variants: { select: { id: true, style: true, price: true, quantity: true, sku: true } }
      },
    });

    // Convert Decimal fields to numbers for JSON serialization
    const serializedProduct = {
      ...product,
      price: Number(product.price),
      weight: product.weight ? Number(product.weight) : null,
      youtubeUrl: null, // Add this field for frontend compatibility
      defaultCustomsValueCad: product.defaultCustomsValueCad != null ? Number(product.defaultCustomsValueCad) : null,
      variants: product.variants?.map((v: any) => ({ ...v, price: Number(v.price) })) || [],
    };

    return NextResponse.json(serializedProduct);

  } catch (error) {
    console.error('Error updating product:', error);
    return NextResponse.json(
      { error: 'Failed to update product' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    await prisma.product.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error deleting product:', error);
    return NextResponse.json(
      { error: 'Failed to delete product' },
      { status: 500 }
    );
  }
}
