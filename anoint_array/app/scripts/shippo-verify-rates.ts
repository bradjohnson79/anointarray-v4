/*
  Verify Shippo live connectivity and rates for CA->CA and CA->US.
  Usage: pnpm -s dlx tsx scripts/shippo-verify-rates.ts
*/
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';

const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) dotenv.config({ path: envPath });

const url = process.env.DIRECT_URL || process.env.SUPABASE_SESSION_URL || process.env.DATABASE_URL;
const prisma = new PrismaClient(url ? { datasources: { db: { url } } } : undefined);

async function shippoFetch(pathname: string, apiKey: string, init?: RequestInit) {
  const url = `https://api.goshippo.com${pathname}`;
  const headers: Record<string, string> = {
    Authorization: `ShippoToken ${apiKey}`,
    'Content-Type': 'application/json',
  };
  const res = await fetch(url, { ...init, headers: { ...headers, ...(init?.headers as any) } });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

async function main() {
  const apiKey = process.env.SHIPPO_API_KEY || process.env.SHIPPO_API_TEST_KEY;
  if (!apiKey) throw new Error('Missing SHIPPO_API_KEY/SHIPPO_API_TEST_KEY');
  const cfgRow = await prisma.appConfig.findUnique({ where: { key: 'shipping-config' } });
  await prisma.$disconnect();
  const cfg = (cfgRow?.value as any) || {};

  const origin = cfg.origin || { name:'AetherX Inc.', street1:'7674 210A Street', city:'Langley', state:'BC', zip:'V2Y 0L1', country:'CA' };
  const parcel = cfg.parcelDefault || { length:30, width:23, height:15, distance_unit:'cm', weight:0.5, mass_unit:'kg' };
  const cpId = cfg?.carrierAccountIds?.canadaPost || process.env.SHIPPO_CP_ACCOUNT_ID;
  const upsId = cfg?.carrierAccountIds?.upsCanada || process.env.SHIPPO_UPS_CA_ACCOUNT_ID;
  const carrier_accounts = [cpId, upsId].filter(Boolean) as string[];

  const lanes = [
    { key:'CA', to:{ name:'Receiver', street1:'456 King St', city:'Toronto', state:'ON', zip:'M5S 1T8', country:'CA' } },
    { key:'US', to:{ name:'Receiver', street1:'1600 Amphitheatre Pkwy', city:'Mountain View', state:'CA', zip:'94043', country:'US' } },
  ];

  async function createCustoms(toCountry: string) {
    if (String(toCountry).toUpperCase()==='CA') return null;
    const item = await shippoFetch('/customs/items/', apiKey, { method:'POST', body: JSON.stringify({
      description:'Sample Goods', quantity:1, net_weight: parcel.weight || 0.5, mass_unit: parcel.mass_unit || 'kg',
      value_amount: 100, value_currency: 'CAD', origin_country: 'CA', hs_tariff_number: '7117110000'
    }) });
    if (!item.ok) return null;
    const decl = await shippoFetch('/customs/declarations/', apiKey, { method:'POST', body: JSON.stringify({
      contents_type:'MERCHANDISE', incoterm:'DDP', non_delivery_option:'RETURN', certify:true, certify_signer:'Admin', eel_pfc:'NOEEI_30_37_a', items:[(item.data as any).object_id]
    }) });
    return decl.ok ? (decl.data as any).object_id : null;
  }

  const out: any = { when: new Date().toISOString(), origin, parcel, carrier_accounts };
  for (const lane of lanes) {
    const customs = await createCustoms(lane.to.country);
    const body: any = { address_from: origin, address_to: lane.to, async:false, parcels:[parcel] };
    if (carrier_accounts.length) body.carrier_accounts = carrier_accounts;
    if (customs) body.customs_declaration = customs;
    const shipment = await shippoFetch('/shipments/', apiKey, { method:'POST', body: JSON.stringify(body) });
    out[lane.key] = shipment.data;
  }

  const dir = path.resolve(process.cwd(), 'logs');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `shippo-verify-${Date.now()}.json`);
  fs.writeFileSync(file, JSON.stringify(out, null, 2));
  console.log(file);
}

main().catch(e=>{ console.error(e); process.exit(1); });

