import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function genSku(name: string, style?: string | null) {
  const base = (name || 'SKU').toUpperCase().replace(/[^A-Z0-9]+/g, '').slice(0, 8);
  const sty = (style || '').toUpperCase().replace(/[^A-Z0-9]+/g, '').slice(0, 6);
  const rand = Math.random().toString(36).toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4);
  return [base, sty, rand].filter(Boolean).join('-');
}

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session || session.user?.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const actions: any[] = [];
  try {
    type Variant = { id: string; style: string | null; price: any; quantity: number | null; sku: string | null };
    type ProductWithVariants = { id: string; name: string; price: any; inventory: number | null; variants?: Variant[] };

    const products: ProductWithVariants[] = await prisma.product.findMany({
      select: { id: true, name: true, price: true, inventory: true, variants: { select: { id: true, style: true, price: true, quantity: true, sku: true } } },
      orderBy: { createdAt: 'asc' },
    });
    // Build a deterministic SKU set without relying on array callbacks that can trip TS strict rules
    const skuList: string[] = [];
    for (const p of products as ProductWithVariants[]) {
      const vars = (p.variants ?? []) as Variant[];
      for (const v of vars) {
        if (v.sku && typeof v.sku === 'string') skuList.push(v.sku);
      }
    }
    const existingSkus = new Set<string>(skuList);

    for (const p of products) {
      if (!p.variants || p.variants.length === 0) {
        let sku = genSku(p.name, 'DEFAULT');
        while (existingSkus.has(sku)) sku = genSku(p.name, 'DEFAULT');
        existingSkus.add(sku);
        await prisma.productVariant.create({
          data: { productId: p.id, style: 'Default', price: p.price, quantity: p.inventory ?? 0, sku }
        });
        actions.push({ productId: p.id, createdVariant: true, sku });
      } else {
        for (const v of p.variants) {
          if (!v.sku || existingSkus.has(v.sku)) {
            let sku = genSku(p.name, v.style);
            while (existingSkus.has(sku)) sku = genSku(p.name, v.style);
            existingSkus.add(sku);
            await prisma.productVariant.update({ where: { id: v.id }, data: { sku } });
            actions.push({ productId: p.id, variantId: v.id, updatedSku: sku });
          }
        }
      }
    }
    return NextResponse.json({ ok: true, updated: actions.length, actions });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed to repair SKUs' }, { status: 500 });
  }
}
