
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

    const candidates = [
      // Direct resolution using provided key under writable dir
      path.join(writableBase, filename),
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
  const filePath = candidates.find(p => existsSync(p));
  if (!filePath) throw new NotFoundError('File not found');

    // Read file
    const fileBuffer = await readFile(filePath);
    
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
