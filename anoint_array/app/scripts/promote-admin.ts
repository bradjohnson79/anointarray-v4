import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

function adminClient() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  if (!url || !key) throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  return createClient(url, key);
}

async function main() {
  const emailArg = process.argv[2] || '';
  const emailEnv = process.env.ADMIN_EMAIL || '';
  const email = (emailArg || emailEnv).trim().toLowerCase();
  if (!email) {
    console.error('Usage: pnpm tsx scripts/promote-admin.ts user@example.com');
    process.exit(2);
  }
  const supabase = adminClient();
  const { data: existing } = await supabase.from('users').select('id, email, role').eq('email', email).maybeSingle();
  if (!existing) {
    console.error(`No user found with email ${email}`);
    process.exit(3);
  }
  if ((existing as any).role === 'ADMIN') {
    console.log(`User ${email} is already ADMIN.`);
    return;
  }
  const { data: updated, error } = await supabase
    .from('users')
    .update({ role: 'ADMIN', isActive: true })
    .eq('email', email)
    .select('email')
    .single();
  if (error) throw error;
  console.log(`Promoted ${(updated as any).email} to ADMIN.`);
}
main().catch((e) => { console.error(e?.message || e); process.exit(1); });
