
import { NextRequest, NextResponse } from 'next/server';
import { withApiErrorHandling } from '@/lib/api-handler';
import { BadRequestError, NotFoundError } from '@/lib/http-errors';
import { readFile } from 'fs/promises';
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
    const candidates = [
      path.join(process.cwd(), 'uploads', filename), // app-local uploads
      path.join(process.cwd(), '..', '..', 'Uploads', filename), // repo root 'Uploads' (capital U)
      path.join(process.cwd(), '..', 'Uploads', filename), // fallback in case cwd differs
      path.join(process.cwd(), 'public', filename), // allow serving baked-in public assets
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

export const GET = withApiErrorHandling((req: NextRequest, ctx: RouteParams) => handler(req, ctx), '/api/files/[...filename]');
