import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    email: v.string(),
    name: v.optional(v.string()),
    role: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
    createdAt: v.number(),
  }).index("by_email", ["email"]),

  products: defineTable({
    slug: v.string(),
    name: v.string(),
    price: v.number(),
    createdAt: v.number(),
  }).index("by_slug", ["slug"]),

  productVariants: defineTable({
    productId: v.id("products"),
    style: v.optional(v.string()),
    price: v.number(),
    quantity: v.optional(v.number()),
    sku: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_product", ["productId"]),

  orders: defineTable({
    userEmail: v.string(),
    orderNumber: v.string(),
    totalAmount: v.number(),
    paymentStatus: v.optional(v.string()),
    status: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_email", ["userEmail"]),

  orderItems: defineTable({
    orderId: v.id("orders"),
    productId: v.id("products"),
    quantity: v.number(),
    price: v.number(),
  }).index("by_order", ["orderId"]),
});

