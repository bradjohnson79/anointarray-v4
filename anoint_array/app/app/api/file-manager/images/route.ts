
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { readdir, stat } from 'fs/promises';
import path from 'path';
// Avoid DB-backed config here; rely on env with sensible defaults.
import { createS3Client, getBucketConfig } from '@/lib/aws-config';
import { ListObjectsV2Command, ListObjectsV2CommandOutput } from '@aws-sdk/client-s3';
import { getPublicUrl } from '@/lib/s3';

export const dynamic = 'force-dynamic';

function shouldUseLocalFallback() {
  return (
    !process.env.AWS_ACCESS_KEY_ID ||
    process.env.NODE_ENV === 'development' ||
    process.env.FORCE_LOCAL_UPLOADS === '1'
  );
}

async function listLocalImages() {
  const explicit = process.env.LOCAL_UPLOADS_DIR;
  const writable = process.env.WRITABLE_DIR || '/tmp';
  const repoUploads = path.join(process.cwd(), 'uploads');
  const repoProducts = path.join(process.cwd(), 'assets', 'product-images');
  const candidates = [
    ...(explicit ? [explicit] : []),
    path.join(writable, 'uploads'),
    repoUploads,
    repoProducts,
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
          } else if (dir === repoProducts) prefix = 'assets/product-images';
          else if (dir === repoUploads || dir === path.join(writable, 'uploads')) prefix = 'uploads';
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
    const session = await getServerSession(authOptions);
    
    // Only authenticated admins can access file manager
    if (!session || session.user?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Match storage mode with lib/s3.ts
    const useLocalFallback = shouldUseLocalFallback();

    if (useLocalFallback) {
      try {
        const imageFiles = await listLocalImages();
        return NextResponse.json({ success: true, images: imageFiles, count: imageFiles.length });
      } catch (error) {
        console.error('Error reading uploads directory:', error);
        return NextResponse.json({ success: true, images: [], count: 0 });
      }
    } else {
      // S3 mode (e.g., production): list bucket objects under folderPrefix
      const s3 = createS3Client();
      const { bucketName, folderPrefix } = getBucketConfig();

      try {
        const imageExtensions = new Set(['.jpg', '.jpeg', '.png']);
        const imageFiles: Array<{ filename: string; originalName: string; url: string; size: number; uploadedAt: string }>= [];

        let ContinuationToken: string | undefined = undefined;
        do {
          const res: ListObjectsV2CommandOutput = await s3.send(
            new ListObjectsV2Command({
              Bucket: bucketName,
              Prefix: folderPrefix,
              ContinuationToken,
            })
          );

          for (const obj of res.Contents || []) {
            const key = obj.Key || '';
            if (!key || !key.startsWith(folderPrefix)) continue;
            const base = key.slice(folderPrefix.length);
            if (!base) continue;
            const ext = path.extname(base).toLowerCase();
            if (!imageExtensions.has(ext)) continue;

            imageFiles.push({
              filename: base,
              originalName: base,
              url: getPublicUrl(key),
              size: obj.Size || 0,
              uploadedAt: obj.LastModified ? new Date(obj.LastModified).toISOString() : new Date(0).toISOString(),
            });
          }

          ContinuationToken = res.IsTruncated ? res.NextContinuationToken : undefined;
        } while (ContinuationToken);

        imageFiles.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
        return NextResponse.json({ success: true, images: imageFiles, count: imageFiles.length });
      } catch (error: any) {
        console.error('S3 list error:', error);
        // If S3 fails (credentials, access), fallback to local so UI stays in sync with upload fallback
        const msg = String(error?.message || error || '');
        if (/InvalidAccessKeyId|SignatureDoesNotMatch|AccessDenied|UnknownEndpoint|CredentialsError|ExpiredToken/i.test(msg)) {
          const imageFiles = await listLocalImages();
          return NextResponse.json({ success: true, images: imageFiles, count: imageFiles.length, fallback: 'local' });
        }
        return NextResponse.json({ success: true, images: [], count: 0 });
      }
    }

  } catch (error) {
    console.error('Error fetching images:', error);
    return NextResponse.json(
      { error: 'Failed to fetch images' },
      { status: 500 }
    );
  }
}
