import 'dotenv/config';
import path from 'path';
import fs from 'fs';
import { createSupabaseAdminClient } from '@/lib/supabaseClient';
import { callConvex } from '@/lib/convexHttp';

async function main() {
  // Try to load app/.env.local if present when running from repo root
  try {
    const candidates = [
      path.resolve(process.cwd(), '.env.local'),
      path.resolve(process.cwd(), 'app/.env.local'),
      path.resolve(process.cwd(), '../app/.env.local'),
    ];
    for (const p of candidates) {
      if (fs.existsSync(p)) {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        require('dotenv').config({ path: p });
        break;
      }
    }
  } catch {}

  // Allow SUPABASE_URL via NEXT_PUBLIC_SUPABASE_URL fallback
  process.env.SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabase = createSupabaseAdminClient();
  const bucket = process.env.SUPABASE_CONFIGS_BUCKET || 'configs';
  const prefix = 'backups';
  const list = await supabase.storage.from(bucket).list(prefix);
  if (list.error) throw new Error(list.error.message);
  const backups = (list.data || []).filter((f:any)=> String(f?.name||'').endsWith('.json')).sort((a:any,b:any)=> a.name > b.name ? -1 : 1);
  if (!backups.length) throw new Error('No backups found in configs/backups');
  const latest = backups[0].name as string;
  const dl = await supabase.storage.from(bucket).download(`${prefix}/${latest}`);
  if (dl.error || !dl.data) throw new Error(dl.error?.message || 'Download failed');
  const text = await (dl.data as any).text?.() || Buffer.from(await (dl.data as any).arrayBuffer()).toString('utf8');
  const snapshot = JSON.parse(text || '{}');
  const products = Array.isArray(snapshot?.products) ? snapshot.products : [];

  if (process.env.PRODUCE_JSON === '1') {
    const argsPath = process.env.ARGS_PATH || '/tmp/convex_products_args.json';
    const payload = { products } as any;
    fs.writeFileSync(argsPath, JSON.stringify(payload));
    console.log(JSON.stringify({ ok: true, backup: latest, argsPath, count: products.length }, null, 2));
    return;
  }
  if (!process.env.CONVEX_URL || !(process.env.CONVEX_ADMIN_KEY || process.env.CONVEX_TEAM_ACCESS_TOKEN)) {
    throw new Error('Convex not configured (missing CONVEX_URL and admin/team token)');
  }
  const out = await callConvex({ functionPath: 'products:importSnapshot', args: { products } });
  console.log(JSON.stringify({ ok: true, backup: latest, count: out?.count ?? products.length }, null, 2));
}

main().catch((e)=>{ console.error(e?.message || e); process.exit(1); });
