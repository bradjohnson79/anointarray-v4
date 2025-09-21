import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

try { const p = path.resolve(process.cwd(), '.env.local'); if (fs.existsSync(p)) dotenv.config({ path: p }); } catch {}

const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
if (!url || !key) { console.error('Missing SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY'); process.exit(1); }

const s = createClient(url, key, { auth: { persistSession: false } });
const bucket = process.env.SUPABASE_CONFIGS_BUCKET || 'configs';

(async () => {
  const list = await s.storage.from(bucket).list('backups');
  if (list.error) { console.error('List error:', list.error.message); process.exit(2); }
  const files = (list.data || []).filter((f:any)=> String(f?.name||'').endsWith('.json')).sort((a:any,b:any)=> a.name > b.name ? -1 : 1);
  if (!files.length) { console.error('No backups found under configs/backups'); process.exit(3); }
  const latest = files[0].name as string;
  const dl = await s.storage.from(bucket).download(`backups/${latest}`);
  if (dl.error || !dl.data) { console.error('Download error:', dl.error?.message || 'none'); process.exit(4); }
  const text = await (dl.data as any).text?.() || Buffer.from(await (dl.data as any).arrayBuffer()).toString('utf8');
  const snapshot = JSON.parse(text || '{}');
  const products = Array.isArray(snapshot?.products) ? snapshot.products : [];
  
  // Replace current data
  await s.from('product_variants').delete().neq('id','');
  await s.from('products').delete().neq('id','');

  if (products.length) {
    const bare = products.map((p:any)=> { const { variants, ...rest } = p; return rest; });
    const insP = await s.from('products').insert(bare);
    if (insP.error) { console.error('Insert products error:', insP.error.message); process.exit(5); }
    const allVars = products.flatMap((p:any)=> p.variants || []);
    for (let i=0;i<allVars.length;i+=500){
      const chunk = allVars.slice(i, i+500);
      const insV = await s.from('product_variants').insert(chunk);
      if (insV.error) { console.error('Insert variants error:', insV.error.message); process.exit(6); }
    }
  }
  console.log(JSON.stringify({ ok: true, restored: products.length, backup: latest }, null, 2));
})();

