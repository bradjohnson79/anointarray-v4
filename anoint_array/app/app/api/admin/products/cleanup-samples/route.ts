import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function POST(_req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const sampleNames = [
      'Harmonic Seal – Vitality',
      'Clarity Seal – Insight',
      'Guardian Array – Protection',
    ];

    // Find sample products
    const products = await prisma.product.findMany({
      where: { name: { in: sampleNames } },
      select: { id: true, name: true },
    });

    if (products.length === 0) {
      return NextResponse.json({ message: 'No sample products found' });
    }

    const ids = products.map(p => p.id);

    await prisma.$transaction([
      prisma.productVariant.deleteMany({ where: { productId: { in: ids } } }),
      prisma.orderItem.deleteMany({ where: { productId: { in: ids } } }),
      prisma.product.deleteMany({ where: { id: { in: ids } } }),
    ]);

    return NextResponse.json({ message: `Removed ${products.length} sample product(s)` });
  } catch (error: any) {
    console.error('Cleanup samples error:', error);
    return NextResponse.json({ error: error?.message || 'Cleanup failed' }, { status: 500 });
  }
}

