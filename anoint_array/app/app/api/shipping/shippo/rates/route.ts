import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getConfig } from '@/lib/app-config';

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
    const cfg = await getConfig<any>('shipping-config');
    const cpId = cfg?.carrierAccountIds?.canadaPost || process.env.SHIPPO_CP_ACCOUNT_ID;
    const upsId = cfg?.carrierAccountIds?.upsCanada || process.env.SHIPPO_UPS_CA_ACCOUNT_ID;
    const carrier_accounts = [body.carrierAccountId, cpId, upsId].filter(Boolean);

    const shippo = require('shippo')(apiKey);

    const address_from = body.sender || cfg?.origin || {};
    const address_to = body.recipient;
    const parcel = body.parcel?.dimensions ? {
      length: body.parcel?.dimensions?.length,
      width: body.parcel?.dimensions?.width,
      height: body.parcel?.dimensions?.height,
      distance_unit: 'cm',
      weight: Math.max(body.parcel?.weight || cfg?.parcelDefault?.weight || 0.1, 0.1),
      mass_unit: 'kg',
    } : undefined;
    const customs_declaration = body.customsItems && String(address_to.country).toUpperCase() !== 'CA' ? {
      certify: true, certify_signer: 'ANOINT Array', contents_type: 'merchandise', incoterm: 'DDP',
      items: (body.customsItems || []).map((it: any) => ({
        description: it.description, quantity: it.quantity,
        net_weight: Math.max((it.massGramsEach || 100) / 1000, 0.01), mass_unit: 'kg',
        value: it.unitValueCad, currency: 'CAD', origin_country: it.countryOfOrigin || 'CA', tariff_number: it.hsCode || undefined,
      }))
    } : undefined;

    const shipment = await shippo.shipment.create({
      address_from, address_to,
      parcels: body.parcelTemplateId ? undefined : (parcel ? [parcel] : undefined),
      parcel_template: body.parcelTemplateId || undefined,
      customs_declaration,
      async: false,
      ...(carrier_accounts.length ? { carrier_accounts } : {}),
    });
    const rates = Array.isArray(shipment?.rates) ? shipment.rates : [];
    const messages = shipment?.messages || [];
    // Group by provider for UI convenience
    const grouped = rates.reduce((acc: any, r: any) => {
      const prov = (r?.provider || r?.carrier || 'unknown').toString().toLowerCase();
      acc[prov] = acc[prov] || []; acc[prov].push(r); return acc;
    }, {});
    return NextResponse.json({ shipmentId: shipment?.object_id, rates, grouped, messages });
  } catch (e) {
    console.error('Shippo rates error:', e);
    return NextResponse.json({ error: 'Shippo rates error' }, { status: 500 });
  }
}
