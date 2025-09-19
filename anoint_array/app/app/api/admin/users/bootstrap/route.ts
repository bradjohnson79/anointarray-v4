import { NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabaseClient';
import bcrypt from 'bcryptjs';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Helpful GET handler so browser hits don't 405 and to avoid
// accidental routing to /api/admin/users/[id]
export async function GET() {
  const allow = process.env.ALLOW_BOOTSTRAP_ADMINS === '1' || process.env.NODE_ENV !== 'production';
  if (!allow) return NextResponse.json({ error: 'Bootstrap disabled. Set ALLOW_BOOTSTRAP_ADMINS=1 and redeploy, then POST this route.' }, { status: 403 });
  return NextResponse.json({
    ok: true,
    message: 'Bootstrap route is ready. Send a POST request to create/update admin accounts.'
  });
}

type BootstrapResult = { email: string; createdAuth: boolean; updatedAuth: boolean; upsertedProfile: boolean; note?: string };

async function findAuthUserIdByEmail(email: string, s: ReturnType<typeof createSupabaseAdminClient>): Promise<string | null> {
  // Supabase Admin API supports listing users; filter client-side
  const { data, error } = await s.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (error) return null;
  const found = (data?.users || []).find((u: any) => (u?.email || '').toLowerCase() === email.toLowerCase());
  return (found as any)?.id || null;
}

export async function POST() {
  try {
    // Safety: disable in production unless explicitly allowed
    const allow = process.env.ALLOW_BOOTSTRAP_ADMINS === '1' || process.env.NODE_ENV !== 'production';
    if (!allow) return NextResponse.json({ error: 'Bootstrap disabled' }, { status: 403 });

    const targets = [
      { email: 'bradjohnson79@gmail.com', password: 'Admin123', name: 'Brad Johnson' },
      { email: 'breanne@aetherx.co', password: 'Admin123', name: 'Breanne Desrochers' },
    ];

    const s = createSupabaseAdminClient();
    const out: BootstrapResult[] = [];
    for (const t of targets) {
      const email = t.email.toLowerCase();
      let createdAuth = false;
      let updatedAuth = false;
      let upsertedProfile = false;
      let note: string | undefined;

      // Ensure Auth user exists with provided password
      const existingId = await findAuthUserIdByEmail(email, s);
      if (!existingId) {
        const { data, error } = await s.auth.admin.createUser({ email, password: t.password, email_confirm: true });
        if (!error && data?.user?.id) {
          createdAuth = true;
        } else {
          note = `auth.createUser failed: ${error?.message || 'unknown'}`;
        }
      } else {
        const { error } = await s.auth.admin.updateUserById(existingId, { password: t.password });
        if (!error) updatedAuth = true; else note = `auth.updateUser failed: ${error.message}`;
      }

      // Upsert profile in users table with ADMIN role and hashed password for legacy flows
      try {
        const hash = await bcrypt.hash(t.password, 12);
        const { data: profile } = await s
          .from('users')
          .upsert({ email, name: t.name, role: 'ADMIN', isActive: true, password: hash }, { onConflict: 'email' })
          .select('id')
          .single();
        if (profile) upsertedProfile = true;
      } catch {}

      out.push({ email, createdAuth, updatedAuth, upsertedProfile, note });
    }

    return NextResponse.json({ ok: true, results: out });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Bootstrap failed' }, { status: 500 });
  }
}
