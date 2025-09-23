import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { runConvex } from '@/lib/convexCli';
import { callConvex } from '@/lib/convexHttp';
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

  let user: any = null;
  try { user = await runConvex('users:byEmail', { email: (u?.email || '').toLowerCase() }); }
  catch { user = await callConvex({ functionPath: 'users:byEmail', args: { email: (u?.email || '').toLowerCase() } }); }
  if (!user) return NextResponse.json({ error: 'Account not found or invalid' }, { status: 404 });
  const ok = user.passwordHash ? await bcrypt.compare(String(oldPassword), user.passwordHash) : false;
  if (!ok) {
    return NextResponse.json({ error: 'Old password is incorrect' }, { status: 400 });
  }

  const hashed = await bcrypt.hash(String(newPassword), 12);
  try { await runConvex('users:setPasswordHash', { email: (u?.email || '').toLowerCase(), passwordHash: hashed }); }
  catch { await callConvex({ functionPath: 'users:setPasswordHash', args: { email: (u?.email || '').toLowerCase(), passwordHash: hashed } }); }

  return NextResponse.json({ ok: true });
}

export const POST = withApiErrorHandling(POST_handler, '/api/admin/account/password');
