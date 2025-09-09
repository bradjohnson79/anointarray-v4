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

    const { rateObjectId, orderId } = await request.json();
    if (!rateObjectId || !orderId) return NextResponse.json({ error: 'Missing rateObjectId or orderId' }, { status: 400 });

    const transactionResp = await fetch('https://api.goshippo.com/transactions/', {
      method: 'POST',
      headers: { 'Authorization': `ShippoToken ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ rate: rateObjectId, label_file_type: 'PDF', async: false })
    });
    const transaction = await transactionResp.json();
    if (!transactionResp.ok || transaction?.status !== 'SUCCESS') {
      return NextResponse.json({ error: 'Shippo purchase failed', transaction }, { status: 500 });
    }

    const rateResp = await fetch(transaction?.rate, { headers: { 'Authorization': `ShippoToken ${apiKey}` } });
    const rate = await rateResp.json();
    let shipmentId: string | null = null;
    if (rate?.shipment) {
      const m = String(rate.shipment).match(/shipments\/(\w+)/);
      if (m) shipmentId = m[1];
    }

    await prisma.shipment.create({
      data: {
        orderId,
        carrier: (rate?.provider || 'canadapost').toString().toLowerCase(),
        incoterm: 'DDP',
        customsReason: 'SOLD',
        labelMeta: rate,
        apiAudit: { transaction },
        trackingNumber: transaction?.tracking_number || null,
        labelUrl: transaction?.label_url || null,
        cost: rate?.amount ? Number(rate.amount) : null,
        service: rate?.servicelevel?.name || rate?.servicelevel?.token || 'Service',
        estimatedDelivery: rate?.estimated_days ? new Date(Date.now() + rate.estimated_days * 86400000) : null,
        status: 'created',
      }
    });

    return NextResponse.json({
      success: true,
      trackingNumber: transaction?.tracking_number,
      labelUrl: transaction?.label_url,
      rate,
      transactionId: transaction?.object_id,
      shipmentId
    });
  } catch (e) {
    console.error('Shippo purchase error:', e);
    return NextResponse.json({ error: 'Shippo purchase error' }, { status: 500 });
  }
}
