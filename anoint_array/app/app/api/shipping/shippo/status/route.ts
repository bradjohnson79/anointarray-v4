import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { getConfig } from '@/lib/app-config';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const checks: any[] = [];
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const url = new URL(request.url);
    const parcelTemplateId = url.searchParams.get('parcelTemplateId') || '';

    const liveKey = process.env.SHIPPO_API_KEY;
    const testKey = process.env.SHIPPO_API_TEST_KEY;
    const apiKey = (process.env.NODE_ENV === 'production' ? (liveKey || testKey) : (testKey || liveKey)) || '';

    checks.push({ key: 'apiKey', label: 'Shippo API key present', ok: !!apiKey, detail: apiKey ? 'OK' : 'Missing SHIPPO_API_TEST_KEY/SHIPPO_API_KEY' });
    if (!apiKey) return NextResponse.json({ checks, ok: false });

    // Fetch carrier accounts
    try {
      const resp = await fetch('https://api.goshippo.com/carrier_accounts/', {
        headers: { 'Authorization': `ShippoToken ${apiKey}` }
      });
      const data = await resp.json();
      const accounts = Array.isArray(data?.results) ? data.results : [];
      const hasList = resp.ok && accounts.length >= 0;
      checks.push({ key: 'carrierList', label: 'Carrier accounts reachable', ok: hasList, detail: hasList ? `${accounts.length} account(s)` : JSON.stringify(data) });
      const cfg = await getConfig<any>('shipping-config');
      const cpId = cfg?.carrierAccountIds?.canadaPost || process.env.SHIPPO_CP_ACCOUNT_ID;
      const upsId = cfg?.carrierAccountIds?.upsCanada || process.env.SHIPPO_UPS_CA_ACCOUNT_ID;
      if (cpId) checks.push({ key: 'cpAccount', label: 'Canada Post account configured', ok: !!accounts.find((a:any)=>String(a.object_id)===cpId) });
      if (upsId) checks.push({ key: 'upsAccount', label: 'UPS Canada account configured', ok: !!accounts.find((a:any)=>String(a.object_id)===upsId) });
    } catch (e: any) {
      checks.push({ key: 'carrierList', label: 'Carrier accounts reachable', ok: false, detail: String(e?.message || e) });
    }

    // Try rate for Domestic CA and USA
    const mkAddr = (country: string, city: string, state: string, zip: string) => ({
      name: 'Test', street1: '123 Test St', city, state, zip, country
    });
    const from = mkAddr('CA','Toronto','ON','M1A 1A1');
    const toCA = mkAddr('CA','Toronto','ON','M5S 1T8');
    const toUS = mkAddr('US','Mountain View','CA','94043');
    const toGB = mkAddr('GB','London','LND','EC1A 1BB');
    const parcel = { length: 30, width: 23, height: 15, distance_unit: 'cm', weight: 0.5, mass_unit: 'kg' };

    const shippo = require('shippo')(apiKey);
    const cfg = await getConfig<any>('shipping-config');
    const cpId = cfg?.carrierAccountIds?.canadaPost || process.env.SHIPPO_CP_ACCOUNT_ID;
    const upsId = cfg?.carrierAccountIds?.upsCanada || process.env.SHIPPO_UPS_CA_ACCOUNT_ID;
    const carrier_accounts = [cpId, upsId].filter(Boolean);

    const checkRates = async (to: any) => {
      const shipment = await shippo.shipment.create({ address_from: from, address_to: to, parcels: [parcel], parcel_template: parcelTemplateId || undefined, async: false, ...(carrier_accounts.length?{carrier_accounts}:{}), });
      const rates = Array.isArray(shipment?.rates) ? shipment.rates : [];
      const messages = shipment?.messages || [];
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

  } catch (e) {
    checks.push({ key: 'exception', label: 'Exception during status check', ok: false, detail: String(e) });
    return NextResponse.json({ ok: false, checks }, { status: 500 });
  }
}
