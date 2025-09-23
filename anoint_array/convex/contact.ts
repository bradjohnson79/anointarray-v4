import { mutationGeneric as mutation } from "convex/server";
import { v } from "convex/values";

export const add = mutation({
  args: { name: v.string(), email: v.string(), subject: v.optional(v.string()), message: v.string(), formType: v.optional(v.string()) },
  handler: async (ctx, { name, email, subject, message, formType }) => {
    const id = await ctx.db.insert('contactForms', { name, email: email.toLowerCase(), subject, message, formType, createdAt: Date.now() });
    return { ok: true, id };
  }
});

