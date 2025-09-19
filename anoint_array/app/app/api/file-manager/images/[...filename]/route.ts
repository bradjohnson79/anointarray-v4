import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/supabase-auth';
import { deleteFile } from '@/lib/s3';
import { getBucketConfig } from '@/lib/aws-config';
import { createSupabaseServerClient, useSupabaseStorage, PRODUCT_IMAGES_BUCKET } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

interface RouteParams {
  params: {
    filename: string[];
  };
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    try { await requireAdmin(); } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }

    const parts = params.filename || [];
    const key = parts.join('/');
    if (!key) return NextResponse.json({ error: 'Filename is required' }, { status: 400 });
    if (key.includes('..')) return NextResponse.json({ error: 'Invalid filename' }, { status: 400 });
    if (!/^[-a-zA-Z0-9_.\/]+$/.test(key)) return NextResponse.json({ error: 'Invalid filename' }, { status: 400 });

    const useSupabase = useSupabaseStorage();
    let success = false;
    if (useSupabase) {
      try {
        const supabase = createSupabaseServerClient();
        const { error } = await supabase.storage.from(PRODUCT_IMAGES_BUCKET).remove([key]);
        if (error) throw error;
        success = true;
      } catch (e) {
        success = false;
      }
    } else {
      const useLocal = !process.env.AWS_ACCESS_KEY_ID || process.env.NODE_ENV === 'development';
      const { folderPrefix } = getBucketConfig();
      const storageKey = useLocal ? key : `${folderPrefix}${key}`;
      success = await deleteFile(storageKey);
    }
    if (success) return NextResponse.json({ success: true });
    return NextResponse.json({ error: 'Failed to delete file' }, { status: 500 });
  } catch (error) {
    console.error('Error deleting file:', error);
    return NextResponse.json({ error: 'Failed to delete file' }, { status: 500 });
  }
}
