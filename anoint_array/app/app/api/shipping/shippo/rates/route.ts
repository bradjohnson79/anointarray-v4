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

    const body = await request.json();
    const carrierAccountId = body.carrierAccountId || process.env.SHIPPO_CP_ACCOUNT_ID || '';

    const address_from = body.sender;
    const address_to = body.recipient;
    const parcel = {
      length: body.parcel?.dimensions?.length,
      width: body.parcel?.dimensions?.width,
      height: body.parcel?.dimensions?.height,
      distance_unit: 'cm',
      weight: Math.max(body.parcel?.weight || 0.1, 0.1),
      mass_unit: 'kg',
    };
    const customs_declaration = body.customsItems && String(address_to.country).toUpperCase() !== 'CA' ? {
      certify: true,
      certify_signer: 'ANOINT Array',
      contents_type: 'merchandise',
      incoterm: 'DDP',
      items: (body.customsItems || []).map((it: any) => ({
        description: it.description,
        quantity: it.quantity,
        net_weight: Math.max((it.massGramsEach || 100) / 1000, 0.01),
        mass_unit: 'kg',
        value: it.unitValueCad,
        currency: 'CAD',
        origin_country: it.countryOfOrigin || 'CA',
        tariff_number: it.hsCode || undefined,
      }))
    } : undefined;

    const shipmentResp = await fetch('https://api.goshippo.com/shipments/', {
      method: 'POST',
      headers: { 'Authorization': `ShippoToken ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ address_from, address_to, parcels: body.parcelTemplateId ? undefined : [parcel], parcel_template: body.parcelTemplateId || undefined, customs_declaration, ...(carrierAccountId ? { carrier_accounts: [carrierAccountId] } : {}), async: false })
    });
    const shipment = await shipmentResp.json();
    if (!shipmentResp.ok) return NextResponse.json({ error: 'Shippo shipment failed', detail: shipment }, { status: 500 });

    const rates = (shipment?.rates || []).filter((r: any) => /canada post/i.test(r?.provider || r?.carrier || ''));
    return NextResponse.json({ shipmentId: shipment?.object_id, rates });
  } catch (e) {
    console.error('Shippo rates error:', e);
    return NextResponse.json({ error: 'Shippo rates error' }, { status: 500 });
  }
}
