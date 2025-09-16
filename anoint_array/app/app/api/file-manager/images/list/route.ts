
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

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    // Only authenticated admins can access file manager
    if (!session || session.user?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const useLocalFallback = !process.env.AWS_ACCESS_KEY_ID || process.env.NODE_ENV === 'development';

    if (useLocalFallback) {
      const writable = process.env.WRITABLE_DIR || '/tmp';
      const candidates = [
        path.join(writable, 'uploads'),
        path.join(process.cwd(), 'uploads'),
        path.join(process.cwd(), '..', 'Uploads'),
        path.join(process.cwd(), '..', '..', 'Uploads'),
      ];

      try {
        const imageExtensions = new Set(['.jpg', '.jpeg', '.png']);
        const fileMap = new Map<string, { size: number; mtime: Date }>();
        for (const dir of candidates) {
          try {
            const files = await readdir(dir);
            for (const f of files) {
              const ext = path.extname(f).toLowerCase();
              if (!imageExtensions.has(ext)) continue;
              try {
                const s = await stat(path.join(dir, f));
                const prev = fileMap.get(f);
                if (!prev || s.mtime > prev.mtime) fileMap.set(f, { size: s.size, mtime: s.mtime });
              } catch {}
            }
          } catch {}
        }
        const imageOptions: Array<{ value: string; label: string; filename: string; size: number; uploadedAt: string }>= [];
        for (const [file, meta] of fileMap) {
          imageOptions.push({
            value: `/api/files/uploads/${file}`,
            label: file,
            filename: file,
            size: meta.size,
            uploadedAt: meta.mtime.toISOString(),
          });
        }
        imageOptions.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
        return NextResponse.json({ success: true, options: imageOptions });
      } catch (error) {
        console.error('Error reading uploads directories:', error);
        return NextResponse.json({ success: true, options: [] });
      }
    } else {
      // S3 mode
      const s3 = createS3Client();
      const { bucketName, folderPrefix } = getBucketConfig();
      try {
        const imageExtensions = new Set(['.jpg', '.jpeg', '.png']);
        const imageOptions: Array<{ value: string; label: string; filename: string; size: number; uploadedAt: string }>= [];
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
            imageOptions.push({
              value: getPublicUrl(key),
              label: base,
              filename: base,
              size: obj.Size || 0,
              uploadedAt: obj.LastModified ? new Date(obj.LastModified).toISOString() : new Date(0).toISOString(),
            });
          }
          ContinuationToken = res.IsTruncated ? res.NextContinuationToken : undefined;
        } while (ContinuationToken);
        imageOptions.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
        return NextResponse.json({ success: true, options: imageOptions });
      } catch (error) {
        console.error('S3 list error:', error);
        return NextResponse.json({ success: true, options: [] });
      }
    }

  } catch (error) {
    console.error('Error fetching image options:', error);
    return NextResponse.json(
      { error: 'Failed to fetch image options' },
      { status: 500 }
    );
  }
}
