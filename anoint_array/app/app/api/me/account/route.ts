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
      .select('id, email, role, name, isActive, phone, address, address2, city, state, zip, country')
      .eq('id', user.id)
      .maybeSingle();
    if (!row && user.email) {
      const byEmail = await s
        .from('users')
        .select('id, email, role, name, isActive, phone, address, address2, city, state, zip, country')
        .eq('email', String(user.email).toLowerCase())
        .maybeSingle();
      row = byEmail.data as any || null;
    }
    if (!row) return NextResponse.json({ id: user.id, email: user.email, role: 'USER' });
    return NextResponse.json({
      id: user.id,
      email: (row as any).email,
      role: (row as any).role,
      name: (row as any).name || null,
      isActive: (row as any).isActive,
      phone: (row as any).phone || null,
      address: (row as any).address || null,
      address2: (row as any).address2 || null,
      city: (row as any).city || null,
      state: (row as any).state || null,
      zip: (row as any).zip || null,
      country: (row as any).country || null,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed to load account' }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const user = await getAuthUserFromRequest();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const body = await req.json().catch(()=>({}));

    // Allow only safe keys that are guaranteed to exist in the schema
    const ALLOWED_KEYS = ['name', 'email'] as const;
    type AllowedKey = (typeof ALLOWED_KEYS)[number];
    const safeData = Object.fromEntries(
      Object.entries(body || {}).filter(([k]) => (ALLOWED_KEYS as readonly string[]).includes(k))
    ) as Partial<Record<AllowedKey, string>>;

    const name = typeof safeData?.name === 'string' ? safeData.name.trim() : undefined;
    const email = typeof safeData?.email === 'string' ? safeData.email.trim().toLowerCase() : undefined;
    if (!name && !email) return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });

    const s = createSupabaseAdminClient();
    let nextEmail = user.email || undefined;
    if (email && email !== (user.email || '').toLowerCase()) {
      // Try to update auth email first; if it fails (e.g., email in use), continue updating other fields.
      const u = await s.auth.admin.updateUserById(user.id, { email });
      if (!u.error) nextEmail = email; // success
    }

    // Upsert profile row by email (fallback) to avoid legacy id mismatch
    const upvals: any = {};
    if (name !== undefined) upvals.name = name;
    if (nextEmail) upvals.email = nextEmail;
    upvals.isActive = true;
    const { error: upErr } = await s.from('users').upsert(upvals, { onConflict: 'email' });
    if (upErr) return NextResponse.json({ error: upErr.message || 'Update failed' }, { status: 400 });

    // Optional cleanup: if email changed successfully, remove stale profile row under old email
    try {
      if (email && nextEmail === email && user.email && email !== (user.email || '').toLowerCase()) {
        await s.from('users').delete().eq('email', String(user.email).toLowerCase());
      }
    } catch {}
    return NextResponse.json({ ok: true, name: name ?? null, email: nextEmail ?? null });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed to update account' }, { status: 500 });
  }
}
