import { mutationGeneric as mutation, queryGeneric as query } from "convex/server";
import { v } from "convex/values";

// Utilities
function pad3(n: number) {
  return String(n).padStart(3, '0');
}

// List orders with items and basic product names
export const list = query({
  args: {},
  handler: async (ctx) => {
    const orders = await ctx.db.query('orders').collect();
    // Sort newest first
    const sorted = orders.sort((a,b)=> Number(b.createdAt||0) - Number(a.createdAt||0));
    const results: any[] = [];
    for (const o of sorted) {
      const items = await ctx.db.query('orderItems').withIndex('by_order', q=> q.eq('orderId', o._id)).collect();
      const outItems: any[] = [];
      for (const it of items) {
        const prod = await ctx.db.get(it.productId);
        outItems.push({
          id: (it as any)._id,
          name: (prod as any)?.name || '',
          quantity: it.quantity,
          price: it.price,
          hsCode: (it as any).hsCode,
          countryOfOrigin: (it as any).countryOfOrigin,
          customsDescription: (it as any).customsDescription,
          unitValueCad: (it as any).unitValueCad,
          massGramsEach: (it as any).massGramsEach,
          isDigital: (it as any).isDigital,
        });
      }
      results.push({
        id: (o as any)._id,
        orderNumber: o.orderNumber,
        customerName: (o as any).customerName || '',
        customerEmail: (o as any).customerEmail || '',
        customerPhone: (o as any).customerPhone,
        status: (o as any).status || 'pending',
        paymentStatus: (o as any).paymentStatus || 'pending',
        paymentMethod: (o as any).paymentMethod,
        totalAmount: Number(o.totalAmount || 0),
        subtotal: (o as any).subtotal != null ? Number((o as any).subtotal) : undefined,
        taxAmount: (o as any).taxAmount != null ? Number((o as any).taxAmount) : undefined,
        shippingAmount: (o as any).shippingAmount != null ? Number((o as any).shippingAmount) : undefined,
        shippingAddress: (o as any).shippingAddress,
        billingAddress: (o as any).billingAddress,
        trackingNumber: (o as any).trackingNumber,
        notes: (o as any).notes,
        buyerCountry: (o as any).buyerCountry,
        shippingCountry: (o as any).shippingCountry,
        taxSubtotalCad: (o as any).taxSubtotalCad != null ? Number((o as any).taxSubtotalCad) : undefined,
        taxBreakdown: (o as any).taxBreakdown,
        dutiesEstimatedCad: (o as any).dutiesEstimatedCad != null ? Number((o as any).dutiesEstimatedCad) : undefined,
        taxesEstimatedCad: (o as any).taxesEstimatedCad != null ? Number((o as any).taxesEstimatedCad) : undefined,
        dutiesTaxesCurrency: (o as any).dutiesTaxesCurrency,
        incoterm: (o as any).incoterm,
        createdAt: new Date(Number((o as any).createdAt || Date.now())).toISOString(),
        updatedAt: new Date(Number((o as any).updatedAt || (o as any).createdAt || Date.now())).toISOString(),
        items: outItems,
      });
    }
    return results;
  }
});

export const byEmail = query({
  args: { email: v.string() },
  handler: async (ctx, { email }) => {
    const lower = email.toLowerCase();
    const orders = await ctx.db.query('orders').withIndex('by_email', q=> q.eq('userEmail', lower)).collect();
    const results: any[] = [];
    for (const o of orders) {
      const items = await ctx.db.query('orderItems').withIndex('by_order', q=> q.eq('orderId', o._id)).collect();
      results.push({
        id: (o as any)._id,
        orderNumber: o.orderNumber,
        customerName: (o as any).customerName || '',
        customerEmail: (o as any).customerEmail || '',
        status: (o as any).status || 'pending',
        paymentStatus: (o as any).paymentStatus || 'pending',
        totalAmount: Number(o.totalAmount || 0),
        createdAt: new Date(Number((o as any).createdAt || Date.now())).toISOString(),
        updatedAt: new Date(Number((o as any).updatedAt || (o as any).createdAt || Date.now())).toISOString(),
        items: items.map(it=> ({ id: (it as any)._id, quantity: it.quantity, price: it.price }))
      });
    }
    return results.sort((a,b)=> (a.createdAt < b.createdAt ? 1 : -1));
  }
});

