import { createClient, SupabaseClient } from '@supabase/supabase-js';

function requireEnv(name: string): string {
  const v = process.env[name] || '';
  if (!v) throw new Error(`Missing env ${name}`);
  return v;
}

export function createSupabaseAdminClient(): SupabaseClient {
  // Prefer guardrail names, fall back to existing NEXT_PUBLIC_* for compatibility
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  if (!url || !key) throw new Error('Supabase admin credentials missing');
  return createClient(url, key, { auth: { persistSession: false } });
}

export function createSupabaseBrowserClient(): SupabaseClient {
  const url = requireEnv('NEXT_PUBLIC_SUPABASE_URL');
  const key = requireEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY');
  return createClient(url, key);
}

export type { SupabaseClient };

