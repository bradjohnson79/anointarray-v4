import fs from 'fs';
import path from 'path';
import 'dotenv/config';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

function adminClient() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  if (!url || !key) throw new Error('Missing SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  return createClient(url, key, { auth: { persistSession: false } });
}

async function countAuthUsers() {
  const s = adminClient();
  let page = 1;
  const perPage = 1000;
  let total = 0;
  // Admin API: paginate through users to count
  // Note: If project has more than a few thousand users, consider Admin API `listUsers` total. Some SDK versions omit total count.
  // We'll accumulate until we get less than a page.
  for (;;) {
    const { data, error } = await s.auth.admin.listUsers({ page, perPage });
    if (error) throw new Error(`auth.admin.listUsers failed: ${error.message}`);
    const users = data?.users || [];
    total += users.length;
    if (users.length < perPage) break;
    page += 1;
  }
  return total;
}

async function countAppUsersTable() {
  const s = adminClient();
  const { count, error } = await s.from('users').select('*', { head: true, count: 'exact' });
  if (error) throw new Error(`table users count failed: ${error.message}`);
  return typeof count === 'number' ? count : 0;
}

async function main() {
  // Load .env.local if present (in addition to default .env)
  try {
    const envLocal = path.resolve(process.cwd(), '.env.local');
    if (fs.existsSync(envLocal)) dotenv.config({ path: envLocal });
  } catch {}
  const authCount = await countAuthUsers();
  const tableCount = await countAppUsersTable();
  console.log(JSON.stringify({ ok: true, auth_users: authCount, profile_rows: tableCount }, null, 2));
}

main().catch((e) => { console.error(JSON.stringify({ ok: false, error: e?.message || String(e) })); process.exit(1); });
