import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const checks: any[] = [];
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const url = new URL(request.url);
    const carrierAccountId = url.searchParams.get('carrierAccountId') || process.env.SHIPPO_CP_ACCOUNT_ID || '';
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
      if (carrierAccountId) {
        const found = accounts.find((a: any) => String(a.object_id) === carrierAccountId);
        checks.push({ key: 'cpAccount', label: 'Canada Post account configured', ok: !!found, detail: found ? 'Matched' : 'Not found' });
      }
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

    const checkRates = async (to: any) => {
      const body: any = { address_from: from, address_to: to, parcels: [parcel], async: false };
      if (parcelTemplateId) { body.parcels = undefined; body.parcel_template = parcelTemplateId; }
      if (carrierAccountId) body.carrier_accounts = [carrierAccountId];
      const resp = await fetch('https://api.goshippo.com/shipments/', { method: 'POST', headers: { 'Authorization': `ShippoToken ${apiKey}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const data = await resp.json();
      if (!resp.ok) return { ok: false, detail: JSON.stringify(data) };
      const rates = (data?.rates || []).filter((r: any) => /canada post/i.test(r?.provider || r?.carrier || ''));
      return { ok: rates.length > 0, detail: rates.length > 0 ? `${rates.length} rate(s)` : 'No CP rates' };
    };

    const ca = await checkRates(toCA);
    checks.push({ key: 'ratesCA', label: 'Get rates (Canada→Canada)', ok: ca.ok, detail: ca.detail });
    const us = await checkRates(toUS);
    checks.push({ key: 'ratesUS', label: 'Get rates (Canada→USA)', ok: us.ok, detail: us.detail });
    const gb = await checkRates(toGB);
    checks.push({ key: 'ratesINT', label: 'Get rates (Canada→International)', ok: gb.ok, detail: gb.detail });

    const ok = checks.every(c => c.ok);
    return NextResponse.json({ ok, checks });

  } catch (e) {
    checks.push({ key: 'exception', label: 'Exception during status check', ok: false, detail: String(e) });
    return NextResponse.json({ ok: false, checks }, { status: 500 });
  }
}
