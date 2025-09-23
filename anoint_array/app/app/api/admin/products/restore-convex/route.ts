import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { runConvex } from '@/lib/convexCli';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: Request) {
  const internal = process.env.MIGRATION_TOKEN && (req.headers.get('x-internal-token') === process.env.MIGRATION_TOKEN);
  if (!internal) { try { await requireAdmin(); } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); } }
  try {
    if (!process.env.CONVEX_URL || !process.env.CONVEX_ADMIN_KEY) {
      return NextResponse.json({ error: 'Convex not configured (missing CONVEX_URL/CONVEX_ADMIN_KEY)' }, { status: 501 });
    }
    const fs = await import('fs/promises');
    const path = await import('path');
    const dir = path.join(process.cwd(), 'data', 'backups');
    const files = await fs.readdir(dir).catch(()=>[] as string[]);
    const backups = files.filter(n=> n.endsWith('.json')).sort((a,b)=> a > b ? -1 : 1);
    if (!backups.length) return NextResponse.json({ error: 'No backups found in data/backups' }, { status: 404 });
    const latest = backups[0];
    const text = await fs.readFile(path.join(dir, latest), 'utf-8').catch(()=> '');
    const snapshot = JSON.parse(text || '{}');
    const products = Array.isArray(snapshot?.products) ? snapshot.products : [];
    const out = await runConvex('products:importSnapshot', { products });
    return NextResponse.json({ ok: true, backup: latest, convex: out });
  } catch (e:any) {
    return NextResponse.json({ error: e?.message || 'Restore to Convex failed' }, { status: 500 });
  }
}
