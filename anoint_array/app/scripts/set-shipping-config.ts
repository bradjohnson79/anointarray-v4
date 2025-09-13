import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) dotenv.config({ path: envPath });
const url = process.env.DIRECT_URL || process.env.SUPABASE_SESSION_URL || process.env.DATABASE_URL;
const prisma = new PrismaClient(url ? { datasources: { db: { url } } } : undefined);

async function main(){
  const cfg = {
    origin: {
      name: 'AetherX Inc.',
      company: 'AetherX Inc.',
      street1: '7674 210A Street',
      city: 'Langley',
      state: 'BC',
      zip: 'V2Y 0L1',
      country: 'CA',
      phone: ''
    },
    parcelDefault: { length: 30, width: 23, height: 15, distance_unit: 'cm', weight: 0.5, mass_unit: 'kg' },
    carrierAccountIds: {
      canadaPost: '0ba8325cdfb54bbb96a01796b272662d',
      upsCanada: 'c0149183b52d4708b06458dd6913a38b'
    }
  } as any;

  await prisma.appConfig.upsert({
    where: { key: 'shipping-config' },
    update: { value: cfg },
    create: { key: 'shipping-config', value: cfg },
  });
  console.log(JSON.stringify({ ok: true, key: 'shipping-config', cfg }, null, 2));
}

main().catch(e=>{ console.error(e); process.exit(1);}).finally(async()=>{ await prisma.$disconnect(); });
