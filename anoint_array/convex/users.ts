import { mutation } from "convex/server";
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

