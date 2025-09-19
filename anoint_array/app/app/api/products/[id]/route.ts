

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { createSupabaseServerClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

interface RouteParams {
  params: {
    id: string;
  };
}

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

    // Attempt to select including sortOrder; if column missing, fallback without it
    let product: any | null = null;
    const selectBase: any = {
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
      };
    const supabase = createSupabaseServerClient();
    const { data: rows, error } = await supabase
      .from('products')
      .select('*, variants(*)')
      .eq('id', params.id)
      .limit(1);
    if (error) throw new Error(error.message || 'Fetch failed');
    product = (rows && rows[0]) || null;

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    // Convert Decimal fields to numbers for JSON serialization
    const serializedProduct = {
      ...product,
      imageUrl: normalizeSupabasePublicUrl((product as any)?.imageUrl),
      imageGallery: Array.isArray((product as any)?.imageGallery)
        ? (product as any).imageGallery.map((u: string) => normalizeSupabasePublicUrl(u))
        : [],
      price: Number(product.price),
      weight: product.weight ? Number(product.weight) : null,
      sortOrder: Number((product as any).sortOrder ?? 9999),
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
      sortOrder,
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
    if (imageUrl !== undefined) updateData.imageUrl = normalizeSupabasePublicUrl(imageUrl);
    if (sortOrder !== undefined) updateData.sortOrder = Number(sortOrder);
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
      const cleanedGallery = imageGallery
        .filter(url => url && typeof url === 'string' && url.trim() !== '')
        .map((u: string) => normalizeSupabasePublicUrl(u));
      updateData.imageGallery = cleanedGallery;
    }

    // If variants array provided, replace the set atomically (typed transaction)
    const supabase2 = createSupabaseServerClient();
    if (Array.isArray(variants)) {
      function genSku(n: string, s?: string) {
          const base = (n || 'SKU').toUpperCase().replace(/[^A-Z0-9]+/g, '').slice(0, 8);
          const sty = (s || 'DEFAULT').toUpperCase().replace(/[^A-Z0-9]+/g, '').slice(0, 6);
          const rand = Math.random().toString(36).toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4);
          return [base, sty, rand].filter(Boolean).join('-');
      }
      // Replace variants: delete old, insert new
      await supabase2.from('product_variants').delete().eq('productId', params.id);
      const data = variants
        .filter((v: any) => v && v.style && v.price != null)
        .map((v: any) => ({
          productId: params.id,
          style: String(v.style),
          price: Number(v.price),
          quantity: Number.isFinite(Number(v.quantity)) ? Number(v.quantity) : 0,
          sku: (v.sku && String(v.sku).trim()) ? String(v.sku).trim() : genSku(name || '' , v.style),
        }));
      if (data.length) await supabase2.from('product_variants').insert(data);
    }

    const { data: upd, error: uErr } = await supabase2.from('products').update(updateData).eq('id', params.id).select('*, variants(*)').single();
    if (uErr) throw new Error(uErr.message || 'Update failed');

    // Convert Decimal fields to numbers for JSON serialization
    const serializedProduct = {
      ...upd,
      price: Number(product.price),
      weight: product.weight ? Number(product.weight) : null,
      sortOrder: Number((product as any).sortOrder ?? 9999),
      youtubeUrl: null, // Add this field for frontend compatibility
      defaultCustomsValueCad: (upd as any).defaultCustomsValueCad != null ? Number((upd as any).defaultCustomsValueCad) : null,
      variants: (upd as any).variants?.map((v: any) => ({ ...v, price: Number((v as any).price) })) || [],
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

    const { searchParams } = new URL(request.url);
    const force = searchParams.get('force') === 'true';

    // Only allow hard delete for known sample/mock products; all others must be archived
    const sampleNames = [
      'Harmonic Seal – Vitality',
      'Clarity Seal – Insight',
      'Guardian Array – Protection',
    ];
    const supabase = createSupabaseServerClient();
    const { data: current, error } = await supabase.from('products').select('id,name').eq('id', params.id).single();
    if (error && (error as any).code !== 'PGRST116') throw new Error(error.message || 'Fetch failed');
    if (!current) return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    const isSample = sampleNames.includes(current.name);
    if (!isSample) {
      return NextResponse.json({ error: 'Deletion disabled for live products. Use archive instead.' }, { status: 409 });
    }

    // For the three sample products, allow hard delete. If referenced by orders, need force=true.
    const { count: orderItemCount } = await supabase.from('order_items').select('id', { count: 'exact', head: true }).eq('productId', params.id);
    if (orderItemCount > 0 && !force) {
      return NextResponse.json(
        { error: `Sample product is referenced by ${orderItemCount} order item(s). Retry with ?force=true to remove related order items.` },
        { status: 409 }
      );
    }

    // Delete variants then (optional) order_items then product
    await supabase.from('product_variants').delete().eq('productId', params.id);
    if (force) await supabase.from('order_items').delete().eq('productId', params.id);
    await supabase.from('products').delete().eq('id', params.id);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting product:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to delete product' },
      { status: 500 }
    );
  }
}
