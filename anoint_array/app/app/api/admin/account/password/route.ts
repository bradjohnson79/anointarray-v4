import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { withApiErrorHandling } from '@/lib/api-handler';
import bcrypt from 'bcryptjs';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

async function POST_handler(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.id || session.user?.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

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

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user || !user.password) {
    return NextResponse.json({ error: 'Account not found or invalid' }, { status: 404 });
  }

  const ok = await bcrypt.compare(String(oldPassword), user.password);
  if (!ok) {
    return NextResponse.json({ error: 'Old password is incorrect' }, { status: 400 });
  }

  const hashed = await bcrypt.hash(String(newPassword), 12);
  await prisma.user.update({ where: { id: user.id }, data: { password: hashed } });

  return NextResponse.json({ ok: true });
}

export const POST = withApiErrorHandling(POST_handler, '/api/admin/account/password');

