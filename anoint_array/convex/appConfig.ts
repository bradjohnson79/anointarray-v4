import { mutationGeneric as mutation, queryGeneric as query } from "convex/server";
import { v } from "convex/values";

export const get = query({
  args: { key: v.string() },
  handler: async (ctx, { key }) => {
    const row = await ctx.db.query('appConfig').withIndex('by_key', q=> q.eq('key', key)).unique();
    return row?.value;
  }
});

export const has = query({
  args: { key: v.string() },
  handler: async (ctx, { key }) => {
    const row = await ctx.db.query('appConfig').withIndex('by_key', q=> q.eq('key', key)).unique();
    return !!row;
  }
});

export const set = mutation({
  args: { key: v.string(), value: v.any() },
  handler: async (ctx, { key, value }) => {
    const existing = await ctx.db.query('appConfig').withIndex('by_key', q=> q.eq('key', key)).unique();
    if (existing) { await ctx.db.patch(existing._id, { value, updatedAt: Date.now() }); return { ok: true, updated: true }; }
    await ctx.db.insert('appConfig', { key, value, updatedAt: Date.now() });
    return { ok: true, created: true };
  }
});

