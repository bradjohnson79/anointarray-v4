import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { callConvex } from '@/lib/convexHttp';

export const dynamic = 'force-dynamic';

interface LabelRequest {
  orderId: string;
  sender: {
    name: string;
    company?: string;
    address: string;
    city: string;
    state: string;
    province?: string;
    postalCode: string;
    country: string; // 'CA'
    phone?: string;
  };
  recipient: {
    name: string;
    company?: string;
    address: string;
    city: string;
    state: string;
    province?: string;
    postalCode: string;
    country: string; // 'CA' | 'US'
    phone?: string;
    email?: string;
  };
  parcel: {
    weight: number; // kg
    dimensions: { length: number; width: number; height: number }; // cm
  };
  serviceCode?: string;
  value?: number; // CAD
  customsItems?: Array<{
    description: string;
    quantity: number;
    unitValueCad: number;
    hsCode: string;
    countryOfOrigin: string;
    massGramsEach: number;
  }>;
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();

    const liveKey = process.env.SHIPPO_API_KEY;
    const testKey = process.env.SHIPPO_API_TEST_KEY;
    const apiKey = (process.env.NODE_ENV === 'production' ? (liveKey || testKey) : (testKey || liveKey)) || '';
    if (!apiKey) {
      return NextResponse.json({ error: 'Missing SHIPPO_API_KEY' }, { status: 400 });
    }

    const body: LabelRequest & { carrierAccountId?: string } = await request.json();
    const carrierAccountId = body.carrierAccountId || process.env.SHIPPO_CP_ACCOUNT_ID || process.env.SHIPPO_UPS_CA_ACCOUNT_ID || '';

    const address_from = {
      name: body.sender.name,
      company: body.sender.company || undefined,
      street1: body.sender.address,
      city: body.sender.city,
      state: body.sender.state || body.sender.province,
      zip: body.sender.postalCode,
      country: body.sender.country,
      phone: body.sender.phone || undefined,
    } as any;

    const address_to = {
      name: body.recipient.name,
      company: body.recipient.company || undefined,
      street1: body.recipient.address,
      city: body.recipient.city,
      state: body.recipient.state || body.recipient.province,
      zip: body.recipient.postalCode,
      country: body.recipient.country,
      phone: body.recipient.phone || undefined,
      email: body.recipient.email || undefined,
    } as any;

    const parcel = {
      length: body.parcel.dimensions.length,
      width: body.parcel.dimensions.width,
      height: body.parcel.dimensions.height,
      distance_unit: 'cm',
      weight: Math.max(body.parcel.weight, 0.1),
      mass_unit: 'kg',
    } as any;

    let customs_declaration: any = undefined;
    if (String(address_to.country).toUpperCase() !== 'CA') {
      const customs_items = (body.customsItems || []).map((it) => ({
        description: it.description,
        quantity: it.quantity,
        net_weight: Math.max((it.massGramsEach || 100) / 1000, 0.01),
        mass_unit: 'kg',
        value: it.unitValueCad,
        currency: 'CAD',
        origin_country: it.countryOfOrigin || 'CA',
        tariff_number: it.hsCode || undefined,
      }));
      customs_declaration = {
        certify: true,
        certify_signer: 'ANOINT Array',
        contents_type: 'merchandise',
        non_delivery_option: 'abandon',
        incoterm: 'DDP',
        items: customs_items,
      };
    }

    const shippo = require('shippo')(apiKey);
    const carrier_accounts = carrierAccountId ? [carrierAccountId] : undefined;
    const shipment = await shippo.shipment.create({ address_from, address_to, parcels: [parcel], customs_declaration, async: false, ...(carrier_accounts?{carrier_accounts}:{}), });
    const rates: any[] = Array.isArray(shipment?.rates)? shipment.rates : [];
    if (!rates.length) {
      return NextResponse.json({ error: 'No rates returned from Shippo', shipment }, { status: 400 });
    }

    // Prefer CP first, then UPS, else first
    let preferred = rates.find(r => /canada post/i.test(r?.provider || r?.carrier || ''))
      || rates.find(r => /ups/i.test(r?.provider || r?.carrier || ''))
      || rates[0];

    // Purchase label
    const transaction = await shippo.transaction.create({ rate: preferred?.object_id, label_file_type: 'PDF', async: false });
    if (transaction?.status !== 'SUCCESS') return NextResponse.json({ error: 'Shippo purchase failed', transaction }, { status: 500 });

    // Persist shipment in Convex (optional, best effort)
    try {
      if (body.orderId) {
        await callConvex({ functionPath: 'shipments:add', args: {
          orderId: body.orderId as any,
          orderNumber: String((body as any).orderNumber || ''),
          carrier: (/ups/i.test(preferred?.provider||preferred?.carrier||'')?'ups':'canada-post'),
          trackingNumber: transaction?.tracking_number || undefined,
          labelUrl: transaction?.label_url || undefined,
          cost: preferred?.amount ? Number(preferred.amount) : undefined,
          service: preferred?.servicelevel?.name || preferred?.servicelevel?.token || (preferred?.service || undefined),
          estimatedDelivery: preferred?.estimated_days ? String(preferred.estimated_days) : undefined,
          transactionId: transaction?.object_id || undefined,
          shipmentId: shipment?.object_id || undefined,
          status: 'created',
          meta: { rate: preferred },
        } });
      }
    } catch {}

    return NextResponse.json({
      success: true,
      provider: 'shippo',
      trackingNumber: transaction?.tracking_number,
      labelUrl: transaction?.label_url,
      rate: preferred,
      shipmentId: shipment?.object_id,
      transactionId: transaction?.object_id,
    });

  } catch (error) {
    console.error('Shippo error:', error);
    return NextResponse.json({ error: 'Shippo label creation error' }, { status: 500 });
  }
}
