import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { createSupabaseServerClient, useSupabaseStorage, PRODUCT_IMAGES_BUCKET } from '@/lib/supabase-server';
import { readdir, readFile, stat } from 'fs/promises';
import path from 'path';

export const dynamic = 'force-dynamic';

async function enumerateLocal(): Promise<Array<{ name: string; fullPath: string; size: number }>> {
  const explicit = process.env.LOCAL_UPLOADS_DIR;
  const writable = process.env.WRITABLE_DIR || '/tmp';
  const roots = [
    ...(explicit ? [explicit] : []),
    path.join(process.cwd(), 'assets', 'product-images'),
    path.join(process.cwd(), 'uploads', 'product-images'),
    path.join(process.cwd(), 'uploads'),
    path.join(writable, 'uploads', 'product-images'),
    path.join(writable, 'uploads'),
  ];
  const exts = new Set(['.jpg', '.jpeg', '.png']);
  const seen = new Map<string, { name: string; fullPath: string; size: number; mtime: number }>();
  for (const dir of roots) {
    try {
      const names = await readdir(dir);
      for (const n of names) {
        const ext = path.extname(n).toLowerCase();
        if (!exts.has(ext)) continue;
        const p = path.join(dir, n);
        try {
          const s = await stat(p);
          const prev = seen.get(n);
          if (!prev || s.mtimeMs > prev.mtime) seen.set(n, { name: n, fullPath: p, size: s.size, mtime: s.mtimeMs });
        } catch {}
      }
    } catch {}
  }
  return Array.from(seen.values()).map(v => ({ name: v.name, fullPath: v.fullPath, size: v.size }));
}

export async function POST(request: NextRequest) {
  try { await requireAdmin(); } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }
  if (!useSupabaseStorage()) return NextResponse.json({ error: 'Supabase storage not configured' }, { status: 400 });

  const supabase = createSupabaseServerClient();
  const locals = await enumerateLocal();
  const results: Array<{ filename: string; status: 'uploaded' | 'failed'; url?: string; error?: string }>= [];
  for (const item of locals) {
    try {
      const buffer = await readFile(item.fullPath);
      const { error } = await supabase.storage.from(PRODUCT_IMAGES_BUCKET).upload(item.name, buffer, { upsert: true });
      if (error) throw error;
      const signed = await supabase.storage.from(PRODUCT_IMAGES_BUCKET).createSignedUrl(item.name, 3600);
      const publicUrl = supabase.storage.from(PRODUCT_IMAGES_BUCKET).getPublicUrl(item.name).data.publicUrl;
      const url = signed.data?.signedUrl || publicUrl;
      results.push({ filename: item.name, status: 'uploaded', url });
    } catch (e: any) {
      results.push({ filename: item.name, status: 'failed', error: String(e?.message || e) });
    }
  }
  const uploaded = results.filter(r => r.status === 'uploaded').length;
  const failed = results.filter(r => r.status === 'failed').length;
  return NextResponse.json({ success: true, uploaded, failed, results, bucket: PRODUCT_IMAGES_BUCKET });
}
