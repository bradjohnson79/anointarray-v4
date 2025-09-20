import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// load .env.local for convenience
const envLocal = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envLocal)) dotenv.config({ path: envLocal });

const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
if (!url || !key) throw new Error('Missing Supabase admin creds');
const s = createClient(url, key, { auth: { persistSession: false } });

async function main() {
  const email = (process.argv[2] || '').toLowerCase();
  if (!email) throw new Error('Usage: tsx scripts/check-user.ts user@example.com');
  const { data: row } = await s.from('users').select('id,email,role,isActive,name').eq('email', email).maybeSingle();
  console.log(JSON.stringify({ ok: true, user: row }, null, 2));
}

main().catch((e)=>{ console.error(e?.message || e); process.exit(1); });

