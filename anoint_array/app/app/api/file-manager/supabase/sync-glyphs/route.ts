import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { createSupabaseServerClient, useSupabaseStorage, GLYPHS_BUCKET } from '@/lib/supabase-server';
import { readdir, readFile, stat } from 'fs/promises';
import path from 'path';

export const dynamic = 'force-dynamic';

async function enumerateGlyphs(): Promise<Array<{ name: string; fullPath: string; size: number }>> {
  const roots = [
    path.join(process.cwd(), 'uploads', 'glyphs'),
    path.join(process.cwd(), 'public', 'glyphs'),
    path.join(process.cwd(), 'data', 'ai-resources', 'glyphs'),
  ];
  const exts = new Set(['.png', '.jpg', '.jpeg', '.webp', '.svg']);
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

export async function POST(_req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user?.role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!useSupabaseStorage()) return NextResponse.json({ error: 'Supabase storage not configured' }, { status: 400 });

  const supabase = createSupabaseServerClient();
  const locals = await enumerateGlyphs();
  const results: Array<{ filename: string; status: 'uploaded' | 'failed'; error?: string }> = [];

  for (const item of locals) {
    try {
      const buffer = await readFile(item.fullPath);
      const { error } = await supabase.storage.from(GLYPHS_BUCKET).upload(item.name, buffer, { upsert: true, contentType: undefined });
      if (error) throw error;
      results.push({ filename: item.name, status: 'uploaded' });
    } catch (e: any) {
      results.push({ filename: item.name, status: 'failed', error: String(e?.message || e) });
    }
  }

  const uploaded = results.filter(r => r.status === 'uploaded').length;
  const failed = results.filter(r => r.status === 'failed').length;
  return NextResponse.json({ success: true, uploaded, failed, bucket: GLYPHS_BUCKET, results });
}

