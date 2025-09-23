import { mutationGeneric as mutation, queryGeneric as query } from "convex/server";
import { v } from "convex/values";

export const add = mutation({
  args: {
    orderId: v.id('orders'),
    orderNumber: v.string(),
    carrier: v.string(),
    trackingNumber: v.optional(v.string()),
    labelUrl: v.optional(v.string()),
    cost: v.optional(v.number()),
    service: v.optional(v.string()),
    estimatedDelivery: v.optional(v.string()),
    transactionId: v.optional(v.string()),
    shipmentId: v.optional(v.string()),
    status: v.optional(v.string()),
    meta: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const id = await ctx.db.insert('shipments', { ...args, createdAt: Date.now() } as any);
    return { ok: true, id };
  }
});

export const byOrder = query({ args: { orderId: v.id('orders') }, handler: async (ctx, { orderId }) => {
  return await ctx.db.query('shipments').withIndex('by_order', q=> q.eq('orderId', orderId)).collect();
} });

