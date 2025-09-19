

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/supabase-auth';
import { createSupabaseAdminClient } from '@/lib/supabaseClient';

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

    // Get all products that have empty slugs
    const supabase = createSupabaseAdminClient();
    const { data: productsWithoutSlugs, error } = await supabase
      .from('products')
      .select('id, name, slug')
      .eq('slug', '');
    if (error) throw error;

    const updatedProducts = [];

    for (const product of productsWithoutSlugs) {
      let baseSlug = generateSlug(product.name);
      let finalSlug = baseSlug;
      let counter = 0;

      // Check for uniqueness
      while (true) {
        const { data: existingProduct } = await supabase
          .from('products')
          .select('id')
          .eq('slug', finalSlug)
          .maybeSingle();

        if (!existingProduct || existingProduct.id === product.id) break;
        
        counter++;
        finalSlug = `${baseSlug}-${counter}`;
      }

      // Update the product with the new slug
      const { data: updatedProduct, error: uErr } = await supabase
        .from('products')
        .update({ slug: finalSlug })
        .eq('id', (product as any).id)
        .select('id, name, slug')
        .single();
      if (uErr) throw uErr;

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
