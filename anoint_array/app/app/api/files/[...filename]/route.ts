
import { NextRequest, NextResponse } from 'next/server';
import { withApiErrorHandlingCtx } from '@/lib/api-handler';
import { BadRequestError, NotFoundError } from '@/lib/http-errors';
import { readFile } from 'fs/promises';
import { getConfig } from '@/lib/app-config';
import path from 'path';
import { existsSync } from 'fs';

export const dynamic = 'force-dynamic';

interface RouteParams {
  params: {
    filename: string[];
  };
}

async function handler(request: NextRequest, { params }: RouteParams) {
  const filename = params.filename.join('/');
  try { console.log('[files] request', { filename, url: request.url }); } catch {}
    
    // Security: Prevent directory traversal
  if (filename.includes('..')) {
    throw new BadRequestError('Invalid filename');
  }

    // Resolve against several known locations
    const cfg = await getConfig<any>('generator-config');
    const writableBase = process.env.WRITABLE_DIR || cfg?.system?.writableDir || '/tmp';
    // Normalize helpful prefixes for local assets
    const cleanUploads = filename.replace(/^uploads\//, '');
    const cleanAssets = filename.replace(/^assets\/product-images\//, '');
    const cleanTmp = filename.replace(/^tmp\//, '');

    const candidates = [
      // Direct resolution using provided key under writable dir
      // If URL starts with tmp/..., resolve under writable base without duplicating tmp
      path.join(writableBase, cleanTmp),
      // Local uploads (repo)
      path.join(process.cwd(), 'uploads', cleanUploads),
      // Preferred product images location
      path.join(process.cwd(), 'assets', 'product-images', cleanAssets),
      // Some historical/case variants
      path.join(process.cwd(), '..', '..', 'Uploads', cleanUploads),
      path.join(process.cwd(), '..', 'Uploads', cleanUploads),
      // Public fallback
      path.join(process.cwd(), 'public', filename),
    ];
  try { console.log('[files] candidates', candidates); } catch {}
  let filePath = candidates.find(p => existsSync(p));
  let fileBuffer: Buffer | null = null;
  if (!filePath) {
    // Fallback to Supabase Storage if local candidates missing
    try {
      const { createSupabaseServerClient, PRODUCT_IMAGES_BUCKET } = await import('@/lib/supabase-server');
      const supabase = createSupabaseServerClient();
      const tryKeys = [filename, cleanUploads, cleanAssets].filter(Boolean);
      try { console.log('[files] supabase.tryKeys', tryKeys, 'bucket', PRODUCT_IMAGES_BUCKET); } catch {}
      let dl: any = null;
      for (const key of tryKeys) {
        const { data, error } = await supabase.storage.from(PRODUCT_IMAGES_BUCKET).download(key);
        if (!error && data) { dl = data; break; }
        if (error) { try { console.warn('[files] supabase.download error', key, error?.message || error); } catch {} }
      }
      if (dl) {
        const ab = await (dl as any).arrayBuffer();
        fileBuffer = Buffer.from(ab);
        try { console.log('[files] served-from', 'supabase'); } catch {}
      } else {
        throw new NotFoundError('File not found');
      }
    } catch (e) {
      if (e instanceof NotFoundError) throw e;
      try { const msg = (e as any)?.message || String(e); console.warn('[files] supabase fetch failed', msg); } catch {}
      throw new NotFoundError('File not found');
    }
  }

    // Read file if resolved locally
    if (!fileBuffer) { fileBuffer = await readFile(filePath!); try { console.log('[files] served-from', 'local', filePath); } catch {} }
    
    // Determine content type based on file extension
    const extension = path.extname(filename).toLowerCase();
    let contentType = 'application/octet-stream';
    
    switch (extension) {
      case '.jpg':
      case '.jpeg':
        contentType = 'image/jpeg';
        break;
      case '.png':
        contentType = 'image/png';
        break;
      case '.gif':
        contentType = 'image/gif';
        break;
      case '.webp':
        contentType = 'image/webp';
        break;
      case '.svg':
        contentType = 'image/svg+xml';
        break;
      case '.pdf':
        contentType = 'application/pdf';
        break;
    }

    // Return file with proper headers
  return new NextResponse(fileBuffer, {
    headers: {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=31536000',
    },
  });
}

export const GET = withApiErrorHandlingCtx<RouteParams>(handler, '/api/files/[...filename]');
