import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function nowStamp() {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    d.getFullYear() +
    pad(d.getMonth() + 1) +
    pad(d.getDate()) + '-' +
    pad(d.getHours()) +
    pad(d.getMinutes()) +
    pad(d.getSeconds())
  );
}

export async function GET(req: NextRequest) {
  try { await requireAdmin(); } catch { return NextResponse.json({ error: 'Admin access required' }, { status: 403 }); }
  try {
    const { searchParams } = new URL(req.url);
    const dry = searchParams.get('dry') === '1' || searchParams.get('check') === '1';
    const { callConvex } = await import('@/lib/convexHttp');
    const products: any[] = await callConvex({ functionPath: 'products:list', args: {} });
    const snapshot = { exportedAt: new Date().toISOString(), count: (products || []).length, products } as any;

    // In dry mode, just return counts to test permissions
    if (dry) {
      return NextResponse.json({ ok: true, count: snapshot.count });
    }

    const fs = await import('fs/promises');
    const pathMod = await import('path');
    const dir = pathMod.join(process.cwd(), 'data', 'backups');
    await fs.mkdir(dir, { recursive: true });
    const filename = `products-${nowStamp()}.json`;
    const fullPath = pathMod.join(dir, filename);
    await fs.writeFile(fullPath, JSON.stringify(snapshot, null, 2), 'utf8');
    return NextResponse.json({ ok: true, count: snapshot.count, path: fullPath });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Backup failed' }, { status: 500 });
  }
}
