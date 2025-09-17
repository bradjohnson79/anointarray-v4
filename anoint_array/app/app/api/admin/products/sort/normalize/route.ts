import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session || session.user?.role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const products = await prisma.product.findMany({ select: { id: true, featured: true, name: true, createdAt: true }, orderBy: [{ featured: 'desc' }, { name: 'asc' }, { createdAt: 'asc' }] });
    let i = 100;
    for (const p of products) {
      await prisma.product.update({ where: { id: p.id }, data: { sortOrder: i } });
      i += 10;
    }
    return NextResponse.json({ ok: true, count: products.length, from: 100, step: 10 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed to resequence' }, { status: 500 });
  }
}

