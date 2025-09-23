import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { runConvex } from '@/lib/convexCli';
import { createS3Client, getBucketConfig } from '@/lib/aws-config';
import { PutObjectCommand } from '@aws-sdk/client-s3';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function isS3Url(u: string) {
  try { const x = new URL(u); return /amazonaws\.com|127\.0\.0\.1|localhost/i.test(x.hostname) || !!process.env.AWS_ENDPOINT_URL; } catch { return false; }
}

function guessContentType(name: string) {
  const n = name.toLowerCase();
  if (n.endsWith('.jpg') || n.endsWith('.jpeg')) return 'image/jpeg';
  if (n.endsWith('.png')) return 'image/png';
  if (n.endsWith('.webp')) return 'image/webp';
  return 'application/octet-stream';
}

function filenameFromUrl(url: string) {
  try { const u = new URL(url); const parts = u.pathname.split('/'); const last = parts[parts.length-1] || 'image'; return last.split('?')[0]; } catch { return 'image'; }
}

export async function POST(req: Request) {
  try {
    await requireAdmin();
    const s3 = createS3Client();
    const { bucketName, folderPrefix } = getBucketConfig();
    const body = await req.json().catch(()=>({}));
    const limit = Number(body?.limit || 1000);
    const dry = !!body?.dry;

    let list: any[] = [];
    try { list = await runConvex<any>('products:list', {}); } catch { list = []; }
    if (!Array.isArray(list)) list = [];
    let migrated = 0, skipped = 0, errors: string[] = [];
    for (const p of list.slice(0, limit)) {
      const slug = String(p.slug || 'item');
      const urls: string[] = [];
      if (p.imageUrl) urls.push(p.imageUrl);
      if (Array.isArray(p.imageGallery)) urls.push(...p.imageGallery);
      if (urls.length === 0) { skipped++; continue; }
      const newUrls: string[] = [];
      for (const u of urls) {
        if (!u || isS3Url(u)) { newUrls.push(u); continue; }
        try {
          const resp = await fetch(u);
          if (!resp.ok) throw new Error('download ' + resp.status);
          const buf = Buffer.from(await resp.arrayBuffer());
          const name = filenameFromUrl(u);
          const key = `${folderPrefix.replace(/\/?$/, '/')}${slug}/${name}`;
          if (!dry) {
            await s3.send(new PutObjectCommand({ Bucket: bucketName, Key: key, Body: buf, ContentType: guessContentType(name), ACL: 'public-read' as any }));
          }
          const region = process.env.AWS_REGION || 'us-east-1';
          const base = process.env.AWS_ENDPOINT_URL ? process.env.AWS_ENDPOINT_URL.replace(/\/$/,'') : `https://${bucketName}.s3.${region}.amazonaws.com`;
          const publicUrl = `${base}/${key}`;
          newUrls.push(publicUrl);
        } catch (e: any) {
          errors.push(`${slug}: ${e?.message || String(e)}`);
        }
      }
      if (!dry) {
        const imageUrl = newUrls[0] || null;
        const imageGallery = newUrls.slice(1);
        await runConvex('products:updateImages', { slug, imageUrl, imageGallery });
      }
      migrated++;
    }
    return NextResponse.json({ ok: true, migrated, skipped, errors });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Migration failed' }, { status: 500 });
  }
}

