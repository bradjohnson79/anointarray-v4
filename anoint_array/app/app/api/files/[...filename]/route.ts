
import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import path from 'path';
import { existsSync } from 'fs';

export const dynamic = 'force-dynamic';

interface RouteParams {
  params: {
    filename: string[];
  };
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const filename = params.filename.join('/');
    
    // Security: Prevent directory traversal
    if (filename.includes('..')) {
      return NextResponse.json({ error: 'Invalid filename' }, { status: 400 });
    }

    // Resolve against several known locations
    const candidates = [
      path.join(process.cwd(), 'uploads', filename), // app-local uploads
      path.join(process.cwd(), '..', '..', 'Uploads', filename), // repo root 'Uploads' (capital U)
      path.join(process.cwd(), '..', 'Uploads', filename), // fallback in case cwd differs
      path.join(process.cwd(), 'public', filename), // allow serving baked-in public assets
    ];
    const filePath = candidates.find(p => existsSync(p));
    if (!filePath) return NextResponse.json({ error: 'File not found' }, { status: 404 });

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
        'Cache-Control': 'public, max-age=31536000', // Cache for 1 year
      },
    });

  } catch (error) {
    console.error('Error serving file:', error);
    return NextResponse.json(
      { error: 'Failed to serve file' },
      { status: 500 }
    );
  }
}
