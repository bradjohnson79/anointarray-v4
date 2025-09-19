import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const email = session.user.email || '';
  const userId = session.user.id;
  const orders = await prisma.order.findMany({
    where: {
      OR: [
        { userId: userId || undefined },
        { customerEmail: email },
      ],
    },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      orderNumber: true,
      createdAt: true,
      totalAmount: true,
      paymentStatus: true,
      status: true,
      orderItems: { select: { id: true, quantity: true, price: true, isDigital: true, product: { select: { id: true, name: true, digitalFileUrl: true } } } }
    }
  });
  const out = orders.map((o: any) => ({
    id: o.id,
    orderNumber: o.orderNumber,
    createdAt: o.createdAt,
    total: Number(o.totalAmount),
    paymentStatus: o.paymentStatus,
    status: o.status,
    items: o.orderItems.map((oi: any) => ({ id: oi.id, name: oi.product.name, quantity: oi.quantity, price: Number(oi.price), isDigital: oi.isDigital, digitalFileUrl: oi.product.digitalFileUrl || null }))
  }));
  return NextResponse.json(out);
}
