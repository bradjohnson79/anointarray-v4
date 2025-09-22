import { mutationGeneric as mutation, queryGeneric as query } from "convex/server";
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
      const pid = await ctx.db.insert('products', {
        slug,
        name,
        price,
        createdAt: Date.now(),
        teaserDescription: p?.teaserDescription || p?.shortDescription || null,
        fullDescription: p?.fullDescription || p?.description || null,
        category: p?.category || null,
        featured: !!p?.featured,
        sortOrder: typeof p?.sortOrder === 'number' ? p.sortOrder : 9999,
        imageUrl: p?.imageUrl || null,
        imageGallery: Array.isArray(p?.imageGallery) ? p.imageGallery : [],
      } as any);
      const variants = Array.isArray(p.variants) ? p.variants : [];
      for (const vnt of variants) {
        await ctx.db.insert('productVariants', {
          productId: pid,
          style: (vnt?.style === undefined || vnt?.style === null) ? undefined : vnt.style,
          price: Number(vnt?.price || 0),
          quantity: (vnt?.quantity === undefined || vnt?.quantity === null) ? undefined : Number(vnt.quantity),
          sku: (vnt?.sku === undefined || vnt?.sku === null) ? undefined : vnt.sku,
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

export const updateImages = mutation({
  args: { slug: v.string(), imageUrl: v.optional(v.union(v.string(), v.null())), imageGallery: v.optional(v.array(v.string())) },
  handler: async (ctx, { slug, imageUrl, imageGallery }) => {
    const p = await ctx.db.query('products').withIndex('by_slug', q=> q.eq('slug', slug)).unique();
    if (!p) return { ok: false, error: 'not_found' };
    const patch: any = {};
    if (imageUrl !== undefined) patch.imageUrl = imageUrl;
    if (imageGallery !== undefined) patch.imageGallery = imageGallery;
    await ctx.db.patch(p._id, patch);
    return { ok: true };
  }
});

export const create = mutation({
  args: {
    slug: v.string(),
    name: v.string(),
    price: v.number(),
    category: v.optional(v.string()),
    featured: v.optional(v.boolean()),
    sortOrder: v.optional(v.number()),
    imageUrl: v.optional(v.string()),
    imageGallery: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.query('products').withIndex('by_slug', q=> q.eq('slug', args.slug)).unique();
    if (existing) return { ok: false, error: 'slug_exists' };
    const doc = {
      slug: args.slug,
      name: args.name,
      price: args.price,
      createdAt: Date.now(),
      category: args.category,
      featured: args.featured,
      sortOrder: args.sortOrder,
      imageUrl: args.imageUrl,
      imageGallery: args.imageGallery,
    } as any;
    const id = await ctx.db.insert('products', doc);
    return { ok: true, id };
  }
});

export const updateBySlug = mutation({
  args: {
    slug: v.string(),
    patch: v.object({
      name: v.optional(v.string()),
      price: v.optional(v.number()),
      category: v.optional(v.string()),
      featured: v.optional(v.boolean()),
      sortOrder: v.optional(v.number()),
      imageUrl: v.optional(v.union(v.string(), v.null())),
      imageGallery: v.optional(v.array(v.string())),
      inStock: v.optional(v.boolean()),
      comingSoon: v.optional(v.boolean()),
    })
  },
  handler: async (ctx, { slug, patch }) => {
    const p = await ctx.db.query('products').withIndex('by_slug', q=> q.eq('slug', slug)).unique();
    if (!p) return { ok: false, error: 'not_found' };
    await ctx.db.patch(p._id, patch as any);
    return { ok: true };
  }
});

export const deleteBySlug = mutation({
  args: { slug: v.string() },
  handler: async (ctx, { slug }) => {
    const p = await ctx.db.query('products').withIndex('by_slug', q=> q.eq('slug', slug)).unique();
    if (!p) return { ok: false, error: 'not_found' };
    // Delete variants first
    const vars = await ctx.db.query('productVariants').withIndex('by_product', q=> q.eq('productId', p._id)).collect();
    for (const vnt of vars) await ctx.db.delete(vnt._id);
    await ctx.db.delete(p._id);
    return { ok: true };
  }
});

export const backfillFields = mutation({
  args: {},
  handler: async (ctx) => {
    const items = await ctx.db.query('products').collect();
    let updated = 0;
    for (const p of items) {
      const patch: any = {};
      if (p.featured === undefined) patch.featured = false;
      if (p.sortOrder === undefined) patch.sortOrder = 9999;
      if (p.teaserDescription === undefined) patch.teaserDescription = null as any;
      if (p.fullDescription === undefined) patch.fullDescription = null as any;
      if (Object.keys(patch).length) { await ctx.db.patch(p._id, patch); updated++; }
    }
    return { ok: true, updated };
  }
});

export const applyDescriptions = mutation({
  args: { items: v.array(v.object({ slug: v.string(), teaserDescription: v.optional(v.string()), fullDescription: v.optional(v.string()) })), force: v.optional(v.boolean()) },
  handler: async (ctx, { items, force }) => {
    let updated = 0; const missing: string[] = [];
    for (const it of items) {
      const p = await ctx.db.query('products').withIndex('by_slug', q=> q.eq('slug', it.slug)).unique();
      if (!p) { missing.push(it.slug); continue; }
      const patch: any = {};
      if (it.teaserDescription !== undefined) {
        if (force || !p.teaserDescription) patch.teaserDescription = it.teaserDescription;
      }
      if (it.fullDescription !== undefined) {
        if (force || !p.fullDescription) patch.fullDescription = it.fullDescription;
      }
      if (Object.keys(patch).length) { await ctx.db.patch(p._id, patch); updated++; }
    }
    return { ok: true, updated, missing };
  }
});

export const repairSkus = mutation({
  args: {},
  handler: async (ctx) => {
    function genSku(name: string, style?: string | null) {
      const base = (name || 'SKU').toUpperCase().replace(/[^A-Z0-9]+/g, '').slice(0, 8);
      const sty = (style || 'DEFAULT').toUpperCase().replace(/[^A-Z0-9]+/g, '').slice(0, 6);
      const rand = Math.random().toString(36).toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4);
      return [base, sty, rand].filter(Boolean).join('-');
    }
    const prods = await ctx.db.query('products').collect();
    const skuSet = new Set<string>();
    // harvest existing skus
    for (const p of prods) {
      const vars = await ctx.db.query('productVariants').withIndex('by_product', q=> q.eq('productId', p._id)).collect();
      for (const vnt of vars) if (vnt.sku) skuSet.add(vnt.sku);
    }
    let updated = 0;
    for (const p of prods) {
      let vars = await ctx.db.query('productVariants').withIndex('by_product', q=> q.eq('productId', p._id)).collect();
      if (vars.length === 0) {
        let sku = genSku(p.name, 'DEFAULT');
        while (skuSet.has(sku)) sku = genSku(p.name, 'DEFAULT');
        await ctx.db.insert('productVariants', { productId: p._id, style: 'Default', price: p.price, quantity: 0, sku, createdAt: Date.now() });
        skuSet.add(sku); updated++;
      } else {
        for (const vnt of vars) {
          if (!vnt.sku || skuSet.has(vnt.sku)) {
            let sku = genSku(p.name, vnt.style || undefined);
            while (skuSet.has(sku)) sku = genSku(p.name, vnt.style || undefined);
            await ctx.db.patch(vnt._id, { sku });
            skuSet.add(sku); updated++;
          }
        }
      }
    }
    return { ok: true, updated };
  }
});
