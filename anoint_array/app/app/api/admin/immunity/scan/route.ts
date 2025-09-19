import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/supabase-auth';
import { createSupabaseAdminClient } from '@/lib/supabaseClient';
import fs from 'fs/promises';
import path from 'path';

export async function POST() {
  try { await requireAdmin(); } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }
  const base = process.env.NEXTAUTH_URL || 'http://localhost:3000';

  // Build target paths (public pages only)
  const staticPaths = ['/', '/auth/login', '/auth/signup'];
  let productPaths: string[] = [];
  try {
    const s = createSupabaseAdminClient();
    const { data: products } = await s.from('products').select('slug');
    productPaths = (products || []).map((p: any) => `/products/${p.slug}`);
  } catch {}

  const paths = [...new Set([...staticPaths, ...productPaths])];

  const results: { path: string; url: string; status: number | 'error'; ok: boolean }[] = [];
  for (const p of paths) {
    const url = `${base}${p}`;
    try {
      const res = await fetch(url, { method: 'GET' });
      results.push({ path: p, url, status: res.status, ok: res.ok });
    } catch (e) {
      results.push({ path: p, url, status: 'error', ok: false });
    }
  }

  const broken = results.filter(r => !r.ok);
  const summary = {
    scanned: results.length,
    ok: results.length - broken.length,
    broken: broken.length,
  };

  // Save report
  const report = { timestamp: new Date().toISOString(), base, results, summary };
  try {
    const dir = path.join(process.cwd(), 'data');
    try { await fs.access(dir); } catch { await fs.mkdir(dir, { recursive: true }); }
    await fs.writeFile(path.join(dir, 'immunity-report.json'), JSON.stringify(report, null, 2));
  } catch (e) { /* ignore */ }

  return NextResponse.json({ success: true, ...summary, report });
}
