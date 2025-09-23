import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import fs from 'fs/promises';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try { await requireAdmin(); } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }

  try {
    const dir = path.join(process.cwd(), 'data', 'service-orders');
    const files = await fs.readdir(dir).catch(() => []);
    const orders = [] as any[];
    for (const f of files) {
      if (!f.endsWith('.json')) continue;
      try {
        const raw = await fs.readFile(path.join(dir, f), 'utf-8');
        const data = JSON.parse(raw);
        orders.push(data);
      } catch {}
    }
    orders.sort((a: any,b: any)=> String(b.createdAt).localeCompare(String(a.createdAt)));
    return NextResponse.json({ orders });
  } catch (e) {
    return NextResponse.json({ error: 'Failed to load service orders' }, { status: 500 });
  }
}
