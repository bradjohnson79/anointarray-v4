import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

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
    const session = await getServerSession(authOptions);
    if (!session || session.user?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const liveKey = process.env.SHIPPO_API_KEY;
    const testKey = process.env.SHIPPO_API_TEST_KEY;
    const apiKey = (process.env.NODE_ENV === 'production' ? (liveKey || testKey) : (testKey || liveKey)) || '';
    if (!apiKey) {
      return NextResponse.json({ error: 'Missing SHIPPO_API_KEY' }, { status: 400 });
    }

    const body: LabelRequest & { carrierAccountId?: string } = await request.json();
    const carrierAccountId = body.carrierAccountId || process.env.SHIPPO_CP_ACCOUNT_ID || '';

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

    // Create shipment (synchronous to get rates)
    const shipmentResp = await fetch('https://api.goshippo.com/shipments/', {
      method: 'POST',
      headers: {
        'Authorization': `ShippoToken ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        address_from,
        address_to,
        parcels: [parcel],
        customs_declaration,
        // restrict rating to your own Canada Post carrier account if provided
        ...(carrierAccountId ? { carrier_accounts: [carrierAccountId] } : {}),
        async: false,
      }),
    });
    if (!shipmentResp.ok) {
      const t = await shipmentResp.text();
      return NextResponse.json({ error: 'Shippo shipment failed', detail: t }, { status: 500 });
    }
    const shipment = await shipmentResp.json();
    const rates: any[] = shipment?.rates || [];
    if (!rates.length) {
      return NextResponse.json({ error: 'No rates returned from Shippo', shipment }, { status: 400 });
    }

    // Prefer Canada Post via your carrier account when available
    let preferred = rates.find(r => carrierAccountId && String(r?.carrier_account) === carrierAccountId && /canada post/i.test(r?.provider || r?.carrier || ''))
      || rates.find(r => /canada post/i.test(r?.provider || r?.carrier || ''))
      || rates[0];

    // Purchase label
    const transactionResp = await fetch('https://api.goshippo.com/transactions/', {
      method: 'POST',
      headers: {
        'Authorization': `ShippoToken ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        rate: preferred?.object_id || preferred?.object_id,
        label_file_type: 'PDF',
        async: false,
      }),
    });
    const transaction = await transactionResp.json();
    if (!transactionResp.ok || transaction?.status !== 'SUCCESS') {
      return NextResponse.json({ error: 'Shippo purchase failed', transaction }, { status: 500 });
    }

    // Persist shipment in DB when connected to an order
    if (body.orderId) {
      try {
        await prisma.shipment.create({
          data: {
            orderId: body.orderId,
            carrier: 'canadapost',
            incoterm: (String(address_to.country).toUpperCase() !== 'CA') ? 'DDP' : 'DDP',
            customsReason: 'SOLD',
            labelMeta: preferred,
            apiAudit: { shipment, transaction },
            trackingNumber: transaction?.tracking_number || null,
            labelUrl: transaction?.label_url || null,
            cost: preferred?.amount ? Number(preferred.amount) : null,
            service: preferred?.servicelevel?.name || preferred?.servicelevel?.token || preferred?.servicelevel || 'Canada Post',
            estimatedDelivery: preferred?.estimated_days ? new Date(Date.now() + preferred.estimated_days * 86400000) : null,
            status: 'created',
          }
        });
      } catch (e) {
        console.warn('DB persist shipment failed:', e);
      }
    }

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
