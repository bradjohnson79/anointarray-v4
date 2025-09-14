import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';

// Load local env and prefer DIRECT_URL (non-pooled)
const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) dotenv.config({ path: envPath });
if (process.env.DIRECT_URL) process.env.DATABASE_URL = process.env.DIRECT_URL;

const prisma = new PrismaClient();

async function main() {
  // Create then delete a minimal product to validate write path
  const ts = Date.now();
  const slug = `z-test-codex-${ts}`;
  const created = await prisma.product.create({
    data: {
      name: 'Z Test Codex',
      slug,
      price: 9.99 as any,
      category: 'technology',
      teaserDescription: 'Temporary test product created by Codex sanity script',
      inStock: true,
      isPhysical: true,
    },
    select: { id: true, slug: true, createdAt: true },
  });
  console.log(JSON.stringify({ ok: true, created }, null, 2));

  // Clean up to avoid polluting catalog
  await prisma.product.delete({ where: { id: created.id } });
}

main()
  .catch((e) => { console.error('test-product-create error:', e?.message || e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });

