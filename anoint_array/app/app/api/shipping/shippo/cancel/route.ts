import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const liveKey = process.env.SHIPPO_API_KEY;
    const testKey = process.env.SHIPPO_API_TEST_KEY;
    const apiKey = (process.env.NODE_ENV === 'production' ? (liveKey || testKey) : (testKey || liveKey)) || '';
    if (!apiKey) return NextResponse.json({ error: 'Missing SHIPPO API key' }, { status: 400 });

    const { transactionId, shipmentId } = await request.json();
    if (!transactionId) return NextResponse.json({ error: 'Missing transactionId' }, { status: 400 });

    const resp = await fetch('https://api.goshippo.com/refunds/', {
      method: 'POST',
      headers: { 'Authorization': `ShippoToken ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ transaction: transactionId })
    });
    const refund = await resp.json();
    if (!resp.ok) return NextResponse.json({ error: 'Shippo refund failed', refund }, { status: 500 });

    if (shipmentId) {
      await prisma.shipment.updateMany({ where: { id: shipmentId }, data: { status: 'cancelled', apiAudit: { refund } } });
    }
    return NextResponse.json({ success: true, refund });
  } catch (e) {
    console.error('Shippo cancel error:', e);
    return NextResponse.json({ error: 'Shippo cancel error' }, { status: 500 });
  }
}
