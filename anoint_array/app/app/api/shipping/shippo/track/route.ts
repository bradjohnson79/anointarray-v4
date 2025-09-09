import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

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

    const { carrier, trackingNumber } = await request.json();
    if (!carrier || !trackingNumber) return NextResponse.json({ error: 'Missing carrier or trackingNumber' }, { status: 400 });

    const resp = await fetch(`https://api.goshippo.com/tracks/${encodeURIComponent(carrier)}/${encodeURIComponent(trackingNumber)}`, {
      headers: { 'Authorization': `ShippoToken ${apiKey}` }
    });
    const data = await resp.json();
    if (!resp.ok) return NextResponse.json({ error: 'Shippo track failed', detail: data }, { status: 500 });

    return NextResponse.json({ success: true, tracking: data });
  } catch (e) {
    console.error('Shippo track error:', e);
    return NextResponse.json({ error: 'Shippo track error' }, { status: 500 });
  }
}
