
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { withApiErrorHandling } from '@/lib/api-handler';
import { BadRequestError, ForbiddenError, UnauthorizedError } from '@/lib/http-errors';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const revalidate = 0;

async function getHandler(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const featured = searchParams.get('featured');
    const admin = searchParams.get('admin');

    const where: any = {};
    
    if (category) {
      where.category = category;
    }
    
    if (featured === 'true') {
      where.featured = true;
    }

    // Build select dynamically; include variants only for admin view
    const select: any = {
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
      createdAt: true,
      updatedAt: true,
    };
    if (admin === 'true') {
      select.variants = { select: { id: true, style: true, price: true, quantity: true, sku: true } };
      // Include customs fields for admin editing
      (select as any).hsCode = true;
      (select as any).countryOfOrigin = true;
      (select as any).customsDescription = true;
      (select as any).defaultCustomsValueCad = true;
      (select as any).massGrams = true;
    }
    const products = await prisma.product.findMany({
      where,
      select,
      orderBy: [
        { featured: 'desc' },
        { createdAt: 'desc' }
      ]
    });

    // Convert Decimal fields to numbers for JSON serialization and add missing fields
    const processedProducts = products.map((product: any) => ({
      ...product,
      price: Number(product?.price || 0),
      weight: product?.weight ? Number(product.weight) : null,
      youtubeUrl: null, // Add this field for frontend compatibility
      ...(admin === 'true' ? { defaultCustomsValueCad: (product as any).defaultCustomsValueCad != null ? Number((product as any).defaultCustomsValueCad) : null } : {}),
      ...(admin === 'true' && (product as any).variants ? {
        variants: (product as any).variants.map((v: any) => ({
          ...v,
          price: Number(v.price),
        }))
      } : {}),
    }));

    // Return different format for admin vs public API
    if (admin === 'true') {
      return NextResponse.json(processedProducts);
    }

    return NextResponse.json({ success: true, products: processedProducts });
}

async function postHandler(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) throw new UnauthorizedError('Authentication required. Please log in.');
  if (session.user?.role !== 'ADMIN') throw new ForbiddenError('Admin privileges required');

  const body = await request.json();
    
    const {
      name,
      teaserDescription,
      fullDescription,
      price,
      category,
      isVip = false,
      inStock = true,
      isPhysical = true,
      isDigital = false,
      featured = false,
      comingSoon = false,
      imageUrl,
      imageGallery = [],
      videoEmbedCode,
      inventory,
      weight,
      dimensions,
      digitalFileUrl,
      instructionManualUrl,
      variants = [],
    } = body;

  if (!name || !teaserDescription || !price || !category) {
    throw new BadRequestError('Name, teaser description, price, and category are required');
  }

    // Auto-generate slug from name
    let slug = name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '') // Remove special characters but keep spaces and hyphens
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
      .replace(/(^-|-$)/g, ''); // Remove leading/trailing hyphens

    // Ensure slug is not empty
    if (!slug) {
      slug = 'product';
    }

    // Check if slug already exists and make it unique - only select necessary fields
    let slugCounter = 0;
    let finalSlug = slug;
    while (true) {
      const existingProduct = await prisma.product.findUnique({
        where: { slug: finalSlug },
        select: {
          id: true,
          slug: true,
        },
      });

      if (!existingProduct) break;
      
      slugCounter++;
      finalSlug = `${slug}-${slugCounter}`;
    }

    // Build the data object with only essential fields for database compatibility
    const toNumber = (v: any) => {
      const n = Number(v);
      return Number.isFinite(n) ? n : undefined;
    };

    const productData: any = {
      name,
      slug: finalSlug,
      teaserDescription,
      price: toNumber(price),
      category,
      isVip: isVip || false,
      inStock: inStock !== undefined ? inStock : true,
      featured: featured || false,
      comingSoon: comingSoon || false,
    };

    // Add optional fields only if they have values
    if (fullDescription) productData.fullDescription = fullDescription;
    if (imageUrl) productData.imageUrl = imageUrl;
    if (isPhysical !== undefined) productData.isPhysical = isPhysical;
    if (isDigital !== undefined) productData.isDigital = isDigital;
    
    // Process imageGallery - filter out empty strings and null values
    if (imageGallery && Array.isArray(imageGallery)) {
      const cleanedGallery = imageGallery.filter(url => url && typeof url === 'string' && url.trim() !== '');
      if (cleanedGallery.length > 0) {
        productData.imageGallery = cleanedGallery;
      }
    }
    
    if (inventory !== undefined && inventory !== null && toNumber(inventory) !== undefined) productData.inventory = toNumber(inventory);
    if (weight !== undefined && weight !== null && toNumber(weight) !== undefined) productData.weight = toNumber(weight);
    if (dimensions && (dimensions.length || dimensions.width || dimensions.height)) {
      productData.dimensions = dimensions;
    }
    if (digitalFileUrl) productData.digitalFileUrl = digitalFileUrl;
    if (instructionManualUrl) productData.instructionManualUrl = instructionManualUrl;
    if (videoEmbedCode) productData.videoEmbedCode = videoEmbedCode;
    // Customs & Compliance
    const hs = (body as any).hsCode;
    const origin = (body as any).countryOfOrigin;
    const cdesc = (body as any).customsDescription;
    const dcv = (body as any).defaultCustomsValueCad;
    const mgrams = (body as any).massGrams;
    if (hs) (productData as any).hsCode = String(hs);
    if (origin) (productData as any).countryOfOrigin = String(origin).toUpperCase();
    if (cdesc) (productData as any).customsDescription = String(cdesc);
    if (dcv != null && toNumber(dcv) !== undefined) (productData as any).defaultCustomsValueCad = toNumber(dcv);
    if (mgrams != null && toNumber(mgrams) !== undefined) (productData as any).massGrams = toNumber(mgrams);

    const product = await prisma.product.create({
      data: {
        ...productData,
        ...(Array.isArray(variants) && variants.length > 0 ? {
          variants: {
            create: variants
              .filter((v: any) => v && String(v.style || '').trim() && toNumber(v.price) !== undefined)
              .map((v: any) => ({
                style: String(v.style).trim(),
                price: toNumber(v.price),
                quantity: Number.isFinite(Number(v.quantity)) ? parseInt(String(v.quantity), 10) : 0,
                sku: v.sku && String(v.sku).trim() ? String(v.sku).trim() : null,
              }))
          }
        } : {}),
      },
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

    // Convert Decimal fields to numbers for JSON serialization and add missing fields for frontend compatibility
    const serializedProduct = {
      ...product,
      price: Number(product.price),
      weight: product.weight ? Number(product.weight) : null,
      youtubeUrl: null, // Add this field for frontend compatibility (not available in current DB)
      defaultCustomsValueCad: product.defaultCustomsValueCad != null ? Number(product.defaultCustomsValueCad) : null,
      variants: (product as any).variants?.map((v: any) => ({ ...v, price: Number(v.price) })) || [],
    };

  return NextResponse.json(serializedProduct, { status: 201 });
}

async function deleteHandler(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const clearAll = searchParams.get('clear_all');
    
    if (clearAll === 'true') {
      // Clear all products (for development/admin use)
      await prisma.product.deleteMany({});
      return NextResponse.json({ message: 'All products cleared successfully' });
    }
    
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
}

export const GET = withApiErrorHandling(getHandler, '/api/products');
export const POST = withApiErrorHandling(postHandler, '/api/products');
export const DELETE = withApiErrorHandling(deleteHandler, '/api/products');