// Get order by id
export const get = query({
  args: { id: v.id('orders') },
  handler: async (ctx, { id }) => {
    const o: any = await ctx.db.get(id);
    if (!o) return null;
    const items = await ctx.db.query('orderItems').withIndex('by_order', q=> q.eq('orderId', o._id)).collect();
    const outItems: any[] = [];
    for (const it of items) {
      const prod = await ctx.db.get(it.productId);
      outItems.push({
        id: (it as any)._id,
        name: (prod as any)?.name || '',
        quantity: it.quantity,
        price: it.price,
        hsCode: (it as any).hsCode,
        countryOfOrigin: (it as any).countryOfOrigin,
        customsDescription: (it as any).customsDescription,
        unitValueCad: (it as any).unitValueCad,
        massGramsEach: (it as any).massGramsEach,
        isDigital: (it as any).isDigital,
      });
    }
    return {
      id: (o as any)._id,
      orderNumber: o.orderNumber,
      customerName: o.customerName,
      customerEmail: o.customerEmail,
      customerPhone: o.customerPhone,
      status: o.status || 'pending',
      paymentStatus: o.paymentStatus || 'pending',
      paymentMethod: o.paymentMethod,
      totalAmount: Number(o.totalAmount || 0),
      subtotal: o.subtotal != null ? Number(o.subtotal) : undefined,
      taxAmount: o.taxAmount != null ? Number(o.taxAmount) : undefined,
      shippingAmount: o.shippingAmount != null ? Number(o.shippingAmount) : undefined,
      shippingAddress: o.shippingAddress,
      billingAddress: o.billingAddress,
      trackingNumber: o.trackingNumber,
      notes: o.notes,
      buyerCountry: o.buyerCountry,
      shippingCountry: o.shippingCountry,
      taxSubtotalCad: o.taxSubtotalCad != null ? Number(o.taxSubtotalCad) : undefined,
      taxBreakdown: o.taxBreakdown,
      dutiesEstimatedCad: o.dutiesEstimatedCad != null ? Number(o.dutiesEstimatedCad) : undefined,
      taxesEstimatedCad: o.taxesEstimatedCad != null ? Number(o.taxesEstimatedCad) : undefined,
      dutiesTaxesCurrency: o.dutiesTaxesCurrency,
      incoterm: o.incoterm,
      createdAt: new Date(Number(o.createdAt || Date.now())).toISOString(),
      updatedAt: new Date(Number(o.updatedAt || o.createdAt || Date.now())).toISOString(),
      items: outItems,
    };
  }
});

// Create order with items
export const create = mutation({
  args: {
    customerName: v.string(),
    customerEmail: v.string(),
    customerPhone: v.optional(v.string()),
    shippingAddress: v.optional(v.any()),
    billingAddress: v.optional(v.any()),
    items: v.array(v.object({
      productId: v.id('products'),
      name: v.optional(v.string()),
      quantity: v.number(),
      price: v.number(),
      hsCode: v.optional(v.string()),
      countryOfOrigin: v.optional(v.string()),
      customsDescription: v.optional(v.string()),
      unitValueCad: v.optional(v.number()),
      massGramsEach: v.optional(v.number()),
      isDigital: v.optional(v.boolean()),
    })),
    subtotal: v.optional(v.number()),
    taxAmount: v.optional(v.number()),
    shippingAmount: v.optional(v.number()),
    totalAmount: v.number(),
    paymentMethod: v.optional(v.string()),
    paymentStatus: v.optional(v.string()),
    notes: v.optional(v.string()),
    // Tax & customs fields
    buyerCountry: v.optional(v.string()),
    shippingCountry: v.optional(v.string()),
    taxSubtotalCad: v.optional(v.number()),
    taxBreakdown: v.optional(v.any()),
    dutiesEstimatedCad: v.optional(v.number()),
    taxesEstimatedCad: v.optional(v.number()),
    dutiesTaxesCurrency: v.optional(v.string()),
    incoterm: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const count = (await ctx.db.query('orders').collect()).length;
    const year = new Date().getFullYear();
    const orderNumber = `ANA-${year}-${pad3(count + 1)}`;
    const now = Date.now();
    const orderId = await ctx.db.insert('orders', {
      userEmail: (args.customerEmail || '').toLowerCase(),
      orderNumber,
      totalAmount: Number(args.totalAmount || 0),
      paymentStatus: args.paymentStatus || 'pending',
      status: 'pending',
      createdAt: now,
      updatedAt: now,
      customerName: args.customerName,
      customerEmail: (args.customerEmail || '').toLowerCase(),
      customerPhone: args.customerPhone,
      paymentMethod: args.paymentMethod,
      subtotal: args.subtotal,
      taxAmount: args.taxAmount,
      shippingAmount: args.shippingAmount,
      shippingAddress: args.shippingAddress,
      billingAddress: args.billingAddress || args.shippingAddress,
      notes: args.notes,
      buyerCountry: args.buyerCountry,
      shippingCountry: args.shippingCountry,
      taxSubtotalCad: args.taxSubtotalCad,
      taxBreakdown: args.taxBreakdown,
      dutiesEstimatedCad: args.dutiesEstimatedCad,
      taxesEstimatedCad: args.taxesEstimatedCad,
      dutiesTaxesCurrency: args.dutiesTaxesCurrency,
      incoterm: args.incoterm,
    } as any);
    for (const it of args.items) {
      await ctx.db.insert('orderItems', {
        orderId,
        productId: it.productId,
        quantity: Number(it.quantity || 1),
        price: Number(it.price || 0),
        hsCode: (it as any).hsCode,
        countryOfOrigin: (it as any).countryOfOrigin,
        customsDescription: (it as any).customsDescription,
        unitValueCad: (it as any).unitValueCad,
        massGramsEach: (it as any).massGramsEach,
        isDigital: (it as any).isDigital,
      } as any);
    }
    return { ok: true, id: orderId, orderNumber };
  }
});

