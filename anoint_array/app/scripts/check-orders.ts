import { prisma } from '@/lib/prisma';

(async () => {
  const since = new Date(Date.now() - 1000 * 60 * 60 * 24 * 2);
  const orders = await prisma.order.findMany({
    where: { createdAt: { gte: since } },
    orderBy: { createdAt: 'desc' },
    select: { id: true, orderNumber: true, customerEmail: true, totalAmount: true, paymentStatus: true, createdAt: true }
  });
  console.log(orders.map((o: any) => ({ ...o, totalAmount: Number(o.totalAmount) })));
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
