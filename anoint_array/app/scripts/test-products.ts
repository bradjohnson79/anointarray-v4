/*
  Product backend smoke tests using Prisma
  Usage:
    DIRECT_URL=postgresql://... pnpm dlx tsx scripts/test-products.ts
*/
import { PrismaClient } from '@prisma/client';

function rand(n = 6) { return Math.random().toString(36).slice(2, 2 + n); }

async function main() {
  const url = process.env.DIRECT_URL || process.env.DATABASE_URL;
  const prisma = new PrismaClient(url ? { datasources: { db: { url } } } : undefined);
  const results: Record<string, any> = {};
  const slug = `qa-product-${Date.now()}-${rand()}`;
  try {
    // 1) list
    await prisma.product.findMany({ take: 1 });
    results.list = { ok: true };

    // 2) create
    const p = await prisma.product.create({
      data: {
        name: 'QA Test Product', slug,
        teaserDescription: 'QA teaser',
        price: 9.99,
        category: 'qa',
        inStock: true,
        isPhysical: true,
      },
      select: { id: true, slug: true }
    });
    results.create = { ok: true, id: p.id, slug: p.slug };

    // 3) read by slug
    const got = await prisma.product.findUnique({ where: { slug } });
    results.read = { ok: !!got };

    // 4) delete
    await prisma.product.delete({ where: { slug } });
    results.delete = { ok: true };

    const ok = results.list.ok && results.create.ok && results.read.ok && results.delete.ok;
    console.log(JSON.stringify({ test: 'products-backend', ok, results }, null, 2));
    if (!ok) process.exit(1);
  } catch (e: any) {
    const msg = String(e?.message || e);
    console.log(JSON.stringify({ test: 'products-backend', ok: false, error: msg }, null, 2));
    process.exit(2);
  } finally {
    try { await prisma.product.delete({ where: { slug } }); } catch {}
    await prisma.$disconnect();
  }
}

main();

