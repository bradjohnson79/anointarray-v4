
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { readdir, stat } from 'fs/promises';
import path from 'path';
import { getConfig } from '@/lib/app-config';
import { createS3Client, getBucketConfig } from '@/lib/aws-config';
import { ListObjectsV2Command, ListObjectsV2CommandOutput } from '@aws-sdk/client-s3';
import { getPublicUrl } from '@/lib/s3';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    // Only authenticated admins can access file manager
    if (!session || session.user?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Match storage mode with lib/s3.ts
    const useLocalFallback = !process.env.AWS_ACCESS_KEY_ID || process.env.NODE_ENV === 'development';

    if (useLocalFallback) {
      // Local filesystem mode (e.g., dev): read from writable/uploads
      const cfg = await getConfig<any>('generator-config');
      const writable = process.env.WRITABLE_DIR || cfg?.system?.writableDir || '/tmp';
      const uploadsDir = path.join(writable, 'uploads');

      try {
        const files = await readdir(uploadsDir);

        const imageExtensions = ['.jpg', '.jpeg', '.png'];
        const imageFiles: Array<{ filename: string; originalName: string; url: string; size: number; uploadedAt: string }>= [];

        for (const file of files) {
          const ext = path.extname(file).toLowerCase();
          if (!imageExtensions.includes(ext)) continue;

          const filePath = path.join(uploadsDir, file);
          const stats = await stat(filePath);

          imageFiles.push({
            filename: file,
            originalName: file,
            url: `/api/files/uploads/${file}`,
            size: stats.size,
            uploadedAt: stats.mtime.toISOString(),
          });
        }

        imageFiles.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());

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
      } catch (error) {
        console.error('S3 list error:', error);
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
