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

export async function PATCH(req: Request) {
  try {
    const user = await getAuthUserFromRequest();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const body = await req.json().catch(()=>({}));
    const name = typeof body?.name === 'string' ? body.name.trim() : undefined;
    const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : undefined;
    if (!name && !email) return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });

    const s = createSupabaseAdminClient();
    let nextEmail = user.email || undefined;
    if (email && email !== (user.email || '').toLowerCase()) {
      // Try to update auth email first (may require verification depending on project settings)
      const u = await s.auth.admin.updateUserById(user.id, { email });
      if (u.error) return NextResponse.json({ error: `Email update failed: ${u.error.message}` }, { status: 400 });
      nextEmail = email;
    }

    // Upsert profile row by email (fallback) to avoid legacy id mismatch
    const upvals: any = {};
    if (name !== undefined) upvals.name = name;
    if (nextEmail) upvals.email = nextEmail;
    upvals.isActive = true;
    const { error: upErr } = await s
      .from('users')
      .upsert(upvals, { onConflict: 'email' });
    if (upErr) return NextResponse.json({ error: upErr.message || 'Update failed' }, { status: 400 });

    return NextResponse.json({ ok: true, name: name ?? null, email: nextEmail ?? null });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed to update account' }, { status: 500 });
  }
}
