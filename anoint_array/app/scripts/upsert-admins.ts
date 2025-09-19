import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { createClient } from '@supabase/supabase-js';

function adminClient() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  if (!url || !key) throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  return createClient(url, key);
}

type AdminSeed = { email: string; name: string; role?: 'ADMIN'|'USER'; password?: string };

const targets: AdminSeed[] = [
  { email: 'bradjohnson79@gmail.com', name: 'Brad Johnson', role: 'ADMIN', password: 'Admin123' },
  { email: 'breanne@aetherx.co', name: 'Breanne Desrochers', role: 'ADMIN', password: 'Admin123' },
];

async function upsertAdmin(t: AdminSeed) {
  const email = t.email.trim().toLowerCase();
  const name = t.name.trim();
  const role = t.role || 'ADMIN';
  const s = adminClient();
  const { data: existing } = await s.from('users').select('id, email').eq('email', email).maybeSingle();
  if (existing) {
    const { data: updated } = await s
      .from('users')
      .update({ name, role, isActive: true })
      .eq('email', email)
      .select('id, email, role, isActive, name')
      .single();
    return { action: 'updated', user: updated };
  }
  const hash = await bcrypt.hash(t.password || 'Admin123', 12);
  const { data: created } = await s
    .from('users')
    .insert({ email, name, password: hash, role, isActive: true })
    .select('id, email, role, isActive, name')
    .single();
  return { action: 'created', user: created };
}

async function main() {
  const results = [] as any[];
  for (const t of targets) {
    results.push(await upsertAdmin(t));
  }
  console.log(JSON.stringify({ ok: true, results }, null, 2));
}

main()
  .catch((e) => { console.error(e); process.exit(1); });
