import { NextResponse } from 'next/server';
import { getAuthUserFromRequest } from '@/lib/supabase-auth';
import { createSupabaseAdminClient } from '@/lib/supabaseClient';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  try {
    const user = await getAuthUserFromRequest();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const s = createSupabaseAdminClient();
    // First try exact auth id, then fall back to email match (legacy rows use a separate id key)
    let { data: row } = await s
      .from('users')
      .select('id, email, role, name, isActive')
      .eq('id', user.id)
      .maybeSingle();
    if (!row && user.email) {
      const byEmail = await s
        .from('users')
        .select('id, email, role, name, isActive')
        .eq('email', String(user.email).toLowerCase())
        .maybeSingle();
      row = byEmail.data as any || null;
    }
    if (!row) return NextResponse.json({ id: user.id, email: user.email, role: 'USER' });
    return NextResponse.json({ id: user.id, email: (row as any).email, role: (row as any).role, name: (row as any).name || null, isActive: (row as any).isActive });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed to load account' }, { status: 500 });
  }
}
