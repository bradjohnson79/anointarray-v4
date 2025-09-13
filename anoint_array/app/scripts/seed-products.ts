/*
  Seed initial products (idempotent upserts)
  Usage:
    DIRECT_URL=postgresql://... pnpm -s dlx tsx scripts/seed-products.ts
*/
import { PrismaClient } from '@prisma/client';

function resolveUrl() {
  return process.env.DIRECT_URL || process.env.SUPABASE_SESSION_URL || process.env.DATABASE_URL;
}

const prisma = new PrismaClient(resolveUrl() ? { datasources: { db: { url: resolveUrl()! } } } : undefined);

async function main() {
  const products = [
    {
      name: 'Harmonic Seal – Vitality',
      slug: 'harmonic-seal-vitality',
      teaserDescription: 'Amplify energy and focus throughout the day.',
      fullDescription: 'A foundational energetic array designed to support vitality and clarity.',
      price: 29.99,
      category: 'seals',
      inStock: true,
      isPhysical: true,
      isDigital: false,
      featured: true,
    },
    {
      name: 'Guardian Array – Protection',
      slug: 'guardian-array-protection',
      teaserDescription: 'A protective configuration for daily resilience.',
      fullDescription: 'Ideal for environmental clearing and personal protection routines.',
      price: 39.99,
      category: 'arrays',
      inStock: true,
      isPhysical: true,
      isDigital: false,
      featured: false,
    },
    {
      name: 'Clarity Seal – Insight',
      slug: 'clarity-seal-insight',
      teaserDescription: 'Enhances insight and balanced perspective.',
      fullDescription: 'Recommended for meditation and creative sessions.',
      price: 24.0,
      category: 'seals',
      inStock: true,
      isPhysical: true,
      isDigital: false,
      featured: false,
    },
  ];

  for (const p of products) {
    await prisma.product.upsert({
      where: { slug: p.slug },
      update: {
        name: p.name,
        teaserDescription: p.teaserDescription,
        fullDescription: p.fullDescription,
        price: p.price,
        category: p.category,
        inStock: p.inStock,
        isPhysical: p.isPhysical,
        isDigital: p.isDigital,
        featured: p.featured,
      },
      create: p,
    });
  }

  const count = await prisma.product.count();
  console.log(JSON.stringify({ seed: 'products', ok: true, totalProducts: count }, null, 2));
}

main().catch((e) => {
  console.error('Seed error:', e?.message || e);
  process.exit(1);
}).finally(async () => {
  await prisma.$disconnect();
});

