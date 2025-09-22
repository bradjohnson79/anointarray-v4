import { queryGeneric as query } from "convex/server";

export const totals = query({
  args: {},
  handler: async (ctx) => {
    const count = async (table: string) => (await ctx.db.query(table as any).collect()).length;
    return {
      products: await count('products'),
      productVariants: await count('productVariants'),
      users: await count('users'),
      orders: await count('orders'),
      orderItems: await count('orderItems'),
    };
  }
});

