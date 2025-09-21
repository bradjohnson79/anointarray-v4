import { mutation, query } from "convex/server";
import { v } from "convex/values";

export const importSnapshot = mutation({
  args: { products: v.array(v.any()) },
  handler: async (ctx, { products }) => {
    // wipe existing
    const allP = await ctx.db.query('products').collect();
    for (const p of allP) await ctx.db.delete(p._id);
    const allV = await ctx.db.query('productVariants').collect();
    for (const vnt of allV) await ctx.db.delete(vnt._id);

    let count = 0;
    for (const p of products) {
      const slug = String(p.slug || '').trim();
      const name = String(p.name || '').trim();
      const price = Number(p.price || 0);
      if (!slug || !name) continue;
      const pid = await ctx.db.insert('products', { slug, name, price, createdAt: Date.now() });
      const variants = Array.isArray(p.variants) ? p.variants : [];
      for (const vnt of variants) {
        await ctx.db.insert('productVariants', {
          productId: pid,
          style: vnt?.style || null,
          price: Number(vnt?.price || 0),
          quantity: Number(vnt?.quantity || 0),
          sku: vnt?.sku || null,
          createdAt: Date.now(),
        });
      }
      count++;
    }
    return { ok: true, count };
  }
});

export const bySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, { slug }) => {
    return await ctx.db.query('products').withIndex('by_slug', q=> q.eq('slug', slug)).unique();
  }
});

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query('products').collect();
  }
});

