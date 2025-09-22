
import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/supabase-auth';
import { withApiErrorHandling } from '@/lib/api-handler';
import { BadRequestError } from '@/lib/http-errors';
import { runConvex } from '@/lib/convexCli';
import { callConvex } from '@/lib/convexHttp';

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

    // Convex-backed implementation
    const useConvex = !!process.env.CONVEX_URL;
    if (useConvex) {
      let list: any[] = [];
      try {
        const r = await runConvex<any>('products:list', {});
        list = Array.isArray(r) ? r : (Array.isArray((r as any)?.result) ? (r as any).result : []);
      } catch {
        const r = await callConvex({ functionPath: 'products:list', args: {} });
        list = Array.isArray(r) ? r : (Array.isArray((r as any)?.result) ? (r as any).result : []);
      }
      // Optional filters (category/featured not yet stored in Convex schema)
      let items = list;
      // If "featured" requested, return top 10 newest as a stand-in until Convex adds a featured flag
      if (featured === 'true') items = [...list].slice(0, 10);
      const processed = items.map((p: any) => ({
        id: String(p._id || p.id || p.slug),
        name: p.name,
        slug: p.slug,
        teaserDescription: p.teaserDescription || '',
        fullDescription: p.fullDescription || '',
        price: Number(p.price || 0),
        category: p.category || 'unclassified',
        isVip: !!p.isVip,
        inStock: p.inStock !== false,
        isPhysical: p.isPhysical !== false,
        isDigital: !!p.isDigital,
        featured: !!p.featured,
        comingSoon: !!p.comingSoon,
        imageUrl: p.imageUrl || null,
        imageGallery: Array.isArray(p.imageGallery) ? p.imageGallery : [],
        inventory: typeof p.inventory === 'number' ? p.inventory : null,
        sortOrder: typeof p.sortOrder === 'number' ? p.sortOrder : 9999,
        createdAt: p.createdAt || null,
        updatedAt: p.updatedAt || null,
      }));
      if (admin === 'true') return NextResponse.json(processed);
      return NextResponse.json({ success: true, products: processed });
    }

    // Legacy Supabase fallback (kept for local dev only)
    const { createSupabaseServerClient } = await import('@/lib/supabase-server');
    const supabase = createSupabaseServerClient();
    const baseCols = [
      'id','name','slug','teaserDescription','fullDescription','price','category','isVip','inStock','isPhysical','isDigital','imageUrl','imageGallery','featured','comingSoon','sortOrder','inventory','weight','dimensions','digitalFileUrl','instructionManualUrl','videoEmbedCode','createdAt','updatedAt'
    ];
    let cols = baseCols.join(',');
    let q = supabase.from('products').select(cols);
    if (category) q = q.eq('category', category);
    if (featured === 'true') q = q.eq('featured', true);
    const { data, error } = await q.order('featured', { ascending: false }).order('sortOrder', { ascending: true }).order('createdAt', { ascending: false });
    if (error) throw error;
    const products = (data || []).map((product: any) => ({
      ...product,
      imageUrl: normalizeSupabasePublicUrl(product?.imageUrl),
      imageGallery: Array.isArray(product?.imageGallery)
        ? product.imageGallery.map((u: string) => normalizeSupabasePublicUrl(u))
        : [],
      price: Number(product?.price || 0),
      sortOrder: Number((product as any)?.sortOrder ?? 9999),
      youtubeUrl: null,
    }));
    if (admin === 'true') return NextResponse.json(products);
    return NextResponse.json({ success: true, products });
}

async function postHandler(request: NextRequest) {
  await requireAdmin();

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
      const { createSupabaseServerClient } = await import('@/lib/supabase-server');
      const supabase = createSupabaseServerClient();
      const { data: existingProduct } = await supabase
        .from('products')
        .select('id, slug')
        .eq('slug', finalSlug)
        .maybeSingle();
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

    // Convex write path not yet implemented after Supabase removal
    return NextResponse.json({ error: 'Product creation via Convex not yet enabled' }, { status: 501 });
}

async function deleteHandler(request: NextRequest) {
  return NextResponse.json({ error: 'Not implemented for Convex' }, { status: 501 });
}

export const GET = withApiErrorHandling(getHandler, '/api/products');
export const POST = withApiErrorHandling(postHandler, '/api/products');
export const DELETE = withApiErrorHandling(deleteHandler, '/api/products');
