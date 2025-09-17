import { createClient, SupabaseClient } from '@supabase/supabase-js';

export function useSupabaseStorage(): boolean {
  return (
    process.env.USE_SUPABASE_STORAGE === '1' ||
    (!!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.SUPABASE_SERVICE_ROLE_KEY)
  );
}

export function createSupabaseServerClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  if (!url || !key) throw new Error('Supabase credentials missing');
  return createClient(url, key, { auth: { persistSession: false } });
}

export const PRODUCT_IMAGES_BUCKET = process.env.SUPABASE_PRODUCT_IMAGES_BUCKET || 'product-images';
export const CONFIGS_BUCKET = process.env.SUPABASE_CONFIGS_BUCKET || 'configs';
export const GLYPHS_BUCKET = process.env.SUPABASE_GLYPHS_BUCKET || 'glyphs';
