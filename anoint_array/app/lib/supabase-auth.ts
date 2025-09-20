import { createServerClient } from '@supabase/ssr';
import { cookies, headers } from 'next/headers';
import { NextRequest } from 'next/server';

export type AuthUser = { id: string; email: string | null } | null;

export function getServerSupabaseClient() {
  const cookieStore = cookies();
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const anon = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  if (!url || !anon) throw new Error('Supabase URL/ANON key not configured');
  return createServerClient(url, anon, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      set(name: string, value: string, options: any) {
        cookieStore.set({ name, value, ...options });
      },
      remove(name: string, options: any) {
        cookieStore.set({ name, value: '', ...options });
      },
    },
  });
}

export async function getAuthUserFromRequest(req?: NextRequest): Promise<AuthUser> {
  try {
    const h = headers();
    const authHeader = h.get('Authorization') || (req?.headers?.get?.('Authorization') ?? null);
    const bearer = authHeader?.match(/^Bearer\s+(.+)$/i)?.[1];
    const supabase = getServerSupabaseClient();
    if (bearer) {
      const { data, error } = await supabase.auth.getUser(bearer);
      if (error) return null;
      return data.user ? { id: data.user.id, email: data.user.email || null } : null;
    }
    const { data } = await supabase.auth.getUser();
    return data.user ? { id: data.user.id, email: data.user.email || null } : null;
  } catch {
    return null;
  }
}

export async function requireUser(req?: NextRequest) {
  const u = await getAuthUserFromRequest(req);
  if (!u) throw new Error('Unauthorized');
  return u;
}

export async function requireAdmin(req?: NextRequest) {
  const u = await requireUser(req);
  const email = (u?.email || '').toLowerCase();
  if (!email) throw new Error('Unauthorized');
  // Check role in users table by email
  const { createSupabaseAdminClient } = await import('@/lib/supabaseClient');
  const s = createSupabaseAdminClient();
  const { data: row } = await s
    .from('users')
    .select('role, isActive')
    .eq('email', email)
    .maybeSingle();
  if (!row || (row as any).role !== 'ADMIN' || (row as any).isActive === false) {
    throw new Error('Forbidden');
  }
  return u;
}
