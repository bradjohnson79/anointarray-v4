
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { withApiErrorHandling } from '@/lib/api-handler';
import { BadRequestError, ForbiddenError, UnauthorizedError } from '@/lib/http-errors';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const revalidate = 0;

function normalizeSupabasePublicUrl(url: any): any {
  if (!url || typeof url !== 'string') return url;
  try {
    const u = new URL(url);
    if (u.hostname.includes('.supabase.co') && u.pathname.includes('/storage/v1/object/')) {
      // Convert any signed path to public and drop query params
      u.pathname = u.pathname.replace('/storage/v1/object/sign/', '/storage/v1/object/public/');
      u.search = '';
      return u.toString();
    }
  } catch {}
  return url;
}

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

    // Supabase-only implementation for both public and admin
    const { createSupabaseServerClient } = await import('@/lib/supabase-server');
    const supabase = createSupabaseServerClient();
    const baseCols = [
      'id','name','slug','teaserDescription','fullDescription','price','category','isVip','inStock','isPhysical','isDigital','imageUrl','imageGallery','featured','comingSoon','sortOrder','inventory','weight','dimensions','digitalFileUrl','instructionManualUrl','videoEmbedCode','createdAt','updatedAt'
    ];
    const adminCols = ['hsCode','countryOfOrigin','customsDescription','defaultCustomsValueCad','massGrams'];
    let cols = baseCols.join(',');
    if (admin === 'true') cols = cols + ',' + adminCols.join(',') + ',variants(*)';
    let q = supabase.from('products').select(cols);
    if (category) q = q.eq('category', category);
    if (featured === 'true') q = q.eq('featured', true);
    const { data, error } = await q.order('featured', { ascending: false }).order('sortOrder', { ascending: true }).order('createdAt', { ascending: false });
    if (error) throw error;
    let products: any[] = (data || []) as any[];

    // (Optional) order item counts could be added via a view/ RPC later.
    const countsMap: Record<string, number> = {};

    // Convert Decimal fields to numbers for JSON serialization and add missing fields
    const processedProducts = products.map((product: any) => ({
      ...product,
      imageUrl: normalizeSupabasePublicUrl(product?.imageUrl),
      imageGallery: Array.isArray(product?.imageGallery)
        ? product.imageGallery.map((u: string) => normalizeSupabasePublicUrl(u))
        : [],
      price: Number(product?.price || 0),
      weight: product?.weight ? Number(product.weight) : null,
      sortOrder: Number((product as any)?.sortOrder ?? 9999),
      youtubeUrl: null, // Add this field for frontend compatibility
      ...(admin === 'true' ? { orderItemCount: countsMap[product.id] || 0 } : {}),
      ...(admin === 'true' ? { defaultCustomsValueCad: (product as any).defaultCustomsValueCad != null ? Number((product as any).defaultCustomsValueCad) : null } : {}),
      ...(admin === 'true' && (product as any).variants ? {
        variants: (product as any).variants.map((v: any) => ({
          ...v,
          price: Number(v.price),
        }))
      } : {}),
    }));

    // Return different format for admin vs public API
    if (admin === 'true') return NextResponse.json(processedProducts);

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
      sortOrder,
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
      ...(toNumber(sortOrder) !== undefined ? { sortOrder: toNumber(sortOrder) } : {}),
    };

    // Add optional fields only if they have values
    if (fullDescription) productData.fullDescription = fullDescription;
    if (imageUrl) productData.imageUrl = normalizeSupabasePublicUrl(imageUrl);
    if (isPhysical !== undefined) productData.isPhysical = isPhysical;
    if (isDigital !== undefined) productData.isDigital = isDigital;
    
    // Process imageGallery - filter out empty strings and null values
    if (imageGallery && Array.isArray(imageGallery)) {
      const cleanedGallery = imageGallery
        .filter(url => url && typeof url === 'string' && url.trim() !== '')
        .map((u: string) => normalizeSupabasePublicUrl(u));
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

    function genSku(name: string, style?: string) {
      const base = (name || 'SKU').toUpperCase().replace(/[^A-Z0-9]+/g, '').slice(0, 8);
      const sty = (style || 'DEFAULT').toUpperCase().replace(/[^A-Z0-9]+/g, '').slice(0, 6);
      const rand = Math.random().toString(36).toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4);
      return [base, sty, rand].filter(Boolean).join('-');
    }

    const createVariants = Array.isArray(variants) && variants.length > 0
      ? variants
          .filter((v: any) => v && String(v.style || '').trim() && toNumber(v.price) !== undefined)
          .map((v: any) => ({
            style: String(v.style).trim(),
            price: toNumber(v.price),
            quantity: Number.isFinite(Number(v.quantity)) ? parseInt(String(v.quantity), 10) : 0,
            sku: v.sku && String(v.sku).trim() ? String(v.sku).trim() : genSku(name, v.style),
          }))
      : [{ style: 'Default', price: toNumber(price), quantity: toNumber(inventory) ?? 0, sku: genSku(name, 'DEFAULT') }];

    // Insert product via Supabase then variants
    const { createSupabaseServerClient } = await import('@/lib/supabase-server');
    const supabase = createSupabaseServerClient();
    const { data: created, error: cErr } = await supabase.from('products').insert(productData).select('*').single();
    if (cErr) throw new Error(cErr.message || 'Create failed');
    if (Array.isArray(createVariants) && createVariants.length) {
      const rows = createVariants.map((v: any) => ({ ...v, productId: created.id }));
      const { error: vErr } = await supabase.from('product_variants').insert(rows);
      if (vErr) throw new Error(vErr.message || 'Variants create failed');
    }

    // Convert Decimal fields to numbers for JSON serialization and add missing fields for frontend compatibility
    const serializedProduct = {
      ...product,
      price: Number(product.price),
      weight: product.weight ? Number(product.weight) : null,
      youtubeUrl: null, // Add this field for frontend compatibility (not available in current DB)
      defaultCustomsValueCad: product.defaultCustomsValueCad != null ? Number(product.defaultCustomsValueCad) : null,
      variants: (product as any).variants?.map((v: any) => ({ ...v, price: Number(v.price) })) || [],
    };

  return NextResponse.json(created, { status: 201 });
}

async function deleteHandler(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const clearAll = searchParams.get('clear_all');
  if (clearAll === 'true') {
    const { createSupabaseServerClient } = await import('@/lib/supabase-server');
    const supabase = createSupabaseServerClient();
    // Delete all variants then products (if cascade not defined)
    await supabase.from('product_variants').delete().neq('id', '');
    await supabase.from('products').delete().neq('id', '');
    return NextResponse.json({ message: 'All products cleared successfully' });
  }
  return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
}

export const GET = withApiErrorHandling(getHandler, '/api/products');
export const POST = withApiErrorHandling(postHandler, '/api/products');
export const DELETE = withApiErrorHandling(deleteHandler, '/api/products');
