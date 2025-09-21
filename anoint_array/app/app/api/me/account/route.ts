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

    // Allow keys we intend to support; if DB lacks some columns yet,
    // we will fallback to name/email only below without failing the request.
    const ALLOWED_KEYS = ['name','email','phone','address','address2','city','state','zip','country'] as const;
    type AllowedKey = (typeof ALLOWED_KEYS)[number];
    const safeData = Object.fromEntries(
      Object.entries(body || {}).filter(([k]) => (ALLOWED_KEYS as readonly string[]).includes(k))
    ) as Partial<Record<AllowedKey, string>>;

    const name = typeof safeData?.name === 'string' ? safeData.name.trim() : undefined;
    const email = typeof safeData?.email === 'string' ? safeData.email.trim().toLowerCase() : undefined;
    const phone = typeof (safeData as any)?.phone === 'string' ? (safeData as any).phone.trim() : undefined;
    const address = typeof (safeData as any)?.address === 'string' ? (safeData as any).address.trim() : undefined;
    const address2 = typeof (safeData as any)?.address2 === 'string' ? (safeData as any).address2.trim() : undefined;
    const city = typeof (safeData as any)?.city === 'string' ? (safeData as any).city.trim() : undefined;
    const state = typeof (safeData as any)?.state === 'string' ? (safeData as any).state.trim() : undefined;
    const zip = typeof (safeData as any)?.zip === 'string' ? (safeData as any).zip.trim() : undefined;
    const country = typeof (safeData as any)?.country === 'string' ? (safeData as any).country.trim() : undefined;
    if (!name && !email && !phone && !address && !address2 && !city && !state && !zip && !country) {
      return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
    }

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
    // Try full upsert first; if schema lacks columns, fallback to name/email only
    let upErr: any = null;
    try {
      const { error } = await s.from('users').upsert({
        ...upvals,
        ...(phone !== undefined ? { phone } : {}),
        ...(address !== undefined ? { address } : {}),
        ...(address2 !== undefined ? { address2 } : {}),
        ...(city !== undefined ? { city } : {}),
        ...(state !== undefined ? { state } : {}),
        ...(zip !== undefined ? { zip } : {}),
        ...(country !== undefined ? { country } : {}),
      }, { onConflict: 'email' });
      upErr = error;
    } catch (e: any) { upErr = e; }
    if (upErr) {
      const { error } = await s.from('users').upsert(upvals, { onConflict: 'email' });
      if (error) return NextResponse.json({ error: error.message || 'Update failed' }, { status: 400 });
    }

    // Optional cleanup: if email changed successfully, remove stale profile row under old email
    try {
      if (email && nextEmail === email && user.email && email !== (user.email || '').toLowerCase()) {
        await s.from('users').delete().eq('email', String(user.email).toLowerCase());
      }
    } catch {}
    return NextResponse.json({ ok: true, name: name ?? null, email: nextEmail ?? null, phone, address, address2, city, state, zip, country });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed to update account' }, { status: 500 });
  }
}
