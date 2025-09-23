import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
// Supabase removed; persistence updates omitted

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
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
      // Update DB omitted (Supabase removed). Consider Convex persistence if needed.
    }
    return NextResponse.json({ success: true, refund });
  } catch (e) {
    console.error('Shippo cancel error:', e);
    return NextResponse.json({ error: 'Shippo cancel error' }, { status: 500 });
  }
}
