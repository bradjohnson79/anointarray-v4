import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getConfig } from '@/lib/app-config';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

async function shippoFetch(path: string, apiKey: string, init?: any) {
  const url = `https://api.goshippo.com${path}`;
  const headers: Record<string, string> = {
    Authorization: `ShippoToken ${apiKey}`,
    'Content-Type': 'application/json',
  };
  const res = await fetch(url, { ...init, headers: { ...headers, ...(init?.headers as any) } });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
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
    if (!apiKey) return NextResponse.json({ error: 'Missing SHIPPO API key' }, { status: 400 });

    const body = await request.json();
    const cfg = await getConfig<any>('shipping-config');
    const cpId = body.carrierAccountId || cfg?.carrierAccountIds?.canadaPost || process.env.SHIPPO_CP_ACCOUNT_ID;
    const upsId = cfg?.carrierAccountIds?.upsCanada || process.env.SHIPPO_UPS_CA_ACCOUNT_ID;
    const carrier_accounts = [cpId, upsId].filter(Boolean) as string[];

    const address_from = body.sender || cfg?.origin || {};
    const address_to = body.recipient;
    const parcel = body.parcel?.dimensions ? {
      length: body.parcel?.dimensions?.length,
      width: body.parcel?.dimensions?.width,
      height: body.parcel?.dimensions?.height,
      distance_unit: 'cm',
      weight: Math.max(body.parcel?.weight || cfg?.parcelDefault?.weight || 0.1, 0.1),
      mass_unit: 'kg',
    } : (cfg?.parcelDefault ? cfg.parcelDefault : undefined);

    // Create customs declaration for US/international
    let customs_declaration: string | undefined;
    const isIntl = String(address_to?.country || '').toUpperCase() !== 'CA';
    if (isIntl) {
      const items = Array.isArray(body.customsItems) && body.customsItems.length
        ? body.customsItems
        : [{ description: 'Goods', quantity: 1, net_weight: parcel?.weight || 0.5, mass_unit: parcel?.mass_unit || 'kg', value_amount: body.value || 100, value_currency: 'CAD', origin_country: 'CA', hs_tariff_number: '7117110000' }];
      // Map to Shippo schemas
      const createdItemIds: string[] = [];
      for (const it of items) {
        const r = await shippoFetch('/customs/items/', apiKey, { method: 'POST', body: JSON.stringify({
          description: it.description,
          quantity: it.quantity || 1,
          net_weight: it.net_weight || Math.max((it.massGramsEach || 100) / 1000, 0.01),
          mass_unit: it.mass_unit || 'kg',
          value_amount: it.value_amount || it.unitValueCad || body.value || 100,
          value_currency: it.value_currency || 'CAD',
          origin_country: it.origin_country || it.countryOfOrigin || 'CA',
          hs_tariff_number: it.hs_tariff_number || it.hsCode || undefined,
        }) });
        if (r.ok) createdItemIds.push((r.data as any).object_id);
      }
      if (createdItemIds.length) {
        const decl = await shippoFetch('/customs/declarations/', apiKey, { method: 'POST', body: JSON.stringify({
          contents_type: 'MERCHANDISE',
          incoterm: 'DDP',
          non_delivery_option: 'RETURN',
          certify: true,
          certify_signer: 'Admin',
          eel_pfc: 'NOEEI_30_37_a',
          items: createdItemIds,
        }) });
        if (decl.ok) customs_declaration = (decl.data as any).object_id;
      }
    }

    const shipmentBody: any = { address_from, address_to, async: false };
    if (body.parcelTemplateId) shipmentBody.parcel_template = body.parcelTemplateId; else if (parcel) shipmentBody.parcels = [parcel];
    if (carrier_accounts.length) shipmentBody.carrier_accounts = carrier_accounts;
    if (customs_declaration) shipmentBody.customs_declaration = customs_declaration;

    const shipment = await shippoFetch('/shipments/', apiKey, { method: 'POST', body: JSON.stringify(shipmentBody) });
    if (!shipment.ok) {
      return NextResponse.json({ error: 'Shippo rates error', detail: shipment.data }, { status: 500 });
    }

    const rates = Array.isArray((shipment.data as any)?.rates) ? (shipment.data as any).rates : [];
    const messages = (shipment.data as any)?.messages || [];
    const grouped = rates.reduce((acc: any, r: any) => { const prov = (r?.provider || r?.carrier || 'unknown').toString().toLowerCase(); (acc[prov] ||= []).push(r); return acc; }, {} as any);
    return NextResponse.json({ shipmentId: (shipment.data as any)?.object_id, rates, grouped, messages });
  } catch (e: any) {
    const msg = String(e?.message || e);
    console.error('Shippo rates error:', msg);
    return NextResponse.json({ error: 'Shippo rates exception', detail: msg }, { status: 500 });
  }
}
