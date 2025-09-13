import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

async function shippoFetch(path: string, apiKey: string, init?: RequestInit) {
  const url = `https://api.goshippo.com${path}`;
  const headers: Record<string, string> = {
    Authorization: `ShippoToken ${apiKey}`,
    'Content-Type': 'application/json',
  };
  const res = await fetch(url, { ...init, headers: { ...headers, ...(init?.headers as any) } });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const liveKey = process.env.SHIPPO_API_KEY;
    const testKey = process.env.SHIPPO_API_TEST_KEY;
    const apiKey = (process.env.NODE_ENV === 'production' ? (liveKey || testKey) : (testKey || liveKey)) || '';
    if (!apiKey) return NextResponse.json({ error: 'Missing SHIPPO API key' }, { status: 400 });

    const { rateObjectId, labelFileType } = await req.json();
    if (!rateObjectId) return NextResponse.json({ error: 'Missing rateObjectId' }, { status: 400 });

    const fileType = (labelFileType || 'PDF_4x6') as 'PDF_4x6' | 'PDF_A4' | 'PNG' | 'ZPLII';
    const tx = await shippoFetch('/transactions/', apiKey, { method: 'POST', body: JSON.stringify({ rate: rateObjectId, label_file_type: fileType, async: false }) });
    if (!tx.ok) return NextResponse.json({ error: 'Purchase failed', detail: tx.data }, { status: 500 });

    const d: any = tx.data;
    return NextResponse.json({
      ok: true,
      transactionId: d.object_id,
      shipmentId: d.shipment || undefined,
      trackingNumber: d.tracking_number || d.tracking_number_provider || null,
      labelUrl: d.label_url || null,
      rate: d.rate || null,
      messages: d.messages || [],
      status: d.status,
    });
  } catch (e: any) {
    return NextResponse.json({ error: 'Purchase exception', detail: String(e?.message || e) }, { status: 500 });
  }
}

