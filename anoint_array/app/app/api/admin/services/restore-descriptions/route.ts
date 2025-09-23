import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { requireAdmin } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const FILE = path.join(process.cwd(), 'data', 'service-settings.json');

export async function POST(req: Request) {
  const internal = process.env.MIGRATION_TOKEN && (req.headers.get('x-internal-token') === process.env.MIGRATION_TOKEN);
  if (!internal) { try { await requireAdmin(); } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); } }
  try {
    let text: string | null = null;
    try { text = await fs.readFile(FILE, 'utf8'); } catch {}
    if (!text) return NextResponse.json({ error: 'No service settings snapshot found' }, { status: 404 });
    const parsed = JSON.parse(text);
    const clean = {
      basic: { price: Number(parsed?.basic?.price ?? 35), description: String(parsed?.basic?.description ?? '') },
      full: { price: Number(parsed?.full?.price ?? 98), description: String(parsed?.full?.description ?? '') },
      environmental: { price: Number(parsed?.environmental?.price ?? 143), description: String(parsed?.environmental?.description ?? '') },
    } as any;
    await fs.mkdir(path.dirname(FILE), { recursive: true });
    await fs.writeFile(FILE, JSON.stringify(clean, null, 2), 'utf8');
    return NextResponse.json({ ok: true, source: `file://${FILE}` });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Restore service descriptions failed' }, { status: 500 });
  }
}
