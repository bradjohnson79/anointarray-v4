
import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { createSupabaseServerClient, useSupabaseStorage, PRODUCT_IMAGES_BUCKET } from '@/lib/supabase-server';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
  try { await requireAdmin(); } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }

    if (!useSupabaseStorage()) {
      return NextResponse.json({ success: true, options: [], error: 'SUPABASE_NOT_CONFIGURED' });
    }

    const supabase = createSupabaseServerClient();
    const { data, error } = await supabase.storage.from(PRODUCT_IMAGES_BUCKET).list('', { limit: 1000, sortBy: { column: 'updated_at', order: 'desc' } });
    if (error) throw error;

    const imageExtensions = new Set(['.jpg', '.jpeg', '.png']);
    const options: Array<{ value: string; label: string; filename: string; size: number; uploadedAt: string }>= [];
    for (const obj of (data || [])) {
      const ext = path.extname(obj.name).toLowerCase();
      if (!imageExtensions.has(ext)) continue;
      const label = obj.name;
      // Always surface a stable, non‑expiring public URL for selection and storage
      const publicUrl = supabase.storage.from(PRODUCT_IMAGES_BUCKET).getPublicUrl(obj.name).data.publicUrl;
      const url = publicUrl;
      options.push({
        value: url,
        label,
        filename: obj.name,
        size: (obj as any).metadata?.size || 0,
        uploadedAt: obj.updated_at ? new Date(obj.updated_at).toISOString() : new Date().toISOString(),
      });
    }
    return NextResponse.json({ success: true, options, mode: 'supabase' });
  } catch (error) {
    console.error('Error fetching image options:', error);
    return NextResponse.json({ error: 'Failed to fetch image options' }, { status: 500 });
  }
}
