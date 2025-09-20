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
    const phone = typeof body?.phone === 'string' ? body.phone.trim() : undefined;
    const address = typeof body?.address === 'string' ? body.address.trim() : undefined;
    const address2 = typeof body?.address2 === 'string' ? body.address2.trim() : undefined;
    const city = typeof body?.city === 'string' ? body.city.trim() : undefined;
    const state = typeof body?.state === 'string' ? body.state.trim() : undefined;
    const zip = typeof body?.zip === 'string' ? body.zip.trim() : undefined;
    const country = typeof body?.country === 'string' ? body.country.trim() : undefined;
    if (!name && !email && !phone && !address && !city && !state && !zip && !country && !address2) return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });

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
    if (phone !== undefined) upvals.phone = phone;
    if (address !== undefined) upvals.address = address;
    if (address2 !== undefined) upvals.address2 = address2;
    if (city !== undefined) upvals.city = city;
    if (state !== undefined) upvals.state = state;
    if (zip !== undefined) upvals.zip = zip;
    if (country !== undefined) upvals.country = country;
    upvals.isActive = true;
    let upErr = null as any;
    try {
      const { error } = await s.from('users').upsert(upvals, { onConflict: 'email' });
      upErr = error;
    } catch (e: any) {
      upErr = e;
    }
    if (upErr) {
      // Fallback: retry with only safe fields in case extended columns don't exist
      const fallback: any = { email: nextEmail, isActive: true };
      if (name !== undefined) fallback.name = name;
      const { error: e2 } = await s.from('users').upsert(fallback, { onConflict: 'email' });
      if (e2) return NextResponse.json({ error: (upErr?.message || e2.message || 'Update failed') }, { status: 400 });
    }

    return NextResponse.json({ ok: true, name: name ?? null, email: nextEmail ?? null, phone: phone ?? null, address, address2, city, state, zip, country });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed to update account' }, { status: 500 });
  }
}
