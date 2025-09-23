import { mutationGeneric as mutation, queryGeneric as query } from "convex/server";
import { v } from "convex/values";

export const add = mutation({
  args: { name: v.string(), email: v.string(), phone: v.optional(v.string()), interests: v.optional(v.string()) },
  handler: async (ctx, { name, email, phone, interests }) => {
    const lower = email.toLowerCase();
    const existing = await ctx.db.query('vipWaitlist').withIndex('by_email', q=> q.eq('email', lower)).unique();
    if (existing) return { ok: false, error: 'exists', id: existing._id };
    const id = await ctx.db.insert('vipWaitlist', { name, email: lower, phone, interests, createdAt: Date.now() });
    return { ok: true, id };
  }
});

export const byEmail = query({ args: { email: v.string() }, handler: async (ctx, { email }) => {
  const lower = email.toLowerCase();
  return await ctx.db.query('vipWaitlist').withIndex('by_email', q=> q.eq('email', lower)).unique();
} });

