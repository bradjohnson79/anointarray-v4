
import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { readdir, stat } from 'fs/promises';
import path from 'path';
// Supabase removed. Listing from local/uploads and assets directories.

export const dynamic = 'force-dynamic';

function shouldUseLocalFallback() { return true; }

async function listLocalImages() {
  const explicit = process.env.LOCAL_UPLOADS_DIR;
  const writable = process.env.WRITABLE_DIR || '/tmp';
  const repoUploads = path.join(process.cwd(), 'uploads');
  const repoProducts = path.join(process.cwd(), 'assets', 'product-images');
  const repoUploadsProducts = path.join(process.cwd(), 'uploads', 'product-images');
  const writableUploads = path.join(writable, 'uploads');
  const writableProducts = path.join(writable, 'uploads', 'product-images');
  const candidates = [
    ...(explicit ? [explicit] : []),
    writableUploads,
    writableProducts,
    repoUploads,
    repoProducts,
    repoUploadsProducts,
  ];
  const imageExtensions = new Set(['.jpg', '.jpeg', '.png']);
  type Meta = { size: number; mtime: Date; key: string };
  const fileMap = new Map<string, Meta>();
  for (const dir of candidates) {
    try {
      const files = await readdir(dir);
      for (const f of files) {
        const ext = path.extname(f).toLowerCase();
        if (!imageExtensions.has(ext)) continue;
        try {
          const s = await stat(path.join(dir, f));
          // Compute API key prefix per source
          let prefix = '';
          if (explicit && dir === explicit) {
            // Prefer assets/product-images semantic key when explicit path points there
            if (/assets\/(product-images|images)/.test(explicit)) prefix = 'assets/product-images';
            else prefix = 'uploads';
          } else if (dir === writableProducts) prefix = 'tmp/uploads/product-images';
          else if (dir === writableUploads) prefix = 'tmp/uploads';
          else if (dir === repoProducts) prefix = 'assets/product-images';
          else if (dir === repoUploadsProducts) prefix = 'uploads/product-images';
          else if (dir === repoUploads) prefix = 'uploads';
          const key = prefix ? `${prefix}/${f}` : f;
          const prev = fileMap.get(key);
          if (!prev || s.mtime > prev.mtime) fileMap.set(key, { size: s.size, mtime: s.mtime, key });
        } catch {}
      }
    } catch {}
  }
  const imageFiles: Array<{ filename: string; originalName: string; url: string; size: number; uploadedAt: string }> = [];
  for (const [key, meta] of fileMap) {
    const originalName = key.split('/').pop() || key;
    imageFiles.push({
      filename: key, // include prefix so deletes work
      originalName,
      url: `/api/files/${key}`,
      size: meta.size,
      uploadedAt: meta.mtime.toISOString(),
    });
  }
  imageFiles.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
  return imageFiles;
}

export async function GET(request: NextRequest) {
  try {
    try { await requireAdmin(); } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }

    const imgs = await listLocalImages();
    return NextResponse.json({ success: true, images: imgs, count: imgs.length, mode: 'local' });

  } catch (error) {
    console.error('Error fetching images:', error);
    return NextResponse.json(
      { error: 'Failed to fetch images' },
      { status: 500 }
    );
  }
}
