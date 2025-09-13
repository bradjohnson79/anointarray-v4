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

export async function GET(request: NextRequest) {
  const checks: any[] = [];
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const url = new URL(request.url);
    const parcelTemplateId = url.searchParams.get('parcelTemplateId') || '';
    const carrierAccountIdOverride = url.searchParams.get('carrierAccountId') || '';

    const liveKey = process.env.SHIPPO_API_KEY;
    const testKey = process.env.SHIPPO_API_TEST_KEY;
    const apiKey = (process.env.NODE_ENV === 'production' ? (liveKey || testKey) : (testKey || liveKey)) || '';

    checks.push({ key: 'apiKey', label: 'Shippo API key present', ok: !!apiKey, detail: apiKey ? 'OK' : 'Missing SHIPPO_API_TEST_KEY/SHIPPO_API_KEY' });
    if (!apiKey) return NextResponse.json({ ok: false, checks }, { status: 400 });

    const cfg = await getConfig<any>('shipping-config');
    const cpId = carrierAccountIdOverride || cfg?.carrierAccountIds?.canadaPost || process.env.SHIPPO_CP_ACCOUNT_ID;
    const upsId = cfg?.carrierAccountIds?.upsCanada || process.env.SHIPPO_UPS_CA_ACCOUNT_ID;

    // Carrier accounts list
    const list = await shippoFetch('/carrier_accounts/', apiKey, { method: 'GET' });
    if (!list.ok) {
      checks.push({ key: 'carrierList', label: 'Carrier accounts reachable', ok: false, detail: JSON.stringify(list.data) });
    } else {
      const accounts = Array.isArray((list.data as any)?.results) ? (list.data as any).results : [];
      checks.push({ key: 'carrierList', label: 'Carrier accounts reachable', ok: true, detail: `${accounts.length} account(s)` });
      if (cpId) checks.push({ key: 'cpAccount', label: 'Canada Post account configured', ok: !!accounts.find((a:any)=>String(a.object_id)===String(cpId)) });
      if (upsId) checks.push({ key: 'upsAccount', label: 'UPS Canada account configured', ok: !!accounts.find((a:any)=>String(a.object_id)===String(upsId)) });
    }

    const origin = cfg?.origin || { name:'Test', street1:'123 Test St', city:'Toronto', state:'ON', zip:'M1A 1A1', country:'CA' };
    const toCA = { name:'Receiver', street1:'456 King', city:'Toronto', state:'ON', zip:'M5S 1T8', country:'CA' };
    const toUS = { name:'Receiver', street1:'1600 Amphitheatre Pkwy', city:'Mountain View', state:'CA', zip:'94043', country:'US' };
    const toGB = { name:'Receiver', street1:'1 St Martin Le Grand', city:'London', state:'LND', zip:'EC1A 1BB', country:'GB' };
    const parcel = cfg?.parcelDefault || { length:30, width:23, height:15, distance_unit:'cm', weight:0.5, mass_unit:'kg' };
    const carrier_accounts = [cpId, upsId].filter(Boolean) as string[];

    const createCustoms = async () => {
      const item = await shippoFetch('/customs/items/', apiKey, { method:'POST', body: JSON.stringify({ description:'Sample Goods', quantity:1, net_weight: parcel.weight || 0.5, mass_unit: parcel.mass_unit || 'kg', value_amount: 100, value_currency:'CAD', origin_country:'CA', hs_tariff_number:'7117110000' }) });
      if (!item.ok) return null;
      const decl = await shippoFetch('/customs/declarations/', apiKey, { method:'POST', body: JSON.stringify({ contents_type:'MERCHANDISE', incoterm:'DDP', non_delivery_option:'RETURN', certify:true, certify_signer:'Admin', eel_pfc:'NOEEI_30_37_a', items:[(item.data as any).object_id] }) });
      return decl.ok ? (decl.data as any).object_id : null;
    };

    const checkRates = async (to: any) => {
      let customs_declaration: string | null = null;
      if (String(to.country).toUpperCase() !== 'CA') {
        customs_declaration = await createCustoms();
      }
      const body: any = { address_from: origin, address_to: to, async:false };
      if (parcelTemplateId) body.parcel_template = parcelTemplateId; else body.parcels = [parcel];
      if (carrier_accounts.length) body.carrier_accounts = carrier_accounts;
      if (customs_declaration) body.customs_declaration = customs_declaration;
      const shipment = await shippoFetch('/shipments/', apiKey, { method:'POST', body: JSON.stringify(body) });
      if (!shipment.ok) {
        const detail = typeof shipment.data === 'string' ? shipment.data : JSON.stringify(shipment.data);
        return { ok:false, detail };
      }
      const rates = Array.isArray((shipment.data as any)?.rates) ? (shipment.data as any).rates : [];
      const messages = (shipment.data as any)?.messages || [];
      const cp = rates.filter((r:any)=>/canada post/i.test(r?.provider||r?.carrier||''));
      const ups = rates.filter((r:any)=>/ups/i.test(r?.provider||r?.carrier||''));
      const any = rates.length>0;
      return { ok: any, detail: any? `${cp.length} CP / ${ups.length} UPS rate(s)` : (messages.length? messages.map((m:any)=>m.text||m.code).join('; '):'No rates') };
    };

    const ca = await checkRates(toCA);
    checks.push({ key: 'ratesCA', label: 'Get rates (Canada→Canada)', ok: ca.ok, detail: ca.detail });
    const us = await checkRates(toUS);
    checks.push({ key: 'ratesUS', label: 'Get rates (Canada→USA)', ok: us.ok, detail: us.detail });
    const gb = await checkRates(toGB);
    checks.push({ key: 'ratesINT', label: 'Get rates (Canada→International)', ok: gb.ok, detail: gb.detail });

    const ok = checks.every(c => c.ok !== false);
    return NextResponse.json({ ok, checks });
  } catch (e: any) {
    checks.push({ key: 'exception', label: 'Exception during status check', ok: false, detail: String(e?.message || e) });
    return NextResponse.json({ ok: false, checks }, { status: 500 });
  }
}
