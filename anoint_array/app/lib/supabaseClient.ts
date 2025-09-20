import { createClient, SupabaseClient } from '@supabase/supabase-js';
// Note: In the browser, Next.js only inlines env vars when referenced statically
// (e.g., process.env.NEXT_PUBLIC_*). Dynamic indexing like process.env[name]
// will be undefined in the client bundle. Keep client-side reads static.

export function createSupabaseAdminClient(): SupabaseClient {
  // Prefer guardrail names, fall back to existing NEXT_PUBLIC_* for compatibility
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  if (!url || !key) throw new Error('Supabase admin credentials missing');
  return createClient(url, key, { auth: { persistSession: false } });
}

export function createSupabaseBrowserClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL as string | undefined;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string | undefined;
  if (!url) throw new Error('Missing env NEXT_PUBLIC_SUPABASE_URL');
  if (!key) throw new Error('Missing env NEXT_PUBLIC_SUPABASE_ANON_KEY');
  return createClient(url, key);
}

export type { SupabaseClient };
