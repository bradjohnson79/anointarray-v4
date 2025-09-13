/*
  Offline Shippo precheck (mirrors status route logic) to avoid admin auth.
  Usage: SHIPPO_API_KEY=... pnpm -s dlx tsx scripts/check-shippo-lanes.ts
*/
import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

async function main(){
  const envPath = path.resolve(process.cwd(), '.env.local');
  if (fs.existsSync(envPath)) dotenv.config({ path: envPath });
  const apiKey = process.env.SHIPPO_API_KEY || process.env.SHIPPO_API_TEST_KEY;
  if (!apiKey) { console.error('Missing SHIPPO_API_KEY/SHIPPO_API_TEST_KEY'); process.exit(1); }
  const url = process.env.DIRECT_URL || process.env.SUPABASE_SESSION_URL || process.env.DATABASE_URL;
  const prisma = new PrismaClient(url ? { datasources: { db: { url } } } : undefined);
  const cfgRow = await prisma.appConfig.findUnique({ where: { key: 'shipping-config' } });
  await prisma.$disconnect();
  const cfg = (cfgRow?.value as any) || {};
  // Support ESM default export shape
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  async function createCustomsItem() {
    const itemBody:any = {
      description: 'Sample Goods',
      quantity: 1,
      net_weight: 0.5,
      mass_unit: 'kg',
      value_amount: 100,
      value_currency: 'CAD',
      origin_country: 'CA',
      hs_tariff_number: '7117110000'
    };
    const r = await fetch('https://api.goshippo.com/customs/items/', { method:'POST', headers:{ 'Authorization': `ShippoToken ${apiKey}`, 'Content-Type': 'application/json' }, body: JSON.stringify(itemBody) });
    const j = await r.json();
    if (!r.ok) throw new Error(JSON.stringify(j));
    return j;
  }
  async function createCustomsDeclaration(itemId: string) {
    const declBody:any = {
      contents_type: 'MERCHANDISE',
      incoterm: 'DDP',
      non_delivery_option: 'RETURN',
      certify: true,
      certify_signer: 'Admin',
      eel_pfc: 'NOEEI_30_37_a',
      items: [itemId]
    };
    const r = await fetch('https://api.goshippo.com/customs/declarations/', { method:'POST', headers:{ 'Authorization': `ShippoToken ${apiKey}`, 'Content-Type': 'application/json' }, body: JSON.stringify(declBody) });
    const j = await r.json();
    if (!r.ok) throw new Error(JSON.stringify(j));
    return j;
  }
  async function createShipment(address_from:any, address_to:any, parcel:any, carrier_accounts:string[]){
    const body:any = { address_from, address_to, parcels:[parcel], async:false };
    const isIntl = String(address_to?.country||'').toUpperCase() !== 'CA';
    if (carrier_accounts.length) body.carrier_accounts = carrier_accounts;
    if (isIntl) {
      try {
        const item = await createCustomsItem();
        const decl = await createCustomsDeclaration(item.object_id);
        body.customs_declaration = decl.object_id;
      } catch (e) {
        // fall through; we will still attempt shipment for diagnostics
      }
    }
    const resp = await fetch('https://api.goshippo.com/shipments/', { method:'POST', headers:{ 'Authorization': `ShippoToken ${apiKey}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const data = await resp.json();
    if (!resp.ok) throw new Error(JSON.stringify(data));
    return data;
  }
  const from = cfg.origin || { name:'Test', street1:'123 Test St', city:'Toronto', state:'ON', zip:'M1A 1A1', country:'CA' };
  const p = cfg.parcelDefault || { length:30, width:23, height:15, distance_unit:'cm', weight:0.5, mass_unit:'kg' };
  const carrier_accounts = [cfg?.carrierAccountIds?.canadaPost, cfg?.carrierAccountIds?.upsCanada].filter(Boolean);

  const lanes = [
    { key:'CA', to:{ name:'Receiver', street1:'456 King', city:'Toronto', state:'ON', zip:'M5S 1T8', country:'CA' } },
    { key:'US', to:{ name:'Receiver', street1:'1600 Amphitheatre Pkwy', city:'Mountain View', state:'CA', zip:'94043', country:'US' } },
    { key:'GB', to:{ name:'Receiver', street1:'1 St Martin Le Grand', city:'London', state:'LND', zip:'EC1A 1BB', country:'GB' } },
  ];
  const out: any[] = [];
  for (const lane of lanes){
    try{
      const shipment = await createShipment(from, lane.to, p, carrier_accounts);
      const rates = Array.isArray(shipment?.rates)? shipment.rates : [];
      const cp = rates.filter((r:any)=>/canada post/i.test(r?.provider||r?.carrier||''));
      const ups = rates.filter((r:any)=>/ups/i.test(r?.provider||r?.carrier||''));
      out.push({ lane: lane.key, ok: rates.length>0, cp: cp.length, ups: ups.length, messages: shipment?.messages || [] });
    }catch(e:any){ out.push({ lane: lane.key, ok:false, error: String(e?.message||e) }); }
  }
  console.log(JSON.stringify({ precheck: 'shippo', results: out }, null, 2));
}

main().catch(e=>{ console.error(e); process.exit(2); });
