import path from 'path';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';

dotenv.config({ path: path.resolve(process.cwd(), 'anoint_array/app/.env.local') });

async function run(url: string, label: string) {
  const prisma = new PrismaClient({ datasources: { db: { url } } });
  const start = Date.now();
  try {
    await prisma.$queryRawUnsafe('SELECT 1');
    const [orders, products, users] = await Promise.all([
      prisma.order.count().catch((e) => `err:${e.message}`),
      prisma.product.count().catch((e) => `err:${e.message}`),
      prisma.user.count().catch((e) => `err:${e.message}`),
    ]);
    console.log(JSON.stringify({ label, ok: true, ms: Date.now() - start, orders, products, users }, null, 2));
  } catch (e: any) {
    console.log(JSON.stringify({ label, ok: false, ms: Date.now() - start, error: String(e?.message || e) }, null, 2));
  } finally {
    await prisma.$disconnect();
  }
}

(async () => {
  const pooled = process.env.SUPABASE_SESSION_URL || process.env.DATABASE_URL;
  const direct = process.env.DIRECT_URL;
  if (pooled) await run(pooled, 'pooled'); else console.log('no pooled URL');
  if (direct) await run(direct, 'direct'); else console.log('no direct URL');
})();

