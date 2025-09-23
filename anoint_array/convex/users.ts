import { mutationGeneric as mutation, queryGeneric as query } from "convex/server";
import { v } from "convex/values";

export const upsertByEmail = mutation({
  args: { email: v.string(), name: v.optional(v.string()) },
  handler: async (ctx, { email, name }) => {
    const lower = email.toLowerCase();
    const existing = await ctx.db
      .query("users")
      .withIndex("by_email", q => q.eq("email", lower))
      .unique();
    if (existing) {
      await ctx.db.patch(existing._id, { name });
      return { ok: true, updated: true };
    }
    await ctx.db.insert("users", {
      email: lower,
      name: name ?? null,
      role: "USER",
      isActive: true,
      createdAt: Date.now(),
    });
    return { ok: true, created: true };
  },
});

export const byEmail = query({
  args: { email: v.string() },
  handler: async (ctx, { email }) => {
    const lower = email.toLowerCase();
    return await ctx.db.query('users').withIndex('by_email', q=> q.eq('email', lower)).unique();
  }
});

export const setPasswordHash = mutation({
  args: { email: v.string(), passwordHash: v.string() },
  handler: async (ctx, { email, passwordHash }) => {
    const lower = email.toLowerCase();
    const existing = await ctx.db.query('users').withIndex('by_email', q=> q.eq('email', lower)).unique();
    if (!existing) {
      await ctx.db.insert('users', { email: lower, name: null as any, role: 'ADMIN', isActive: true, createdAt: Date.now(), passwordHash: passwordHash as any });
      return { ok: true, created: true };
    }
    await ctx.db.patch(existing._id, { passwordHash: passwordHash as any });
    return { ok: true, updated: true };
  }
});
export const updateByEmail = mutation({ args: { email: v.string(), name: v.optional(v.union(v.string(), v.null())), role: v.optional(v.string()), isActive: v.optional(v.boolean()) }, handler: async (ctx, { email, name, role, isActive }) => { const lower = email.toLowerCase(); const existing = await ctx.db.query('users').withIndex('by_email', q=> q.eq('email', lower)).unique(); if (!existing) return { ok: false, error: 'not_found' }; const patch: any = {}; if (name !== undefined) patch.name = name; if (role !== undefined) patch.role = role; if (isActive !== undefined) patch.isActive = isActive; if (Object.keys(patch).length) await ctx.db.patch(existing._id, patch); return { ok: true }; } });

export const list = query({ args: {}, handler: async (ctx) => {
  const users = await ctx.db.query('users').collect();
  return users.map((u: any) => ({ _id: u._id, email: u.email, name: u.name || null, role: u.role || 'USER', isActive: u.isActive !== false, createdAt: u.createdAt || null }));
} });