// Update order by id
export const update = mutation({
  args: {
    id: v.id('orders'),
    patch: v.object({
      status: v.optional(v.string()),
      paymentStatus: v.optional(v.string()),
      trackingNumber: v.optional(v.string()),
      notes: v.optional(v.string()),
      shippingAddress: v.optional(v.any()),
      billingAddress: v.optional(v.any()),
    })
  },
  handler: async (ctx, { id, patch }) => {
    const o = await ctx.db.get(id);
    if (!o) return { ok: false, error: 'not_found' };
    const p: any = { ...patch, updatedAt: Date.now() };
    if (patch.status === 'shipped' && !(o as any).trackingNumber) p.shippedAt = Date.now();
    if (patch.status === 'delivered') p.deliveredAt = Date.now();
    if (patch.status === 'cancelled') p.cancelledAt = Date.now();
    if (patch.paymentStatus === 'refunded') p.refundedAt = Date.now();
    await ctx.db.patch(id, p);
    return { ok: true };
  }
});

// Delete order by id (with items)
export const remove = mutation({
  args: { id: v.id('orders') },
  handler: async (ctx, { id }) => {
    const o = await ctx.db.get(id);
    if (!o) return { ok: false, error: 'not_found' };
    const items = await ctx.db.query('orderItems').withIndex('by_order', q=> q.eq('orderId', id)).collect();
    for (const it of items) await ctx.db.delete(it._id);
    await ctx.db.delete(id);
    return { ok: true };
  }
});

export const createFromProvider = mutation({
  args: {
    provider: v.string(),
    providerOrderId: v.string(),
    customerName: v.optional(v.string()),
    customerEmail: v.optional(v.string()),
    subtotal: v.optional(v.number()),
    taxAmount: v.optional(v.number()),
    shippingAmount: v.optional(v.number()),
    totalAmount: v.number(),
    currency: v.optional(v.string()),
    shippingAddress: v.optional(v.any()),
    billingAddress: v.optional(v.any()),
    items: v.array(v.object({
      productId: v.optional(v.id('products')),
      name: v.optional(v.string()),
      quantity: v.number(),
      price: v.number(),
      hsCode: v.optional(v.string()),
      countryOfOrigin: v.optional(v.string()),
      customsDescription: v.optional(v.string()),
      unitValueCad: v.optional(v.number()),
      massGramsEach: v.optional(v.number()),
      isDigital: v.optional(v.boolean()),
    })),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const orderNumber = `${args.provider.toUpperCase()}_${args.providerOrderId}`;
    const existing = await ctx.db.query('orders').withIndex('by_orderNumber', q=> q.eq('orderNumber', orderNumber)).unique();
    if (existing) return { ok: true, id: existing._id, orderNumber, duplicate: true };
    const now = Date.now();
    const id = await ctx.db.insert('orders', {
      userEmail: (args.customerEmail || '').toLowerCase(),
      orderNumber,
      totalAmount: args.totalAmount,
      paymentStatus: 'paid',
      status: 'processing',
      createdAt: now,
      updatedAt: now,
      customerName: args.customerName,
      customerEmail: (args.customerEmail || '').toLowerCase(),
      shippingAddress: args.shippingAddress,
      billingAddress: args.billingAddress || args.shippingAddress,
      subtotal: args.subtotal,
      taxAmount: args.taxAmount,
      shippingAmount: args.shippingAmount,
      paymentMethod: args.provider.toLowerCase(),
      notes: undefined,
    } as any);
    for (const it of args.items) {
      await ctx.db.insert('orderItems', {
        orderId: id,
        productId: (it.productId as any) || (undefined as any),
        quantity: it.quantity,
        price: it.price,
        hsCode: (it as any).hsCode,
        countryOfOrigin: (it as any).countryOfOrigin,
        customsDescription: (it as any).customsDescription,
        unitValueCad: (it as any).unitValueCad,
        massGramsEach: (it as any).massGramsEach,
        isDigital: (it as any).isDigital,
      } as any);
    }
    return { ok: true, id, orderNumber };
  }
});
