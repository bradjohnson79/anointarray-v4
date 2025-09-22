import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { requireAdmin } from '@/lib/supabase-auth';
import { createSupabaseAdminClient } from '@/lib/supabaseClient';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const FILE = path.join(process.cwd(), 'data', 'service-settings.json');

export async function POST(req: Request) {
  const internal = process.env.MIGRATION_TOKEN && (req.headers.get('x-internal-token') === process.env.MIGRATION_TOKEN);
  if (!internal) { try { await requireAdmin(); } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); } }
  try {
    const s = createSupabaseAdminClient();
    const bucket = process.env.SUPABASE_CONFIGS_BUCKET || 'configs';
    const paths = ['configs/service-settings.json', 'service-settings.json'];
    let text: string | null = null; let used: string | null = null;
    for (const p of paths) {
      const dl = await s.storage.from(bucket).download(p);
      if (dl.data && !dl.error) {
        if (typeof (dl.data as any).text === 'function') text = await (dl.data as any).text();
        else if (typeof (dl.data as any).arrayBuffer === 'function') {
          const buf = Buffer.from(await (dl.data as any).arrayBuffer()); text = buf.toString('utf8');
        }
        used = p; break;
      }
    }
    if (!text) return NextResponse.json({ error: 'No service settings snapshot found in Supabase' }, { status: 404 });
    const parsed = JSON.parse(text);
    const clean = {
      basic: { price: Number(parsed?.basic?.price ?? 35), description: String(parsed?.basic?.description ?? '') },
      full: { price: Number(parsed?.full?.price ?? 98), description: String(parsed?.full?.description ?? '') },
      environmental: { price: Number(parsed?.environmental?.price ?? 143), description: String(parsed?.environmental?.description ?? '') },
    } as any;
    await fs.mkdir(path.dirname(FILE), { recursive: true });
    await fs.writeFile(FILE, JSON.stringify(clean, null, 2), 'utf8');
    return NextResponse.json({ ok: true, source: `${bucket}/${used}` });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Restore service descriptions failed' }, { status: 500 });
  }
}

