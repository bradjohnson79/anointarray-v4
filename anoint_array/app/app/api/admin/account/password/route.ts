import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/supabase-auth';
import { createSupabaseAdminClient } from '@/lib/supabaseClient';
import { withApiErrorHandling } from '@/lib/api-handler';
import bcrypt from 'bcryptjs';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

async function POST_handler(req: NextRequest) {
  const u = await requireAdmin();

  const { oldPassword, newPassword, confirmPassword } = await req.json().catch(() => ({}));
  if (!oldPassword || !newPassword || !confirmPassword) {
    return NextResponse.json({ error: 'All fields are required' }, { status: 400 });
  }
  if (newPassword !== confirmPassword) {
    return NextResponse.json({ error: 'New passwords do not match' }, { status: 400 });
  }
  if (typeof newPassword !== 'string' || newPassword.length < 8) {
    return NextResponse.json({ error: 'New password must be at least 8 characters' }, { status: 400 });
  }

  const s = createSupabaseAdminClient();
  // Fetch legacy password hash from users table if available
  const { data: user } = await s.from('users').select('id, email, password').eq('email', (u?.email || '').toLowerCase()).maybeSingle();
  if (!user) {
    return NextResponse.json({ error: 'Account not found or invalid' }, { status: 404 });
  }

  const ok = user.password ? await bcrypt.compare(String(oldPassword), user.password) : false;
  if (!ok) {
    return NextResponse.json({ error: 'Old password is incorrect' }, { status: 400 });
  }

  const hashed = await bcrypt.hash(String(newPassword), 12);
  await s.from('users').update({ password: hashed }).eq('id', user.id);
  // Update Supabase Auth password via admin API
  await s.auth.admin.updateUserById(u!.id, { password: String(newPassword) });

  return NextResponse.json({ ok: true });
}

export const POST = withApiErrorHandling(POST_handler, '/api/admin/account/password');
