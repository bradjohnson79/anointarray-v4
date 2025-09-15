import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type RouteContext = { params: { id: string } };

export async function GET(_req: NextRequest, ctx: RouteContext) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const id = ctx.params.id;
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true, name: true, email: true, role: true, phone: true,
        address: true, isActive: true, lastLoginAt: true, createdAt: true, updatedAt: true,
      },
    });
    if (!user) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(user);
  } catch (e) {
    return NextResponse.json({ error: 'Failed to fetch user' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, ctx: RouteContext) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const id = ctx.params.id;
    const body = await req.json().catch(() => ({}));
    const data: any = {};
    if (typeof body.name === 'string') data.name = body.name;
    if (typeof body.phone === 'string') data.phone = body.phone;
    if (typeof body.role === 'string' && (body.role === 'USER' || body.role === 'ADMIN')) data.role = body.role;
    if (typeof body.isActive === 'boolean') data.isActive = body.isActive;
    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }
    const updated = await prisma.user.update({ where: { id }, data, select: { id: true, name: true, email: true, role: true, phone: true, isActive: true } });
    return NextResponse.json(updated);
  } catch (e: any) {
    const msg = String(e?.message || e || '');
    if (/record to update not found/i.test(msg)) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, ctx: RouteContext) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const id = ctx.params.id;
    await prisma.user.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    const msg = String(e?.message || e || '');
    if (/record to delete does not exist/i.test(msg)) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 });
  }
}

